"""
Подкаст с разметкой спикеров (кто-кого-говорит).

Использование:
    python -m examples.podcast_diarize podcast.mp3 --speakers 2
    python -m examples.podcast_diarize interview.wav --min-speakers 2 --max-speakers 4

Зависимости:
    pip install whisperx
    + Hugging Face token (бесплатный) в env: HF_TOKEN=hf_xxx

    Также требуется согласие на условия использования pyannote-моделей:
    https://huggingface.co/pyannote/speaker-diarization-3.1
    https://huggingface.co/pyannote/segmentation-3.0
"""

import argparse
import os
import sys
from pathlib import Path


def main():
    p = argparse.ArgumentParser(description="Транскрибация подкаста с дикторами")
    p.add_argument("input", help="Аудио/видео файл")
    p.add_argument("--language", "-l", default=None)
    p.add_argument("--model", "-m", default="large-v3-turbo")
    p.add_argument("--speakers", type=int, default=None,
                   help="Точное число спикеров (если знаешь — ставь, лучше чем min/max)")
    p.add_argument("--min-speakers", type=int, default=2)
    p.add_argument("--max-speakers", type=int, default=4)
    p.add_argument("--output", "-o", default=None, help="Куда писать SRT (по умолчанию рядом с входом)")
    args = p.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Не найден: {input_path}", file=sys.stderr)
        return 1

    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if not hf_token:
        print(
            "Нужен Hugging Face token в env (HF_TOKEN=...).\n"
            "Получи бесплатно на https://huggingface.co/settings/tokens\n"
            "И прими условия pyannote: https://huggingface.co/pyannote/speaker-diarization-3.1",
            file=sys.stderr,
        )
        return 1

    try:
        import whisperx
    except ImportError:
        print("Не установлен whisperx. pip install whisperx", file=sys.stderr)
        return 1

    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"

    print(f"🎙 Транскрибирую {input_path.name} (whisperx, model={args.model}, device={device})...")
    audio = whisperx.load_audio(str(input_path))
    model = whisperx.load_model(args.model, device, compute_type=compute_type)
    transcript = model.transcribe(audio, batch_size=16, language=args.language)
    detected_lang = transcript["language"]
    print(f"   Язык: {detected_lang}")

    print("🎯 Алайнмент (точные word-level timestamps)...")
    try:
        align_model, metadata = whisperx.load_align_model(
            language_code=detected_lang, device=device,
        )
        transcript = whisperx.align(
            transcript["segments"], align_model, metadata, audio, device,
            return_char_alignments=False,
        )
    except Exception as e:
        print(f"   ⚠ Skipped: {e}")

    print("👥 Разметка спикеров (pyannote)...")
    diarize_model = whisperx.diarize.DiarizationPipeline(use_auth_token=hf_token, device=device)
    diarize_kwargs = {}
    if args.speakers:
        diarize_kwargs["num_speakers"] = args.speakers
    else:
        diarize_kwargs["min_speakers"] = args.min_speakers
        diarize_kwargs["max_speakers"] = args.max_speakers

    diarize_segments = diarize_model(audio, **diarize_kwargs)
    transcript = whisperx.assign_word_speakers(diarize_segments, transcript)

    # Считаем спикеров
    speakers = sorted({s.get("speaker", "?") for s in transcript["segments"]})
    print(f"   Найдено спикеров: {len(speakers)} ({', '.join(speakers)})")

    # Печать + сохранение
    out_dir = Path(args.output) if args.output else input_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    out_srt = out_dir / f"{input_path.stem}.srt"

    print()
    print("─── ТРАНСКРИБАТ ─────────────────────")
    with out_srt.open("w", encoding="utf-8") as f:
        for i, seg in enumerate(transcript["segments"], 1):
            spk = seg.get("speaker", "?")
            start, end = seg["start"], seg["end"]
            text = seg["text"].strip()

            # Печать
            print(f"[{start:6.1f}s → {end:6.1f}s] {spk}: {text}")

            # SRT
            def ts(s):
                h = int(s // 3600)
                m = int((s % 3600) // 60)
                ss = s % 60
                return f"{h:02d}:{m:02d}:{int(ss):02d},{int((ss-int(ss))*1000):03d}"

            f.write(f"{i}\n{ts(start)} --> {ts(end)}\n{spk}: {text}\n\n")

    print(f"\n💾 SRT → {out_srt}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
