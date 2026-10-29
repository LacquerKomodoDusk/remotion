import {CameraMotionBlur} from '@remotion/motion-blur';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, easeInOut} from '../design/tokens';

// A slab of the chair's own upholstery: black leather, dashed diamond stitching, bone piping
const quilt = encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><path d="M0 90 L90 0 L180 90 L90 180 Z" fill="none" stroke="#ECE8E2" stroke-opacity="0.32" stroke-width="3" stroke-dasharray="10 7"/></svg>`,
);
export const leather: React.CSSProperties = {
	backgroundColor: C.ink,
	backgroundImage: `radial-gradient(120% 60% at 30% 20%, rgba(255,255,255,0.07), rgba(0,0,0,0) 60%), url("data:image/svg+xml,${quilt}")`,
	backgroundSize: '100% 100%, 180px 180px',
};

const Slab: React.FC<{from: number; duration: number}> = ({from, duration}) => {
	const frame = useCurrentFrame();
	const t = interpolate(frame, [from, from + duration], [0, 1], {...clamp, easing: easeInOut});
	if (frame < from || frame > from + duration) {
		return null;
	}
	return (
		<AbsoluteFill style={{...leather, transform: `translateY(${interpolate(t, [0, 1], [105, -105])}%)`}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 10, background: C.ember}} />
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: C.ember}} />
		</AbsoluteFill>
	);
};

export const LeatherShutter: React.FC<{from: number; duration: number}> = ({from, duration}) => (
	<CameraMotionBlur samples={6} shutterAngle={180}>
		<Slab from={from} duration={duration} />
	</CameraMotionBlur>
);
