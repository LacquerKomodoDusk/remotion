import type React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

// Russo One (кириллица + латиница) — выбран для субтитров, см. config/font.json
if (typeof document !== 'undefined') {
	const handle = delayRender('Загрузка шрифта Russo One');
	Promise.all(
		[
			['russo-one-cyrillic-400-normal.woff2', 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'],
			['russo-one-latin-400-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
		].map(([file, range]) => {
			const face = new FontFace('Russo One', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {unicodeRange: range});
			document.fonts.add(face);
			return face.load();
		}),
	).then(() => continueRender(handle));
}

// Общий визуальный язык (tiktok-shorts-style.md, «Моушн-графика»)
export const COLORS = {
	white: '#FFFFFF',
	yellow: '#FFD600',
	red: '#FF2D2D',
	green: '#3BE660',
	blue: '#3EC5FF',
	black: '#0A0A0A',
} as const;

export type ColorName = keyof typeof COLORS;

export const FONT = "'Russo One', 'Noto Color Emoji', sans-serif";

export const W = 1080;
export const H = 1920;

// Безопасные зоны TikTok: верх 150, низ 400, справа 150
export const SAFE = {top: 150, bottom: H - 400, right: W - 150};

export const comicText = (
	color: string,
	size: number,
	stroke = Math.round(size / 9),
): React.CSSProperties => ({
	fontFamily: FONT,
	fontSize: size,
	color,
	lineHeight: 1,
	WebkitTextStroke: `${stroke}px ${COLORS.black}`,
	paintOrder: 'stroke fill',
	textShadow: `${Math.round(size / 18)}px ${Math.round(size / 15)}px 0 ${COLORS.black}`,
	whiteSpace: 'nowrap',
});

export const dbToGain = (db: number) => Math.pow(10, db / 20);
