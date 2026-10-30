"""Soundtrack per SHORTS SPEC §5-6: original audio cut by plan.json, soft censorship, SFX that are never
louder than the original at the same moment (-3 dB below its 400 ms short-term level; in 3D scenes where there
is no original, a -20 dB ceiling). Writes work/orig_only.wav (reference) and work/mix_raw.wav (before mastering)."""
import json, subprocess, sys
import numpy as np

ROOT = sys.argv[1]  # e.g. /home/user/cs/a
NAME = sys.argv[2]  # a | b
SR = 48000
plan = json.load(open(f'{ROOT}/../proj/data/{NAME}.json'))
FPS = plan['fps']
N = int(plan['duration'] / FPS * SR)
rng = np.random.default_rng(3)
src = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{ROOT}/input/in.mp4', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                                   capture_output=True, check=True).stdout, np.float32).copy()
db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
fr = lambda f: int(round(f / FPS * SR))

# --- soft censorship on the source itself (so it travels with every cut)
def ramp(n):
    return np.sin(np.linspace(0, np.pi / 2, n)) ** 2
cens = src.copy()
bleep_track = np.zeros_like(src)
for s, e in plan['bleeps']:
    d = e - s
    a, z = int((s + 0.25 * d) * SR), int((e - 0.15 * d) * SR)
    word_db = db(src[int(s * SR):int(e * SR)])
    g = np.ones(z - a, np.float32) * 10 ** (-18 / 20)
    r = int(0.01 * SR)
    g[:r] = 1 - (1 - g[:r]) * ramp(r)
    g[-r:] = 1 - (1 - g[-r:]) * ramp(r)[::-1]
    cens[a:z] *= g
    t = np.arange(z - a) / SR
    tone = np.sin(2 * np.pi * 1000 * t).astype(np.float32)
    env = np.ones(z - a, np.float32)
    env[:r] = ramp(r)
    env[-r:] = ramp(r)[::-1]
    tone *= env
    tone *= 10 ** ((word_db - 6 - db(tone)) / 20)   # bleep = word loudness - 6 dB
    bleep_track[a:z] += tone
for s, e in plan['mutes10']:
    a, z = int(s * SR), int(e * SR)
    r = int(0.01 * SR)
    g = np.ones(z - a, np.float32) * 10 ** (-10 / 20)
    g[:r] = 1 - (1 - g[:r]) * ramp(r)
    g[-r:] = 1 - (1 - g[-r:]) * ramp(r)[::-1]
    cens[a:z] *= g

# bass boost on the headshot reaction: EQ on the original (+5 dB around 60-120 Hz), not an extra sound
def bass_boost(x, gain_db=5):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    shelf = 1 + (10 ** (gain_db / 20) - 1) * np.exp(-((np.log(np.maximum(f, 1) / 85)) ** 2) / 0.5)
    return np.fft.irfft(X * shelf, len(x)).astype(np.float32)

orig = np.zeros(N, np.float32)
XF = int(0.012 * SR)
for s in plan['segments']:
    if s.get('freeze'):
        continue  # stop-frame = hard silence before the punchline
    a = int(s['src'] * SR)
    n = fr(s['to']) - fr(s['from'])
    piece = (cens[a:a + n] + bleep_track[a:a + n]).copy()
    if s['id'] in ('scream', 'death', 'replay1', 'replay2', 'help'):
        piece = bass_boost(piece)
    piece[:XF] *= ramp(XF)
    piece[-XF:] *= ramp(XF)[::-1]
    o = fr(s['from'])
    orig[o:o + len(piece)] += piece[:N - o]

# --- SFX (synthesized; no third-party samples)
def whoosh(d, bright=0.25):
    n = int(d * SR); x = rng.standard_normal(n).astype(np.float32)
    tt = np.linspace(0, 1, n); c = 0.01 + bright * np.sin(np.pi * tt) ** 1.5
    y = np.zeros(n, np.float32); acc = 0.0
    for i in range(n):
        acc += c[i] * (x[i] - acc); y[i] = acc
    return y * (np.sin(np.pi * tt) ** 2).astype(np.float32)
def thump(d=0.45, f0=48, f1=140):
    t = np.arange(int(d * SR)) / SR
    f = f0 + f1 * np.exp(-t * 28)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)).astype(np.float32)
