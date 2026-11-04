"""Из timemap.json строит: события эффектов для Remotion (remotion/src/data.json)
и звуковую дорожку work/mix.wav (вариспид игры + процедурные SFX)."""
import json, subprocess
import numpy as np

import sys
ROOT = sys.argv[1] if len(sys.argv) > 1 else '/home/user/remotion/edit'
DATA_OUT = sys.argv[2] if len(sys.argv) > 2 else f'{ROOT}/remotion/src/data.json'
tm = json.load(open(f'{ROOT}/work/timemap.json'))
FPS, N = tm['fps'], tm['frames']
M = np.array([m[0] for m in tm['map']]); SP = np.array([m[1] for m in tm['map']])
seg = {s['id']: s for s in tm['segments']}
beats = json.load(open(f'{ROOT}/work/beats.json'))['beats'] if __import__('os').path.exists(f'{ROOT}/work/beats.json') else []

def at(sid, src_t):
    """первый кадр выхода внутри сегмента sid, где время исходника пересекает src_t"""
    s = seg[sid]; r = M[s['start']:s['end']]
    d = np.sign(r[-1] - r[0]) or 1
    idx = np.where((r - src_t) * d >= 0)[0]
    return int(s['start'] + (idx[0] if len(idx) else len(r) - 1))

ev, sfx = [], []
def E(**k): ev.append(k)
def S(name, f, gain=1.0, **k): sfx.append(dict(name=name, f=f, gain=gain, **k))
def hit(f, big=1.0):
    E(type='flash', f=f, dur=int(7 + 3 * big), amt=min(0.9, 0.55 + 0.35 * big))
    E(type='punch', f=f, amt=0.12 + 0.12 * big)
    E(type='shake', f=f, dur=int(8 + 6 * big), amp=10 + 18 * big)
    E(type='ca', f=f, dur=int(6 + 6 * big), amt=6 + 9 * big)
    E(type='tilt', f=f, dur=14, deg=(4 + 3 * big) * (1 if f % 2 else -1))
    S('impact', f, 0.9 * big + 0.2)

exec(open(f'{ROOT}/work/events.py').read())

data = dict(fps=FPS, frames=N, segments=tm['segments'], speed=[round(float(x), 3) for x in SP], events=ev)
json.dump(data, open(DATA_OUT, 'w'), ensure_ascii=False)

# ================= ЗВУК =================
SR = 48000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{ROOT}/input/clip.mp4', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True).stdout
A = np.frombuffer(raw, np.float32).astype(np.float64)
L = int(N / FPS * SR) + SR // 2
t = np.arange(L) / SR
fpos = np.clip(t * FPS - 0.5, 0, N - 1)
fi = np.floor(fpos).astype(int); fr = fpos - fi; fj = np.minimum(fi + 1, N - 1)
src_t = M[fi] * (1 - fr) + M[fj] * fr
jump = np.abs(M[fj] - M[fi]) > 0.1  # стык сегментов: держим время без скачка
src_t[jump] = M[fi][jump]
spd = np.abs(SP[fi]); frozen = np.array([m[2] for m in tm['map']])[fi] == 1
pos = src_t * SR
g = np.interp(pos, np.arange(len(A)), A)
gain = np.ones(L)
gain[spd > 1.6] = 0.3; gain[SP[fi] < 0] = 0.45; gain[frozen] = 0.0
# склейки: короткий провал громкости, чтобы не щёлкало
jumps = np.where(np.abs(np.diff(M)) > 0.1)[0]
for j in jumps:
    c = int((j + 1) / FPS * SR); w = int(0.012 * SR)
    gain[max(0, c - w):c + w] *= np.abs(np.linspace(-1, 1, len(gain[max(0, c - w):c + w])))
