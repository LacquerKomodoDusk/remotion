import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from '../../public/fonts/unbounded-800-latin.typeface.json';
import {C, clamp, easeInOut} from '../design/tokens';
import {useFontsReady} from '../design/fonts';
import {CameraRig, canvasTexture, Dust, lerp3, Room, V3} from './stage';
import {Workstation} from './Workstation';

// Wall calendar: a month grid with the birthday circled in ember
const calendarTexture = () =>
	canvasTexture(400, 460, (ctx) => {
		ctx.fillStyle = C.bone;
		ctx.fillRect(0, 0, 400, 460);
		ctx.fillStyle = C.ink;
		ctx.fillRect(0, 0, 400, 90);
		for (let i = 0; i < 35; i++) {
			const x = 30 + (i % 7) * 50;
			const y = 125 + Math.floor(i / 7) * 62;
			ctx.fillStyle = 'rgba(58,55,57,0.35)';
			ctx.fillRect(x, y, 34, 34);
		}
		ctx.strokeStyle = C.ember;
		ctx.lineWidth = 8;
		ctx.beginPath();
		ctx.arc(30 + 4 * 50 + 17, 125 + 3 * 62 + 17, 30, 0, Math.PI * 2);
		ctx.stroke();
	});

const pageTexture = () =>
	canvasTexture(400, 460, (ctx) => {
		ctx.fillStyle = '#d9d4cc';
		ctx.fillRect(0, 0, 400, 460);
		ctx.fillStyle = C.graphite;
		ctx.fillRect(0, 0, 400, 90);
	});

const GiftBox: React.FC<{lidLift: number; lidTilt: number}> = ({lidLift, lidTilt}) => {
	const clay = useMemo(() => new THREE.MeshStandardMaterial({color: C.bone, roughness: 0.8}), []);
	const ribbon = useMemo(() => new THREE.MeshStandardMaterial({color: C.ember, roughness: 0.5}), []);
	return (
		<group>
			<mesh position={[0, 0.2, 0]} material={clay} castShadow receiveShadow>
				<boxGeometry args={[0.44, 0.4, 0.44]} />
			</mesh>
			<mesh position={[0, 0.2, 0]} material={ribbon}>
				<boxGeometry args={[0.07, 0.402, 0.445]} />
			</mesh>
			<mesh position={[0, 0.2, 0]} material={ribbon}>
				<boxGeometry args={[0.445, 0.402, 0.07]} />
			</mesh>
			<group position={[0, 0.42 + lidLift, 0]} rotation={[lidTilt, 0, lidTilt * 0.6]}>
				<mesh material={clay} castShadow>
					<boxGeometry args={[0.48, 0.07, 0.48]} />
				</mesh>
				<mesh material={ribbon}>
					<boxGeometry args={[0.075, 0.072, 0.485]} />
				</mesh>
				<mesh material={ribbon}>
					<boxGeometry args={[0.485, 0.072, 0.075]} />
				</mesh>
				{[-1, 1].map((s) => (
					<mesh key={s} material={ribbon} position={[s * 0.07, 0.07, 0]} rotation={[0, 0, s * 0.6]} castShadow>
						<torusGeometry args={[0.065, 0.02, 10, 24]} />
					</mesh>
				))}
			</group>
		</group>
	);
};

const GIFT: V3 = [-0.35, 0, -0.55];
const DESK: V3 = [0.75, 0, -1.45];