def twang():
    t = np.arange(int(0.5 * SR)) / SR
    f = 110 * (1 + 0.04 * np.exp(-t * 20))
    return (sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 6)) * np.exp(-t * 9)).astype(np.float32)
def creak():
    t = np.arange(int(0.45 * SR)) / SR
    pulses = (np.sin(2 * np.pi * (14 + 30 * t) * t) > 0.97).astype(np.float32)
    return (np.convolve(pulses, np.exp(-np.arange(200) / 30), 'same') * rng.standard_normal(len(t)) * 0.6).astype(np.float32)
def pop_s():
    t = np.arange(int(0.12 * SR)) / SR
    return (np.sin(2 * np.pi * (500 + 900 * t / 0.12) * t) * np.exp(-t * 35)).astype(np.float32)
def heartbeat():
    return np.concatenate([thump(0.18, 40, 30), np.zeros(int(0.12 * SR), np.float32), thump(0.22, 38, 25)])
def wind(d):
    n = int(d * SR); x = rng.standard_normal(n).astype(np.float32)
    y = np.convolve(x, np.ones(400) / 400, 'same')
    return y * (0.6 + 0.4 * np.sin(np.linspace(0, 3, n))).astype(np.float32)
def scribble():
    n = int(0.25 * SR); x = rng.standard_normal(n).astype(np.float32)
    return x * (np.abs(np.sin(np.linspace(0, 14, n))) ** 4).astype(np.float32) * 0.5

def scratch():
    t = np.arange(int(0.35 * SR)) / SR
    f = 300 + 900 * np.abs(np.sin(2 * np.pi * 4 * t))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + rng.standard_normal(len(t)) * 0.5
    return (tone * np.exp(-t * 5)).astype(np.float32)
def rewind():
    w = whoosh(0.35, 0.35)[::-1].copy()
    t = np.arange(len(w)) / SR
    return (w + 0.4 * np.sin(2 * np.pi * (900 - 1500 * t) * t) * np.exp(-t * 4)).astype(np.float32)
KIND = {'pop': pop_s, 'scratch': scratch, 'whoosh': lambda: whoosh(0.45, 0.3), 'rewind': rewind, 'thud': lambda: thump(0.5, 45, 120)}
events = [(f, KIND[k](), k) for f, k in plan['sfx']]
three_d = [(s['from'], s['to']) for s in plan['segments'] if s.get('freeze')]
in3d = lambda f: any(a <= f < b for a, b in three_d)
WIN = int(0.4 * SR)
import os
trim_path = f'{ROOT}/work/sfx_trim.json'
trims = json.load(open(trim_path)) if os.path.exists(trim_path) else {}
sfx = np.zeros(N, np.float32)
log = []
for f, sig, label in events:
    i0 = fr(f); i1 = min(N, i0 + len(sig)); sig = sig[:i1 - i0]
    ref = orig[i0:max(i1, i0 + int(0.1 * SR))]  # the original at the very moment the SFX sounds
    ref_db = db(ref) if len(ref) else -120
    sig_db = db(sig)
    if in3d(f) and ref_db < -40:
        target = -20.0                      # no original here: quiet ceiling
        peak_cap = 10 ** (-12 / 20)
    else:
        target = min(ref_db - 4, -20.0)  # -3 dB rule + 1 dB margin for K-weighting of bright sounds
        peak_cap = np.abs(orig[i0:i1]).max() if i1 > i0 else 0
    g = 10 ** ((target - sig_db + trims.get(str(f), 0.0)) / 20)
    if np.abs(sig).max() * g > peak_cap > 0:
        g = peak_cap / np.abs(sig).max()
    sfx[i0:i1] += sig * g
    log.append({'frame': f, 'end': f + len(sig) / SR * FPS, 'sfx': label, 'orig_st_db': round(float(ref_db), 1), 'sfx_db': round(float(db(sig * g)), 1)})

mix = orig + sfx
def write(x, path):
    x = np.clip(x, -1, 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ac', '2', '-c:a', 'pcm_f32le', path],
                   input=x.astype(np.float32).tobytes(), check=True)
write(orig, f'{ROOT}/work/orig_only.wav')
write(mix, f'{ROOT}/work/mix_raw.wav')
json.dump(log, open(f'{ROOT}/work/sfx_log.json', 'w'), ensure_ascii=False, indent=1)
print('ok')
