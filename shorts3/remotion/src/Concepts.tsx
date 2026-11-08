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

export const Concept: React.FC<P> = (p) => {
	const m: Record<string, React.FC<P>> = {airport: Airport, tir: Tir, tabloid: Tabloid, cctv: Cctv, museum: Museum, captcha: Captcha};
	const C = m[p.cfg.concept];
	return C ? <C {...p} /> : null;
};
