import {Easing, interpolate, spring} from 'remotion';

// Palette: 4 colours for the whole film (sampled from the chair, see work/concept.md)
export const C = {
	ink: '#141314',
	graphite: '#3A3739',
	bone: '#ECE8E2',
	ember: '#FF6B2C',
} as const;

export const FONT_HEAD = 'Unbounded';
export const FONT_TEXT = 'Manrope';

// Reels safe zone
export const SAFE = {left: 64, right: 960, top: 220, bottom: 1500} as const;

// One motion language: spring / easeOutExpo in (10-12f), easeInCubic out (7f)
export const IN_FRAMES = 11;
export const OUT_FRAMES = 7;
export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const enter = (frame: number, fps: number, from: number) =>
	spring({frame: frame - from, fps, config: {damping: 16, mass: 0.7, stiffness: 170}});

// 0 -> 1 during the entry, 1 -> 0 during the exit (exit is faster than entry)
export const life = (frame: number, fps: number, from: number, to: number) => {
	const inV = enter(frame, fps, from);
	const outV = interpolate(frame, [to - OUT_FRAMES, to], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: easeIn,
	});
	return Math.min(inV, outV);
};

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
