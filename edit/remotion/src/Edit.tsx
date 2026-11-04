import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, random, spring, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import data from './data.json';

const HEAD = 'Russo One';
const UI = 'Rubik';
loadFont({family: HEAD, url: staticFile('RussoOne.ttf')});
loadFont({family: UI, url: staticFile('Rubik900.ttf'), weight: '900'});

// Палитра из лобби Fortnite
const C = {
	yellow: '#FFE84A',
	cyan: '#4FF3FF',
	purple: '#5B3FD9',
	night: '#140B2E',
	pink: '#FF3DA5',
	white: '#FFFFFF',
};
const LEAKS = [
	['#ff8a3d', '#ff3da5'],
	['#ff3da5', '#7b5cff'],
	['#3de8ff', '#7b5cff'],
];

type Ev = {type: string; f: number; dur?: number; end?: number; [k: string]: any};
const EV = data.events as Ev[];
const SRC_W = 918;
const SRC_H = 1632;
const VIDEO = staticFile('master.mp4');

type Win = {x: number; y: number; w: number; h: number; cx: number; cy: number; s: number; r: number; blur: number; dim: number};
const CAM = {cx: 550, cy: 258};
const LAYOUTS: Record<string, {cam: Win; game: Win}> = {
	split: {
		cam: {x: 0, y: 0, w: 1080, h: 850, ...CAM, s: 1.9, r: 0, blur: 0, dim: 1},
		game: {x: 0, y: 850, w: 1080, h: 1070, cx: 459, cy: 1095, s: 1.176, r: 0, blur: 0, dim: 1},
	},
	game_full: {
		cam: {x: 0, y: -900, w: 1080, h: 850, ...CAM, s: 1.9, r: 0, blur: 0, dim: 1},
		game: {x: 0, y: 0, w: 1080, h: 1920, cx: 412, cy: 1130, s: 1.92, r: 0, blur: 0, dim: 1},
	},
	cam_full: {
		cam: {x: 50, y: 330, w: 980, h: 920, ...CAM, cx: 552, cy: 250, s: 2.1, r: 44, blur: 0, dim: 1},
		game: {x: 0, y: 0, w: 1080, h: 1920, cx: 412, cy: 1130, s: 1.92, r: 0, blur: 22, dim: 0.42},
	},
};

const easeIO = Easing.bezier(0.65, 0, 0.35, 1);
const lerpWin = (a: Win, b: Win, t: number): Win => {
	const o: any = {};
	for (const k of Object.keys(a)) o[k] = (a as any)[k] + ((b as any)[k] - (a as any)[k]) * t;
	return o;
};

const envAt = (f: number, start: number, dur: number, attack = 1) => {
	if (f < start || f >= start + dur) return 0;
	const t = f - start;
	if (t < attack) return (t + 1) / (attack + 1);
	return Math.pow(1 - (t - attack) / Math.max(1, dur - attack), 3);
};
const sumEnv = (f: number, type: string, key: string, attack = 1) =>
	EV.filter((e) => e.type === type).reduce((acc, e) => acc + envAt(f, e.f, e.dur ?? 1, attack) * (e[key] ?? 1), 0);
const active = (f: number, type: string) => EV.filter((e) => e.type === type && f >= e.f && f < e.f + (e.dur ?? (e.end ?? 0) - e.f));

const noise1 = (seed: string, f: number) => {
	// сглаженный шум (value noise) для шейка
	const i = Math.floor(f / 2);
	const t = (f / 2) % 1;
	const a = random(`${seed}${i}`) * 2 - 1;
	const b = random(`${seed}${i + 1}`) * 2 - 1;
	const s = t * t * (3 - 2 * t);
	return a + (b - a) * s;
};

const Window: React.FC<{w: Win; filter: string; zIndex: number; border?: boolean}> = ({w, filter, zIndex, border}) => {
	const vw = SRC_W * w.s;
	const vh = SRC_H * w.s;
	const left = w.w / 2 - w.cx * w.s;
	const top = w.h / 2 - w.cy * w.s;
	return (
		<div
			style={{
				position: 'absolute',
				left: w.x,
				top: w.y,
				width: w.w,
				height: w.h,
				overflow: 'hidden',
				borderRadius: w.r,
				zIndex,
				boxShadow: border ? `0 0 0 6px ${C.cyan}, 0 0 60px 10px rgba(79,243,255,0.55), 0 30px 80px rgba(0,0,0,0.6)` : undefined,
			}}
		>
			<OffthreadVideo
				src={VIDEO}
				muted
				style={{
					position: 'absolute',
					left,
					top,
					width: vw,
					height: vh,
					filter: `${filter} blur(${w.blur}px) brightness(${w.dim})`,
					transform: w.blur > 0 ? 'scale(1.08)' : undefined,
				}}
			/>
		</div>
	);
};

