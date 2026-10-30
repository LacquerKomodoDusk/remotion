import {CameraMotionBlur} from '@remotion/motion-blur';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, FONT_HEAD, FONT_SUB, pop} from '../design/tokens';

export type CaptionStyle = 'hook' | 'comment' | 'card' | 'replay' | 'sticker' | 'impact';
export type CaptionData = {text: string; from: number; to: number; style: CaptionStyle; x: number; y: number};

const Inner: React.FC<CaptionData> = ({text, from, to, style, x, y}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = pop(frame, fps, from);
	const out = interpolate(frame, [to - 4, to], [0, 1], {...clamp, easing: easeIn});
	const sway = Math.sin(frame / 7) * 1.5;
	if (style === 'comment' || style === 'sticker') {
		const sticker = style === 'sticker';
		return (
			<div
				style={{
					position: 'absolute',
					left: x,
					top: y,
					transform: `rotate(${(sticker ? 6 : -4) + sway * 0.5}deg) scale(${a * (1 - out)})`,
					transformOrigin: 'left center',
					background: sticker ? C.yellow : C.ink,
					color: sticker ? C.ink : '#F2F2F2',
					fontFamily: FONT_SUB,
					fontWeight: 900,
					fontSize: sticker ? 64 : 56,
					fontStyle: sticker ? 'normal' : 'italic',
					padding: sticker ? '8px 22px 10px' : '10px 22px 12px',
					borderRadius: 12,
					border: sticker ? `6px solid ${C.ink}` : 'none',
					boxShadow: '0 10px 0 rgba(0,0,0,0.35)',
					whiteSpace: 'nowrap',
				}}
			>
				{text}
			</div>
		);
	}
	if (style === 'replay') {
		const blink = Math.floor(frame / 6) % 2 === 0 ? 1 : 0.35;
		return (
			<div style={{position: 'absolute', left: 0, width: 1080, top: y, textAlign: 'center', opacity: (1 - out) * a}}>
				<span style={{fontFamily: FONT_SUB, fontWeight: 900, fontSize: 64, color: '#fff', background: C.red, padding: '6px 26px', borderRadius: 8}}>
					<span style={{opacity: blink}}>●</span> {text}
				</span>
			</div>
		);
	}
	const big = style === 'impact' || style === 'card';
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				width: 1080,
				top: y,
				textAlign: 'center',
				transform: `rotate(${(big ? -5 : -3) + sway * 0.3}deg) scale(${a * (1 - out)})`,
				fontFamily: style === 'card' ? FONT_SUB : FONT_HEAD,
				fontWeight: 900,
				fontSize: style === 'card' ? 112 : 104,
				lineHeight: 1.05,
				color: style === 'card' ? '#fff' : C.yellow,
				WebkitTextStroke: `18px ${C.ink}`,
				paintOrder: 'stroke fill',
				textShadow: '0 12px 0 rgba(20,18,16,0.55)',
			}}
		>
			{text}
		</div>
	);
};

// fast graphic moves get motion blur
export const Caption: React.FC<CaptionData> = (props) => {
	const frame = useCurrentFrame();
	if (frame < props.from || frame > props.to) {
		return null;
	}
	return (
		<CameraMotionBlur samples={5} shutterAngle={180}>
			<Inner {...props} />
		</CameraMotionBlur>
	);
};

// big red HP readout taken from the real HUD value at that moment
export const Hp: React.FC<{from: number; to: number; value: number}> = ({from, to, value}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (frame < from || frame > to) {
		return null;
	}
	const a = pop(frame, fps, from);
	const pulse = 1 + Math.max(0, Math.sin(frame / 3)) * 0.06;
	return (
		<div
			style={{
				position: 'absolute',
				left: 70,
				top: 1470,
				transform: `rotate(-5deg) scale(${a * pulse})`,
				transformOrigin: 'left center',
				fontFamily: FONT_SUB,
				fontWeight: 900,
				fontSize: 96,
				color: C.red,
				WebkitTextStroke: `16px ${C.ink}`,
				paintOrder: 'stroke fill',
			}}
		>
			HP: {value}
		</div>
	);
};
