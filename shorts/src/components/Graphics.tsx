import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, comicText, FONT, H, W} from '../theme';

// Пружина появления: 6–10 кадров с перелётом; исчезновение быстрее (4 кадра)
const usePop = (durationInFrames: number, inFrames = 9, outFrames = 4) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const appear = spring({frame, fps, durationInFrames: inFrames, config: {damping: 9, stiffness: 180, mass: 0.6}});
	const disappear = interpolate(frame, [durationInFrames - outFrames, durationInFrames], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return {frame, scale: appear * disappear, opacity: disappear};
};

const shakeXY = (frame: number, intensity: number, seed: string) => ({
	x: (random(`${seed}x${frame}`) - 0.5) * 2 * intensity,
	y: (random(`${seed}y${frame}`) - 0.5) * 2 * intensity,
});

/** Плашка-заголовок хука: выскакивает с отскоком, ключевое слово подсвечено и покачивается. */
export const TitleHook: React.FC<{
	before: string;
	keyword: string;
	keywordColor: string;
	y: number;
	durationInFrames: number;
}> = ({before, keyword, keywordColor, y, durationInFrames}) => {
	const {frame, scale} = usePop(durationInFrames, 10, 5);
	const wobble = Math.sin(frame / 4) * 4;
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: y,
				display: 'flex',
				justifyContent: 'center',
				transform: `scale(${scale}) rotate(-3deg)`,
			}}
		>
			<div
				style={{
					background: COLORS.white,
					border: `7px solid ${COLORS.black}`,
					boxShadow: `10px 12px 0 ${COLORS.black}`,
					borderRadius: 18,
					padding: '18px 30px 22px',
					textAlign: 'center',
					maxWidth: 900,
				}}
			>
				<div style={{fontFamily: FONT, fontSize: 54, color: COLORS.black, lineHeight: 1.1}}>{before}</div>
				<div style={{display: 'inline-block', transform: `rotate(${wobble}deg) scale(${1 + Math.sin(frame / 5) * 0.04})`, marginTop: 6}}>
					<span style={comicText(keywordColor, 92, 11)}>{keyword}</span>
				</div>
			</div>
		</div>
	);
};

/** Комикс-звукоподражание во «взрыве» с лучами. */
export const ComicBurst: React.FC<{
	text: string;
	color: string;
	x: number;
	y: number;
	rotation: number;
	size: number;
	durationInFrames: number;
}> = ({text, color, x, y, rotation, size, durationInFrames}) => {
	const {frame, scale} = usePop(durationInFrames, 8, 4);
	const s = shakeXY(frame, 6, text);
	const points = Array.from({length: 24}, (_, i) => {
		const r = i % 2 === 0 ? 1 : 0.62 + random(`${text}${i}`) * 0.12;
		const a = (i / 24) * Math.PI * 2;
		return `${50 + Math.cos(a) * 50 * r},${50 + Math.sin(a) * 50 * r}`;
	}).join(' ');
	return (
		<div
			style={{
				position: 'absolute',
				left: x - size / 2 + s.x,
				top: y - size / 2 + s.y,
				width: size,
				height: size,
				transform: `scale(${scale}) rotate(${rotation}deg)`,
			}}
		>
			<svg viewBox="-4 -4 108 108" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				<polygon points={points} fill={COLORS.black} transform="translate(3 4)" />
				<polygon points={points} fill={color} stroke={COLORS.black} strokeWidth={2.4} strokeLinejoin="round" />
			</svg>
			<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
				<span style={comicText(COLORS.white, size * 0.27, size * 0.03)}>{text}</span>
			</div>
		</div>
	);
};

/** Подпись-наклейка: белая плашка, чёрная обводка, наклон. */
export const Callout: React.FC<{text: string; x: number; y: number; rotation: number; durationInFrames: number; size?: number}> = ({
	text,
	x,
	y,
	rotation,
	durationInFrames,
	size = 58,
}) => {
	const {scale} = usePop(durationInFrames, 9, 4);
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `scale(${scale}) rotate(${rotation}deg)`, transformOrigin: 'left center'}}>
			<div
				style={{
					background: COLORS.white,
					border: `6px solid ${COLORS.black}`,
					boxShadow: `8px 9px 0 ${COLORS.black}`,
					borderRadius: 14,
					padding: '12px 26px 16px',
					fontFamily: FONT,
					fontSize: size,
					color: COLORS.black,
					whiteSpace: 'nowrap',
				}}
			>
				{text}
			</div>
		</div>
	);
};

/** Эмодзи/стикер: поп-ап с отскоком и лёгким покачиванием. */
export const EmojiPop: React.FC<{emoji: string; x: number; y: number; size: number; durationInFrames: number}> = ({
	emoji,
	x,
	y,
	size,
	durationInFrames,
}) => {
	const {frame, scale} = usePop(durationInFrames, 8, 4);
	return (
		<div
			style={{
				position: 'absolute',
				left: x - size / 2,
				top: y - size / 2,
				fontSize: size,
				lineHeight: 1,
				fontFamily: "'Noto Color Emoji'",
				transform: `scale(${scale}) rotate(${Math.sin(frame / 5) * 8}deg)`,
				filter: `drop-shadow(6px 7px 0 ${COLORS.black})`,
			}}
		>
			{emoji}
		</div>
	);
};

