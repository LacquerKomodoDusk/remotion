import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {Chibi, Pose, restPose} from '../chibi/Chibi';
import {Toon, useToon} from '../chibi/toon';
import {C, clamp, easeInOut, easeOutExpo} from '../design/tokens';

type V3 = [number, number, number];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const ARCHER: V3 = [0, 0, 0];
const BANDIT: V3 = [0.3, 0, -7];
const BOW: V3 = [-0.12, 0.5, -0.45];
const IMPACT: V3 = [0.3, 0.72, -7 + 0.25];
const WIDE_CAM = {pos: [0.3, 1.3, 2.2] as V3, look: [0.08, 0.35, -6] as V3};

type State = {
	cam: {pos: V3; look: V3; fov: number};
	archer: Pose;
	bandit: Pose;
	arrow: number | null; // 0..1 along the flight, null = not in the air
	impact: number | null; // frames since impact
	ripples: number[]; // ages of the bullet-time air ripples
};

const arrowAt = (p: number): V3 => lerp3(BOW, IMPACT, p);

// orbit around the arrow tip in bullet time
const orbitCam = (p: number, theta: number, r: number): {pos: V3; look: V3; fov: number} => {
	const tip = arrowAt(p);
	const look = lerp3(tip, IMPACT, 0.6);
	return {pos: [look[0] + Math.sin(theta) * r, look[1] + 0.12, look[2] + Math.cos(theta) * r], look, fov: 46};
};

const idle = (t: number, phase: number) => Math.sin(t / 6 + phase) * 0.012;
const blinkAt = (t: number, at: number) => interpolate(t, [at, at + 2, at + 4], [0, 1, 0], clamp);

export const hookState = (t: number, fps: number): State => {
	const raise = spring({frame: t - 6, fps, config: {damping: 12, mass: 0.6}});
	const draw = t < 24 ? interpolate(t, [13, 23], [0, 1], {...clamp, easing: Easing.in(Easing.quad)}) : 0;
	const anticip = interpolate(t, [17, 23, 25, 30], [1, 0.93, 1.07, 1], clamp);
	const archer: Pose = {...restPose, bow: raise, draw, squash: anticip, bob: idle(t, 0), blink: blinkAt(t, 3)};
	const bandit: Pose = {...restPose, bob: idle(t, 2), blink: blinkAt(t, 44) + blinkAt(t, 60)};
	let arrow: number | null = null;
	let cam = {pos: lerp3(WIDE_CAM.pos, [0.3, 1.22, 1.95], interpolate(t, [0, 24], [0, 1], clamp)), look: WIDE_CAM.look, fov: 40};
	if (t >= 24) {
		const fly = interpolate(t, [24, 33], [0, 0.9], {...clamp, easing: easeOutExpo});
		arrow = t < 33 ? fly : 0.9 + interpolate(t, [33, 75], [0, 0.02], clamp);
		// camera snaps from the wide shot onto the arrow in 0.3 s
		const snap = interpolate(t, [24, 33], [0, 1], {...clamp, easing: easeOutExpo});
		const orbit = orbitCam(arrow, interpolate(t, [33, 75], [0.3, 0.55], clamp), 1.6);
		cam = {pos: lerp3(cam.pos, orbit.pos, snap), look: lerp3(cam.look, orbit.look, snap), fov: 40 - 2 * snap};
	}
	return {cam, archer, bandit, arrow, impact: null, ripples: []};
};

