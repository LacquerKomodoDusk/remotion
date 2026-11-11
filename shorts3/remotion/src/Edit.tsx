import React from 'react';
import {AbsoluteFill, Easing, Freeze, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Concept} from './Concepts';

import {FONT, NAVY, SRC_W, SRC_H} from './theme';
export {FONT, NAVY, SRC_W, SRC_H};
loadFont({family: FONT, url: staticFile('fonts/Unbounded-Black.woff2'), weight: '900'});
loadFont({family: FONT, url: staticFile('fonts/Unbounded-Black-latin.woff2'), weight: '900'});

// §3.2 — channel emotion palette (identical in every video)
export const EMO: Record<string, string> = {
	neutral: '#FFFFFF',
	confident: '#5AC8FF',
	panic: '#FFD23F',
	anger: '#FF3B3B',
	joy: '#7CFF6B',
	irony: '#B69CFF',
};

export type Layout = 'split' | 'cam_full' | 'game_full';
type Rect = [number, number, number, number];
export type Word = {text: string; s: number; e: number; emotion: string; flags: string[]};
export type Cfg = {
	dur: number;
	concept: string;
	words: Word[];
	layouts: [number, Layout][];
	gameFull: Rect;
	gameKeys: [number, number, number, number][];
	punches: [number, 'cam' | 'game', number][];
	shake?: [number, number, number][];
	// optional per-video tools: hold a source frame on the game view, grade the game, white flashes
	freezes?: [number, number, number][];
	grades?: [number, number, string][];
	flashes?: [number, number][];
	punch: {t: number};
	[k: string]: unknown;
};

// Source layout: webcam box y 0–520 with the channel overlay logo at y≥410 (always cropped out),
// game from y≈548 (compass 565–600, HUD at the bottom).
const CAM: Record<Layout, {dst: Rect; src: Rect}> = {
	split: {dst: [0, 0, 1080, 768], src: [196, 12, 548, 390]},
	cam_full: {dst: [0, 150, 1080, 1116], src: [281, 12, 378, 390]},
	game_full: {dst: [0, -820, 1080, 768], src: [196, 12, 548, 390]},
};
const gameRects = (cfg: Cfg): Record<Layout, {dst: Rect; src: Rect}> => ({
	split: {dst: [0, 768, 1080, 1152], src: [0, 604, 918, 979]},
	cam_full: {dst: [0, 1266, 1080, 654], src: [0, 760, 918, 556]},
	game_full: {dst: [0, 0, 1080, 1920], src: cfg.gameFull},
});
export const SUB_Y: Record<Layout, number> = {split: 768, cam_full: 1400, game_full: 470};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => [0, 1, 2, 3].map((i) => lerp(a[i], b[i], t)) as Rect;
export const noise = (t: number, seed: number) => Math.sin(t * 13.1 + seed) * 0.5 + Math.sin(t * 23.7 + seed * 2.3) * 0.3 + Math.sin(t * 41.3 + seed * 4.1) * 0.2;
const SPR = {damping: 15, stiffness: 170, mass: 0.7};

export const useLayout = (cfg: Cfg, t: number, fps: number) => {
	let idx = 0;
	for (let i = 0; i < cfg.layouts.length; i++) if (t >= cfg.layouts[i][0]) idx = i;
	const [start, to] = cfg.layouts[idx];
	const from = idx > 0 ? cfg.layouts[idx - 1][1] : to;
	const f = (t - start) * fps;
	const p = from === to ? 1 : spring({frame: f, fps, config: SPR});
	const speed = from === to ? 0 : Math.abs(p - spring({frame: f - 1, fps, config: SPR}));
	return {from, to, p, speed, start};
};

