"""
Транскрибировать один файл → SRT/VTT/TXT/JSON

Использование:
    python -m examples.transcribe_one input.mp3
    python -m examples.transcribe_one input.mp4 --language ru --format srt,txt
    python -m examples.transcribe_one input.wav --model large-v3 --output ./out/

Дефолт:
    язык — авто
    модель — large-v3-turbo (override через WHISPER_MODEL env)
    форматы — srt + txt
    куда — рядом с входным файлом
"""

import argparse
import sys
from pathlib import Path

from examples.common import (
    transcribe,
    save_srt, save_vtt, save_txt, save_json,
)


FORMAT_HANDLERS = {
    "srt": (save_srt, "srt"),
    "vtt": (save_vtt, "vtt"),
    "txt": (save_txt, "txt"),
    "json": (save_json, "json"),
}


def main():
    p = argparse.ArgumentParser(description="Транскрибировать один файл (Whisper-Stack)")
    p.add_argument("input", help="Путь к аудио/видео")
    p.add_argument("--language", "-l", default=None, help='Язык (например "ru"). По умолчанию — auto')
    p.add_argument("--model", "-m", default=None, help="Модель (large-v3-turbo / large-v3 / medium / ...)")
    p.add_argument(
        "--format", "-f", default="srt,txt",
        help="Через запятую: srt, vtt, txt, json (по умолчанию srt,txt)",
    )
    p.add_argument("--output", "-o", default=None, help="Куда складывать (по умолчанию рядом с входом)")
    p.add_argument("--no-words", action="store_true", help="Не считать пословные timestamps (быстрее)")
    p.add_argument("--quiet", "-q", action="store_true", help="Тихий режим")
    args = p.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Не найден: {input_path}", file=sys.stderr)
        return 1

    out_dir = Path(args.output) if args.output else input_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    base = input_path.stem

    formats = [f.strip().lower() for f in args.format.split(",") if f.strip()]
    bad = [f for f in formats if f not in FORMAT_HANDLERS]
    if bad:
        print(f"Неизвестные форматы: {bad}. Доступные: {list(FORMAT_HANDLERS)}", file=sys.stderr)
        return 1

    if not args.quiet:
        print(f"📥 Транскрибирую {input_path.name}...")

    result = transcribe(
        input_path,
        language=args.language,
        model_name=args.model,
        word_timestamps=not args.no_words,
        verbose=not args.quiet,
    )

    if not args.quiet:
        print(f"✅ Готово: backend={result.backend}, model={result.model}, language={result.language}")
        print(f"   Сегментов: {len(result.segments)}, символов: {len(result.text)}")

    for fmt in formats:
        writer, ext = FORMAT_HANDLERS[fmt]
        out_path = out_dir / f"{base}.{ext}"
        writer(result, out_path)
        if not args.quiet:
            print(f"💾 {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
