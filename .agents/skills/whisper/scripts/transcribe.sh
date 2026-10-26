#!/usr/bin/env bash
# Transcribes a media file into word-level Remotion Caption JSON.
set -euo pipefail

IN="$1"
OUT="$2"
LANG_CODE="${3:-ru}"
MODEL="${4:-small}"
ROOT="$HOME/.cache/whisper-skill"
CLI="$ROOT/whisper.cpp/build/bin/whisper-cli"
MODEL_FILE="$ROOT/models/ggml-$MODEL.bin"

if [[ ! -x "$CLI" || ! -f "$MODEL_FILE" ]]; then
	echo "Run setup.sh $MODEL first." >&2
	exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ffmpeg -v error -y -i "$IN" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$TMP/audio.wav"
# -ml 1 -sow: one word per segment; -ojf: full JSON with token probabilities
"$CLI" -m "$MODEL_FILE" -f "$TMP/audio.wav" -l "$LANG_CODE" -t "$(nproc)" -ml 1 -sow -ojf -of "$TMP/out" -np >/dev/null

python3 -I - "$TMP/out.json" "$OUT" "$LANG_CODE" "$MODEL" <<'EOF'
import json, sys

src, dst, lang, model = sys.argv[1:5]
data = json.load(open(src, encoding="utf-8"))
captions = []
for seg in data["transcription"]:
    text = seg["text"]
    if not text.strip():
        continue
    tokens = [t for t in seg.get("tokens", []) if not t["text"].startswith("[_")]
    conf = sum(t["p"] for t in tokens) / len(tokens) if tokens else None
    start, end = seg["offsets"]["from"], seg["offsets"]["to"]
    captions.append({
        "text": text if text.startswith(" ") else " " + text,
        "startMs": start,
        "endMs": end,
        "timestampMs": (start + end) // 2,
        "confidence": round(conf, 3) if conf is not None else None,
    })

json.dump({
    "language": lang,
    "model": model,
    "text": "".join(c["text"] for c in captions).strip(),
    "captions": captions,
}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(captions)} words -> {dst}")
EOF
