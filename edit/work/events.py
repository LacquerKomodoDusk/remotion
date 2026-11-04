# События эффектов и SFX для клипа 1 (исполняется внутри post.py)
H, HF, RW, DA, DV, DF, OU, AF, KI, SK, HE = (seg[x] for x in ['hook', 'hook_fz', 'rewind', 'dance', 'dive', 'dive_fz', 'out', 'after', 'kick', 'skip', 'heal'])

# --- ХУК ---
E(type='flash', f=0, dur=6, amt=0.8)  # выход из белого (луп)
E(type='title', f=2, dur=HF['end'] - 2, lines=['ОН ПРОДЕРЖАЛСЯ', '5 СЕКУНД'], accent=1, y=880)
E(type='letterbox', f=0, dur=HF['end'])
S('riser', 0, 0.5, dur=(HF['start']) / FPS)
hit(HF['start'], 1.0)
E(type='leak', f=HF['start'], dur=40, hue=0)
# --- ПЕРЕМОТКА ---
E(type='glitch', f=RW['start'], dur=RW['end'] - RW['start'])
E(type='rewind', f=RW['start'], dur=RW['end'] - RW['start'] + 10)
S('rewind', RW['start'], 0.8, dur=(RW['end'] - RW['start']) / FPS)
# --- ТАНЕЦ ---
E(type='flash', f=DA['start'], dur=8, amt=0.7)
E(type='punch', f=DA['start'], amt=0.14)
S('whoosh', DA['start'] - 6, 0.6)
E(type='title', f=DA['start'] + 4, dur=95, lines=['ПОВТОРЯЮ', 'ЗА СКИНОМ'], accent=1, y=880)
E(type='meter', f=DA['start'] + 10, end=DF['start'], lost=DF['start'], hide=OU['end'] + 40)
bi = 0
for b in beats:
    if 1.3 < b < 5.95:
        f = at('dance', b); s = abs(SP[f])
        if s < 0.6:  # слоумо-провал на бите: мягкий свет + саб
            E(type='leak', f=f - 6, dur=34, hue=bi % 3); S('boom', f, 0.5); E(type='punch', f=f, amt=0.07)
        elif bi % 2 == 0:
            E(type='punch', f=f, amt=0.06); E(type='pump', f=f, dur=8)
        bi += 1
for f in range(DA['start'] + 1, DA['end']):
    if abs(SP[f - 1]) < 1.4 <= abs(SP[f]):
        S('whoosh', f - 4, 0.35)
# --- НЫРОК ---
E(type='letterbox', f=at('dive', 6.35), dur=DF['end'] - at('dive', 6.35) + 6)
S('riser', at('dive', 6.25), 0.7, dur=(DF['start'] - at('dive', 6.25)) / FPS)
E(type='word', f=at('dive', 6.30), dur=DF['end'] - at('dive', 6.30) + 20, text='ВСЁ.', y=770, x=0, accent=0)
E(type='word', f=at('dive', 6.68), dur=DF['end'] - at('dive', 6.68) + 20, text='ХВАТИТ.', y=930, x=0, accent=1)
S('pop', at('dive', 6.30), 0.5); S('pop', at('dive', 6.68), 0.5)
E(type='zoomin', f=at('dive', 6.35), end=DF['start'], amt=0.12)
hit(DF['start'], 1.2)
E(type='leak', f=DF['start'], dur=50, hue=1)
S('powerdown', DF['start'] + 4, 0.6)
# --- РАЗГОН ---
S('whoosh', OU['start'] + 4, 0.8)
# --- ПОСЛЕ ---
E(type='label', f=AF['start'] + 10, dur=AF['end'] - AF['start'] - 10, text='ОН: ВСЁ', target='cam')
E(type='label', f=AF['start'] + 75, dur=AF['end'] - AF['start'] - 75, text='ОНА: ДАЖЕ НЕ ВСПОТЕЛА', target='game')
S('pop', AF['start'] + 10, 0.4); S('pop', AF['start'] + 75, 0.4)
fmin = AF['start'] + int(np.argmin(np.abs(SP[AF['start']:AF['end']])))
E(type='leak', f=fmin - 20, dur=50, hue=2); E(type='zoomin', f=fmin - 30, end=fmin + 30, amt=0.05)
# --- МАХ НОГОЙ (game_full) ---
S('whoosh', KI['start'] - 8, 0.8)
E(type='flash', f=KI['start'], dur=8, amt=0.5)
E(type='title', f=KI['start'] + 6, dur=KI['end'] - KI['start'] - 6, lines=['А ОНА ТОЛЬКО', 'РАЗОГРЕЛАСЬ'], accent=1, y=420)
fk = at('kick', 14.05)
E(type='punch', f=fk, amt=0.1); E(type='ca', f=fk, dur=8, amt=6); S('impact', fk, 0.45); E(type='leak', f=fk, dur=40, hue=0)
E(type='letterbox', f=KI['start'] + 10, dur=KI['end'] - KI['start'] - 10)
# --- ПРОБРОС ---
S('whoosh', SK['start'] + 6, 0.8)
E(type='glitch', f=SK['start'] + 10, dur=8)
# --- ФИНАЛ ---
E(type='stamina', f=HE['start'] + 12, end=HE['end'] - 30)
S('heal', HE['start'] + 12, 0.55, dur=(HE['end'] - 30 - HE['start'] - 12) / FPS)
S('chime', HE['end'] - 30, 0.6)
E(type='zoomin', f=HE['start'], end=HE['end'], amt=0.08)
E(type='whiteout', f=N - 7, dur=7)
S('impact', N - 6, 0.8); S('riser', N - 50, 0.4, dur=44 / FPS)

