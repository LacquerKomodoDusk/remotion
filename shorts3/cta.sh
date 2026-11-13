# append the subscribe end tag (author's TTS + CTA card over the blurred last frame) to finished videos
set -e
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
cd /home/user/remotion/shorts3
TTS=tts/tts_1794604351715_5.wav
meas() { ffmpeg -hide_banner -i "$1" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | awk '/I:/{i=$2}/Peak:/{p=$2}END{print i, p}'; }
for i in "$@"; do
  W=v$i/work
  ffmpeg -v error -y -sseof -0.1 -i $W/remotion_out.mp4 -update 1 -q:v 2 remotion/public/cta_bg_v$i.png
  (cd remotion && npx remotion render src/index.ts CTA ../$W/cta.mp4 --props="{\"bg\":\"cta_bg_v$i.png\"}" --gl=swangle --browser-executable=$B --concurrency=4 --muted --crf=14 --log=error)
  read TI _ <<< "$(meas $TTS)"
  G=$(python3 -c "print(round(-14.5 - ($TI), 2))")
  ffmpeg -v error -y -i $TTS -af "volume=${G}dB,aresample=48000,adelay=150|150,apad=whole_dur=4.5" -ac 2 -ar 48000 -c:a pcm_s24le $W/cta.wav
  ffmpeg -v error -y -i $W/master.wav -i $W/cta.wav -filter_complex "[0][1]concat=n=2:v=0:a=1,aresample=192000,alimiter=limit=0.85:attack=1:release=60:level=false,aresample=48000" -c:a pcm_s24le $W/master_cta.wav
  ffmpeg -v error -y -i $W/remotion_out.mp4 -i $W/cta.mp4 -i $W/master_cta.wav -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0,scale=in_range=full:out_range=tv,format=yuv420p[v]" -map "[v]" -map 2:a -r 60 -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -color_range tv -c:a aac -b:a 320k -shortest -movflags +faststart v$i/out/tmp.mp4
  mv v$i/out/tmp.mp4 v$i/out/edit_final.mp4
  echo "v$i +cta $(meas v$i/out/edit_final.mp4) frames $(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 v$i/out/edit_final.mp4)"
done
