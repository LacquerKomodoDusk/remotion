import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from '../../public/fonts/unbounded-800-latin.typeface.json';
import {C, clamp, easeIn} from '../design/tokens';
import {CameraRig} from './stage';

// Bevelled URZUS: flies through the camera, lands flat in the frame plane, then hands over to the 2D badge
export const Title3D: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const geometry = useMemo(() => {
		const font = new FontLoader().parse(fontJson as never);
		const g = new TextGeometry('URZUS', {
			font,
			size: 1,
			depth: 0.32,
			curveSegments: 10,
			bevelEnabled: true,
			bevelThickness: 0.06,
			bevelSize: 0.035,
			bevelSegments: 6,
		});
		g.computeBoundingBox();
		g.center();
		const w = g.boundingBox!.max.x - g.boundingBox!.min.x;
		g.scale(2.55 / w, 2.55 / w, 2.55 / w);
		return g;
	}, []);
	const mats = useMemo(
		() => [
			new THREE.MeshStandardMaterial({color: C.bone, roughness: 0.35, metalness: 0.1, transparent: true}),
			new THREE.MeshStandardMaterial({color: C.graphite, roughness: 0.3, metalness: 0.6, transparent: true}),
		],
		[],
	);

	const land = spring({frame: frame - 1, fps, config: {damping: 15, mass: 0.9, stiffness: 90}});
	const out = interpolate(frame, [34, 44], [0, 1], {...clamp, easing: easeIn});
	const z = interpolate(land, [0, 1], [-16, 0]);
	const x = interpolate(land, [0, 1], [2.6, 0]);
	const ry = interpolate(land, [0, 1], [1.25, 0]) + Math.sin(frame / 9) * 0.03 * (1 - out);
	const rx = interpolate(land, [0, 1], [-0.5, 0]);
	// screen-space: rest at y≈1080px, then shrink toward the badge in the top right
	const restY = -0.38;
	const y = interpolate(out, [0, 1], [restY, 1.92]);
	const xr = x + interpolate(out, [0, 1], [0, -0.95]);
	const s = interpolate(out, [0, 1], [1, 0.22]);
	mats.forEach((m) => {
		m.opacity = interpolate(out, [0.6, 1], [1, 0], clamp);
	});
	return (
		<ThreeCanvas width={width} height={height} gl={{alpha: true, antialias: true}} style={{position: 'absolute'}}>
			<CameraRig position={[0, 0, 12]} target={[0, 0, 0]} fov={30} />
			<ambientLight intensity={0.45} />
			<directionalLight position={[-3, 4, 6]} intensity={2.6} />
			<pointLight position={[3, -1, -2]} color={C.ember} intensity={30} distance={12} />
			<pointLight position={[-2, 2, 3]} color={C.bone} intensity={8} distance={10} />
			<mesh geometry={geometry} material={mats} position={[xr, y, z]} rotation={[rx, ry, 0]} scale={[s, s, s]} />
		</ThreeCanvas>
	);
};
