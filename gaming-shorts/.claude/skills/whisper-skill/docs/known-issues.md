# Whisper-стек — известные грабли и как их чинить

## 🔴 Установка падает

### `pip install` ставит не тот пакет

`pip install whisper` ставит **старый и медленный** OpenAI пакет. Правильно:

| Что хотел | Правильная команда |
|---|---|
| Whisper на Mac M-чип | `pip install mlx-whisper` |
| Whisper на CUDA / CPU | `pip install faster-whisper` |
| Whisper + diarization | `pip install whisperx` |
| OpenAI оригинал (не нужен) | `pip install openai-whisper` |

### `error: Microsoft Visual C++ 14.0 or greater is required` (Windows)

Не хватает Build Tools. **Используй WSL2** — в 99% случаев это проще:
```powershell
wsl --install Ubuntu-22.04
# Дальше внутри WSL pip install как для Linux
```

### `RuntimeError: PyTorch is not compiled with CUDA enabled`

PyTorch установлен без CUDA. Переустанови с правильным wheel:
```bash
pip uninstall torch torchaudio
# Для CUDA 12.1:
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
# Для CUDA 11.8:
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### `Could not locate cublasLt64_12.dll` (Windows)

CUDA Toolkit не установлен. https://developer.nvidia.com/cuda-downloads — выбери Windows → exe (network).

### `OSError: libcudnn.so.8: cannot open shared object file` (Linux)

cuDNN не установлен:
```bash
sudo apt install libcudnn8 libcudnn8-dev
```

### Mac: `xcrun: error: invalid active developer path`

Не установлены Command Line Tools. Поставь:
```bash
xcode-select --install
```

---

## 🟡 Модель падает

### `RuntimeError: CUDA out of memory`

Модель не помещается в VRAM. По убывающей сложности:

1. **Перейти на меньшую модель**: `large-v3` → `large-v3-turbo` → `medium` → `small`
2. **Снизить compute_type**: `float16` → `int8_float16` → `int8` (экономия 2-4x)
3. **Уменьшить batch_size** (для batched-режима)
4. **Закрыть другие GPU-процессы**: `nvidia-smi` показывает что жрёт память

```python
# Например:
WhisperModel("large-v3-turbo", device="cuda", compute_type="int8_float16")
```

### `Out of memory` на CPU

RAM не хватает. Бери меньшую модель, **обязательно** в int8:
```python
WhisperModel("medium", device="cpu", compute_type="int8")
```

### Модель скачивается заново при каждом запуске

Кэш HF не работает. Проверь:
```bash
echo $HF_HOME
ls ~/.cache/huggingface/hub/
```

Если папки нет — создай и дай права:
```bash
mkdir -p ~/.cache/huggingface/hub
chmod -R u+rw ~/.cache/huggingface
```

### `KeyError: 'language'` или `'detected_language'`

Старая версия пакета. Обнови:
```bash
pip install --upgrade faster-whisper mlx-whisper whisperx
```

---

## 🟠 Качество транскрибации плохое

### Whisper галлюцинирует в тишине ("Спасибо за просмотр", "Подписывайтесь")

Whisper в тишине придумывает текст из тренировочных данных (на YouTube этих фраз были миллионы). Решение — **VAD-фильтр** (Voice Activity Detection):

```python
# faster-whisper — встроено
segments, info = model.transcribe(
    audio,
    vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 500},
)
```

```bash
# whisper.cpp — нужна VAD-модель
bash ./models/download-vad-model.sh silero-v5.1.2
./whisper-cli ... --vad --vad-model models/ggml-silero-v5.1.2.bin
```

```python
# mlx-whisper — нет встроенного VAD; делай предобработку через silero-vad:
pip install silero-vad
# (см. silero-vad README для интеграции)
```

### Whisper определяет русский как английский

На коротких клипах `auto` иногда ошибается. **Всегда указывай язык явно** если знаешь:

```python
model.transcribe(audio, language="ru")
```

### Качество хуже на русском чем на английском

Whisper тренировался на английском в 5x больше данных. На русском (и других) ошибается чаще. Что помогает:

1. **Брать `large-v3` а не `turbo`** — на не-EN turbo теряет больше
2. **`initial_prompt`** с примером домена/стиля:
   ```python
   model.transcribe(
       audio,
       language="ru",
       initial_prompt="Это интервью в формате подкаста о технологиях. Спикеры используют термины: AI, ML, нейросеть, GPU, фреймворк."
   )
   ```
3. **Препроцессинг аудио** — нормализация громкости (ffmpeg `-af loudnorm`), denoise (Demucs)
4. **Post-processing** — расстановка пунктуации через LLM после транскрибата (см. `methodology/post-processing.md`)

### Транскрибация плохая на видео с громкой музыкой

Whisper не отделяет голос от музыки. Прогоняй через **Demucs** перед Whisper:
```bash
pip install demucs
demucs --two-stems=vocals input.mp3
# → выходит no_vocals.wav и vocals.wav
# Дальше только vocals.wav в Whisper
```

### Текст без точек и заглавных букв

`large-v3` обычно ставит пунктуацию хорошо. Если нет:
```python
model.transcribe(
    audio,
    condition_on_previous_text=True,  # связность сегментов помогает пунктуации
)
```

Или post-processing через LLM:
```python
import anthropic
client = anthropic.Anthropic()
fixed = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=4096,
    messages=[{"role": "user", "content": f"Расставь пунктуацию и заглавные буквы:\n\n{transcript}"}]
).content[0].text
```

---

## 🟣 Diarization (whisperx)

### `OSError: ... pyannote/segmentation-3.0 ... gated`

Не принял условия использования. На каждой из этих страниц нажми "Agree":
- https://huggingface.co/pyannote/segmentation-3.0
- https://huggingface.co/pyannote/speaker-diarization-3.1

Затем создай токен: https://huggingface.co/settings/tokens

Затем в env:
```bash
export HF_TOKEN=hf_xxxxxxxxxxxx
```

### Diarization путает спикеров (один и тот же = два разных)

Близкие голоса. Что помогает:
1. **Зафиксируй число спикеров** если знаешь: `num_speakers=2`
2. **Препроцессинг** — denoise, normalize loudness
3. **Длинная запись** — на 30-секундном клипе diarization работает хуже чем на 10-минутном

### Diarization медленная

Это нормально — pyannote пробегает аудио несколько раз. На 1 час подкаста: 1-2 минуты на CUDA, 8-15 минут на CPU. Чтобы ускорить:
- Конвертируй в 16kHz WAV заранее (`ffmpeg -ar 16000 -ac 1`)
- Используй CUDA если есть

---

## 🔵 Производительность

### Транскрибация очень медленная

Чек-лист:

1. **Указан ли язык?** Auto-detect добавляет ~5-10%. `language="ru"` ускоряет.
2. **Включён ли VAD?** Без него Whisper обрабатывает тишину (трата времени).
3. **Какой compute_type?** На GPU должен быть `float16` (не `float32`).
4. **Какая модель?** `large-v3-turbo` на популярных языках в 8x быстрее `large-v3`.
5. **Используется GPU?** Проверь `nvidia-smi` во время транскрибации — должна быть нагрузка.
6. **Batched mode?** Для длинных файлов — `BatchedInferencePipeline` с `batch_size=16`.

### CPU перегружен другими процессами

Ограничь Whisper нити:
```python
import os
os.environ["OMP_NUM_THREADS"] = "4"
os.environ["MKL_NUM_THREADS"] = "4"
```

---

## 🟢 Прочее

### `ModuleNotFoundError: No module named 'whisper'`

Это про OpenAI оригинал. Замени на правильное имя пакета — см. таблицу в начале.

### Хочу смешанный язык (русский + английские термины)

Whisper не справляется идеально с code-switching. Лайфхак:
```python
model.transcribe(
    audio,
    language="ru",
    initial_prompt="Спикер использует англоязычные термины: API, deployment, monitoring, latency."
)
```

### Хочу транскрибат как у конкурента (TikTok-стиль с подсветкой слова)

Это **word-level timestamps** + ffmpeg для bake-in:
```python
result = transcribe(audio, word_timestamps=True)
# дальше — ffmpeg drawtext с метками каждого слова, см. methodology/word-level-subs.md
```

### Файл больше 1 GB / больше 4 часов

Все нормальные бэкенды разбивают на чанки по 30 секунд автоматом. Если падает по памяти — режь сам через ffmpeg:
```bash
ffmpeg -i long.wav -f segment -segment_time 1800 -c copy chunk_%03d.wav
# 1800 = 30 минут
```

Транскрибируй каждый чанк, потом склей результаты по таймстэмпам (offset += 30*60).

### Хочу дообучить Whisper на свой домен

Это другая история — fine-tuning. Краткий путь:
- HuggingFace Trainer + `openai/whisper-large-v3` базовый чекпоинт
- Датасет в формате `{audio, text, language}`
- 50-200 часов аудио своего домена
- 1-2 эпохи на A100 (несколько часов)
- См. https://huggingface.co/blog/fine-tune-whisper

Для 99% задач **выбор правильной модели** работает лучше чем дообучение — попробуй сначала `large-v3` + хороший `initial_prompt`.
