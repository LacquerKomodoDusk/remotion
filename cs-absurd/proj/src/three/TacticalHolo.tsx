import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {clamp, easeInOut} from '../design/tokens';
import {useFontsReady} from '../design/fonts';
import {Figure, HOLO, HoloBox, HoloCam, HoloStage, Label, lerp3, pathAt, Trail, V3} from './Holo';

// Schematic (not to scale) replay: he hides behind a crate looking forward; the enemy crosses
// the open area in front of him, comes back through the arch and stops right by his pillar.
const ME: V3 = [0, 0, 0];
const PATH1: V3[] = [[-4.5, 0, -7], [-1.5, 0, -6.4], [1.5, 0, -6.8], [4.2, 0, -6.2]];
const PATH2: V3[] = [[3.2, 0, -4.6], [2.2, 0, -3.0], [1.5, 0, -1.6], [1.15, 0, -0.75]];

const Cone: React.FC = () => {
	const geo = useMemo(() => {
		const s = new THREE.Shape();
		s.moveTo(0, 0);
		s.lineTo(-4.6, -8);
		s.lineTo(4.6, -8);
		s.lineTo(0, 0);
		return new THREE.ShapeGeometry(s);
	}, []);
	return (
		<mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[1, -1, 1]}>
			<meshBasicMaterial color={HOLO.us} transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
		</mesh>
	);
};

export const TacticalHolo: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const ready = useFontsReady();
	// camera: from straight top-down into a low 3/4 view near him
	const cam = interpolate(frame, [0, 40], [0, 1], {...clamp, easing: easeInOut});
	const orbit = interpolate(frame, [40, 120], [0, 0.35], clamp);
	const top: V3 = [0.4, 17, 3.0];
	const iso: V3 = [7 * Math.cos(0.75 + orbit), 7.5, 7 * Math.sin(0.75 + orbit) + 3];
	const pos = lerp3(top, iso, cam);
	const look = lerp3([0.2, 0, -3.6], [0.6, 0.6, -3.0], cam);
	const p1 = interpolate(frame, [8, 42], [0, 1], clamp);
	const p2 = interpolate(frame, [46, 82], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
	const enemy = frame < 44 ? pathAt(PATH1, p1) : pathAt(PATH2, p2);
	const hit = frame - 90;
	const seen = interpolate(frame, [8, 42], [0, 4.4], clamp) + interpolate(frame, [46, 82], [0, 4.3], clamp);
	const fall = hit > 0 ? interpolate(hit, [0, 10], [0, 1.45], {...clamp, easing: Easing.in(Easing.quad)}) : 0;
	return (
		<ThreeCanvas width={width} height={height} gl={{antialias: true}} style={{position: 'absolute'}}>
			<HoloCam pos={pos} look={look} fov={50} />
			<HoloStage size={10} />
			{/* crate "14", the pillar, the arch and the far wall — schematic */}
			<HoloBox size={[1.2, 1.0, 1.2]} position={[-0.55, 0.5, -0.35]} color={HOLO.line} />
			<HoloBox size={[0.7, 3.0, 0.7]} position={[1.55, 1.5, -0.9]} color={HOLO.line} />
			<HoloBox size={[0.5, 2.6, 0.5]} position={[2.3, 1.3, -4.0]} color={HOLO.line} />
			<HoloBox size={[0.5, 2.6, 0.5]} position={[4.1, 1.3, -4.0]} color={HOLO.line} />
			<HoloBox size={[2.3, 0.4, 0.5]} position={[3.2, 2.8, -4.0]} color={HOLO.line} />
			<HoloBox size={[11, 3, 0.4]} position={[0, 1.5, -8.6]} color={HOLO.grid} opacity={0.08} />
			<Cone />
			<Figure position={ME} color={HOLO.us} />
			<Trail points={PATH1} progress={p1} color={HOLO.enemy} />
			{frame >= 44 ? <Trail points={PATH2} progress={p2} color={HOLO.enemy} /> : null}
			<group position={enemy}>
				<group rotation={[0, 0, -fall]}>
					<Figure position={[0, 0, 0]} color={HOLO.enemy} opacity={hit > 20 ? 0.5 : 0.9} />
				</group>
			</group>
			{hit >= 0
				? new Array(12).fill(0).map((_, i) => {
						const a = random(`h${i}`) * Math.PI * 2;
						const d = Math.min(hit, 12) * 0.06;
						return (
							<mesh key={i} position={[enemy[0] + Math.cos(a) * d, 1.4 + random(`v${i}`) * d, enemy[2] + Math.sin(a) * d]}>
								<octahedronGeometry args={[0.06, 0]} />
								<meshBasicMaterial color={HOLO.enemy} transparent opacity={Math.max(0, 1 - hit / 16)} />
							</mesh>
						);
					})
				: null}
			{ready ? (
				<>
					<Label text="ОН" position={[0, 2.2, 0]} color={HOLO.us} size={0.42} />
					<Label text={frame < 90 ? `ВРАГ · В КАДРЕ ${seen.toFixed(1).replace('.', ',')} с` : 'ВРАГ · УБИТ НЕ ИМ'} position={[enemy[0], 2.35, enemy[2]]} color={HOLO.enemy} size={0.32} />
					{frame >= 76 ? <Label text="ВПЛОТНУЮ" position={[0.6, 0.3, 0.6]} color={HOLO.gold} size={0.32} /> : null}
					{frame >= 96 ? <Label text="ЕГО ВЫСТРЕЛОВ: 0" position={[0.9, 3.0, 0.4]} color={HOLO.gold} size={0.34} /> : null}
				</>
			) : null}
		</ThreeCanvas>
	);
};