const Title: React.FC<{e: Ev; f: number}> = ({e, f}) => {
	const t = f - e.f;
	const out = interpolate(t, [e.dur - 7, e.dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', left: 60, width: 810, top: e.y - 130, height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50}}>
			{e.lines.map((line: string, i: number) => {
				const sp = spring({frame: t - i * 5, fps: 60, config: {damping: 11, stiffness: 180, mass: 0.6}});
				const isAccent = i === e.accent;
				return (
					<div
						key={i}
						style={{
							fontFamily: HEAD,
							fontSize: isAccent ? 118 : 84,
							lineHeight: 1.02,
							color: isAccent ? C.yellow : C.white,
							WebkitTextStroke: '10px #12082a',
							paintOrder: 'stroke fill',
							textShadow: '0 10px 0 #12082a, 0 16px 30px rgba(0,0,0,0.55)',
							transform: `translateY(${(1 - sp) * 60}px) scale(${(0.4 + 0.6 * sp) * (0.85 + 0.15 * out)}) rotate(${(1 - sp) * (i ? 6 : -6) - 2}deg)`,
							opacity: Math.min(1, sp * 1.5) * out,
							whiteSpace: 'nowrap',
							fontStyle: 'italic',
						}}
					>
						{line}
					</div>
				);
			})}
		</div>
	);
};

const Word: React.FC<{e: Ev; f: number}> = ({e, f}) => {
	const t = f - e.f;
	const sp = spring({frame: t, fps: 60, config: {damping: 9, stiffness: 260, mass: 0.5}});
	const out = interpolate(t, [e.dur - 6, e.dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', left: 0, width: 930, top: e.y - 90, textAlign: 'center', zIndex: 55}}>
			<span
				style={{
					display: 'inline-block',
					fontFamily: HEAD,
					fontSize: 136,
					fontStyle: 'italic',
					color: e.accent ? C.yellow : C.white,
					WebkitTextStroke: '12px #12082a',
					paintOrder: 'stroke fill',
					textShadow: '0 12px 0 #12082a',
					transform: `scale(${(2.2 - 1.2 * sp) * (0.8 + 0.2 * out)}) rotate(${e.accent ? 4 : -5}deg)`,
					opacity: Math.min(1, t / 2 + 0.3) * out,
				}}
			>
				{e.text}
			</span>
		</div>
	);
};

const Label: React.FC<{e: Ev; f: number}> = ({e, f}) => {
	const t = f - e.f;
	const sp = spring({frame: t, fps: 60, config: {damping: 13, stiffness: 200}});
	const out = interpolate(t, [e.dur - 6, e.dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const top = e.target === 'cam' ? 640 : 1400;
	return (
		<div style={{position: 'absolute', left: 0, width: 930, top, display: 'flex', justifyContent: 'center', zIndex: 45, opacity: out}}>
			<div
				style={{
					fontFamily: UI,
					fontWeight: 900,
					fontSize: 50,
					color: C.white,
					padding: '14px 30px',
					borderRadius: 18,
					background: 'rgba(20,11,46,0.88)',
					border: `5px solid ${e.target === 'cam' ? C.pink : C.cyan}`,
					boxShadow: `0 0 30px ${e.target === 'cam' ? 'rgba(255,61,165,0.6)' : 'rgba(79,243,255,0.6)'}`,
					transform: `translateX(${(1 - sp) * (e.target === 'cam' ? -700 : 700)}px) rotate(${e.target === 'cam' ? -2 : 2}deg)`,
					whiteSpace: 'nowrap',
				}}
			>
				{e.text}
			</div>
		</div>
	);
};

const Meter: React.FC<{e: Ev; f: number}> = ({e, f}) => {
	if (f < e.f || f >= e.hide) return null;
	const t = f - e.f;
	const appear = spring({frame: t, fps: 60, config: {damping: 14}});
	const lostT = f - e.lost;
	const outro = interpolate(f, [e.hide - 10, e.hide], [1, 0], {extrapolateLeft: 'clamp'});
	// синхрон растёт с «дыханием», после фриза рушится в 0
	const grow = interpolate(f, [e.f, e.end], [12, 97], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
	const wob = Math.sin(t / 9) * 3 + noise1('m', t) * 2;
	let v = Math.min(99, grow + wob);
	if (lostT >= 0) v = interpolate(lostT, [0, 26], [97, 0], {extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
	const lost = lostT >= 0;
	const col = lost ? '#ff3b3b' : v > 80 ? C.yellow : C.cyan;
	const jitter = lost && lostT < 30 ? noise1('j', f) * 10 : 0;
	return (
		<div style={{position: 'absolute', left: 70, width: 790, top: 205, zIndex: 60, opacity: Math.min(1, appear) * outro, transform: `translate(${jitter}px, ${(1 - appear) * -40}px)`}}>
			<div style={{display: 'flex', justifyContent: 'space-between', fontFamily: UI, fontWeight: 900, fontSize: 40, color: C.white, textShadow: '0 4px 0 #12082a', marginBottom: 10, letterSpacing: 1}}>
				<span>{lost ? 'СИНХРОН ПОТЕРЯН' : 'СИНХРОН СО СКИНОМ'}</span>
				<span style={{color: col}}>{Math.round(v)}%</span>
			</div>
			<div style={{height: 34, borderRadius: 10, background: 'rgba(20,11,46,0.85)', border: '4px solid #12082a', overflow: 'hidden', position: 'relative', transform: 'skewX(-12deg)'}}>
				<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v}%`, background: `linear-gradient(90deg, ${C.purple}, ${col})`, boxShadow: `0 0 24px ${col}`}} />
				{[...Array(9)].map((_, i) => (
					<div key={i} style={{position: 'absolute', left: `${(i + 1) * 10}%`, top: 0, bottom: 0, width: 4, background: 'rgba(18,8,42,0.6)'}} />
				))}
			</div>
		</div>
	);
};

const Stamina: React.FC<{e: Ev; f: number}> = ({e, f}) => {
	if (f < e.f) return null;
	const t = f - e.f;
	const appear = spring({frame: t, fps: 60, config: {damping: 12}});
	const v = interpolate(f, [e.f + 6, e.end], [3, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
	const done = f >= e.end;
	const pop = done ? spring({frame: f - e.end, fps: 60, config: {damping: 8, stiffness: 240}}) : 0;
	const col = v < 40 ? '#ff4d4d' : v < 80 ? C.yellow : '#56ff7a';
	return (
		<div style={{position: 'absolute', left: 90, width: 760, top: 1290, zIndex: 60, opacity: Math.min(1, appear), transform: `translateY(${(1 - appear) * 60}px) scale(${1 + pop * 0.06 - (done ? 0.06 : 0)})`}}>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: UI, fontWeight: 900, color: C.white, textShadow: '0 4px 0 #12082a', marginBottom: 10}}>
				<span style={{fontSize: 44, whiteSpace: 'nowrap'}}>СТАМИНА</span>
				<span style={{fontSize: 56, color: col, fontFamily: HEAD}}>{Math.round(v)}</span>
			</div>
			<div style={{height: 46, borderRadius: 12, background: 'rgba(20,11,46,0.85)', border: '5px solid #12082a', overflow: 'hidden', position: 'relative', transform: 'skewX(-12deg)'}}>
				<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v}%`, background: `linear-gradient(180deg, ${col}, ${col}aa)`, boxShadow: `0 0 26px ${col}`}} />
				<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: '40%', background: 'rgba(255,255,255,0.25)'}} />
			</div>
			{done ? (
				<div style={{textAlign: 'center', marginTop: 26, fontFamily: HEAD, fontStyle: 'italic', fontSize: 92, lineHeight: 1.0, color: '#56ff7a', WebkitTextStroke: '10px #12082a', paintOrder: 'stroke fill', transform: `scale(${0.3 + 0.7 * pop}) rotate(-3deg)`}}>
					ГОТОВ КО<br />2 РАУНДУ
				</div>
			) : null}
		</div>
	);
};

const Rewind: React.FC<{e: Ev; f: number}> = ({e, f}) => {
	const t = f - e.f;
	const blink = Math.floor(t / 6) % 2 === 0;
	return (
		<AbsoluteFill style={{zIndex: 70, pointerEvents: 'none'}}>
			<AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 3px, transparent 3px, transparent 7px)'}} />
			<AbsoluteFill style={{background: 'rgba(91,63,217,0.18)', mixBlendMode: 'screen'}} />
			<div style={{position: 'absolute', left: 0, right: 150, top: 790, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: UI, fontWeight: 900, fontSize: 72, color: C.white, textShadow: `4px 0 0 ${C.pink}, -4px 0 0 ${C.cyan}`, opacity: blink ? 1 : 0.75}}>
				◀◀ 5 СЕКУНД НАЗАД
			</div>
		</AbsoluteFill>
	);
};

const Leak: React.FC<{e: Ev; f: number}> = ({e, f}) => {
	const t = (f - e.f) / e.dur;
	const op = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 0.85;
	const [a, b] = LEAKS[e.hue % 3];
	const x1 = interpolate(t, [0, 1], [-200, 700]);
	const y1 = interpolate(t, [0, 1], [300, 900]);
	const x2 = interpolate(t, [0, 1], [1200, 400]);
	const y2 = interpolate(t, [0, 1], [1500, 1100]);
	return (
		<AbsoluteFill style={{mixBlendMode: 'screen', opacity: op, zIndex: 40}}>
			<AbsoluteFill style={{background: `radial-gradient(900px 700px at ${x1}px ${y1}px, ${a} 0%, ${a}88 30%, transparent 70%)`}} />
			<AbsoluteFill style={{background: `radial-gradient(800px 900px at ${x2}px ${y2}px, ${b} 0%, ${b}77 30%, transparent 70%)`}} />
		</AbsoluteFill>
	);
};

export const Edit: React.FC = () => {
	const f = useCurrentFrame();
	const segs = data.segments;
	const si = Math.max(0, segs.findIndex((s) => f >= s.start && f < s.end));
	const seg = segs[si];
	const prev = segs[Math.max(0, si - 1)];
	const TR = 14;
	const tr = seg.layout !== prev.layout ? easeIO(Math.min(1, (f - seg.start) / TR)) : 1;
	const L0 = LAYOUTS[prev.layout];
	const L1 = LAYOUTS[seg.layout];
	const cam = seg.layout !== prev.layout ? lerpWin(L0.cam, L1.cam, tr) : L1.cam;
	const game = seg.layout !== prev.layout ? lerpWin(L0.game, L1.game, tr) : L1.game;
	const whip = seg.layout !== prev.layout ? Math.sin(Math.PI * tr) : 0;

	const speed = Math.abs(data.speed[f] ?? 1);
	const slow = interpolate(speed, [0.25, 0.9], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	// камера
	const punch = sumEnv(f, 'punch', 'amt', 2);
	const zoomIn = EV.filter((e) => e.type === 'zoomin').reduce((acc, e) => {
		const t = interpolate(f, [e.f, e.end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
		const rel = interpolate(f, [e.end, e.end + 12], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.exp)});
		return acc + (f < e.end ? t : rel) * e.amt;
	}, 0);
	const shakeE = EV.filter((e) => e.type === 'shake').reduce((acc, e) => acc + envAt(f, e.f, e.dur, 0) * e.amp, 0);
	const tilt = EV.filter((e) => e.type === 'tilt').reduce((acc, e) => acc + envAt(f, e.f, e.dur, 2) * e.deg, 0);
	const sx = noise1('sx', f * 3) * shakeE;
	const sy = noise1('sy', f * 3) * shakeE;
	const sr = noise1('sr', f * 3) * shakeE * 0.06;
	const glitch = active(f, 'glitch').length > 0;
	const gj = glitch ? (random(`g${Math.floor(f / 2)}`) - 0.5) * 50 : 0;
	const scale = 1 + punch + zoomIn + (shakeE > 0 ? 0.05 : 0) + Math.abs(tilt) * 0.012 + whip * 0.06;

	// изображение
	const ca = sumEnv(f, 'ca', 'amt', 1) + (glitch ? 10 + random(`c${f}`) * 12 : 0) + whip * 10;
	const pump = sumEnv(f, 'pump', 'one', 1);
	const grade = `contrast(${1.1 + 0.06 * slow}) saturate(${1.22 + 0.1 * slow}) brightness(${1 + pump * 0.18 + 0.03 * slow})`;
	const flash = Math.min(1, EV.filter((e) => e.type === 'flash').reduce((acc, e) => acc + envAt(f, e.f, e.dur, 1) * e.amt, 0));
	const white = EV.filter((e) => e.type === 'whiteout').reduce((acc, e) => acc + interpolate(f, [e.f, e.f + e.dur - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)}) * (f >= e.f ? 1 : 0), 0);
	const lb = EV.filter((e) => e.type === 'letterbox').reduce((acc, e) => {
		const inn = interpolate(f, [e.f, e.f + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		const outt = interpolate(f, [e.f + e.dur - 8, e.f + e.dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
		return Math.max(acc, Math.min(inn, outt));
	}, 0);

	return (
		<AbsoluteFill style={{backgroundColor: C.night, overflow: 'hidden'}}>
			<svg width="0" height="0" style={{position: 'absolute'}}>
				<filter id="ca" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
					<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
					<feOffset in="r" dx={ca} dy={0} result="r2" />
					<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
					<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
					<feOffset in="b" dx={-ca} dy={ca * 0.3} result="b2" />
					<feBlend in="r2" in2="g" mode="screen" result="rg" />
					<feBlend in="rg" in2="b2" mode="screen" />
				</filter>
			</svg>
			<AbsoluteFill
				style={{
					transform: `translate(${sx + gj}px, ${sy}px) rotate(${sr + tilt}deg) scale(${scale})`,
					filter: ca > 0.5 ? 'url(#ca)' : undefined,
				}}
			>
				<Window w={game} filter={grade} zIndex={1} />
				<Window w={cam} filter={grade} zIndex={2} border={seg.layout === 'cam_full' || prev.layout === 'cam_full'} />
				{seg.layout === 'split' ? <div style={{position: 'absolute', left: 0, right: 0, top: cam.y + cam.h - 3, height: 6, background: C.cyan, boxShadow: `0 0 24px ${C.cyan}`, zIndex: 3}} /> : null}
			</AbsoluteFill>
			{/* виньетка: сильнее на слоумо */}
			<AbsoluteFill style={{background: `radial-gradient(ellipse 75% 60% at 50% 48%, transparent 45%, rgba(10,4,30,${0.45 + 0.35 * slow}) 100%)`, zIndex: 30}} />
			{EV.filter((e) => e.type === 'leak' && f >= e.f && f < e.f + e.dur).map((e, i) => <Leak key={i} e={e} f={f} />)}
			{/* летербокс */}
			<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 150 * lb, background: '#000', zIndex: 42}} />
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 * lb, background: '#000', zIndex: 42}} />
			{active(f, 'rewind').map((e, i) => <Rewind key={i} e={e} f={f} />)}
			{active(f, 'title').map((e, i) => <Title key={i} e={e} f={f} />)}
			{active(f, 'word').map((e, i) => <Word key={i} e={e} f={f} />)}
			{active(f, 'label').map((e, i) => <Label key={i} e={e} f={f} />)}
			{EV.filter((e) => e.type === 'meter').map((e, i) => <Meter key={i} e={e} f={f} />)}
			{EV.filter((e) => e.type === 'stamina').map((e, i) => <Stamina key={i} e={e} f={f} />)}
			{/* зерно */}
			<AbsoluteFill style={{zIndex: 80, mixBlendMode: 'overlay', opacity: 0.22}}>
				<svg width="1080" height="1920">
					<filter id="grain">
						<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 17} stitchTiles="stitch" />
						<feColorMatrix type="saturate" values="0" />
					</filter>
					<rect width="100%" height="100%" filter="url(#grain)" />
				</svg>
			</AbsoluteFill>
			<AbsoluteFill style={{background: '#fff', opacity: flash, mixBlendMode: 'screen', zIndex: 90}} />
			<AbsoluteFill style={{background: '#fff', opacity: white, zIndex: 91}} />
		</AbsoluteFill>
	);
};
