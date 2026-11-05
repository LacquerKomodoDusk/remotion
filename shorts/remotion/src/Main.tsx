import React from 'react';
import {
	AbsoluteFill,
	Img,
	OffthreadVideo,
	interpolate,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
	Easing,
} from 'remotion';
import {loadFont} from '@remotion/fonts';
import data from './data.json';
import {MicMute} from './MicMute';
import {XpToast} from './XpToast';
import {ChatCard} from './ChatCard';

const FONT = 'Unbounded';
loadFont({family: FONT, url: staticFile('fonts/Unbounded-Black.woff2'), weight: '900'});
loadFont({family: FONT, url: staticFile('fonts/Unbounded-Black-latin.woff2'), weight: '900'});

// §3.2 — emotion palette (never changes between videos)
const EMO: Record<string, string> = {
	neutral: '#FFFFFF',
	confident: '#5AC8FF',
	panic: '#FFD23F',
	anger: '#FF3B3B',
	joy: '#7CFF6B',
	irony: '#B69CFF',
};
const OUTLINE = '#0B1530';

type Rect = [number, number, number, number]; // x, y, w, h
type Layout = 'split' | 'cam_full' | 'game_full';
const SRC_W = 720;
const SRC_H = 1280;

// dst rect on the 1080x1920 canvas + src rect in the 720x1280 source, per layout
const CAM: Record<Layout, {dst: Rect; src: Rect}> = {
	split: {dst: [0, 0, 1080, 768], src: [222, 32, 422, 300]},
	cam_full: {dst: [0, 150, 1080, 1116], src: [332, 34, 286, 296]},
	game_full: {dst: [0, -820, 1080, 768], src: [222, 32, 422, 300]},
};
const GAME: Record<Layout, {dst: Rect; src: Rect}> = {
	split: {dst: [0, 768, 1080, 1152], src: [0, 482, 720, 768]},
	cam_full: {dst: [0, 1266, 1080, 654], src: [0, 560, 720, 436]},
	game_full: {dst: [0, 0, 1080, 1920], src: [110, 480, 382, 680]},
};
const SUB_Y: Record<Layout, number> = {split: 768, cam_full: 1400, game_full: 470};

const segs = data.timemap.segments as {id: string; out_in: number; out_out: number; layout: Layout}[];
const words = data.words as {text: string; s: number; e: number; emotion: string; flags: string[]}[];
const chatEnd = segs[0].out_out;
const chatWords = words.filter((w) => w.s < chatEnd).map((w) => ({...w, text: w.text.toLowerCase(), emotion: w.text === 'АХАХ' ? 'joy' : 'neutral'}));
const subWords = words.filter((w) => w.s >= chatEnd);
const ev = data.events as {shot: number; toast: number; realize: number; micro: number};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => [0, 1, 2, 3].map((i) => lerp(a[i], b[i], t)) as Rect;

// cheap smooth noise (sum of incommensurate sines) for perlin-like shake
const noise = (t: number, seed: number) =>
	(Math.sin(t * 13.1 + seed) * 0.5 + Math.sin(t * 23.7 + seed * 2.3) * 0.3 + Math.sin(t * 41.3 + seed * 4.1) * 0.2);

const useLayoutBlend = (frame: number, fps: number) => {
	// returns (from, to, progress) for the current frame
	let idx = segs.findIndex((s) => frame / fps < s.out_out);
	if (idx < 0) idx = segs.length - 1;
	const cur = segs[idx];
	const prev = segs[Math.max(0, idx - 1)];
	// layout of previous *different* segment, for transition
	let from: Layout = cur.layout;
	let start = 0;
	for (let i = idx; i > 0; i--) {
		if (segs[i - 1].layout !== segs[i].layout) {
			from = segs[i - 1].layout;
			start = segs[i].out_in;
			break;
		}
		if (segs[i - 1].layout === cur.layout) continue;
	}
	void prev;
	const p =
		from === cur.layout
			? 1
			: spring({frame: frame - start * fps, fps, config: {damping: 15, stiffness: 170, mass: 0.7}});
	const speed = from === cur.layout ? 0 : Math.abs(spring({frame: frame - start * fps, fps, config: {damping: 15, stiffness: 170, mass: 0.7}}) - spring({frame: frame - 1 - start * fps, fps, config: {damping: 15, stiffness: 170, mass: 0.7}}));
	return {from, to: cur.layout, p, speed, start};
};

