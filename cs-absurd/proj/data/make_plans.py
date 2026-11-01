"""Writes data/c.json and data/d.json (full edit decision lists) + ../{c,d}/work/analysis.json."""
import json
FPS = 30

def build(segs, words, groups, **extra):
    out = 0
    for s in segs:
        s['from'] = out
        out += s['len']
        s['to'] = out
    def src2out(t):
        for s in segs:
            if s.get('freeze') or s.get('src') is None:
                continue
            a = s['src']; b = a + s['len'] / FPS * s.get('rate', 1)
            if a - 0.04 <= t < b + 0.04:
                return s['from'] + (t - a) / s.get('rate', 1) * FPS
        raise ValueError(t)
    W, G = [], []
    for s in segs:  # every segment that plays a word's source time shows that word again (replays, flash-forwards)
        if s.get('freeze') or s.get('src') is None or s.get('mute') or s.get('kind') == '3d':
            continue  # 3D inserts show no captions of the speech under them
        a = s['src']; b = a + s['len'] / FPS * s.get('rate', 1)
        local = {}
        for wi, (text, ws, we, color) in enumerate(words):
            if a - 0.02 <= ws < b - 0.05:
                local[wi] = len(W)
                o = s['from'] + (ws - a) / s.get('rate', 1) * FPS
                oe = min(s['to'], s['from'] + (we - a) / s.get('rate', 1) * FPS)
                W.append({'text': text, 'from': round(o, 1), 'to': round(oe, 1), 'color': color, 'src': [ws, we]})
        for g in groups:
            hit = [local[i] for i in g if i in local]
            if hit:
                G.append(hit)
    G.sort(key=lambda g: W[g[0]]['from'])
    groups = G
    plan = {'fps': FPS, 'width': 1080, 'height': 1920, 'duration': out, 'segments': segs, 'words': W, 'groups': groups}
    plan.update(extra)
    # captions/stickers given in source seconds are resolved to output frames
    for c in plan.get('captions', []):
        if 'atSrc' in c:
            c['from'] = round(src2out(c.pop('atSrc')))
            c['to'] = c['from'] + c.pop('len')
    return plan, src2out

MIN_CAPTION = 45  # 1.5 s: every plate stays long enough to read and get the joke

def resolve(plan, segs):
    """Turn (segment id, source second) anchors into output frames."""
    def at(seg_id, t):
        s = next(x for x in segs if x['id'] == seg_id)
        return int(round(s['from'] + (t - s['src']) * FPS / s.get('rate', 1))) if not s.get('freeze') else s['from']
    caps = []
    for c in plan['captions']:
        f = at(c['seg'], c['t'])
        caps.append({'text': c['text'], 'label': c.get('label'), 'from': f, 'to': f + max(MIN_CAPTION, c.get('len', MIN_CAPTION)), 'style': c['style'], 'x': c.get('x', 0), 'y': c.get('y', 0)})
    plan['captions'] = caps
    plan['hp'] = [{'from': at(h['seg'], h['t']), 'to': at(h['seg'], h['t']) + h['len'], 'value': h['value']} for h in plan['hp']]
    plan['shakes'] = [[at(a, t), amp] for a, t, amp in plan['shakes']]
    plan['flashes'] = [[next(x for x in segs if x['id'] == a)['from'], n] for a, n in plan['flashes']]
    plan['sfx'] = [[max(0, at(a, t)), k] for a, t, k in plan['sfx']]
    return plan



def ticks(base, start_src, end_src, src0, z0=1.0, step=0.025):
    """One zoom step per timer second: a hard 3-frame punch on every tick."""
    keys = [[0, z0]]
    z = z0
    t = start_src
    while t < end_src:
        f = int(round((t - src0) * FPS))
        if f <= keys[-1][0]:
            t += 1.0
            continue
        keys.append([f, z])
        z += step
        keys.append([f + 3, z])
        t += 1.0
    return keys

