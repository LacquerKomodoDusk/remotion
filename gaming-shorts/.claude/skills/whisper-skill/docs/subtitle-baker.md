# Subtitle Baker — сабы прямо в MP4 (CapCut-style)

Генерит видео с **вшитыми стилизованными субтитрами** одной командой. Закрывает цикл «видео → готовый клип для публикации» без CapCut Pro / Premiere.

## Что умеет

- ✅ Транскрибирует видео через Whisper (с word-level timestamps)
- ✅ Генерит **ASS-файл с karaoke-style подсветкой** (текущее слово красится)
- ✅ Вшивает в видео через ffmpeg
- ✅ 5 готовых стилей: TikTok, YouTube Shorts, Reels, Podcast Clip, Minimal
- ✅ Кастомизация: шрифт, цвет, размер, позиция, кол-во слов на строку

## Использование

```bash
# Базовый — TikTok стиль, авто-определение языка
python -m examples.bake_subs input.mp4

# С указанием стиля и языка
python -m examples.bake_subs input.mp4 --style youtube_shorts --language en

# Подкаст-клип, по 3 слова на строку
python -m examples.bake_subs podcast_clip.mp4 --style podcast_clip --max-words-per-line 3

# Сохранить в конкретное место
python -m examples.bake_subs input.mp4 --output /ready/clip.mp4
```

## Стили

### `tiktok` — стандарт TikTok
- Белый текст, **жёлтая подсветка активного слова**
- Жирный Montserrat, размер 64
- По центру внизу с большим отступом
- Чёрный outline + drop shadow для читаемости на любом фоне

### `youtube_shorts` — для Shorts
- Белый Inter, очень жирный, размер 72
- По центру **сверху** (там где Shorts оставляет больше пустого места)
- Больший outline для контраста

### `reels` — для Reels
- **Impact** (классический мем-шрифт), размер 80
- Белый с фиолетовым outline и подсветкой
- Без shadow — резкий стиль
- По центру снизу с большим отступом

### `podcast_clip` — для подкаст-нарезок
- Roboto, не жирный, размер 48
- Голубоватая подсветка активного слова
- Снизу, маленький отступ

### `minimal` — без украшательств
- Helvetica, не жирный, размер 42
- Только белый, тонкий чёрный outline
- Без подсветки — просто читабельные сабы

## Кастомизация под себя

Открой `examples/bake_subs.py`, найди `STYLES = {...}` и добавь свой:

```python
STYLES["my_brand"] = Style(
    name="my_brand",
    font="My Brand Font",
    font_size=58,
    primary_color="&H00FFFFFF",       # BGRA — обратный порядок! Белый
    secondary_color="&H000000FF",     # красный (BGRA)
    outline_color="&H00000000",
    bold=True,
    outline_width=4,
    shadow=2,
    alignment=2,                      # 1-9, см. Numpad
    margin_v=200,
)
```

### Цвета в ASS

ASS использует **BGRA** в hex (порядок инвертирован относительно RGB):

| Цвет | RGB | ASS BGRA |
|---|---|---|
| Белый | `#FFFFFF` | `&H00FFFFFF` |
| Чёрный | `#000000` | `&H00000000` |
| Жёлтый | `#FFFF00` | `&H0000FFFF` |
| Красный | `#FF0000` | `&H000000FF` |
| Зелёный | `#00FF00` | `&H0000FF00` |
| Синий | `#0000FF` | `&H00FF0000` |
| Розовый | `#FF00FF` | `&H00FF00FF` |

`&H00` в начале — это alpha (прозрачность), 00 = непрозрачно.

### Позиции (alignment)

Как Numpad:
```
7 = вверху-слева     8 = вверху-центр     9 = вверху-справа
4 = центр-слева      5 = центр            6 = центр-справа
1 = внизу-слева      2 = внизу-центр      3 = внизу-справа
```

## Karaoke-разметка (как работает подсветка)

Скрипт генерит ASS-теги вида `{\kf<duration_cs>}` перед каждым словом. `\kf` — это **fill-style highlighting** в ASS:
- Слово рисуется `secondary_color` (подсветка)
- За время `duration_cs` (centiseconds) plynно заливается `primary_color`
- Эффект «текущее слово светится / только что озвучилось»

