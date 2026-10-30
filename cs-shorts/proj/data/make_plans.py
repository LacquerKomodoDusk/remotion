"""Writes data/a.json and data/b.json (the full edit decision lists) + ../{a,b}/work/analysis.json."""
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
        if s.get('freeze') or s.get('src') is None:
            continue
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
        caps.append({'text': c['text'], 'from': f, 'to': f + max(MIN_CAPTION, c.get('len', MIN_CAPTION)), 'style': c['style'], 'x': c['x'], 'y': c['y']})
    plan['captions'] = caps
    plan['hp'] = [{'from': at(h['seg'], h['t']), 'to': at(h['seg'], h['t']) + h['len'], 'value': h['value']} for h in plan['hp']]
    plan['shakes'] = [[at(a, t), amp] for a, t, amp in plan['shakes']]
    plan['flashes'] = [[next(x for x in segs if x['id'] == a)['from'], n] for a, n in plan['flashes']]
    plan['sfx'] = [[max(0, at(a, t)), k] for a, t, k in plan['sfx']]
    return plan

# ---------------- A: "учил всех не лезть" — almost the whole clip (0-14.6 s), plus flash-free freeze and a double replay
segA = [
    {'id': 'hook', 'kind': 'split', 'src': 0.0, 'len': 92, 'zoom': [[0, 1.0], [92, 1.08]], 'focus': [540, 1150]},
    {'id': 'freeze', 'kind': 'webcam-full', 'src': 3.0, 'len': 20, 'freeze': True, 'zoom': [[0, 1.1], [20, 1.16]], 'tint': 'bw'},
    {'id': 'walk', 'kind': 'split', 'src': 3.05, 'len': 148, 'zoom': [[0, 1.0], [58, 1.0], [100, 1.15], [148, 1.2]], 'focus': [560, 1250]},
    {'id': 'scream', 'kind': 'webcam-full', 'src': 8.0, 'len': 78, 'zoom': [[0, 1.0], [78, 1.18]], 'overlay3d': 'uh'},
    {'id': 'replay1', 'kind': 'webcam-full', 'src': 8.08, 'len': 25, 'zoom': [[0, 1.4], [25, 1.45]], 'tint': 'replay'},
    {'id': 'replay2', 'kind': 'webcam-full', 'src': 8.48, 'len': 20, 'zoom': [[0, 1.75], [20, 1.8]], 'tint': 'replay'},
    {'id': 'death', 'kind': 'split', 'src': 10.6, 'len': 44, 'zoom': [[0, 1.0], [30, 1.15], [44, 1.3]], 'focus': [560, 1250]},
    {'id': 'after', 'kind': 'webcam-full', 'src': 12.05, 'len': 50, 'zoom': [[0, 1.3], [10, 1.12], [50, 1.05]], 'tint': 'redfade'},
    {'id': 'killcam', 'kind': 'split', 'src': 13.72, 'len': 28, 'zoom': [[0, 1.05], [28, 1.0]], 'focus': [540, 1200]},
]
wordsA = [
    ('Бл*,', 1.40, 1.58, 'w'), ('ну', 1.58, 1.76, 'w'), ('не', 1.76, 1.90, 'w'), ('иди', 1.90, 2.12, 'w'), ('туда,', 2.12, 2.46, 'w'),
    ('ДУРАК,', 2.46, 2.76, 'y'), ('БЛ*ТЬ!', 2.76, 3.0, 'y'),
    ('УХ!', 8.08, 8.48, 'r'), ('УХ!', 8.48, 8.88, 'r'), ('УХ!', 8.92, 9.14, 'r'), ('УХ!', 9.14, 9.44, 'r'), ('УХ!', 9.5, 9.72, 'r'), ('О-О-О!', 10.2, 10.5, 'r'),
    ('БЛ*ДЬ!', 11.7, 12.6, 'b'), ('НИ*УЯ…', 13.1, 13.58, 'b'),
]
planA, mapA = build(
    segA, wordsA, [[0, 1, 2], [3, 4], [5, 6], [7], [8], [9], [10], [11], [12], [13], [14]],
    bleeps=[[2.76, 3.0], [11.7, 12.6], [13.1, 13.58]], mutes10=[[1.40, 1.58]],
    captions=[
        {'text': 'ЗАПОМНИТЕ ЭТУ ФРАЗУ', 'seg': 'hook', 't': 2.0, 'len': 36, 'style': 'hook', 'x': 0, 'y': 240},
        {'text': 'нож в руки — и вперёд', 'seg': 'walk', 't': 3.3, 'len': 50, 'style': 'comment', 'x': 80, 'y': 700},
        {'text': '2 СЕКУНДЫ СПУСТЯ', 'seg': 'walk', 't': 5.0, 'len': 45, 'style': 'card', 'x': 0, 'y': 900},
        {'text': 'сам-то куда полез?', 'seg': 'walk', 't': 6.5, 'len': 45, 'style': 'comment', 'x': 80, 'y': 700},
        {'text': 'ПОВТОР ×2', 'seg': 'replay1', 't': 8.08, 'len': 45, 'style': 'replay', 'x': 0, 'y': 300},
        {'text': 'дурак, говоришь?', 'seg': 'after', 't': 12.9, 'len': 54, 'style': 'comment', 'x': 80, 'y': 780},
    ],
    hp=[{'seg': 'scream', 't': 8.0, 'len': 78, 'value': 45}, {'seg': 'death', 't': 11.3, 'len': 23, 'value': 18}],
    shakes=[['walk', 7.0, 10], ['scream', 8.08, 12], ['scream', 8.48, 14], ['scream', 8.92, 14], ['scream', 9.14, 14], ['scream', 9.5, 16], ['scream', 10.2, 20],
            ['replay1', 8.08, 14], ['replay2', 8.48, 18], ['death', 11.95, 22]],
    flashes=[['freeze', 4], ['scream', 4], ['replay1', 3], ['replay2', 3], ['death', 4], ['after', 6]],
    title='Учил всех не лезть туда… 🙃', essence='Сказал «не иди туда, дурак», достал нож, полез сам — и умер с криком «УХ! УХ! УХ!».',
    sfx=[['hook', 0.0, 'pop'], ['hook', 2.0, 'pop'], ['freeze', 3.0, 'scratch'], ['walk', 3.3, 'pop'], ['walk', 5.0, 'whoosh'], ['walk', 6.5, 'pop'],
         ['scream', 8.0, 'whoosh'], ['replay1', 8.08, 'rewind'], ['replay2', 8.48, 'rewind'], ['death', 10.6, 'whoosh'], ['after', 12.05, 'thud'], ['after', 12.9, 'pop']],
)
planA = resolve(planA, segA)

