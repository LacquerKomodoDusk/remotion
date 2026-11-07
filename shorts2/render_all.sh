set -e
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
cd /home/user/remotion/shorts2
for i in ${@:-1 2 3 4}; do
  (cd remotion && npx remotion render src/index.ts V$i ../v$i/work/remotion_out.mp4 --gl=swangle --browser-executable=$B --concurrency=4 --muted --crf=14 --log=error)
  J=$(ffmpeg -hide_banner -i v$i/work/mix_premaster.wav -af loudnorm=I=-13.0:TP=-1.2:LRA=9:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  M=$(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
  ffmpeg -v error -y -i v$i/work/remotion_out.mp4 -i v$i/work/mix_premaster.wav -map 0:v -map 1:a \
    -vf "scale=in_range=full:out_range=tv,format=yuv420p" -r 60 -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -color_range tv \
    -af "loudnorm=I=-13.0:TP=-1.2:LRA=9:$M:linear=true,aresample=48000" -c:a aac -b:a 320k -shortest -movflags +faststart v$i/out/edit_final.mp4
  echo "v$i done $(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 v$i/out/edit_final.mp4) frames"
  ffmpeg -hide_banner -i v$i/out/edit_final.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak"
done
