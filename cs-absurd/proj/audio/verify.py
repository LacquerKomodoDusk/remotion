"""SHORTS SPEC §6 check: in every 400 ms window touched by an SFX, the mix must not exceed the original by more
than 1 dB (gameplay), or -20 LUFS where there is no original (3D scenes, freeze). Offending SFX get trimmed and
the mix is rebuilt until clean."""
import json, re, subprocess, sys
ROOT = sys.argv[1]
NAME = sys.argv[2]
def momentary(p):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-i', p, '-af', 'ebur128=metadata=1,ametadata=print:key=lavfi.r128.M', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    ts = [float(x) for x in re.findall(r'pts_time:([\d.]+)', o)]
    ms = [float(x) if x not in ('-inf', 'inf', 'nan') else -120.0 for x in re.findall(r'lavfi.r128.M=(\S+)', o)]
    return dict(zip([round(t, 1) for t in ts], ms))
plan = json.load(open(f'{ROOT}/../proj/data/{NAME}.json'))
silent = [(s['from'] / 30, s['to'] / 30) for s in plan['segments'] if s.get('freeze') or s.get('mute')]
def silent_share(t):  # share of the window [t-0.4, t] with no original audio
    return sum(max(0, min(t, b) - max(t - 0.4, a)) for a, b in silent) / 0.4
trims = {}
for it in range(8):
    json.dump(trims, open(f'{ROOT}/work/sfx_trim.json', 'w'))
    subprocess.run(['python3', '-I', f'{ROOT}/../proj/audio/mix.py', ROOT, NAME], check=True, capture_output=True)
    a = momentary(f'{ROOT}/work/orig_only.wav'); b = momentary(f'{ROOT}/work/mix_raw.wav')
    log = json.load(open(f'{ROOT}/work/sfx_log.json'))
    bad = {}
    checked = 0
    for t in sorted(b):
        active = [e for e in log if e['frame'] / 30 <= t and e['end'] / 30 >= t - 0.4]
        if not active or t not in a:
            continue
        checked += 1
        if silent_share(t) > 0.5:
            excess = b[t] - (-20)
        else:
            excess = b[t] - a[t] - 1.0 if a[t] > -70 else b[t] - (-70)
        if excess > 0:
            for e in active:
                k = str(e['frame'])
                bad[k] = max(bad.get(k, 0), excess + 0.5)
    print(f'pass {it + 1}: windows {checked}, violations {len(bad)}', bad)
    if not bad:
        break
    for k, v in bad.items():
        trims[k] = trims.get(k, 0) - v
json.dump({'windows_checked': checked, 'violations': len(bad), 'trims_db': trims}, open(f'{ROOT}/work/sound_check.json', 'w'), indent=1)