Пример сгенерированной строки:
```
Dialogue: 0,0:00:01.00,0:00:02.50,tiktok,,0,0,0,,{\kf38}Привет {\kf45}как {\kf30}дела
```

Это значит:
- `Привет` подсвечивается 380 мс
- `как` — 450 мс
- `дела` — 300 мс

Word-level timestamps приходят из Whisper (`word_timestamps=True`).

## Производительность

На M2 Pro (Apple Silicon):
- 60-секундный TikTok: ~5 сек транскрибация + ~10 сек ffmpeg = **~15 сек на готовый клип**
- 3-минутный Reels: ~15 сек + ~30 сек = **~45 сек**
- 1-часовой подкаст с сабами: ~3 мин + ~10 мин = **~13 мин**

На NVIDIA RTX 4090:
- 60-сек TikTok: ~3 сек + ~3 сек = **~6 сек**

## Параметры

| Флаг | Дефолт | Описание |
|---|---|---|
| `input` | — | Видео-файл (mp4, mov, mkv, webm) |
| `--output, -o` | `<input>_subs.mp4` | Куда сохранить |
| `--style` | `tiktok` | tiktok / youtube_shorts / reels / podcast_clip / minimal |
| `--language, -l` | auto | Язык речи (`ru`, `en`, ...) |
| `--model, -m` | env or large-v3-turbo | Модель Whisper |
| `--max-words-per-line` | 5 | Сколько слов в одной строке сабов |
| `--keep-ass` | off | Сохранить промежуточный ASS-файл (для отладки) |

## Как ещё улучшить

### Свой шрифт

Если шрифт не установлен в системе — сабы будут другим (fallback). Чтобы поставить:

**Mac:**
```bash
brew install --cask font-montserrat font-inter font-impact font-roboto
```

**Linux:**
```bash
sudo apt install fonts-montserrat fonts-inter fonts-roboto
# или ручками в ~/.fonts/
```

**Windows:** скачай TTF и Install через ПКМ.

### Сразу несколько вариантов

Хочется попробовать стили? Делай в цикле:

```bash
for style in tiktok youtube_shorts reels minimal; do
    python -m examples.bake_subs input.mp4 --style $style \
        --output "out_${style}.mp4"
done
```

### Цикл «нашёл видео → сделал сабы → опубликовал»

```bash
# 1. Скачал видео из URL через yt-dlp wrapper
python -m examples.from_url "https://www.tiktok.com/@user/video/123" --output ./content/ --keep-audio

# 2. Перевшиваем сабы своим стилем
python -m examples.bake_subs ./content/123.mp4 --style tiktok

# 3. Готово — постишь
```

### A/B тест разных шрифтов

Делай 2 варианта и публикуй на разные аккаунты:
```bash
python -m examples.bake_subs in.mp4 --style tiktok --output a.mp4

# Открой STYLES в bake_subs.py, поменяй font на другой → новый style "tiktok_b"
python -m examples.bake_subs in.mp4 --style tiktok_b --output b.mp4
```

## Известные грабли

### Шрифт не отрисовывается / выглядит как Arial

Шрифт не установлен. Поставь через систему (см. выше) или поменяй в STYLES на тот что у тебя есть.

### Сабы за пределами кадра

Поправь `margin_v` в стиле. Также alignment 2 = снизу-центр, 8 = сверху-центр.

### ffmpeg падает на Windows с `Invalid argument`

Пути с пробелами / кириллицей. Положи видео в простой путь типа `C:\videos\in.mp4`.

### Подсветка слова идёт с задержкой

Word-timestamps Whisper'а не идеальны. Что помогает:
- Использовать `whisperx` (там alignment через wav2vec2 точнее)
- Препроцессинг аудио (нормализация громкости)

### Текст слишком много на одной строке

Уменьши `--max-words-per-line` до 3-4.

### Сабы слишком быстрые / медленные

Karaoke-длительность берётся из word-timestamps, обычно ок. Если выглядит странно — попробуй другую модель или без `--word_timestamps` (отключив в коде, тогда подсветка по сегментам, не по словам).
