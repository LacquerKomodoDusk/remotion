import {CameraMotionBlur} from '@remotion/motion-blur';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeOutExpo, enter, FONT_HEAD, FONT_TEXT} from '../design/tokens';
import {BookmarkIcon} from './Icons';
import {leather} from './Transition';

// Leather slab rises, holds the CTA, then keeps rising to uncover the very first frame (loop)
const Panel: React.FC<{from: number; to: number}> = ({from, to}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const up = interpolate(frame, [from, from + 10], [100, 0], {...clamp, easing: easeOutExpo});
	const away = interpolate(frame, [to - 17, to - 2], [0, -105], {...clamp, easing: Easing.in(Easing.cubic)});
	const a = enter(frame, fps, from + 6);
	return (
		<AbsoluteFill style={{...leather, transform: `translateY(${up + away}%)`}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 10, background: C.ember}} />
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: C.ember}} />
			<div
				style={{
					position: 'absolute',
					left: 64,
					width: 896,
					top: 760,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					opacity: interpolate(a, [0, 0.4], [0, 1], clamp),
					transform: `translateY(${(1 - a) * 40}px)`,
				}}
			>
				<BookmarkIcon draw={interpolate(frame, [from + 6, from + 20], [0, 1], clamp)} size={130} />
				<div style={{fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 104, color: C.bone, marginTop: 20, letterSpacing: '-0.02em'}}>Сохрани</div>
				<div style={{fontFamily: FONT_TEXT, fontWeight: 800, fontSize: 52, color: C.ember, marginTop: 6}}>идею подарка</div>
			</div>
		</AbsoluteFill>
	);
};

export const CTA: React.FC<{from: number; to: number}> = ({from, to}) => {
	const frame = useCurrentFrame();
	if (frame < from) {
		return null;
	}
	return (
		<CameraMotionBlur samples={6} shutterAngle={180}>
			<Panel from={from} to={to} />
		</CameraMotionBlur>
	);
};