# ---------------- B: "одного пропустили" — flash-forward hook, then the clip from 3.6 s to the end
segB = [
    {'id': 'hook', 'kind': 'webcam-full', 'src': 9.85, 'len': 51, 'zoom': [[0, 1.0], [51, 1.12]]},
    {'id': 'freeze', 'kind': 'webcam-full', 'src': 11.5, 'len': 18, 'freeze': True, 'zoom': [[0, 1.12], [18, 1.16]], 'tint': 'bw'},
    {'id': 'captain', 'kind': 'split', 'src': 3.6, 'len': 162, 'zoom': [[0, 1.0], [60, 1.04], [162, 1.16]], 'focus': [560, 1200]},
    {'id': 'fight', 'kind': 'split', 'src': 9.0, 'len': 165, 'zoom': [[0, 1.16], [30, 1.12], [165, 1.25]], 'focus': [600, 1180]},
    {'id': 'stop', 'kind': 'split', 'src': 14.5, 'len': 22, 'freeze': True, 'zoom': [[0, 1.25], [22, 1.3]], 'focus': [600, 1180], 'tint': 'bw'},
    {'id': 'death', 'kind': 'split', 'src': 14.5, 'len': 17, 'zoom': [[0, 1.3], [17, 1.45]], 'focus': [600, 1180]},
    {'id': 'help', 'kind': 'webcam-full', 'src': 15.05, 'len': 66, 'zoom': [[0, 1.0], [40, 1.08], [66, 1.22]]},
    {'id': 'mate', 'kind': 'game-full', 'src': 17.25, 'len': 95, 'zoom': [[0, 1.0], [95, 1.1]]},
    {'id': 'smoke3d', 'kind': '3d', 'src': 20.4, 'len': 40, 'scene': 'smoke'},
    {'id': 'finally', 'kind': 'game-full', 'src': 21.75, 'len': 78, 'zoom': [[0, 1.15], [78, 1.0]]},
]
wordsB = [
    ('ТАК,', 9.92, 10.5, 'w'), ('ОДНОГО', 10.66, 10.8, 'y'), ('пропустили.', 10.8, 11.48, 'w'),
    ('Зелёный,', 4.02, 4.62, 'w'), ('пик', 4.62, 4.8, 'w'), ('не', 4.8, 4.92, 'w'), ('ЛОНГ,', 4.92, 5.26, 'y'), ('бл*ть!', 5.26, 5.54, 'w'),
    ('бл*ть,', 15.06, 15.6, 'b'), ('ты', 15.86, 16.26, 'w'), ('ПОМОГИ,', 16.26, 16.78, 'b'), ('бл*ть', 16.82, 17.12, 'b'),
    ('ВЫЙДИ,', 20.46, 20.82, 'r'), ('бл*ть,', 20.88, 21.06, 'r'), ('ДОЛБО*Б!', 21.2, 21.62, 'r'),
]
planB, mapB = build(
    segB, wordsB, [[0], [1, 2], [3, 4], [5, 6], [7], [8, 9], [10, 11], [12], [13], [14]],
    bleeps=[[16.82, 17.12], [21.2, 21.62]], mutes10=[[5.26, 5.54], [15.06, 15.6], [20.88, 21.06]],
    captions=[
        {'text': 'ОДНОГО, ГОВОРИШЬ?', 'seg': 'hook', 't': 10.8, 'len': 40, 'style': 'hook', 'x': 0, 'y': 240},
        {'text': 'раздаёт указания команде', 'seg': 'captain', 't': 4.0, 'len': 55, 'style': 'comment', 'x': 60, 'y': 700},
        {'text': 'сам держит угол у смока', 'seg': 'captain', 't': 6.4, 'len': 60, 'style': 'comment', 'x': 60, 'y': 700},
        {'text': 'ОДИН ✓', 'seg': 'fight', 't': 10.95, 'len': 45, 'style': 'sticker', 'x': 640, 'y': 900},
        {'text': 'ЕЩЁ ОДИН', 'seg': 'fight', 't': 12.5, 'len': 45, 'style': 'sticker', 'x': 600, 'y': 990},
        {'text': 'И ЕЩЁ…', 'seg': 'fight', 't': 13.75, 'len': 45, 'style': 'sticker', 'x': 640, 'y': 1080},
        {'text': 'сейчас он их всех…', 'seg': 'fight', 't': 14.0, 'len': 52, 'style': 'comment', 'x': 60, 'y': 780},
        {'text': 'зовёт тиммейта на помощь', 'seg': 'help', 't': 15.5, 'len': 50, 'style': 'comment', 'x': 60, 'y': 300},
        {'text': 'а тиммейт сидит за смоком', 'seg': 'mate', 't': 18.05, 'len': 70, 'style': 'comment', 'x': 60, 'y': 360},
        {'text': '…и наконец стреляет. В смок.', 'seg': 'finally', 't': 22.4, 'len': 58, 'style': 'comment', 'x': 60, 'y': 360},
    ],
    hp=[],
    shakes=[['death', 14.9, 18], ['smoke3d', 20.46, 14], ['smoke3d', 20.9, 10], ['smoke3d', 21.2, 22]],
    flashes=[['freeze', 4], ['captain', 3], ['death', 5], ['smoke3d', 5], ['finally', 4]],
    title='«Одного пропустили» 🫠', essence='Сказал «одного пропустили» — из смока вышли ещё, он умер, а тиммейт всё это время сидел за смоком.',
    sfx=[['hook', 9.85, 'pop'], ['hook', 10.8, 'pop'], ['freeze', 11.5, 'scratch'], ['captain', 3.6, 'whoosh'], ['captain', 4.0, 'pop'], ['captain', 6.4, 'pop'],
         ['stop', 14.5, 'scratch'], ['death', 14.9, 'thud'], ['help', 15.5, 'pop'], ['mate', 18.05, 'pop'], ['smoke3d', 20.4, 'whoosh'], ['finally', 21.75, 'whoosh'], ['finally', 22.4, 'pop']],
)
planB = resolve(planB, segB)
for name, p in (('a', planA), ('b', planB)):
    json.dump(p, open(f'data/{name}.json', 'w'), ensure_ascii=False, indent=1)
    print(name, p['duration'], 'frames', [(w['text'], w['from']) for w in p['words']])
