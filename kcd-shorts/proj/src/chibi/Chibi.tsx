import {useMemo} from 'react';
import * as THREE from 'three';
import {C} from '../design/tokens';
import {Toon, useToon} from './toon';

// Crash-test target: yellow/black quadrant disc
const markerTexture = (() => {
	let tex: THREE.CanvasTexture | null = null;
	return () => {
		if (tex) {
			return tex;
		}
		const s = 128;
		const canvas = document.createElement('canvas');
		canvas.width = s;
		canvas.height = s;
		const ctx = canvas.getContext('2d')!;
		const q = (a: number, color: string) => {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.moveTo(s / 2, s / 2);
			ctx.arc(s / 2, s / 2, s / 2 - 4, a, a + Math.PI / 2);
			ctx.closePath();
			ctx.fill();
		};
		q(0, '#141210');
		q(Math.PI / 2, C.yellow);
		q(Math.PI, '#141210');
		q(Math.PI * 1.5, C.yellow);
		ctx.strokeStyle = '#141210';
		ctx.lineWidth = 6;
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
		ctx.stroke();
		tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		return tex;
	};
})();

const G = {
	head: new THREE.SphereGeometry(0.24, 32, 24),
	body: new THREE.CapsuleGeometry(0.14, 0.16, 8, 20),
	tunic: new THREE.CylinderGeometry(0.155, 0.2, 0.2, 24),
	leg: new THREE.CapsuleGeometry(0.055, 0.1, 6, 12),
	arm: new THREE.CapsuleGeometry(0.048, 0.18, 6, 12),
	eye: new THREE.SphereGeometry(0.036, 16, 12),
	glint: new THREE.SphereGeometry(0.012, 8, 6),
	brim: new THREE.CylinderGeometry(0.34, 0.34, 0.025, 32),
	dome: new THREE.SphereGeometry(0.255, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
	belt: new THREE.TorusGeometry(0.17, 0.02, 8, 32),
	bow: new THREE.TorusGeometry(0.3, 0.016, 8, 40, Math.PI * 0.8),
	quiver: new THREE.CylinderGeometry(0.05, 0.045, 0.3, 12),
	sausage: new THREE.CapsuleGeometry(0.045, 0.2, 8, 16),
	sword: new THREE.BoxGeometry(0.035, 0.34, 0.012),
	marker: new THREE.CircleGeometry(0.075, 32),
	shaft: new THREE.CylinderGeometry(0.009, 0.009, 0.3, 8),
	fletch: new THREE.BoxGeometry(0.06, 0.07, 0.004),
};

export type Pose = {
	bow: number; // 0 lowered, 1 raised and aimed
	draw: number; // string pulled back
	squash: number; // squash & stretch multiplier on Y
	headTilt: number; // head rotation back (radians), for the hit
	fall: number; // whole body tipping backwards (radians)
	blink: number; // 0 open, 1 closed
	sausageUp: number; // 0 tucked on the belt, 1 raised like a trophy
	bob: number; // idle / bounce offset
	headRoll: number; // head knocked sideways by the hit
	fallRoll: number; // whole body tipping sideways
	arrowInHead: boolean;
};

export const restPose: Pose = {bow: 0, draw: 0, squash: 1, headTilt: 0, fall: 0, blink: 0, sausageUp: 0, bob: 0, headRoll: 0, fallRoll: 0, arrowInHead: false};

export const Chibi: React.FC<{role: 'archer' | 'bandit'; pose: Pose; position: [number, number, number]; rotationY: number}> = ({
	role,
	pose,
	position,
	rotationY,
}) => {
	const skin = useToon('#F4C542');
	const tunic = useToon(role === 'archer' ? C.wood : '#2E3440');
	const sleeve = useToon(role === 'archer' ? C.wood : '#3F6FB5');
	const leg = useToon('#3a2a20');
	const metal = useToon('#9AA3AD');
	const dark = useToon('#141210');
	const bowMat = useToon('#7A4A2A');
	const sausageMat = useToon('#A1452C');
	const fletch = useToon(C.yellow);
	const white = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);
	const marker = useMemo(() => new THREE.MeshBasicMaterial({map: markerTexture(), transparent: true}), []);
	const stringMat = useMemo(() => new THREE.LineBasicMaterial({color: '#f5ead0'}), []);

	const armL = (Math.PI / 2) * pose.bow; // forward
	const armR = (Math.PI / 2) * Math.max(pose.bow, pose.sausageUp * 1.85);
	const pull = pose.draw * 0.2;
	// bow string from top tip to bottom tip, pulled back in the middle
	const bowTop = new THREE.Vector3(0, 0.27, 0.1);
	const bowBot = new THREE.Vector3(0, -0.27, 0.1);
	const mid = new THREE.Vector3(0, 0, 0.1 + pull);
	const stringGeo = new THREE.BufferGeometry().setFromPoints([bowTop, mid, bowBot]);

	return (
		<group position={position} rotation={[0, rotationY, 0]}>
			<group rotation={[pose.fall, 0, pose.fallRoll]}>
				<group position={[0, pose.bob, 0]} scale={[1 / Math.sqrt(pose.squash), pose.squash, 1 / Math.sqrt(pose.squash)]}>
					{[-1, 1].map((s) => (
						<Toon key={s} geometry={G.leg} material={leg} position={[s * 0.07, 0.1, 0]} />
					))}
					<Toon geometry={G.body} material={skin} position={[0, 0.36, 0]} scale={[1, 1, 0.85]} />
					<Toon geometry={G.tunic} material={tunic} position={[0, 0.3, 0]} />
					<mesh geometry={G.belt} material={dark} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} />
					<mesh geometry={G.marker} material={marker} position={[0, 0.4, -0.141]} rotation={[0, Math.PI, 0]} scale={[0.8, 0.8, 0.8]} />
					{/* left arm (bow hand) */}
					<group position={[-0.19, 0.46, 0]} rotation={[armL, 0, 0.15 * (1 - pose.bow)]}>
						<Toon geometry={G.arm} material={sleeve} position={[0, -0.12, 0]} />
						{role === 'archer' ? (
							<group position={[0, -0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
								<group rotation={[0, Math.PI / 2, Math.PI * 0.6]}>
									<Toon geometry={G.bow} material={bowMat} line={1.15} />
								</group>
								<lineSegments geometry={stringGeo} material={stringMat} rotation={[0, 0, 0]} />
							</group>
						) : null}
					</group>
					{/* right arm (draw hand / sausage hand) */}
					<group position={[0.19, 0.46, pose.draw * 0.12]} rotation={[armR, 0, -0.15 * (1 - pose.bow)]}>
						<Toon geometry={G.arm} material={sleeve} position={[0, -0.12, 0]} />
						{pose.sausageUp > 0.02 ? (
							<Toon geometry={G.sausage} material={sausageMat} position={[0, -0.3, 0]} rotation={[0, 0, 0.3]} scale={[1.35, 1.35, 1.35]} />
						) : null}
					</group>
					{/* sausage on the belt (the loop detail) */}
					{role === 'archer' && pose.sausageUp <= 0.02 ? (
						<Toon geometry={G.sausage} material={sausageMat} position={[0.16, 0.27, -0.08]} rotation={[0.3, 0, 0.25]} />
					) : null}
					{role === 'archer' ? (
						<Toon geometry={G.quiver} material={bowMat} position={[-0.06, 0.45, 0.16]} rotation={[0.35, 0, 0.3]} />
					) : (
						<Toon geometry={G.sword} material={metal} position={[-0.2, 0.2, -0.02]} rotation={[0, 0, 0.2]} />
					)}
					{/* head pivots at the neck so the hit snaps it back */}
					<group position={[0, 0.5, 0]} rotation={[pose.headTilt, 0, pose.headRoll]}>
						<Toon geometry={G.head} material={skin} position={[0, 0.22, 0]} />
						{[-1, 1].map((s) => (
							<group key={s} position={[s * 0.085, 0.24, -0.205]} scale={[1, 1 - 0.9 * pose.blink, 1]}>
								<mesh geometry={G.eye} material={dark} />
								<mesh geometry={G.glint} material={white} position={[0.012, 0.014, -0.03]} />
							</group>
						))}
						{[-1, 1].map((s) => (
							<mesh key={s} geometry={G.marker} material={marker} position={[s * 0.241, 0.22, 0]} rotation={[0, (s * Math.PI) / 2, 0]} />
						))}
						{pose.arrowInHead ? (
							<group position={[0.3, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
								<mesh geometry={G.shaft} material={bowMat} />
								<mesh geometry={G.fletch} material={fletch} position={[0, -0.13, 0]} />
							</group>
						) : null}
						{role === 'archer' ? (
							<>
								<Toon geometry={G.brim} material={metal} position={[0, 0.37, 0]} />
								<Toon geometry={G.dome} material={metal} position={[0, 0.36, 0]} />
							</>
						) : (
							// the target on the forehead
							<mesh geometry={G.marker} material={marker} position={[0, 0.36, -0.19]} rotation={[-0.6, Math.PI, 0]} scale={[0.9, 0.9, 0.9]} />
						)}
					</group>
				</group>
			</group>
		</group>
	);
};
