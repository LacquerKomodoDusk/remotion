#!/usr/bin/env bash
# proxy -> picture -> sound (censor + SFX rule check) -> master -> mux.  Usage: ./make.sh
set -euo pipefail
cd "$(dirname "$0")"; ROOT=$(cd .. && pwd)
[ -f public/game.mp4 ] || ffmpeg -v error -y -i "$ROOT/input/in.mp4" -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.3" \
	-c:v libx264 -preset slow -crf 13 -g 12 -pix_fmt yuv420p -an public/game.mp4
npx remotion render Main "$ROOT/out/video.mp4" --muted --concurrency=3 --crf=16
python3 -I audio/verify.py "$ROOT"   # builds the mix, trims any SFX louder than the original, repeats until clean
ffmpeg -v error -y -i "$ROOT/work/mix_raw.wav" -af "volume=8dB,alimiter=limit=0.5:attack=3:release=60:level=false,volume=-8dB" -c:a pcm_f32le "$ROOT/work/mix_lim.wav"
M=$(ffmpeg -hide_banner -i "$ROOT/work/mix_lim.wav" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
j() { echo "$M" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i "$ROOT/work/mix_lim.wav" -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(j input_i):measured_TP=$(j input_tp):measured_LRA=$(j input_lra):measured_thresh=$(j input_thresh):offset=$(j target_offset):linear=true" -ar 48000 -c:a pcm_s16le "$ROOT/work/mix_final.wav"
ffmpeg -v error -y -i "$ROOT/out/video.mp4" -i "$ROOT/work/mix_final.wav" -map 0:v -map 1:a -c:v libx264 -profile:v high -crf 18 -preset veryfast \
	-pix_fmt yuv420p -c:a aac -b:a 320k -shortest -movflags +faststart "$ROOT/out/out.mp4"
echo "$ROOT/out/out.mp4"
