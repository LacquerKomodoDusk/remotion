import sys, json, numpy as np, soundfile as sf, sherpa_onnx as s, subprocess
M = '/home/user/remotion/work/models'
inp = sys.argv[1]
pcm = subprocess.run(['ffmpeg','-v','error','-i',inp,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout
x = np.frombuffer(pcm, np.float32)
g = M+'/sherpa-onnx-nemo-transducer-giga-am-v2-russian-2025-04-19'
giga = s.OfflineRecognizer.from_transducer(encoder=g+'/encoder.int8.onnx', decoder=g+'/decoder.onnx', joiner=g+'/joiner.onnx', tokens=g+'/tokens.txt', model_type='nemo_transducer', num_threads=4)
w = M+'/sherpa-onnx-whisper-medium'
wh = s.OfflineRecognizer.from_whisper(encoder=w+'/medium-encoder.int8.onnx', decoder=w+'/medium-decoder.int8.onnx', tokens=w+'/medium-tokens.txt', language='ru', task='transcribe', num_threads=4)
# chunk by ~ silence-agnostic windows of 8s with overlap avoided: use VAD-free fixed segmentation for short clips
res = {'giga': [], 'whisper': []}
for name, rec in [('giga', giga), ('whisper', wh)]:
    st = rec.create_stream(); st.accept_waveform(16000, x); rec.decode_stream(st)
    r = st.result
    res[name] = {'text': r.text, 'tokens': list(r.tokens), 'timestamps': [float(t) for t in r.timestamps]}
    print(name, ':', r.text)
json.dump(res, open(sys.argv[2],'w'), ensure_ascii=False, indent=1)
