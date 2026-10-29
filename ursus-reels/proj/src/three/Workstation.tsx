import {useMemo} from 'react';
import * as THREE from 'three';
import {C} from '../design/tokens';
import {canvasTexture, V3} from './stage';

// Stream screen: dark UI, ember LIVE pill, chat lines. No invented numbers.
const screenTexture = (live: boolean) =>
	canvasTexture(640, 380, (ctx) => {
		ctx.fillStyle = '#1f1d1f';
		ctx.fillRect(0, 0, 640, 380);
		ctx.fillStyle = '#2c2a2c';
		ctx.fillRect(24, 24, 420, 332);
		// silhouette of a streamer cam
		ctx.fillStyle = '#3a3739';
		ctx.beginPath();
		ctx.arc(234, 170, 52, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillRect(150, 236, 168, 120);
		if (live) {
			ctx.fillStyle = C.ember;
			ctx.beginPath();
			ctx.roundRect(40, 40, 118, 44, 10);
			ctx.fill();
			ctx.fillStyle = C.bone;
			ctx.font = '800 26px Unbounded';
			ctx.textBaseline = 'middle';
			ctx.fillText('LIVE', 72, 63);
			ctx.beginPath();
			ctx.arc(56, 62, 6, 0, Math.PI * 2);
			ctx.fill();
		}
		// chat
		for (let i = 0; i < 7; i++) {
			ctx.fillStyle = i % 3 === 0 ? 'rgba(255,107,44,0.8)' : 'rgba(236,232,226,0.55)';
			ctx.fillRect(462, 40 + i * 46, 30, 14);
			ctx.fillStyle = 'rgba(236,232,226,0.35)';
			ctx.fillRect(500, 40 + i * 46, 60 + ((i * 37) % 70), 14);
		}
	});

export const Workstation: React.FC<{position: V3; rotationY: number; screenGlow: number; live: boolean}> = ({
	position,
	rotationY,
	screenGlow,
	live,
}) => {
	const mats = useMemo(
		() => ({
			clay: new THREE.MeshStandardMaterial({color: C.bone, roughness: 0.85}),
			dark: new THREE.MeshStandardMaterial({color: C.graphite, roughness: 0.6}),
			screen: new THREE.MeshBasicMaterial({map: screenTexture(live), toneMapped: false}),
		}),
		[live],
	);
	mats.screen.color = new THREE.Color(screenGlow, screenGlow, screenGlow);
	return (
		<group position={position} rotation={[0, rotationY, 0]}>
			{/* desk */}
			<mesh position={[0, 0.74, 0]} material={mats.clay} castShadow receiveShadow>
				<boxGeometry args={[1.4, 0.05, 0.7]} />
			</mesh>
			{[-0.65, 0.65].map((x) => (
				<mesh key={x} position={[x, 0.36, 0]} material={mats.clay} castShadow>
					<boxGeometry args={[0.05, 0.72, 0.64]} />
				</mesh>
			))}
			{/* monitor */}
			<mesh position={[0, 1.12, -0.18]} material={mats.dark} castShadow>
				<boxGeometry args={[0.92, 0.54, 0.035]} />
			</mesh>
			<mesh position={[0, 1.12, -0.16]} material={mats.screen}>
				<planeGeometry args={[0.86, 0.5]} />
			</mesh>
			<mesh position={[0, 0.84, -0.2]} material={mats.dark} castShadow>
				<boxGeometry args={[0.06, 0.2, 0.04]} />
			</mesh>
			<mesh position={[0, 0.775, -0.18]} material={mats.dark} castShadow>
				<boxGeometry args={[0.26, 0.015, 0.16]} />
			</mesh>
			{/* keyboard */}
			<mesh position={[0, 0.775, 0.1]} material={mats.dark} castShadow>
				<boxGeometry args={[0.44, 0.018, 0.14]} />
			</mesh>
			{/* microphone on an arm */}
			<mesh position={[0.52, 0.95, -0.1]} rotation={[0, 0, 0.5]} material={mats.dark} castShadow>
				<cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
			</mesh>
			<mesh position={[0.42, 1.14, 0.0]} rotation={[0.5, 0, 0]} material={mats.dark} castShadow>
				<capsuleGeometry args={[0.035, 0.09, 6, 12]} />
			</mesh>
			{live ? <pointLight position={[0, 1.15, 0.25]} color={C.ember} intensity={1.6 * screenGlow} distance={2.2} /> : null}
		</group>
	);
};