/** Счётчик: цифра тикает с отскоком при каждой смене значения. */
export const Counter: React.FC<{
	label: string;
	steps: {frame: number; value: number}[]; // кадры относительно начала элемента
	color: string;
	x: number;
	y: number;
	durationInFrames: number;
}> = ({label, steps, color, x, y, durationInFrames}) => {
	const {frame, scale} = usePop(durationInFrames, 8, 4);
	const {fps} = useVideoConfig();
	const current = [...steps].reverse().find((s) => frame >= s.frame) ?? steps[0];
	const bump = spring({frame: frame - current.frame, fps, durationInFrames: 8, config: {damping: 7, stiffness: 220}});
	const tick = current === steps[0] ? 1 : 1.5 - 0.5 * bump;
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `scale(${scale}) rotate(-5deg)`, transformOrigin: 'left center', display: 'flex', alignItems: 'baseline', gap: 18}}>
			<span style={comicText(COLORS.white, 64, 8)}>{label}</span>
			<span style={{...comicText(color, 140, 14), display: 'inline-block', transform: `scale(${tick})`}}>{current.value}</span>
		</div>
	);
};

/** Радиальные линии скорости от точки. */
export const SpeedLines: React.FC<{cx: number; cy: number; durationInFrames: number; intensity?: number}> = ({cx, cy, durationInFrames, intensity = 1}) => {
	const frame = useCurrentFrame();
	const fade = interpolate(frame, [0, 3, durationInFrames - 4, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const lines = Array.from({length: 46}, (_, i) => {
		const a = (i / 46) * Math.PI * 2 + random(`a${i}${Math.floor(frame / 2)}`) * 0.08;
		const inner = 330 + random(`r${i}${Math.floor(frame / 2)}`) * 240;
		const outer = 1700;
		const w = 5 + random(`w${i}`) * 14;
		return {a, inner, outer, w};
	});
	return (
		<AbsoluteFill style={{opacity: fade * intensity, pointerEvents: 'none'}}>
			<svg width={W} height={H}>
				{lines.map(({a, inner, outer, w}, i) => {
					const x1 = cx + Math.cos(a) * inner;
					const y1 = cy + Math.sin(a) * inner;
					const x2 = cx + Math.cos(a) * outer;
					const y2 = cy + Math.sin(a) * outer;
					const nx = Math.cos(a + Math.PI / 2) * w;
					const ny = Math.sin(a + Math.PI / 2) * w;
					return <polygon key={i} points={`${x1},${y1} ${x2 + nx},${y2 + ny} ${x2 - nx},${y2 - ny}`} fill={COLORS.white} opacity={0.85} />;
				})}
			</svg>
		</AbsoluteFill>
	);
};

/** Виньетка: красная пульсирующая (ярость) или тёмная (напряжение/кринж). */
export const Vignette: React.FC<{color: string; strength: number; pulse: boolean; durationInFrames: number}> = ({color, strength, pulse, durationInFrames}) => {
	const frame = useCurrentFrame();
	const fade = interpolate(frame, [0, 6, durationInFrames - 4, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const p = pulse ? 0.75 + 0.25 * Math.sin(frame / 3) : 1;
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse at center, transparent 42%, ${color} 100%)`,
				opacity: fade * strength * p,
				pointerEvents: 'none',
			}}
		/>
	);
};

/** Вспышка: 1–2 белых кадра и быстрый спад. */
export const FlashCut: React.FC = () => {
	const frame = useCurrentFrame();
	const o = interpolate(frame, [0, 2, 6], [1, 1, 0], {extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{background: COLORS.white, opacity: o, pointerEvents: 'none'}} />;
};

/** Вращающиеся комикс-лучи (фон за вебкой на весь экран). */
export const ComicRays: React.FC<{opacity: number}> = ({opacity}) => {
	const frame = useCurrentFrame();
	const rays = 18;
	const stops = Array.from({length: rays}, (_, i) => {
		const a = (360 / rays) * i;
		const b = a + 360 / rays / 2;
		return `${COLORS.yellow} ${a}deg ${b}deg, #FF9F1C ${b}deg ${a + 360 / rays}deg`;
	}).join(', ');
	return (
		<AbsoluteFill style={{opacity, overflow: 'hidden'}}>
			<div
				style={{
					position: 'absolute',
					left: W / 2 - 1500,
					top: H / 2 - 1500,
					width: 3000,
					height: 3000,
					background: `conic-gradient(from ${frame * 0.8}deg, ${stops})`,
				}}
			/>
			<AbsoluteFill style={{backgroundImage: `radial-gradient(${COLORS.black}33 22%, transparent 24%)`, backgroundSize: '26px 26px'}} />
		</AbsoluteFill>
	);
};

/** Полутоновые точки + комикс-рамка (для стоп-кадра). */
export const HalftoneFrame: React.FC = () => {
	const frame = useCurrentFrame();
	const o = interpolate(frame, [0, 4], [0, 1], {extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{opacity: o, pointerEvents: 'none'}}>
			<AbsoluteFill style={{backgroundImage: `radial-gradient(${COLORS.black}55 25%, transparent 27%)`, backgroundSize: '14px 14px', mixBlendMode: 'multiply'}} />
			<AbsoluteFill style={{border: `22px solid ${COLORS.black}`, boxShadow: `inset 0 0 0 10px ${COLORS.white}`}} />
		</AbsoluteFill>
	);
};

export {shakeXY};