const View: React.FC<{src: string; dst: Rect; srcRect: Rect; zoom: number; focus: [number, number]; shake: [number, number]; blur: number; grade?: string}> = ({src, dst, srcRect, zoom, focus, shake, blur, grade = ''}) => {
	const [sx, sy, sw, sh] = srcRect;
	const fx = sx + sw * focus[0];
	const fy = sy + sh * focus[1];
	const w = sw / zoom;
	const h = sh / zoom;
	const x = fx - (fx - sx) / zoom;
	const y = fy - (fy - sy) / zoom;
	// cover-fit: transitional rects never reveal pixels outside the crop (overlay logo stays out)
	const s = Math.max(dst[2] / w, dst[3] / h);
	const ox = (dst[2] - w * s) / 2;
	const oy = (dst[3] - h * s) / 2;
	return (
		<div style={{position: 'absolute', left: dst[0], top: dst[1], width: dst[2], height: dst[3], overflow: 'hidden'}}>
			<OffthreadVideo
				src={src}
				muted
				style={{
					position: 'absolute',
					left: -x * s + ox + shake[0],
					top: -y * s + oy + shake[1],
					width: SRC_W * s,
					height: SRC_H * s,
					maxWidth: 'none',
					filter: `contrast(1.06) saturate(1.08) brightness(1.02)${grade ? ` ${grade}` : ''}${blur > 0.3 ? ` blur(${blur}px)` : ''}`,
				}}
			/>
		</div>
	);
};

