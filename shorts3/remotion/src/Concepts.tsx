import React from 'react';
import {Easing, OffthreadVideo, Sequence, interpolate, spring} from 'remotion';
import type {Cfg} from './Edit';
import {FONT, NAVY} from './theme';
import {Stage, Shells, Splinters, CrownTree, Curtains, Flowers, House, Pad, OniMask, Vinyl, Weather, PirateCoin} from './Three3D';

// Per-video "seasoning": one concept each + the ONE editorial caption (punchline).
// Concept colours never reuse the subtitle emotion colours as text colour on purpose.
const GOLD = '#FFC83D';
const RED = '#E8322B';

type L = {from: string; to: string; p: number};
type P = {cfg: Cfg; t: number; fps: number; layout: L; video: string};

const popIn = (lf: number, fps: number) => {
	const s = spring({frame: lf, fps, config: {damping: 11, stiffness: 190, mass: 0.8}});
	return {s: interpolate(s, [0, 1], [0.5, 1]) * interpolate(lf, [0, 6, 14], [0.7, 1.08, 1], {extrapolateRight: 'clamp'}), o: Math.min(1, lf / 3)};
};
const plate: React.CSSProperties = {border: `7px solid ${NAVY}`, borderRadius: 26, boxShadow: `0 14px 0 ${NAVY}, 0 24px 40px rgba(11,21,48,0.55)`};
const txt = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT, fontWeight: 900, fontSize: size, color, lineHeight: 1.05, whiteSpace: 'nowrap', ...extra});
// card slot: game area under the subtitle line in split (subs at y 768)
const Slot: React.FC<{lf: number; fps: number; top?: number; children: React.ReactNode}> = ({lf, fps, top = 1000, children}) => {
	const {s, o} = popIn(lf, fps);
	return <div style={{position: 'absolute', left: 100, top, width: 820, transform: `scale(${s})`, opacity: o}}>{children}</div>;
};

// ---------------- v1: airport arrivals board ----------------
const FLAP = 'АБВГДЕЖЗИКЛМНОПРСТУФХ0123456789';
const Flap: React.FC<{text: string; lf: number; delay: number; size: number; color: string}> = ({text, lf, delay, size, color}) => (
	<div style={{display: 'flex', gap: 4}}>
		{text.split('').map((ch, i) => {
			const settle = delay + i * 1.6;
			const shown = ch === ' ' || lf >= settle ? ch : FLAP[Math.floor((lf * 3 + i * 7) % FLAP.length)];
			return (
				<div key={i} style={{width: size * 0.78, height: size * 1.25, background: ch === ' ' ? 'transparent' : '#1B2233', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: ch === ' ' ? 'none' : 'inset 0 -3px 0 rgba(0,0,0,0.5)'}}>
					<span style={txt(size, color)}>{lf < settle - 14 && ch !== ' ' ? '' : shown}</span>
					{ch === ' ' ? null : <div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(0,0,0,0.6)'}} />}
				</div>
			);
		})}
	</div>
);
const Airport: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	return (
		<Slot lf={lf} fps={fps}>
			<div style={{...plate, background: '#0E131F', padding: '24px 28px 28px'}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18}}>
					<svg width="54" height="54" viewBox="0 0 24 24"><path fill={GOLD} d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)" /></svg>
					<span style={txt(40, GOLD, {letterSpacing: '0.14em'})}>ПРИЛЁТ</span>
				</div>
				<Flap text="РЕЙС «БРАТАН»" lf={lf} delay={4} size={52} color="#F4F1E8" />
				<div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 18}}>
					<span style={txt(34, '#9AA3B8')}>статус</span>
					<div style={{opacity: lf > 30 ? 1 : 0, transform: `scale(${lf > 30 ? interpolate(lf, [30, 36, 42], [1.4, 0.95, 1], {extrapolateRight: 'clamp'}) : 1})`, background: '#21C55D', borderRadius: 12, padding: '8px 18px', border: `5px solid ${NAVY}`}}>
						<span style={txt(44, NAVY)}>ВОВРЕМЯ</span>
					</div>
				</div>
			</div>
		</Slot>
	);
};

// ---------------- v2: fairground shooting gallery ----------------
const Tir: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	const bear = spring({frame: lf - 10, fps, config: {damping: 9, stiffness: 160}});
	const B = '#A8672E';
	return (
		<Slot lf={lf} fps={fps}>
			<div style={{...plate, background: '#FFF6E6', overflow: 'hidden', padding: 0}}>
				<div style={{height: 64, background: `repeating-linear-gradient(90deg, ${RED} 0 68px, #FFFFFF 68px 136px)`, borderBottom: `6px solid ${NAVY}`}} />
				<div style={{display: 'flex', alignItems: 'center', padding: '22px 30px 28px', gap: 26}}>
					<div style={{flex: 1}}>
						<div style={txt(76, RED, {letterSpacing: '0.04em'})}>ТИР</div>
						<div style={txt(34, NAVY, {marginTop: 10})}>попаданий: 1 из 1</div>
						<div style={{marginTop: 16, background: NAVY, borderRadius: 14, padding: '12px 18px', display: 'inline-block'}}>
							<span style={txt(34, GOLD)}>приз — плюшевый мишка</span>
						</div>
					</div>
					<div style={{width: 150, height: 170, position: 'relative', transform: `scale(${bear}) rotate(${(1 - bear) * -25}deg)`, transformOrigin: '50% 100%'}}>
						{[[18, 6], [102, 6]].map(([x, y], i) => <div key={i} style={{position: 'absolute', left: x, top: y, width: 40, height: 40, borderRadius: 20, background: B, border: `5px solid ${NAVY}`}} />)}
						<div style={{position: 'absolute', left: 20, top: 16, width: 120, height: 104, borderRadius: 60, background: B, border: `5px solid ${NAVY}`}} />
						<div style={{position: 'absolute', left: 52, top: 66, width: 56, height: 40, borderRadius: 24, background: '#E9C79A'}} />
						<div style={{position: 'absolute', left: 70, top: 70, width: 20, height: 13, borderRadius: 8, background: NAVY}} />
						{[52, 96].map((x) => <div key={x} style={{position: 'absolute', left: x, top: 48, width: 13, height: 13, borderRadius: 7, background: NAVY}} />)}
						<div style={{position: 'absolute', left: 36, top: 112, width: 88, height: 58, borderRadius: '40px 40px 20px 20px', background: B, border: `5px solid ${NAVY}`}} />
					</div>
				</div>
			</div>
		</Slot>
	);
};

