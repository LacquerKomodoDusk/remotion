"""Синтез технических звуков для шортсов (см. tiktok-shorts-style.md, «Синтез звуков»).

Запуск: python3 scripts/generate_sfx.py [выходная_папка]
По умолчанию пишет в assets/generated/. WAV 48 кГц, пик -1 dBFS, fade 5-10 мс.
"""
import os
import sys

import numpy as np
from scipy.signal import butter, sosfilt, sosfiltfilt

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'assets', 'generated')
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def finish(x, fade_ms=8, peak_db=-1.0):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    n = int(SR * fade_ms / 1000)
    ramp = np.linspace(0, 1, n)[:, None]
    x[:n] *= ramp
    x[-n:] *= ramp[::-1]
    peak = np.abs(x).max() or 1
    return x / peak * 10 ** (peak_db / 20)


def bandpass_sweep(noise, f_start, f_end, q=2.0, block=256):
    """Шум через полосовой фильтр, центральная частота плывёт f_start -> f_end."""
    out = np.zeros_like(noise)
    nb = len(noise) // block + 1
    freqs = np.geomspace(f_start, f_end, nb)
    for i, f in enumerate(freqs):
        lo, hi = f / (1 + 1 / q), min(f * (1 + 1 / q), SR / 2 - 100)
        sos = butter(2, [lo, hi], btype='band', fs=SR, output='sos')
        seg = slice(i * block, (i + 1) * block + block)
        chunk = sosfilt(sos, noise[max(0, i * block - 2048):(i + 1) * block + block])
        out[seg] = chunk[-len(out[seg]):] if len(out[seg]) else chunk[:0]
    return out


def whoosh(dur, f0, f1, pan_sweep=True):
    t = t_axis(dur)
    noise = rng.standard_normal(len(t))
    x = bandpass_sweep(noise, f0, f1, q=1.6)
    env = np.sin(np.pi * (t / dur) ** 0.7) ** 2
    x *= env
    if pan_sweep:
        p = np.linspace(0.15, 0.85, len(t))
        return np.stack([x * np.sqrt(1 - p), x * np.sqrt(p)], axis=1)
    return x


def impact(dur, f_hi, f_lo, click=0.6, dist=1.5):
    t = t_axis(dur)
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 18)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t * (6 / dur))
    body = np.tanh(body * dist)
    n = rng.standard_normal(len(t)) * np.exp(-t * 90)
    n = sosfilt(butter(2, 2500, btype='low', fs=SR, output='sos'), n)
    return body + click * n


def bass_drop(dur, f, dist):
    t = t_axis(dur)
    freq = f * (1 + 0.6 * np.exp(-t * 25))
    x = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    env = (1 - np.exp(-t * 400)) * np.exp(-t * (3 / dur))
    return np.tanh(x * env * dist) + 0.3 * np.sin(4 * np.pi * np.cumsum(freq) / SR) * env


def pop(dur, f_hi, f_lo):
    t = t_axis(dur)
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 60)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (5 / dur))
    return x


def glitch(dur, seed):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    x = np.zeros(n)
    i = 0
    while i < n:
        L = int(r.uniform(0.008, 0.04) * SR)
        kind = r.integers(0, 3)
        tt = np.arange(L) / SR
        if kind == 0:
            seg = r.standard_normal(L) * r.uniform(0.3, 1)
        elif kind == 1:
            seg = np.sign(np.sin(2 * np.pi * r.uniform(200, 2500) * tt))
        else:
            seg = np.zeros(L)
        x[i:i + L] = seg[:n - i]
        i += L
    bits = 4
    x = np.round(x * 2 ** bits) / 2 ** bits
    hold = 6
    x = np.repeat(x[::hold], hold)[:n]
    L = r.uniform(0.0, 1.0, n) > 0.5
    return np.stack([x * (0.6 + 0.4 * L), x * (1 - 0.4 * L)], axis=1)


def ding(dur, f):
    t = t_axis(dur)
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * d) for k, a, d in [(1, 1, 5), (2.76, 0.4, 9), (5.4, 0.2, 14)])
    # простая реверберация: несколько затухающих задержек
    y = x.copy()
    for ms, g in [(37, 0.35), (61, 0.28), (89, 0.2), (127, 0.14)]:
        k = int(SR * ms / 1000)
        y[k:] += g * x[:-k]
    return y


def riser(dur, f0, f1):
    t = t_axis(dur)
    noise = rng.standard_normal(len(t))
    x = bandpass_sweep(noise, f0, f1, q=3)
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(f0 / 4, f1 / 4, len(t))) / SR)
    env = (t / dur) ** 2
    return (x * 0.8 + tone * 0.3) * env


def tick(dur, f):
    t = t_axis(dur)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 300) + 0.3 * rng.standard_normal(len(t)) * np.exp(-t * 900)


def scratch(dur):
    t = t_axis(dur)
    # пластинка замедляется: тон и шум падают к нулю
    speed = np.clip(1 - t / dur, 0, 1) ** 1.5
    f = 900 * speed + 40
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
    noise = sosfiltfilt(butter(2, [300, 4000], btype='band', fs=SR, output='sos'), rng.standard_normal(len(t)))
    return (x + noise * 0.6) * speed


SOUNDS = {
    'whoosh_01': lambda: whoosh(0.30, 400, 4000),
    'whoosh_02': lambda: whoosh(0.40, 3000, 300),
    'whoosh_03': lambda: whoosh(0.22, 800, 6000),
    'impact_heavy_01': lambda: impact(0.55, 160, 38, click=0.7, dist=2.2),
    'impact_02': lambda: impact(0.35, 220, 55, click=0.9, dist=1.5),
    'impact_03': lambda: impact(0.25, 300, 70, click=1.1, dist=1.2),
    'bass_drop_01': lambda: bass_drop(1.2, 45, 2.5),
    'bass_drop_02': lambda: bass_drop(0.8, 55, 3.5),
    'pop_soft_01': lambda: pop(0.07, 900, 300),
    'pop_02': lambda: pop(0.09, 1300, 400),
    'pop_03': lambda: pop(0.12, 700, 180),
    'glitch_01': lambda: glitch(0.25, 1),
    'glitch_02': lambda: glitch(0.35, 2),
    'glitch_03': lambda: glitch(0.15, 3),
    'ding_01': lambda: ding(0.9, 1760),
    'ding_02': lambda: ding(0.7, 2350),
    'riser_01': lambda: riser(1.0, 300, 5000),
    'riser_02': lambda: riser(0.6, 500, 7000),
    'tick_01': lambda: tick(0.04, 2400),
    'tick_02': lambda: tick(0.04, 3200),
    'scratch_01': lambda: scratch(0.6),
}

if __name__ == '__main__':
    import soundfile as sf

    os.makedirs(OUT, exist_ok=True)
    preview = []
    for name, fn in SOUNDS.items():
        x = finish(fn(), fade_ms=5 if name.startswith(('tick', 'pop')) else 8)
        sf.write(os.path.join(OUT, f'{name}.wav'), x.astype(np.float32), SR, subtype='PCM_24')
        preview += [x, np.zeros((int(SR * 0.5), 2))]
        print(name, f'{len(x) / SR:.2f}s')
    sf.write(os.path.join(OUT, '_preview_all.wav'), np.concatenate(preview).astype(np.float32), SR, subtype='PCM_16')
