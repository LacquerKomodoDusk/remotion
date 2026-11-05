import json, numpy as np
SR=48000
src=np.load('work/src_of_sample.npy'); seg=np.load('work/segid.npy')
tmj=json.load(open('work/timemap.json'))
# (display, src_s, src_e, emotion, flags)
W=[("у",15.19,15.27,"neutral",""),("тебя",15.35,15.55,"neutral",""),("микро",15.59,15.91,"neutral",""),("выключено",15.91,16.47,"panic",""),("АХАХ",16.51,16.87,"joy","stretch"),
("нормально",18.39,18.87,"confident",""),
("я",22.08,22.16,"confident",""),("говорю",22.20,22.52,"confident",""),("нет",23.16,23.44,"confident",""),
("просто",24.60,25.00,"irony",""),("у",25.04,25.12,"irony",""),("меня",25.16,25.36,"irony",""),("это",25.48,25.68,"irony",""),("так",25.76,25.96,"irony",""),("и",26.04,26.12,"irony",""),("было",26.20,26.44,"irony",""),
("б**",33.27,33.44,"panic","mat"),("а",33.63,33.71,"panic",""),("чё",33.75,33.95,"panic",""),("я",33.95,34.03,"panic",""),("долго",34.07,34.35,"panic",""),("так",34.35,34.55,"panic",""),("сидел",34.55,34.87,"panic",""),("с",34.87,34.95,"panic",""),("микро",35.72,36.06,"panic","shout"),
("ОРУНЯКА",37.93,38.45,"joy","stretch"),("ХА-ХА-ХА",39.30,40.40,"joy","stretch"),
("сижу",41.90,42.26,"irony",""),("п****",42.45,42.82,"irony","mat"),("ОПААА",43.24,43.47,"panic","shout,stretch")]
out=[]
for d,s,e,em,fl in W:
  m=np.flatnonzero((src>=s)&(src<=e))
  # keep only first contiguous run
  if len(m)==0: print('MISSING',d); continue
  br=np.flatnonzero(np.diff(m)>1); m=m[:br[0]+1] if len(br) else m
  out.append({"text":d,"src_s":s,"src_e":e,"s":round(m[0]/SR,3),"e":round(m[-1]/SR,3),"emotion":em,"flags":[f for f in fl.split(',') if f]})
for o in out: print(f"{o['s']:6.2f}-{o['e']:6.2f} {o['emotion']:9s} {o['text']} {o['flags']}")
json.dump({"source":{"w":720,"h":1280,"fps":30,"dur":44.5,"cam_box":[195,15,665,395],"logo_box":[315,330,545,425],"game_top":428,"hud_ammo":[480,1170,720,1230]},
 "game":"Fortnite (Глава 6), уверенность ~95%","words":out,"timemap":tmj},open('work/analysis.json','w'),ensure_ascii=False,indent=1)
