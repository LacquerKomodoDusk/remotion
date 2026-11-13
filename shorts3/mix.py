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
for a,b,d in cfg.get('duck',[]): g[int(a*SR):int(b*SR)]=d
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
  elif kind=='tick':    # clock tick for countdowns
    t=T(0.05); add(sosfilt(bp(2500,6000),rng.standard_normal(len(t)))*np.exp(-t*120)*0.22,t0)
  elif kind=='boss':    # boss intro: low brass hit + sub drone
    t=T(1.6); s_=sum(np.sin(2*np.pi*f*t+np.sin(2*np.pi*3*t)*0.3)*a for f,a in ((55,1),(110,.6),(165,.35),(220,.2)))
    add(s_*np.exp(-t*1.6)*np.minimum(1,t/0.02)*0.22,t0)
  elif kind=='thud':    # bullet into wood
    t=T(0.12); add((sosfilt(bp(300,1500),rng.standard_normal(len(t)))*0.6+np.sin(2*np.pi*180*t))*np.exp(-t*45)*0.16,t0)
  elif kind=='rewind':  # tape rewind chirp
    t=T(0.45); f=2400-1800*t/0.45; add(np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*t/0.45)*0.06+sosfilt(bp(1500,6000),rng.standard_normal(len(t)))*0.03,t0)
  elif kind=='applause':  # crowd claps: many short noise bursts
    d=e[2] if len(e)>2 else 1.2; n=int(d*SR); s_=np.zeros(n)
    for c in rng.uniform(0,d,int(d*90)):
      a=int(c*SR); L=int(0.025*SR); seg=sosfilt(bp(900,5000),rng.standard_normal(L))*np.exp(-np.arange(L)/SR*160)
      s_[a:a+L]+=seg[:max(0,min(L,n-a))]*rng.uniform(.3,1)
    env=np.minimum(1,np.arange(n)/SR/0.15)*np.minimum(1,(n-np.arange(n))/SR/0.5); add(s_*env*0.05,t0)
  elif kind=='curtain': # heavy fabric swoosh
    t=T(1.0); add(sosfilt(bp(150,1800),rng.standard_normal(len(t)))*np.sin(np.pi*t/1.0)**1.5*0.12,t0)
  elif kind=='pop':     # cartoon pop
    t=T(0.09); add(np.sin(2*np.pi*(900-500*t/0.09)*t)*np.exp(-t*40)*0.2,t0)
  elif kind=='boing':   # spring boing
    t=T(0.5); add(np.sin(2*np.pi*np.cumsum(220+120*np.sin(2*np.pi*14*t)*np.exp(-t*5))/SR)*np.exp(-t*5)*0.16,t0)
  elif kind=='heartbeat':  # lub-dub
    for off,amp in ((0,1),(0.16,0.7)):
      t=T(0.22); add(np.sin(2*np.pi*(48+25*np.exp(-t*30))*t)*np.exp(-t*14)*0.5*amp,t0+off)
  elif kind=='drone':   # horror rumble with tremolo
    d=e[2]; t=T(d); s_=sum(np.sin(2*np.pi*f*t)*a for f,a in ((41,1),(43.5,.8),(82,.3)))*(0.7+0.3*np.sin(2*np.pi*5*t))
    s_+=sosfilt(bp(80,400),rng.standard_normal(len(t)))*0.5
    add(s_*np.minimum(1,t/0.3)*np.minimum(1,(d-t)/0.15)*0.10,t0)
  elif kind=='sting':   # dissonant string stab / scare
    amp=e[2] if len(e)>2 else 1.0; t=T(1.4)
    s_=sum(np.sign(np.sin(2*np.pi*f*t+np.sin(2*np.pi*6*t)*0.4))*0.25 for f in (466,494,523,740,784,1109))
    s_=sosfilt(bp(400,6000),s_)+sosfilt(bp(2000,9000),rng.standard_normal(len(t)))*0.4
    add(s_*np.exp(-t*2.2)*np.minimum(1,t/0.006)*0.07*amp,t0)
  elif kind=='hit':     # CoD-style hitmarker tick
    t=T(0.06); c=np.sin(2*np.pi*3400*t)*0.6+np.sin(2*np.pi*5200*t)*0.3+sosfilt(butter(2,4000,'high',fs=SR,output='sos'),rng.standard_normal(len(t)))*0.5
    add(c*np.exp(-t*90)*0.22,t0)
  elif kind=='kill':    # heavier marker + ding
    t=T(0.06); c=np.sin(2*np.pi*3000*t)*0.6+sosfilt(butter(2,3000,'high',fs=SR,output='sos'),rng.standard_normal(len(t)))*0.5
    add(c*np.exp(-t*60)*0.26,t0); add(tone([(2637,1),(5274,.3)],0.4,9,0.10),t0+0.01); t=T(0.2); add(np.sin(2*np.pi*(90+60*np.exp(-t*30))*t)*np.exp(-t*18)*0.3,t0)
  elif kind=='drumroll': # snare roll with crescendo
    d=e[2]; n=int(d*SR); s_=np.zeros(n); r=0.0
    while r<d:
      a=int(r*SR); L=int(0.03*SR); seg=sosfilt(bp(800,6000),rng.standard_normal(L))*np.exp(-np.arange(L)/SR*90)
      s_[a:a+L]+=seg[:max(0,min(L,n-a))]*(0.35+0.65*r/d); r+=0.045
    add(s_*0.10,t0)
  elif kind=='trombone': # sad wah-wah-wah-waaah
    for i,(f,dd) in enumerate(((311,0.32),(294,0.32),(277,0.32),(262,0.9))):
      t=T(dd); vib=np.sin(2*np.pi*5.5*t)*(4 if i==3 else 0); ph=2*np.pi*np.cumsum(f+vib)/SR
      s_=sum(np.sin(h*ph)/h for h in range(1,9)); s_=sosfilt(bp(150,2500),s_)
      add(s_*np.minimum(1,t/0.03)*np.minimum(1,(dd-t)/0.05)*0.10,t0+i*0.34)
  elif kind=='jam':     # cheesy synth riff
    notes=(523,659,784,659,880,784,659,523); 
    for i,f in enumerate(notes):
      t=T(0.16); sq=np.sign(np.sin(2*np.pi*f*t))*0.5+np.sin(2*np.pi*f/2*t)
      add(sosfilt(butter(2,3000,'low',fs=SR,output='sos'),sq)*np.exp(-t*8)*0.05,t0+i*0.17)
  elif kind=='beep':    # scanner blip
    t=T(0.07); add(np.sin(2*np.pi*1900*t)*np.minimum(1,(0.07-t)/0.01)*0.09,t0)
  elif kind=='static':  # VHS stop / static burst
    t=T(0.3); add(sosfilt(bp(1000,9000),rng.standard_normal(len(t)))*np.minimum(1,(0.3-t)/0.05)*0.10,t0)
  elif kind=='thunder': # crack + rumble
    t=T(1.6); s_=sosfilt(butter(2,600,'low',fs=SR,output='sos'),rng.standard_normal(len(t)))*np.exp(-t*2.2)*1.2
    s_[:int(0.05*SR)]+=sosfilt(bp(1500,8000),rng.standard_normal(int(0.05*SR)))*0.8; add(s_*0.22,t0)
  elif kind=='echo':    # repeat an already-mixed span with decaying, darkening taps: [echo, src0, src1, at, taps]
    a,b=int(e[1]*SR),int(e[2]*SR); seg=y[a:b].copy(); at=e[3]; taps=e[4] if len(e)>4 else 4
    lp=butter(2,2500,'low',fs=SR,output='sos')
    for k in range(1,taps+1):
      seg=sosfilt(lp,seg,axis=0); o=int((at+0.22*k)*SR); n=min(len(seg),N-o)
      if n>0: y[o:o+n]+=seg[:n]*(0.55**k)
  elif kind=='shimmer': # rising magical sweep (or falling with e[2]=-1)
    d=0.9; t=T(d); up=e[2] if len(e)>2 else 1; f=(600+2400*t/d) if up>0 else (3000-2400*t/d)
    s_=sum(np.sin(2*np.pi*np.cumsum(f*m)/SR)/m for m in (1,1.5,2.01)); add(s_*np.sin(np.pi*t/d)**2*0.05,t0)
y[-int(.004*SR):]*=np.linspace(1,0,int(.004*SR))[:,None]
sf.write(f'v{v}/work/mix_premaster.wav',y.astype(np.float32),SR); print(v,'peak',round(float(np.abs(y).max()),3))
