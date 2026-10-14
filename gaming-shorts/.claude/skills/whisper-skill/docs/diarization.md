# Diarization — кто-кого-говорит

> **TL;DR:** Diarization = разметка речи на спикеров (`Speaker A`, `Speaker B`, ...). Нужна для подкастов, интервью, Zoom-записей, совещаний. Не нужна для коротких видео с одним диктором.

## Когда нужна

✅ Подкасты с гостями
✅ Интервью
✅ Zoom / Google Meet записи
✅ Совещания
✅ Дебаты
✅ Multi-speaker контент для дубляжа (нужно знать когда чей голос)

❌ TikTok / Reels / Shorts (один спикер)
❌ Vlog
❌ Лекции одного преподавателя
❌ Аудио-новости (один диктор)

## Базовое использование (через whisperx)

Главный инструмент — [whisperx](../backends/whisperx.md). Под капотом он использует pyannote.audio для diarization.

```python
import whisperx
import os

device = "cuda"   # или "cpu"
audio_file = "podcast.mp3"

# 1. Транскрибация
model = whisperx.load_model("large-v3-turbo", device, compute_type="float16")
audio = whisperx.load_audio(audio_file)
result = model.transcribe(audio, batch_size=16, language="ru")

# 2. Word alignment (точные таймстэмпы)
align_model, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
result = whisperx.align(result["segments"], align_model, metadata, audio, device, return_char_alignments=False)

# 3. Diarization
diarize_model = whisperx.diarize.DiarizationPipeline(
    use_auth_token=os.environ["HF_TOKEN"],
    device=device,
)
diarize_segments = diarize_model(audio, num_speakers=2)  # точное число если знаешь

# 4. Слить в один результат
result = whisperx.assign_word_speakers(diarize_segments, result)

# Печать
for seg in result["segments"]:
    print(f"[{seg['start']:.1f}s] {seg['speaker']}: {seg['text']}")
```

## Готовый пример

В [examples/podcast_diarize.py](../examples/podcast_diarize.py) — рабочий скрипт:
```bash
python -m examples.podcast_diarize podcast.mp3 --speakers 2
```

## Получение Hugging Face токена

pyannote-модели требуют согласия:

1. Зарегайся на https://huggingface.co
2. Согласись на use-conditions:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0
3. Создай токен на https://huggingface.co/settings/tokens (тип "Read")
4. В env:
   ```bash
   export HF_TOKEN=hf_xxxxxxxx
   ```

⚠️ Токен **бесплатный** и нужен только для скачивания моделей. После первой загрузки модели работают локально без интернета.

## Параметры diarization

```python
diarize_segments = diarize_model(
    audio,

    # === Если знаешь точное число спикеров ===
    num_speakers=2,

    # === Или диапазон ===
    min_speakers=2,
    max_speakers=4,
)
```

Подсказка:
- **2-on-2 интервью** → `num_speakers=2` (если только хост и гость)
- **Подкаст с гостем** → `num_speakers=2`
- **Дискуссионный подкаст** → `min_speakers=2, max_speakers=5`
- **Совещание** → `max_speakers=10`

## Имена спикеров вместо `SPEAKER_00`

После diarization у тебя будет `SPEAKER_00`, `SPEAKER_01`, ... — это анонимные ярлыки. Подставить настоящие имена нужно вручную:

```python
# Допустим, ты послушал первые 30 секунд и определил кто кто
SPEAKER_NAMES = {
    "SPEAKER_00": "Иван (хост)",
    "SPEAKER_01": "Петя (гость)",
}

for seg in result["segments"]:
    raw = seg.get("speaker", "?")
    name = SPEAKER_NAMES.get(raw, raw)
    print(f"[{seg['start']:.1f}s] {name}: {seg['text']}")
```

Для агентств — можно построить базу голос-эмбеддингов и автоматически узнавать спикеров:

```python
from pyannote.audio import Inference
from pyannote.audio.pipelines.speaker_verification import PretrainedSpeakerEmbedding

# Сохранить эмбеддинги известных спикеров один раз
embedder = PretrainedSpeakerEmbedding("speechbrain/spkrec-ecapa-voxceleb")
ivan_embedding = embedder("ivan_sample.wav")  # короткий sample только Ивана

# Дальше при diarization сравнивать с базой через cosine similarity
# (см. https://github.com/pyannote/pyannote-audio/discussions)
```

## Переход к word-level

После всех 3 шагов в `result["segments"][i]["words"]` будет:

```python
[
    {"word": "Привет", "start": 12.34, "end": 12.78, "speaker": "SPEAKER_00"},
    {"word": "мы", "start": 12.85, "end": 12.95, "speaker": "SPEAKER_00"},
    {"word": "сегодня", "start": 13.0, "end": 13.4, "speaker": "SPEAKER_00"},
    # ...
]
```

Это даёт **пословные сабы со спикерами** — можно делать видео в стиле «подсветка слова цветом текущего спикера».

## Без whisperx — голый pyannote

Если whisperx не подходит (например хочешь только diarization, без транскрибации):

```bash
pip install pyannote.audio
```

```python
from pyannote.audio import Pipeline

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token=os.environ["HF_TOKEN"],
)
diarization = pipeline("audio.wav", num_speakers=2)

for turn, _, speaker in diarization.itertracks(yield_label=True):
    print(f"[{turn.start:.1f}s → {turn.end:.1f}s] {speaker}")
```

## Качество diarization

| Условия | Точность (DER, чем меньше тем лучше) |
|---|---|
| Студийная запись, 2 спикера, разные голоса | 5-8% |
| Подкаст с гостем, разные голоса | 8-12% |
| Близкие голоса (двое мужчин, оба басовитые) | 15-25% |
| Сильный фон / шум / музыка | 20-40% |
| Очень короткие реплики (1-2 сек) | хуже |

## Если diarization путает спикеров

1. **Зафиксируй число** — `num_speakers=N` лучше чем `min/max_speakers`
2. **Препроцессинг** — `ffmpeg -af loudnorm` для нормализации, `Demucs --two-stems=vocals` если есть фоновая музыка
3. **Длиннее запись = лучше** — на коротких клипах хуже работает (мало образцов голоса)
4. **Multi-channel запись** — если есть отдельные каналы под спикеров (Zoom может писать так), используй каждый канал отдельно
5. **Голосовые эмбеддинги** — компонент сравнения голосов с базой известных

## Альтернативы

- **simple-diarizer** (https://github.com/cvqluu/simple_diarizer) — чисто на pyannote, без whisperx, проще
- **Resemblyzer** — старый, но работающий путь
- **NeMo Speaker Diarization** (NVIDIA) — мощно, но сложнее установка
- **PyAnnote 4.x** (когда выйдет, ожидается 2026) — обещают +10% точности

## Стоимость

Бесплатно. Pyannote-модели бесплатные после согласия с use-conditions. Никаких per-call оплат.

Время:
- На 1 час подкаста: 1-2 мин на CUDA, 8-15 мин на M-чип CPU, 10-25 мин на x86 CPU
