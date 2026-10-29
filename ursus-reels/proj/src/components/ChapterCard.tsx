import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, enter, FONT_HEAD, SAFE} from '../design/tokens';

// Plate tilted in space; swings in around its left edge, folds away faster than it came
export const ChapterCard: React.FC<{n: string; title: string; from: number; to: number}> = ({n, title, from, to}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const inV = enter(frame, fps, from);
	const outV = interpolate(frame, [to - 7, to], [0, 1], {...clamp, easing: easeIn});
	if (frame < from || frame > to) {
		return null;
	}
	const ry = interpolate(inV, [0, 1], [-82, -14]) + outV * 96;
	const drift = interpolate(frame, [from, to], [0, -14]);
	return (
		<div style={{position: 'absolute', left: SAFE.left, top: 276, perspective: 900}}>
			<div
				style={{
					transformOrigin: 'left center',
					transform: `translateX(${drift}px) rotateY(${ry}deg) rotateX(6deg)`,
					opacity: interpolate(inV, [0, 0.3], [0, 1], clamp) * (1 - outV),
					display: 'flex',
					alignItems: 'center',
					gap: 22,
					padding: '22px 34px 22px 26px',
					background: 'rgba(20,19,20,0.88)',
					borderLeft: `8px solid ${C.ember}`,
					borderRadius: 14,
					boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
				}}
			>
				<span style={{fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 40, color: C.ember}}>{n}</span>
				<span style={{fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 46, color: C.bone, letterSpacing: '-0.01em'}}>{title}</span>
			</div>
		</div>
	);
};
