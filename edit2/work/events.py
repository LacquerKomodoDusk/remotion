# События эффектов и SFX для клипа 2 «Проиграл боту» (исполняется внутри post.py)
HK, HF, RW, FI, DE, DF, BA, CO, RE, DR, LA, TA = (seg[x] for x in ['hook', 'hook_fz', 'rewind', 'fight', 'death', 'death_fz', 'banner', 'count', 'react', 'drop', 'last', 'tail'])

# --- ХУК ---
E(type='flash', f=0, dur=6, amt=0.8)
E(type='title', f=2, dur=HF['end'] - 2, lines=['ПРОИГРАЛ', 'БОТУ?!'], accent=1, y=840)
E(type='letterbox', f=0, dur=HF['end'])
S('riser', 0, 0.45, dur=HF['start'] / FPS)
hit(HF['start'], 1.0)
E(type='leak', f=HF['start'], dur=40, hue=0)
# --- ПЕРЕМОТКА ---
E(type='glitch', f=RW['start'], dur=RW['end'] - RW['start'])
E(type='rewind', f=RW['start'], dur=RW['end'] - RW['start'] + 10, text='◀◀ 7 СЕКУНД НАЗАД')
S('rewind', RW['start'], 0.8, dur=(RW['end'] - RW['start']) / FPS)
# --- ДРАКА ---
E(type='flash', f=FI['start'], dur=8, amt=0.7); E(type='punch', f=FI['start'], amt=0.14)
S('whoosh', FI['start'] - 6, 0.6)
E(type='meter', f=FI['start'] + 8, end=DF['start'], lost=DF['start'], hide=BA['start'] + 70, label='ШАНС ПОБЕДЫ', lostLabel='ШАНС ПОБЕДЫ')
E(type='title', f=FI['start'] + 6, dur=80, lines=['1 НА 1', 'ВСЁ ПОД КОНТРОЛЕМ'], accent=0, y=840)
# слоумо-провалы драки = попадания: свет + саб + удар
f = FI['start'] + 1
while f < FI['end']:
    if abs(SP[f - 1]) >= 0.6 > abs(SP[f]):
        E(type='punch', f=f, amt=0.09); E(type='ca', f=f, dur=8, amt=6); E(type='leak', f=f - 4, dur=34, hue=(f // 7) % 3); S('boom', f, 0.5)
        f += 20
    if abs(SP[f - 1]) < 1.4 <= abs(SP[f]):
        S('whoosh', f - 4, 0.35)
    f += 1
# стройка (2.5–3.4 src) — подпись
E(type='label', f=at('fight', 2.45), dur=at('fight', 3.4) - at('fight', 2.45), text='СТРОИТ КАК ПРО', target='game', top=1420)
S('pop', at('fight', 2.45), 0.4)
# --- СМЕРТЬ ---
E(type='letterbox', f=at('death', 6.95), dur=DF['end'] - at('death', 6.95) + 6)
S('riser', at('death', 6.9), 0.7, dur=(DF['start'] - at('death', 6.9)) / FPS)
E(type='zoomin', f=at('death', 6.95), end=DF['start'], amt=0.1)
hit(DF['start'], 1.2)
E(type='leak', f=DF['start'], dur=50, hue=1)
S('powerdown', DF['start'] + 4, 0.6)
# --- БАННЕР: разбор ника ---
fb = at('banner', 7.75)  # баннер появился
E(type='zoomin', f=fb, end=fb + 120, amt=0.35, ox=482, oy=930)
E(type='punch', f=fb, amt=0.06); S('pop', fb, 0.5)
E(type='label', f=fb + 24, dur=BA['end'] - fb - 24 + 20, text='TYPOWY BOCIK —\nс польского «ТИПИЧНЫЙ БОТИК»', target='cam', top=1150, size=46)
S('pop', fb + 24, 0.4)
E(type='word', f=fb + 95, dur=BA['end'] - fb - 95 + 25, text='БУКВАЛЬНО.', y=700, x=0, accent=1)
hit(fb + 95, 0.6)
# --- ОТСЧЁТ ---
for i, t in enumerate([9.85, 10.45, 11.0]):
    ff = at('count', t) if t < 11.1 else CO['end'] - 2
    if CO['start'] <= ff < CO['end'] - 1:
        E(type='word', f=ff, dur=min(28, CO['end'] - ff + 6), text=str(3 - i) if i < 2 else '1', y=1250, x=0, accent=1)
        E(type='punch', f=ff, amt=0.06); S('pop', ff, 0.5)
# --- РЕАКЦИЯ ---
S('whoosh', RE['start'] - 6, 0.7)
E(type='title', f=RE['start'] + 10, dur=RE['end'] - RE['start'] - 10, lines=['НИЧЕГО, ЕСТЬ ЖЕ', 'РЕСПАУН'], accent=1, y=1430)
# --- ПАДЕНИЕ ---
E(type='glitch', f=DR['start'], dur=8); S('whoosh', DR['start'] - 4, 0.9)
E(type='flash', f=DR['start'], dur=10, amt=0.7)
# --- ПОСЛЕДНЯЯ ЖИЗНЬ ---
E(type='zoomin', f=LA['start'], end=LA['end'], amt=0.3, ox=471, oy=1440)
E(type='letterbox', f=LA['start'], dur=LA['end'] - LA['start'] + 4)
hit(LA['start'] + 6, 0.8)
E(type='title', f=LA['start'] + 14, dur=LA['end'] - LA['start'] + 50, lines=['ЭТО БЫЛА', 'ПОСЛЕДНЯЯ ЖИЗНЬ'], accent=1, y=560)
S('powerdown', LA['start'] + 20, 0.5)
E(type='leak', f=LA['start'] + 6, dur=60, hue=2)
# --- ХВОСТ / ЛУП ---
S('whoosh', TA['start'] - 4, 0.6)
E(type='whiteout', f=N - 7, dur=7)
S('impact', N - 6, 0.8); S('riser', N - 50, 0.4, dur=44 / FPS)
