import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, NAVY} from './theme';

// End tag after the edit: blurred last frame + «подпишись на мой твич-канал» synced to the author's TTS (starts at 0.15 s)
const PURPLE = '#8A3FFC';
const TTS0 = 0.15;
const beats = {sub: 0.04, chan: 0.64, streams: 1.96};
const txt = (size: number, color: string): React.CSSProperties => ({fontFamily: FONT, fontWeight: 900, fontSize: size, color, lineHeight: 1.1, whiteSpace: 'nowrap', WebkitTextStroke: `10px ${NAVY}`, paintOrder: 'stroke fill', textShadow: `0 6px 0 ${NAVY}`});

export const CTA: React.FC<{bg: string}> = ({bg}) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const t = frame / fps;
	const pop = (at: number) => {
		const f = (t - TTS0 - at) * fps;
		if (f < 0) return {o: 0, s: 0.6};
		return {o: Math.min(1, f / 3), s: interpolate(spring({frame: f, fps, config: {damping: 10, stiffness: 200}}), [0, 1], [0.5, 1])};
	};
	const a = pop(beats.sub), b = pop(beats.chan), c = pop(beats.streams);
	const bgIn = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
	const ring = Math.sin(t * 22) * 14 * Math.max(0, 1 - ((t - TTS0) % 1.4) * 1.6);
	const out = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {extrapolateLeft: 'clamp'});
	return (
		<AbsoluteFill style={{backgroundColor: NAVY}}>
			<Img src={staticFile(bg)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, objectFit: 'cover', filter: `blur(${bgIn * 22}px) brightness(${1 - bgIn * 0.55}) saturate(1.2)`, transform: `scale(${1.05 + t * 0.01})`}} />
			<AbsoluteFill style={{background: `radial-gradient(ellipse at 45% 50%, rgba(138,63,252,${0.35 * bgIn}) 0%, rgba(11,21,48,0) 70%)`}} />
			<div style={{position: 'absolute', left: 0, width: 918, top: 620, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, opacity: out}}>
				<div style={{opacity: a.o, transform: `scale(${a.s}) rotate(${ring * 0.6}deg)`}}>
					<svg width="150" height="150" viewBox="0 0 24 24"><path fill="#FFD23F" stroke={NAVY} strokeWidth="1.4" d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1h16v-1l-2-3.5V8a6 6 0 0 0-6-6zm-2 17a2 2 0 0 0 4 0z" /></svg>
				</div>
				<div style={{opacity: a.o, transform: `scale(${a.s})`, background: PURPLE, border: `8px solid ${NAVY}`, borderRadius: 28, padding: '18px 40px', boxShadow: `0 14px 0 ${NAVY}`}}>
					<span style={{...txt(92, '#FFFFFF'), WebkitTextStroke: '0px', textShadow: 'none'}}>ПОДПИШИСЬ</span>
				</div>
				<div style={{opacity: b.o, transform: `scale(${b.s})`}}><span style={txt(62, '#FFFFFF')}>на мой твич-канал</span></div>
				<div style={{opacity: c.o, transform: `scale(${c.s})`}}><span style={txt(50, '#B69CFF')}>стримы по разным играм</span></div>
			</div>
			<Img src={staticFile(`grain/${Math.floor(frame / 2) % 8}.png`)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, mixBlendMode: 'overlay'}} />
		</AbsoluteFill>
	);
};