export const bulletState = (t: number, fps: number): State => {
	const base = hookState(75, fps);
	const p = interpolate(t, [0, 44], [0.92, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const theta = interpolate(t, [0, 44], [0.55, 1.05], clamp);
	const since = t - 44;
	const ripples = [0, 6, 12, 18, 24, 30, 36].map((s) => t - s).filter((a) => a >= 0 && a < 20 && t < 44);
	if (since < 0) {
		return {...base, cam: orbitCam(p, theta, interpolate(t, [0, 44], [1.6, 0.85], {...clamp, easing: Easing.in(Easing.quad)})), arrow: p, ripples, impact: null};
	}
	const jerk = spring({frame: since, fps, config: {damping: 7, mass: 0.5, stiffness: 220}});
	const fall = interpolate(since, [4, 28], [0, 1.45], {...clamp, easing: Easing.in(Easing.quad)});
	const shake = Math.exp(-since / 6) * 0.04;
	const cam = orbitCam(1, theta + since * 0.006, 0.95 + interpolate(since, [0, 28], [0, 0.6], {...clamp, easing: easeOutExpo}));
	cam.pos = [cam.pos[0] + Math.sin(since * 2.1) * shake, cam.pos[1] + Math.cos(since * 2.7) * shake, cam.pos[2]];
	const bandit: Pose = {
		...restPose,
		headTilt: 0,
		headRoll: -0.9 * jerk * Math.exp(-since / 30),
		squash: interpolate(since, [0, 2, 6], [0.85, 1.08, 1], clamp),
		fallRoll: -fall,
		blink: 1,
		arrowInHead: true,
	};
	return {cam, archer: base.archer, bandit, arrow: null, impact: since, ripples: []};
};

export const outroState = (t: number, fps: number): State => {
	if (t >= 45) {
		return hookState(0, fps); // last frames are exactly frame 0 of the hook: the loop seam
	}
	const up = spring({frame: t - 2, fps, config: {damping: 10, mass: 0.6}});
	const tuck = interpolate(t, [20, 32], [0, 1], {...clamp, easing: easeInOut});
	const sausageUp = up * (1 - tuck);
	const hop = Math.max(0, Math.sin(interpolate(t, [2, 14], [0, Math.PI], clamp))) * 0.08;
	const archer: Pose = {...restPose, sausageUp, bob: hop, squash: interpolate(t, [2, 5, 10, 14, 17], [1, 0.92, 1.06, 0.95, 1], clamp)};
	const front = {pos: [0.6, 0.8, -1.35] as V3, look: [0, 0.62, 0] as V3};
	const back = interpolate(t, [26, 45], [0, 1], {...clamp, easing: easeInOut});
	const cam = {pos: lerp3(front.pos, WIDE_CAM.pos, back), look: lerp3(front.look, WIDE_CAM.look, back), fov: 40};
	return {cam, archer, bandit: {...restPose}, arrow: null, impact: null, ripples: []};
};

const CameraRig: React.FC<{cam: State['cam']}> = ({cam}) => {
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	camera.position.set(...cam.pos);
	camera.fov = cam.fov;
	camera.lookAt(...cam.look);
	camera.updateProjectionMatrix();
	return null;
};

const Arrow: React.FC<{p: number}> = ({p}) => {
	const shaft = useToon('#7A4A2A');
	const tip = useToon('#9AA3AD');
	const fletch = useToon(C.yellow);
	const geo = useMemo(
		() => ({
			shaft: new THREE.CylinderGeometry(0.009, 0.009, 0.6, 8),
			tip: new THREE.ConeGeometry(0.022, 0.07, 10),
			fletch: new THREE.BoxGeometry(0.004, 0.09, 0.07),
		}),
		[],
	);
	const pos = arrowAt(p);
	const q = new THREE.Quaternion().setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		new THREE.Vector3(IMPACT[0] - BOW[0], IMPACT[1] - BOW[1], IMPACT[2] - BOW[2]).normalize(),
	);
	return (
		<group position={pos} quaternion={q}>
			<group position={[0, -0.3, 0]}>
				<Toon geometry={geo.shaft} material={shaft} line={1.25} />
				<Toon geometry={geo.tip} material={tip} position={[0, 0.33, 0]} />
				{[0, 1, 2].map((i) => (
					<mesh key={i} geometry={geo.fletch} material={fletch} position={[0, -0.25, 0]} rotation={[0, (i * Math.PI * 2) / 3, 0]} />
				))}
			</group>
		</group>
	);
};

const Village: React.FC = () => {
	const grass = useToon('#6E7F2E');
	const path = useToon('#9C7A55');
	const wall = useToon(C.parchment);
	const timber = useToon(C.wood);
	const thatch = useToon('#A88A4E');
	const tree = useToon('#3E5A22');
	const trunk = useToon('#4A2E1E');
	const geo = useMemo(
		() => ({
			house: new THREE.BoxGeometry(2, 1.1, 1.4),
			roof: new THREE.ConeGeometry(1.55, 0.9, 4),
			beam: new THREE.BoxGeometry(2.04, 0.08, 1.44),
			cone: new THREE.ConeGeometry(0.45, 1.3, 8),
			trunk: new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8),
			post: new THREE.BoxGeometry(0.07, 0.45, 0.07),
			rail: new THREE.BoxGeometry(0.04, 0.05, 2.2),
		}),
		[],
	);
	const houses: [V3, number][] = [
		[[1.3, 0, -8.8], 0.1],
		[[-2.3, 0, -9.8], -0.3],
		[[3.6, 0, -6.4], 0.6],
	];
	return (
		<>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={grass}>
				<planeGeometry args={[80, 80]} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0.04]} position={[0.2, 0.005, -4]} receiveShadow material={path}>
				<planeGeometry args={[1.3, 12]} />
			</mesh>
			{houses.map(([p, r]) => (
				<group key={p[0]} position={p} rotation={[0, r, 0]}>
					<Toon geometry={geo.house} material={wall} position={[0, 0.55, 0]} line={1.02} />
					<mesh geometry={geo.beam} material={timber} position={[0, 0.6, 0]} />
					<Toon geometry={geo.roof} material={thatch} position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.75]} line={1.02} />
				</group>
			))}
			{([[-1.7, 0, -4.2], [2.4, 0, -3.4], [-3.4, 0, -6.5], [4.6, 0, -9.5]] as V3[]).map((p) => (
				<group key={p[0]} position={p}>
					<Toon geometry={geo.trunk} material={trunk} position={[0, 0.2, 0]} />
					<Toon geometry={geo.cone} material={tree} position={[0, 1.0, 0]} line={1.04} />
				</group>
			))}
			{[-1.1, 1.6].map((x) => (
				<group key={x} position={[x, 0, -2.4]}>
					{[-1, 0, 1].map((k) => (
						<mesh key={k} geometry={geo.post} material={timber} position={[0, 0.22, k]} castShadow />
					))}
					<mesh geometry={geo.rail} material={timber} position={[0, 0.34, 0]} />
				</group>
			))}
		</>
	);
};

