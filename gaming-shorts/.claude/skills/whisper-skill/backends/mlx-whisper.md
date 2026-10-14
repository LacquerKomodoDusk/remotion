# mlx-whisper — Whisper на Apple Silicon (Metal)

**GitHub:** https://github.com/ml-explore/mlx-examples
**PyPI:** https://pypi.org/project/mlx-whisper/
**Использовать когда:** Mac M1 / M2 / M3 / M4 / M5
**Не использовать когда:** Intel Mac, Linux, Windows

MLX — фреймворк Apple для машинного обучения на Apple Silicon. `mlx-whisper` — это порт OpenAI Whisper на MLX. Использует unified memory + Metal Performance Shaders. На M-чипах **в 1.5-3x быстрее** чем faster-whisper на том же Mac.

## Когда брать именно mlx-whisper

✅ **Mac M-чип**, и нужна максимальная скорость
✅ Работаешь только локально, без серверов
✅ Хочешь самый простой PyPI-путь

❌ **Intel Mac** — MLX не работает на x86, бери faster-whisper
❌ **Diarization (кто-кого-говорит)** не встроена — для подкастов используй whisperx

## Установка

```bash
# 1) ffmpeg (если ещё нет)
brew install ffmpeg

# 2) venv + mlx-whisper
python3 -m venv .venv
source .venv/bin/activate
pip install mlx-whisper

# 3) (опционально) yt-dlp для скачивания TikTok/YT-видео
pip install yt-dlp
```

## Минимальный пример

```bash
# CLI
mlx_whisper --model mlx-community/whisper-large-v3-turbo --language ru audio.mp3
```

```python
# Python
import mlx_whisper

result = mlx_whisper.transcribe(
    "audio.mp3",
    path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
    language="ru",        # авто, если не указать (но лучше указать)
    word_timestamps=True, # для CapCut-стиля субтитров
)

print(result["text"])
for seg in result["segments"]:
    print(f"[{seg['start']:.1f}s → {seg['end']:.1f}s] {seg['text']}")
```

## Модели в MLX-формате

Все модели лежат на Hugging Face под `mlx-community/`:

| Модель | Размер | Когда брать |
|---|---|---|
| `mlx-community/whisper-tiny` | 75 MB | играться, тесты |
| `mlx-community/whisper-base` | 145 MB | очень слабое железо |
| `mlx-community/whisper-small` | 450 MB | компромисс |
| `mlx-community/whisper-medium` | 1.5 GB | хорошо для RU |
| `mlx-community/whisper-large-v3` | 3.0 GB | максимум качества |
| `mlx-community/whisper-large-v3-turbo` | 1.6 GB | **дефолт для прода** |
| `mlx-community/distil-whisper-large-v3` | 1.5 GB | EN-only, самый быстрый |

**Дефолт:** `large-v3-turbo` — 8x быстрее `large-v3` при потере 1-2% на популярных языках.

## Скорости (бенчмарки)

На M2 Pro (16GB unified memory) с `large-v3-turbo`:

| Длительность аудио | Время транскрибации | Real-time factor |
|---|---|---|
| 1 минута | ~3-4 сек | ~17x realtime |
| 1 час подкаста | ~3-4 минуты | ~17x realtime |
| 3-часовое интервью | ~10-12 минут | ~16x realtime |

На M4 Pro / M4 Max — добавляй +30-50% скорости.

## Параметры которые имеет смысл крутить

```python
result = mlx_whisper.transcribe(
    audio,
    path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
    language="ru",                    # явно — быстрее и точнее
    task="transcribe",                # "translate" → переводит в EN
    initial_prompt="...",             # подсказка о домене ("медицинский подкаст")
    word_timestamps=True,             # для пословных сабов
    condition_on_previous_text=True,  # лучше связность, но риск зацикливания
    temperature=0.0,                  # детерминированно
    no_speech_threshold=0.6,          # фильтр тишины
    compression_ratio_threshold=2.4,  # fallback при подозрительных результатах
    logprob_threshold=-1.0,           # ditto
    fp16=True,                        # на M-чипах всегда True (Metal)
    verbose=False,                    # тише в stdout
)
```

## Известные грабли

### `OSError: dlopen Library not loaded: ... libmlx`

MLX тянет нативную библиотеку. Если упало — пересобери pip-пакет:
```bash
pip install --force-reinstall --no-cache-dir mlx-whisper
```

### Модель скачивается каждый раз

По дефолту MLX кэширует в `~/.cache/huggingface/hub/`. Проверь права на эту папку.

### Загрузка зависает на «Downloading model»

Слабый wifi или ограничения по сети. Скачай модель один раз вручную:
```bash
huggingface-cli download mlx-community/whisper-large-v3-turbo
```

### Качество хуже чем у faster-whisper

В большинстве случаев — нет. Если есть подозрение — попробуй:
- Тот же `large-v3` на обоих, не `turbo`
- VAD-фильтр (для MLX надо вручную через `silero-vad` перед транскрибацией)
- Резкое включение `condition_on_previous_text=True`

## Альтернатива: whisper.cpp с Core ML

Тоже работает на Apple Silicon, использует Core ML (а не Metal через MLX). Чуть медленнее MLX, но **один бинарник без Python**. См. [whisper-cpp.md](whisper-cpp.md).
