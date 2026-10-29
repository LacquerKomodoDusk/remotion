import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {C, clamp, easeInOut} from '../design/tokens';
import {useFontsReady} from '../design/fonts';
import {ChairModel} from './ChairModel';
import {CameraRig, Dust, lerp3, Limb, Room, V3} from './stage';
import {Workstation} from './Workstation';

// Faceless clay mannequin seated in the chair; spine visible through a translucent body
const Mannequin: React.FC<{frame: number; glow: number}> = ({frame, glow}) => {
	const body = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: C.bone,
				roughness: 0.7,
				transparent: true,
				opacity: 0.5,
				depthWrite: false,
			}),
		[],
	);
	const solid = useMemo(() => new THREE.MeshStandardMaterial({color: C.bone, roughness: 0.75}), []);
	const bone = useMemo(() => new THREE.MeshStandardMaterial({color: C.bone, roughness: 0.4}), []);
	const hot = useMemo(() => new THREE.MeshStandardMaterial({color: C.ember, emissive: C.ember, roughness: 0.4}), []);
	hot.emissiveIntensity = 0.6 + glow;
	const type = (i: number) => Math.sin(frame / 2.3 + i * 2) * 0.006;
	const vertebrae = new Array(12).fill(0).map((_, i) => {
		const t = i / 11;
		// gentle S-curve: lumbar lordosis forward, thoracic back
		const y = 0.66 + t * 0.68;
		const z = -0.07 - t * 0.09 + Math.sin(t * Math.PI * 1.2) * 0.035 - 0.03;
		return [0, y, z] as V3;
	});
	return (
		<group position={[0, 0, -0.03]}>
			<mesh position={[0, 0.66, -0.02]} scale={[1.25, 0.8, 1]} material={body}>
				<sphereGeometry args={[0.13, 24, 16]} />
			</mesh>
			<Limb a={[0, 0.76, 0.02]} b={[0, 1.12, -0.06]} r={0.14} material={body} />
			<Limb a={[0, 1.2, -0.08]} b={[0, 1.33, -0.12]} r={0.05} material={body} />
			<mesh position={[0, 1.43, -0.1]} material={solid} castShadow>
				<sphereGeometry args={[0.1, 32, 24]} />
			</mesh>
			{[-1, 1].map((s) => (
				<group key={s}>
					<Limb a={[s * 0.1, 0.64, 0.0]} b={[s * 0.11, 0.63, 0.4]} r={0.072} material={solid} />
					<Limb a={[s * 0.11, 0.6, 0.42]} b={[s * 0.12, 0.1, 0.46]} r={0.055} material={solid} />
					<mesh position={[s * 0.12, 0.03, 0.52]} material={solid} castShadow>
						<boxGeometry args={[0.08, 0.05, 0.18]} />
					</mesh>
					<Limb a={[s * 0.2, 1.1, -0.06]} b={[s * 0.23, 0.87, 0.12]} r={0.048} material={solid} />
					<Limb a={[s * 0.23, 0.87, 0.12]} b={[s * 0.13, 0.81 + type(s), 0.56]} r={0.04} material={solid} />
				</group>
			))}
			{vertebrae.map((p, i) => (
				<mesh key={i} position={p} material={i < 3 || i > 9 ? hot : bone}>
					<sphereGeometry args={[i > 9 ? 0.018 : 0.024, 12, 10]} />
				</mesh>
			))}
		</group>
	);
};

export const DeskScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const ready = useFontsReady();
	const pull = interpolate(frame, [0, 44], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const drift = interpolate(frame, [44, 139], [0, 1], {...clamp, easing: easeInOut});
	const camNear: V3 = [0.62, 0.8, -0.02];
	const camMid: V3 = [3.55, 1.4, 0.7];
	const camFar: V3 = [3.75, 1.45, -0.1];
	const pos = drift > 0 ? lerp3(camMid, camFar, drift) : lerp3(camNear, camMid, pull);
	const target = lerp3([0, 0.74, -0.16], [0, 0.86, 0.05], pull);
	const pulse = (Math.sin(frame / 5) + 1) / 2;
	const verdict = interpolate(frame, [70, 86], [0, 1], clamp);
	return (
		<ThreeCanvas width={width} height={height} shadows gl={{antialias: true}} style={{position: 'absolute'}}>
			<CameraRig position={pos} target={target} fov={36} />
			<Room light={1 - verdict * 0.45} />
			<Dust frame={frame} count={80} center={[0.3, 1.1, 0.2]} size={[2.2, 1.6, 2]} />
			{ready ? (
				<>
					<ChairModel highlight={{neck: 1, lumbar: 1, dim: 0.45}} pulse={pulse} position={[0, 0, 0]} rotationY={0} />
					<Workstation position={[0, 0, 0.8]} rotationY={Math.PI} screenGlow={0.9} live={false} />
				</>
			) : null}
			<Mannequin frame={frame} glow={pulse} />
			<pointLight position={[0.15, 1.28, -0.1]} color={C.ember} intensity={0.25 + 0.35 * pulse} distance={0.45} />
			<pointLight position={[0.15, 0.74, 0.0]} color={C.ember} intensity={0.25 + 0.35 * pulse} distance={0.45} />
		</ThreeCanvas>
	);
};