k = int(0.02 * SR); gain = np.convolve(gain, np.ones(k) / k, 'same')
game = g * gain
# реверб на слоумо и фризах
rng = np.random.default_rng(3)
ir = rng.standard_normal(int(1.6 * SR)) * np.exp(-np.linspace(0, 7, int(1.6 * SR)))
ir /= np.sqrt((ir ** 2).sum())
wetmask = np.convolve(((spd < 0.7) | frozen).astype(float), np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same')
send = g * np.maximum(gain, frozen * 0) * wetmask
freeze_in = np.zeros(L)
for s in tm['segments']:
    if s['id'].endswith('_fz'):
        c = int(s['start'] / FPS * SR); freeze_in[max(0, c - 2400):c] = g[max(0, c - 2400):c]
wet = np.fft.irfft(np.fft.rfft(send + freeze_in, 2 * L) * np.fft.rfft(ir, 2 * L))[:L] * 0.55

def env(n, a, d):
    e = np.ones(n); a = max(1, int(a * SR)); e[:a] = np.linspace(0, 1, a) ** 2
    e *= np.exp(-np.linspace(0, d, n)); return e
def noise(n): return rng.standard_normal(n)
def lp(x, cut):  # однополюсный ФНЧ с переменной частотой среза
    cut = np.broadcast_to(cut, x.shape); y = np.zeros_like(x); a = 1 - np.exp(-2 * np.pi * cut / SR); acc = 0.0
    for i in range(len(x)): acc += a[i] * (x[i] - acc); y[i] = acc
    return y
def sweep(f0, f1, n, curve=1.0):
    f = f0 + (f1 - f0) * np.linspace(0, 1, n) ** curve; return np.sin(2 * np.pi * np.cumsum(f) / SR)

def make(name, dur=None):
    if name == 'impact':
        n = int(1.2 * SR); e = np.exp(-np.linspace(0, 6, n))
        body = sweep(90, 32, n, 0.4) * e
        click = lp(noise(n), 3500) * np.exp(-np.linspace(0, 60, n)) * 2.5
        tail = lp(noise(n), 500) * np.exp(-np.linspace(0, 5, n)) * 0.6
        return np.tanh((body * 1.4 + click + tail) * 1.5) * 0.9
    if name == 'boom':
        n = int(0.9 * SR); return np.tanh(sweep(70, 38, n, 0.5) * np.exp(-np.linspace(0, 5, n)) * 1.6) * 0.7
    if name == 'whoosh':
        n = int(0.45 * SR); x = noise(n); c = 300 + 5000 * np.sin(np.linspace(0, np.pi, n)) ** 2
        return lp(x, c) * np.sin(np.linspace(0, np.pi, n)) ** 1.5 * 1.4
    if name == 'riser':
        n = int(dur * SR); u = np.linspace(0, 1, n)
        x = lp(noise(n), 400 + 7000 * u ** 2) * u ** 2 * 1.2 + sweep(200, 900, n, 2) * u ** 3 * 0.25
        return x
    if name == 'rewind':
        n = int(dur * SR); u = np.linspace(0, 1, n)
        wob = sweep(300, 1600, n, 0.7) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * u))
        x = (wob * 0.25 + lp(noise(n), 2500) * 0.5) * np.minimum(1, np.minimum(u * 10, (1 - u) * 10))
        return x
    if name == 'pop':
        n = int(0.12 * SR); return sweep(900, 300, n, 0.5) * np.exp(-np.linspace(0, 12, n)) * 0.6
    if name == 'powerdown':
        n = int(0.9 * SR); u = np.linspace(0, 1, n)
        x = (np.sign(sweep(440, 60, n, 0.6)) * 0.25 + sweep(880, 120, n, 0.6) * 0.3) * (1 - u) ** 1.5
        return lp(x, 2500)
    if name == 'heal':
        n = int(dur * SR); u = np.linspace(0, 1, n); x = np.zeros(n)
        for h, a in [(1, 0.5), (1.5, 0.3), (2, 0.25), (3, 0.12)]:
            x += sweep(330 * h, 660 * h, n, 1.0) * a
        sh = lp(noise(n), 6000) * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * u))
        return (x * 0.35 + sh) * np.minimum(1, u * 8) * np.minimum(1, (1 - u) * 20)
    if name == 'chime':
        n = int(1.4 * SR); x = np.zeros(n)
        for fq, a in [(1318.5, 0.5), (1975.5, 0.35), (2637, 0.2), (3951, 0.1)]:
            x += np.sin(2 * np.pi * fq * np.arange(n) / SR) * a
        return x * env(n, 0.003, 5) * 0.6
    raise KeyError(name)

fx = np.zeros(L)
for s in sfx:
    x = make(s['name'], s.get('dur')) * s['gain']
    c = int(s['f'] / FPS * SR)
    if s['name'] == 'riser': c -= 0  # riser кончается на f+dur
    if c < 0: x = x[-c:]; c = 0
    x = x[:L - c]; fx[c:c + len(x)] += x
fx += np.fft.irfft(np.fft.rfft(fx, 2 * L) * np.fft.rfft(ir, 2 * L))[:L] * 0.18

GB = 0.25 / (np.percentile(np.abs(game[np.abs(game) > 0]), 99.5) + 1e-9)  # музыка эмоции в исходнике очень тихая
mix = (game + wet) * GB + fx * 0.30
fade = int(0.004 * SR); mix[:fade] *= np.linspace(0, 1, fade)
mix = mix[:int(N / FPS * SR)]
mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.89
st = np.stack([mix, mix], 1).astype(np.float32)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', f'{ROOT}/work/mix_raw.wav'],
               input=st.tobytes())
print('events', len(ev), 'sfx', len(sfx), 'dur', N / FPS)
