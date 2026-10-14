"""
Транскрибировать всю папку с аудио/видео.

Использование:
    python -m examples.batch_folder ./videos/
    python -m examples.batch_folder ./videos/ --language ru --pattern "*.mp4"
    python -m examples.batch_folder ./videos/ --output ./transcripts/

Скрипт пробегает по всем файлам с указанным расширением, скипает уже
обработанные (если рядом лежит .srt — пропускает) и пишет SRT + TXT.
"""

import argparse
import sys
import time
from pathlib import Path

from examples.common import transcribe, save_srt, save_txt


DEFAULT_PATTERNS = ["*.mp3", "*.mp4", "*.m4a", "*.wav", "*.mov", "*.mkv", "*.flac", "*.ogg", "*.webm"]


def main():
    p = argparse.ArgumentParser(description="Пакетная транскрибация папки")
    p.add_argument("folder", help="Папка с медиа")
    p.add_argument("--language", "-l", default=None)
    p.add_argument("--model", "-m", default=None)
    p.add_argument("--pattern", default=None, help='Один паттерн или несколько через запятую (по умолчанию все аудио/видео)')
    p.add_argument("--output", "-o", default=None, help="Куда складывать SRT/TXT (по умолчанию рядом с источником)")
    p.add_argument("--force", action="store_true", help="Перезаписать даже если .srt уже есть")
    p.add_argument("--quiet", "-q", action="store_true")
    args = p.parse_args()

    src = Path(args.folder)
    if not src.is_dir():
        print(f"Не папка: {src}", file=sys.stderr)
        return 1

    out_dir = Path(args.output) if args.output else None
    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)

    patterns = (
        [p.strip() for p in args.pattern.split(",")] if args.pattern
        else DEFAULT_PATTERNS
    )

    files = []
    for pat in patterns:
        files.extend(src.rglob(pat))
    files = sorted(set(files))

    if not files:
        print("Файлы не найдены", file=sys.stderr)
        return 1

    print(f"Найдено {len(files)} файлов")

    skipped = 0
    failed = 0
    durations = []
    started = time.time()

    for i, file in enumerate(files, 1):
        target_dir = out_dir if out_dir else file.parent
        srt_path = target_dir / f"{file.stem}.srt"

        if srt_path.exists() and not args.force:
            if not args.quiet:
                print(f"[{i}/{len(files)}] ⏭  {file.name} (уже есть {srt_path.name})")
            skipped += 1
            continue

        if not args.quiet:
            print(f"[{i}/{len(files)}] 🎙 {file.name}")

        t0 = time.time()
        try:
            result = transcribe(
                file,
                language=args.language,
                model_name=args.model,
                word_timestamps=False,  # для batch обычно не нужно (быстрее)
                verbose=False,
            )
        except Exception as e:
            print(f"  ❌ {file.name}: {e}", file=sys.stderr)
            failed += 1
            continue

        save_srt(result, srt_path)
        save_txt(result, target_dir / f"{file.stem}.txt")
        elapsed = time.time() - t0
        durations.append(elapsed)
        if not args.quiet:
            print(f"  ✅ {elapsed:.1f}s — {len(result.segments)} сегментов → {srt_path}")

    total = time.time() - started
    print()
    print(f"Итого: обработано {len(durations)}, пропущено {skipped}, ошибок {failed}")
    if durations:
        print(f"Среднее время: {sum(durations)/len(durations):.1f}s. Всего: {total:.1f}s")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
