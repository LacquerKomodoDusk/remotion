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

# ---------------- A: "учил всех не лезть"
segA = [
    {'id': 'hook', 'kind': 'webcam-full', 'src': 1.30, 'len': 52, 'zoom': [[0, 1.0], [52, 1.12]]},
    {'id': 'freeze', 'kind': 'webcam-full', 'src': 3.0, 'len': 14, 'freeze': True, 'zoom': [[0, 1.12], [14, 1.18]], 'tint': 'bw'},
    {'id': 'tunnels', 'kind': 'split', 'src': 5.0, 'len': 90, 'zoom': [[0, 1.0], [24, 1.0], [60, 1.18], [90, 1.22]], 'focus': [560, 1250]},
    {'id': 'scream', 'kind': 'webcam-full', 'src': 8.0, 'len': 78, 'zoom': [[0, 1.0], [78, 1.18]], 'overlay3d': 'uh'},
    {'id': 'replay1', 'kind': 'webcam-full', 'src': 8.08, 'len': 25, 'zoom': [[0, 1.4], [25, 1.45]], 'tint': 'replay'},
    {'id': 'replay2', 'kind': 'webcam-full', 'src': 8.48, 'len': 20, 'zoom': [[0, 1.75], [20, 1.8]], 'tint': 'replay'},
    {'id': 'death', 'kind': 'split', 'src': 10.6, 'len': 44, 'zoom': [[0, 1.0], [30, 1.15], [44, 1.35]], 'focus': [560, 1250]},
    {'id': 'after', 'kind': 'webcam-full', 'src': 12.05, 'len': 50, 'zoom': [[0, 1.3], [8, 1.12], [42, 1.02], [50, 1.0]], 'tint': 'redfade'},
]
wordsA = [
    ('Бл*,', 1.40, 1.58, 'w'), ('ну', 1.58, 1.76, 'w'), ('не', 1.76, 1.90, 'w'), ('иди', 1.90, 2.12, 'w'), ('туда,', 2.12, 2.46, 'w'),
    ('ДУРАК,', 2.46, 2.76, 'y'), ('БЛ*ТЬ!', 2.76, 3.0, 'y'),
    ('УХ!', 8.08, 8.48, 'r'), ('УХ!', 8.48, 8.88, 'r'), ('УХ!', 8.92, 9.14, 'r'), ('УХ!', 9.14, 9.44, 'r'), ('УХ!', 9.5, 9.72, 'r'), ('О-О-О!', 10.2, 10.5, 'r'),
    ('БЛ*ДЬ!', 11.7, 12.6, 'b'), ('НИ*УЯ…', 13.1, 13.58, 'b'),
]
# replays repeat the scream: subtitles for them are added in Main (no new words)
planA, mapA = build(
    segA, wordsA, [[0, 1, 2], [3, 4], [5, 6], [7], [8], [9], [10], [11], [12], [13], [14]],
    bleeps=[[2.76, 3.0], [11.7, 12.6], [13.1, 13.58]], mutes10=[[1.40, 1.58]],
    captions=[
        {'text': 'ЗАПОМНИТЕ ЭТУ ФРАЗУ', 'from': 30, 'to': 66, 'style': 'hook', 'x': 0, 'y': 240},
        {'text': '3 СЕКУНДЫ СПУСТЯ', 'from': 66, 'to': 92, 'style': 'card', 'x': 0, 'y': 900},
        {'text': 'план: не идти туда', 'from': 94, 'to': 124, 'style': 'comment', 'x': 80, 'y': 700},
        {'text': 'ПОВТОР ×2', 'from': 234, 'to': 279, 'style': 'replay', 'x': 0, 'y': 300},
        {'text': 'дурак, говоришь?', 'from': 345, 'to': 373, 'style': 'comment', 'x': 80, 'y': 780},
    ],
    hp=[{'from': 156, 'to': 234, 'value': 45}, {'from': 300, 'to': 323, 'value': 18}],
    shakes=[[158, 10], [168, 12], [178, 14], [186, 14], [195, 16], [222, 20], [234, 14], [259, 18], [318, 22]],
    flashes=[[66, 5], [156, 4], [234, 3], [259, 3], [279, 4], [323, 6]],
    title='Учил всех не лезть туда… 🙃', essence='Сказал тиммейту «не иди туда, дурак» — через 3 секунды сам полез туда и умер с криком «УХ! УХ! УХ!».',
    sfx=[[0, 'pop'], [30, 'pop'], [52, 'scratch'], [66, 'whoosh'], [94, 'pop'], [156, 'whoosh'], [234, 'rewind'], [259, 'rewind'], [279, 'whoosh'], [323, 'thud'], [345, 'pop']],
)
# ---------------- B: "одного пропустили"
segB = [
    {'id': 'hook', 'kind': 'webcam-full', 'src': 9.85, 'len': 51, 'zoom': [[0, 1.0], [51, 1.12]]},
    {'id': 'freeze', 'kind': 'webcam-full', 'src': 11.5, 'len': 12, 'freeze': True, 'zoom': [[0, 1.12], [12, 1.16]], 'tint': 'bw'},
    {'id': 'captain', 'kind': 'split', 'src': 3.95, 'len': 51, 'zoom': [[0, 1.0], [51, 1.06]], 'focus': [540, 1250]},
    {'id': 'first', 'kind': 'split', 'src': 9.0, 'len': 78, 'zoom': [[0, 1.0], [30, 1.12], [78, 1.12]], 'focus': [600, 1180]},
    {'id': 'more', 'kind': 'split', 'src': 11.6, 'len': 87, 'zoom': [[0, 1.12], [87, 1.25]], 'focus': [600, 1180]},
    {'id': 'stop', 'kind': 'split', 'src': 14.5, 'len': 12, 'freeze': True, 'zoom': [[0, 1.25], [12, 1.3]], 'focus': [600, 1180], 'tint': 'bw'},
    {'id': 'death', 'kind': 'split', 'src': 14.5, 'len': 17, 'zoom': [[0, 1.3], [17, 1.45]], 'focus': [600, 1180]},
    {'id': 'help', 'kind': 'webcam-full', 'src': 15.05, 'len': 64, 'zoom': [[0, 1.0], [40, 1.08], [64, 1.25]]},
    {'id': 'mate', 'kind': 'game-full', 'src': 18.0, 'len': 72, 'zoom': [[0, 1.0], [72, 1.1]]},
    {'id': 'smoke3d', 'kind': '3d', 'src': 20.4, 'len': 40, 'scene': 'smoke'},
    {'id': 'finally', 'kind': 'game-full', 'src': 21.75, 'len': 50, 'zoom': [[0, 1.15], [50, 1.0]]},
]
wordsB = [
    ('ТАК,', 9.92, 10.5, 'w'), ('ОДНОГО', 10.66, 10.8, 'y'), ('пропустили.', 10.8, 11.48, 'w'),
    ('Зелёный,', 4.02, 4.62, 'w'), ('пик', 4.62, 4.8, 'w'), ('не', 4.8, 4.92, 'w'), ('ЛОНГ,', 4.92, 5.26, 'y'), ('бл*ть!', 5.26, 5.54, 'w'),
    ('бл*ть,', 15.06, 15.6, 'b'), ('ты', 15.86, 16.26, 'w'), ('ПОМОГИ,', 16.26, 16.78, 'b'), ('бл*ть', 16.82, 17.12, 'b'),
    ('ВЫЙДИ,', 20.46, 20.82, 'r'), ('бл*ть,', 20.88, 21.06, 'r'), ('ДОЛБО*Б!', 21.2, 21.62, 'r'),
]
planB, mapB = build(
    segB, wordsB, [[0], [1, 2], [3, 4], [5, 6], [7], [8, 9], [10, 11], [12], [13], [14]],
    bleeps=[[16.82, 17.12], [21.2, 21.62]], mutes10=[[5.26, 5.54], [15.02, 15.6], [20.88, 21.06]],
    captions=[
        {'text': 'ОДНОГО, ГОВОРИШЬ?', 'from': 28, 'to': 63, 'style': 'hook', 'x': 0, 'y': 240},
        {'text': 'капитан команды', 'from': 66, 'to': 112, 'style': 'comment', 'x': 80, 'y': 700},
        {'text': 'ОДИН ✓', 'from': 172, 'to': 202, 'style': 'sticker', 'x': 640, 'y': 900},
        {'text': 'ЕЩЁ ОДИН', 'atSrc': 12.5, 'len': 32, 'style': 'sticker', 'x': 620, 'y': 900},
        {'text': 'И ЕЩЁ…', 'atSrc': 13.75, 'len': 25, 'style': 'sticker', 'x': 600, 'y': 900},
        {'text': 'сейчас он их всех…', 'from': 279, 'to': 291, 'style': 'comment', 'x': 80, 'y': 780},
        {'text': 'тиммейт:', 'from': 372, 'to': 440, 'style': 'comment', 'x': 80, 'y': 360},
        {'text': 'НЕ БЕСПОКОИТЬ', 'from': 0, 'to': 0, 'style': 'none', 'x': 0, 'y': 0},
    ],
    hp=[],
    shakes=[[306, 18], [442, 14], [448, 10], [456, 22]],
    flashes=[[63, 4], [114, 3], [306, 6], [442, 5], [482, 4]],
    title='«Одного пропустили» 🫠', essence='Сказал «одного пропустили» — из смока вышло ещё двое, а тиммейт так и сидел в смоке.',
    sfx=[[0, 'pop'], [28, 'pop'], [51, 'scratch'], [63, 'whoosh'], [66, 'pop'], [279, 'scratch'], [306, 'thud'], [372, 'pop'], [442, 'whoosh'], [482, 'whoosh']],
)
planB['captions'] = [c for c in planB['captions'] if c['style'] != 'none']
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