const View: React.FC<{dst: Rect; src: Rect; zoom: number; focus: [number, number]; shake: [number, number]; blur: number}> = ({dst, src, zoom, focus, shake, blur}) => {
	// zoom shrinks the src rect around focus point
	const [sx, sy, sw, sh] = src;
	const fx = sx + sw * focus[0];
	const fy = sy + sh * focus[1];
	const w = sw / zoom;
	const h = sh / zoom;
	const x = fx - (fx - sx) / zoom;
	const y = fy - (fy - sy) / zoom;
	const s = Math.max(dst[2] / w, dst[3] / h);
	const ox = (dst[2] - w * s) / 2;
	const oy = (dst[3] - h * s) / 2;
	return (
		<div style={{position: 'absolute', left: dst[0], top: dst[1], width: dst[2], height: dst[3], overflow: 'hidden'}}>
			<OffthreadVideo
				src={staticFile('master.mp4')}
				muted
				style={{
					position: 'absolute',
					left: -x * s + ox + shake[0],
					top: -y * s + oy + shake[1],
					width: SRC_W * s,
					height: SRC_H * s,
					maxWidth: 'none',
					filter: `contrast(1.06) saturate(1.1) brightness(1.02)${blur > 0.3 ? ` blur(${blur}px)` : ''}`,
				}}
			/>
		</div>
	);
};

