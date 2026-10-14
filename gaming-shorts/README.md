# gaming-shorts

Remotion-шаблон для игровых нарезок TikTok / Shorts по [SPEC.md](SPEC.md):
один исходник (вебка сверху + геймплей снизу) → вертикальный ролик 1080×1920 с монтажом по смыслу,
акцентами, пословными субтитрами и «кря» вместо мата.

## Установка (Windows, один раз)

1. **Node.js 20+**: https://nodejs.org (LTS).
2. Распакуй проект в `D:\gaming-shorts` и в этой папке выполни:
   ```powershell
   npm install
   ```
3. **ffmpeg** (по желанию). У Remotion есть свой ffmpeg, и `prep` возьмёт его, если системного нет.
   Системный ffmpeg полнее, поставить его можно так:
   ```powershell
   winget install --id Gyan.FFmpeg -e
   ```
   После установки открой новый терминал и проверь: `ffmpeg -version`.
4. **Звуки** (по желанию): `npm run fetch-sfx` скачает стартовый набор (кря, свуши, vine boom, bruh) в `assets/sfx/`.
   Свои звуки клади туда же. Категория определяется по началу имени файла:
   `quack*` / `кря*` → мат, `whoosh*` / `whip*` → склейки, `boom*` / `vine*` → gameplay-акценты, `error*` / `bruh*` → freeze, `click*` → щелчок слов.
   Музыка: `assets/music/*.mp3`. После изменений в `assets/` запусти `npm run assets`.

## Работа с клипом

```powershell
# 1. положи клип в input\my-clip.mp4 (или .mov)
npm run transcribe -- my-clip    # Whisper через whisper-skill → input/my-clip.json
npm run prep -- my-clip          # звук −14 LUFS, анализ, Whisper, public/my-clip/data.json + отчёт
# 2. в Claude Code: «проанализируй монолог my-clip по SPEC.md, раздел 5а» → public/my-clip/analysis.json
npm run studio                   # превью и правки
npm run render -- my-clip --frames=0-150   # пробные 5 сек → out/my-clip-preview.mp4
npm run render -- my-clip        # финал → out/my-clip.mp4
```

Правки сразу видны в Studio:

- `config.json` — все параметры стиля и пороги;
- `public/<clip>/analysis.json` — хук, вырезки (`cut` / `speedup` / `keep`), пики, повторы;
- `public/<clip>/data.json` — слова, акценты, мёртвое время (перезаписывается при `prep`, поэтому ручные акценты помечай `"source": "manual"`).

## Транскрипция (Whisper)

`prep` берёт слова из первого найденного источника:

1. `input/<clip>.words.json` — ручной список `[{"text": "...", "start": 1.2, "end": 1.5}]`;
2. `input/<clip>.json` — JSON от **whisper-skill**. Скилл уже лежит в проекте (`.claude/skills/whisper-skill`),
   Claude Code в этой папке видит его сам. Один раз поставь движок и модель:
   ```powershell
   cd .claude\skills\whisper-skill; python wizard.py; cd ..\..\..
   ```
   и дальше для каждого клипа:
   ```powershell
   npm run transcribe -- my-clip      # → input/my-clip.json (модель: config.json → whisper.skillModel)
   ```
3. иначе встроенный whisper.cpp через `@remotion/install-whisper-cpp`: при первом запуске он скачает whisper.cpp и модель `config.json → whisper.model` (по умолчанию `medium`, около 1.5 ГБ).

`npm run prep -- my-clip --no-whisper` пропускает транскрипцию.

## Клип grenade-window

Для клипа `grenade-window` уже есть `public/grenade-window/analysis.json`, сделанный по картинке и звуку без транскрипта.
Чтобы его собрать, положи исходник в `input\grenade-window.mp4` и запусти `npm run prep -- grenade-window`.

## Что отличается от SPEC

- Встроенный ffmpeg Remotion не умеет `blackdetect`, поэтому чёрный экран и движение считаются по яркости кадров (10 кадров/с).
- В `analysis.json → cuts` есть действие `keep`: оно защищает участок от автоматических вырезок тишины.
- `analysis.json → replays`: повтор момента в slow-mo с зумом сразу после него (звук исходника в повторе выключен).
- `analysis.json → hook.prepend: true` дублирует хук в начало ролика. По умолчанию `false`, по SPEC порядок меняется только после твоего подтверждения.
- Если есть `analysis.json` с `peaks`, акценты берутся из него, а звуковые акценты из `data.json` не используются (`config.json → accents.useAudioWhenAnalysis`).
