import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, easeOutExpo, enter, FONT_HEAD, FONT_TEXT} from '../design/tokens';

// point -> line draws -> card. `point` may move every frame (tracking the real chair)
export const Callout: React.FC<{
	from: number;
	to: number;
	point: (frame: number) => [number, number];
	card: [number, number];
	label: string;
	sub: string | null;
}> = ({from, to, point, card, label, sub}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (frame < from || frame > to) {
		return null;
	}
	const [px, py] = point(frame);
	const dot = enter(frame, fps, from);
	const line = interpolate(frame, [from + 3, from + 13], [0, 1], {...clamp, easing: easeOutExpo});
	const cardIn = enter(frame, fps, from + 9);
	const out = interpolate(frame, [to - 7, to], [0, 1], {...clamp, easing: easeIn});
	// elbow: vertical from the point to the card's row, then horizontal into the card edge
	const [cx, cy] = card;
	const elbowY = cy + 40;
	const segA = Math.abs(elbowY - py);
	const segB = Math.abs(cx - px);
	const total = segA + segB;
	const drawn = total * line * (1 - out);
	const ring = (frame - from) % 30;
	return (
		<>
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
				<path
					d={`M${px} ${py} L${px} ${elbowY} L${cx} ${elbowY}`}
					fill="none"
					stroke={C.bone}
					strokeWidth={4}
					strokeLinecap="round"
					strokeDasharray={total}
					strokeDashoffset={total - drawn}
					style={{filter: 'drop-shadow(0 2px 6px rgba(20,19,20,0.8))'}}
				/>
				<circle cx={px} cy={py} r={14 + ring * 1.1} fill="none" stroke={C.ember} strokeWidth={3} opacity={(1 - ring / 30) * dot * (1 - out)} />
				<circle cx={px} cy={py} r={11 * dot * (1 - out)} fill={C.ember} stroke={C.bone} strokeWidth={4} />
			</svg>
			<div
				style={{
					position: 'absolute',
					left: cx < px ? undefined : cx,
					right: cx < px ? 1080 - cx : undefined,
					top: cy,
					perspective: 800,
				}}
			>
				<div
					style={{
						transformOrigin: cx < px ? 'right center' : 'left center',
						transform: `rotateY(${interpolate(cardIn, [0, 1], [cx < px ? -70 : 70, 0]) + out * 80}deg)`,
						opacity: interpolate(cardIn, [0, 0.3], [0, 1], clamp) * (1 - out),
						background: 'rgba(20,19,20,0.9)',
						borderRadius: 14,
						padding: '16px 24px 18px',
						borderTop: `5px solid ${C.ember}`,
						whiteSpace: 'nowrap',
						boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
					}}
				>
					<div style={{fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 40, color: C.bone}}>{label}</div>
					{sub ? <div style={{fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 28, color: 'rgba(236,232,226,0.75)', marginTop: 4}}>{sub}</div> : null}
				</div>
			</div>
		</>
	);
};
