# faster-whisper — самый быстрый Whisper на CUDA + универсальный кросс-платформ

**GitHub:** https://github.com/SYSTRAN/faster-whisper
**PyPI:** https://pypi.org/project/faster-whisper/
**Использовать когда:** Linux/Windows + NVIDIA GPU; кросс-платформенный CPU-вариант
**Не использовать когда:** Mac M-чип (там mlx-whisper быстрее)

faster-whisper — переписка OpenAI Whisper на CTranslate2 (оптимизированный inference engine). На NVIDIA GPU **в 4-12x быстрее** оригинального `openai-whisper`, при том же качестве.

## Когда брать

✅ **NVIDIA GPU** — RTX 3060+, A10, A100, H100 — родная среда
✅ **Linux / Windows / Intel Mac** — кросс-платформа
✅ **CPU-only** — int8-квантизация даёт неплохую скорость
✅ Нужен **batch_size > 1** (несколько файлов параллельно)

❌ Apple Silicon — там лучше [mlx-whisper](mlx-whisper.md)
❌ Speaker diarization из коробки нет — для этого [whisperx](whisperx.md)

## Установка

### Linux + NVIDIA

```bash
# Проверь что CUDA Toolkit 12.x стоит:
nvidia-smi   # должен показать Driver Version и CUDA Version (driver-side)
nvcc --version  # должен показать compiled CUDA Toolkit version

# Если nvcc не нашёл — поставь CUDA Toolkit:
# https://developer.nvidia.com/cuda-downloads (выбери ОС → runfile или deb)

# venv
python3 -m venv .venv && source .venv/bin/activate

# faster-whisper
pip install faster-whisper

# ffmpeg
sudo apt install -y ffmpeg
```

### Windows + NVIDIA (нативно)

```powershell
# CUDA Toolkit + driver: https://developer.nvidia.com/cuda-downloads
# ffmpeg: winget install Gyan.FFmpeg

# venv
python -m venv .venv
.venv\Scripts\activate

pip install faster-whisper
```

### Windows + NVIDIA (через WSL2 — рекомендую)

```bash
# В Windows: wsl --install Ubuntu-22.04
# Внутри WSL — те же команды что для Linux
# WSL2 видит NVIDIA GPU автоматически (драйвер ставится на хост Windows)
```

### Linux/Mac/Windows без GPU (CPU-only)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install faster-whisper

# Качество то же, но в 5-15x медленнее GPU
# Используй модель int8 + batch_size=1 для экономии RAM
```

### Linux + AMD GPU (ROCm)

```bash
# Сначала ROCm: https://rocm.docs.amd.com/projects/install-on-linux/
# Затем PyTorch с ROCm wheel:
pip install torch --index-url https://download.pytorch.org/whl/rocm6.0
pip install faster-whisper
```

⚠️ AMD-путь нестабильный, часто отваливается на новых релизах. Если упало — переключайся на whisper-cpp с Vulkan.

## Минимальный пример

```python
from faster_whisper import WhisperModel

# device + compute_type — главные параметры
model = WhisperModel(
    "large-v3-turbo",
    device="cuda",          # "cuda" / "cpu" / "auto"
    compute_type="float16", # GPU: float16. CPU: int8
)

segments, info = model.transcribe(
    "audio.mp3",
    language="ru",          # явно — быстрее
    word_timestamps=True,
    vad_filter=True,        # ⭐ обязательно — фильтрует тишину
    vad_parameters={
        "min_silence_duration_ms": 500,
    },
)

print(f"Detected language '{info.language}' with probability {info.language_probability}")

for segment in segments:
    print(f"[{segment.start:.2f}s → {segment.end:.2f}s] {segment.text}")
