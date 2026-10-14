import {loadFont} from '@remotion/google-fonts/Montserrat';
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Config} from '../lib/config';

const {fontFamily} = loadFont('normal', {weights: ['800'], subsets: ['cyrillic', 'latin']});

// Слово в выходном времени (кадры). Одно слово исходника может встретиться
// дважды, если хук продублирован в начало.
export type OutWord = {
	text: string;
	from: number;
	to: number;
	wordIndex: number;
	profane: boolean;
	keyword: boolean;
	emotion: boolean;
};

type Page = {words: OutWord[]; from: number; to: number};

export const makePages = (words: OutWord[], config: Config, fps: number): Page[] => {
	const {maxWordsPerPage, pageGapSec, holdSec} = config.captions;
	const sorted = [...words].sort((a, b) => a.from - b.from);
	const pages: Page[] = [];
	for (const w of sorted) {
		const page = pages[pages.length - 1];
		const prev = page?.words[page.words.length - 1];
		const breakHere =
			!page ||
			page.words.length >= maxWordsPerPage ||
			w.from - prev!.to > pageGapSec * fps ||
			// смена куска монтажа: слова не «перетекают» через склейку
			w.wordIndex !== prev!.wordIndex + 1 ||
			/[.!?…]$/.test(prev!.text);
		if (breakHere) {
			pages.push({words: [w], from: w.from, to: w.to});
		} else {
			page.words.push(w);
			page.to = w.to;
		}
	}

	return pages.map((p, i) => {
		const next = pages[i + 1];
		const to = p.to + holdSec * fps;
		return {...p, to: next ? Math.min(to, next.from) : to};
	});
};

export const Captions: React.FC<{pages: Page[]; config: Config}> = ({pages, config}) => {
	const frame = useCurrentFrame();
	const {height} = useVideoConfig();
	const c = config.captions;
	const page = pages.find((p) => frame >= p.from && frame < p.to);
	if (!page) {
		return null;
	}

	const visible = page.words.filter((w) => frame >= w.from);
	const y = Math.min(
		Math.max(height * c.yFraction, c.safeTopPx + c.fontSize),
		height - c.safeBottomPx - c.fontSize,
	);

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					left: 60,
					right: 60,
					top: y,
					transform: 'translateY(-50%)',
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'center',
					alignItems: 'center',
					columnGap: c.fontSize * 0.3,
					fontFamily,
					fontWeight: 800,
					textAlign: 'center',
					lineHeight: 1.1,
				}}
			>
				{visible.map((w) => {
						const local = frame - w.from;
						const pop = interpolate(local, [0, 2, 5], [0.8, 1.1, 1], {
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						});
						const active = w === visible[visible.length - 1];
						const big = w.profane || w.emotion;
						// размер через fontSize, чтобы крупные слова раздвигали соседей
						const size = c.fontSize * (big ? c.emotionScale : w.keyword ? c.keywordScale : 1);
						const shaking = big && local < 8;
						const dx = shaking ? (random(`cx-${w.wordIndex}-${local}`) * 2 - 1) * 6 : 0;
						const dy = shaking ? (random(`cy-${w.wordIndex}-${local}`) * 2 - 1) * 6 : 0;
						const color = w.profane
							? c.activeColor
							: w.keyword
								? c.keywordColor
								: active
									? c.activeColor
									: c.color;
						const text = w.profane ? config.profanity.replacement : w.text;
						return (
							<span
								key={`${w.wordIndex}-${w.from}`}
								style={{
									display: 'inline-block',
									fontSize: size,
									color,
									WebkitTextStroke: `${c.strokePx}px black`,
									paintOrder: 'stroke fill',
									textShadow: '0 4px 6px rgba(0,0,0,0.7)',
									transform: `translate(${dx}px, ${dy}px) scale(${pop})`,
								}}
							>
								{text}
							</span>
						);
					})}
			</div>
		</AbsoluteFill>
	);
};
