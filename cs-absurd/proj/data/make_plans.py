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


# ---------------- C: "В мире CS2" — the whole clip, documentary plates, 3D score podium at half-time
segC = [
    {'id': 'doors', 'kind': 'split', 'src': 0.0, 'len': 48, 'zoom': [[0, 1.0], [48, 1.12]], 'focus': [540, 1250]},
    {'id': 'banner', 'kind': 'split', 'src': 1.6, 'len': 72, 'zoom': [[0, 1.12], [10, 1.0], [72, 1.04]], 'focus': [540, 1000]},
    # the side switch turns on all-talk and everyone starts yelling: 3D staging over the real audio
    {'id': 'alltalk', 'kind': '3d', 'src': 4.0, 'len': 108, 'scene': 'alltalk'},
    {'id': 'calm', 'kind': 'webcam-full', 'src': 7.6, 'len': 159, 'zoom': [[0, 1.0], [60, 1.1], [110, 1.18], [159, 1.0]]},
    {'id': 'dance', 'kind': 'game-full', 'src': 12.9, 'len': 111, 'zoom': [[0, 1.0], [111, 1.1]]},
    {'id': 'podium', 'kind': '3d', 'src': 13.0, 'len': 96, 'scene': 'podium', 'audioGain': -8},
    {'id': 'countdown', 'kind': 'split', 'src': 16.6, 'len': 468,
     'zoom': [[0, 1.0], [80, 1.06], [130, 1.0], [160, 1.12], [250, 1.18], [270, 1.0], [330, 1.12], [440, 1.2], [468, 1.25]], 'focus': [560, 1180]},
    {'id': 'fin', 'kind': 'webcam-full', 'src': 32.2, 'len': 72, 'zoom': [[0, 1.0], [72, 1.15]]},
]
wordsC = [('Да,', 2.2, 2.32, 'w'), ('ёп…', 2.32, 2.62, 'w'),
          ('Ну', 32.32, 32.8, 'w'), ('ладно,', 32.8, 33.08, 'w'), ('РЕБЯТА,', 33.22, 33.46, 'y'), ('бл*дь.', 33.66, 34.02, 'w')]
D = 'doc'
planC, _ = build(
    segC, wordsC, [[0, 1], [2, 3], [4, 5]],
    bleeps=[], mutes10=[[33.66, 34.02]],
    captions=[
        {'label': 'НАБЛЮДЕНИЕ №1', 'text': 'Особь держит дверь. Счёт 1:10.', 'seg': 'doors', 't': 0.0, 'len': 48, 'style': D},
        {'label': 'НАБЛЮДЕНИЕ №2', 'text': 'Огонь по закрытой двери. Дверь побеждает.', 'seg': 'banner', 't': 1.6, 'len': 54, 'style': D},
        {'label': 'ТАБЛО', 'text': 'Счёт становится 1:11.', 'seg': 'banner', 't': 3.1, 'len': 45, 'style': D},
        {'label': 'ЗВУКИ ПРИРОДЫ', 'text': 'Смена сторон. Включается общий голосовой чат.', 'seg': 'alltalk', 't': 4.0, 'len': 54, 'style': D},
        {'label': 'ЗВУКИ ПРИРОДЫ', 'text': 'Обе стаи начинают перекличку.', 'seg': 'alltalk', 't': 5.8, 'len': 54, 'style': D},
        {'label': 'ПОВЕДЕНИЕ', 'text': 'Особь сохраняет полное спокойствие.', 'seg': 'calm', 't': 7.7, 'len': 45, 'style': D},
        {'label': 'РИТУАЛ', 'text': 'Подготовка ко второй половине.', 'seg': 'calm', 't': 9.2, 'len': 60, 'style': D},
        {'label': 'РИТУАЛ', 'text': '…и облако, видимое с другого конца карты.', 'seg': 'calm', 't': 11.2, 'len': 51, 'style': D},
        {'label': 'СТАЯ', 'text': 'Стая исполняет танец. При счёте 1:11.', 'seg': 'dance', 't': 13.3, 'len': 96, 'style': D},
        {'label': 'ОТСЧЁТ', 'text': 'До второй половины — 19 секунд.', 'seg': 'countdown', 't': 17.0, 'len': 66, 'style': D},
        {'label': 'ЗАКУПКА', 'text': 'Сбор ресурсов на камбэк.', 'seg': 'countdown', 't': 19.4, 'len': 66, 'style': D},
        {'label': 'СТАЯ', 'text': 'Сородичи замерли в ожидании сигнала.', 'seg': 'countdown', 't': 21.8, 'len': 80, 'style': D},
        {'label': 'ОСОБЬ', 'text': 'Разминка с ножом.', 'seg': 'countdown', 't': 24.9, 'len': 54, 'style': D},
        {'label': 'ОТСЧЁТ', 'text': 'Цифры краснеют. Природа замирает.', 'seg': 'countdown', 't': 26.4, 'len': 75, 'style': D},
        {'label': 'ОТСЧЁТ', 'text': 'Семь секунд до великого камбэка.', 'seg': 'countdown', 't': 29.0, 'len': 80, 'style': D},
        {'label': 'ВЫВОД', 'text': 'Особь верит в команду.', 'seg': 'fin', 't': 32.6, 'len': 60, 'style': D},
    ],
    hp=[], shakes=[['doors', 1.45, 12]], flashes=[['banner', 4], ['alltalk', 5], ['calm', 4], ['podium', 4], ['countdown', 3]],
    title='Звери', essence='Счёт 1:11, он умирает, стреляя в закрытую дверь; на смене сторон включается общий голосовой чат и обе команды орут как звери, а он спокойно парит — и игра устраивает его команде праздничный танец.',
    sfx=[['doors', 0.0, 'pop'], ['banner', 1.6, 'thud'], ['alltalk', 4.0, 'whoosh'], ['calm', 7.6, 'whoosh'], ['podium', 13.0, 'whoosh'], ['countdown', 16.6, 'whoosh'], ['countdown', 26.0, 'pop'], ['fin', 32.2, 'whoosh']],
)
planC = resolve(planC, segC)

