import React from 'react';
import {Easing, OffthreadVideo, Sequence, interpolate, spring} from 'remotion';
import type {Cfg} from './Edit';
import {FONT, NAVY, SRC_W, SRC_H} from './theme';

// Per-video "seasoning" (§4): game-styled graphics + the ONE editorial caption (punchline).
// Palette from the game (Fortnite): storm purple, loot gold, rarity blue — never the subtitle colours.
const GOLD = '#FFC83D';
const PURPLE = '#6A2BD8';
const BLUE = '#2F7BFF';

type L = {from: string; to: string; p: number};
type P = {cfg: Cfg; t: number; fps: number; layout: L; video: string};

const popIn = (lf: number, fps: number) => {
	const s = spring({frame: lf, fps, config: {damping: 11, stiffness: 190, mass: 0.8}});
	return {s: interpolate(s, [0, 1], [0.5, 1]) * interpolate(lf, [0, 6, 14], [0.7, 1.08, 1], {extrapolateRight: 'clamp'}), o: Math.min(1, lf / 3)};
};
const plate: React.CSSProperties = {border: `7px solid ${NAVY}`, borderRadius: 26, boxShadow: `0 14px 0 ${NAVY}, 0 24px 40px rgba(11,21,48,0.55)`};
const txt = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT, fontWeight: 900, fontSize: size, color, lineHeight: 1.05, ...extra});

