import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, easeOutExpo, FONT_SUB} from '../design/tokens';
import type {CaptionData} from './Caption';

// Nature-documentary plate: a thin rule, a small-caps label, a calm serif line.
// Only the newest plate is on screen, so they never stack.
export const DocPlates: React.FC<{plates: (CaptionData & {label?: string | null})[]; low: boolean}> = ({plates, low}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const active = plates.filter((p) => frame >= p.from && frame < p.to);
	const p = active[active.length - 1];
	if (!p) {
		return null;
	}
	const t = frame - p.from;
	const inV = interpolate(t, [0, 12], [0, 1], {...clamp, easing: easeOutExpo});
	const out = interpolate(frame, [p.to - 6, p.to], [0, 1], {...clamp, easing: easeIn});
	// typewriter reveal, fast enough to finish in ~0.6 s
	const chars = Math.ceil(interpolate(t, [2, 2 + Math.min(18, p.text.length * 0.6)], [0, p.text.length], clamp));
	return (
		<div style={{position: 'absolute', left: 40, right: 110, top: low ? 1420 : 1030, opacity: 1 - out, transform: `translateY(${(1 - inV) * 20}px)`, background: 'linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.45) 80%, rgba(0,0,0,0))', padding: '22px 30px 26px', borderRadius: 6}}>
			<div style={{height: 4, width: interpolate(inV, [0, 1], [0, 160]), background: C.yellow, marginBottom: 14}} />
			<div style={{fontFamily: FONT_SUB, fontWeight: 900, fontSize: 30, letterSpacing: '0.18em', color: C.yellow, textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>
				{p.label ?? ''}
			</div>
			<div
				style={{
					fontFamily: 'PT Serif',
					fontStyle: 'italic',
					fontSize: 64,
					lineHeight: 1.18,
					color: '#fff',
					marginTop: 8,
					textShadow: '0 3px 0 rgba(0,0,0,0.6), 0 0 24px rgba(0,0,0,0.9)',
				}}
			>
				{p.text.slice(0, chars)}
				<span style={{opacity: 0}}>{p.text.slice(chars)}</span>
			</div>
		</div>
	);
};