// ---------------- v3: tabloid front page (spinning newspaper) ----------------
const Tabloid: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	const p = interpolate(lf, [0, 20], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const settle = spring({frame: lf - 18, fps, config: {damping: 10, stiffness: 220}});
	return (
		<div style={{position: 'absolute', left: 100, top: 980, width: 820, transform: `scale(${p * (1 + 0.06 * (1 - settle))}) rotate(${(1 - p) * 540 - 3}deg)`, opacity: Math.min(1, lf / 2)}}>
			<div style={{...plate, background: '#F2EEE3', padding: '0 0 26px', overflow: 'hidden'}}>
				<div style={{background: RED, padding: '14px 26px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `6px solid ${NAVY}`}}>
					<span style={txt(70, '#FFFFFF', {fontStyle: 'italic', letterSpacing: '0.02em'})}>СЛУХИ</span>
					<span style={txt(22, '#FFFFFF')}>экстренный выпуск</span>
				</div>
				<div style={{padding: '18px 26px 0'}}>
					<div style={txt(40, RED)}>ПОДТВЕРДИЛОСЬ:</div>
					<div style={txt(52, NAVY, {marginTop: 10, whiteSpace: 'normal', lineHeight: 1.08})}>спокойная катка — без тебя</div>
					<div style={{marginTop: 16, height: 6, background: `repeating-linear-gradient(90deg, ${NAVY} 0 14px, transparent 14px 22px)`, opacity: 0.35}} />
				</div>
			</div>
		</div>
	);
};

// ---------------- v4: CCTV — bush camera + security log ----------------
const Cctv: React.FC<P> = ({cfg, t, fps}) => {
	const c = cfg.cctv as {t0: number; t1: number};
	const els: React.ReactNode[] = [];
	if (t >= c.t0 && t < c.t1) {
		const o = interpolate(t, [c.t0, c.t0 + 0.15, c.t1 - 0.1, c.t1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const sec = (t - c.t0 + 3.2).toFixed(2).padStart(5, '0');
		const corner = (x: number, y: number, r: number) => <div key={`${x}${y}`} style={{position: 'absolute', left: x, top: y, width: 70, height: 70, borderLeft: '7px solid #fff', borderTop: '7px solid #fff', transform: `rotate(${r}deg)`, opacity: 0.9}} />;
		els.push(
			<div key="cctv" style={{position: 'absolute', inset: 0, opacity: o}}>
				<div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 3px, transparent 3px 7px)', mixBlendMode: 'multiply'}} />
				<div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)'}} />
				{corner(60, 210, 0)}{corner(850, 210, 90)}{corner(60, 1450, -90)}{corner(850, 1450, 180)}
				<div style={{position: 'absolute', left: 150, top: 230, display: 'flex', alignItems: 'center', gap: 14}}>
					<div style={{width: 30, height: 30, borderRadius: 15, background: RED, opacity: Math.floor(t * 2.5) % 2 ? 1 : 0.25}} />
					<span style={txt(40, '#FFFFFF')}>REC</span>
				</div>
				<span style={{...txt(34, '#FFFFFF'), position: 'absolute', left: 150, top: 1400}}>CAM 02 · 00:00:{sec}</span>
			</div>,
		);
	}
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) {
		const lines: [string, string, string][] = [['объект', 'куст', '#F4F1E8'], ['маскировка', '100%', '#F4F1E8'], ['обнаружен', 'через 3 с', '#FF5A4E']];
		els.push(
			<Slot key="log" lf={lf} fps={fps}>
				<div style={{...plate, background: '#0E131F', padding: '22px 30px 26px'}}>
					<div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14}}>
						<div style={{width: 26, height: 26, borderRadius: 13, background: RED}} />
						<span style={txt(32, '#9AA3B8', {letterSpacing: '0.1em'})}>ОХРАНА · КАМЕРА 02</span>
					</div>
					{lines.map(([k, v, col], i) => {
						const a = lf - 8 - i * 9;
						return (
							<div key={k} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, opacity: a > 0 ? 1 : 0, transform: `translateX(${a > 0 ? interpolate(a, [0, 6], [-30, 0], {extrapolateRight: 'clamp'}) : 0}px)`}}>
								<span style={txt(40, '#9AA3B8')}>{k}:</span>
								<span style={txt(i === 2 ? 50 : 44, col)}>{v}</span>
							</div>
						);
					})}
				</div>
			</Slot>,
		);
	}
	return <>{els}</>;
};

// ---------------- v5: museum exhibit plaque ----------------
const Museum: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	const shine = interpolate(lf, [8, 40], [-300, 1100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<Slot lf={lf} fps={fps}>
			<div style={{...plate, background: 'linear-gradient(160deg, #EED9A4, #C9A45C)', padding: 12, overflow: 'hidden', position: 'relative'}}>
				<div style={{border: `4px solid ${NAVY}`, borderRadius: 14, padding: '20px 26px 24px', background: 'linear-gradient(160deg, #F3E3B8, #D8B873)'}}>
					<div style={txt(26, '#6B4A16', {letterSpacing: '0.12em'})}>ЗАЛ № 11 · КАМЕННЫЙ ВЕК</div>
					<div style={txt(80, NAVY, {marginTop: 12})}>РОГАТИНА</div>
					<div style={txt(34, '#6B4A16', {marginTop: 12})}>работает до сих пор</div>
				</div>
				<div style={{position: 'absolute', top: -40, left: shine, width: 90, height: 400, background: 'rgba(255,255,255,0.45)', transform: 'rotate(20deg)'}} />
			</div>
		</Slot>
	);
};

// ---------------- v6: "I'm not a robot" check ----------------
const Captcha: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	const x = interpolate(lf, [14, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const line = (r: number) => <div style={{position: 'absolute', left: 8, top: 33, width: 66 * x, height: 12, borderRadius: 6, background: RED, transform: `rotate(${r}deg)`, transformOrigin: '50% 50%', marginLeft: 33 * (1 - x)}} />;
	return (
		<Slot lf={lf} fps={fps}>
			<div style={{...plate, background: '#FFFFFF', padding: '28px 30px'}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 26}}>
					<div style={{width: 82, height: 82, border: '6px solid #B9C0CC', borderRadius: 10, position: 'relative', flexShrink: 0}}>
						{line(45)}{line(-45)}
					</div>
					<span style={txt(58, NAVY)}>Я не бот</span>
				</div>
				<div style={{marginTop: 20, background: '#FFE3E1', borderRadius: 14, padding: '12px 18px', display: 'inline-block', opacity: x}}>
					<span style={txt(32, RED)}>проверку не прошли: 2 из 2</span>
				</div>
			</div>
		</Slot>
	);
};

