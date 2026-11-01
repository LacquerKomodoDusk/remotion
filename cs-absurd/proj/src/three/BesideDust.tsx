import {ThreeCanvas} from '@remotion/three';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut} from '../design/tokens';
import {Agent, agentRest, Cam, Crate, Ground, Lights, V3, Wall} from './CsWorld';

// Frozen moment: he crouches behind the crate looking ahead; the enemy stands one step away, looking elsewhere.
export const BesideDust: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const a = interpolate(frame, [0, 75], [3.85, 3.0], {...clamp, easing: easeInOut});
	const r = interpolate(frame, [0, 75], [5.0, 4.3], clamp);
	const center: V3 = [0.4, 0.85, 0.4];
	const pos: V3 = [center[0] + Math.sin(a) * r, 1.9, center[2] + Math.cos(a) * r];
	return (
		<ThreeCanvas width={width} height={height} shadows gl={{antialias: true}} style={{position: 'absolute'}}>
			<Cam pos={pos} look={center} fov={44} />
			<Lights sun={[4, 10, 3]} />
			<Ground />
			<Wall size={[9, 3.8, 0.6]} position={[0, 0, -5.5]} />
			<Wall size={[0.6, 3.8, 7]} position={[-3.6, 0, -2]} />
			<Crate position={[-0.15, 0, 0.05]} size={1.05} />
			{/* him: crouched behind the crate, rifle up, looking straight ahead */}
			<Agent team="ct" position={[-0.15, 0, 0.95]} pose={{...agentRest, crouch: 1, aim: 1, yaw: Math.PI}} />
			{/* the enemy: one step to his right, mid-stride, looking the other way */}
			<Agent team="t" position={[0.95, 0, -0.15]} pose={{...agentRest, walk: 0.9, aim: 0.4, yaw: -0.4}} />
			{/* dust hanging in the air: time is frozen */}
			{new Array(70).fill(0).map((_, i) => (
				<mesh key={i} position={[(random(`x${i}`) - 0.5) * 6, random(`y${i}`) * 2.6, (random(`z${i}`) - 0.5) * 5]}>
					<sphereGeometry args={[0.012 + random(`s${i}`) * 0.012, 6, 5]} />
					<meshBasicMaterial color="#fff6e0" transparent opacity={0.7} />
				</mesh>
			))}
		</ThreeCanvas>
	);
};