analysis = {
    'a': {'game': 'Counter-Strike 2', 'map': 'Dust II (туннели B)', 'genre': 'шутер', 'palette': {'sand': '#C9A774', 'shadow': '#3B2A1E', 'hud_red': '#E0453A', 'accent': '#FFD21E'},
          'layout_src': {'size': [900, 1600], 'webcam': [0, 0, 900, 510], 'scoreboard': [0, 510, 900, 580], 'gameplay': [0, 580, 900, 1600]},
          'loudness_src': {'integrated_lufs': -21.6, 'true_peak_dbfs': -2.9},
          'events': [{'t': [1.3, 3.0], 'type': 'setup', 'said': 'Бл*, ну не иди туда, дурак, бл*ть!', 'emotion': 'rage', 'fun': 6},
                     {'t': [5.0, 8.0], 'type': 'escalation', 'what': 'сам в туннелях B, выбегают враги, высаживает USP, HP 100→73→45', 'emotion': 'panic', 'fun': 6},
                     {'t': [8.0, 10.6], 'type': 'peak', 'said': 'УХ! УХ! УХ! УХ! УХ! О!', 'emotion': 'panic', 'fun': 10},
                     {'t': [10.6, 12.05], 'type': 'peak', 'what': 'второй враг, HP 18, смерть', 'emotion': 'panic', 'fun': 7},
                     {'t': [12.05, 13.7], 'type': 'reaction', 'said': 'Бл*дь! Ни*уя…', 'emotion': 'rage', 'fun': 7}],
          'essence': planA['essence'], 'asr_note': 'whisper small; фраза 15.5–17.3 («там лох… в нижней»?) распознаётся нестабильно — не используется'},
    'b': {'game': 'Counter-Strike 2', 'map': 'не определена уверенно — в ролике не называется', 'genre': 'шутер',
          'palette': {'plaster': '#D9D2C3', 'sky': '#9CC3E6', 'smoke': '#BFC5CC', 'accent': '#FFD21E'},
          'layout_src': {'size': [900, 1600], 'webcam': [0, 0, 900, 510], 'scoreboard': [0, 510, 900, 580], 'gameplay': [0, 580, 900, 1600]},
          'loudness_src': {'integrated_lufs': -21.2, 'true_peak_dbfs': -2.8},
          'events': [{'t': [3.95, 5.6], 'type': 'setup', 'said': 'Зелёный, пик не лонг, бл*ть!', 'emotion': 'deadpan', 'fun': 4},
                     {'t': [9.0, 11.5], 'type': 'escalation', 'what': 'враг выбегает из смока, убит', 'said': 'Так, одного пропустили.', 'fun': 7},
                     {'t': [11.6, 15.05], 'type': 'peak', 'what': 'из смока бегут ещё, Glock на исходе, смерть', 'emotion': 'panic', 'fun': 8},
                     {'t': [15.05, 17.2], 'type': 'reaction', 'said': 'Бл*ть, ты помоги, бл*ть', 'emotion': 'rage', 'fun': 6},
                     {'t': [18.0, 23.4], 'type': 'aftermath', 'what': 'тиммейт сидит у смока', 'said': 'Выйди, бл*ть, долбо*б!', 'emotion': 'rage', 'fun': 9}],
          'essence': planB['essence'], 'asr_note': 'whisper small; «Ох, чё, колонка?» (0–0.7) и «Добро» (13.4) неуверенно — не используются'},
}
for k, v in analysis.items():
    json.dump(v, open(f'../{k}/work/analysis.json', 'w'), ensure_ascii=False, indent=1)
