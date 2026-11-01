import {useThree} from '@react-three/fiber';
import {useMemo} from 'react';
import {random} from 'remotion';
import * as THREE from 'three';

// Lit, game-like look (Dust II palette): sand, plaster, blue sky, hard sun with soft shadows.
export const DUST = {
	sky: '#9CC8F0',
	sand: '#CDB28A',
	wall: '#D9C49B',
	wallDark: '#B89B6E',
	wood: '#8A6B45',
	door: '#3E6E8E',
};

export type V3 = [number, number, number];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const Cam: React.FC<{pos: V3; look: V3; fov: number}> = ({pos, look, fov}) => {
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	camera.position.set(...pos);
	camera.fov = fov;
	camera.lookAt(...look);
	camera.updateProjectionMatrix();
	return null;
};

// procedural grain so flat colours read as sand / plaster
const grain = (base: string, amount: number, seed: string) => {
	const s = 256;
	const c = document.createElement('canvas');
	c.width = s;
	c.height = s;
	const ctx = c.getContext('2d')!;
	ctx.fillStyle = base;
	ctx.fillRect(0, 0, s, s);
	for (let i = 0; i < 2600; i++) {
		const v = random(`${seed}${i}`);
		ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${amount * random(`${seed}a${i}`)})` : `rgba(60,40,20,${amount * random(`${seed}b${i}`)})`;
		const r = 1 + random(`${seed}r${i}`) * 3;
		ctx.fillRect(random(`${seed}x${i}`) * s, random(`${seed}y${i}`) * s, r, r);
	}
	const t = new THREE.CanvasTexture(c);
	t.wrapS = THREE.RepeatWrapping;
	t.wrapT = THREE.RepeatWrapping;
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
};

export const useDustMaterials = () =>
	useMemo(() => {
		const sandTex = grain(DUST.sand, 0.18, 'sand');
		sandTex.repeat.set(12, 12);
		const wallTex = grain(DUST.wall, 0.14, 'wall');
		wallTex.repeat.set(2, 2);
		return {
			sand: new THREE.MeshStandardMaterial({map: sandTex, roughness: 1}),
			wall: new THREE.MeshStandardMaterial({map: wallTex, roughness: 0.95}),
			trim: new THREE.MeshStandardMaterial({color: DUST.wallDark, roughness: 0.95}),
			wood: new THREE.MeshStandardMaterial({color: DUST.wood, roughness: 0.85}),
			door: new THREE.MeshStandardMaterial({color: DUST.door, roughness: 0.7}),
			metal: new THREE.MeshStandardMaterial({color: '#4a4f55', roughness: 0.4, metalness: 0.6}),
		};
	}, []);

export const Lights: React.FC<{sun?: V3}> = ({sun = [6, 10, 5]}) => (
	<>
		<color attach="background" args={[DUST.sky]} />
		<fog attach="fog" args={[DUST.sky, 18, 45]} />
		<hemisphereLight args={['#dfefff', '#b8935e', 0.75]} />
		<directionalLight
			position={sun}
			intensity={2.4}
			color="#fff3dc"
			castShadow
			shadow-mapSize-width={2048}
			shadow-mapSize-height={2048}
			shadow-camera-left={-12}
			shadow-camera-right={12}
			shadow-camera-top={12}
			shadow-camera-bottom={-12}
			shadow-bias={-0.0005}
		/>
	</>
);

export const Ground: React.FC = () => {
	const m = useDustMaterials();
	return (
		<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.sand}>
			<planeGeometry args={[80, 80]} />
		</mesh>
	);
};

export const Wall: React.FC<{size: V3; position: V3; rotationY?: number}> = ({size, position, rotationY = 0}) => {
	const m = useDustMaterials();
	return (
		<group position={position} rotation={[0, rotationY, 0]}>
			<mesh material={m.wall} castShadow receiveShadow position={[0, size[1] / 2, 0]}>
				<boxGeometry args={size} />
			</mesh>
			<mesh material={m.trim} castShadow position={[0, size[1] + 0.08, 0]}>
				<boxGeometry args={[size[0] + 0.1, 0.16, size[2] + 0.1]} />
			</mesh>
		</group>
	);
};

export const Crate: React.FC<{position: V3; size?: number}> = ({position, size = 1.1}) => {
	const m = useDustMaterials();
	return (
		<group position={position}>
			<mesh material={m.wood} castShadow receiveShadow position={[0, size / 2, 0]}>
				<boxGeometry args={[size, size, size]} />
			</mesh>
			{[-1, 1].map((s) => (
				<mesh key={s} material={m.trim} position={[0, size / 2, s * (size / 2 + 0.005)]}>
					<boxGeometry args={[size * 0.92, 0.08, 0.01]} />
				</mesh>
			))}
		</group>
	);
};

export type AgentPose = {
	aim: number; // rifle shouldered
	crouch: number;
	headBack: number; // howling, head thrown back
	chest: number; // 0..1 chest-beating intensity
	beat: number; // phase for chest-beating
	walk: number; // walk-cycle phase (0 = standing)
	yaw: number;
};

export const agentRest: AgentPose = {aim: 0, crouch: 0, headBack: 0, chest: 0, beat: 0, walk: 0, yaw: 0};

const G = {
	leg: new THREE.CapsuleGeometry(0.09, 0.62, 6, 12),
	boot: new THREE.BoxGeometry(0.16, 0.12, 0.3),
	torso: new THREE.CapsuleGeometry(0.21, 0.42, 8, 16),
	vest: new THREE.BoxGeometry(0.48, 0.5, 0.34),
	pouch: new THREE.BoxGeometry(0.12, 0.13, 0.08),
	arm: new THREE.CapsuleGeometry(0.065, 0.24, 6, 10),
	forearm: new THREE.CapsuleGeometry(0.058, 0.22, 6, 10),
	hand: new THREE.SphereGeometry(0.06, 10, 8),
	mouth: new THREE.SphereGeometry(0.05, 12, 8),
	head: new THREE.SphereGeometry(0.15, 24, 18),
	helmet: new THREE.SphereGeometry(0.175, 24, 12, 0, Math.PI * 2, 0, Math.PI / 1.9),
	goggles: new THREE.BoxGeometry(0.24, 0.05, 0.1),
	mask: new THREE.SphereGeometry(0.158, 24, 18),
	rifleBody: new THREE.BoxGeometry(0.06, 0.1, 0.62),
	rifleBarrel: new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8),
	rifleMag: new THREE.BoxGeometry(0.05, 0.16, 0.07),
	rifleStock: new THREE.BoxGeometry(0.05, 0.1, 0.2),
};

// Counter-Terrorist (helmet, navy kit) or Terrorist (balaclava, tan kit), with an assault rifle
export const Agent: React.FC<{team: 'ct' | 't'; pose: AgentPose; position: V3}> = ({team, pose, position}) => {
	const mats = useMemo(() => {
		const ct = team === 'ct';
		return {
			shirt: new THREE.MeshStandardMaterial({color: ct ? '#3E4A5A' : '#8B6B4A', roughness: 0.9}),
			pants: new THREE.MeshStandardMaterial({color: ct ? '#2F3742' : '#5B5143', roughness: 0.9}),
			vest: new THREE.MeshStandardMaterial({color: ct ? '#2A3038' : '#4B4A35', roughness: 0.8}),
			skin: new THREE.MeshStandardMaterial({color: '#C99A78', roughness: 0.7}),
			gear: new THREE.MeshStandardMaterial({color: ct ? '#3B4636' : '#222222', roughness: 0.6}),
			boot: new THREE.MeshStandardMaterial({color: '#1e1e1e', roughness: 0.8}),
			gun: new THREE.MeshStandardMaterial({color: '#242424', roughness: 0.45, metalness: 0.5}),
			glass: new THREE.MeshStandardMaterial({color: '#111827', roughness: 0.2, metalness: 0.4}),
		};
	}, [team]);
	const sw = Math.sin(pose.walk) * 0.45;
	const down = pose.crouch * 0.38;
	// chest beating: hands alternately slam the chest
	const bl = pose.chest * (0.5 + 0.5 * Math.sin(pose.beat));
	const br = pose.chest * (0.5 + 0.5 * Math.sin(pose.beat + Math.PI));
	const armL = -0.35 - pose.aim * 1.05 - bl * 1.5;
	const armR = -0.35 - pose.aim * 1.25 - br * 1.5;
	return (
		<group position={position} rotation={[0, pose.yaw, 0]}>
			<group position={[0, -down, 0]}>
				{[-1, 1].map((s) => (
					<group key={s} position={[s * 0.11, 0.86 + down * 0.4, 0]} rotation={[s * sw - pose.crouch * 1.1, 0, 0]}>
						<mesh geometry={G.leg} material={mats.pants} position={[0, -0.4, 0]} castShadow />
						<mesh geometry={G.boot} material={mats.boot} position={[0, -0.8, 0.06]} castShadow />
					</group>
				))}
				<group position={[0, 1.2, 0]} rotation={[-pose.headBack * 0.35 + pose.crouch * 0.3, 0, 0]}>
					<mesh geometry={G.torso} material={mats.shirt} castShadow />
					<mesh geometry={G.vest} material={mats.vest} position={[0, 0.05, 0]} castShadow />
					{[-0.13, 0, 0.13].map((x) => (
						<mesh key={x} geometry={G.pouch} material={mats.vest} position={[x, -0.05, 0.2]} castShadow />
					))}
					{/* arms with elbows: rifle hold, or fists hammering the chest */}
					{[-1, 1].map((side) => {
						const hit = side < 0 ? bl : br;
						const shoulder = -0.2 - pose.aim * 1.1 - pose.chest * (0.9 + hit * 0.5);
						const elbow = -0.4 - pose.aim * 0.6 - pose.chest * (1.6 + hit * 0.5);
						return (
							<group key={side} position={[side * 0.29, 0.22, 0]} rotation={[shoulder, 0, side * (0.1 + pose.chest * 0.25)]}>
								<mesh geometry={G.arm} material={mats.shirt} position={[0, -0.17, 0]} castShadow />
								<group position={[0, -0.33, 0]} rotation={[elbow, 0, -side * pose.chest * 0.6]}>
									<mesh geometry={G.forearm} material={mats.shirt} position={[0, -0.15, 0]} castShadow />
									<mesh geometry={G.hand} material={mats.skin} position={[0, -0.3, 0]} castShadow />
								</group>
							</group>
						);
					})}
					{pose.chest < 0.5 ? (
						<group position={[0.06, 0.02 + pose.aim * 0.22, 0.32]} rotation={[-0.15 + pose.aim * 0.15, 0, 0]}>
							<mesh geometry={G.rifleBody} material={mats.gun} castShadow />
							<mesh geometry={G.rifleBarrel} material={mats.gun} position={[0, 0.01, 0.46]} rotation={[Math.PI / 2, 0, 0]} />
							<mesh geometry={G.rifleMag} material={mats.gun} position={[0, -0.11, 0.08]} rotation={[0.25, 0, 0]} />
							<mesh geometry={G.rifleStock} material={mats.gun} position={[0, -0.02, -0.38]} />
						</group>
					) : null}
					{/* head */}
					<group position={[0, 0.5, 0]} rotation={[-pose.headBack * 0.9, 0, 0]}>
						<mesh geometry={G.head} material={mats.skin} castShadow />
						{/* mouth opens as the head goes back */}
						<mesh geometry={G.mouth} position={[0, -0.06, 0.13]} scale={[1, 0.2 + pose.headBack * 1.2, 0.6]}>
							<meshBasicMaterial color="#2a0d0d" />
						</mesh>
						{team === 'ct' ? (
							<>
								<mesh geometry={G.helmet} material={mats.gear} position={[0, 0.03, 0]} castShadow />
								<mesh geometry={G.goggles} material={mats.glass} position={[0, 0.07, 0.13]} />
							</>
						) : (
							<>
								<mesh geometry={G.mask} material={mats.gear} />
								<mesh material={mats.skin} position={[0, 0.02, 0.135]}>
									<boxGeometry args={[0.16, 0.05, 0.04]} />
								</mesh>
								<mesh geometry={G.mouth} position={[0, -0.07, 0.14]} scale={[1, 0.2 + pose.headBack * 1.2, 0.6]}>
									<meshBasicMaterial color="#2a0d0d" />
								</mesh>
							</>
						)}
					</group>
				</group>
			</group>
		</group>
	);
};
