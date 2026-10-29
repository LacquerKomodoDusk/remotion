import {interpolate, useCurrentFrame} from 'remotion';
import edl from '../edl.json';
import {C, SAFE} from '../design/tokens';

export const ProgressBar: React.FC = () => {
	const frame = useCurrentFrame();
	const w = SAFE.right - SAFE.left;
	// during the CTA the bar fades out and comes back empty, so the last frame matches the first (loop)
	const inCta = frame >= edl.cta[0];
	const p = inCta ? 0 : Math.min(1, frame / (edl.cta[0] - 1));
	const opacity = inCta ? interpolate(frame, [edl.cta[0], edl.cta[0] + 6, edl.cta[1] - 12, edl.cta[1] - 1], [1, 0, 0, 1]) : 1;
	return (
		<div style={{position: 'absolute', left: SAFE.left, top: 232, width: w, height: 14, opacity}}>
			<div style={{position: 'absolute', top: 5, height: 4, width: w, background: 'rgba(236,232,226,0.25)', borderRadius: 2}} />
			<div style={{position: 'absolute', top: 5, height: 4, width: w * p, background: C.ember, borderRadius: 2}} />
			{edl.chapters.map((c) => {
				const x = (c.from / (edl.cta[0] - 1)) * w;
				const passed = !inCta && frame >= c.from;
				return (
					<div
						key={c.n}
						style={{
							position: 'absolute',
							left: x - 7,
							top: 0,
							width: 14,
							height: 14,
							borderRadius: 7,
							background: passed ? C.ember : C.ink,
							border: `3px solid ${passed ? C.ember : C.bone}`,
							boxSizing: 'border-box',
						}}
					/>
				);
			})}
		</div>
	);
};