# ---------------- C «Звери» v2: speech subtitles only; jokes = timing, 3D all-talk in game style, silence, the score, a countdown
segC = [
    {'id': 'doors', 'kind': 'split', 'src': 0.0, 'len': 48, 'zoom': [[0, 1.0], [36, 1.08], [38, 1.4], [48, 1.45]], 'focus': [540, 1180]},
    {'id': 'banner', 'kind': 'split', 'src': 1.6, 'len': 72, 'zoom': [[0, 1.0], [72, 1.06]], 'focus': [540, 1000]},
    {'id': 'alltalk', 'kind': '3d', 'src': 4.0, 'len': 75, 'scene': 'alltalk'},
    {'id': 'calm', 'kind': 'webcam-full', 'src': 6.5, 'len': 153, 'zoom': [[0, 1.0], [153, 1.28]]},
    {'id': 'cloud', 'kind': 'webcam-full', 'src': 11.6, 'len': 24, 'zoom': [[0, 1.28], [24, 1.36]]},
    {'id': 'hush', 'kind': 'webcam-full', 'src': 12.4, 'len': 18, 'freeze': True, 'zoom': [[0, 1.36], [18, 1.4]]},
    {'id': 'score', 'kind': 'split', 'src': 17.2, 'len': 30, 'freeze': True, 'zoom': [[0, 2.6], [4, 3.3], [30, 3.4]], 'focus': [540, 656]},
    {'id': 'dance', 'kind': 'game-full', 'src': 12.9, 'len': 111, 'zoom': [[0, 1.0], [111, 1.14]]},
    {'id': 'countdown', 'kind': 'split', 'src': 16.6, 'len': 468, 'focus': [540, 1150]},
    {'id': 'timer', 'kind': 'split', 'src': 26.0, 'len': 0, 'focus': [540, 656]},
    {'id': 'fin', 'kind': 'webcam-full', 'src': 32.2, 'len': 72, 'zoom': [[0, 1.0], [43, 1.06], [45, 1.4], [72, 1.45]]},
]
# countdown: tick-punches every timer second; when the timer turns red (src 26.0) it fills the frame for a second
cd = next(x for x in segC if x['id'] == 'countdown')
cd['len'] = int(round((26.0 - 16.6) * FPS))
cd['zoom'] = ticks(None, 17.0, 26.0, 16.6, 1.0, 0.02)
tm = next(x for x in segC if x['id'] == 'timer')
tm['len'] = 30
tm['zoom'] = [[0, 2.4], [4, 3.0], [30, 3.1]]
segC.insert(segC.index(tm) + 1, {'id': 'countdown2', 'kind': 'split', 'src': 27.0, 'len': int(round((32.2 - 27.0) * FPS)), 'focus': [540, 1150],
                                  'zoom': ticks(None, 27.0, 32.2, 27.0, 1.2, 0.03)})
wordsC = [('Да,', 2.2, 2.32, 'w'), ('ёп…', 2.32, 2.62, 'w'),
          ('Ну', 32.32, 32.8, 'w'), ('ладно,', 32.8, 33.08, 'w'), ('РЕБЯТА,', 33.22, 33.46, 'y'), ('бл*дь.', 33.66, 34.02, 'w')]
planC, _ = build(
    segC, wordsC, [[0, 1], [2, 3], [4, 5]],
    bleeps=[], mutes10=[[33.66, 34.02]], captions=[], hp=[],
    shakes=[['doors', 1.25, 14], ['alltalk', 4.27, 16], ['score', 17.2, 10], ['timer', 26.0, 8], ['fin', 33.66, 14]],
    flashes=[['alltalk', 4], ['score', 3], ['dance', 3], ['timer', 3]],
    title='Звери', essence='Счёт 1:11. Он умирает, стреляя в закрытую дверь; на смене сторон включается общий войс и обе команды орут как звери, а он спокойно выпускает облако — и игра устраивает его команде праздничный танец.',
    sfx=[['doors', 1.25, 'thud'], ['alltalk', 4.0, 'whoosh'], ['hush', 12.4, 'scratch'], ['score', 17.2, 'thud'], ['dance', 12.9, 'whoosh'], ['timer', 26.0, 'thud'], ['fin', 32.2, 'whoosh']]
        + [['countdown', 17.0 + k, 'tick'] for k in range(9)] + [['countdown2', 27.0 + k, 'tick'] for k in range(5)],
)
planC = resolve(planC, segC)