export const GiftStreamScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const ready = useFontsReady();
	const tex = useMemo(() => (ready ? {cal: calendarTexture(), page: pageTexture()} : null), [ready]);
	const question = useMemo(() => {
		const g = new TextGeometry('?', {
			font: new FontLoader().parse(fontJson as never),
			size: 0.22,
			depth: 0.05,
			bevelEnabled: true,
			bevelThickness: 0.012,
			bevelSize: 0.008,
			bevelSegments: 4,
		});
		g.center();
		return g;
	}, []);
	const emberMat = useMemo(() => new THREE.MeshStandardMaterial({color: C.ember, roughness: 0.4, transparent: true}), []);

	// beat 1 (0-66): "и я за месяц задумала, что ему подарить" — calendar page flips, gift, question mark
	// beat 2 (66-130): "в этом году он увлёкся стримами" — camera travels to the LIVE desk
	const travel = interpolate(frame, [58, 112], [0, 1], {...clamp, easing: easeInOut});
	const dive = interpolate(frame, [114, 134], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const camA = lerp3([-0.62, 1.0, 2.0], [-0.5, 0.95, 1.65], interpolate(frame, [0, 60], [0, 1], clamp));
	const camB: V3 = [0.35, 1.25, 1.05];
	const camC: V3 = [0.75, 1.13, -1.1];
	const camPos = dive > 0 ? lerp3(camB, camC, dive) : lerp3(camA, camB, travel);
	const target = dive > 0 ? lerp3([0.75, 1.12, -1.6], [0.75, 1.12, -1.7], dive) : lerp3([-0.42, 0.42, -0.8], [0.75, 1.0, -1.6], travel);

	const flip = interpolate(frame, [6, 30], [0, Math.PI * 0.95], {...clamp, easing: easeInOut});
	const lidJump = spring({frame: frame - 34, fps, config: {damping: 9, mass: 0.6}});
	const lidLift = Math.sin(Math.min(1, lidJump) * Math.PI) * 0.09;
	const qIn = spring({frame: frame - 38, fps, config: {damping: 14, mass: 0.7}});
	const qOut = interpolate(frame, [70, 80], [1, 0], clamp);
	emberMat.opacity = Math.min(qIn, qOut);
	const ring = interpolate(frame, [86, 104], [0, 1], {...clamp, easing: Easing.out(Easing.exp)});
	const live = 0.85 + 0.15 * Math.sin(frame / 4);

	return (
		<ThreeCanvas width={width} height={height} shadows gl={{antialias: true}} style={{position: 'absolute'}}>
			<CameraRig position={camPos} target={target} fov={42} />
			<Room light={1} />
			<Dust frame={frame} count={90} center={[0, 1.1, -0.8]} size={[2.6, 1.6, 1.8]} />
			{tex ? (
				<group position={[-0.85, 1.45, -2.18]}>
					<mesh>
						<planeGeometry args={[0.5, 0.575]} />
						<meshStandardMaterial map={tex.cal} roughness={0.9} />
					</mesh>
					{/* page flipping over the top edge: "за месяц" */}
					<group position={[0, 0.2875, 0.004]} rotation={[-flip, 0, 0]}>
						<mesh position={[0, -0.2875, 0]}>
							<planeGeometry args={[0.5, 0.575]} />
							<meshStandardMaterial map={tex.page} side={THREE.DoubleSide} roughness={0.9} />
						</mesh>
					</group>
				</group>
			) : null}
			<group position={GIFT} rotation={[0, 0.5, 0]}>
				<GiftBox lidLift={lidLift} lidTilt={lidLift * 0.8} />
				<mesh
					geometry={question}
					material={emberMat}
					position={[0, 0.78 + Math.sin(frame / 8) * 0.025, 0]}
					rotation={[0, Math.sin(frame / 14) * 0.5, 0]}
					scale={[qIn, qIn, qIn]}
				/>
			</group>
			{tex ? <Workstation position={DESK} rotationY={0} screenGlow={live} live /> : null}
			{/* the empty place in front of the desk — where the chair will stand */}
			<mesh position={[DESK[0], 0.004, DESK[2] + 0.75]} rotation={[-Math.PI / 2, 0, 0]}>
				<ringGeometry args={[0.3 * ring, 0.3 * ring + 0.018, 64]} />
				<meshBasicMaterial color={C.ember} transparent opacity={0.9 * ring} />
			</mesh>
		</ThreeCanvas>
	);
};
