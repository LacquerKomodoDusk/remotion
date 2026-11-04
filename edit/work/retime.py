"""Ретайм по edl.json: карта кадр_выхода -> время_исходника, интерполяция 240fps на слоумо,
frame blending на разгонах. Пишет work/retimed_master.mp4 (918x1632@60) и work/timemap.json."""
import json, subprocess, glob, os, sys
import numpy as np, cv2

ROOT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/remotion/edit"
FPS = 60
edl = json.load(open(f'{ROOT}/work/edl.json'))

cap = cv2.VideoCapture(f'{ROOT}/input/clip.mp4')
src = []
while True:
    ok, f = cap.read()
    if not ok: break
    src.append(cv2.imencode('.jpg', f, [cv2.IMWRITE_JPEG_QUALITY, 98])[1])
NS = len(src)
H, W = f.shape[:2] if False else cv2.imdecode(src[0], 1).shape[:2]
_cache = {}
print('source frames', NS, W, H, file=sys.stderr)

interp = []
for p in sorted(glob.glob(f'{ROOT}/work/interp/i_*.mp4')):
    start = float(os.path.basename(p)[2:-4])
    c = cv2.VideoCapture(p)
    n = int(c.get(cv2.CAP_PROP_FRAME_COUNT))
    interp.append(dict(path=p, start=start, end=start + n / 240.0, n=n, cap=c, idx=-1, frame=None))

def ease(a):  # easeInOutCubic
    return 4 * a ** 3 if a < 0.5 else 1 - (-2 * a + 2) ** 3 / 2

def speed_at(curve, u):
    for (u0, s0), (u1, s1) in zip(curve[:-1], curve[1:]):
        if u <= u1:
            a = 0 if u1 == u0 else (u - u0) / (u1 - u0)
            return s0 + (s1 - s0) * ease(min(max(a, 0), 1))
    return curve[-1][1]

def interp_frame(t):
    for r in interp:
        if r['start'] + 0.01 <= t <= r['end'] - 0.02:
            k = min(int(round((t - r['start']) * 240)), r['n'] - 1)
            if k < r['idx'] or k > r['idx'] + 400:
                r['cap'].set(cv2.CAP_PROP_POS_FRAMES, k); r['idx'] = k - 1
            while r['idx'] < k:
                ok, f = r['cap'].read()
                if not ok: break
                r['idx'] += 1; r['frame'] = f
            return r['frame']
    return None

def src_frame(t):
    i = min(max(int(round(t * FPS)), 0), NS - 1)
    if i not in _cache:
        if len(_cache) > 40: _cache.pop(next(iter(_cache)))
        _cache[i] = cv2.imdecode(src[i], 1)
    return _cache[i]

def blended(t, sp, direction):
    n = int(min(max(round(sp * 0.75), 3), 6))
    offs = np.linspace(-0.5, 0.5, n) * (sp / FPS) * 0.9
    acc = np.zeros((H, W, 3), np.float32)
    for o in offs:
        acc += src_frame(t + o * direction).astype(np.float32)
    return (acc / n).astype(np.uint8)

ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS),
                       '-i', '-', '-c:v', 'libx264', '-crf', '13', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                       f'{ROOT}/work/retimed_master.mp4'], stdin=subprocess.PIPE)
timemap, segs, out_f = [], [], 0
for seg in edl['segments']:
    start_f = out_f
    if 'freeze' in seg:
        n = int(round(seg['dur'] * FPS))
        fr = interp_frame(seg['freeze'])
        fr = fr if fr is not None else src_frame(seg['freeze'])
        for _ in range(n):
            ff.stdin.write(fr.tobytes()); timemap.append([seg['freeze'], 0.0, 1]); out_f += 1
    else:
        a, b, curve = seg['src_in'], seg['src_out'], seg['speed_curve']
        span, d = abs(b - a), (1 if b > a else -1)
        us = np.linspace(0, 1, 6001)
        sp = np.array([speed_at(curve, u) for u in us])
        dt = span * np.diff(us) / ((sp[:-1] + sp[1:]) / 2)
        T = np.concatenate([[0], np.cumsum(dt)])
        n = int(round(T[-1] * FPS))
        for k in range(n):
            u = np.interp(k / FPS, T, us)
            s = speed_at(curve, u)
            t = a + d * span * u
            fr = None
            if s < 0.95 and d > 0:
                fr = interp_frame(t)
            if fr is None:
                fr = blended(t, s, d) if s > 1.5 else src_frame(t)
            ff.stdin.write(fr.tobytes()); timemap.append([round(t, 5), round(s * d, 4), 0]); out_f += 1
    segs.append(dict(id=seg['id'], layout=seg['layout'], start=start_f, end=out_f))
    print(seg['id'], start_f, out_f, f'{(out_f - start_f) / FPS:.2f}s', file=sys.stderr)
ff.stdin.close(); ff.wait()
json.dump(dict(fps=FPS, frames=out_f, segments=segs, map=timemap), open(f'{ROOT}/work/timemap.json', 'w'))
print('total', out_f, out_f / FPS, file=sys.stderr)
