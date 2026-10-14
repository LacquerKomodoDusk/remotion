"""Конвертация openai/whisper-{model_name} -> OpenVINO IR.

Использование:
    python scripts/convert_openvino.py large-v3-turbo
    python scripts/convert_openvino.py small
    python scripts/convert_openvino.py large-v3

Сохраняет в ~/.cache/openvino-whisper/whisper-{model_name}-ov/.
Эту папку потом подхватывает _transcribe_openvino из examples/common.py.

Конвертация занимает 1-3 минуты, но делается один раз на модель.
"""

import sys
import time
from pathlib import Path

from optimum.intel import OVModelForSpeechSeq2Seq
from transformers import AutoProcessor


def convert(model_name: str, out_root: Path | None = None) -> Path:
    out_root = out_root or (Path.home() / ".cache" / "openvino-whisper")
    out_dir = out_root / f"whisper-{model_name}-ov"
    if out_dir.exists() and any(out_dir.iterdir()):
        print(f"Already converted: {out_dir}")
        return out_dir

    src = f"openai/whisper-{model_name}"
    print(f"Converting {src} -> {out_dir}")
    t0 = time.time()
    processor = AutoProcessor.from_pretrained(src)
    model = OVModelForSpeechSeq2Seq.from_pretrained(src, export=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out_dir)
    processor.save_pretrained(out_dir)
    print(f"Done in {time.time()-t0:.1f}s")
    return out_dir


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    name = sys.argv[1]
    convert(name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
