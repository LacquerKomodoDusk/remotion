#!/usr/bin/env bash
# Usage: ./make.sh a|b  — proxy -> picture -> sound (censor + SFX loudness rule) -> master -> mux
set -euo pipefail
cd "$(dirname "$0")"; X=$1; ROOT=$(cd ../$X && pwd); ID=$([ "$X" = a ] && echo CsA || echo CsB)
python3 data/make_plans.py >/dev/null
[ -f public/$X.mp4 ] || ffmpeg -v error -y -i "$ROOT/input/in.mp4" -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.3" -c:v libx264 -preset slow -crf 13 -g 12 -pix_fmt yuv420p -an public/$X.mp4
npx remotion render $ID "$ROOT/out/video.mp4" --muted --concurrency=3 --crf=16
python3 -I audio/verify.py "$ROOT" $X
ffmpeg -v error -y -i "$ROOT/work/mix_raw.wav" -af "volume=8dB,alimiter=limit=0.5:attack=3:release=60:level=false,volume=-8dB" -c:a pcm_f32le "$ROOT/work/mix_lim.wav"
M=$(ffmpeg -hide_banner -i "$ROOT/work/mix_lim.wav" -af loudnorm=I=-14:TP=-2.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
j() { echo "$M" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i "$ROOT/work/mix_lim.wav" -af "loudnorm=I=-14:TP=-2.2:LRA=11:measured_I=$(j input_i):measured_TP=$(j input_tp):measured_LRA=$(j input_lra):measured_thresh=$(j input_thresh):offset=$(j target_offset):linear=true" -ar 48000 -c:a pcm_s16le "$ROOT/work/mix_final.wav"
ffmpeg -v error -y -i "$ROOT/out/video.mp4" -i "$ROOT/work/mix_final.wav" -map 0:v -map 1:a -c:v libx264 -profile:v high -crf 18 -preset veryfast \
	-pix_fmt yuv420p -c:a aac -b:a 320k -shortest -movflags +faststart "$ROOT/out/out.mp4"
ffmpeg -hide_banner -i "$ROOT/out/out.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)"
echo "$ROOT/out/out.mp4"
