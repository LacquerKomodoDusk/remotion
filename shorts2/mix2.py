import json, sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
SR=48000; v=sys.argv[1]
cfg=json.load(open(f'remotion/src/configs/v{v}.json'))
y,_=sf.read(f'v{v}/work/audio48k.wav'); N=len(y); words=cfg['words']
rng=np.random.default_rng(int(v))
bp=lambda lo,hi: butter(2,[lo,hi],'bandpass',fs=SR,output='sos')
def add(sig,t0,g=1.0):
  a=int(t0*SR); n=min(len(sig),N-a)
  if n>0: y[a:a+n]+=g*sig[:n,None]
# 1) game ducked between words (voice > game); keep full level on listed "events"
g=np.full(N,0.6)
for w in words: g[max(0,int((w['s']-0.06)*SR)):int((w['e']+0.10)*SR)]=1.0
for a,b in {'2':[(0,7.6),(9.0,16.4)],'3':[(12.2,17.4)],'4':[(0,9.4),(10.2,11.6)],'1':[]}[v]: g[int(a*SR):int(b*SR)]=np.maximum(g[int(a*SR):int(b*SR)],0.85)
k=int(.04*SR); g=np.convolve(g,np.ones(k)/k,mode='same'); y*=g[:,None]
# 2) quack over mat, same length as the word
def quack(L):
  n=int(L*SR); t=np.arange(n)/SR; u=t/L
  f0=560-220*u**0.7; ph=2*np.pi*np.cumsum(f0)/SR
  s=sum(np.sin(h*ph)/h**0.8 for h in range(1,14))+0.08*rng.standard_normal(n)
  s=sosfilt(bp(700,2300),s); s+=0.6*sosfilt(bp(1900,3400),s)
  env=np.minimum(1,t/0.012)*np.minimum(1,(L-t)/0.03)*(0.75+0.25*np.sin(np.pi*u)); s*=np.clip(env,0,1); return s/np.max(np.abs(s))
for w in words:
  if 'mat' in w['flags']:
    a=int(w['s']*SR); b=int(w['e']*SR); F=int(.006*SR)
    m=np.ones(N); m[a:b]=0.04; m[a-F:a]=np.linspace(1,.04,F); m[b:b+F]=np.linspace(.04,1,F); y*=m[:,None]
    add(quack((b-a)/SR)*0.5,w['s'])
def sub_hit(t0,dur=0.5,f=52,amp=0.4):
  n=int(dur*SR); t=np.arange(n)/SR; add(np.sin(2*np.pi*(f+30*np.exp(-t*25))*t)*np.exp(-t*6)*amp,t0)
def echo(word):
  w=[x for x in words if x['text']==word][0]; a=int(w['s']*SR); b=int((w['e']+0.05)*SR); c=y[a:b].copy()
  for d,gn in [(0.13,0.42),(0.26,0.24),(0.39,0.12)]:
    o=a+int(d*SR); n=min(len(c),N-o); y[o:o+n]+=c[:n]*gn
def ding(t0):
  n=int(0.9*SR); t=np.arange(n)/SR
  add(0.16*(np.sin(2*np.pi*1568*t)+0.6*np.sin(2*np.pi*2349*t)+0.3*np.sin(2*np.pi*3136*t))*np.exp(-t*5)*np.minimum(1,t/0.004),t0)
def whoosh(t0,amp=0.08):
  n=int(0.28*SR); t=np.arange(n)/SR; add(sosfilt(bp(600,5000),rng.standard_normal(n))*np.sin(np.pi*t/0.28)**2*amp,t0)
def dip(a,b,gain=0.25):
  A,B=int(a*SR),int(b*SR); F=int(.02*SR); m=np.ones(N); m[A:B]=gain; m[A-F:A]=np.linspace(1,gain,F); m[B:B+F]=np.linspace(gain,1,F); y[:]=y*m[:,None]
def bass(a,b,amt=1.2):
  A,B=int(a*SR),int(b*SR); y[A:B]+=amt*sosfilt(butter(2,140,'low',fs=SR,output='sos'),y[A:B],axis=0)
P=cfg['punch']['t']
if v=='1':
  echo('идёт'); sub_hit(6.72,0.5,52,0.35); whoosh(4.05); ding(P)
if v=='2':
  dip(7.62,7.88,0.2); sub_hit(7.9,0.45,55,0.35); whoosh(5.45); ding(P)
if v=='3':
  n=int(0.3*SR); t=np.arange(n)/SR; add(sosfilt(bp(1500,6000),rng.standard_normal(n))*np.sin(np.pi*t/0.3)**2*0.05*(1+np.sin(2*np.pi*31*t)),2.15)
  sub_hit(17.86,0.5,50,0.35); whoosh(12.75); ding(P)
if v=='4':
  dip(9.1,9.42,0.35); bass(9.42,10.6,1.4); sub_hit(9.45,0.8,46,0.6); whoosh(8.25)
  n=int(0.55*SR); t=np.arange(n)/SR; f=2850+180*np.sign(np.sin(2*np.pi*22*t))  # referee whistle (pea trill)
  add(0.12*np.sin(2*np.pi*np.cumsum(f)/SR)*np.minimum(1,t/0.01)*np.minimum(1,(0.55-t)/0.05),P-0.05)
y[-int(.004*SR):]*=np.linspace(1,0,int(.004*SR))[:,None]
sf.write(f'v{v}/work/mix_premaster.wav',y.astype(np.float32),SR); print(v,'peak',round(float(np.abs(y).max()),3))