# ---------------- D v3: he asks "may someone go out? let's go B?" — the teammate (UZDominator, name tag = own team) goes, peeks B and dies at once;
# he goes himself and dies too; 3D "queue to B" replays it; then the blame. Speech subtitles only.
segD = [
    {'id': 'w1', 'kind': 'split', 'src': 0.0, 'len': 50, 'zoom': [[0, 1.0], [50, 1.05]], 'focus': [600, 1150]},
    {'id': 'w2', 'kind': 'split', 'src': 1.666, 'len': 40, 'zoom': [[0, 1.05], [3, 1.6], [40, 1.7]], 'focus': [640, 1150]},
    {'id': 'w3', 'kind': 'split', 'src': 3.0, 'len': 27, 'zoom': [[0, 1.0], [27, 1.04]], 'focus': [600, 1150]},
    {'id': 'w4', 'kind': 'split', 'src': 3.9, 'len': 45, 'zoom': [[0, 1.04], [3, 1.65], [45, 1.75]], 'focus': [560, 1130]},
    {'id': 'w5', 'kind': 'split', 'src': 5.4, 'len': 96, 'zoom': [[0, 1.0], [60, 1.1], [96, 1.2]], 'focus': [620, 1180]},
    {'id': 'slow', 'kind': 'split', 'src': 8.6, 'len': 102, 'rate': 0.5, 'mute': True, 'zoom': [[0, 1.2], [102, 1.45]], 'focus': [640, 1180]},
    {'id': 'blood', 'kind': 'split', 'src': 10.3, 'len': 15, 'zoom': [[0, 1.45], [15, 1.6]], 'focus': [560, 1180]},
    {'id': 'gone', 'kind': 'split', 'src': 10.8, 'len': 20, 'freeze': True, 'zoom': [[0, 1.6], [20, 1.65]], 'focus': [560, 1180], 'tint': 'bw'},
    {'id': 'death', 'kind': 'split', 'src': 10.8, 'len': 38, 'zoom': [[0, 1.15], [26, 1.1], [38, 1.3]], 'focus': [600, 1150]},
    {'id': 'queue', 'kind': '3d', 'src': 12.05, 'len': 75, 'scene': 'queue', 'mute': True},
    {'id': 'blame', 'kind': 'webcam-full', 'src': 12.05, 'len': 101, 'zoom': [[0, 1.0], [36, 1.05], [38, 1.45], [101, 1.5]]},
    {'id': 'after', 'kind': 'game-full', 'src': 15.4, 'len': 168, 'zoom': [[0, 1.0], [168, 1.12]]},
]
wordsD = [('А', 0.60, 0.96, 'w'), ('чё,', 0.96, 1.14, 'w'), ('кто-то', 1.20, 1.48, 'w'), ('может', 1.48, 1.66, 'w'), ('ВЫЙДЕТ,', 1.66, 2.12, 'y'), ('нет?', 2.16, 2.4, 'w'),
          ('Может,', 3.54, 3.90, 'w'), ('ВЫЙДЕМ', 3.90, 4.72, 'y'), ('Б,', 4.72, 4.9, 'w'), ('нет?', 4.92, 5.3, 'w'),
          ('Да,', 12.06, 12.40, 'r'), ('ёп', 12.40, 12.76, 'r'), ('твою', 12.80, 12.90, 'r'), ('мать,', 12.90, 13.16, 'r'),
          ('ну', 13.22, 13.30, 'w'), ('ОРАНЖЕВАЯ', 13.30, 13.86, 'y'), ('х*йня,', 13.90, 14.22, 'w'), ('бл*ть', 14.30, 14.7, 'w')]
planD, _ = build(
    segD, wordsD, [[0, 1, 2], [3, 4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17]],
    bleeps=[[13.90, 14.22]], mutes10=[[14.30, 14.7]], captions=[], hp=[],
    shakes=[['w2', 1.666, 10], ['w4', 3.9, 10], ['blood', 10.4, 14], ['death', 11.6, 16], ['blame', 13.3, 16]],
    flashes=[['slow', 3], ['gone', 3], ['queue', 4], ['blame', 3], ['after', 3]],
    title='Выйдем Б?', essence='«Может, выйдем Б?» — тиммейт выходит на Б и сразу умирает; он выходит следом и умирает тоже; виновата, конечно, «оранжевая х*йня».',
    sfx=[['w2', 1.666, 'pop'], ['w4', 3.9, 'pop'], ['slow', 8.6, 'heart'], ['slow', 9.3, 'heart'], ['slow', 10.0, 'heart'],
         ['gone', 10.8, 'scratch'], ['death', 10.8, 'whoosh'], ['queue', 12.05, 'whoosh'], ['blame', 13.3, 'thud'], ['after', 15.4, 'whoosh']],
)
planD = resolve(planD, segD)

for name, p in (('c', planC), ('d', planD)):
    json.dump(p, open(f'data/{name}.json', 'w'), ensure_ascii=False, indent=1)
    print(name, p['duration'], round(p['duration'] / 30, 1), 's', [s['id'] for s in p['segments']])
