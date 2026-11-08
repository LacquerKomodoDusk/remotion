set -e
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
cd /home/user/remotion/shorts3
for i in ${@:-1 2 3 4 5 6}; do
  (cd remotion && npx remotion render src/index.ts V$i ../v$i/work/remotion_out.mp4 --gl=swangle --browser-executable=$B --concurrency=4 --muted --crf=14 --log=error)
  bash master.sh $i
done
