import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {clamp, easeInOut} from '../design/tokens';
import {Agent, agentRest, Cam, Ground, Lights, lerp3, useDustMaterials, V3, Wall} from './CsWorld';

const ON_AT = 8;

// Loudspeaker horns on a pole: the "all-talk" switch made physical
const Speakers: React.FC<{on: boolean; frame: number}> = ({on, frame}) => {
	const m = useDustMaterials();
	const horn = useMemo(() => new THREE.ConeGeometry(0.32, 0.6, 20, 1, true), []);
	const kick = on ? Math.sin(frame * 2.6) * 0.03 : 0;
	return (
		<group position={[0, 0, -2.2]}>
			<mesh material={m.metal} position={[0, 1.8, 0]} castShadow>
				<cylinderGeometry args={[0.05, 0.06, 3.6, 10]} />
			</mesh>
			{[-1, 1].map((s) => (
				<group key={s} position={[s * 0.32, 3.35 + kick, 0]} rotation={[0, 0, (s * Math.PI) / 2]} scale={[1 + Math.abs(kick) * 2, 1, 1 + Math.abs(kick) * 2]}>
					<mesh geometry={horn} material={m.metal} castShadow>
						<meshStandardMaterial color="#5b6168" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
					</mesh>
				</group>
			))}
			<mesh position={[0, 3.62, 0.06]}>
				<sphereGeometry args={[0.06, 12, 10]} />
				<meshBasicMaterial color={on ? '#ff3b2f' : '#552222'} />
			</mesh>
		</group>
	);
};

export const AllTalkDust: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const on = frame >= ON_AT;
	const rage = interpolate(frame, [ON_AT + 2, ON_AT + 14], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.6))});
	const push = interpolate(frame, [0, 75], [0, 1], {...clamp, easing: easeInOut});
	const jolt = on ? Math.exp(-(frame - ON_AT) / 9) * 0.18 + 0.025 : 0;
	const pos = lerp3([0.3, 2.1, 6.4], [0, 1.85, 4.9], push);
	pos[0] += Math.sin(frame * 2.3) * jolt;
	pos[1] += Math.cos(frame * 2.9) * jolt;
	// profiles: CT on the left facing right, T on the right facing left, staggered in depth
	const cts: V3[] = [[-1.05, 0, 0.6], [-1.5, 0, -0.6], [-0.9, 0, -1.7]];
	const ts: V3[] = [[1.05, 0, 0.4], [1.5, 0, -0.8], [0.9, 0, -1.9]];
	const pose = (i: number, side: number) => ({
		...agentRest,
		yaw: side * (Math.PI / 2 - 0.35),
		aim: on ? 0 : 0.2,
		chest: rage,
		beat: frame * 0.85 + i * 1.7,
		headBack: rage * (0.55 + 0.45 * Math.sin(frame / 4 + i * 2)),
	});
	return (
		<ThreeCanvas width={width} height={height} shadows gl={{antialias: true}} style={{position: 'absolute'}}>
			<Cam pos={pos} look={[0, 1.55, -0.9]} fov={48} />
			<Lights sun={[-5, 11, 6]} />
			<Ground />
			<Wall size={[14, 4.5, 0.6]} position={[0, 0, -5.5]} />
			<Wall size={[0.6, 3.6, 8]} position={[-5.5, 0, -1.5]} />
			<Wall size={[0.6, 3.6, 8]} position={[5.5, 0, -1.5]} />
			<mesh position={[0, 1.3, -5.15]} castShadow>
				<boxGeometry args={[2.0, 2.6, 0.12]} />
				<meshStandardMaterial color="#3E6E8E" roughness={0.7} />
			</mesh>
			<Speakers on={on} frame={frame} />
			{/* sound rings from the horns */}
			{on
				? [0, 1, 2, 3].map((k) =>
						[-1, 1].map((s) => {
							const age = (frame - ON_AT + k * 6) % 24;
							const r = 0.3 + age * 0.14;
							return (
								<mesh key={`${k}${s}`} position={[s * (0.7 + age * 0.12), 3.35, -2.2]} rotation={[0, Math.PI / 2, 0]}>
									<torusGeometry args={[r, 0.02, 6, 40]} />
									<meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 0.55 - age / 40)} />
								</mesh>
							);
						}),
					)
				: null}
			{cts.map((p, i) => (
				<Agent key={`c${i}`} team="ct" position={p} pose={pose(i, 1)} />
			))}
			{ts.map((p, i) => (
				<Agent key={`t${i}`} team="t" position={p} pose={pose(i + 3, -1)} />
			))}
		</ThreeCanvas>
	);
};
