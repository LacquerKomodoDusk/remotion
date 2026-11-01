import {interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, FONT_SUB} from '../design/tokens';

export type Word = {text: string; from: number; to: number; color: string};
const COLORS: Record<string, string> = {w: C.white, y: C.yellow, r: C.red, b: C.blue, g: C.green};

// 1-3 words; active word bounces 1.0 -> 1.15 -> 1.0 over 4 frames; colour by emotion; CAPS = key word
export const Subtitles: React.FC<{words: Word[]; groups: number[][]; y: number}> = ({words, groups, y}) => {
	const frame = useCurrentFrame();
	const spans = groups.map((g, gi) => {
		const last = words[g[g.length - 1]];
		const next = groups[gi + 1];
		return {g, from: Math.floor(words[g[0]].from) - 1, to: Math.min(next ? words[next[0]].from - 1 : Infinity, last.to + 12)};
	});
	const cur = spans.find((x) => frame >= x.from && frame < x.to);
	if (!cur) {
		return null;
	}
	const appear = interpolate(frame, [cur.from, cur.from + 3], [0.6, 1], clamp);
	return (
		<div style={{position: 'absolute', left: 60, width: 900, top: y, textAlign: 'center', transform: `scale(${appear})`}}>
			{cur.g.map((i) => {
				const w = words[i];
				const caps = w.text === w.text.toUpperCase();
				const since = frame - w.from;
				const bounce = since >= 0 && since <= 4 ? interpolate(since, [0, 2, 4], [1, 1.15, 1]) : 1;
				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							margin: '0 12px',
							fontFamily: FONT_SUB,
							fontWeight: 900,
							fontSize: caps ? 116 : 94,
							lineHeight: 1.1,
							color: COLORS[w.color],
							opacity: frame >= w.from - 1 ? 1 : 0.55,
							transform: `scale(${bounce}) rotate(${caps ? -2 : 0}deg)`,
							WebkitTextStroke: `14px ${C.ink}`,
							paintOrder: 'stroke fill',
							textShadow: '0 8px 0 rgba(20,18,16,0.6)',
						}}
					>
						{w.text}
					</span>
				);
			})}
		</div>
	);
};