const Word: React.FC<{w: (typeof words)[number]; t: number; fps: number}> = ({w, t, fps}) => {
	const local = (t - w.s) * fps;
	const shout = w.flags.includes('shout');
	// pop: 0.6 -> 1.1 -> 1.0 in ~6-8 frames (at 60fps: 9 frames)
	const pop = interpolate(local, [0, 5, 10], [0.6, 1.1, 1.0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
	const grow = shout ? interpolate(local, [0, 14], [1, 1.3], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}) : 1;
	const sh = shout ? interpolate(local, [0, 30], [11, 4], {extrapolateRight: 'clamp'}) : 0;
	const dx = noise(t, 1) * sh;
	const dy = noise(t, 7) * sh;
	let text = w.text;
	if (w.flags.includes('stretch')) {
		// letters appear across the sound's duration ("ОПААА" grows as he drags it)
		const prog = interpolate(t, [w.s, Math.max(w.e, w.s + 0.1)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		if (text.includes('-')) {
			// laugh: reveal by syllables ("ХА" → "ХА-ХА" → "ХА-ХА-ХА")
			const parts = text.split('-');
			const n = Math.max(1, Math.ceil(prog * parts.length));
			text = parts.slice(0, n).join('-');
		} else {
			const min = Math.min(2, text.length);
			const n = Math.round(lerp(min, text.length, prog));
			text = text.slice(0, n);
		}
	}
	const fullLen = w.text.length;
	const size = Math.min(118, 880 / (fullLen * 0.82));
	const color = EMO[w.emotion] ?? '#fff';
	const common: React.CSSProperties = {
		fontFamily: FONT,
		fontWeight: 900,
		fontSize: size,
		lineHeight: 1,
		whiteSpace: 'nowrap',
		position: 'absolute',
		left: 0,
		top: 0,
		transform: 'translate(-50%, -50%)',
		letterSpacing: '-0.01em',
	};
	return (
		<div style={{position: 'absolute', left: 540 + dx, top: dy, transform: `scale(${pop * grow})`}}>
			<span style={{...common, color: OUTLINE, WebkitTextStroke: `20px ${OUTLINE}`, textShadow: `0 10px 24px rgba(11,21,48,0.55)`}}>{text}</span>
			<span style={{...common, color}}>{text}</span>
		</div>
	);
};

export const Main: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const L = useLayoutBlend(frame, fps);

	const cam = {dst: lerpRect(CAM[L.from].dst, CAM[L.to].dst, L.p), src: lerpRect(CAM[L.from].src, CAM[L.to].src, L.p)};
	const game = {dst: lerpRect(GAME[L.from].dst, GAME[L.to].dst, L.p), src: lerpRect(GAME[L.from].src, GAME[L.to].src, L.p)};
	const whipBlur = L.to === 'game_full' ? L.speed * 60 : L.speed * 25;

	// --- camera moves on the webcam
	const seg = (id: string) => segs.find((s) => s.id === id)!;
	const hook = spring({frame, fps, config: {damping: 14, stiffness: 120}});
	let camZoom = lerp(1.14, 1.0, hook);
	const frz = seg('FRZ');
	camZoom *= interpolate(t, [frz.out_in, frz.out_out], [1, 1.1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
	const e1 = seg('E1');
	if (t >= e1.out_in && t < seg('F').out_in) {
		const pf = (t - e1.out_in) * fps;
		const punch = spring({frame: pf, fps, config: {damping: 9, stiffness: 260}});
		camZoom = lerp(1.1, 1.2, punch) + interpolate(pf, [0, 4, 16], [0, 0.08, 0], {extrapolateRight: 'clamp'});
	}
	const f = seg('F');
	if (t >= f.out_in) camZoom = interpolate(t, [f.out_in, f.out_out], [1.0, 1.08], {easing: Easing.inOut(Easing.cubic)});

	// --- game camera: slow push to the target in slow-mo, shake on the shot
	const gameZoom = 1;
	const shotAmp = t >= ev.shot ? interpolate(t - ev.shot, [0, 0.5], [16, 3], {extrapolateRight: 'clamp'}) : 0;
	const gShake: [number, number] = [noise(t * 1.7, 3) * shotAmp, noise(t * 1.7, 9) * shotAmp];

	// --- subtitles
	let wi = -1;
	for (let i = 0; i < subWords.length; i++) if (t >= subWords[i].s) wi = i;
	let cur = wi >= 0 ? subWords[wi] : null;
	if (cur) {
		const next = subWords[wi + 1];
		const until = next ? next.s : ev.toast - 0.03;
		const last = !next;
		if (last && t > until) cur = null;
	}
	const subY = lerp(SUB_Y[L.from], SUB_Y[L.to], L.p);

	return (
		<AbsoluteFill style={{backgroundColor: '#0B1530'}}>
			{/* blurred game behind everything (visible in cam_full) */}
			<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
				<OffthreadVideo
					src={staticFile('master.mp4')}
					muted
					style={{position: 'absolute', left: -540, top: -180, width: 2160, height: 3840, maxWidth: 'none', filter: 'blur(28px) brightness(0.55) saturate(1.2)'}}
				/>
			</div>
			<View dst={game.dst} src={game.src} zoom={gameZoom} focus={[0.5, 0.62]} shake={gShake} blur={whipBlur} />
			<View dst={cam.dst} src={cam.src} zoom={camZoom} focus={[0.58, 0.3]} shake={[0, 0]} blur={L.to === 'game_full' ? whipBlur : 0} />
			{/* soft shadow on the cam/game seam so the cut reads as one design */}
			{L.to === 'game_full' && L.p > 0.95 ? null : (
				<div style={{position: 'absolute', left: 0, width: 1080, top: cam.dst[1] + cam.dst[3] - 2, height: 26, background: 'linear-gradient(rgba(11,21,48,0.45), rgba(11,21,48,0))'}} />
			)}
			<MicMute t={t} start={chatWords[2].s - 0.04} slashAt={chatWords[3].s} exit={chatEnd} />
			<MicMute t={t} start={ev.micro - 0.04} slashAt={ev.micro + 0.11} exit={seg('F').out_in} />
			{cur ? (
				<div style={{position: 'absolute', left: 0, top: subY, width: 1080}}>
					<Word w={cur} t={t} fps={fps} />
				</div>
			) : null}
			<ChatCard t={t} words={chatWords} exit={chatEnd - 0.05} y={768} />
			<XpToast t={t} start={ev.toast} top={1150} />
			{/* grade: vignette + grain (8 pre-rendered PNGs) */}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 55%, rgba(5,8,25,0.38) 100%)'}} />
			<Img src={staticFile(`grain/${Math.floor(frame / 2) % 8}.png`)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, mixBlendMode: 'overlay'}} />
		</AbsoluteFill>
	);
};
