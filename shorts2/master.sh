# audio master: gain to -14 LUFS + oversampled limiter (TP <= -1), remux without re-encoding video
set -e
cd /home/user/remotion/shorts2
meas() { ffmpeg -hide_banner -i "$1" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | awk '/I:/{i=$2}/Peak:/{p=$2}END{print i, p}'; }
for i in ${@:-1 2 3 4}; do
  P=v$i/work/mix_premaster.wav; O=v$i/work/master.wav
  G=0
  for pass in 1 2 3 4 5 6; do
    ffmpeg -v error -y -i $P -af "acompressor=threshold=0.1:ratio=3:attack=5:release=120:makeup=1,volume=${G}dB,aresample=192000,alimiter=limit=0.8:attack=1:release=60:level=false,aresample=48000" -c:a pcm_s24le $O
    read I TP <<< "$(meas $O)"
    G=$(python3 -c "print(round($G + (-14.0 - $I), 2))")
    echo "v$i pass $pass I=$I TP=$TP next_gain=$G"
  done
  ffmpeg -v error -y -i v$i/work/remotion_out.mp4 -i $O -map 0:v -map 1:a -vf "scale=in_range=full:out_range=tv,format=yuv420p" -r 60 -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -color_range tv -c:a aac -b:a 320k -shortest -movflags +faststart v$i/out/tmp.mp4
  mv v$i/out/tmp.mp4 v$i/out/edit_final.mp4
  echo "v$i final $(meas v$i/out/edit_final.mp4) frames $(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 v$i/out/edit_final.mp4)"
done
