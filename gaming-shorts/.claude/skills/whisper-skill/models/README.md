# Whisper-модели — какую выбрать под задачу

Whisper выпускался в нескольких поколениях. На 2026 год **актуальны только три**:

- `large-v3` — эталонное качество, поддерживает все ~99 языков
- `large-v3-turbo` — оптимизированная версия v3 (8x быстрее, минус 1-2% на популярных языках)
- `distil-large-v3` — дистиллированная модель, **только английский**, самая быстрая

Остальные (`tiny`, `base`, `small`, `medium`) — для слабого железа или edge-устройств. На современном Mac M-чипе или GPU **никогда не нужны**.

## Шпаргалка под задачу

| Задача | Модель | Почему |
|---|---|---|
| **Транскрибация TikTok / Reels (короткие, RU/EN)** | `large-v3-turbo` | Скорость + качество. На клипе 60 сек разница с `large-v3` неощутима |
| **Подкасты RU/EN (1-3 ч)** | `large-v3-turbo` | Скорость критична на длинных файлах |
| **Контент на редких языках** (казахский, узбекский, татарский, армянский, грузинский) | `large-v3` | Turbo плохо натренирован на редких — теряет 5-10% качества |
| **Translation в EN** (любой → EN) | `large-v3` | turbo на translation работает хуже |
| **Только EN, нужна максимальная скорость** | `distil-large-v3` | EN-only, в 6x быстрее large-v3, потеря 1% |
| **Edge-устройство (Raspberry Pi, ESP32)** | `tiny` или `base` | Только эти влезут в RAM |
| **Слабый ноут без GPU, RAM < 8 GB** | `small` | Дальше уже плохо |

## Размеры и требования

### Полные модели

| Модель | Параметры | Размер на диске | RAM (CPU int8) | VRAM (GPU float16) | Языки |
|---|---|---|---|---|---|
| `tiny` | 39M | 75 MB | 0.4 GB | 1 GB | 99 |
| `base` | 74M | 145 MB | 0.5 GB | 1 GB | 99 |
| `small` | 244M | 460 MB | 1.0 GB | 2 GB | 99 |
| `medium` | 769M | 1.5 GB | 2.5 GB | 5 GB | 99 |
| `large-v3` | 1.55B | 3.0 GB | 5.0 GB | 10 GB | 99 |
| `large-v3-turbo` | 809M | 1.6 GB | 3.0 GB | 6 GB | 99 |
| `distil-large-v3` | 756M | 1.5 GB | 3.0 GB | 6 GB | **EN only** |

### Квантизованные (whisper.cpp / faster-whisper int8)

Те же модели, но в int8. Делят размер/RAM на ~2.

## Качество — реальные бенчмарки

WER (Word Error Rate) — чем меньше тем лучше. Дополнительные условия: **чистое аудио, один спикер, нет фонового шума**.

| Модель | EN (LibriSpeech) | RU (Common Voice 17) | KK (казахский) |
|---|---|---|---|
| `tiny` | 12% | 35% | 50%+ |
| `base` | 9% | 28% | 45% |
| `small` | 6% | 18% | 30% |
| `medium` | 4% | 12% | 22% |
| `large-v3` | **2%** | **9%** | **15%** |
| `large-v3-turbo` | 2.5% | 11% | 22% |
| `distil-large-v3` | 2% | — | — |

> **Вывод:** на популярных языках (EN/RU/ES/DE/FR/PT/IT/JP/ZH) — `turbo` почти как `large-v3`, бери его. На редких — только `large-v3`.

## Скорости — realtime factor

«В сколько раз быстрее аудио». 1.0× — обработка идёт ровно со скоростью аудио. 10× — за 1 минуту аудио уходит 6 секунд.

| Модель | RTX 4090 (CUDA fp16) | M2 Pro (MLX) | x86 16c CPU (int8) |
|---|---|---|---|
| `tiny` | 80x | 50x | 8x |
| `base` | 60x | 40x | 5x |
| `small` | 40x | 25x | 2x |
| `medium` | 20x | 12x | 0.8x |
| `large-v3` | 10x | 6x | 0.3x |
| `large-v3-turbo` | **17x** | **17x** | **0.6x** |
| `distil-large-v3` | 25x | 18x | 1x |

## Когда `turbo` НЕ подходит

`large-v3-turbo` — это сжатая версия `large-v3` (32 → 4 decoder layers). Хорошо работает на:
- ✅ EN, ES, DE, FR, IT, PT, JP, ZH, RU
- ✅ Популярных доменах (новости, ютуб, подкасты)

Хуже работает на:
- ❌ Редких языках (CIS-неславянские, многие африканские, индейские, малых SE-Азии)
- ❌ Translation task (Whisper переводит → EN; на этом таске turbo сильно слабее)
- ❌ Очень шумном аудио или сильном акценте

В этих случаях бери `large-v3`.

## Где скачать модели

### faster-whisper

Сами при первом запуске скачиваются с HF:
```python
WhisperModel("large-v3-turbo", ...)
# → качает из https://huggingface.co/Systran/faster-whisper-large-v3-turbo
```

### whisper.cpp

```bash
bash ./models/download-ggml-model.sh large-v3-turbo
# или прямой URL: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

### mlx-whisper

```bash
huggingface-cli download mlx-community/whisper-large-v3-turbo
```

Или передай в коде `path_or_hf_repo="mlx-community/whisper-large-v3-turbo"` — скачает автоматом.

## Кэш моделей

Все бэкенды кэшируют модели в `~/.cache/huggingface/hub/`. Один раз скачал — все бэкенды используют. Размер для всего «комплекта» (turbo + large-v3 + diarization) — примерно 7 GB.

Если не хватает места — удаляй ненужные:
```bash
huggingface-cli delete-cache
```
