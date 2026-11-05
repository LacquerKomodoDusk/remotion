import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {interpolate, spring, useVideoConfig} from 'remotion';
import * as THREE from 'three';

// Glossy cartoon 3D muted mic, Fortnite-like palette (storm purple / loot gold) with toon outline.
const NAVY = '#0B1530';

const Outlined: React.FC<{geo: THREE.BufferGeometry; color: string; pos?: [number, number, number]; rot?: [number, number, number]; metal?: number}> = ({geo, color, pos = [0, 0, 0], rot = [0, 0, 0], metal = 0.25}) => (
	<group position={pos} rotation={rot}>
		<mesh geometry={geo}>
			<meshStandardMaterial color={color} roughness={0.22} metalness={metal} />
		</mesh>
		<mesh geometry={geo} scale={1.09}>
			<meshBasicMaterial color={NAVY} side={THREE.BackSide} />
		</mesh>
	</group>
);

export const MicMute: React.FC<{t: number; start: number; slashAt: number; exit: number; px: number; py: number}> = ({t, start, slashAt, exit, px, py}) => {
	const {fps} = useVideoConfig();
	const geos = useMemo(
		() => ({
			head: new THREE.CapsuleGeometry(0.2, 0.26, 12, 32),
			band: new THREE.TorusGeometry(0.205, 0.035, 16, 48),
			yoke: new THREE.TorusGeometry(0.3, 0.04, 16, 48, Math.PI),
			stem: new THREE.CylinderGeometry(0.04, 0.04, 0.3, 24),
			base: new THREE.CylinderGeometry(0.2, 0.22, 0.06, 40),
			slash: new THREE.BoxGeometry(0.1, 1.25, 0.12),
		}),
		[],
	);
	const lf = (t - start) * fps;
	const ex = (t - exit) * fps;
	if (lf < 0 || ex > 12) return null;
	const inP = spring({frame: lf, fps, config: {damping: 10, stiffness: 170}});
	const slashP = spring({frame: (t - slashAt) * fps, fps, config: {damping: 8, stiffness: 260}});
	const outP = ex > 0 ? interpolate(ex, [0, 10], [0, 1], {extrapolateRight: 'clamp'}) : 0;
	const s = inP * (1 - outP) * 1.0;
	const rotY = interpolate(inP, [0, 1], [-2.6, 0.32]) + Math.sin(lf / 9) * 0.08;
	const wob = Math.sin(lf / 5) * 0.06 * (1 - Math.min(1, lf / 40));
	// screen anchor (px): left of the face, over the monitor in the background — never on the face
	const U = 1920 / (2 * 10 * Math.tan((30 / 2) * (Math.PI / 180)));
	const x = (px - 540) / U;
	const y = (960 - py) / U;
	return (
		<div style={{position: 'absolute', inset: 0}}>
			<ThreeCanvas width={1080} height={1920} camera={{fov: 30, position: [0, 0, 10]}} gl={{antialias: true, alpha: true}}>
				<ambientLight intensity={0.9} />
				<directionalLight position={[3, 4, 6]} intensity={2.4} />
				<directionalLight position={[-4, 1, -3]} intensity={1.6} color="#7CC8FF" />
				<group position={[x, y, 0]} scale={s * 0.95} rotation={[0.12, rotY, wob]}>
					<Outlined geo={geos.head} color="#7B3CFF" pos={[0, 0.25, 0]} />
					<Outlined geo={geos.band} color="#FFC83D" pos={[0, 0.18, 0]} rot={[Math.PI / 2, 0, 0]} metal={0.6} />
					<Outlined geo={geos.yoke} color="#FFC83D" pos={[0, 0.12, 0]} rot={[0, 0, Math.PI]} metal={0.6} />
					<Outlined geo={geos.stem} color="#FFC83D" pos={[0, -0.33, 0]} metal={0.6} />
					<Outlined geo={geos.base} color="#3B1A8F" pos={[0, -0.5, 0]} />
					<group rotation={[0, -rotY * 0.6, -0.78]} position={[0, 0.02, 0.28]} scale={[1, Math.max(0.001, slashP), 1]}>
						<Outlined geo={geos.slash} color="#FF4A5C" />
					</group>
				</group>
			</ThreeCanvas>
		</div>
	);
};
