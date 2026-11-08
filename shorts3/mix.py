# audio: game ducked between words (kept loud in fight windows), quack over mat, per-video SFX from cfg
import json, sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
SR=48000; v=sys.argv[1]
cfg=json.load(open(f'remotion/src/configs/v{v}.json'))
y,_=sf.read(f'v{v}/work/audio48k.wav'); N=len(y); words=cfg['words']
rng=np.random.default_rng(int(v)+10)
bp=lambda lo,hi: butter(2,[lo,hi],'bandpass',fs=SR,output='sos')
def add(sig,t0,g=1.0):
  a=int(t0*SR); n=min(len(sig),N-a)
  if n>0: y[a:a+n]+=g*sig[:n,None]
g=np.full(N,0.6)
for w in words: g[max(0,int((w['s']-0.06)*SR)):int((w['e']+0.10)*SR)]=1.0
for a,b in cfg.get('loud',[]): g[int(a*SR):int(b*SR)]=np.maximum(g[int(a*SR):int(b*SR)],0.85)
k=int(.04*SR); g=np.convolve(g,np.ones(k)/k,mode='same'); y*=g[:,None]
def quack(L):
  n=int(L*SR); t=np.arange(n)/SR; u=t/L
  f0=560-220*u**0.7; ph=2*np.pi*np.cumsum(f0)/SR
  s=sum(np.sin(h*ph)/h**0.8 for h in range(1,14))+0.08*rng.standard_normal(n)
  s=sosfilt(bp(700,2300),s); s+=0.6*sosfilt(bp(1900,3400),s)
  env=np.minimum(1,t/0.012)*np.minimum(1,(L-t)/0.03)*(0.75+0.25*np.sin(np.pi*u)); s*=np.clip(env,0,1); return s/np.max(np.abs(s))
for w in words:
  if 'mat' in w['flags']:
    a=int(w['s']*SR); b=int(max(w['e'],w['s']+0.28)*SR); F=int(.006*SR)
    m=np.ones(N); m[a:b]=0.04; m[a-F:a]=np.linspace(1,.04,F); m[b:b+F]=np.linspace(.04,1,F); y*=m[:,None]
    add(quack((b-a)/SR)*0.5,w['s'])
T=lambda d: np.arange(int(d*SR))/SR
def tone(fs,d,dec,amp):
  t=T(d); return amp*sum(a*np.sin(2*np.pi*f*t) for f,a in fs)*np.exp(-t*dec)*np.minimum(1,t/0.004)
for e in cfg['sfx']:
  kind,t0=e[0],e[1]
  if kind=='whoosh':
    t=T(0.28); add(sosfilt(bp(600,5000),rng.standard_normal(len(t)))*np.sin(np.pi*t/0.28)**2*0.08,t0)
  elif kind=='sub':
    t=T(0.5); add(np.sin(2*np.pi*(52+30*np.exp(-t*25))*t)*np.exp(-t*6)*e[2],t0)
  elif kind=='chime':   # airport two-tone announcement chime
    add(tone([(784,1),(1568,.3)],0.7,3.5,0.14),t0); add(tone([(659,1),(1318,.3)],0.9,3,0.14),t0+0.32)
  elif kind=='bell':    # fairground / museum desk bell
    add(tone([(1568,1),(2349,.6),(3136,.3)],0.9,5,0.16),t0)
  elif kind=='shutter': # camera shutter for the front page
    t=T(0.06); c=sosfilt(bp(2000,8000),rng.standard_normal(len(t)))*np.exp(-t*80)*0.25; add(c,t0); add(c*0.8,t0+0.07)
  elif kind=='alarm':   # short security beep x3
    for i in range(3): t=T(0.11); add(0.09*np.sign(np.sin(2*np.pi*1400*t))*np.minimum(1,t/0.005)*np.minimum(1,(0.11-t)/0.005),t0+i*0.17)
  elif kind=='buzz':    # "wrong" buzzer
    t=T(0.42); add(sosfilt(butter(2,1800,'low',fs=SR,output='sos'),0.12*np.sign(np.sin(2*np.pi*140*t)))*np.minimum(1,(0.42-t)/0.03),t0)
y[-int(.004*SR):]*=np.linspace(1,0,int(.004*SR))[:,None]
sf.write(f'v{v}/work/mix_premaster.wav',y.astype(np.float32),SR); print(v,'peak',round(float(np.abs(y).max()),3))
