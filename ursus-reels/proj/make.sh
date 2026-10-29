#!/usr/bin/env bash
# Full pipeline: proxy -> (analysis files in ../work are already committed) -> render -> sound -> mux
# Usage: ./make.sh [draft|final]
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd .. && pwd)
MODE=${1:-final}

# 1) 1080x1920 H.264 proxy of the HEVC source (lanczos + light unsharp), seek-friendly GOP
[ -f public/source.mp4 ] || ffmpeg -v error -y -i "$ROOT/input/source.mov" \
	-vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.35" -c:v libx264 -preset slow -crf 12 -g 10 -pix_fmt yuv420p -an public/source.mp4

# 2) picture (software WebGL; see remotion.config.ts)
npx remotion render UrsusReels "$ROOT/out/${MODE}_video.mp4" --muted --concurrency=3 --crf=16

# 3) sound: cleaned voice cut by the EDL + synthesized bed + SFX, then two-pass loudnorm to -14 LUFS
python3 -I audio/build_audio.py "$ROOT"
M=$(ffmpeg -hide_banner -f f32le -ar 48000 -ac 2 -i "$ROOT/work/mix_raw.f32" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
j() { echo "$M" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -f f32le -ar 48000 -ac 2 -i "$ROOT/work/mix_raw.f32" \
	-af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(j input_i):measured_TP=$(j input_tp):measured_LRA=$(j input_lra):measured_thresh=$(j input_thresh):offset=$(j target_offset):linear=true,volume=-0.4dB" \
	-ar 48000 -c:a pcm_s16le "$ROOT/work/mix_final.wav"

# 4) mux: H.264 High, CRF 18, veryfast, AAC 320k
OUT="$ROOT/out/ursus_reels_final.mp4"; [ "$MODE" = draft ] && OUT="$ROOT/out/draft.mp4"
ffmpeg -v error -y -i "$ROOT/out/${MODE}_video.mp4" -i "$ROOT/work/mix_final.wav" -map 0:v -map 1:a \
	-c:v libx264 -profile:v high -crf 18 -preset veryfast -pix_fmt yuv420p -r 30 \
	-c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest "$OUT"
echo "$OUT"
