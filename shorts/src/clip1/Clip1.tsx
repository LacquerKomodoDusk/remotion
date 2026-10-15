import React from 'react';
import {AbsoluteFill, Audio, Freeze, interpolate, OffthreadVideo, random, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {Callout, ComicBurst, ComicRays, Counter, EmojiPop, FlashCut, HalftoneFrame, SpeedLines, TitleHook, Vignette} from '../components/Graphics';
import {SoundSlot, Sfx} from '../components/SoundSlot';
import {type SubEvent, Subtitles} from '../components/Subtitles';
import {TransitionWrap} from '../components/Transitions';
import {COLORS, H, W} from '../theme';
import {
	at,
	CENSOR,
	FPS,
	LAYOUT_SWITCHES,
	MAT_RANGES,
	OVERLAYS,
	PHRASE_HOLD_SEC,
	PHRASES,
	type Seg,
	SEG_START,
	segEnd,
	segLen,
	SEGS,
	SFX,
	SLOTS,
	TOTAL_FRAMES,
	transitionsFor,
	VOICE_RANGES,
} from './plan';

// Раскладка: вебка сверху (1080×777 ≈ 40%), игра снизу, кроп по центру
const SEAM = 776;
const GAME_SRC_H = 1308; // game.mp4: 1080×1308
const GAME_REGION_H = H - SEAM;
const CAM_SPLIT = {x: 0, y: 0, w: W, h: 777};
const CAM_FULL = {x: -189, y: 270, w: 1458, h: 1049};

const layoutProgress = (g: number) => {
	let p = 0;
	for (const sw of LAYOUT_SWITCHES) {
		if (g >= sw.at) {
			const from = p;
			const k = spring({frame: g - sw.at, fps: FPS, durationInFrames: 16, config: {damping: 11, stiffness: 160}});
			p = from + (sw.to - from) * k;
		}
	}
	return p;
};

// 1 внутри любого диапазона, линейный спад за пределами за `ramp` сек
const envelope = (t: number, ranges: [number, number][], ramp: number) =>
	Math.max(0, ...ranges.map(([a, b]) => (t >= a && t <= b ? 1 : Math.max(0, 1 - Math.min(Math.abs(t - a), Math.abs(t - b)) / ramp))));

// Предкадры входа: сцена начинает рисоваться раньше, поверх уходящей
const preroll = (seg: Seg) => {
	const {enter} = transitionsFor(seg.id);
	return enter.type === 'none' ? 0 : enter.frames;
};

const SegmentView: React.FC<{seg: Seg; pre: number}> = ({seg, pre}) => {
	const frame = useCurrentFrame() - pre;
	const g = SEG_START[seg.id] + frame;
	const len = segLen(seg);
	const p = layoutProgress(g);
	const lerp = (a: number, b: number) => a + (b - a) * p;
	const cam = {x: lerp(CAM_SPLIT.x, CAM_FULL.x), y: lerp(CAM_SPLIT.y, CAM_FULL.y), w: lerp(CAM_SPLIT.w, CAM_FULL.w), h: lerp(CAM_SPLIT.h, CAM_FULL.h)};

	const [z0, z1] = seg.gameZoom;
	const gameZoom =
		Math.abs(z1 - z0) > 0.1
			? z0 + (z1 - z0) * spring({frame: Math.max(0, frame), fps: FPS, durationInFrames: 14, config: {damping: 12, stiffness: 200}})
			: interpolate(frame, [0, len], [z0, z1]);
	const [ox, oy] = seg.zoomOrigin ?? [0.5, 0.5];
	const [c0, c1] = seg.camZoom ?? [1, 1];
	const camZoom = seg.id === 'react2' ? c0 + (c1 - c0) * spring({frame: frame - 14, fps: FPS, durationInFrames: 12, config: {damping: 10}}) : interpolate(frame, [0, len], [c0, c1]);

	const trim = Math.max(0, Math.round(seg.src[0] * FPS - pre * seg.rate));
	const video = (file: string, style: React.CSSProperties) => {
		const v = <OffthreadVideo src={staticFile(file)} trimBefore={trim} playbackRate={seg.rate} muted style={style} />;
		return seg.freezeSec !== undefined ? <Freeze frame={0}>{v}</Freeze> : v;
	};
	const {enter, exit} = transitionsFor(seg.id);

	return (
		<TransitionWrap id={seg.id} logicalFrame={frame} durationInFrames={len} enter={enter} exit={exit}>
			<AbsoluteFill style={{background: COLORS.black}}>
				{/* Игра */}
				<div style={{position: 'absolute', left: 0, top: SEAM, width: W, height: GAME_REGION_H, overflow: 'hidden'}}>
					{video('game.mp4', {
						position: 'absolute',
						left: 0,
						top: -(GAME_SRC_H - GAME_REGION_H) / 2,
						width: W,
						height: GAME_SRC_H,
						transform: `scale(${gameZoom})`,
						transformOrigin: `${ox * 100}% ${oy * 100}%`,
					})}
				</div>
				{/* Лучи за вебкой, когда она на весь экран */}
				{p > 0.01 ? <ComicRays opacity={Math.min(1, p * 1.4)} /> : null}
				{/* Вебка */}
				<div
					style={{
						position: 'absolute',
						left: cam.x,
						top: cam.y,
						width: cam.w,
						height: p < 0.01 ? SEAM : cam.h,
						overflow: 'hidden',
						outline: p > 0.01 ? `${Math.round(10 * p)}px solid ${COLORS.black}` : undefined,
						boxShadow: p > 0.01 ? `0 0 0 ${Math.round(10 * p)}px ${COLORS.black}, ${16 * p}px ${18 * p}px 0 ${Math.round(10 * p)}px ${COLORS.black}` : undefined,
						transform: `rotate(${-2 * p}deg)`,
					}}
				>
					{video('webcam.mp4', {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${camZoom})`, transformOrigin: '50% 38%'})}
				</div>
			</AbsoluteFill>
		</TransitionWrap>
	);
};

const SegmentAudio: React.FC<{seg: Seg}> = ({seg}) => {
	if (seg.freezeSec !== undefined) {
		return null;
	}
	const trim = Math.round(seg.src[0] * FPS);
	const srcTime = (f: number) => seg.src[0] + (f / FPS) * seg.rate;
	return (
		<>
			<Audio src={staticFile('voice.wav')} trimBefore={trim} playbackRate={seg.rate} volume={(f) => 1 - envelope(srcTime(f), MAT_RANGES, 0.015)} />
			<Audio src={staticFile('game.wav')} trimBefore={trim} playbackRate={seg.rate} volume={(f) => (1 - 0.5 * envelope(srcTime(f), VOICE_RANGES, 0.08)) * (1 - envelope(srcTime(f), MAT_RANGES, 0.015))} />
		</>
	);
};

const COLOR_OF = {white: COLORS.white, yellow: COLORS.yellow, red: COLORS.red, green: COLORS.green, blue: COLORS.blue};

const SUB_EVENTS: SubEvent[] = SEGS.filter((s) => s.freezeSec === undefined).flatMap((s) =>
	PHRASES.flatMap((phrase) => {
		const visible = phrase.filter((w) => w.start < s.src[1] && w.end > s.src[0]);
		if (visible.length === 0) {
			return [];
		}
		const from = Math.max(SEG_START[s.id], at(s.id, visible[0].start));
		const last = phrase[phrase.length - 1];
		const {exit} = transitionsFor(s.id);
		// субтитр не уезжает в следующую сцену: гаснет к началу перехода
		const to = Math.min(segEnd(s.id) - (exit.type === 'none' ? 0 : exit.frames), at(s.id, last.end + PHRASE_HOLD_SEC));
		return [
			{
				from,
				to,
				words: visible.map((w) => ({
					text: w.text,
					at: w.start < s.src[0] ? from - 100 : at(s.id, w.start),
					color: COLOR_OF[w.style.color],
					size: w.style.size,
					shake: w.style.shake,
					censored: CENSOR && w.mat,
				})),
			},
		];
	}),
);

const anchorFrame = ([id, src]: [string, number]) => at(id, src);

export const Clip1: React.FC = () => {
	const frame = useCurrentFrame();
	// Тряска экрана (до ~0,5 сек)
	const shake = OVERLAYS.reduce(
		(acc, o) => {
			if (o.kind !== 'shake') {
				return acc;
			}
			const a = anchorFrame(o.from);
			const b = anchorFrame(o.to);
			if (frame < a || frame >= b) {
				return acc;
			}
			const decay = interpolate(frame, [a, b], [1, 0.3]);
			return {x: (random(`shx${frame}`) - 0.5) * 2 * o.intensity * decay, y: (random(`shy${frame}`) - 0.5) * 2 * o.intensity * decay};
		},
		{x: 0, y: 0},
	);

	return (
		<AbsoluteFill style={{background: COLORS.black}}>
			<AbsoluteFill style={{transform: `translate(${shake.x}px, ${shake.y}px) scale(${shake.x || shake.y ? 1.03 : 1})`}}>
				{SEGS.map((s) => {
					// у хука нет предыдущей сцены: его вход проигрывается в конце ролика (луп)
					const pre = s.id === SEGS[0].id ? 0 : preroll(s);
					return (
						<Sequence key={s.id} from={SEG_START[s.id] - pre} durationInFrames={segLen(s) + pre} name={s.id}>
							<SegmentView seg={s} pre={pre} />
						</Sequence>
					);
				})}
				<Sequence from={TOTAL_FRAMES - preroll(SEGS[0])} durationInFrames={preroll(SEGS[0])} name="loop:hook">
					<SegmentView seg={SEGS[0]} pre={preroll(SEGS[0])} />
				</Sequence>
			</AbsoluteFill>

			{OVERLAYS.map((o, i) => {
				switch (o.kind) {
					case 'title':
						return (
							<Sequence key={i} from={o.from} durationInFrames={o.to - o.from} name="title">
								<TitleHook before={o.before} keyword={o.keyword} keywordColor={COLORS.yellow} y={610} durationInFrames={o.to - o.from} />
							</Sequence>
						);
					case 'burst': {
						const d = Math.round(o.sec * FPS);
						return (
							<Sequence key={i} from={anchorFrame(o.at)} durationInFrames={d} name={`burst:${o.text}`}>
								<ComicBurst text={o.text} color={o.color === 'red' ? COLORS.red : o.color === 'blue' ? COLORS.blue : COLORS.yellow} x={o.x} y={o.y} rotation={o.rot} size={o.size} durationInFrames={d} />
							</Sequence>
						);
					}
					case 'callout': {
						const a = anchorFrame(o.from);
						const d = anchorFrame(o.to) - a;
						return (
							<Sequence key={i} from={a} durationInFrames={d} name={`callout:${o.text}`}>
								<Callout text={o.text} x={o.x} y={o.y} rotation={o.rot} durationInFrames={d} />
							</Sequence>
						);
					}
					case 'emoji': {
						const d = Math.round(o.sec * FPS);
						return (
							<Sequence key={i} from={anchorFrame(o.at)} durationInFrames={d} name={`emoji:${o.emoji}`}>
								<EmojiPop emoji={o.emoji} x={o.x} y={o.y} size={o.size} durationInFrames={d} />
							</Sequence>
						);
					}
					case 'counter': {
						const a = anchorFrame(o.from);
						const d = anchorFrame(o.to) - a;
						return (
							<Sequence key={i} from={a} durationInFrames={d} name="counter">
								<Counter label={o.label} steps={o.steps.map((s) => ({frame: anchorFrame(s.at) - a, value: s.value}))} color={COLORS.red} x={o.x} y={o.y} durationInFrames={d} />
							</Sequence>
						);
					}
					case 'vignette': {
						const a = anchorFrame(o.from);
						const d = anchorFrame(o.to) - a;
						return (
							<Sequence key={i} from={a} durationInFrames={d} name="vignette">
								<Vignette color={o.color} strength={o.strength} pulse={o.pulse} durationInFrames={d} />
							</Sequence>
						);
					}
					case 'speedLines': {
						const a = anchorFrame(o.from);
						const d = anchorFrame(o.to) - a;
						return (
							<Sequence key={i} from={a} durationInFrames={d} name="speedLines">
								<SpeedLines cx={o.cx} cy={o.cy} durationInFrames={d} />
							</Sequence>
						);
					}
					case 'flash':
						return (
							<Sequence key={i} from={anchorFrame(o.at)} durationInFrames={8} name="flash">
								<FlashCut />
							</Sequence>
						);
					case 'halftone':
						return (
							<Sequence key={i} from={SEG_START[o.seg]} durationInFrames={segLen(SEGS.find((s) => s.id === o.seg)!)} name="halftone">
								<HalftoneFrame />
							</Sequence>
						);
					default:
						return null;
				}
			})}

			<Subtitles events={SUB_EVENTS} centerY={1440} />

			{SEGS.map((s) => (
				<Sequence key={`a-${s.id}`} from={SEG_START[s.id]} durationInFrames={segLen(s)} layout="none" name={`audio:${s.id}`}>
					<SegmentAudio seg={s} />
				</Sequence>
			))}
			{SFX.map((c, i) => (
				<Sfx key={i} file={c.file} from={c.frame} relDb={c.relDb} />
			))}
			{SLOTS.map((s) => (
				<SoundSlot key={s.name} slot={{name: s.name, expectedFile: s.expectedFile, description: s.description, from: s.from, durationInFrames: s.durationInFrames, relDb: s.relDb}} />
			))}
		</AbsoluteFill>
	);
};
