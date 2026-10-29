import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, enter, FONT_HEAD, FONT_TEXT, SAFE} from '../design/tokens';

export const BadgeBody: React.FC = () => (
	<div
		style={{
			display: 'flex',
			alignItems: 'center',
			gap: 14,
			padding: '14px 22px',
			background: 'rgba(20,19,20,0.85)',
			border: `2px solid rgba(236,232,226,0.25)`,
			borderRadius: 999,
			whiteSpace: 'nowrap',
		}}
	>
		<span style={{fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 30, color: C.bone, letterSpacing: '0.04em'}}>URZUS</span>
		<span style={{width: 8, height: 8, borderRadius: 4, background: C.ember}} />
		<span style={{fontFamily: FONT_TEXT, fontWeight: 800, fontSize: 28, color: C.bone}}>игровое кресло</span>
	</div>
);

// Top-right of the safe zone (right edge 960)
export const Badge: React.FC<{from: number; to: number}> = ({from, to}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (frame < from || frame > to) {
		return null;
	}
	const inV = enter(frame, fps, from);
	const outV = interpolate(frame, [to - 7, to], [0, 1], {...clamp, easing: easeIn});
	return (
		<div
			style={{
				position: 'absolute',
				left: SAFE.left,
				top: 386,
				transformOrigin: 'left center',
				transform: `scale(${interpolate(inV, [0, 1], [0.6, 1]) * (1 - outV * 0.3)})`,
				opacity: interpolate(inV, [0, 0.4], [0, 1], clamp) * (1 - outV),
			}}
		>
			<BadgeBody />
		</div>
	);
};
