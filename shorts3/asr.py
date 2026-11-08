import sherpa_onnx, soundfile as sf, librosa, json, sys
M='/tmp/claude-0/models/';G=M+'sherpa-onnx-nemo-transducer-giga-am-v2-russian-2025-04-19/';W=M+'sherpa-onnx-whisper-turbo/'
g=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=G+'encoder.int8.onnx',decoder=G+'decoder.onnx',joiner=G+'joiner.onnx',tokens=G+'tokens.txt',model_type='nemo_transducer',num_threads=4)
w=sherpa_onnx.OfflineRecognizer.from_whisper(encoder=W+'turbo-encoder.int8.onnx',decoder=W+'turbo-decoder.int8.onnx',tokens=W+'turbo-tokens.txt',language='ru',num_threads=4)
for d in sys.argv[1:]:
  y,sr=sf.read(d+'/work/audio16k.wav',dtype='float32')
  iv=librosa.effects.split(y,top_db=30,frame_length=1024,hop_length=256); segs=[]
  for a,b in iv:
    a=max(0,a-int(.15*sr)); b=min(len(y),b+int(.15*sr))
    if segs and a-segs[-1][1]<.35*sr: segs[-1][1]=b
    else: segs.append([a,b])
  out=[]; print('=====',d)
  for a,b in segs:
    r={}
    for name,rec in (('giga',g),('whisper',w)):
      s=rec.create_stream(); s.accept_waveform(sr,y[a:b]); rec.decode_stream(s); res=s.result; r[name]=res.text
      if name=='giga': r['tokens']=[[t,round(a/sr+ts,3)] for t,ts in zip(res.tokens,res.timestamps)]
    print(f"{a/sr:6.2f}-{b/sr:6.2f} | G: {r['giga']}\n              | W: {r['whisper']}",flush=True)
    out.append({'start':a/sr,'end':b/sr,**r})
  json.dump(out,open(d+'/work/asr.json','w'),ensure_ascii=False,indent=1)
