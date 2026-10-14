"""
Скачать видео из URL (TikTok / YouTube / Reels) и транскрибировать.

Использование:
    python -m examples.from_url "https://www.tiktok.com/@user/video/123..."
    python -m examples.from_url "https://www.youtube.com/watch?v=..." --language en
    python -m examples.from_url "https://www.instagram.com/reel/..." --output ./out/

Зависимости:
    pip install yt-dlp
"""

import argparse
import sys
from pathlib import Path

from examples.common import (
    download_audio_from_url,
    transcribe,
    save_srt, save_txt,
)


def main():
    p = argparse.ArgumentParser(description="URL → транскрибат")
    p.add_argument("url", help="URL видео (TikTok / YouTube / Instagram / Twitter / etc — всё что yt-dlp умеет)")
    p.add_argument("--language", "-l", default=None)
    p.add_argument("--model", "-m", default=None)
    p.add_argument("--output", "-o", default=".", help="Куда складывать (по умолчанию текущая папка)")
    p.add_argument("--keep-audio", action="store_true", help="Не удалять mp3 после транскрибации")
    p.add_argument("--quiet", "-q", action="store_true")
    args = p.parse_args()

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not args.quiet:
        print(f"📥 Скачиваю аудио из {args.url}...")

    audio_path = download_audio_from_url(args.url, out_dir)

    if not args.quiet:
        print(f"✅ Скачано: {audio_path}")
        print(f"🎙 Транскрибирую...")

    result = transcribe(
        audio_path,
        language=args.language,
        model_name=args.model,
        word_timestamps=True,
        verbose=not args.quiet,
    )

    base = audio_path.stem
    srt_path = out_dir / f"{base}.srt"
    txt_path = out_dir / f"{base}.txt"

    save_srt(result, srt_path)
    save_txt(result, txt_path)

    if not args.quiet:
        print(f"✅ Готово ({result.backend} / {result.model} / {result.language})")
        print(f"   {srt_path}")
        print(f"   {txt_path}")
        print()
        print("─── ТЕКСТ ─────────────────────────")
        print(result.text)
        print("───────────────────────────────────")

    if not args.keep_audio:
        audio_path.unlink(missing_ok=True)
        if not args.quiet:
            print(f"🗑  Удалил {audio_path.name} (флаг --keep-audio чтобы оставить)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
