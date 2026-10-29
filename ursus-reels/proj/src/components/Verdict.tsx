import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, enter, FONT_HEAD, FONT_TEXT, SAFE} from '../design/tokens';
import {BadgeBody} from './Badge';
import {CheckIcon} from './Icons';

// Only what the author actually said. No minuses and no score: she named none.
const ITEMS = ['Две подушки: под шею и поясницу', 'Немаловажно для работы за компьютером', 'Подарок мужу, который стримит'];

export const Verdict: React.FC<{from: number; to: number}> = ({from, to}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (frame < from || frame > to) {
		return null;
	}
	const inV = enter(frame, fps, from);
	const out = interpolate(frame, [to - 7, to], [0, 1], {...clamp, easing: easeIn});
	return (
		<div style={{position: 'absolute', left: SAFE.left, width: SAFE.right - SAFE.left, top: 560, perspective: 1200}}>
			<div
				style={{
					transformOrigin: 'center bottom',
					transform: `rotateX(${interpolate(inV, [0, 1], [70, 6]) - out * 70}deg) translateY(${(1 - inV) * 80}px)`,
					opacity: interpolate(inV, [0, 0.3], [0, 1], clamp) * (1 - out),
					background: 'rgba(20,19,20,0.92)',
					borderRadius: 26,
					padding: '40px 44px 46px',
					boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
					border: '2px solid rgba(236,232,226,0.12)',
				}}
			>
				<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
					<div style={{fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 72, color: C.bone, letterSpacing: '-0.02em'}}>Итог</div>
					<div style={{transform: 'scale(0.8)', transformOrigin: 'right center'}}>
						<BadgeBody />
					</div>
				</div>
				<div style={{height: 3, background: C.ember, width: interpolate(frame, [from + 6, from + 20], [0, 120], clamp), margin: '18px 0 26px'}} />
				{ITEMS.map((t, i) => {
					const s = from + 10 + i * 7;
					const a = enter(frame, fps, s);
					return (
						<div
							key={t}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 22,
								marginTop: i === 0 ? 0 : 22,
								opacity: interpolate(a, [0, 0.4], [0, 1], clamp),
								transform: `translateX(${(1 - a) * 40}px)`,
							}}
						>
							<CheckIcon draw={interpolate(frame, [s, s + 14], [0, 1], clamp)} size={56} />
							<span style={{fontFamily: FONT_TEXT, fontWeight: 800, fontSize: 38, color: C.bone, lineHeight: 1.2}}>{t}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};
