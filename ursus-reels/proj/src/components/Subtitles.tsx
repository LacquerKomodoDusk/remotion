import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import edl from '../edl.json';
import {C, clamp, enter, FONT_HEAD, FONT_TEXT, SAFE} from '../design/tokens';

const measure = (() => {
	let ctx: CanvasRenderingContext2D | null = null;
	return (text: string, font: string) => {
		ctx = ctx ?? document.createElement('canvas').getContext('2d')!;
		ctx.font = font;
		return ctx.measureText(text).width;
	};
})();

// Word-by-word captions in groups of 2-4; active word in ember with a 1.0 -> 1.08 pop; key words set in the headline face
export const Subtitles: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const groups = edl.groups.map((g, gi) => {
		const first = edl.words[g[0]];
		const last = edl.words[g[g.length - 1]];
		const next = edl.groups[gi + 1];
		const nextFrom = next ? edl.words[next[0]].from : Infinity;
		return {g, from: Math.floor(first.from), to: Math.min(nextFrom, last.to + 10)};
	});
	const current = groups.find((x) => frame >= x.from && frame < x.to);
	if (!current) {
		return null;
	}
	const pop = enter(frame, fps, current.from);
	// exactly one active word: the latest one that has started (until it ends)
	const started = current.g.filter((i) => frame >= edl.words[i].from - 1);
	const activeIdx = started.length ? started[started.length - 1] : -1;
	return (
		<div
			style={{
				position: 'absolute',
				left: SAFE.left,
				width: SAFE.right - SAFE.left,
				bottom: 1920 - 1452,
				textAlign: 'center',
				transform: `translateY(${(1 - pop) * 22}px)`,
				opacity: interpolate(pop, [0, 0.5], [0, 1], clamp),
			}}
		>
			{current.g.map((i) => {
				const w = edl.words[i];
				const active = i === activeIdx && frame < w.to + 4;
				const a = enter(frame, fps, w.from - 1);
				const scale = active ? 1 + 0.08 * Math.min(1, a) : 1;
				const size = w.key ? 60 : 66;
				// the pop grows sideways; neighbours make room for it so long words never collide
				const grow = ((scale - 1) / 2) * measure(w.text, `800 ${size}px ${w.key ? FONT_HEAD : FONT_TEXT}`);
				return (
					<span
						key={i}
						style={{
							fontFamily: w.key ? FONT_HEAD : FONT_TEXT,
							fontWeight: 800,
							fontSize: size,
							letterSpacing: w.key ? '-0.01em' : '-0.015em',
							lineHeight: 1.22,
							color: active ? C.ember : C.bone,
							display: 'inline-block',
							margin: `0 ${12 + grow}px`,
							transform: `scale(${scale})`,
							textShadow: `0 3px 0 ${C.ink}, 0 0 22px rgba(20,19,20,0.9), 0 0 4px rgba(20,19,20,0.95)`,
						}}
					>
						{w.text}
					</span>
				);
			})}
		</div>
	);
};
