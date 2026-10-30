import {Easing, spring} from 'remotion';

// Palette from the game frames + crash-test yellow as the accent
export const C = {
	ink: '#141210',
	wood: '#5D3625',
	parchment: '#CBBA8F',
	sky: '#8DBCF3',
	yellow: '#FFD21E',
	red: '#FF3B2F',
	blue: '#5FB4FF',
	green: '#5BE36B',
	white: '#FFFFFF',
} as const;

export const FONT_HEAD = 'Ruslan Display';
export const FONT_SUB = 'Rubik';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

// overshoot spring: every appearance in the film uses it
export const pop = (frame: number, fps: number, from: number) =>
	spring({frame: frame - from, fps, config: {damping: 9, mass: 0.6, stiffness: 180}});
