set -e
cd /home/user/remotion/shorts/remotion
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
npx remotion render src/index.ts Short ../work/remotion_out.mp4 --gl=swangle --browser-executable=$B --concurrency=4 --muted --crf=14 --log=error
cd ..
# loudness: 2-pass loudnorm to -14 LUFS / -1 dBTP
J=$(ffmpeg -hide_banner -i work/mix_premaster.wav -af loudnorm=I=-13.0:TP=-1.2:LRA=9:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
I=$(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -v error -y -i work/remotion_out.mp4 -i work/mix_premaster.wav -map 0:v -map 1:a \
  -vf "scale=in_range=full:out_range=tv,format=yuv420p" -r 60 -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -color_range tv \
  -af "loudnorm=I=-13.0:TP=-1.2:LRA=9:$I:linear=true,aresample=48000" -c:a aac -b:a 320k -shortest -movflags +faststart out/edit_final.mp4
ffprobe -v error -show_entries stream=codec_name,pix_fmt,width,height,r_frame_rate:format=duration -of compact out/edit_final.mp4
ffmpeg -hide_banner -i out/edit_final.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary | grep -E "I:|Peak:"
