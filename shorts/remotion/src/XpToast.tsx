import React from 'react';
import {Easing, interpolate, spring, useVideoConfig} from 'remotion';

// The single editorial caption (punchline), drawn as a Fortnite-style XP notification:
// the game itself was showing "+600 оп / сундук" toasts all clip long.
const FONT = 'Unbounded';
const NAVY = '#0B1530';
const GOLD = '#FFC83D';

const Star: React.FC<{x: number; y: number; s: number; r: number}> = ({x, y, s, r}) => (
	<svg width={60} height={60} viewBox="-30 -30 60 60" style={{position: 'absolute', left: x - 30, top: y - 30, transform: `scale(${s}) rotate(${r}deg)`}}>
		<path d="M0,-26 C3,-6 6,-3 26,0 C6,3 3,6 0,26 C-3,6 -6,3 -26,0 C-6,-3 -3,-6 0,-26Z" fill={GOLD} stroke={NAVY} strokeWidth={4} />
	</svg>
);

export const XpToast: React.FC<{t: number; start: number; top: number}> = ({t, start, top}) => {
	const {fps} = useVideoConfig();
	const lf = (t - start) * fps;
	if (lf < 0) return null;
	const inP = spring({frame: lf, fps, config: {damping: 11, stiffness: 190, mass: 0.8}});
	const x = 0;
	const sc = interpolate(lf, [0, 6, 14], [0.4, 1.1, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const numP = spring({frame: lf - 7, fps, config: {damping: 9, stiffness: 220}});
	const glint = interpolate(lf, [10, 34], [-300, 1100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
	// XP counter ticks up like the game's
	const xp = Math.round(interpolate(lf, [6, 26], [0, 900], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}));
	const stars = [
		{x: 120, y: -40, d: 9},
		{x: 760, y: -55, d: 13},
		{x: 860, y: 170, d: 17},
	];
	return (
		<div style={{position: 'absolute', left: 110, top, width: 790, transform: `translateX(${x}px) scale(${sc * interpolate(inP, [0, 1], [0.6, 1])})`, opacity: Math.min(1, lf / 3), transformOrigin: '50% 50%'}}>
			<div
				style={{
					position: 'relative',
					transform: 'skewX(-9deg)',
					background: 'linear-gradient(100deg, #3B1A8F 0%, #6A2BD8 55%, #2F7BFF 100%)',
					border: `7px solid ${NAVY}`,
					borderRadius: 22,
					boxShadow: `0 16px 0 ${NAVY}, 0 26px 40px rgba(11,21,48,0.55), inset 0 4px 0 rgba(255,255,255,0.28)`,
					padding: '26px 40px 30px',
					overflow: 'hidden',
				}}
			>
				<div style={{position: 'absolute', top: -40, bottom: -40, left: glint, width: 120, background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))', transform: 'skewX(-20deg)'}} />
				<div style={{transform: 'skewX(9deg)', textAlign: 'center'}}>
					<div style={{position: 'relative', height: 132, transform: `scale(${interpolate(numP, [0, 1], [0.4, 1])})`}}>
						{[0, 1].map((k) => (
							<div
								key={k}
								style={{
									position: 'absolute',
									inset: 0,
									fontFamily: FONT,
									fontWeight: 900,
									fontSize: 112,
									lineHeight: '132px',
									color: k === 0 ? NAVY : GOLD,
									WebkitTextStroke: k === 0 ? `18px ${NAVY}` : undefined,
									textShadow: k === 0 ? `0 8px 0 ${NAVY}` : undefined,
								}}
							>
								+{xp} ОП
							</div>
						))}
					</div>
					<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 38, color: '#FFFFFF', marginTop: 8, letterSpacing: '0.01em', whiteSpace: 'nowrap', textShadow: `0 4px 0 ${NAVY}`}}>РАЗГОВОР С ПУСТОТОЙ</div>
				</div>
			</div>
			{stars.map((s, i) => {
				const p = spring({frame: lf - s.d, fps, config: {damping: 10, stiffness: 200}});
				return <Star key={i} x={s.x} y={s.y} s={p * (1 - interpolate(lf - s.d, [14, 40], [0, 0.35], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}))} r={lf * 2 + i * 30} />;
			})}
		</div>
	);
};
