import React from 'react';
import {interpolate, useVideoConfig} from 'remotion';

// While he talks with the mic off there are no words to subtitle:
// the subtitle slot shows three pulsing dots ("he is speaking, nothing comes out").
const NAVY = '#0B1530';

export const SilentDots: React.FC<{t: number; end: number; y: number}> = ({t, end, y}) => {
	const {fps} = useVideoConfig();
	const f = t * fps;
	const out = (t - end) * fps;
	if (out > 10) return null;
	const inS = interpolate(f, [0, 5, 10], [0.6, 1.1, 1], {extrapolateRight: 'clamp'});
	const outS = out > 0 ? interpolate(out, [0, 10], [1, 0], {extrapolateRight: 'clamp'}) : 1;
	return (
		<div style={{position: 'absolute', left: 0, width: 1080, top: y - 50, height: 100, display: 'flex', justifyContent: 'center', gap: 44, transform: `scale(${inS * outS})`}}>
			{[0, 1, 2].map((i) => {
				const b = Math.max(0, Math.sin((f - i * 6) / 5));
				return (
					<div
						key={i}
						style={{
							width: 72,
							height: 72,
							borderRadius: 36,
							background: '#FFFFFF',
							border: `10px solid ${NAVY}`,
							boxShadow: `0 10px 24px rgba(11,21,48,0.55)`,
							transform: `translateY(${-b * 22}px) scale(${1 + b * 0.15})`,
						}}
					/>
				);
			})}
		</div>
	);
};
