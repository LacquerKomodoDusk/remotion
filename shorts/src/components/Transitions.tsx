import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import {W} from '../theme';

// Переходы между сценами: 4–10 кадров при 30 fps (вдвое больше при 60). Без медленных растворений.
export type TransitionSpec =
	| {type: 'whip'; direction: 'left' | 'right'; frames: number}
	| {type: 'zoomPunch'; frames: number; originX: number; originY: number}
	| {type: 'none'};

const ease = Easing.bezier(0.7, 0, 0.3, 1);

/**
 * Оборачивает сцену. Вход идёт на «предкадрах» (logicalFrame < 0), пока предыдущая сцена ещё на экране и уходит —
 * поэтому стык без чёрных кадров. Вуш: сдвиг со смазом движения. Зум-пробой: уходящий кадр влетает в точку,
 * следующий вылетает из неё.
 */
export const TransitionWrap: React.FC<{
	id: string;
	logicalFrame: number;
	durationInFrames: number;
	enter: TransitionSpec;
	exit: TransitionSpec;
	children: React.ReactNode;
}> = ({id, logicalFrame: frame, durationInFrames, enter, exit, children}) => {
	let tx = 0;
	let scale = 1;
	let blurX = 0;
	let blur = 0;
	let origin = '50% 50%';

	if (enter.type !== 'none' && frame < 0) {
		const p = ease((frame + enter.frames + 1) / enter.frames);
		if (enter.type === 'whip') {
			const sign = enter.direction === 'left' ? 1 : -1; // входит с противоположной стороны
			tx = sign * W * (1 - p);
			blurX = 60 * (1 - p);
		} else {
			scale = interpolate(p, [0, 1], [0.15, 1]);
			blur = 10 * (1 - p);
			origin = `${enter.originX}px ${enter.originY}px`;
		}
	}
	const outStart = exit.type === 'none' ? Infinity : durationInFrames - exit.frames;
	if (exit.type !== 'none' && frame >= outStart) {
		const p = ease((frame - outStart + 1) / exit.frames);
		if (exit.type === 'whip') {
			const sign = exit.direction === 'left' ? -1 : 1;
			tx = sign * W * p;
			blurX = 60 * p;
		} else {
			scale = interpolate(p, [0, 1], [1, 3.2]);
			blur = 16 * p;
			origin = `${exit.originX}px ${exit.originY}px`;
		}
	}
	const filterId = `whip-${id}`;
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			{blurX > 0.5 ? (
				<svg width={0} height={0} style={{position: 'absolute'}}>
					<filter id={filterId} x="-20%" y="0" width="140%" height="100%">
						<feGaussianBlur stdDeviation={`${blurX} 0`} />
					</filter>
				</svg>
			) : null}
			<AbsoluteFill
				style={{
					transform: `translateX(${tx}px) scale(${scale})`,
					transformOrigin: origin,
					filter: [blurX > 0.5 ? `url(#${filterId})` : '', blur > 0.3 ? `blur(${blur}px)` : ''].join(' ') || undefined,
				}}
			>
				{children}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