const WordView: React.FC<{w: Word; t: number; fps: number}> = ({w, t, fps}) => {
	const local = (t - w.s) * fps;
	const shout = w.flags.includes('shout');
	const pop = interpolate(local, [0, 5, 10], [0.6, 1.1, 1.0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
	const grow = shout ? interpolate(local, [0, 14], [1, 1.35], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}) : 1;
	const sh = shout ? interpolate(local, [0, 40], [12, 5], {extrapolateRight: 'clamp'}) : 0;
	let text = w.text;
	if (w.flags.includes('stretch')) {
		const prog = interpolate(t, [w.s, Math.max(w.e, w.s + 0.1)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		if (text.includes('-')) {
			const parts = text.split('-');
			text = parts.slice(0, Math.max(1, Math.ceil(prog * parts.length))).join('-');
		} else {
			text = text.slice(0, Math.round(lerp(Math.min(2, text.length), text.length, prog)));
		}
	}
	const size = Math.min(118, 880 / (w.text.length * 0.82 * (shout ? 1.35 : 1)));
	const common: React.CSSProperties = {fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap', position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)', letterSpacing: '-0.01em'};
	return (
		<div style={{position: 'absolute', left: 540 + noise(t, 1) * sh, top: noise(t, 7) * sh, transform: `scale(${pop * grow})`}}>
			<span style={{...common, color: NAVY, WebkitTextStroke: `20px ${NAVY}`, textShadow: '0 10px 24px rgba(11,21,48,0.55)'}}>{text}</span>
			<span style={{...common, color: EMO[w.emotion] ?? '#fff'}}>{text}</span>
		</div>
	);
};

export const Edit: React.FC<{cfg: Cfg; video: string}> = ({cfg, video}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const src = staticFile(video);
	const L = useLayout(cfg, t, fps);
	const G = gameRects(cfg);
	const cam = {dst: lerpRect(CAM[L.from].dst, CAM[L.to].dst, L.p), src: lerpRect(CAM[L.from].src, CAM[L.to].src, L.p)};
	const game = {dst: lerpRect(G[L.from].dst, G[L.to].dst, L.p), src: lerpRect(G[L.from].src, G[L.to].src, L.p)};
	const whip = L.to === 'game_full' || L.from === 'game_full' ? L.speed * 45 : 0;

	// punch-ins (zoom punch) on cam or game
	let camZoom = lerp(1.12, 1.0, spring({frame, fps, config: {damping: 14, stiffness: 120}}));
	let gamePunch = 0;
	for (const [pt, target, amp] of cfg.punches) {
		const pf = (t - pt) * fps;
		if (pf < 0) continue;
		const v = interpolate(pf, [0, 4, 22], [0, amp, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		if (target === 'cam') camZoom += v;
		else gamePunch += v;
	}
	// game push-ins: keyframes [t, zoom, fx, fy], eased between keys
	const K = cfg.gameKeys;
	let gz = 1;
	let gf: [number, number] = [0.5, 0.5];
	if (K.length) {
		if (t <= K[0][0]) {
			gz = K[0][1];
			gf = [K[0][2], K[0][3]];
		} else if (t >= K[K.length - 1][0]) {
			const k = K[K.length - 1];
			gz = k[1];
			gf = [k[2], k[3]];
		} else {
			for (let i = 0; i < K.length - 1; i++) {
				if (t >= K[i][0] && t < K[i + 1][0]) {
					const q = Easing.inOut(Easing.cubic)((t - K[i][0]) / (K[i + 1][0] - K[i][0]));
					gz = lerp(K[i][1], K[i + 1][1], q);
					gf = [lerp(K[i][2], K[i + 1][2], q), lerp(K[i][3], K[i + 1][3], q)];
				}
			}
		}
	}
	let amp = 0;
	for (const [a, b, m] of cfg.shake ?? []) if (t >= a && t < b) amp = Math.max(amp, interpolate(t, [a, b], [m, 2]));
	const shake: [number, number] = [noise(t * 1.6, 3) * amp, noise(t * 1.6, 9) * amp];

	// subtitles: one word at a time, word holds until the next one starts; last word ≥0.7 s
	let cur: Word | null = null;
	for (let i = 0; i < cfg.words.length; i++) {
		const w = cfg.words[i];
		const next = cfg.words[i + 1];
		const until = next && next.s - w.e < 1.6 ? next.s : Math.max(w.e + 0.5, w.s + 0.7);
		if (t >= w.s && t < until) cur = w;
	}
	const subY = lerp(SUB_Y[L.from], SUB_Y[L.to], L.p);
	const fr = (cfg.freezes ?? []).find(([a, b]) => t >= a && t < b);
	const grade = (cfg.grades ?? []).filter(([a, b]) => t >= a && t < b).map((g) => g[2]).join(' ');
	let flash = 0;
	for (const [ft, m] of cfg.flashes ?? []) {
		const ff = (t - ft) * fps;
		if (ff >= 0 && ff < 12) flash = Math.max(flash, m * interpolate(ff, [0, 12], [1, 0], {easing: Easing.out(Easing.quad)}));
	}

	return (
		<AbsoluteFill style={{backgroundColor: NAVY}}>
			<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
				<OffthreadVideo src={src} muted style={{position: 'absolute', left: -540, top: -200, width: 2160, height: 3840, maxWidth: 'none', filter: 'blur(28px) brightness(0.5) saturate(1.2)'}} />
			</div>
			{fr ? (
				<Freeze frame={Math.round(fr[2] * fps)}>
					<View src={src} dst={game.dst} srcRect={game.src} zoom={gz + gamePunch} focus={gf} shake={shake} blur={whip} grade={grade} />
				</Freeze>
			) : (
				<View src={src} dst={game.dst} srcRect={game.src} zoom={gz + gamePunch} focus={gf} shake={shake} blur={whip} grade={grade} />
			)}
			<View src={src} dst={cam.dst} srcRect={cam.src} zoom={camZoom} focus={[0.5, 0.32]} shake={[shake[0] * 0.5, shake[1] * 0.5]} blur={L.to === 'game_full' ? whip : 0} />
			{L.to === 'game_full' && L.p > 0.95 ? null : (
				<div style={{position: 'absolute', left: 0, width: 1080, top: cam.dst[1] + cam.dst[3] - 2, height: 26, background: 'linear-gradient(rgba(11,21,48,0.45), rgba(11,21,48,0))'}} />
			)}
			<Concept cfg={cfg} t={t} fps={fps} layout={L} video={src} />
			{cur ? (
				<div style={{position: 'absolute', left: 0, top: subY, width: 1080}}>
					<WordView w={cur} t={t} fps={fps} />
				</div>
			) : null}
			{flash > 0.01 ? <AbsoluteFill style={{background: '#FFFFFF', opacity: flash}} /> : null}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 55%, rgba(5,8,25,0.36) 100%)'}} />
			<Img src={staticFile(`grain/${Math.floor(frame / 2) % 8}.png`)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, mixBlendMode: 'overlay'}} />
		</AbsoluteFill>
	);
};
