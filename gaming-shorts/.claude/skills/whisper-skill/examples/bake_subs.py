"""
Subtitle Baker — вшить сабы в MP4 в CapCut-стиле.

Транскрибирует видео через Whisper (с word-level timestamps) и вшивает
стилизованные сабы прямо в видео-файл. Подсветка текущего слова,
готовые preset'ы стилей под TikTok / Reels / Shorts.

Использование:
    python -m examples.bake_subs input.mp4
    python -m examples.bake_subs input.mp4 --style tiktok --output ready.mp4
    python -m examples.bake_subs input.mp4 --style podcast_clip --language ru
    python -m examples.bake_subs input.mp4 --style minimal --max-words-per-line 3

Готовые стили:
    tiktok          — белый текст, жёлтая подсветка, по центру внизу, drop shadow
    youtube_shorts  — крупно, жирно, по центру вверху
    reels           — большой шрифт, цветной outline
    podcast_clip    — простой стиль с именем спикера сверху (если есть diarization)
    minimal         — тонкий белый, выровнен по центру

Зависимости:
    ffmpeg
    + любой whisper-бэкенд из стека
"""

from __future__ import annotations

import argparse
import shlex
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


# ─── Style presets (ASS format) ─────────────────────────────────────────────


@dataclass
class Style:
    """Параметры стиля. Превращаются в ASS-format Style line."""
    name: str
    font: str = "Montserrat"
    font_size: int = 64
    primary_color: str = "&H00FFFFFF"   # BGRA — белый
    secondary_color: str = "&H0000FFFF" # жёлтый (подсветка слова)
    outline_color: str = "&H00000000"   # чёрный outline
    back_color: str = "&H80000000"      # тень
    bold: bool = True
    italic: bool = False
    outline_width: int = 3
    shadow: int = 1
    alignment: int = 2                  # 1-9, 5 = центр, 2 = снизу-центр, 8 = сверху-центр
    margin_v: int = 60                  # вертикальный отступ
    margin_l: int = 30
    margin_r: int = 30


STYLES = {
    "tiktok": Style(
        name="tiktok",
        font="Montserrat",
        font_size=64,
        primary_color="&H00FFFFFF",
        secondary_color="&H0000FFFF",  # жёлтый
        outline_color="&H00000000",
        bold=True,
        outline_width=4,
        shadow=2,
        alignment=2,
        margin_v=200,
    ),
    "youtube_shorts": Style(
        name="youtube_shorts",
        font="Inter",
        font_size=72,
        primary_color="&H00FFFFFF",
        secondary_color="&H0000FFFF",
        outline_color="&H00000000",
        bold=True,
        outline_width=5,
        shadow=2,
        alignment=8,
        margin_v=240,
    ),
    "reels": Style(
        name="reels",
        font="Impact",
        font_size=80,
        primary_color="&H00FFFFFF",
        secondary_color="&H00FF00FF",  # фиолетовый
        outline_color="&H00FF00FF",
        bold=True,
        outline_width=6,
        shadow=0,
        alignment=2,
        margin_v=320,
    ),
    "podcast_clip": Style(
        name="podcast_clip",
        font="Roboto",
        font_size=48,
        primary_color="&H00FFFFFF",
        secondary_color="&H0000DDFF",
        outline_color="&H00000000",
        bold=False,
        outline_width=2,
        shadow=1,
        alignment=2,
        margin_v=80,
    ),
    "minimal": Style(
        name="minimal",
        font="Helvetica",
        font_size=42,
        primary_color="&H00FFFFFF",
        secondary_color="&H00FFFFFF",   # без подсветки
        outline_color="&H00000000",
        bold=False,
        outline_width=2,
        shadow=0,
        alignment=2,
        margin_v=80,
    ),
}


# ─── ASS file generation ────────────────────────────────────────────────────


