import React from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, comicText, FONT} from '../theme';

export type SubWord = {
	text: string;
	at: number; // кадр ролика, когда слово выскакивает
	color: string;
	size: number;
	shake: boolean;
	censored: boolean;
};

export type SubEvent = {from: number; to: number; words: SubWord[]};

// Поп-ап ~150 мс: 0 → 115% → 100%
const popScale = (f: number, fps: number) => {
	const d = Math.round(fps * 0.15);
	return interpolate(f, [0, d * 0.6, d], [0, 1.15, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

/** Цензура мата: слово закрыто плашкой с уткой, синхронно со слотом «кря». */
export const CensorDuck: React.FC<{size: number}> = ({size}) => (
	<span
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			justifyContent: 'center',
			background: COLORS.yellow,
			border: `6px solid ${COLORS.black}`,
			boxShadow: `6px 7px 0 ${COLORS.black}`,
			borderRadius: 16,
			padding: '0 22px',
			height: size * 1.05,
			fontSize: size * 0.8,
			fontFamily: "'Noto Color Emoji'",
			lineHeight: 1,
		}}
	>
		🦆
	</span>
);

/** Пословные субтитры: слова фразы выскакивают по таймкодам. */
export const Subtitles: React.FC<{events: SubEvent[]; centerY: number}> = ({events, centerY}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const ev = events.find((e) => frame >= e.from && frame < e.to);
	if (!ev) {
		return null;
	}
	return (
		<div
			style={{
				position: 'absolute',
				left: 40,
				right: 150, // правая зона интерфейса TikTok
				top: centerY,
				transform: 'translateY(-50%)',
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				alignItems: 'center',
				gap: '6px 24px',
				fontFamily: FONT,
			}}
		>
			{ev.words
				.filter((w) => frame >= w.at)
				.map((w, i) => {
					const s = popScale(frame - w.at, fps);
					const jx = w.shake ? (random(`sx${i}${frame}`) - 0.5) * 14 : 0;
					const jy = w.shake ? (random(`sy${i}${frame}`) - 0.5) * 14 : 0;
					return (
						<span key={i} style={{display: 'inline-block', transform: `translate(${jx}px, ${jy}px) scale(${s}) rotate(${(i % 2 ? 2 : -2)}deg)`}}>
							{w.censored ? <CensorDuck size={w.size} /> : <span style={comicText(w.color, w.size)}>{w.text}</span>}
						</span>
					);
				})}
		</div>
	);
};
