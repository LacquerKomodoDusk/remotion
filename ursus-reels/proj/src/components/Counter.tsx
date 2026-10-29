import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, enter, FONT_HEAD, FONT_TEXT, SAFE} from '../design/tokens';
import {GiftIcon} from './Icons';

// "два нужных подарка": 0 -> 1 -> 2 ticking up, two gift icons; the first one lights up on "одно из них"
export const Counter: React.FC<{from: number; to: number; tick: [number, number]; highlightAt: number}> = ({from, to, tick, highlightAt}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (frame < from || frame > to) {
		return null;
	}
	const inV = enter(frame, fps, from);
	const out = interpolate(frame, [to - 7, to], [0, 1], {...clamp, easing: easeIn});
	const value = frame >= tick[1] ? 2 : frame >= tick[0] ? 1 : 0;
	const lastTick = frame >= tick[1] ? tick[1] : frame >= tick[0] ? tick[0] : from;
	const bump = 1 + 0.12 * (1 - enter(frame, fps, lastTick));
	const hi = enter(frame, fps, highlightAt);
	return (
		<div
			style={{
				position: 'absolute',
				left: SAFE.left,
				top: 800,
				perspective: 900,
			}}
		>
			<div
				style={{
					transformOrigin: 'left center',
					transform: `rotateY(${interpolate(inV, [0, 1], [-70, -10]) + out * 90}deg)`,
					opacity: interpolate(inV, [0, 0.3], [0, 1], clamp) * (1 - out),
					background: 'rgba(20,19,20,0.88)',
					borderRadius: 18,
					padding: '18px 30px 24px',
					display: 'flex',
					alignItems: 'center',
					gap: 26,
					boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
				}}
			>
				<div
					style={{
						fontFamily: FONT_HEAD,
						fontWeight: 800,
						fontSize: 170,
						lineHeight: 1,
						color: C.ember,
						transform: `scale(${bump})`,
						width: 130,
						textAlign: 'center',
					}}
				>
					{value}
				</div>
				<div>
					<div style={{fontFamily: FONT_TEXT, fontWeight: 800, fontSize: 40, color: C.bone, lineHeight: 1.1}}>
						нужных
						<br />
						подарка
					</div>
					<div style={{display: 'flex', gap: 14, marginTop: 12}}>
						<GiftIcon draw={interpolate(frame, [tick[0], tick[0] + 12], [0, 1], clamp)} size={54} color={hi > 0.5 ? C.ember : C.bone} />
						<GiftIcon draw={interpolate(frame, [tick[1], tick[1] + 12], [0, 1], clamp)} size={54} color={C.bone} />
					</div>
				</div>
			</div>
		</div>
	);
};