# ---------------- D: "Наблюдатель" — the whole clip, live counters, 3D tactical hologram before the punchline
segD = [
    {'id': 'watch', 'kind': 'split', 'src': 0.0, 'len': 300,
     'zoom': [[0, 1.0], [30, 1.15], [160, 1.22], [180, 1.05], [250, 1.15], [300, 1.25]], 'focus': [600, 1150]},
    {'id': 'stop', 'kind': 'split', 'src': 10.0, 'len': 18, 'freeze': True, 'zoom': [[0, 1.25], [18, 1.3]], 'focus': [600, 1150], 'tint': 'bw'},
    {'id': 'holo', 'kind': '3d', 'src': 10.0, 'len': 120, 'scene': 'tactical', 'mute': True},
    {'id': 'death', 'kind': 'split', 'src': 10.0, 'len': 63, 'zoom': [[0, 1.2], [40, 1.1], [63, 1.3]], 'focus': [600, 1150]},
    {'id': 'blame', 'kind': 'webcam-full', 'src': 12.1, 'len': 99, 'zoom': [[0, 1.0], [36, 1.08], [40, 1.3], [99, 1.38]]},
    {'id': 'after', 'kind': 'game-full', 'src': 15.4, 'len': 168, 'zoom': [[0, 1.0], [168, 1.08]]},
]
wordsD = [('А', 0.60, 0.96, 'w'), ('чё,', 0.96, 1.14, 'w'), ('кто-то', 1.20, 1.48, 'w'), ('может', 1.48, 1.66, 'w'), ('ВЫЙДЕТ,', 1.66, 2.12, 'y'), ('нет?', 2.16, 2.4, 'w'),
          ('Может,', 3.54, 3.90, 'w'), ('ВЫЙДЕМ', 3.90, 4.72, 'y'), ('Б,', 4.72, 4.9, 'w'), ('нет?', 4.92, 5.3, 'w'),
          ('Да,', 12.04, 12.40, 'r'), ('ёп', 12.40, 12.76, 'r'), ('твою', 12.80, 12.90, 'r'), ('мать,', 12.90, 13.16, 'r'),
          ('ну', 13.22, 13.30, 'w'), ('ОРАНЖЕВАЯ', 13.30, 13.86, 'y'), ('х*йня,', 13.90, 14.22, 'w'), ('бл*ть', 14.30, 14.7, 'w')]
