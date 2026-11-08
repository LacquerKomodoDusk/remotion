# word list from GigaAM tokens; word end refined by voice energy (token stamps only give onsets)
import json, sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
def words(v):
  y,sr=sf.read(f'v{v}/work/audio16k.wav'); y=sosfilt(butter(4,[150,3500],'bandpass',fs=sr,output='sos'),y)
  hop=160; r=np.sqrt(np.convolve(y**2,np.ones(400)/400,'same')[::hop]); db=20*np.log10(r+1e-6)
  out=[]
  for seg in json.load(open(f'v{v}/work/asr.json')):
    cur='';s=None;ws=[]
    for t,ts in seg['tokens']:
      if t.startswith('▁') or t==' ':
        if cur: ws.append([cur,s]); 
        cur=t.strip('▁ ');s=ts
      else:
        if s is None: s=ts
        cur+=t
    if cur: ws.append([cur,s])
    for i,(w,s) in enumerate(ws):
      nxt=ws[i+1][1] if i+1<len(ws) else seg['end']
      a=int(s*100); b=int(nxt*100); peak=db[a:b].max() if b>a else -99
      e=nxt
      for k in range(a+12,b):
        if db[k:k+8].max()<peak-18: e=k/100; break
      out.append((w,round(s,2),round(min(e,nxt),2),round(peak,1)))
  return out
if __name__=='__main__':
  for v in sys.argv[1:]:
    print('== v',v); print('  '.join(f'{w}[{s}-{e}]' for w,s,e,p in words(v)))
