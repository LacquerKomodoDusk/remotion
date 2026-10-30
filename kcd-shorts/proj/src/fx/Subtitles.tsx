import {interpolate, useCurrentFrame} from 'remotion';
import plan from '../../data/plan.json';
import {C, clamp, FONT_SUB} from '../design/tokens';

const COLORS: Record<string, string> = {w: C.white, y: C.yellow, r: C.red, b: C.blue, g: C.green};
// 1-3 words; active word bounces 1.0 -> 1.15 -> 1.0 over 4 frames; colour by emotion; caps = key word
export const GROUPS = [[0, 1, 2], [3, 4], [5, 6, 7], [8], [9, 10], [11, 12], [13], [14, 15, 16]];

export const Subtitles: React.FC<{y: number}> = ({y}) => {
	const frame = useCurrentFrame();
	const groups = GROUPS.map((g, gi) => {
		const first = plan.words[g[0]];
		const last = plan.words[g[g.length - 1]];
		const next = GROUPS[gi + 1];
		return {g, from: Math.floor(first.from) - 1, to: Math.min(next ? plan.words[next[0]].from - 1 : Infinity, last.to + 12)};
	});
	const cur = groups.find((x) => frame >= x.from && frame < x.to);
	if (!cur) {
		return null;
	}
	const appear = interpolate(frame, [cur.from, cur.from + 3], [0.6, 1], clamp);
	return (
		<div style={{position: 'absolute', left: 60, width: 900, top: y, textAlign: 'center', transform: `scale(${appear})`}}>
			{cur.g.map((i) => {
				const w = plan.words[i];
				const caps = w.text === w.text.toUpperCase();
				const since = frame - w.from;
				const bounce = since >= 0 && since <= 4 ? interpolate(since, [0, 2, 4], [1, 1.15, 1]) : 1;
				const said = frame >= w.from - 1;
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
							opacity: said ? 1 : 0.55,
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