planD, _ = build(
    segD, wordsD, [[0, 1, 2], [3, 4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17]],
    bleeps=[[13.90, 14.22]], mutes10=[[14.30, 14.7]],
    captions=[
        {'text': 'враг — вот он', 'seg': 'watch', 't': 1.2, 'len': 50, 'style': 'sticker', 'x': 430, 'y': 1000},
        {'text': 'он предлагает выйти. враг уже вышел', 'seg': 'watch', 't': 3.6, 'len': 75, 'style': 'comment', 'x': 50, 'y': 880},
        {'text': 'и возвращается', 'seg': 'watch', 't': 6.2, 'len': 50, 'style': 'comment', 'x': 50, 'y': 880},
        {'text': 'СОВСЕМ РЯДОМ', 'seg': 'watch', 't': 8.3, 'len': 52, 'style': 'sticker', 'x': 430, 'y': 1000},
        {'text': 'СТОП. РАЗБОР.', 'seg': 'stop', 't': 10.0, 'len': 45, 'style': 'card', 'y': 860},
        {'text': 'врага убили. не он — патронов всё ещё 13', 'seg': 'death', 't': 10.5, 'len': 60, 'style': 'comment', 'x': 30, 'y': 880},
        {'text': 'ПЕРВЫЙ ВЫСТРЕЛ', 'seg': 'death', 't': 11.3, 'len': 45, 'style': 'sticker', 'x': 330, 'y': 1060},
        {'text': 'ВЫВОД: ВИНОВАТ ОРАНЖЕВЫЙ', 'seg': 'blame', 't': 13.9, 'len': 75, 'style': 'card', 'y': 300},
    ],
    hp=[], shakes=[['death', 11.6, 16], ['blame', 12.04, 10], ['blame', 13.3, 14]], flashes=[['stop', 4], ['holo', 4], ['death', 4], ['after', 3]],
    counters={'visible': [[1.0, 5.4], [6.1, 10.4]], 'shots': [11.3, 11.6], 'until': 12.05, 'hideFrom': 'after'},
    summary={'seg': 'after', 't': 15.9, 'rows': [['ВРАГ В КАДРЕ', '8,7 с'], ['ВЫСТРЕЛОВ, ПОКА ОН РЯДОМ', '0'], ['УБИЛ ЕГО', 'НЕ ОН'], ['ВИНОВАТ', 'ОРАНЖЕВЫЙ']]},
    title='Наблюдатель', essence='Враг почти 9 секунд в кадре, он ни разу не стреляет и зовёт команду «выйти» — а когда умирает, виноват оранжевый.',
    sfx=[['watch', 1.0, 'pop'], ['watch', 3.6, 'pop'], ['watch', 8.3, 'pop'], ['stop', 10.0, 'scratch'], ['holo', 10.0, 'whoosh'], ['death', 10.0, 'whoosh'],
         ['death', 11.3, 'pop'], ['blame', 13.9, 'thud'], ['after', 15.9, 'whoosh']],
)
planD = resolve(planD, segD)
sm = planD['summary']
s0 = next(x for x in segD if x['id'] == sm['seg'])
planD['summary'] = {'from': int(round(s0['from'] + (sm['t'] - s0['src']) * FPS)), 'rows': sm['rows']}
planD['counters']['hideFrom'] = next(x for x in segD if x['id'] == 'blame')['from']

for name, p in (('c', planC), ('d', planD)):
    json.dump(p, open(f'data/{name}.json', 'w'), ensure_ascii=False, indent=1)
    print(name, p['duration'], round(p['duration'] / 30, 1), 's')
    for c in p['captions']:
        print('   ', c['from'], c['to'], c['text'])
analysis = {
    'c': {'game': 'Counter-Strike 2', 'map': 'Dust II (подтверждено экраном смерти)', 'score': 'до перерыва 10:1 в пользу соперника, после — 1:11',
          'layout_src': {'size': [900, 1600], 'webcam': [0, 0, 900, 510], 'gameplay': [0, 580, 900, 1600]}, 'loudness_src': {'integrated_lufs': -32.4, 'true_peak_dbfs': -10.4},
          'facts': ['0–1.5: держит закрытые двери, стреляет в них на 1.25, умирает на 1.5', '2.5: баннер «TEAM_OLLDRI выигрывают раунд» → 1:11', '1.75+: «ALLTALK ENABLED», с ~4.2 по 16.7 с — общий голосовой чат, все орут',
                    '8–10: подносит что-то ко рту, 11–12: облако пара', '11–16.6: заставка «ВТОРАЯ ПОЛОВИНА», агенты танцуют',
                    '17–33: закупка, таймер 0:19 → 0:03 (красный с 0:10) — все стоят законно, это freeze time', '32.3–34: «Ну ладно, ребята, бл*дь.»'],
          'asr_note': 'с 4 по 17 с — общий голосовой чат (ор обеих команд) — Whisper галлюцинирует («Продолжение следует», «Редактор субтитров»); в субтитры берутся только уверенные фразы',
          'essence': planC['essence']},
    'd': {'game': 'Counter-Strike 2', 'map': 'не называется (уверенно не определяется)', 'layout_src': {'size': [900, 1600]},
          'loudness_src': {'integrated_lufs': -24.1, 'true_peak_dbfs': -4.3},
          'facts': ['враг в кадре 1.0–5.4 и 6.1–10.4 с (≈8.7 с), подходит вплотную 8.3–10.0', 'патроны 13 до 11.3 с — до этого он не стрелял',
                    '10.4–10.9: врага рядом убивают (кровь), патроны всё ещё 13', '11.3–11.6: его первые выстрелы, HP 75 → 23, смерть на 12.0',
                    '«оранжевая х*йня» — цвет тиммейта в CS2'], 'asr_note': '7.6–10.1 («какой нах*й … есть, давай…») распознаётся неуверенно — без субтитров, звук остаётся',
          'essence': planD['essence']},
}
for k, v in analysis.items():
    json.dump(v, open(f'../{k}/work/analysis.json', 'w'), ensure_ascii=False, indent=1)
