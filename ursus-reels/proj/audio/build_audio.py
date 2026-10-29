"""Builds the soundtrack from work/edl.json: cleaned voice cut on word boundaries,
a synthesized music bed with ducking, sparse SFX on meaningful events. Output: 48 kHz stereo WAV."""
import json, subprocess, sys
import numpy as np

ROOT = sys.argv[1]
SR = 48000
edl = json.load(open(f'{ROOT}/work/edl.json'))
FPS = edl['fps']
DUR = edl['duration'] / FPS
N = int(round(DUR * SR))
rng = np.random.default_rng(7)

def load(cmd):
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

# 1) voice: denoise, de-ess, gentle compression on the whole source first (no edge artefacts at cuts)
voice_src = load(['ffmpeg', '-v', 'error', '-i', f'{ROOT}/input/source.mov', '-af',
    'highpass=f=80,afftdn=nr=12:nf=-42:tn=1,deesser=i=0.4:m=0.5:f=0.5,'
    'acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=3dB,alimiter=limit=0.95',
    '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'])

voice = np.zeros(N, np.float32)
XF = int(0.015 * SR)  # 15 ms micro-crossfade at each splice
for seg in edl['audio']:
    a = int(round(seg['srcStart'] * SR)) - XF // 2
    n = int(round(seg['frames'] / FPS * SR)) + XF
    o = int(round(seg['outFrom'] / FPS * SR)) - XF // 2
    piece = voice_src[max(0, a):a + n].copy()
    if a < 0:
        piece = np.concatenate([np.zeros(-a, np.float32), piece])
    ramp = np.sin(np.linspace(0, np.pi / 2, XF)) ** 2
    piece[:XF] *= ramp
    piece[-XF:] *= ramp[::-1]
    o0 = max(0, o)
    piece = piece[o0 - o:]
    voice[o0:o0 + len(piece)] += piece[:N - o0]

# 2) music bed, 96 bpm, Am7 - Fmaj7 - C - G, soft and warm
BPM = 96
beat = 60 / BPM
t = np.arange(N) / SR
def note(m): return 440 * 2 ** ((m - 69) / 12)
chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]]
bass = [45, 41, 48, 43]
bar = 4 * beat
music = np.zeros(N, np.float32)
for b in range(int(DUR / bar) + 1):
    s0 = b * bar
    ch = chords[b % 4]
    i0, i1 = int(s0 * SR), min(N, int((s0 + bar + 0.6) * SR))
    if i0 >= N:
        break
    tt = t[i0:i1] - s0
    env = np.minimum(1, tt / 0.5) * np.exp(-np.maximum(0, tt - bar) * 4)
    pad = sum(np.sin(2 * np.pi * note(m) * tt + 0.3 * np.sin(2 * np.pi * 0.2 * tt)) * 0.18
              + np.sin(2 * np.pi * note(m) * 1.003 * tt) * 0.1 + np.sin(2 * np.pi * note(m) * 2 * tt) * 0.03 for m in ch)
    music[i0:i1] += (pad * env).astype(np.float32) * 0.5
    # bass on beats 1 and 3
    for k in (0, 2):
        j0 = int((s0 + k * beat) * SR); j1 = min(N, j0 + int(beat * 1.8 * SR))
        if j0 >= N: continue
        tb = t[j0:j1] - (s0 + k * beat)
        music[j0:j1] += (np.sin(2 * np.pi * note(bass[b % 4]) * tb) * np.exp(-tb * 2.2) * 0.35).astype(np.float32)
    # pluck arpeggio, eighth notes
    for k in range(8):
        j0 = int((s0 + k * beat / 2) * SR); j1 = min(N, j0 + int(0.5 * SR))
        if j0 >= N: continue
        tp = t[j0:j1] - (s0 + k * beat / 2)
        m = ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 12
        music[j0:j1] += (np.sin(2 * np.pi * note(m) * tp) * np.exp(-tp * 9) * 0.09).astype(np.float32)
