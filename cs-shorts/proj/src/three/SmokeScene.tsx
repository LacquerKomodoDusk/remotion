import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {C, clamp} from '../design/tokens';
import {useFontsReady} from '../design/fonts';
import {text3d} from './text3d';
import {Toon, useToon} from './toon';

const signTexture = () => {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 320;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#F2E9D8';
	ctx.fillRect(0, 0, 512, 320);
	ctx.strokeStyle = '#141210';
	ctx.lineWidth = 14;
	ctx.strokeRect(7, 7, 498, 306);
	ctx.fillStyle = '#E0453A';
	ctx.font = '900 70px Rubik';
	ctx.textAlign = 'center';
	ctx.fillText('НЕ', 256, 120);
	ctx.fillText('БЕСПОКОИТЬ', 256, 230);
	ctx.fillStyle = '#141210';
	ctx.font = '900 34px Rubik';
	ctx.fillText('сижу в смоке', 256, 290);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
};

const Cam: React.FC<{z: number; y: number}> = ({z, y}) => {
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	camera.position.set(0.3, y, z);
	camera.lookAt(0, 1.2, 0);
	camera.updateProjectionMatrix();
	return null;
};

// The teammate's "position": a cartoon smoke cloud with a do-not-disturb sign and a barrel poking out.
// "ВЫЙДИ!" flies in on the shout and bounces off. `shout` = local frame of the word.
export const SmokeScene: React.FC<{shout: number; insult: number}> = ({shout, insult}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const smoke = useToon('#C9CED6');
	const smokeDark = useToon('#AEB4BD');
	const ground = useToon('#C9A774');
	const gun = useToon('#2B2D31');
	const word = useToon(C.red);
	const outline = useMemo(() => new THREE.MeshBasicMaterial({color: C.ink, side: THREE.BackSide}), []);
	const ready = useFontsReady();
	const sign = useMemo(() => (ready ? new THREE.MeshBasicMaterial({map: signTexture()}) : null), [ready]);
	const barrelGeo = useMemo(() => new THREE.CylinderGeometry(0.05, 0.05, 1.1, 12), []);
	const puffs = useMemo(
		() =>
			new Array(26).fill(0).map((_, i) => ({
				p: [(random(`x${i}`) - 0.5) * 3.2, 0.5 + random(`y${i}`) * 1.9, (random(`z${i}`) - 0.5) * 1.6] as [number, number, number],
				r: 0.45 + random(`r${i}`) * 0.45,
				ph: random(`p${i}`) * 6,
			})),
		[],
	);
	const sphere = useMemo(() => new THREE.SphereGeometry(1, 24, 18), []);
	const push = interpolate(frame, [0, 40], [7.5, 5.6], {...clamp, easing: Easing.out(Easing.cubic)});
	// "ВЫЙДИ!" flies into the cloud and bounces back out, smaller
	const t = frame - shout;
	const fly = interpolate(t, [0, 7], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
	const bounce = t > 7 ? spring({frame: t - 7, fps, config: {damping: 8, mass: 0.5}}) : 0;
	const wz = t < 0 ? 99 : interpolate(fly, [0, 1], [4.5, 0.9]) + bounce * 0.8;
	const wy = 1.05 + bounce * 0.2 - (t > 7 ? (t - 7) * 0.03 : 0);
	const wrot = t > 7 ? Math.sin(bounce * 3) * 0.35 : 0;
	// the cloud flinches on impact and on the insult
	const hit = Math.exp(-Math.max(0, t - 7) / 4) * (t >= 7 ? 1 : 0) + Math.exp(-Math.max(0, frame - insult) / 4) * (frame >= insult ? 1 : 0);
	const swing = Math.sin(frame / 5) * 0.12 + hit * Math.sin(frame * 1.7) * 0.35;
	const barrel = 0.25 + Math.sin(frame / 3) * 0.04;
	return (
		<ThreeCanvas width={width} height={height} gl={{antialias: true}} style={{position: 'absolute'}}>
			<Cam z={push} y={1.7} />
			<color attach="background" args={['#9CC3E6']} />
			<fog attach="fog" args={['#9CC3E6', 8, 18]} />
			<ambientLight intensity={0.7} />
			<directionalLight position={[3, 6, 4]} intensity={1.4} />
			<mesh rotation={[-Math.PI / 2, 0, 0]} material={ground}>
				<planeGeometry args={[40, 40]} />
			</mesh>
			<group scale={[1 + hit * 0.06, 1 - hit * 0.05, 1]}>
				{puffs.map((q, i) => {
					const wob = 1 + Math.sin(frame / 9 + q.ph) * 0.06;
					return (
						<Toon
							key={i}
							geometry={sphere}
							material={i % 3 ? smoke : smokeDark}
							position={[q.p[0] + Math.sin(frame / 14 + q.ph) * 0.05, q.p[1], q.p[2]]}
							scale={[q.r * wob, q.r * wob, q.r * wob]}
							line={1.04}
						/>
					);
				})}
			</group>
			{/* barrel of the teammate's rifle poking out of the smoke */}
			<group position={[0.95, 1.0, 1.5 + barrel]} rotation={[0, 0.25, 0]}>
				<Toon geometry={barrelGeo} material={gun} rotation={[Math.PI / 2, 0, 0]} />
			</group>
			{/* do-not-disturb sign hanging off the cloud */}
			<group position={[-0.45, 2.55, 1.95]} rotation={[0, 0, swing]}>
				{sign ? (
					<mesh position={[0, -0.55, 0]} material={sign}>
						<planeGeometry args={[1.3, 0.81]} />
					</mesh>
				) : null}
				<mesh position={[0, -0.1, 0]}>
					<torusGeometry args={[0.1, 0.02, 8, 24]} />
					<meshBasicMaterial color={C.ink} />
				</mesh>
			</group>
			{t >= 0 ? (
				<group position={[0.1, wy, wz]} rotation={[0, 0, wrot]}>
					<mesh geometry={text3d('ВЫЙДИ!', 0.42)} material={word} />
					<mesh geometry={text3d('ВЫЙДИ!', 0.42)} material={outline} scale={[1.03, 1.03, 1.03]} />
				</group>
			) : null}
		</ThreeCanvas>
	);
};