def ts_ass(seconds: float) -> str:
    """1234.567 → 0:20:34.56"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def style_to_ass(style: Style) -> str:
    return (
        f"Style: {style.name},"
        f"{style.font},"
        f"{style.font_size},"
        f"{style.primary_color},"
        f"{style.secondary_color},"
        f"{style.outline_color},"
        f"{style.back_color},"
        f"{1 if style.bold else 0},"
        f"{1 if style.italic else 0},"
        f"0,0,"   # underline, strikeout
        f"100,100,"  # scale x, y
        f"0,0,"      # spacing, angle
        f"1,"        # border style 1=outline
        f"{style.outline_width},"
        f"{style.shadow},"
        f"{style.alignment},"
        f"{style.margin_l},{style.margin_r},{style.margin_v},"
        f"1"  # encoding
    )


def write_ass_karaoke(
    segments: list,
    out_path: Path,
    style: Style,
    width: int,
    height: int,
    max_words_per_line: int = 5,
):
    """
    Сгенерировать ASS-файл с karaoke-style word highlighting.

    Каждый Dialogue line содержит до max_words_per_line слов. Активное слово
    подсвечивается через {\\k} (karaoke duration в сантисекундах).
    """
    lines_header = [
        "[Script Info]",
        f"Title: Whisper Stack Subs",
        f"PlayResX: {width}",
        f"PlayResY: {height}",
        "ScriptType: v4.00+",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        style_to_ass(style),
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    dialogue_lines = []

    # Группируем по N слов, либо по сегменту если он короткий
    for seg in segments:
        words = seg.words if seg.words else None
        if not words:
            # Нет word-level timestamps → весь сегмент одной строкой
            text = seg.text.strip().replace("\n", " ")
            dialogue_lines.append(
                f"Dialogue: 0,{ts_ass(seg.start)},{ts_ass(seg.end)},{style.name},,0,0,0,,{text}"
            )
            continue

        # Бьём слова на чанки
        chunks: list[list] = []
        current: list = []
        for w in words:
            current.append(w)
            if len(current) >= max_words_per_line:
                chunks.append(current)
                current = []
        if current:
            chunks.append(current)

        for chunk in chunks:
            if not chunk:
                continue
            chunk_start = chunk[0].start
            chunk_end = chunk[-1].end

            # Karaoke-разметка: \k<duration_in_centiseconds> перед каждым словом
            parts = []
            for i, w in enumerate(chunk):
                duration_cs = int(round((w.end - w.start) * 100))
                # пробел перед словом если не первое
                prefix = "" if i == 0 else " "
                # \kf — fill style highlighting (более красиво чем \k)
                parts.append(f"{{\\kf{duration_cs}}}{prefix}{w.word.strip()}")

            text = "".join(parts)
            dialogue_lines.append(
                f"Dialogue: 0,{ts_ass(chunk_start)},{ts_ass(chunk_end)},{style.name},,0,0,0,,{text}"
            )

    out_path.write_text("\n".join(lines_header + dialogue_lines), encoding="utf-8")


# ─── ffmpeg ─────────────────────────────────────────────────────────────────


def get_video_resolution(path: Path) -> tuple[int, int]:
    """ffprobe → (width, height)"""
    out = subprocess.check_output([
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0:s=x", str(path),
    ], text=True).strip()
    w, h = out.split("x")
    return int(w), int(h)


def burn_subs(video_in: Path, ass_path: Path, video_out: Path):
    """Вшить ASS-сабы в видео через ffmpeg."""
    # Path для ass-фильтра нужно эскейпить (на Windows ещё хитрее)
    ass_escaped = str(ass_path.absolute()).replace("\\", "/").replace(":", "\\:")
    vf = f"ass='{ass_escaped}'"
    cmd = [
        "ffmpeg", "-y", "-i", str(video_in),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-c:a", "copy",
        str(video_out),
    ]
    print(f"$ {' '.join(shlex.quote(c) for c in cmd)}")
    subprocess.run(cmd, check=True)


# ─── Main ───────────────────────────────────────────────────────────────────


def main():
    p = argparse.ArgumentParser(description="Вшить сабы в MP4 (CapCut-style)")
    p.add_argument("input", help="Видео-файл (mp4, mov, mkv, ...)")
    p.add_argument("--output", "-o", default=None, help="Куда сохранить (по умолчанию <input>_subs.mp4)")
    p.add_argument("--style", default="tiktok", choices=list(STYLES.keys()))
    p.add_argument("--language", "-l", default=None)
    p.add_argument("--model", "-m", default=None)
    p.add_argument("--max-words-per-line", type=int, default=5)
    p.add_argument("--keep-ass", action="store_true", help="Не удалять временный .ass файл")
    args = p.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("❌ ffmpeg / ffprobe не найдены. Установи их.", file=sys.stderr)
        return 1

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ Не найден: {input_path}", file=sys.stderr)
        return 1

    output_path = (
        Path(args.output) if args.output
        else input_path.with_name(f"{input_path.stem}_subs.mp4")
    )

    style = STYLES[args.style]
    print(f"🎬 Вход: {input_path}")
    print(f"🎨 Стиль: {args.style}")
    print(f"📤 Выход: {output_path}")

    # 1. Транскрибация
    print(f"\n[1/3] 🎙 Транскрибирую (с word-level timestamps)...")
    from examples.common import transcribe
    result = transcribe(
        input_path,
        language=args.language,
        model_name=args.model,
        word_timestamps=True,
        verbose=True,
    )
    print(f"      ✓ {len(result.segments)} сегментов, язык {result.language}, бэкенд {result.backend}")

    # 2. ASS файл
    print(f"\n[2/3] 📝 Генерирую ASS-сабы...")
    width, height = get_video_resolution(input_path)
    print(f"      Разрешение видео: {width}×{height}")
    ass_path = (
        Path(tempfile.gettempdir()) / f"whisper_subs_{input_path.stem}.ass"
        if not args.keep_ass
        else input_path.with_suffix(".ass")
    )
    write_ass_karaoke(
        result.segments, ass_path, style,
        width=width, height=height,
        max_words_per_line=args.max_words_per_line,
    )
    print(f"      ✓ ASS: {ass_path}")

    # 3. ffmpeg burn
    print(f"\n[3/3] 🔥 Вшиваю сабы в видео через ffmpeg...")
    try:
        burn_subs(input_path, ass_path, output_path)
    except subprocess.CalledProcessError as e:
        print(f"❌ ffmpeg упал: {e}", file=sys.stderr)
        return 1
    finally:
        if not args.keep_ass:
            try:
                ass_path.unlink()
            except Exception:
                pass

    print(f"\n✅ Готово: {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
