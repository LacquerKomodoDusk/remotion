import {CameraMotionBlur} from '@remotion/motion-blur';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, FONT_HEAD, FONT_SUB, pop} from '../design/tokens';

type Style = 'hook' | 'comment' | 'impact';

const Inner: React.FC<{text: string; from: number; to: number; style: Style; x: number; y: number}> = ({text, from, to, style, x, y}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = pop(frame, fps, from);
	const out = interpolate(frame, [to - 4, to], [0, 1], {...clamp, easing: easeIn});
	const sway = Math.sin(frame / 7) * 1.5;
	if (style === 'comment') {
		return (
			<div
				style={{
					position: 'absolute',
					left: x,
					top: y,
					transform: `rotate(${-4 + sway * 0.4}deg) scale(${a * (1 - out)})`,
					transformOrigin: 'left center',
					background: C.ink,
					color: C.parchment,
					fontFamily: FONT_SUB,
					fontWeight: 900,
					fontSize: 56,
					fontStyle: 'italic',
					padding: '10px 22px 12px',
					borderRadius: 10,
					boxShadow: '0 10px 0 rgba(0,0,0,0.35)',
					whiteSpace: 'nowrap',
				}}
			>
				{text}
			</div>
		);
	}
	const big = style === 'impact';
	const shake = big ? Math.exp(-(frame - from) / 5) * 14 : 0;
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				width: 1080,
				top: y,
				textAlign: 'center',
				transform: `translate(${Math.sin(frame * 2.3) * shake}px, ${Math.cos(frame * 3.1) * shake}px) rotate(${(big ? -6 : -3) + sway * 0.3}deg) scale(${a * (1 - out) * (big ? 1 : 1)})`,
				fontFamily: FONT_HEAD,
				fontSize: big ? 160 : 122,
				lineHeight: 1,
				color: C.yellow,
				WebkitTextStroke: `${big ? 22 : 16}px ${C.ink}`,
				paintOrder: 'stroke fill',
				textShadow: `0 ${big ? 14 : 10}px 0 rgba(20,18,16,0.55)`,
			}}
		>
			{text}
		</div>
	);
};

// fast graphic moves get motion blur
export const Caption: React.FC<{text: string; from: number; to: number; style: Style; x: number; y: number}> = (props) => {
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

// hand-drawn circle + arrow "вот он"
export const Circle: React.FC<{from: number; to: number; at: (f: number) => [number, number]; r: number}> = ({from, to, at, r}) => {
	const frame = useCurrentFrame();
	if (frame < from || frame > to) {
		return null;
	}
	const [cx, cy] = at(frame);
	const draw = interpolate(frame, [from, from + 7], [0, 1], {...clamp});
	const len = 2 * Math.PI * r * 1.15;
	const out = interpolate(frame, [to - 4, to], [1, 0], clamp);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: out, filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.4))'}}>
			<path
				d={`M ${cx + r} ${cy} A ${r} ${r * 0.8} 0 1 1 ${cx + r * 0.9} ${cy - r * 0.35} L ${cx + r * 1.15} ${cy - r * 0.2}`}
				fill="none"
				stroke={C.red}
				strokeWidth={12}
				strokeLinecap="round"
				strokeDasharray={len}
				strokeDashoffset={len * (1 - draw)}
			/>
		</svg>
	);
};