```

## `compute_type` — не путай!

| compute_type | Когда использовать | VRAM impact | Качество |
|---|---|---|---|
| `float32` | Никогда (legacy) | 4x | 100% |
| `float16` | NVIDIA GPU дефолт | 1x | 100% (на FP16-совместимых GPU) |
| `int8_float16` | NVIDIA GPU с экономией VRAM | 0.6x | -1-2% |
| `int8` | CPU дефолт | 0.5x | -2-3% |
| `bfloat16` | новые GPU (A100, H100) | 1x | 100% |

Грубое правило:
- GPU c VRAM ≥ 10GB → `float16`
- GPU c VRAM 4-10GB → `int8_float16`
- CPU → `int8`

## Модели и VRAM

| Модель | VRAM (float16) | VRAM (int8_float16) | RAM (int8 CPU) | Скорость на RTX 4090 |
|---|---|---|---|---|
| `tiny` | 1 GB | 0.6 GB | 0.4 GB | 60x realtime |
| `base` | 1 GB | 0.7 GB | 0.5 GB | 50x |
| `small` | 2 GB | 1.2 GB | 1.0 GB | 35x |
| `medium` | 5 GB | 2.5 GB | 2.5 GB | 20x |
| `large-v3` | 10 GB | 5 GB | 5 GB | 10x |
| `large-v3-turbo` | 6 GB | 3 GB | 3 GB | 17x ⭐ |
| `distil-large-v3` | 6 GB | 3 GB | 3 GB | 25x (EN-only) |

⭐ Дефолт для прода = `large-v3-turbo` если у тебя 6+ GB VRAM.

## Параметры которые имеет смысл крутить

```python
segments, info = model.transcribe(
    audio,

    # === Язык и задача ===
    language="ru",                    # явно — быстрее
    task="transcribe",                # "translate" → переводит в EN

    # === Качество vs скорость ===
    beam_size=5,                      # 1 = greedy (быстро). 5 = дефолт. 10+ = лучше но медленно
    best_of=5,                        # сколько вариантов попробовать
    temperature=0.0,                  # детерминированно. 0.2-0.4 = разнообразие

    # === Контекст ===
    initial_prompt="...",             # подсказка о домене
    condition_on_previous_text=True,  # связность между сегментами
    prompt_reset_on_temperature=0.5,

    # === Фильтр тишины (важно!) ===
    vad_filter=True,                  # ⭐⭐⭐ — экономит время + убирает галлюцинации
    vad_parameters={
        "min_silence_duration_ms": 500,
        "speech_pad_ms": 30,
    },

    # === Сабы ===
    word_timestamps=True,             # пословные метки для CapCut-стиля

    # === Hallucination guards ===
    no_speech_threshold=0.6,
    log_prob_threshold=-1.0,
    compression_ratio_threshold=2.4,
)
```

## Batched режим (несколько файлов разом)

В faster-whisper 1.0+ есть **BatchedInferencePipeline** — параллельная обработка чанков, **до 4x быстрее**:

```python
from faster_whisper import WhisperModel, BatchedInferencePipeline

model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
batched = BatchedInferencePipeline(model=model)

segments, info = batched.transcribe(
    "audio.mp3",
    batch_size=16,    # на RTX 4090 пробуй 16-32
    language="ru",
    vad_filter=True,
)
```

## Известные грабли

### `RuntimeError: CUDA error: ... cuDNN ...`

CUDA Toolkit стоит, но **cuDNN** не подтянут. Решение:
```bash
# Linux:
sudo apt install libcudnn8 libcudnn8-dev
# Или скачай вручную: https://developer.nvidia.com/cudnn
```

### `Could not locate cublasLt64_12.dll` (Windows)

Не хватает CUDA Toolkit. Установи: https://developer.nvidia.com/cuda-downloads

### Память жрёт растёт между транскрибациями

Старая версия faster-whisper. Обнови:
```bash
pip install --upgrade faster-whisper
```

### `vad_filter=True` режет реальную речь

Голос тихий или заикания. Поправь параметры:
```python
vad_parameters={
    "min_silence_duration_ms": 1000,  # требовать минимум 1 сек тишины (а не 0.5)
    "threshold": 0.3,                 # дефолт 0.5, ниже = чувствительнее
}
```

### Скорость на Windows нативно сильно ниже чем на Linux

Это известная проблема — Windows слабее на mathops. **Используй WSL2** — будет быстрее и стабильнее.
