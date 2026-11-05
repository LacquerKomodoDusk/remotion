import json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, sosfiltfilt
SR=48000
y,_=sf.read('work/voice_retimed_raw.wav'); N=len(y)
an=json.load(open('work/analysis.json')); segs={s['id']:s for s in an['timemap']['segments']}
src=np.load('work/src_of_sample.npy')
def out_of_src(t,sid):
  s=segs[sid]; a,b=int(s['out_in']*SR),int(s['out_out']*SR); return (a+np.argmin(np.abs(src[a:b]-t)))/SR
words=an['words']
# 1) duck game between words (except G2 where gunfire is the event)
g=np.full(N,0.5)
for w in words:
  a=int((w['s']-0.06)*SR); b=int((w['e']+0.10)*SR); g[max(0,a):b]=1.0
k=int(.04*SR); g=np.convolve(g,np.ones(k)/k,mode='same')
y=y*g[:,None]
# 2) quack over mat: mute word, procedural duck call of same length
rng=np.random.default_rng(3)
def quack(L):
  n=int(L*SR); t=np.arange(n)/SR; u=t/L
  f0=560-220*u**0.7; ph=2*np.pi*np.cumsum(f0)/SR
  sig=sum(np.sin(h*ph)/h**0.8 for h in range(1,14))
  sig+=0.08*rng.standard_normal(n)
  sig=sosfilt(butter(2,[700,2300],'bandpass',fs=SR,output='sos'),sig)
  sig+=0.6*sosfilt(butter(2,[1900,3400],'bandpass',fs=SR,output='sos'),sig)
  env=np.minimum(1,t/0.012)*np.minimum(1,(L-t)/0.03)*(0.75+0.25*np.sin(np.pi*u))
  sig*=np.clip(env,0,1); return sig/np.max(np.abs(sig))
for w in words:
  if 'mat' in w['flags']:
    a=int(w['s']*SR); b=int(w['e']*SR); L=(b-a)/SR; F=int(.006*SR)
    m=np.ones(N); m[a:b]=0.04; m[a-F:a]=np.linspace(1,.04,F); m[b:b+F]=np.linspace(.04,1,F)
    y*=m[:,None]
    q=quack(L)*0.5; y[a:b]+=q[:,None]
    w['quack']=[round(a/SR,3),round(b/SR,3)]
# 3) echo on "микро" (realization)
mk=[w for w in words if w['text']=='микро'][-1]; a=int(mk['s']*SR); b=int((mk['e']+0.05)*SR)
chunk=y[a:b].copy()
for d,gn in [(0.13,0.42),(0.26,0.24),(0.39,0.12)]:
  o=a+int(d*SR); y[o:o+len(chunk)]+=chunk*gn
# 4) bass hit on realization start (E1) and bass boost on G2
def sub_hit(t0,dur=0.5,f=52,amp=0.55):
  n=int(dur*SR); t=np.arange(n)/SR; s=np.sin(2*np.pi*(f+30*np.exp(-t*25))*t)*np.exp(-t*6)*amp
  a=int(t0*SR); y[a:a+n]+=s[:,None][:N-a]
e1=[w for w in words if w['text']=='б**'][0]['s']; sub_hit(e1-0.01,0.45,55,0.35)
toast_t=round(out_of_src(40.42,'F'),3); sub_hit(toast_t,0.6,50,0.45); shot=999.0
tp=int(toast_t*SR); lo=sosfilt(butter(2,140,'low',fs=SR,output='sos'),y[tp:],axis=0); y[tp:]+=lo*1.2
# 5) XP ding for the punchline toast (Fortnite-ish UI chime), whoosh into game_full
n=int(0.9*SR); t=np.arange(n)/SR
ding=(np.sin(2*np.pi*1568*t)+0.6*np.sin(2*np.pi*2349*t)+0.3*np.sin(2*np.pi*3136*t))*np.exp(-t*5)*np.minimum(1,t/0.004)
a=int(toast_t*SR); y[a:a+n]+=0.16*ding[:,None][:N-a]
n=int(0.28*SR); t=np.arange(n)/SR; wn=rng.standard_normal(n)
wh=sosfilt(butter(2,[600,5000],'bandpass',fs=SR,output='sos'),wn)*np.sin(np.pi*t/0.28)**2*0.12
a=int((segs['F']['out_in']-0.16)*SR); y[a:a+n]+=0.6*wh[:,None]
# hard cut at end: 4ms fade only
y[-int(.004*SR):]*=np.linspace(1,0,int(.004*SR))[:,None]
sf.write('work/mix_premaster.wav',y.astype(np.float32),SR)
an['events']={'shot':round(shot,3),'toast':toast_t,'realize':e1,'micro':mk['s']}
json.dump(an,open('work/analysis.json','w'),ensure_ascii=False,indent=1)
print(an['events'], 'peak',np.abs(y).max())
