import sys, numpy as np, soundfile as sf, sherpa_onnx as s
model, inp, outdir = sys.argv[1:4]
cfg = s.OfflineSourceSeparationConfig(model=s.OfflineSourceSeparationModelConfig(
    uvr=s.OfflineSourceSeparationUvrModelConfig(model=model), num_threads=4))
sep = s.OfflineSourceSeparation(cfg)
x, sr = sf.read(inp, dtype='float32', always_2d=True)
out = sep.process(sr, np.ascontiguousarray(x.T))
stems = out.stems
print('stems', len(stems), out.sample_rate)
names = ['voice', 'game']  # UVR Main: stem0 vocals, stem1 instrumental
for name, st in zip(names, stems):
    data = np.stack([np.asarray(c.data) for c in st.data]).T
    sf.write(f'{outdir}/{name}.wav', data, out.sample_rate)
