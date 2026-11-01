import {useThree} from '@react-three/fiber';
import {useMemo} from 'react';
import * as THREE from 'three';

// Shared look of every "projection": dark navy, glowing grid, translucent bodies with bright edges.
export const HOLO = {bg: '#071423', grid: '#1F6FA8', line: '#7FD8FF', us: '#49B6FF', enemy: '#FF4A4A', gold: '#FFD21E'};

export type V3 = [number, number, number];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const HoloCam: React.FC<{pos: V3; look: V3; fov: number}> = ({pos, look, fov}) => {
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	camera.position.set(...pos);
	camera.fov = fov;
	camera.lookAt(...look);
	camera.updateProjectionMatrix();
	return null;
};

export const HoloStage: React.FC<{size: number}> = ({size}) => (
	<>
		<color attach="background" args={[HOLO.bg]} />
		<fog attach="fog" args={[HOLO.bg, size * 0.9, size * 2.2]} />
		<gridHelper args={[size * 2, size * 2, HOLO.grid, '#123B5C']} />
		<ambientLight intensity={1} />
	</>
);

// translucent solid + glowing outline
export const HoloBox: React.FC<{size: V3; position: V3; color: string; opacity?: number}> = ({size, position, color, opacity = 0.18}) => {
	const geo = useMemo(() => new THREE.BoxGeometry(...size), [size[0], size[1], size[2]]);
	const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
	return (
		<group position={position}>
			<mesh geometry={geo}>
				<meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
			</mesh>
			<lineSegments geometry={edges}>
				<lineBasicMaterial color={color} />
			</lineSegments>
		</group>
	);
};

// Faceless figure: capsule body + head, team-coloured
export const Figure: React.FC<{position: V3; color: string; scale?: number; armsUp?: number; tilt?: number; opacity?: number}> = ({
	position,
	color,
	scale = 1,
	armsUp = 0,
	tilt = 0,
	opacity = 0.9,
}) => {
	const g = useMemo(
		() => ({body: new THREE.CapsuleGeometry(0.17, 0.55, 6, 14), head: new THREE.SphereGeometry(0.15, 18, 14), arm: new THREE.CapsuleGeometry(0.05, 0.38, 4, 8), leg: new THREE.CapsuleGeometry(0.07, 0.5, 4, 8)}),
		[],
	);
	const m = useMemo(() => new THREE.MeshBasicMaterial({color, transparent: true, opacity}), [color, opacity]);
	return (
		<group position={position} scale={[scale, scale, scale]} rotation={[0, 0, tilt]}>
			{[-0.09, 0.09].map((x) => (
				<mesh key={x} geometry={g.leg} material={m} position={[x, 0.32, 0]} />
			))}
			<mesh geometry={g.body} material={m} position={[0, 0.95, 0]} />
			<mesh geometry={g.head} material={m} position={[0, 1.55, 0]} />
			{[-1, 1].map((s) => (
				<group key={s} position={[s * 0.24, 1.2, 0]} rotation={[0, 0, s * (0.25 + armsUp * 2.5)]}>
					<mesh geometry={g.arm} material={m} position={[0, -0.22, 0]} />
				</group>
			))}
		</group>
	);
};

// Camera-facing text label
export const Label: React.FC<{text: string; position: V3; color: string; size?: number; opacity?: number}> = ({text, position, color, size = 0.6, opacity = 1}) => {
	const tex = useMemo(() => {
		const c = document.createElement('canvas');
		const ctx = c.getContext('2d')!;
		ctx.font = '900 96px Rubik';
		const w = Math.ceil(ctx.measureText(text).width) + 60;
		c.width = w;
		c.height = 140;
		const ctx2 = c.getContext('2d')!;
		ctx2.font = '900 96px Rubik';
		ctx2.fillStyle = 'rgba(7,20,35,0.75)';
		ctx2.fillRect(0, 0, w, 140);
		ctx2.strokeStyle = color;
		ctx2.lineWidth = 6;
		ctx2.strokeRect(3, 3, w - 6, 134);
		ctx2.fillStyle = color;
		ctx2.textBaseline = 'middle';
		ctx2.fillText(text, 30, 74);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return {t, aspect: w / 140};
	}, [text, color]);
	return (
		<sprite position={position} scale={[size * tex.aspect, size, 1]}>
			<spriteMaterial map={tex.t} transparent opacity={opacity} depthTest={false} />
		</sprite>
	);
};

// polyline drawn progressively (0..1)
export const Trail: React.FC<{points: V3[]; progress: number; color: string}> = ({points, progress, color}) => {
	const n = points.length - 1;
	const k = Math.max(0, Math.min(1, progress)) * n;
	const pts: THREE.Vector3[] = [];
	for (let i = 0; i <= Math.floor(k); i++) {
		pts.push(new THREE.Vector3(...points[i]));
	}
	if (k < n && k > 0) {
		const i = Math.floor(k);
		pts.push(new THREE.Vector3(...lerp3(points[i], points[i + 1], k - i)));
	}
	const line = new THREE.Line(
		new THREE.BufferGeometry().setFromPoints(pts.length > 1 ? pts : [new THREE.Vector3(...points[0]), new THREE.Vector3(...points[0])]),
		new THREE.LineBasicMaterial({color}),
	);
	return <primitive object={line} />;
};

export const pathAt = (points: V3[], progress: number): V3 => {
	const n = points.length - 1;
	const k = Math.min(n - 1e-6, Math.max(0, progress * n));
	const i = Math.floor(k);
	return lerp3(points[i], points[i + 1], k - i);
};
