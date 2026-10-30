import {ThreeCanvas} from '@remotion/three';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, easeIn, FONT_HEAD, pop} from '../design/tokens';
import {Chibi, restPose} from './Chibi';

// Small crash-test dummy reacting in the corner (rendered with a transparent background)
export const Corner: React.FC<{from: number; to: number; mood: 'panic' | 'trophy'; sign: string; x: number; y: number}> = ({from, to, mood, sign, x, y}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (frame < from || frame > to) {
		return null;
	}
	const t = frame - from;
	const a = pop(frame, fps, from);
	const out = interpolate(frame, [to - 5, to], [0, 1], {...clamp, easing: easeIn});
	const hop = Math.abs(Math.sin(t / (mood === 'panic' ? 2.2 : 4))) * (mood === 'panic' ? 0.07 : 0.04);
	const pose = {
		...restPose,
		bob: hop,
		squash: 1 + Math.sin(t / 2.2) * (mood === 'panic' ? 0.06 : 0.02),
		sausageUp: mood === 'trophy' ? spring({frame: t - 4, fps, config: {damping: 10}}) : 0,
		blink: interpolate(t % 40, [0, 2, 4], [0, 1, 0], clamp),
		headRoll: mood === 'panic' ? Math.sin(t / 3) * 0.25 : 0,
	};
	return (
		<div style={{position: 'absolute', left: x, top: y, width: 360, height: 420, transform: `scale(${a * (1 - out)})`, transformOrigin: 'center bottom'}}>
			<ThreeCanvas width={360} height={360} gl={{alpha: true, antialias: true}} camera={{position: [0, 0.2, 2.6], fov: 34}} style={{position: 'absolute', top: 0}}>
				<ambientLight intensity={0.7} />
				<directionalLight position={[2, 3, 3]} intensity={1.4} />
				<group rotation={[0, mood === 'panic' ? 0.3 : -0.25, 0]} position={[0, -0.78, 0]} scale={[1.6, 1.6, 1.6]}>
					<Chibi role="archer" pose={pose} position={[0, 0, 0]} rotationY={Math.PI} />
				</group>
			</ThreeCanvas>
			<div
				style={{
					position: 'absolute',
					left: 20,
					right: 20,
					bottom: 0,
					textAlign: 'center',
					transform: `rotate(${Math.sin(t / 6) * 3 - 3}deg)`,
					fontFamily: FONT_HEAD,
					fontSize: 52,
					color: C.ink,
					background: C.parchment,
					border: `5px solid ${C.ink}`,
					borderRadius: 10,
					padding: '6px 4px 2px',
					boxShadow: '0 8px 0 rgba(0,0,0,0.35)',
				}}
			>
				{sign}
			</div>
		</div>
	);
};
