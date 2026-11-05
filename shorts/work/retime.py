import json, numpy as np, cv2, subprocess, soundfile as sf, os
from scipy.signal import butter, sosfilt
edl=json.load(open('work/edl.json')); FPS=60; SR=48000
def ease(x): return 4*x**3 if x<.5 else 1-(-2*x+2)**3/2   # easeInOutCubic
def speed_at(curve,u):
  for (u0,s0),(u1,s1) in zip(curve,curve[1:]):
    if u<=u1: k=(u-u0)/(u1-u0) if u1>u0 else 1; return s0+(s1-s0)*ease(k)
  return curve[-1][1]
# build fine timemap: out time -> src time, integrating speed over source progress
tm=[]   # per output sample (audio rate) -> (seg, srcT or None)
segout=[]; t_out=0.0
for sg in edl['segments']:
  if 'freeze_src' in sg:
    n=int(round(sg['dur_out']*SR)); tm.append((sg['id'],np.full(n,sg['freeze_src']),True))
  else:
    a,b=sg['src_in'],sg['src_out']; L=b-a; src=[];x=a; dt=1/SR
    while x<b:
      src.append(x); x+=dt*speed_at(sg['speed_curve'],(x-a)/L)
    n=len(src); tm.append((sg['id'],np.array(src),False))
  segout.append({'id':sg['id'],'out_in':t_out,'out_out':t_out+n/SR,'layout':sg['layout'],'src_in':sg.get('src_in',sg.get('freeze_src')),'src_out':sg.get('src_out',sg.get('freeze_src'))})
  t_out+=n/SR
total=t_out; print('total out',round(total,3))
src_all=np.concatenate([m for _,m,_ in tm]); frz=np.concatenate([np.full(len(m),f) for _,m,f in tm])
segid=np.concatenate([np.full(len(m),i) for i,(_,m,_) in enumerate(tm)])
json.dump({'total':total,'segments':segout},open('work/timemap.json','w'),indent=1)
# ---- audio varispeed
y,sr=sf.read('work/audio48k.wav',dtype='float64')
pos=src_all*SR; i0=np.clip(pos.astype(int),0,len(y)-2); fr=(pos-i0)[:,None]
out=y[i0]*(1-fr)+y[i0+1]*fr
out[frz]=0
# micro fades at segment boundaries (8 ms)
F=int(.008*SR); bounds=np.flatnonzero(np.diff(segid))+1
env=np.ones(len(out))
for bnd in bounds:
  env[max(0,bnd-F):bnd]=np.minimum(env[max(0,bnd-F):bnd],np.linspace(1,0,min(F,bnd)))
  env[bnd:bnd+F]=np.minimum(env[bnd:bnd+F],np.linspace(0,1,len(env[bnd:bnd+F])))
out*=env[:,None]
np.save('work/src_of_sample.npy',src_all.astype(np.float32)); np.save('work/segid.npy',segid.astype(np.int16))
sf.write('work/voice_retimed_raw.wav',out.astype(np.float32),SR)
# ---- video frames
nfr=int(np.floor(total*FPS)); idx=(np.arange(nfr)/FPS*SR).astype(int)
fsrc=src_all[idx]; fseg=segid[idx]
slow=[s for s in edl['segments'] if 'speed_curve' in s and min(v for _,v in s['speed_curve'])<1]
# interpolated 240fps version for slow-mo segments
interp={}
for s in edl['segments']:
  if 'speed_curve' in s and min(v for _,v in s['speed_curve'])<0.8:
    a,b=s['src_in']-0.1,s['src_out']
    fn=f"work/interp/{s['id']}_240.mp4"
    if not os.path.exists(fn):
      subprocess.run(['ffmpeg','-v','error','-y','-ss',str(a),'-to',str(b),'-i','input/clip.mov','-vf','minterpolate=fps=240:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1','-c:v','libx264','-crf','14','-preset','veryfast',fn],check=True)
    cap=cv2.VideoCapture(fn); fr_=[]
    while True:
      ok,f=cap.read()
      if not ok: break
      fr_.append(cv2.imencode('.jpg',f,[cv2.IMWRITE_JPEG_QUALITY,95])[1])
    interp[s['id']]=(a,fr_)
cap=cv2.VideoCapture('input/clip.mov'); frames=[]
while True:
  ok,f=cap.read()
  if not ok: break
  frames.append(cv2.imencode('.jpg',f,[cv2.IMWRITE_JPEG_QUALITY,95])[1])
ids=[s['id'] for s in edl['segments']]
p=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','720x1280','-r','60','-i','-','-c:v','libx264','-crf','12','-preset','veryfast','-pix_fmt','yuv420p','work/retimed_master.mp4'],stdin=subprocess.PIPE)
for k in range(nfr):
  t=fsrc[k]; sid=ids[fseg[k]]
  if sid in interp:
    a,fr_=interp[sid]; j=min(len(fr_)-1,int(round((t-a)*240))); buf=fr_[j]
  else:
    buf=frames[min(len(frames)-1,int(round(t*30)))]
  p.stdin.write(cv2.imdecode(buf,1).tobytes())
p.stdin.close(); p.wait(); print('frames',nfr)
