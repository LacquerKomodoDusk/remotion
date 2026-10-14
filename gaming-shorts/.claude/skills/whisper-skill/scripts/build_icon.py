"""Конвертирует assets/icon.png в multi-size assets/icon.ico.

Запуск:
    python -m scripts.build_icon

Вшивает размеры 16/32/48/64/128/256 для корректного отображения
в трее, на ярлыке и в Проводнике на любом DPI.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
PNG_PATH = REPO_ROOT / "assets" / "icon.png"
ICO_PATH = REPO_ROOT / "assets" / "icon.ico"

ICO_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def main() -> int:
    if not PNG_PATH.exists():
        print(f"icon.png not found: {PNG_PATH}")
        return 1

    img = Image.open(PNG_PATH).convert("RGBA")
    img.save(ICO_PATH, format="ICO", sizes=ICO_SIZES)
    print(f"wrote {ICO_PATH} ({len(ICO_SIZES)} sizes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