// Bullet-time air ripples trailing the arrow, impact burst
const Effects: React.FC<{state: State}> = ({state}) => {
	const ring = useMemo(() => new THREE.TorusGeometry(0.06, 0.004, 6, 40), []);
	const star = useMemo(() => new THREE.OctahedronGeometry(0.03, 0), []);
	const q = useMemo(
		() =>
			new THREE.Quaternion().setFromUnitVectors(
				new THREE.Vector3(0, 0, 1),
				new THREE.Vector3(IMPACT[0] - BOW[0], IMPACT[1] - BOW[1], IMPACT[2] - BOW[2]).normalize(),
			),
		[],
	);
	return (
		<>
			{state.arrow !== null
				? state.ripples.map((age, i) => {
						const back = arrowAt(state.arrow! - 0.012 - age * 0.0015);
						const s = 1 + age * 0.35;
						return (
							<mesh key={i} geometry={ring} position={back} quaternion={q} scale={[s, s, s]}>
								<meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - age / 20)} />
							</mesh>
						);
					})
				: null}
			{state.impact !== null ? (
				<group position={IMPACT}>
					<mesh scale={[1, 1, 1].map(() => 0.05 + state.impact! * 0.06) as V3}>
						<sphereGeometry args={[1, 24, 16]} />
						<meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 0.9 - state.impact! * 0.15)} />
					</mesh>
					<mesh quaternion={q} scale={[1, 1, 1].map(() => 1 + state.impact! * 1.6) as V3}>
						<torusGeometry args={[0.1, 0.008, 6, 48]} />
						<meshBasicMaterial color={C.yellow} transparent opacity={Math.max(0, 1 - state.impact! / 16)} />
					</mesh>
					{new Array(14).fill(0).map((_, i) => {
						const a = random(`a${i}`) * Math.PI * 2;
						const b = (random(`b${i}`) - 0.3) * 1.6;
						const d = state.impact! * (0.025 + random(`d${i}`) * 0.03);
						return (
							<mesh
								key={i}
								geometry={star}
								position={[Math.cos(a) * d, b * d + 0.02 * state.impact!, Math.sin(a) * d]}
								rotation={[state.impact! * 0.3, i, 0]}
							>
								<meshBasicMaterial color={i % 3 ? C.yellow : '#ffffff'} transparent opacity={Math.max(0, 1 - state.impact! / 22)} />
							</mesh>
						);
					})}
				</group>
			) : null}
		</>
	);
};

export const World: React.FC<{mode: 'hook' | 'bullet' | 'outro'}> = ({mode}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const state = mode === 'hook' ? hookState(frame, fps) : mode === 'bullet' ? bulletState(frame, fps) : outroState(frame, fps);
	return (
		<ThreeCanvas width={width} height={height} shadows gl={{antialias: true}} style={{position: 'absolute'}}>
			<color attach="background" args={[C.sky]} />
			<fog attach="fog" args={[C.sky, 9, 22]} />
			<CameraRig cam={state.cam} />
			<ambientLight intensity={0.6} />
			<directionalLight
				position={[4, 6, 2]}
				intensity={1.6}
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-camera-left={-6}
				shadow-camera-right={6}
				shadow-camera-top={6}
				shadow-camera-bottom={-12}
				shadow-camera-far={30}
			/>
			<Village />
			<Chibi role="archer" pose={state.archer} position={ARCHER} rotationY={0} />
			<Chibi role="bandit" pose={state.bandit} position={BANDIT} rotationY={-Math.PI / 2} />
			{state.arrow !== null ? <Arrow p={state.arrow} /> : null}
			<Effects state={state} />
		</ThreeCanvas>
	);
};
