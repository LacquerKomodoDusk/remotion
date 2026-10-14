# Speed Tuning — как выжать максимум скорости

Whisper можно ускорить **в 5-10 раз** правильными настройками, без потери качества.

## Чек-лист по приоритету

### 1. Указывай язык явно (+5-10%)

```python
# Плохо
result = model.transcribe(audio)  # auto-detect

# Хорошо
result = model.transcribe(audio, language="ru")
```

Auto-detect требует прогон детектора языка по первым 30 секундам. Если знаешь язык — указывай.

### 2. Включи VAD-фильтр (+50-200% на видео с тишиной)

VAD (Voice Activity Detection) пропускает участки без речи. На видео с длинными паузами или фоновой музыкой без слов — **в 2-3x быстрее**.

```python
# faster-whisper
segments, info = model.transcribe(
    audio,
    vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 500},
)
```

```bash
# whisper.cpp
./whisper-cli ... --vad --vad-model models/ggml-silero-v5.1.2.bin
```

### 3. Бери `large-v3-turbo` вместо `large-v3` (+700%)

`turbo` — это `large-v3` с укороченным декодером (32 → 4 слоя). На популярных языках качество почти то же, скорость **в 8x выше**.

```python
WhisperModel("large-v3-turbo", ...)
```

⚠️ На редких языках (казахский, узбекский, etc) `turbo` хуже на 5-10%. Там оставляй `large-v3`.

### 4. Правильный compute_type (+100-300%)

| Железо | Лучший compute_type | Эффект |
|---|---|---|
| NVIDIA GPU 10+ GB VRAM | `float16` | дефолт |
| NVIDIA GPU 4-10 GB VRAM | `int8_float16` | -1% качества, x2 batch размер |
| NVIDIA GPU 4 GB VRAM | `int8` | x4 batch размер, потеря 2% |
| CPU | `int8` | дефолт |
| CPU слабый | `int8` + `tiny`/`small` | компромисс |

```python
WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
```

### 5. Batched inference на длинных файлах (+200-400%)

faster-whisper 1.0+ умеет параллелить чанки:

```python
from faster_whisper import WhisperModel, BatchedInferencePipeline

model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
batched = BatchedInferencePipeline(model=model)

segments, info = batched.transcribe(
    audio,
    batch_size=16,        # для RTX 4090. На 3060: 8. На 4060: 4.
    language="ru",
    vad_filter=True,
)
```

Эффект значимый только на файлах >5 минут.

### 6. Препроцессинг аудио (+10-30%)

Whisper нативно работает с **16 kHz mono**. Если у тебя 48 kHz stereo — он сам ресемплит, но это лишнее время. Лучше прогнать через ffmpeg ОДИН раз:

```bash
ffmpeg -i input.mp4 -ar 16000 -ac 1 -c:a pcm_s16le output.wav
```

Потом всегда скармливай уже подготовленный wav.

### 7. Уменьши beam_size (+10-30%)

Дефолт `beam_size=5` — это «попробовать 5 вариантов и выбрать лучший». На простом аудио хватает 1:

```python
result = model.transcribe(audio, beam_size=1, best_of=1)
# чуть хуже на сложном аудио, заметно быстрее
```

Когда реально надо 5: интервью с акцентом, шумом, плохой записью. На студийных записях 1 вариант = хватит.

### 8. word_timestamps только когда нужны (+5-15%)

Пословные таймстэмпы — лишняя работа. Если тебе нужен только текст, не выходные сабы — **выключай**:

```python
result = model.transcribe(audio, word_timestamps=False)
```

### 9. Обычный transcribe vs streaming

Если нужен realtime (live транскрибация микрофона) — это другой режим, см. отдельные библиотеки `whisper_streaming` или `WhisperLive`. Они оптимизированы под низкий latency, но качество чуть ниже.

Если просто файл → текст — обычный `transcribe` и есть самый быстрый.

---

## Бенчмарки до и после оптимизации

**Сценарий:** 1 час подкаста на M2 Pro (Apple Silicon, 16 GB RAM).

| Конфигурация | Время | Realtime factor |
|---|---|---|
| `mlx-whisper large-v3 default` | 12 минут | 5x |
| + `large-v3-turbo` | 4 минуты | 15x |
| + явный `language="ru"` | 3.8 минут | 16x |
| + ffmpeg pre-resample 16kHz | 3.5 минут | 17x |
| + `word_timestamps=False` | 3.3 минуты | 18x |

**Сценарий:** 1 час подкаста на RTX 4090.

| Конфигурация | Время |
|---|---|
| `faster-whisper large-v3 default` | 6 минут |
| + `large-v3-turbo` | 3.5 минут |
| + `BatchedInferencePipeline batch_size=16` | 1.5 минут |
| + `compute_type=int8_float16` | 1.2 минут |

**Сценарий:** 1 час подкаста на CPU (8c x86).

| Конфигурация | Время |
|---|---|
| `faster-whisper large-v3 float32` | 3 часа (медленнее audio!) |
| + `compute_type=int8` | 1.5 часа |
| + `large-v3-turbo` | 30 минут |
| + `vad_filter=True` (если много пауз) | 15-20 минут |

---

## Подводные камни

### Слишком агрессивный VAD режет реальную речь

Симптом: пропуски слов в местах где есть тихий голос.

```python
# Поправь параметры — менее жадный VAD
vad_parameters={
    "min_silence_duration_ms": 1000,  # требовать минимум 1 сек тишины (а не 0.5)
    "threshold": 0.3,                 # дефолт 0.5, ниже = чувствительнее
    "speech_pad_ms": 100,             # дефолт 30, можно увеличить
}
```

### `int8` сломал качество

Редко, но бывает на специфичном аудио. Откатывайся к `int8_float16` или `float16`.

### `batch_size=32` упал OOM

Уменьшай до 16, 8, 4. На младших GPU (8GB VRAM) ставь 4.

### Скорость не выросла после оптимизаций

Чек-лист:
1. **GPU реально используется?** `nvidia-smi` во время транскрибации — должна быть нагрузка.
2. **Не упёрся ли в I/O?** Если читаешь файл с медленного диска — это узкое место.
3. **Не блокируется ли другими процессами?** `top` / `htop` / `Activity Monitor`.

---

## Ультимативный setup для прода

### На NVIDIA GPU (промышленные объёмы)

```python
from faster_whisper import WhisperModel, BatchedInferencePipeline

model = WhisperModel(
    "large-v3-turbo",
    device="cuda",
    compute_type="float16",
)
batched = BatchedInferencePipeline(model=model)

def transcribe_fast(audio_path, language="ru"):
    segments, info = batched.transcribe(
        audio_path,
        batch_size=16,
        language=language,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        word_timestamps=False,  # включай только когда нужны сабы
        beam_size=1,            # 1 для скорости, 5 для качества
    )
    return list(segments), info
```

### На Apple Silicon (студия одного человека)

```python
import mlx_whisper

def transcribe_fast(audio_path, language="ru"):
    return mlx_whisper.transcribe(
        audio_path,
        path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
        language=language,
        word_timestamps=False,
        verbose=False,
    )
```

### На CPU (без выбора)

```python
from faster_whisper import WhisperModel

model = WhisperModel(
    "large-v3-turbo",
    device="cpu",
    compute_type="int8",
    cpu_threads=8,        # количество потоков
    num_workers=1,        # параллельность чтения файла
)
```
