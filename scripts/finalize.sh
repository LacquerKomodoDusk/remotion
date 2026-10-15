#!/usr/bin/env bash
# Финальная обработка рендера Remotion для TikTok:
# громкость -14 LUFS (двухпроходный loudnorm), AAC 48 кГц 256 кбит/с стерео, faststart, проверка ffprobe.
# Использование: scripts/finalize.sh <raw.mp4> <final.mp4>
set -euo pipefail
raw="$1"
final="$2"

stats=$(ffmpeg -hide_banner -nostats -i "$raw" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python3 -c "import sys,json; print(json.load(sys.stdin)['$1'])"; }

ffmpeg -hide_banner -v error -y -i "$raw" -map 0:v:0 -map 0:a:0 -c:v copy \
	-af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" \
	-c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart "$final"

echo "== ffprobe: $final"
ffprobe -v error -show_entries stream=codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,sample_rate,channels,bit_rate -show_entries format=duration,size -of compact=p=0 "$final"
echo "== громкость итогового файла"
ffmpeg -hide_banner -nostats -i "$final" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)" | tail -2
echo "== moov в начале файла (faststart)"
python3 - "$final" <<'EOF'
import sys
with open(sys.argv[1], 'rb') as f:
    data = f.read(1 << 20)
m, d = data.find(b'moov'), data.find(b'mdat')
print('ok: moov перед mdat' if 0 <= m < d or (m >= 0 and d < 0) else 'НЕТ faststart')
EOF