# soft kick + hat
for k in range(int(DUR / beat) + 1):
    j0 = int(k * beat * SR); j1 = min(N, j0 + int(0.25 * SR))
    if j0 >= N: break
    tk = t[j0:j1] - k * beat
    f = 50 + 70 * np.exp(-tk * 30)
    music[j0:j1] += (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tk * 14) * 0.35).astype(np.float32)
    h0 = j0 + int(beat / 2 * SR); h1 = min(N, h0 + int(0.05 * SR))
    if h0 < N:
        noise = rng.standard_normal(h1 - h0)
        noise = np.diff(np.concatenate([[0], noise]))  # crude highpass
        music[h0:h1] += (noise * np.exp(-np.arange(h1 - h0) / SR * 70) * 0.025).astype(np.float32)
# fade in/out of the bed (loop-friendly: quiet at both ends)
fade = np.minimum(1, t / 0.4) * np.minimum(1, (DUR - t) / 0.5)
music *= fade.astype(np.float32)

# ducking from the voice envelope; music rises +3 dB under full-screen 3D scenes and after the speech
venv = np.sqrt(np.convolve(voice ** 2, np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same'))
duck = np.zeros(N, np.float32); g = 0.0
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
target = np.clip((20 * np.log10(venv + 1e-6) + 45) / 20, 0, 1)
for i in range(0, N, 64):
    x = target[i]
    g = x + (g - x) * (att ** 64 if x > g else rel ** 64)
    duck[i:i + 64] = g
lift = np.zeros(N, np.float32)
def frames(a, b): return int(a / FPS * SR), int(b / FPS * SR)
for a, b in [(104, 238), (524, 597), (597, 708)]:
    i0, i1 = frames(a, b)
    lift[i0:i1] = 1
lift = np.convolve(lift, np.ones(int(0.3 * SR)) / int(0.3 * SR), 'same')
music_db = -12 - 10 * duck + 3 * lift   # relative to voice: about -22 dB under speech
music *= (10 ** (music_db / 20)).astype(np.float32)

# 3) SFX, synthesized
sfx = np.zeros(N, np.float32)
def place(sig, frame, gain):
    i0 = int(frame / FPS * SR)
    i1 = min(N, i0 + len(sig))
    if i0 < N: sfx[i0:i1] += sig[:i1 - i0] * gain
def whoosh(d, up=True):
    n = int(d * SR); x = rng.standard_normal(n).astype(np.float32)
    tt = np.linspace(0, 1, n)
    cutoff = (0.02 + 0.25 * (tt if up else 1 - tt))
    y = np.zeros(n, np.float32); s = 0.0
    for i in range(n):
        s += cutoff[i] * (x[i] - s); y[i] = s
    env = np.sin(np.pi * tt) ** 2
    return y * env / (np.abs(y).max() + 1e-9)
def click(freq=1800, d=0.06):
    tt = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 90) + 0.4 * np.sin(2 * np.pi * freq * 2.01 * tt) * np.exp(-tt * 140)).astype(np.float32)
def thump():
    tt = np.arange(int(0.35 * SR)) / SR
    f = 45 + 90 * np.exp(-tt * 25)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)).astype(np.float32)
events = []
place(whoosh(0.7), 0, 0.22); place(thump(), 22, 0.45); events += ['0 whoosh (3D title)', '22 thump (title lands)']
for f, d, g, label in [(98, 0.6, 0.25, 'shutter into 3D'), (222, 0.5, 0.2, 'dive into monitor'), (431, 0.35, 0.14, 'cut to B-roll'),
                       (518, 0.55, 0.2, 'real chair -> 3D'), (595, 0.45, 0.15, 'verdict card'), (660, 0.5, 0.22, 'CTA slab up'), (690, 0.55, 0.2, 'slab away -> loop')]:
    place(whoosh(d), f, g); events.append(f'{f} whoosh ({label})')
for f in (381, 452, 503):
    place(click(1700), f, 0.16); events.append(f'{f} click (callout)')
for f in (329, 335):
    place(click(2600, 0.04), f, 0.13); events.append(f'{f} tick (counter)')
place(click(1400), 670, 0.14); events.append('670 click (bookmark)')

mix = voice + music + sfx
mix = np.stack([mix, mix], 1)
# a touch of width on music/sfx only
w = np.stack([music * 0.04, -music * 0.04], 1)
mix = mix + w
mix /= max(1.0, np.abs(mix).max() / 0.9)
mix.astype(np.float32).tofile(f'{ROOT}/work/mix_raw.f32')
json.dump(events, open(f'{ROOT}/work/sfx_events.json', 'w'), indent=1)
print('ok', N / SR)
