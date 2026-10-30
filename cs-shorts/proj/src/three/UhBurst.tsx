import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {C, clamp} from '../design/tokens';
import {text3d} from './text3d';
import {useToon} from './toon';

// Every "УХ!" he shouts leaves his mouth as a fat 3D word and flies at the camera, spinning.
// `spawns` are the word onsets in this scene's local frames.
export const UhBurst: React.FC<{spawns: number[]; mouth: [number, number]}> = ({spawns, mouth}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const mats = [useToon(C.yellow), useToon(C.red), useToon('#ffffff')];
	const outline = useMemo(() => new THREE.MeshBasicMaterial({color: C.ink, side: THREE.BackSide}), []);
	// screen point of the mouth -> world point on the z=0 plane (camera z=10, fov 40)
	const vh = 2 * 10 * Math.tan((20 * Math.PI) / 180);
	const mx = ((mouth[0] - width / 2) / height) * vh;
	const my = -((mouth[1] - height / 2) / height) * vh;
	const words = spawns.flatMap((s, i) => [0, 1].map((k) => ({s: s + k * 3, i: i * 2 + k})));
	return (
		<ThreeCanvas width={width} height={height} gl={{alpha: true, antialias: true}} camera={{position: [0, 0, 10], fov: 40}} style={{position: 'absolute'}}>
			<ambientLight intensity={0.8} />
			<directionalLight position={[3, 4, 6]} intensity={1.5} />
			{words.map(({s, i}) => {
				const t = frame - s;
				if (t < 0 || t > 26) {
					return null;
				}
				const p = interpolate(t, [0, 26], [0, 1], {...clamp, easing: (x) => x * x});
				const dir = (random(`d${i}`) - 0.5) * 2;
				const x = mx + dir * 3.2 * p;
				const y = my + (random(`u${i}`) * 2.5 + 0.8) * p;
				const z = interpolate(p, [0, 1], [0, 8.6]);
				const sc = interpolate(t, [0, 4, 26], [0.2, 1, 1.2], clamp);
				const rot: [number, number, number] = [Math.sin(t / 4 + i) * 0.4, dir * t * 0.08, (random(`r${i}`) - 0.5) * 0.8 + t * 0.03 * dir];
				const g = text3d('УХ!', 0.7);
				return (
					<group key={i} position={[x, y, z]} rotation={rot} scale={[sc, sc, sc]}>
						<mesh geometry={g} material={mats[i % 3]} />
						<mesh geometry={g} material={outline} scale={[1.035, 1.035, 1.035]} />
					</group>
				);
			})}
		</ThreeCanvas>
	);
};
