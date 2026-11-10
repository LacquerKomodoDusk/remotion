import React from 'react';
import {Easing, interpolate, spring} from 'remotion';
import type {Cfg} from './Edit';
import {FONT, NAVY} from './theme';

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

// ---------------- v9: police report, the tree as the suspect ----------------
const Protocol: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	const st = lf - 50;
	return (
		<Slot lf={lf} fps={fps}>
			<div style={{...plate, background: '#F2EEE3', padding: '24px 30px 30px', position: 'relative'}}>
				<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `4px solid ${NAVY}`, paddingBottom: 12}}>
					<span style={txt(40, NAVY, {letterSpacing: '0.1em'})}>ПРОТОКОЛ</span>
					<span style={txt(34, '#6B6656')}>№ 14</span>
				</div>
				<div style={{display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 18}}>
					<span style={txt(34, '#6B6656')}>виновник:</span>
					<span style={txt(60, NAVY)}>дерево</span>
				</div>
				<div style={txt(28, '#8C8676', {marginTop: 10})}>со слов пострадавшего</div>
				{st >= 0 ? (
					<div style={{display: 'table', margin: '18px 0 0 auto', transform: `rotate(-8deg) scale(${interpolate(st, [0, 5, 10], [1.8, 0.92, 1], {extrapolateRight: 'clamp'})})`, opacity: Math.min(1, st / 3), border: `6px solid ${RED}`, borderRadius: 12, padding: '6px 16px'}}>
						<span style={txt(42, RED, {letterSpacing: '0.06em'})}>ОПРАВДАНО</span>
					</div>
				) : <div style={{height: 82}} />}
			</div>
		</Slot>
	);
};

// ---------------- v10: shot counter vs «тремя патронами» ----------------
const Ammo: React.FC<P> = ({cfg, t, fps}) => {
	const shots = cfg.shots as number[];
	const n = shots.filter((s) => t >= s).length;
	const els: React.ReactNode[] = [];
	if (n > 0 && t < cfg.punch.t) {
		const last = shots[n - 1];
		const bump = interpolate((t - last) * fps, [0, 3, 10], [1.22, 0.95, 1], {extrapolateRight: 'clamp'});
		const over = n > 3;
		els.push(
			<div key="cnt" style={{position: 'absolute', left: 60, top: 240, transform: `scale(${bump})`, transformOrigin: '0 50%', ...plate, borderRadius: 20, background: over ? RED : '#F4F1E8', padding: '10px 22px', display: 'flex', alignItems: 'baseline', gap: 14}}>
				<span style={txt(30, over ? '#FFFFFF' : NAVY, {letterSpacing: '0.1em'})}>ПАТРОНЫ</span>
				<span style={txt(64, over ? '#FFFFFF' : NAVY)}>{n}</span>
				<span style={txt(40, over ? '#FFD9D6' : '#6B6656')}>/ 3</span>
			</div>,
		);
	}
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) {
		els.push(
			<Slot key="card" lf={lf} fps={fps}>
				<div style={{...plate, background: '#F4F1E8', padding: '22px 30px 26px'}}>
					{[['обещано', '3', NAVY], ['потрачено', String(shots.length), NAVY], ['посажено', '0', RED]].map(([k, v, c], i) => (
						<div key={k} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: i ? 8 : 0, opacity: lf > i * 7 ? 1 : 0}}>
							<span style={txt(40, '#6B6656')}>{k}</span>
							<span style={txt(62, c)}>{v}</span>
						</div>
					))}
				</div>
			</Slot>,
		);
	}
	return <>{els}</>;
};

// ---------------- v11: theatre ticket, he shoots from the balcony ----------------
const Ticket: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	const tear = interpolate(lf, [40, 52], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<Slot lf={lf} fps={fps}>
			<div style={{display: 'flex', filter: `drop-shadow(0 14px 0 ${NAVY})`}}>
				<div style={{flex: 1, minWidth: 0, overflow: 'hidden', background: '#7A1022', border: `7px solid ${NAVY}`, borderRight: 'none', borderRadius: '26px 0 0 26px', padding: '22px 28px 26px'}}>
					<div style={txt(30, GOLD, {letterSpacing: '0.2em'})}>ТЕАТР · БИЛЕТ</div>
					<div style={txt(58, '#FFF3DC', {marginTop: 12})}>БАЛКОН</div>
					<div style={txt(30, '#E9C9A8', {marginTop: 8})}>ряд 1 · место 1</div>
					<div style={txt(32, '#FFF3DC', {marginTop: 16})}>в программе:</div>
					<div style={txt(34, GOLD, {marginTop: 6})}>«Тройное устранение»</div>
				</div>
				<div style={{width: 92, flexShrink: 0, background: '#7A1022', border: `7px solid ${NAVY}`, borderLeft: `6px dashed ${GOLD}`, borderRadius: '0 26px 26px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translate(${tear * 30}px, ${tear * 40}px) rotate(${tear * 14}deg)`, opacity: 1 - tear * 0.15}}>
					<span style={txt(26, GOLD, {transform: 'rotate(-90deg)', letterSpacing: '0.12em'})}>КОНТРОЛЬ</span>
				</div>
			</div>
		</Slot>
	);
};

// ---------------- v12: console-style trophy pop ----------------
const Trophy: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	const slide = interpolate(spring({frame: lf, fps, config: {damping: 14, stiffness: 160}}), [0, 1], [-900, 0]);
	const shine = interpolate(lf, [10, 40], [-200, 900], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', left: 60, top: 1010, width: 840, transform: `translateX(${slide}px)`}}>
			<div style={{...plate, background: 'linear-gradient(135deg, #1A1F2E, #2B3350)', padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 24, position: 'relative', overflow: 'hidden'}}>
				<div style={{width: 120, height: 120, borderRadius: 60, background: 'radial-gradient(circle at 35% 30%, #FFE9A3, #E0A21B 60%, #9A6A0A)', border: `6px solid ${NAVY}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
					<svg width="68" height="68" viewBox="0 0 24 24"><path fill={NAVY} d="M7 2h10v2h4v3a5 5 0 0 1-4.6 5A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 7.6 12 5 5 0 0 1 3 7V4h4zm-2 4v1a3 3 0 0 0 2 2.8V6zm14 0h-2v3.8A3 3 0 0 0 19 7z" /></svg>
				</div>
				<div>
					<div style={txt(28, '#AEB6CC', {letterSpacing: '0.14em'})}>ТРОФЕЙ ПОЛУЧЕН</div>
					<div style={txt(56, '#FFFFFF', {marginTop: 8})}>Минус сквад</div>
					<div style={txt(32, GOLD, {marginTop: 8})}>трое в доме → ноль в доме</div>
				</div>
				<div style={{position: 'absolute', top: 0, bottom: 0, left: shine, width: 90, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)', transform: 'skewX(-20deg)'}} />
			</div>
		</div>
	);
};

export const Concept: React.FC<P> = (p) => {
	const m: Record<string, React.FC<P>> = {airport: Airport, tir: Tir, tabloid: Tabloid, cctv: Cctv, museum: Museum, captcha: Captcha, jar: Jar, tip: Tip, protocol: Protocol, ammo: Ammo, ticket: Ticket, trophy: Trophy};
	const C = m[p.cfg.concept];
	return C ? <C {...p} /> : null;
};
