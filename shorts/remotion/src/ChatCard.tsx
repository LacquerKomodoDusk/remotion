import React from 'react';
import {Easing, interpolate, spring, useVideoConfig} from 'remotion';

// Hook: he reads a chat message out loud. The message is shown as a chat card,
// its words popping in exactly when he says them (word-by-word subtitles inside the card).
const FONT = 'Unbounded';
const NAVY = '#0B1530';

type W = {text: string; s: number; e: number; emotion: string};
const EMO: Record<string, string> = {neutral: '#FFFFFF', panic: '#FFD23F', joy: '#7CFF6B'};

export const ChatCard: React.FC<{t: number; start: number; words: W[]; exit: number; y: number}> = ({t, start, words, exit, y}) => {
	const {fps} = useVideoConfig();
	const f = (t - start) * fps;
	if (f < 0) return null;
	const ex = (t - exit) * fps;
	if (ex > 14) return null;
	const inP = spring({frame: f, fps, config: {damping: 13, stiffness: 200}});
	const outP = ex > 0 ? interpolate(ex, [0, 12], [0, 1], {extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)}) : 0;
	const lines = [words.slice(0, 3), words.slice(3)];
	return (
		<div
			style={{
				position: 'absolute',
				left: 120,
				width: 840,
				top: y - 100,
				transform: `translateY(${(1 - inP) * 120 - outP * 60}px) scale(${interpolate(inP, [0, 1], [0.85, 1]) * (1 - outP * 0.35)})`,
				opacity: 1 - outP,
				transformOrigin: '50% 50%',
			}}
		>
			<div
				style={{
					background: 'rgba(11,21,48,0.88)',
					border: '5px solid #9B5CFF',
					borderRadius: 30,
					boxShadow: `0 12px 0 ${NAVY}, 0 20px 44px rgba(11,21,48,0.6)`,
					padding: '22px 34px 26px',
				}}
			>
				<div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12}}>
					<svg width={44} height={40} viewBox="0 0 44 40">
						<path d="M6 3h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H20l-9 8v-8H6a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" fill="#9B5CFF" />
						<circle cx={14} cy={16} r={3} fill={NAVY} />
						<circle cx={22} cy={16} r={3} fill={NAVY} />
						<circle cx={30} cy={16} r={3} fill={NAVY} />
					</svg>
					<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 30, color: '#B69CFF', letterSpacing: '0.12em'}}>ЧАТ</div>
				</div>
				{lines.map((ln, li) => (
					<div key={li} style={{display: 'flex', gap: 22, height: 78, alignItems: 'center'}}>
						{ln.map((w, i) => {
							const lf = (t - w.s) * fps;
							if (lf < 0) return <span key={i} style={{fontFamily: FONT, fontWeight: 900, fontSize: 66, visibility: 'hidden'}}>{w.text}</span>;
							const pop = interpolate(lf, [0, 5, 10], [0.6, 1.1, 1], {extrapolateRight: 'clamp'});
							return (
								<span key={i} style={{fontFamily: FONT, fontWeight: 900, fontSize: 66, lineHeight: 1, color: EMO[w.emotion] ?? '#fff', display: 'inline-block', transform: `scale(${pop})`, transformOrigin: '50% 70%'}}>
									{w.text}
								</span>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
};
