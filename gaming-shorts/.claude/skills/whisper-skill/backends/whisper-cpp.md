# whisper.cpp — Whisper в одном бинарнике, без Python

**GitHub:** https://github.com/ggerganov/whisper.cpp
**Использовать когда:** хочется минимум зависимостей; нет Python; деплой на edge-устройства; нужна интеграция в C/C++/Go/Rust

`whisper.cpp` — это переписка Whisper на чистом C++ от того же автора что сделал `llama.cpp`. Один статический бинарник, нет Python, нет PyTorch. Отлично оптимизирован под CPU (AVX2, AVX512, ARM NEON), есть Metal для Mac, Vulkan для AMD, CUDA для NVIDIA.

## Когда брать именно whisper.cpp

✅ **Не хочется Python вообще** — один бинарник
✅ **Деплой на сервер с минимумом зависимостей**
✅ **Edge-устройства** (Raspberry Pi, ESP32, мобилки)
✅ Интеграция в **Go / Rust / C# / Java** через FFI
✅ **AMD GPU без танцев с ROCm** — Vulkan-бэкенд

❌ Сложные пайплайны на Python — там faster-whisper удобнее
❌ Speaker diarization из коробки — нужен внешний инструмент (см. [whisperx](whisperx.md))
❌ Самые новые фичи Whisper API (некоторые параметры могут отставать на 1-2 релиза)

## Установка

### macOS

```bash
# Простейший путь
brew install whisper-cpp

# Скачай модель в формате GGML
mkdir -p ~/whisper-models && cd ~/whisper-models
curl -LO https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

### Linux

```bash
# Сборка из исходников (без GPU)
sudo apt install -y build-essential cmake ffmpeg
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
cmake -B build
cmake --build build --config Release

# Если есть NVIDIA GPU — добавь -DGGML_CUDA=1
cmake -B build -DGGML_CUDA=1
cmake --build build --config Release

# Если AMD GPU — Vulkan
cmake -B build -DGGML_VULKAN=1
cmake --build build --config Release

# Скачай модель
bash ./models/download-ggml-model.sh large-v3-turbo
```

### Windows

**Опция 1 — нативно**
```powershell
# Поставь CMake + Visual Studio Build Tools, затем:
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
cmake -B build
cmake --build build --config Release

# Модель
.\models\download-ggml-model.cmd large-v3-turbo
```

**Опция 2 — через WSL2** (рекомендую — проще)
```bash
wsl --install Ubuntu-22.04
# дальше команды как для Linux
```

## Минимальный пример

```bash
# Транскрибировать аудио → консоль
./build/bin/whisper-cli \
    -m models/ggml-large-v3-turbo.bin \
    -l ru \
    -f audio.wav

# В файлы (SRT + JSON + TXT)
./build/bin/whisper-cli \
    -m models/ggml-large-v3-turbo.bin \
    -l ru \
    -f audio.wav \
    --output-srt --output-json --output-txt
```

⚠️ **whisper.cpp ест WAV в 16 kHz mono.** Если у тебя mp3/mp4/m4a — конвертируй через ffmpeg:
```bash
ffmpeg -i input.mp4 -ar 16000 -ac 1 -c:a pcm_s16le output.wav
```

## Из Python (Pythonic-обёртка)

Если у тебя всё-таки Python — есть `pywhispercpp`:
```bash
pip install pywhispercpp
```

```python
from pywhispercpp.model import Model

model = Model("large-v3-turbo", n_threads=8)
segments = model.transcribe("audio.wav", language="ru")

for seg in segments:
    print(f"[{seg.t0:.2f}s → {seg.t1:.2f}s] {seg.text}")
```

## Полезные флаги CLI

```bash
./whisper-cli \
    -m models/ggml-large-v3-turbo.bin \
    -f audio.wav \
    -l ru \                       # язык
    -t 8 \                        # потоки CPU
    --max-len 1 \                 # 1 слово на сегмент = пословные сабы
    --vad \                       # VAD-фильтр (с whisper.cpp 1.6+)
    --vad-model models/ggml-silero-v5.1.2.bin \
    --output-srt \                # экспорт SRT
    --output-vtt \                # экспорт VTT
    --output-json-full \          # детальный JSON с word-level timestamps
    --print-colors \              # цветной stdout (для отладки)
    --suppress-non-speech-tokens
```

## Скорости (бенчмарки)

| Железо | large-v3-turbo realtime factor |
|---|---|
| Mac M2 Pro (Metal) | ~7-10x |
| Mac M4 Pro (Metal) | ~12-18x |
| Linux x86 8c CPU | ~0.3-0.5x |
| Linux x86 16c CPU | ~0.5-0.8x |
| RTX 3060 12GB (CUDA) | ~10x |
| RTX 4090 (CUDA) | ~15x |
| Raspberry Pi 5 | ~0.05-0.1x (small только) |

> 💡 На Mac MLX (см. [mlx-whisper.md](mlx-whisper.md)) обычно быстрее чем whisper.cpp с Metal. Но whisper.cpp компактнее и проще встраивать.

## Diarization (кто-кого-говорит)

В whisper.cpp нет встроенной diarization. Workaround:

1. **Stereo-разделение каналов** — если запись зум-звонка где каждый спикер на своём канале:
```bash
./whisper-cli -di -f stereo.wav   # -di включает diarization по каналам
```

2. **Полноценная diarization** через внешние инструменты — `pyannote.audio` (Python) или `simple-diarizer`. См. [docs/diarization.md](../docs/diarization.md).

## Известные грабли

### `failed to compute log mel spectrogram`

Аудио не в формате 16kHz mono WAV. Конвертируй:
```bash
ffmpeg -i input.mp3 -ar 16000 -ac 1 output.wav
```

### Сборка падает на Windows

Поставь Visual Studio Build Tools (не сам Visual Studio Community — это лишнее). Лучше использовать WSL2.

### CUDA-сборка падает с `nvcc fatal: Unsupported gpu architecture`

Старая `compute capability`. В CMake укажи нужную:
```bash
cmake -B build -DGGML_CUDA=1 -DCMAKE_CUDA_ARCHITECTURES=86  # для RTX 30xx
# 75 — RTX 20xx, 86 — RTX 30xx, 89 — RTX 40xx, 90 — H100
```

### Модель отдаёт галлюцинации (`Спасибо за просмотр` где должна быть тишина)

Включи VAD:
```bash
./whisper-cli ... --vad --vad-model models/ggml-silero-v5.1.2.bin
# Скачай модель: bash ./models/download-vad-model.sh silero-v5.1.2
```

### Качество хуже чем у faster-whisper

Чаще — нет, при той же модели результат идентичный. Если разница есть — проверь:
- Версия модели (используй последний quantized .bin с HF)
- Параметры (`--beam-size 5`, `--best-of 5`)
- VAD-фильтр включён

### `Out of memory` на CPU

Это значит модель не помещается в RAM:
- `tiny`: 100 MB RAM
- `base`: 200 MB
- `small`: 600 MB
- `medium`: 2 GB
- `large-v3`: 4 GB
- `large-v3-turbo`: 2 GB

Бери меньшую модель или больше RAM.