// ---------------- v1: real-estate developer ad ----------------
const RealEstate: React.FC<P> = ({cfg, t, fps, layout}) => {
	const r = cfg.ruler as {t0: number; t1: number};
	const els: React.ReactNode[] = [];
	if (t >= r.t0 && t < r.t1 + 0.4) {
		// construction "tape measure" growing with the tower; height in metres ticks up
		const o = interpolate(t, [r.t0, r.t0 + 0.2, r.t1, r.t1 + 0.4], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const prog = interpolate(t, [r.t0, r.t1 - 0.6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
		const h = 140 + prog * 520;
		const base = layout.to === 'game_full' ? 1330 : 1560;
		const sc = layout.to === 'game_full' ? 1 : 0.62;
		const m = Math.round(8 + prog * 64);
		els.push(
			<div key="ruler" style={{position: 'absolute', left: 820, top: base, opacity: o, transform: `scale(${sc})`, transformOrigin: '0 0'}}>
				<div style={{position: 'absolute', left: 0, bottom: 0, width: 34, height: h, border: `6px solid ${NAVY}`, borderRadius: 8, background: `repeating-linear-gradient(0deg, ${GOLD} 0 26px, ${NAVY} 26px 32px)`}} />
				<div style={{position: 'absolute', left: -60, bottom: h + 10, ...plate, borderRadius: 16, background: GOLD, padding: '8px 14px', boxShadow: `0 8px 0 ${NAVY}`}}>
					<span style={txt(42, NAVY, {whiteSpace: 'nowrap'})}>{m} м</span>
				</div>
			</div>,
		);
	}
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) {
		const {s, o} = popIn(lf, fps);
		const towers = [60, 110, 85, 140];
		els.push(
			<div key="ad" style={{position: 'absolute', left: 110, top: 1000, width: 860, transform: `scale(${s})`, opacity: o}}>
				<div style={{...plate, background: '#F4F1E8', padding: '28px 34px 30px', overflow: 'hidden', position: 'relative'}}>
					<div style={{display: 'flex', alignItems: 'flex-end', gap: 26}}>
						<div style={{display: 'flex', alignItems: 'flex-end', gap: 6, height: 150}}>
							{towers.map((th, i) => {
								const g = spring({frame: lf - 4 - i * 3, fps, config: {damping: 12, stiffness: 160}});
								return <div key={i} style={{width: 26, height: th * g, background: i % 2 ? PURPLE : BLUE, border: `4px solid ${NAVY}`, borderRadius: 4, backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 12px, rgba(255,255,255,0.55) 12px 16px)'}} />;
							})}
						</div>
						<div>
							<div style={txt(30, PURPLE, {letterSpacing: '0.12em'})}>НОВОСТРОЙКА</div>
							<div style={txt(64, NAVY, {marginTop: 8, whiteSpace: 'nowrap'})}>ЖК «ПОТНЫЙ»</div>
						</div>
					</div>
					<div style={{marginTop: 22, background: NAVY, borderRadius: 14, padding: '14px 20px', display: 'inline-block'}}>
						<span style={txt(38, GOLD, {whiteSpace: 'nowrap'})}>сдача — до конца бури</span>
					</div>
				</div>
			</div>,
		);
	}
	return <>{els}</>;
};

// ---------------- v2: marketplace review of the opponent ----------------
const Review: React.FC<P> = ({cfg, t, fps}) => {
	const lf = (t - cfg.punch.t) * fps;
	if (lf < 0) return null;
	const {s, o} = popIn(lf, fps);
	return (
		<div style={{position: 'absolute', left: 110, top: 1010, width: 860, transform: `scale(${s})`, opacity: o}}>
			<div style={{...plate, background: '#FFFFFF', padding: '26px 32px 30px'}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 20}}>
					<div style={{width: 76, height: 76, borderRadius: 38, background: '#C9CFDB', border: `5px solid ${NAVY}`, overflow: 'hidden', position: 'relative'}}>
						<div style={{position: 'absolute', left: 21, top: 12, width: 24, height: 24, borderRadius: 12, background: '#7A8396'}} />
						<div style={{position: 'absolute', left: 10, top: 40, width: 46, height: 40, borderRadius: 23, background: '#7A8396'}} />
					</div>
					<div style={{display: 'flex', gap: 8}}>
						{[0, 1, 2, 3, 4].map((i) => {
							const sp = spring({frame: lf - 6 - i * 3, fps, config: {damping: 9, stiffness: 240}});
							return (
								<svg key={i} width={66} height={66} viewBox="-12 -12 24 24" style={{transform: `scale(${sp})`}}>
									<path d="M0,-10 L2.9,-3.6 L9.5,-3.1 L4.5,1.4 L5.9,8.1 L0,4.7 L-5.9,8.1 L-4.5,1.4 L-9.5,-3.1 L-2.9,-3.6Z" fill={i === 0 ? GOLD : '#DDE1EA'} stroke={NAVY} strokeWidth={1.6} strokeLinejoin="round" />
								</svg>
							);
						})}
					</div>
				</div>
				<div style={txt(44, NAVY, {marginTop: 20, whiteSpace: 'nowrap'})}>«Щит сломался сразу.</div>
				<div style={txt(44, NAVY, {whiteSpace: 'nowrap', marginTop: 6})}>Не рекомендую»</div>
			</div>
		</div>
	);
};

// ---------------- v3: radio station + miss markers ----------------
const Radio: React.FC<P> = ({cfg, t, fps, layout}) => {
	const els: React.ReactNode[] = [];
	const eq = cfg.eq as {t0: number; t1: number};
	const bars = (n: number, hgt: number, seed: number, w = 16) => (
		<div style={{display: 'flex', alignItems: 'flex-end', gap: 7, height: hgt}}>
			{Array.from({length: n}).map((_, i) => {
				const v = 0.25 + 0.75 * Math.abs(Math.sin(t * (7 + i * 1.7) + i * 1.3 + seed));
				return <div key={i} style={{width: w, height: hgt * v, background: i % 2 ? GOLD : '#7CC8FF', border: `3px solid ${NAVY}`, borderRadius: 5}} />;
			})}
		</div>
	);
	if (t >= eq.t0 && t < eq.t1 + 0.3) {
		const lf = (t - eq.t0) * fps;
		const {s, o} = popIn(lf, fps);
		const out = interpolate(t, [eq.t1, eq.t1 + 0.3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		els.push(
			<div key="eq" style={{position: 'absolute', left: 640, top: 1140, transform: `scale(${s * out})`, opacity: o * out}}>
				<div style={{...plate, borderRadius: 22, background: PURPLE, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14}}>
					<div style={{width: 22, height: 22, borderRadius: 11, background: '#FF3B5C', border: `3px solid ${NAVY}`, opacity: 0.5 + 0.5 * Math.abs(Math.sin(t * 5))}} />
					{bars(6, 64, 0)}
				</div>
			</div>,
		);
	}
	// misses: every shot drops a grey "✕" hit-marker scattered around the target — none land
	const shots = cfg.shots as number[];
	if (layout.to === 'game_full') {
		shots.forEach((st, i) => {
			const lf = (t - st) * fps;
			if (lf < 0 || lf > 40) return;
			const a = i * 2.39;
			const r = 70 + ((i * 37) % 90);
			const x = 600 + Math.cos(a) * r;
			const y = 700 + Math.sin(a) * r * 0.7;
			const sc = interpolate(lf, [0, 4, 10], [0.4, 1.2, 1], {extrapolateRight: 'clamp'});
			const o = interpolate(lf, [0, 2, 26, 40], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
			els.push(
				<svg key={`m${i}`} width={70} height={70} viewBox="-10 -10 20 20" style={{position: 'absolute', left: x - 35, top: y - 35, transform: `scale(${sc}) rotate(${i * 13}deg)`, opacity: o}}>
					<path d="M-6,-6 L6,6 M6,-6 L-6,6" stroke={NAVY} strokeWidth={5.5} strokeLinecap="round" />
					<path d="M-6,-6 L6,6 M6,-6 L-6,6" stroke="#E8ECF4" strokeWidth={3} strokeLinecap="round" />
				</svg>,
			);
		});
	}
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) {
		const {s, o} = popIn(lf, fps);
		els.push(
			<div key="card" style={{position: 'absolute', left: 110, top: 1000, width: 860, transform: `scale(${s})`, opacity: o}}>
				<div style={{...plate, background: `linear-gradient(110deg, #3B1A8F, ${PURPLE} 60%, ${BLUE})`, padding: '24px 34px 28px'}}>
					<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
						<div style={{width: 24, height: 24, borderRadius: 12, background: '#FF3B5C', border: `3px solid ${NAVY}`}} />
						<span style={txt(32, '#FFFFFF', {letterSpacing: '0.1em'})}>ИНДИ-ПОП FM</span>
						<div style={{marginLeft: 'auto'}}>{bars(5, 44, 2, 12)}</div>
					</div>
					<div style={txt(68, GOLD, {marginTop: 16, whiteSpace: 'nowrap', textShadow: `0 5px 0 ${NAVY}`})}>Хит дня: «Мимо»</div>
					<div style={txt(40, '#FFFFFF', {marginTop: 10})}>13 раз подряд</div>
				</div>
			</div>,
		);
	}
	return <>{els}</>;
};

// ---------------- v4: sports broadcast — replay + medical timeout ----------------
const Sports: React.FC<P> = ({cfg, t, fps, video}) => {
	const els: React.ReactNode[] = [];
	const rp = cfg.replay as {t0: number; t1: number; src: number; rate: number};
	if (t >= rp.t0 - 0.2 && t < rp.t1 + 0.3) {
		const o = interpolate(t, [rp.t0 - 0.2, rp.t0 + 0.1, rp.t1, rp.t1 + 0.3], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		// replay of the final kill, 0.4× — fills the static victory screen without changing the length
		const crop: [number, number, number, number] = [0, 700, 918, 556];
		const s = 1080 / crop[2];
		els.push(
			<div key="rp" style={{position: 'absolute', left: 0, top: 1266, width: 1080, height: 654, overflow: 'hidden', opacity: o}}>
				<Sequence from={Math.round(rp.t0 * fps)} layout="none">
					<OffthreadVideo src={video} muted trimBefore={Math.round(rp.src * fps)} playbackRate={rp.rate} style={{position: 'absolute', left: -crop[0] * s, top: -crop[1] * s, width: SRC_W * s, height: SRC_H * s, maxWidth: 'none', filter: 'contrast(1.08) saturate(1.15)'}} />
				</Sequence>
				<div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 8px ${NAVY}`}} />
				<div style={{position: 'absolute', left: 30, top: 30, ...plate, borderRadius: 14, boxShadow: `0 8px 0 ${NAVY}`, background: '#FF3B5C', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12}}>
					<svg width={30} height={30} viewBox="0 0 30 30"><path d="M8 5 L8 25 L24 15Z" fill="#fff" transform="rotate(180 15 15)" /></svg>
					<span style={txt(34, '#FFFFFF', {letterSpacing: '0.08em'})}>ПОВТОР</span>
				</div>
			</div>,
		);
	}
	const lf = (t - cfg.punch.t) * fps;
	if (lf >= 0) {
		const inX = interpolate(spring({frame: lf, fps, config: {damping: 14, stiffness: 160}}), [0, 1], [-1100, 0]);
		const inX2 = interpolate(spring({frame: lf - 5, fps, config: {damping: 14, stiffness: 160}}), [0, 1], [-1100, 0]);
		els.push(
			<div key="lt" style={{position: 'absolute', left: 60, top: 1290, width: 900}}>
				<div style={{transform: `translateX(${inX}px)`, display: 'inline-block', background: '#FF3B5C', border: `6px solid ${NAVY}`, borderRadius: '16px 16px 0 0', padding: '10px 22px'}}>
					<span style={txt(34, '#FFFFFF', {letterSpacing: '0.08em', whiteSpace: 'nowrap'})}>МЕДИЦИНСКИЙ ПЕРЕРЫВ</span>
				</div>
				<div style={{transform: `translateX(${inX2}px)`, background: '#FFFFFF', border: `6px solid ${NAVY}`, borderRadius: '0 18px 18px 18px', boxShadow: `0 12px 0 ${NAVY}`, padding: '18px 26px', marginTop: -6}}>
					<span style={txt(52, NAVY, {whiteSpace: 'nowrap'})}>восстановление связок</span>
				</div>
			</div>,
		);
	}
	return <>{els}</>;
};

export const Concept: React.FC<P> = (p) => {
	if (p.cfg.concept === 'realestate') return <RealEstate {...p} />;
	if (p.cfg.concept === 'review') return <Review {...p} />;
	if (p.cfg.concept === 'radio') return <Radio {...p} />;
	if (p.cfg.concept === 'sports') return <Sports {...p} />;
	return null;
};
