import {useThree} from '@react-three/fiber';
import {useMemo} from 'react';
import {random} from 'remotion';
import * as THREE from 'three';
import {C} from '../design/tokens';

export type V3 = [number, number, number];

export const lerp3 = (a: V3, b: V3, t: number): V3 => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t,
	a[2] + (b[2] - a[2]) * t,
];

export const CameraRig: React.FC<{position: V3; target: V3; fov: number}> = ({position, target, fov}) => {
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	camera.position.set(...position);
	camera.fov = fov;
	camera.lookAt(...target);
	camera.updateProjectionMatrix();
	return null;
};

// Clay room: graphite floor, bone walls fading into ink fog, one soft key + ember fill
export const Room: React.FC<{light: number}> = ({light}) => {
	return (
		<>
			<color attach="background" args={[C.ink]} />
			<fog attach="fog" args={[C.ink, 3.2, 8]} />
			<hemisphereLight args={[C.bone, C.graphite, 0.55 * light]} />
			<directionalLight
				position={[-2.5, 4, 2.5]}
				intensity={2.2 * light}
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-camera-left={-3}
				shadow-camera-right={3}
				shadow-camera-top={3}
				shadow-camera-bottom={-3}
				shadow-bias={-0.0004}
				shadow-radius={6}
			/>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[30, 30]} />
				<meshStandardMaterial color={C.graphite} roughness={0.9} />
			</mesh>
			<mesh position={[0, 2, -2.2]} receiveShadow>
				<planeGeometry args={[30, 6]} />
				<meshStandardMaterial color={C.bone} roughness={0.95} />
			</mesh>
		</>
	);
};

// Dust in the light: deterministic drifting points
export const Dust: React.FC<{frame: number; count: number; center: V3; size: V3}> = ({frame, count, center, size}) => {
	const base = useMemo(
		() =>
			new Array(count).fill(0).map((_, i) => [
				(random(`dx${i}`) - 0.5) * size[0],
				(random(`dy${i}`) - 0.5) * size[1],
				(random(`dz${i}`) - 0.5) * size[2],
				random(`ds${i}`),
			]),
		[count, size],
	);
	const positions = useMemo(() => new Float32Array(count * 3), [count]);
	base.forEach(([x, y, z, s], i) => {
		positions[i * 3] = center[0] + x + Math.sin(frame / 40 + s * 9) * 0.05;
		positions[i * 3 + 1] = center[1] + ((y + frame * 0.002 * (0.4 + s) + size[1] / 2) % size[1]) - size[1] / 2;
		positions[i * 3 + 2] = center[2] + z + Math.cos(frame / 50 + s * 7) * 0.05;
	});
	return (
		<points key={frame}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[positions, 3]} />
			</bufferGeometry>
			<pointsMaterial color={C.bone} size={0.012} transparent opacity={0.55} depthWrite={false} />
		</points>
	);
};

// Capsule between two points (for the faceless mannequin)
export const Limb: React.FC<{a: V3; b: V3; r: number; material: THREE.Material}> = ({a, b, r, material}) => {
	const va = new THREE.Vector3(...a);
	const vb = new THREE.Vector3(...b);
	const dir = vb.clone().sub(va);
	const len = dir.length();
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
	const mid = va.clone().add(vb).multiplyScalar(0.5);
	return (
		<mesh position={mid} quaternion={q} material={material} castShadow>
			<capsuleGeometry args={[r, Math.max(0.001, len), 8, 16]} />
		</mesh>
	);
};

export const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	draw(canvas.getContext('2d')!);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
};