// ---------------- v7: swear jar (coin per mat) + one card ----------------
const Jar: React.FC<P> = ({cfg, t, fps}) => {
	const mats = cfg.words.filter((w) => w.flags.includes('mat')).map((w) => w.s);
	const n = mats.filter((s) => t >= s).length;
	const last = n ? mats[n - 1] : -9;
	const bump = interpolate((t - last) * fps, [0, 4, 14], [1.18, 0.96, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const els: React.ReactNode[] = [];
	const jo = interpolate(t, [mats[0] - 0.4, mats[0] - 0.1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	els.push(
		<div key="jar" style={{position: 'absolute', left: 40, top: 210, width: 170, opacity: jo, transform: `scale(${bump})`, transformOrigin: '50% 100%'}}>
			{/* falling coin for the latest mat */}
			{t - last < 0.35 ? <div style={{position: 'absolute', left: 64, top: interpolate(t - last, [0, 0.3], [-90, 60], {extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)}), width: 42, height: 42, borderRadius: 21, background: GOLD, border: `5px solid ${NAVY}`, zIndex: 2}} /> : null}
			<div style={{margin: '0 auto', width: 96, height: 22, background: '#C9CED8', border: `5px solid ${NAVY}`, borderRadius: 8}} />
			<div style={{position: 'relative', height: 170, marginTop: -4, border: `6px solid ${NAVY}`, borderRadius: '26px 26px 34px 34px', background: 'rgba(200,230,255,0.35)', overflow: 'hidden', boxShadow: `0 10px 0 ${NAVY}`}}>
				{Array.from({length: n}).map((_, i) => <div key={i} style={{position: 'absolute', left: 18 + ((i * 37) % 100), bottom: 6 + Math.floor(i / 3) * 16, width: 40, height: 16, borderRadius: 8, background: GOLD, border: `4px solid ${NAVY}`}} />)}
				<div style={{position: 'absolute', left: 0, right: 0, top: 22, textAlign: 'center'}}>
					<span style={txt(40, '#FFFFFF', {WebkitTextStroke: `10px ${NAVY}`, paintOrder: 'stroke fill'})}>{n * 50} ₽</span>
				</div>
			</div>
		</div>,
	);
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) {
		els.push(
			<Slot key="card" lf={lf} fps={fps}>
				<div style={{...plate, background: '#FFF6E6', padding: '24px 30px 28px'}}>
					<div style={txt(30, '#8A6A2A', {letterSpacing: '0.12em'})}>КОПИЛКА ЗА МАТ</div>
					<div style={{display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 14}}>
						<span style={txt(62, NAVY)}>«говно»</span>
						<span style={txt(40, NAVY)}>—</span>
					</div>
					<div style={{marginTop: 12, background: '#21C55D', borderRadius: 14, padding: '10px 18px', display: 'inline-block', border: `5px solid ${NAVY}`}}>
						<span style={txt(44, NAVY)}>бесплатно</span>
					</div>
				</div>
			</Slot>,
		);
	}
	return <>{els}</>;
};

// ---------------- v8: right mouse button + loading-screen tip ----------------
const Tip: React.FC<P> = ({cfg, t, fps}) => {
	const m = cfg.mouse as {t0: number; t1: number};
	const els: React.ReactNode[] = [];
	if (t >= m.t0 && t < m.t1) {
		const lf = (t - m.t0) * fps;
		const o = interpolate(t, [m.t1 - 0.2, m.t1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const press = Math.sin(t * Math.PI * 4) > 0;
		els.push(
			<div key="mouse" style={{position: 'absolute', left: 70, top: 900, opacity: o * Math.min(1, lf / 3), transform: `scale(${popIn(lf, fps).s})`}}>
				<div style={{width: 150, height: 220, borderRadius: '75px 75px 70px 70px', background: '#F4F1E8', border: `7px solid ${NAVY}`, position: 'relative', overflow: 'hidden', boxShadow: `0 12px 0 ${NAVY}`}}>
					<div style={{position: 'absolute', left: 68, top: 0, width: 7, height: 92, background: NAVY}} />
					<div style={{position: 'absolute', left: 0, right: 0, top: 88, height: 7, background: NAVY}} />
					<div style={{position: 'absolute', left: 75, top: 0, width: 75, height: 88, background: press ? GOLD : '#FFE7A0'}} />
				</div>
			</div>,
		);
	}
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) {
		els.push(
			<Slot key="tip" lf={lf} fps={fps}>
				<div style={{...plate, background: 'linear-gradient(135deg, #1F4FD8, #5B2BC8)', padding: '24px 30px 28px'}}>
					<div style={{background: GOLD, borderRadius: 10, padding: '6px 14px', display: 'inline-block', border: `4px solid ${NAVY}`}}>
						<span style={txt(30, NAVY, {letterSpacing: '0.12em'})}>СОВЕТ</span>
					</div>
					<div style={txt(42, '#FFFFFF', {marginTop: 16})}>сундук не открывается?</div>
					<div style={txt(42, GOLD, {marginTop: 10})}>зажмите правую клавишу</div>
				</div>
			</Slot>,
		);
	}
	return <>{els}</>;
};

// ---------------- v9–v12: 3D props + outlined caption (no plates) ----------------
const lerpN = (a: number, b: number, q: number) => a + (b - a) * q;
const strokeS = {WebkitTextStroke: `9px ${NAVY}`, paintOrder: 'stroke fill', textShadow: `0 5px 0 ${NAVY}`} as React.CSSProperties;
const stroke = {WebkitTextStroke: `8px ${NAVY}`, paintOrder: 'stroke fill', textShadow: `0 5px 0 ${NAVY}`} as React.CSSProperties;
// caption block centred on the non-safe-zone width (0–918), lines pop in one after another
const Cap: React.FC<{lf: number; fps: number; top: number; lines: [string, number, string][]; step?: number}> = ({lf, fps, top, lines, step = 6}) => (
	<div style={{position: 'absolute', left: 30, width: 858, top, textAlign: 'center'}}>
		{lines.map(([text, size, color], i) => {
			const l = lf - i * step;
			if (l < 0) return <div key={i} style={{height: size * 1.32}} />;
			const {s: sc, o} = popIn(l, fps);
			return <div key={i} style={{...txt(size, color, stroke), lineHeight: 1.32, transform: `scale(${sc})`, opacity: o}}>{text}</div>;
		})}
	</div>
);

// v9 — boss fight: countdown to the "boss", boss HP bar chipped by his own shots, slow replay, crowned winner
const Boss: React.FC<P> = ({cfg, t, fps, layout, video}) => {
	const B = cfg.boss as {t: number; hits: number[]; death: number; at: [number, number]; replay: [number, number, number, number]};
	const els: React.ReactNode[] = [];
	const gameFull = layout.to === 'game_full' && layout.p > 0.6;
	// 1) countdown chip: open loop from the first frame
	if (t < B.t + 0.5) {
		const left = Math.max(0, B.t - t);
		const hot = left < 3;
		const pulse = hot ? 1 + 0.08 * Math.max(0, Math.cos((left % 1) * Math.PI * 2)) : 1;
		const o = interpolate(t, [B.t, B.t + 0.5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const sec = Math.floor(left);
		const cs = Math.floor((left - sec) * 10);
		els.push(
			<div key="cd" style={{position: 'absolute', left: 60, top: 205, opacity: o, transform: `scale(${pulse})`, transformOrigin: '0 50%', display: 'flex', alignItems: 'center', gap: 16, background: hot ? RED : 'rgba(11,21,48,0.82)', border: `5px solid ${NAVY}`, borderRadius: 18, padding: '10px 20px', boxShadow: `0 8px 0 ${NAVY}`}}>
				<span style={txt(26, hot ? '#FFFFFF' : '#FFD23F', {letterSpacing: '0.12em'})}>ДО БОССА</span>
				<span style={{...txt(54, '#FFFFFF'), display: 'flex'}}>
					{`0${sec}`.slice(-2).split('').concat([',', String(cs)]).map((c, i) => <span key={i} style={{width: c === ',' ? 18 : 40, textAlign: 'center'}}>{c}</span>)}
				</span>
			</div>,
		);
	}
	// 2) boss bar from the intro until the cut to the webcam
	if (t >= B.t && t < 11.2) {
		const lf = (t - B.t) * fps;
		const hp = 100 - B.hits.filter((h) => t >= h).length;
		const lastHit = [...B.hits].reverse().find((h) => t >= h) ?? -9;
		const hf = (t - lastHit) * fps;
		const slide = interpolate(spring({frame: lf, fps, config: {damping: 14, stiffness: 150}}), [0, 1], [60, 0]);
		els.push(
			<div key="bar" style={{position: 'absolute', left: 70, top: 1300 + slide, width: 780, opacity: Math.min(1, lf / 6)}}>
				<div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
					<div>
						<div style={txt(26, '#FFD23F', {...strokeS, letterSpacing: '0.16em'})}>БОСС ЛОКАЦИИ</div>
						<div style={txt(64, '#FFFFFF', strokeS)}>ДЕРЕВО</div>
					</div>
					<div style={txt(44, '#FFFFFF', {...strokeS, transform: `scale(${hf < 8 ? 1.25 - hf * 0.03 : 1})`})}>{hp}%</div>
				</div>
				<div style={{marginTop: 10, height: 30, borderRadius: 8, border: `5px solid ${NAVY}`, background: '#2A0D12', overflow: 'hidden', position: 'relative', boxShadow: `0 6px 0 ${NAVY}`}}>
					<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${hp}%`, background: 'linear-gradient(#FF5A4E, #B3121B)'}} />
					{hf < 10 ? <div style={{position: 'absolute', left: `${hp}%`, top: 0, bottom: 0, width: '1.2%', background: '#FFFFFF', opacity: 1 - hf / 10}} /> : null}
				</div>
			</div>,
		);
	}
	// 3) splinters fly off the tree on every one of his shots (game_full only)
	if (gameFull && t >= B.hits[0] && t < B.death + 0.6) els.push(<Stage key="spl"><Splinters t={t} fps={fps} hits={B.hits} at={B.at} /></Stage>);
	// 4) slow replay with telestrator over the dead lobby time
	const [r0, rSrc, rate, rDur] = B.replay;
	if (t >= r0 - 0.2 && t < r0 + rDur + 0.2) {
		const lf = (t - r0) * fps;
		const sIn = interpolate(lf, [-12, 0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
		const sOut = interpolate(t, [r0 + rDur, r0 + rDur + 0.2], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const srcT = rSrc + Math.max(0, t - r0) * rate;
		const W = 800, H = 640, SX = 0, SY = 604, SW = 918, SH = 734, k = W / SW;
		const tree: [number, number] = [(540 - SX) * k, (900 - SY) * k];
		const enemy: [number, number] = [(200 - SX) * k, (1140 - SY) * k];
		const circ = (c: [number, number], r: number, col: string, from: number) => {
			const q = interpolate(srcT, [from, from + 0.12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
			return q > 0 ? <circle cx={c[0]} cy={c[1]} r={r} fill="none" stroke={col} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${q * 2 * Math.PI * r} 9999`} transform={`rotate(-90 ${c[0]} ${c[1]})`} /> : null;
		};
		els.push(
			<div key="rp" style={{position: 'absolute', left: 60, top: 820, width: W, height: H, transform: `scale(${sIn * sOut})`, borderRadius: 26, overflow: 'hidden', border: `7px solid ${NAVY}`, boxShadow: `0 14px 0 ${NAVY}`}}>
				<Sequence from={Math.round(r0 * fps)} layout="none">
					<OffthreadVideo src={video} muted startFrom={Math.round(rSrc * fps)} playbackRate={rate} style={{position: 'absolute', left: -SX * k, top: -SY * k, width: 918 * k, height: 1632 * k, maxWidth: 'none', filter: 'saturate(0.85) contrast(1.1)'}} />
				</Sequence>
				<svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
					{B.hits.map((h, i) => (srcT >= h && srcT < h + 0.25 ? <line key={i} x1={150} y1={H} x2={tree[0] + (i % 3) * 14 - 14} y2={tree[1] + (i % 2) * 20} stroke="#FFD23F" strokeWidth={6} strokeDasharray="18 14" /> : null))}
					{circ(tree, 70, '#FFD23F', B.hits[0])}
					{circ(enemy, 64, '#FF3B3B', B.death - 0.15)}
				</svg>
				<div style={{position: 'absolute', left: 18, top: 16, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(11,21,48,0.85)', borderRadius: 12, padding: '6px 14px'}}>
					<div style={{width: 18, height: 18, borderRadius: 9, background: RED, opacity: Math.floor(t * 3) % 2 ? 1 : 0.3}} />
					<span style={txt(28, '#FFFFFF')}>ПОВТОР ×{rate}</span>
				</div>
			</div>,
		);
	}
	// 5) punchline: the crowned boss + its HP
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) {
		els.push(<Stage key="ct"><CrownTree lf={lf} fps={fps} at={[459, 1050]} /></Stage>);
		els.push(<Cap key="cap" lf={lf - 16} fps={fps} top={1250} lines={[['ДЕРЕВО — HP 95%', 58, '#7CFF6B'], ['босс не побеждён', 40, '#FFFFFF']]} step={8} />);
	}
	return <>{els}</>;
};

const Ammo: React.FC<P> = ({cfg, t, fps}) => {
	const shots = cfg.shots as number[];
	const n = shots.filter((s) => t >= s).length;
	if (n === 0) return null;
	const lf = (t - cfg.punch.t) * fps;
	// the row lives at the top while he shoots (game_full), drops into the game area for the card (split)
	const rowY = interpolate(lf, [0, 12], [330, 1060], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
	const last = shots[n - 1];
	const bump = interpolate((t - last) * fps, [0, 3, 10], [1.25, 0.95, 1], {extrapolateRight: 'clamp'});
	return (
		<>
			<Stage><Shells t={t} fps={fps} shots={shots} promised={3} rowY={rowY} /></Stage>
			{lf < 0 ? (
				<div style={{position: 'absolute', left: 0, width: 918, top: 440, textAlign: 'center', transform: `scale(${bump})`}}>
					<span style={txt(84, n > 3 ? '#FF3B3B' : '#FFFFFF', stroke)}>{n}</span>
					<span style={txt(52, '#FFFFFF', stroke)}> / 3</span>
				</div>
			) : (
				<Cap lf={lf - 8} fps={fps} top={1250} lines={[['обещано 3 · потрачено 7', 44, '#FFFFFF'], ['посажено: 0', 76, '#FF3B3B']]} step={8} />
			)}
		</>
	);
};

// v11 — a play in three acts: curtains open, spotlight + act badge per knock, finale with flowers, curtains close (loop)
const ROMAN = ['I', 'II', 'III', 'IV'];
const Theatre: React.FC<P> = ({cfg, t, fps, layout}) => {
	const T = cfg.theatre as {acts: number[]; finale: number; close: number; spot: [number, number]};
	const els: React.ReactNode[] = [];
	const open = Math.min(interpolate(t, [0.05, 1.0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)}), interpolate(t, [T.close, cfg.dur - 0.02], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)}));
	const gameFull = layout.to === 'game_full' && layout.p > 0.6;
	// spotlight on each knock (dim the house, cone from the top)
	const act = T.acts.filter((a) => t >= a).length;
	const lastAct = act ? T.acts[act - 1] : -9;
	const sl = (t - lastAct) * fps;
	if (act && sl < 78 && gameFull) {
		const o = interpolate(sl, [0, 4, 60, 78], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
		const [sx, sy] = T.spot;
		els.push(
			<div key="spot" style={{position: 'absolute', inset: 0, opacity: o}}>
				<div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${sx}px ${sy}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 170px, rgba(5,8,25,0.72) 330px)`}} />
				<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'screen'}}>
					<defs>
						<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3C4" stopOpacity="0.85" /><stop offset="1" stopColor="#FFD27A" stopOpacity="0.15" /></linearGradient>
					</defs>
					<polygon points={`${sx - 40},-40 ${sx + 40},-40 ${sx + 190},${sy + 60} ${sx - 190},${sy + 60}`} fill="url(#beam)" />
					<ellipse cx={sx} cy={sy + 60} rx={200} ry={46} fill="#FFF3C4" opacity={0.35} />
				</svg>
			</div>,
		);
	}
	// act badge: stays on screen, flips to the next act on every knock, "ФИНАЛ" at the triple elimination
	if (act && t < cfg.punch.t) {
		const fin = t >= T.finale;
		const key = fin ? 'F' : String(act);
		const from = fin ? T.finale : lastAct;
		const flip = interpolate((t - from) * fps, [0, 8], [90, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
		els.push(
			<div key={`act${key}`} style={{position: 'absolute', left: 60, top: 205, perspective: 600}}>
				<div style={{transform: `rotateX(${flip}deg)`, background: 'linear-gradient(#8E1024, #5E0716)', border: `5px solid ${GOLD}`, outline: `5px solid ${NAVY}`, borderRadius: 60, padding: '8px 30px', display: 'flex', alignItems: 'baseline', gap: 14, boxShadow: `0 10px 0 ${NAVY}`}}>
					{fin ? <span style={txt(46, GOLD)}>ФИНАЛ</span> : <><span style={txt(28, '#F4D9A0', {letterSpacing: '0.14em'})}>АКТ</span><span style={txt(58, GOLD)}>{ROMAN[act - 1]}</span></>}
				</div>
			</div>,
		);
	}
	// finale: three sweeping spots + flowers
	const fl = (t - T.finale) * fps;
	if (fl >= 0 && fl < 100) {
		const o = interpolate(fl, [0, 6, 80, 100], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
		els.push(
			<svg key="sweep" width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'screen', opacity: o}}>
				{[0, 1, 2].map((i) => {
					const bx = 540 + Math.sin(fl / 14 + i * 2.1) * 360;
					return <polygon key={i} points={`${180 + i * 360 - 30},-40 ${180 + i * 360 + 30},-40 ${bx + 150},1500 ${bx - 150},1500`} fill={['#FFF3C4', '#FFC2D1', '#C9F0FF'][i]} opacity={0.32} />;
				})}
			</svg>,
		);
	}
	if (fl >= 0 && fl < 260) els.push(<Stage key="fl"><Flowers lf={fl} n={26} /></Stage>);
	if (open < 0.999) els.push(<Stage key="cur"><Curtains open={open} /></Stage>);
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0 && t < T.close + 0.3) els.push(<Cap key="cap" lf={lf} fps={fps} top={1200} lines={[['СПЕКТАКЛЬ ОКОНЧЕН', 54, '#FFC83D'], ['труппа — в лобби', 44, '#FFFFFF']]} step={9} />);
	return <>{els}</>;
};

// v12 — «трое в доме»: house counter + horror beat after the line + CoD-style hitmarkers on every hit
const HouseCount: React.FC<P> = ({cfg, t, fps, layout}) => {
	const H = cfg.house as {in: number; out: number[]; extra: number; pad: number; padShake: number; horror: [number, number]; scare: number; hits: number[]; kills: number[]};
	const lf = (t - cfg.punch.t) * fps;
	const mv = interpolate(lf, [0, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
	let at: [number, number] = [lerpN(205, 459, mv), lerpN(360, 1040, mv)];
	let sc = lerpN(0.62, 1.05, mv);
	const [h0, h1] = H.horror;
	const inH = t >= h0 && t < h1;
	let scary = 0;
	if (inH) {
		scary = 1;
		// slow creep towards the centre, then the jump-scare lunge at `scare`
		const creep = interpolate(t, [h0, H.scare], [0, 1], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
		const lunge = interpolate(t, [H.scare, H.scare + 0.12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
		at = [lerpN(205, 540, creep), lerpN(360, 1010, creep)];
		sc = lerpN(0.62, 1.1, creep) + lunge * 3.2;
	}
	const pf = (t - H.pad) * fps;
	const away = interpolate(pf, [0, 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
	const els: React.ReactNode[] = [];
	const hz: React.ReactNode[] = [];
	// horror overlay: cold tint, heavy vignette, flicker, red pulse on the heartbeat
	if (inH) {
		const k = (t - h0) * fps;
		const flick = (Math.sin(k * 2.7) + Math.sin(k * 7.3) > 1.3) || (k > 8 && k < 11) ? 0.55 : 0;
		const beat = Math.max(0, Math.cos(((t - h0) / 0.62) * Math.PI * 2)) ** 6;
		const o = interpolate(t, [h0, h0 + 0.08, h1 - 0.1, h1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		hz.push(
			<div key="hz" style={{position: 'absolute', inset: 0, opacity: o}}>
				<div style={{position: 'absolute', inset: 0, background: 'rgba(10,30,25,0.35)', mixBlendMode: 'multiply'}} />
				<div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 22%, rgba(0,0,0,0.92) 78%)`}} />
				<div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 40%, rgba(160,0,0,${0.45 * beat}) 100%)`}} />
				<div style={{position: 'absolute', inset: 0, background: '#000', opacity: flick}} />
				<div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, rgba(0,0,0,0) 2px 5px)'}} />
			</div>,
		);
	}
	if (away > 0.01) els.push(<Stage key="h"><House t={t} fps={fps} out={H.out} extra={H.extra} at={[at[0] + (1 - away) * 520, at[1]]} scale={sc * away} inAt={H.in} scary={scary} /></Stage>);
	els.push(...hz);
	if (pf >= 0) els.push(<Stage key="pad"><Pad lf={pf} fps={fps} at={[459, 1050]} shake={t >= H.padShake && t < H.padShake + 0.6 ? 1 : 0} /></Stage>);
	if (t >= H.in + 0.2 && lf < 0 && !inH) {
		const n = 3 - H.out.filter((o) => t >= o).length - (t >= H.extra ? 1 : 0);
		const last = [...H.out, H.extra].filter((o) => t >= o).sort((a2, b2) => b2 - a2)[0] ?? H.in;
		const bmp = interpolate((t - last) * fps, [0, 4, 12], [1.3, 0.95, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const neg = n < 0;
		els.push(
			<div key="n" style={{position: 'absolute', left: 50, top: 505, transform: `scale(${bmp}) rotate(${neg ? Math.sin(t * 40) * 3 : 0}deg)`, transformOrigin: '0 50%', display: 'flex', alignItems: 'baseline', gap: 12}}>
				<span style={txt(30, '#FFFFFF', strokeS)}>В ДОМЕ:</span>
				<span style={txt(66, neg ? '#FF3B3B' : n === 0 ? '#7CFF6B' : '#FFFFFF', strokeS)}>{neg ? `−${-n}` : n}</span>
			</div>,
		);
	}
	// CoD-style hitmarkers at the crosshair: white X per hit, bigger red X on knocks/kills
	const XH: Record<string, [number, number]> = {game_full: [550, 908], split: [540, 1340], cam_full: [540, 1650]};
	const xa = XH[layout.from], xb = XH[layout.to];
	const cx = lerpN(xa[0], xb[0], layout.p), cy = lerpN(xa[1], xb[1], layout.p);
	for (const [list, kill] of [[H.hits, false], [H.kills, true]] as [number[], boolean][]) {
		for (const h of list) {
			const k = (t - h) * fps;
			if (k < 0 || k > (kill ? 16 : 9)) continue;
			const p = kill ? interpolate(k, [0, 3, 16], [1.5, 1.0, 1.1]) : interpolate(k, [0, 2, 9], [1.35, 1, 1]);
			const o = interpolate(k, kill ? [10, 16] : [5, 9], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
			const col = kill ? '#FF2A2A' : '#FFFFFF';
			const gap = kill ? 22 : 16, len = kill ? 40 : 28, w = kill ? 9 : 6;
			els.push(
				<svg key={`hm${h}`} width={240} height={240} style={{position: 'absolute', left: cx - 120, top: cy - 120, opacity: o, transform: `scale(${p})`, filter: `drop-shadow(0 0 3px rgba(0,0,0,0.9))`}}>
					{[45, 135, 225, 315].map((a2) => {
						const r = (a2 * Math.PI) / 180;
						return <line key={a2} x1={120 + Math.cos(r) * gap} y1={120 + Math.sin(r) * gap} x2={120 + Math.cos(r) * (gap + len)} y2={120 + Math.sin(r) * (gap + len)} stroke={col} strokeWidth={w} strokeLinecap="square" />;
					})}
				</svg>,
			);
		}
	}
	if (lf >= 0) els.push(<Cap key="cap" lf={lf - 12} fps={fps} top={1265} lines={[['«трое в доме»', 44, '#FFFFFF'], ['их было ЧЕТВЕРО', 64, '#FF3B3B']]} step={9} />);
	return <>{els}</>;
};
// ---------------- shared live tools (v13+) ----------------
const XHAIR: Record<string, [number, number]> = {game_full: [550, 908], split: [540, 1340], cam_full: [540, 1650]};
const hitMarks = (t: number, fps: number, layout: L, hits: number[], kills: number[]) => {
	const xa = XHAIR[layout.from], xb = XHAIR[layout.to];
	const cx = lerpN(xa[0], xb[0], layout.p), cy = lerpN(xa[1], xb[1], layout.p);
	const out: React.ReactNode[] = [];
	for (const [list, kill] of [[hits, false], [kills, true]] as [number[], boolean][]) {
		for (const h of list) {
			const k = (t - h) * fps;
			if (k < 0 || k > (kill ? 16 : 9)) continue;
			const p = kill ? interpolate(k, [0, 3, 16], [1.5, 1.0, 1.1]) : interpolate(k, [0, 2, 9], [1.35, 1, 1]);
			const o = interpolate(k, kill ? [10, 16] : [5, 9], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
			const col = kill ? '#FF2A2A' : '#FFFFFF';
			const gap = kill ? 22 : 16, len = kill ? 40 : 28, w = kill ? 9 : 6;
			out.push(
				<svg key={`hm${h}`} width={240} height={240} style={{position: 'absolute', left: cx - 120, top: cy - 120, opacity: o, transform: `scale(${p})`, filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.9))'}}>
					{[45, 135, 225, 315].map((a2) => {
						const r = (a2 * Math.PI) / 180;
						return <line key={a2} x1={120 + Math.cos(r) * gap} y1={120 + Math.sin(r) * gap} x2={120 + Math.cos(r) * (gap + len)} y2={120 + Math.sin(r) * (gap + len)} stroke={col} strokeWidth={w} strokeLinecap="square" />;
					})}
				</svg>,
			);
		}
	}
	return out;
};
// slow replay picture-in-picture over the game area; `tag` and `over` decide the label and drawn overlay
const ReplayPip: React.FC<{t: number; fps: number; video: string; r0: number; rSrc: number; rate: number; rDur: number; h: number; tag: (srcT: number) => [string, string]; over?: (srcT: number, k: number) => React.ReactNode}> = ({t, fps, video, r0, rSrc, rate, rDur, h, tag, over}) => {
	if (t < r0 - 0.2 || t >= r0 + rDur + 0.2) return null;
	const lf = (t - r0) * fps;
	const sIn = interpolate(lf, [-12, 0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
	const sOut = interpolate(t, [r0 + rDur, r0 + rDur + 0.2], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const srcT = rSrc + Math.max(0, t - r0) * rate;
	const W = 800, k = W / 918, SY = 604;
	const [label, col] = tag(srcT);
	return (
		<div style={{position: 'absolute', left: 60, top: 830, width: W, height: h, transform: `scale(${sIn * sOut})`, borderRadius: 26, overflow: 'hidden', border: `7px solid ${NAVY}`, boxShadow: `0 14px 0 ${NAVY}`}}>
			<Sequence from={Math.round(r0 * fps)} layout="none">
				<OffthreadVideo src={video} muted startFrom={Math.round(rSrc * fps)} playbackRate={rate} style={{position: 'absolute', left: 0, top: -SY * k, width: 918 * k, height: 1632 * k, maxWidth: 'none', filter: 'contrast(1.08)'}} />
			</Sequence>
			{over ? over(srcT, k) : null}
			<div style={{position: 'absolute', left: 18, top: 16, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(11,21,48,0.85)', borderRadius: 12, padding: '6px 14px'}}>
				<div style={{width: 18, height: 18, borderRadius: 9, background: col, opacity: Math.floor(t * 3) % 2 ? 1 : 0.3}} />
				<span style={txt(28, '#FFFFFF')}>{label}</span>
			</div>
		</div>
	);
};

// v13 — «раньше было лучше»: the past plays as a VHS tape (rewind → PLAY), masks in 3D, STOP → back to LIVE
const Vhs: React.FC<P> = ({cfg, t, fps, layout}) => {
	const V = cfg.vhs as {on: number; off: number; masks: [number, number]; maskOut: number; hits: number[]};
	const els: React.ReactNode[] = [];
	const inTape = t >= V.on && t < V.off;
	if (inTape) {
		const k = (t - V.on) * fps;
		const rew = k < 22;
		const band = ((t - V.on) * 0.35) % 1.3 - 0.15;
		els.push(
			<div key="vhs" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
				<div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 2px, rgba(0,0,0,0) 2px 4px)'}} />
				<div style={{position: 'absolute', left: 0, right: 0, top: `${band * 100}%`, height: 60, background: 'linear-gradient(rgba(255,255,255,0), rgba(255,255,255,0.16), rgba(255,255,255,0))', transform: `translateX(${Math.sin(t * 50) * 8}px)`}} />
				{rew ? <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 3px, rgba(0,0,0,0) 3px 23px)', transform: `translateY(${(k * 37) % 23}px)`}} /> : null}
				<div style={{position: 'absolute', left: 60, top: 205, ...txt(52, '#FFFFFF', {textShadow: '3px 0 0 rgba(255,0,60,0.7), -3px 0 0 rgba(0,200,255,0.7)'})}}>{rew ? '◀◀ REW' : Math.floor(t * 2) % 2 ? 'PLAY ▶' : 'PLAY'}</div>
				<div style={{position: 'absolute', left: 60, top: 1440, ...txt(34, '#FFFFFF', {textShadow: '3px 0 0 rgba(255,0,60,0.7), -3px 0 0 rgba(0,200,255,0.7)'})}}>РАНЬШЕ · 0:{`0${Math.floor((t - V.on) / 60)}`.slice(-2)}:{`0${Math.floor(t - V.on) % 60}`.slice(-2)}</div>
			</div>,
		);
	}
	const sk = (t - V.off) * fps;
	if (sk >= 0 && sk < 16) {
		els.push(
			<div key="stop" style={{position: 'absolute', inset: 0, background: `repeating-linear-gradient(${(sk * 47) % 180}deg, #777 0 2px, #222 2px 4px)`, opacity: interpolate(sk, [0, 12, 16], [0.9, 0.6, 0])}}>
				<div style={{position: 'absolute', left: 60, top: 205, ...txt(52, '#FFFFFF')}}>■ STOP</div>
			</div>,
		);
	}
	if (t >= V.off + 0.25) {
		els.push(
			<div key="live" style={{position: 'absolute', left: 60, top: 205, display: 'flex', alignItems: 'center', gap: 12, background: RED, border: `5px solid ${NAVY}`, borderRadius: 14, padding: '6px 18px', boxShadow: `0 6px 0 ${NAVY}`}}>
				<div style={{width: 18, height: 18, borderRadius: 9, background: '#FFFFFF', opacity: Math.floor(t * 2.5) % 2 ? 1 : 0.35}} />
				<span style={txt(34, '#FFFFFF')}>СЕЙЧАС</span>
			</div>,
		);
	}
	const ml = (t - V.masks[0]) * fps;
	if (ml >= 0 && t < V.maskOut + 0.3) {
		const outS = interpolate(t, [V.maskOut, V.maskOut + 0.3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		els.push(<Stage key="mask"><OniMask lf={ml} fps={fps} at={[459, 1180]} flip={(V.masks[1] - V.masks[0]) * fps} scale={0.85 * outS} /></Stage>);
	}
	els.push(...hitMarks(t, fps, layout, V.hits, []));
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) els.push(<Cap key="cap" lf={lf} fps={fps} top={1180} lines={[['РАНЬШЕ: маски-х*****', 48, '#FFD23F'], ['СЕЙЧАС: предметы — говно', 46, '#FFFFFF']]} step={10} />);
	return <>{els}</>;
};

// v14 — gacha reveal: rarity meter climbs during the chest animation, crashes on «джем-трек»; replay "ожидание/реальность"
const TIERS: [string, string][] = [['обычный', '#9AA3B8'], ['редкий', '#3A8DFF'], ['эпический', '#A24BFF'], ['легендарный', '#FFB020'], ['ПИРАТСКИЙ ЖЕТОН?!', '#FFD23F']];
const Gacha: React.FC<P> = ({cfg, t, fps, video}) => {
	const G = cfg.gacha as {start: number; peak: number; crash: number; vinyl: number; vinylOut: number; chest: [number, number]; replay: [number, number, number, number]};
	const els: React.ReactNode[] = [];
	if (t >= G.start && t < G.vinylOut + 0.5) {
		const rise = interpolate(t, [G.start, G.peak], [0.05, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
		const crash = interpolate(t, [G.crash, G.crash + 0.35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
		const v = rise * (1 - crash * 0.97);
		const tier = crash > 0.5 ? (['ДЖЕМ-ТРЕК', '#6B6656'] as [string, string]) : TIERS[Math.min(4, Math.floor(v * 4.999))];
		const shake = t < G.crash && rise > 0.8 ? Math.sin(t * 90) * 4 : 0;
		const o = interpolate(t, [G.vinylOut, G.vinylOut + 0.5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		els.push(
			<div key="m" style={{position: 'absolute', left: 60, top: 205, width: 620, opacity: o, transform: `translate(${shake}px, ${shake * 0.6}px)`}}>
				<div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
					<span style={txt(28, '#FFFFFF', strokeS)}>РЕДКОСТЬ:</span>
					<span style={txt(44, tier[1], {...strokeS, transform: crash > 0.5 ? `rotate(${Math.sin(t * 6) * 2}deg)` : undefined})}>{tier[0]}</span>
				</div>
				<div style={{marginTop: 10, height: 34, borderRadius: 10, border: `5px solid ${NAVY}`, background: '#1A1F2E', overflow: 'hidden', position: 'relative', boxShadow: `0 6px 0 ${NAVY}`}}>
					<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v * 100}%`, background: crash > 0.5 ? '#6B6656' : `linear-gradient(90deg, #9AA3B8, #3DBA4E 30%, #3A8DFF 55%, #A24BFF 75%, #FFB020)`}} />
				</div>
			</div>,
		);
	}
	// golden rays during the climax of the chest animation
	const rl = (t - (G.peak - 0.7)) * fps;
	if (rl >= 0 && t < G.crash + 0.1) {
		const o = interpolate(rl, [0, 10], [0, 0.75], {extrapolateRight: 'clamp'}) * interpolate(t, [G.crash - 0.05, G.crash + 0.1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		els.push(<div key="rays" style={{position: 'absolute', left: G.chest[0] - 900, top: G.chest[1] - 900, width: 1800, height: 1800, opacity: o, mixBlendMode: 'screen', background: `repeating-conic-gradient(from ${rl * 2}deg, rgba(255,200,60,0.55) 0deg 8deg, rgba(255,200,60,0) 8deg 22deg)`, WebkitMaskImage: 'radial-gradient(circle, #000 10%, transparent 60%)'}} />);
	}
	// the hoped-for pirate token rises over the chest, then drops away on the crash
	const cl = (t - (G.peak - 0.6)) * fps;
	if (cl >= 0 && t < G.crash + 0.7) els.push(<Stage key="coin"><PirateCoin lf={cl} fps={fps} at={[540, 560]} drop={(G.crash - (G.peak - 0.6)) * fps} scale={1.25} /></Stage>);
	// the sad beat: rain over the frame for a second after the crash
	if (t >= G.crash && t < G.crash + 1.3) {
		const o = interpolate(t, [G.crash, G.crash + 0.1, G.crash + 1.1, G.crash + 1.3], [0, 1, 1, 0]);
		els.push(
			<svg key="rain" width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o * 0.7}}>
				{Array.from({length: 70}).map((_, i) => {
					const x0 = (i * 157) % 1080;
					const y0 = (((i * 263) % 1920) + (t - G.crash) * 2600) % 1920;
					return <line key={i} x1={x0} y1={y0} x2={x0 - 10} y2={y0 + 60} stroke="#BFD4FF" strokeWidth={3} strokeLinecap="round" />;
				})}
			</svg>,
		);
	}
	const vl = (t - G.vinyl) * fps;
	if (vl >= 0 && t < G.vinylOut + 0.3) {
		const outS = interpolate(t, [G.vinylOut, G.vinylOut + 0.3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		els.push(<Stage key="vin"><Vinyl lf={vl} fps={fps} at={[160, 1170]} scale={0.55 * outS} /></Stage>);
	}
	const [r0, rSrc, rate, rDur] = G.replay;
	els.push(<ReplayPip key="rp" t={t} fps={fps} video={video} r0={r0} rSrc={rSrc} rate={rate} rDur={rDur} h={520} tag={(s) => (s < G.crash - 0.3 ? ['ОЖИДАНИЕ', '#FFB020'] : ['РЕАЛЬНОСТЬ', '#9AA3B8'])} />);
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) els.push(<Cap key="cap" lf={lf} fps={fps} top={1365} lines={[['ожидание: пиратский жетон', 38, '#FFD23F'], ['реальность: джем-трек', 50, '#FFFFFF']]} step={9} />);
	return <>{els}</>;
};

// v15 — bot scanner: locks the enemy («бот 97%»), then rescans HIM stuck in the window («бот 100%»); hope meter → «+0»
const scanBox = (t: number, fps: number, c: [number, number], w: number, h: number, from: number, label: number, pct: number, key: string) => {
	const k = (t - from) * fps;
	const p = spring({frame: k, fps, config: {damping: 12, stiffness: 200}});
	const sz = lerpN(1.8, 1, p);
	const scanY = ((k * 9) % h);
	const shown = t >= label;
	const num = shown ? Math.round(interpolate((t - label) * fps, [0, 14], [0, pct], {extrapolateRight: 'clamp'})) : 0;
	const corner = (x: number, y: number, dx: number, dy: number) => <path d={`M${x + dx * 36} ${y} L${x} ${y} L${x} ${y + dy * 36}`} stroke="#FF2A2A" strokeWidth={8} fill="none" />;
	return (
		<div key={key} style={{position: 'absolute', left: c[0] - (w * sz) / 2, top: c[1] - (h * sz) / 2, width: w * sz, height: h * sz, opacity: Math.min(1, k / 3)}}>
			<svg width={w * sz} height={h * sz} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				{corner(0, 0, 1, 1)}{corner(w * sz, 0, -1, 1)}{corner(0, h * sz, 1, -1)}{corner(w * sz, h * sz, -1, -1)}
				{!shown ? <line x1={0} x2={w * sz} y1={scanY * sz} y2={scanY * sz} stroke="#FF2A2A" strokeWidth={4} opacity={0.8} /> : null}
			</svg>
			<div style={{position: 'absolute', left: 0, top: -78, whiteSpace: 'nowrap', background: '#FF2A2A', border: `4px solid ${NAVY}`, borderRadius: 10, padding: '4px 12px'}}>
				<span style={txt(42, '#FFFFFF')}>{shown ? `БОТ: ${num}%` : 'СКАН…'}</span>
			</div>
		</div>
	);
};
const BotScan: React.FC<P> = ({cfg, t, fps, video}) => {
	const B = cfg.bot as {lock: [number, number]; enemy: [number, number]; label: number; self: [number, number]; me: [number, number]; selfLabel: number; meter: [number, number]; drain: number; replay: [number, number, number, number]; mePip: [number, number]};
	const els: React.ReactNode[] = [];
	if (t >= B.lock[0] && t < B.lock[1]) els.push(scanBox(t, fps, B.enemy, 230, 330, B.lock[0], B.label, 97, 'e'));
	if (t >= B.self[0] && t < B.self[1]) els.push(scanBox(t, fps, B.me, 260, 380, B.self[0], B.selfLabel, 100, 'me'));
	// hope meter: fills while he dreams of the «шедевр», drains to +0 when the rank is merely protected
	const [m0, m1] = B.meter;
	const inM = (t >= m0 && t < B.replay[0]) || t >= B.drain - 1.6;
	if (t >= m0 && inM) {
		const fill = interpolate(t, [m0, m1], [0.05, 0.92], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * interpolate(t, [B.drain, B.drain + 0.5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
		const drained = t >= B.drain + 0.5;
		els.push(
			<div key="mt" style={{position: 'absolute', left: 70, top: 1300, width: 780}}>
				<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
					<span style={txt(30, '#FFFFFF', strokeS)}>ШЕДЕВР-МЕТР</span>
					<span style={txt(48, drained ? '#FF3B3B' : '#7CFF6B', strokeS)}>{drained ? '+0' : `${Math.round(fill * 100)}%`}</span>
				</div>
				<div style={{marginTop: 8, height: 32, borderRadius: 10, border: `5px solid ${NAVY}`, background: '#1A1F2E', overflow: 'hidden', position: 'relative', boxShadow: `0 6px 0 ${NAVY}`}}>
					<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: 'linear-gradient(90deg, #3DBA4E, #7CFF6B, #FFD23F)'}} />
				</div>
			</div>,
		);
	}
	const [r0, rSrc, rate, rDur] = B.replay;
	els.push(
		<ReplayPip key="rp" t={t} fps={fps} video={video} r0={r0} rSrc={rSrc} rate={rate} rDur={rDur} h={520} tag={() => ['ПОВТОР ×0.5', RED]}
			over={(srcT, k) => (srcT >= B.self[0] && srcT < B.self[1] + 0.1 ? <div style={{position: 'absolute', left: B.mePip[0] * k - 70, top: (B.mePip[1] - 604) * k - 110, width: 140, height: 220, border: '6px solid #FF2A2A', borderRadius: 8}} /> : null)} />,
	);
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0 && t < B.drain - 1.6) els.push(<Cap key="cap" lf={lf} fps={fps} top={1365} lines={[['БОТ НАЙДЕН', 52, '#FF3B3B'], ['застрял в окне', 42, '#FFFFFF']]} step={9} />);
	return <>{els}</>;
};

// v16 — TV weather forecast: «никого же нету» = sunny, «ой, есть» = storm warning + crawl, «застроился» = bricks
const Forecast: React.FC<P> = ({cfg, t, fps}) => {
	const F = cfg.fc as {sun: number; storm: number; wall: number; crawl: [number, number]};
	const els: React.ReactNode[] = [];
	const kind: 'sun' | 'storm' | 'wall' = t >= F.wall ? 'wall' : t >= F.storm ? 'storm' : 'sun';
	const since = kind === 'wall' ? F.wall : kind === 'storm' ? F.storm : F.sun;
	const lf = (t - cfg.punch.t) * fps;
	if (t >= F.sun && lf < 0) {
		const [title, line, col] = kind === 'sun' ? ['ЯСНО', 'людей: 0%', '#FFD23F'] : kind === 'storm' ? ['ГРОЗА', 'осадки: пули', '#FF3B3B'] : ['СТРОЙКА', 'местами стены', '#FF8A3D'];
		const k = (t - since) * fps;
		const flip = interpolate(k, [0, 8], [90, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
		els.push(
			<div key="w" style={{position: 'absolute', left: 50, top: 200, width: 470, height: 170, perspective: 700}}>
				<div style={{transform: `rotateX(${flip}deg)`, background: 'linear-gradient(135deg, #1F4FD8, #12307E)', border: `5px solid ${NAVY}`, borderRadius: 22, boxShadow: `0 8px 0 ${NAVY}`, height: '100%', paddingLeft: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
					<div style={txt(22, '#A9C2FF', {letterSpacing: '0.16em'})}>ПРОГНОЗ</div>
					<div style={txt(46, col, {marginTop: 4})}>{title}</div>
					<div style={txt(26, '#FFFFFF', {marginTop: 4})}>{line}</div>
				</div>
			</div>,
		);
		els.push(<Stage key={`ic-${kind}`}><Weather t={t} fps={fps} kind={kind} since={since} at={[140, 285]} scale={0.5} /></Stage>);
	}
	const [c0, c1] = F.crawl;
	if (t >= c0 && t < c1) {
		const o = interpolate(t, [c0, c0 + 0.15, c1 - 0.2, c1], [0, 1, 1, 0]);
		const msg = '⚠ ШТОРМОВОЕ ПРЕДУПРЕЖДЕНИЕ · В РАЙОНЕ ПОСАДКИ ОБНАРУЖЕН ЧЕЛОВЕК · ОСАДКИ В ВИДЕ ПУЛЬ · ';
		els.push(
			<div key="cr" style={{position: 'absolute', left: 0, top: 1450, width: 1080, height: 70, opacity: o, background: '#E8322B', borderTop: `5px solid ${NAVY}`, borderBottom: `5px solid ${NAVY}`, overflow: 'hidden'}}>
				<div style={{position: 'absolute', top: 10, left: 1080 - (t - c0) * 420, ...txt(40, '#FFFFFF')}}>{msg + msg}</div>
			</div>,
		);
	}
	if (lf >= 0) {
		els.push(<Stage key="wall"><Weather t={t} fps={fps} kind="wall" since={F.wall} at={[459, 1060]} scale={lerpN(0.5, 1.0, Math.min(1, lf / 14))} /></Stage>);
		els.push(<Cap key="cap" lf={lf - 6} fps={fps} top={1260} lines={[['ПРОГНОЗ: никого', 44, '#FFD23F'], ['ФАКТ: гроза и стройка', 50, '#FFFFFF']]} step={9} />);
	}
	return <>{els}</>;
};
// v15 — ожидание / реальность: an esports broadcast HUD while he builds and juke-s, which breaks apart when he gets stuck in the window
const SEG = (n: number, col: string) => (
	<div style={{display: 'flex', gap: 6}}>{Array.from({length: 5}).map((_, i) => <div key={i} style={{width: 34, height: 20, borderRadius: 4, background: i < n ? col : 'rgba(255,255,255,0.15)', border: `3px solid ${NAVY}`}} />)}</div>
);
const Esports: React.FC<P> = ({cfg, t, fps, video}) => {
	const E = cfg.es as {real: number; meter: [number, number]; drain: number; replay: [number, number, number, number]; mePip: [number, number]};
	const els: React.ReactNode[] = [];
	const g = (t - E.real) * fps; // frames since reality hits
	if (t < E.real + 2.6) {
		const real = g >= 0;
		const fall = (i: number) => (g > 6 ? {transform: `translate(${Math.sin(i * 3) * g * 2}px, ${(g - 6) ** 2 * 0.9}px) rotate(${(i % 2 ? 1 : -1) * (g - 6) * 1.5}deg)`} : {});
		const jit = real && g < 8 ? {transform: `translate(${Math.sin(g * 9) * 14}px, 0)`, textShadow: '6px 0 0 rgba(255,0,60,0.8), -6px 0 0 rgba(0,200,255,0.8)'} : {};
		const apm = real ? Math.max(0, 3 - Math.floor(g / 20)) : 380 + Math.round(Math.abs(Math.sin(t * 7.3)) * 60);
		const o = interpolate(t, [0, 0.15], [0, 1], {extrapolateRight: 'clamp'});
		els.push(
			<div key="top" style={{position: 'absolute', left: 50, top: 200, display: 'flex', alignItems: 'center', gap: 12, opacity: o, ...fall(1)}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 10, background: real ? '#4A4F5C' : RED, border: `5px solid ${NAVY}`, borderRadius: 12, padding: '6px 14px', boxShadow: `0 6px 0 ${NAVY}`}}>
					<div style={{width: 16, height: 16, borderRadius: 8, background: '#FFFFFF', opacity: real ? 0.3 : Math.floor(t * 2.5) % 2 ? 1 : 0.35}} />
					<span style={txt(30, '#FFFFFF')}>{real ? 'ОФЛАЙН' : 'LIVE'}</span>
				</div>
				<div style={{background: real ? '#2B2F3A' : 'linear-gradient(90deg, #1A1F2E, #3B1A8F)', border: `5px solid ${real ? '#6B6656' : GOLD}`, outline: `4px solid ${NAVY}`, borderRadius: 12, padding: '6px 18px'}}>
					<span style={txt(34, real ? '#9AA3B8' : GOLD, jit)}>{real ? 'РЕАЛЬНОСТЬ' : 'КИБЕРСПОРТ · ФИНАЛ'}</span>
				</div>
			</div>,
		);
		els.push(
			<div key="stats" style={{position: 'absolute', left: 50, top: 1290, width: 560, opacity: o, ...fall(2)}}>
				<div style={{background: real ? 'rgba(43,47,58,0.92)' : 'rgba(11,21,48,0.86)', border: `5px solid ${real ? '#6B6656' : GOLD}`, borderRadius: 18, padding: '14px 20px', boxShadow: `0 8px 0 ${NAVY}`}}>
					<div style={txt(24, real ? '#9AA3B8' : '#F4D9A0', {letterSpacing: '0.14em', ...jit})}>{real ? 'СТАТИСТИКА: ФАКТ' : 'СТАТИСТИКА ИГРОКА'}</div>
					{([['СТРОЙКА', real ? 0 : 5], ['МАНСЫ', real ? 0 : 5]] as [string, number][]).map(([k, n]) => (
						<div key={k} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10}}>
							<span style={txt(30, '#FFFFFF')}>{k}</span>
							{SEG(n, real ? '#FF3B3B' : '#7CFF6B')}
						</div>
					))}
					<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10}}>
						<span style={txt(30, '#FFFFFF')}>APM</span>
						<span style={txt(42, real ? '#FF3B3B' : '#FFD23F')}>{apm}</span>
					</div>
				</div>
			</div>,
		);
		if (real && g < 14) els.push(<div key="gl" style={{position: 'absolute', inset: 0, background: `repeating-linear-gradient(0deg, rgba(255,0,60,0.18) 0 6px, rgba(0,200,255,0.12) 6px 12px, rgba(0,0,0,0) 12px 40px)`, transform: `translateY(${(g * 31) % 40}px)`, opacity: 1 - g / 14}} />);
	}
	// hope meter (ожидание: шедевр) → «+0» on «ранг защищён»
	const [m0, m1] = E.meter;
	if (t >= m0 && ((t < E.replay[0]) || t >= E.drain - 1.6)) {
		const fill = interpolate(t, [m0, m1], [0.05, 0.92], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * interpolate(t, [E.drain, E.drain + 0.5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
		const drained = t >= E.drain + 0.5;
		els.push(
			<div key="mt" style={{position: 'absolute', left: 70, top: 1300, width: 780}}>
				<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
					<span style={txt(30, '#FFFFFF', strokeS)}>ОЖИДАНИЕ: ШЕДЕВР</span>
					<span style={txt(48, drained ? '#FF3B3B' : '#7CFF6B', strokeS)}>{drained ? '+0' : `${Math.round(fill * 100)}%`}</span>
				</div>
				<div style={{marginTop: 8, height: 32, borderRadius: 10, border: `5px solid ${NAVY}`, background: '#1A1F2E', overflow: 'hidden', position: 'relative', boxShadow: `0 6px 0 ${NAVY}`}}>
					<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: 'linear-gradient(90deg, #3DBA4E, #7CFF6B, #FFD23F)'}} />
				</div>
			</div>,
		);
	}
	const [r0, rSrc, rate, rDur] = E.replay;
	els.push(
		<ReplayPip key="rp" t={t} fps={fps} video={video} r0={r0} rSrc={rSrc} rate={rate} rDur={rDur} h={520} tag={() => ['РЕАЛЬНОСТЬ ×0.5', '#9AA3B8']}
			over={(srcT, k) => (srcT >= E.real && srcT < E.real + 1.7 ? <div style={{position: 'absolute', left: E.mePip[0] * k - 70, top: (E.mePip[1] - 604) * k - 110, width: 140, height: 220, border: '6px solid #FF2A2A', borderRadius: 8}} /> : null)} />,
	);
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0 && t < E.drain - 1.6) els.push(<Cap key="cap" lf={lf} fps={fps} top={1365} lines={[['ожидание: киберспорт, стройка, мансы', 34, '#FFD23F'], ['реальность: застрял в окне', 46, '#FFFFFF']]} step={9} />);
	return <>{els}</>;
};

export const Concept: React.FC<P> = (p) => {
	const m: Record<string, React.FC<P>> = {airport: Airport, tir: Tir, tabloid: Tabloid, cctv: Cctv, museum: Museum, captcha: Captcha, jar: Jar, tip: Tip, boss: Boss, ammo: Ammo, theatre: Theatre, house: HouseCount, vhs: Vhs, gacha: Gacha, bot: BotScan, esports: Esports, forecast: Forecast};
	const C = m[p.cfg.concept];
	return C ? <C {...p} /> : null;
};
