import json
from faster_whisper import WhisperModel
m=WhisperModel("large-v3",device="cpu",compute_type="int8")
segs,info=m.transcribe("work/audio16k.wav",language="ru",word_timestamps=True,vad_filter=False,beam_size=5)
out=[]
for s in segs:
  print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}",flush=True)
  out.append({"start":s.start,"end":s.end,"text":s.text,"words":[{"w":w.word,"s":w.start,"e":w.end,"p":w.probability} for w in s.words]})
json.dump(out,open("work/whisper.json","w"),ensure_ascii=False,indent=1)
