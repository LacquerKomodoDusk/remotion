import {ThreeCanvas} from '@remotion/three';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut} from '../design/tokens';
import {Agent, agentRest, Cam, Ground, Lights, lerp3, V3, Wall} from './CsWorld';

// "Going B" as it happened: the teammate walks into the B doorway and drops; then he walks in after him and drops too.
const walker = (frame: number, start: number, hitAt: number, from: V3, to: V3) => {
	const walkT = interpolate(frame, [start, hitAt], [0, 1], clamp);
	const pos = lerp3(from, to, walkT);
	const fall = interpolate(frame, [hitAt, hitAt + 10], [0, 1.5], {...clamp, easing: Easing.in(Easing.quad)});
	return {pos, fall, walk: frame >= start && frame < hitAt ? (frame - start) * 0.55 : 0, hit: frame - hitAt};
};

const Flash: React.FC<{at: V3; age: number}> = ({at, age}) =>
	age >= 0 && age < 4 ? (
		<mesh position={at}>
			<sphereGeometry args={[0.18 * (1 + age * 0.3), 12, 10]} />
			<meshBasicMaterial color="#fff2b0" transparent opacity={1 - age / 4} />
		</mesh>
	) : null;

export const QueueDust: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const door: V3 = [0, 0, -3.2];
	const a = walker(frame, 0, 20, [0.2, 0, 0.6], [0.05, 0, -2.6]);
	const b = walker(frame, 34, 54, [-0.9, 0, 1.6], [-0.05, 0, -2.5]);
	const push = interpolate(frame, [0, 75], [0, 1], {...clamp, easing: easeInOut});
	const cam = lerp3([1.6, 2.3, 5.8], [0.9, 2.0, 4.4], push);
	return (
		<ThreeCanvas width={width} height={height} shadows gl={{antialias: true}} style={{position: 'absolute'}}>
			<Cam pos={cam} look={[0, 1.0, -2.2]} fov={46} />
			<Lights sun={[5, 10, 4]} />
			<Ground />
			{/* wall with the B doorway */}
			<Wall size={[3.2, 3.6, 0.6]} position={[-2.6, 0, door[2]]} />
			<Wall size={[3.2, 3.6, 0.6]} position={[2.6, 0, door[2]]} />
			<Wall size={[2.0, 1.0, 0.6]} position={[0, 2.6, door[2]]} />
			<mesh position={[0, 1.3, door[2] - 0.6]}>
				<boxGeometry args={[2.0, 2.6, 0.1]} />
				<meshStandardMaterial color="#2b2118" />
			</mesh>
			<group position={[-1.3, 2.9, door[2] + 0.31]}>
				<mesh>
					<boxGeometry args={[0.6, 0.45, 0.04]} />
					<meshStandardMaterial color="#c9372c" />
				</mesh>
			</group>
			{/* teammate, then him */}
			<group position={a.pos} rotation={[a.fall, 0, 0]}>
				<Agent team="t" position={[0, 0, 0]} pose={{...agentRest, walk: a.walk, aim: 0.8, yaw: Math.PI}} />
			</group>
			<group position={b.pos} rotation={[b.fall, 0, 0]}>
				<Agent team="t" position={[0, 0, 0]} pose={{...agentRest, walk: b.walk, aim: 0.8, yaw: Math.PI}} />
			</group>
			<Flash at={[0.3, 1.5, door[2] - 1.2]} age={a.hit} />
			<Flash at={[-0.3, 1.5, door[2] - 1.2]} age={b.hit} />
		</ThreeCanvas>
	);
};
