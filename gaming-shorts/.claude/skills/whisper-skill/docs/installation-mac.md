# Установка под macOS

> 🍎 **TL;DR**: Apple Silicon (M1/M2/M3/M4/M5) → бери `mlx-whisper`. Intel Mac → `faster-whisper` (CPU). Установка 5 минут.

## Apple Silicon (M-чипы) — рекомендованный путь

> ⚠️ **Используй Python 3.12** (не 3.14). На 3.14 нет wheels для mlx-whisper / numba / torch (на момент 2026-05). На 3.10–3.13 всё работает.

```bash
# 1) Homebrew если ещё нет
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2) ffmpeg + python 3.12 + (опционально) tk для cursor_indicator
brew install ffmpeg python@3.12
# Если планируешь использовать show_cursor_indicator на не-Mac:
# brew install python-tk@3.12
# (на macOS cursor_indicator всё равно отключён из-за Tk thread-safety —
# подробнее в docs/voice-dictation.md → секция "macOS: процесс падает")

# 3) venv для проекта
mkdir -p ~/whisper-projects && cd ~/whisper-projects
python3.12 -m venv .venv
source .venv/bin/activate

# 4) Сам whisper
pip install --upgrade pip
pip install mlx-whisper yt-dlp

# 5) Проверка
mlx_whisper --help

# 6) Тестовая транскрибация (модель скачается автоматом, ~1.6 GB)
mlx_whisper --model mlx-community/whisper-large-v3-turbo \
            --language ru \
            --output-dir ./out \
            sample.mp3
```

### Альтернатива на M-чипе — whisper.cpp

Если не хочешь Python вообще:

```bash
brew install whisper-cpp
mkdir -p ~/whisper-models
cd ~/whisper-models
curl -LO https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin

# Использование
whisper-cli -m ~/whisper-models/ggml-large-v3-turbo.bin \
            -l ru -f sample.wav --output-srt
```

⚠️ whisper.cpp хочет 16kHz mono WAV. Конвертация:
```bash
ffmpeg -i input.mp3 -ar 16000 -ac 1 -c:a pcm_s16le sample.wav
```

## Intel Mac

MLX не работает на Intel. Бери `faster-whisper` в CPU-режиме:

```bash
brew install ffmpeg python@3.12

cd ~/whisper-projects
python3.12 -m venv .venv && source .venv/bin/activate
pip install faster-whisper yt-dlp
```

Использование:
```python
from faster_whisper import WhisperModel
model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
segments, info = model.transcribe("audio.mp3", language="ru", vad_filter=True)
for s in segments:
    print(f"[{s.start:.1f}s] {s.text}")
```

⚠️ На Intel Mac скорость ~0.3-0.5x realtime — медленно. Для прода рассматривай переход на M-чип или сервер с GPU.

## Установка Diarization (если нужны спикеры)

Только при работе с подкастами / интервью / Zoom-записями.

```bash
# Внутри уже созданного venv
pip install whisperx

# Hugging Face token (бесплатно)
# 1. Зарегайся на https://huggingface.co
# 2. Создай токен https://huggingface.co/settings/tokens
# 3. Согласись с условиями этих двух моделей:
#    https://huggingface.co/pyannote/speaker-diarization-3.1
#    https://huggingface.co/pyannote/segmentation-3.0

echo 'export HF_TOKEN=hf_xxxxxxxx' >> ~/.zshrc
source ~/.zshrc
```

⚠️ На Mac whisperx работает на CPU (там нет CUDA). На M2 Pro 1 час подкаста с diarization ≈ 25 минут. Терпимо.

## Где модели хранятся

`~/.cache/huggingface/hub/` — все скачанные модели лежат там, между разными бэкендами шарятся.

Если кончилось место:
```bash
huggingface-cli delete-cache  # интерактивный селект
```

## Тестовый файл

Если нет под рукой:
```bash
# Скачать sample
curl -LO https://github.com/ggerganov/whisper.cpp/raw/master/samples/jfk.wav
# 11 секунд, английский, JFK speech
```

Или из YouTube:
```bash
yt-dlp -x --audio-format mp3 -o sample.%\(ext\)s "https://www.youtube.com/watch?v=KAZdTHMmxYw"
```

## Если что-то падает

См. [docs/known-issues.md](known-issues.md) — там самые частые грабли с решениями.

Базовый чек:
```bash
# Все ли установлено
which python ffmpeg yt-dlp
python -c "import mlx_whisper; print(mlx_whisper.__version__)"  # для M-чипов
python -c "from faster_whisper import WhisperModel; print('ok')"  # для Intel

# Сколько свободно места (нужно ~10 GB на старте)
df -h ~/

# Сколько свободно RAM
vm_stat | head -5
```
