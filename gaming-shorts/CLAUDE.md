# gaming-shorts — инструкции для Claude Code

Главный документ: [SPEC.md](SPEC.md). Как запускать: [README.md](README.md).

## Анализ монолога (шаг `analyze`, SPEC 5а)

Когда просят «проанализируй монолог <clip>»:

1. Прочитай `public/<clip>/data.json`: `words[]` (транскрипт с таймкодами), `accents[]`, `deadTime[]`, `report[]`.
2. Если слов нет или транскрипт неразборчив, честно отметь низкий `confidence`. По желанию посмотри кадры:
   `ffmpeg -i public/<clip>/source.mp4 -vf fps=2,scale=324:-1 public/<clip>/tmp/f_%03d.jpg`
   (на Windows с встроенным ffmpeg фильтра `fps` нет, тогда `-r 2` вместо `fps=2`).
3. Запиши `public/<clip>/analysis.json` в формате из SPEC 5а; типы в `src/lib/types.ts` (`Analysis`).
   Расширения: `cuts[].action = "keep"` защищает участок от автоматических вырезок тишины,
   `replays[]` даёт slow-mo повтор, `hook.prepend` ставь только после подтверждения пользователя.
4. Проверь итоговый монтаж: `npx tsx` со скриптом, который вызывает `buildTimeline()` из `src/lib/timeline.ts`,
   или перезапусти `npm run prep -- <clip>`: отчёт покажет длину после вырезок.
5. Покажи пользователю короткую сводку (хук, кульминация, что вырезано и почему) до рендера.

## Код

- `scripts/prep.ts` — нормализация, анализ, Whisper, `data.json`.
- `src/lib/timeline.ts` — вырезки, ускорения, повторы, пересчёт времени исходника в выходное.
- `src/Short.tsx` — композиция; `src/components/SegmentVideo.tsx` — раскладка вебка/геймплей; `src/components/Captions.tsx` — субтитры.
- Все пороги в `config.json`, в код их не зашивать.
- Проверка: `npm run check`, пробный рендер `npm run render -- <clip> --frames=0-150`.
