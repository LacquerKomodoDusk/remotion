# whisperx — faster-whisper + diarization + word-alignment

**GitHub:** https://github.com/m-bain/whisperX
**PyPI:** https://pypi.org/project/whisperx/
**Использовать когда:** нужна speaker diarization (подкасты, интервью); нужны точные word-level timestamps

whisperx = faster-whisper + два дополнительных модуля:
1. **wav2vec2 forced alignment** — точные таймстэмпы на каждое слово (точнее чем у Whisper нативно)
2. **pyannote.audio diarization** — определение «кто-кого-говорит»

## Когда брать именно whisperx

✅ **Подкасты / интервью / Zoom-записи** — нужна разметка спикеров
✅ **CapCut-стиль субтитров** — точные таймстэмпы на каждое слово
✅ **Транскрибат → SRT с метками `Speaker A:` / `Speaker B:`**

❌ Один спикер (TikTok / Reels / vlog) — лишняя сложность, бери [faster-whisper](faster-whisper.md)
❌ Apple Silicon — там [mlx-whisper](mlx-whisper.md) быстрее (но без diarization)
❌ Не Python окружение — бери [whisper.cpp](whisper-cpp.md)

## Установка

### Linux + NVIDIA GPU (рекомендуемый путь)

```bash
# 1) CUDA Toolkit 12.x уже стоит (см. faster-whisper.md)

# 2) venv
python3 -m venv .venv && source .venv/bin/activate

# 3) Установи whisperx (он сам подтянет faster-whisper, torch, pyannote)
pip install whisperx

# 4) ffmpeg
sudo apt install -y ffmpeg
```

### Windows / Mac / без GPU

То же самое, но `device="cpu"` вместо `cuda`.

## Hugging Face token — обязательно для diarization

`pyannote/speaker-diarization-3.1` — это gated-модель, нужно:

1. Зайти на HF: https://huggingface.co/pyannote/speaker-diarization-3.1
2. Согласиться с условиями использования (бесплатно)
3. То же самое для https://huggingface.co/pyannote/segmentation-3.0
4. Создать токен: https://huggingface.co/settings/tokens (тип "Read")
5. Положить в env: `export HF_TOKEN=hf_xxxxx`

## Минимальный пример с diarization

```python
import whisperx
import os

device = "cuda"          # или "cpu"
audio_file = "podcast.mp3"
batch_size = 16
compute_type = "float16" # CPU → "int8"

# 1. Транскрибация (faster-whisper под капотом)
model = whisperx.load_model("large-v3-turbo", device, compute_type=compute_type)
audio = whisperx.load_audio(audio_file)
result = model.transcribe(audio, batch_size=batch_size, language="ru")

# 2. Word-level alignment (wav2vec2)
model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)

# 3. Diarization (кто-кого-говорит)
diarize_model = whisperx.diarize.DiarizationPipeline(use_auth_token=os.environ["HF_TOKEN"], device=device)
diarize_segments = diarize_model(audio, min_speakers=2, max_speakers=4)

# 4. Слить таймлайны
result = whisperx.assign_word_speakers(diarize_segments, result)

# Печать результата
for seg in result["segments"]:
    speaker = seg.get("speaker", "?")
    print(f"[{seg['start']:.2f}s → {seg['end']:.2f}s] {speaker}: {seg['text']}")
```

Готовый пример с экспортом в SRT — `examples/podcast_diarize.py`.

## Output-формат

После всех шагов в `result["segments"]` каждый сегмент содержит:

```python
{
    "start": 12.34,
    "end": 18.76,
    "text": "Привет, мы сегодня обсуждаем...",
    "speaker": "SPEAKER_00",     # или "SPEAKER_01", ...
    "words": [
        {"word": "Привет", "start": 12.34, "end": 12.78, "speaker": "SPEAKER_00"},
        {"word": "мы", "start": 12.85, "end": 12.95, "speaker": "SPEAKER_00"},
        # ...
    ],
}
```

## Параметры

```python
diarize_segments = diarize_model(
    audio,
    min_speakers=2,        # минимум спикеров (если знаешь точно)
    max_speakers=4,        # максимум
    # num_speakers=2,      # точное число (если знаешь, лучше чем min/max)
)
```

Подсказка: для подкастов 1-на-1 используй `num_speakers=2`. Для интервью с гостями — `min_speakers=2, max_speakers=4`. Для совещаний — `max_speakers=10`.

## Скорости (на 1 час подкаста)

| Этап | RTX 4090 | M2 Pro CPU | x86 16c CPU |
|---|---|---|---|
| Транскрибация (large-v3-turbo) | 5 мин | 15 мин | 30 мин |
| Alignment (wav2vec2) | 30 сек | 2 мин | 5 мин |
| Diarization (pyannote) | 1 мин | 8 мин | 15 мин |
| **Итого 1 час подкаста** | **~7 мин** | **~25 мин** | **~50 мин** |

## Известные грабли

### `OSError: ... pyannote/segmentation-3.0 ... gated`

Не принял условия на HF. Зайди на https://huggingface.co/pyannote/segmentation-3.0 и согласись. Потом — то же для `pyannote/speaker-diarization-3.1`.

### `RuntimeError: torch.cuda.OutOfMemoryError`

Diarization делает форвард-пасс на длинном аудио. Решение:
- Резать длинные подкасты на куски по 30 минут
- Или: `compute_type="int8_float16"` для transcribe

### Diarization путает спикеров

Это нормально для близких голосов. Что помогает:
- Фиксировать `num_speakers` если знаешь
- Препроцессинг аудио (нормализация громкости, denoise)
- Отдельная запись каждого спикера на свой канал (если возможно)

### `wav2vec2 align` падает на русском

Не для всех языков есть alignment-модель. Если для языка нет:
```python
result = whisperx.align(..., language_code="ru")  # fallback к Whisper-таймстэмпам
```
Или указывай явную модель: `whisperx.load_align_model("WAV2VEC2_ASR_LARGE_LV60K_960H", device)`.

### Файл аудио весит больше 1 ГБ

whisperx грузит весь файл в память. Для длинных файлов разрезай через ffmpeg или используй `chunk_size=30`.
