import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {clamp, easeInOut} from '../design/tokens';
import {useFontsReady} from '../design/fonts';
import {Figure, HOLO, HoloBox, HoloCam, HoloStage, Label, lerp3, V3} from './Holo';

const T_COLOR = '#FF9A3C';
const SWITCH_AT = 12;
const SHOUTS = ['АААА!', 'РРРР!', 'ГРРР!', 'УУУУ!', 'ААРГХ!', 'ЫЫЫ!', 'ВАААА!', 'ХРРР!'];

// Faceless figure that turns into a beast once all-talk goes live: ears, a snout, leaning in, arms up
const Beast: React.FC<{position: V3; facing: number; color: string; beast: number; frame: number; seed: number}> = ({position, facing, color, beast, frame, seed}) => {
	const m = useMemo(() => new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.92}), [color]);
	const ear = useMemo(() => new THREE.ConeGeometry(0.07, 0.22, 8), []);
	const snout = useMemo(() => new THREE.CylinderGeometry(0.06, 0.1, 0.22, 10), []);
	const shake = beast * Math.sin(frame * 1.9 + seed * 7) * 0.06;
	const hop = beast * Math.max(0, Math.sin(frame / 2.6 + seed * 3)) * 0.16;
	return (
		<group position={[position[0], position[1] + hop, position[2]]} rotation={[0, facing, 0]}>
			<group rotation={[beast * 0.28, 0, shake]}>
				<Figure position={[0, 0, 0]} color={color} armsUp={beast * (0.6 + 0.4 * Math.sin(frame / 2.2 + seed))} />
				<group position={[0, 1.55, 0]} scale={[beast, beast, beast]}>
					{[-1, 1].map((s) => (
						<mesh key={s} geometry={ear} material={m} position={[s * 0.1, 0.17, 0]} rotation={[0, 0, -s * 0.35]} />
					))}
					<mesh geometry={snout} material={m} position={[0, -0.04, 0.17]} rotation={[Math.PI / 2, 0, 0]} />
				</group>
			</group>
		</group>
	);
};

export const AllTalkHolo: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const ready = useFontsReady();
	const flip = spring({frame: frame - SWITCH_AT, fps, config: {damping: 9, mass: 0.5}});
	const on = frame >= SWITCH_AT + 2;
	const beast = interpolate(frame, [SWITCH_AT + 4, SWITCH_AT + 22], [0, 1], {...clamp, easing: Easing.out(Easing.back(2))});
	const push = interpolate(frame, [0, 108], [0, 1], {...clamp, easing: easeInOut});
	const jolt = on ? Math.exp(-(frame - SWITCH_AT - 2) / 10) * 0.25 + 0.04 : 0;
	const pos = lerp3([0.6, 8.5, 10.5], [0.3, 6.8, 8.6], push);
	pos[0] += Math.sin(frame * 2.3) * jolt;
	pos[1] += Math.cos(frame * 2.9) * jolt;
	const ct: V3[] = [[-1.8, 0, 2.6], [-0.9, 0, 2.2], [0, 0, 2.7], [0.9, 0, 2.2], [1.8, 0, 2.6]];
	const tt: V3[] = [[-1.9, 0, -4.6], [-0.95, 0, -4.2], [0, 0, -4.7], [0.95, 0, -4.2], [1.9, 0, -4.6]];
	const heads = [...ct.map((p) => ({p, c: HOLO.us})), ...tt.map((p) => ({p, c: T_COLOR}))];
	return (
		<ThreeCanvas width={width} height={height} gl={{antialias: true}} style={{position: 'absolute'}}>
			<HoloCam pos={pos} look={[0, 0.6, -1.0]} fov={52} />
			<HoloStage size={10} />
			{/* the switch */}
			<HoloBox size={[1.2, 1.1, 0.8]} position={[0, 0.55, -1.0]} color={HOLO.line} />
			<group position={[0, 1.1, -1.0]} rotation={[0, 0, interpolate(flip, [0, 1], [0.7, -0.7])]}>
				<mesh position={[0, 0.55, 0]}>
					<cylinderGeometry args={[0.07, 0.07, 1.1, 12]} />
					<meshBasicMaterial color={on ? HOLO.gold : '#5d7a93'} />
				</mesh>
				<mesh position={[0, 1.12, 0]}>
					<sphereGeometry args={[0.16, 18, 14]} />
					<meshBasicMaterial color={on ? '#ff4a4a' : '#5d7a93'} />
				</mesh>
			</group>
			{ct.map((p, i) => (
				<Beast key={`ct${i}`} position={p} facing={Math.PI} color={HOLO.us} beast={beast} frame={frame} seed={i} />
			))}
			{tt.map((p, i) => (
				<Beast key={`t${i}`} position={p} facing={0} color={T_COLOR} beast={beast} frame={frame} seed={i + 5} />
			))}
			{/* sound rings out of every mouth */}
			{on
				? heads.flatMap(({p, c}, i) =>
						[0, 1, 2].map((k) => {
							const age = (frame - SWITCH_AT - 4 + k * 7 + i * 2) % 21;
							if (frame - SWITCH_AT - 4 < 0) {
								return null;
							}
							const r = 0.2 + age * 0.12;
							return (
								<mesh key={`${i}-${k}`} position={[p[0], 1.6, p[2] + (p[2] > 0 ? -0.4 - age * 0.12 : 0.4 + age * 0.12)]}>
									<torusGeometry args={[r, 0.015, 6, 36]} />
									<meshBasicMaterial color={c} transparent opacity={Math.max(0, 0.8 - age / 21)} />
								</mesh>
							);
						}),
					)
				: null}
			{ready ? (
				<>
					<Label text={on ? 'ОБЩИЙ ЧАТ · ВКЛ' : 'ОБЩИЙ ЧАТ · ВЫКЛ'} position={[0, 3.0, -1.0]} color={on ? HOLO.gold : '#7fa2bf'} size={0.42} />
					<Label text="СПЕЦНАЗ" position={[0, 0.1, 4.0]} color={HOLO.us} size={0.34} opacity={1} />
					<Label text="ТЕРРОРИСТЫ" position={[0, 3.4, -4.6]} color={T_COLOR} size={0.34} opacity={1} />
					{on
						? heads.map(({p, c}, i) => {
								const start = SWITCH_AT + 8 + Math.floor(random(`s${i}`) * 30);
								const life = (frame - start) % 34;
								if (frame < start || life > 24) {
									return null;
								}
								const s = interpolate(life, [0, 4, 24], [0.1, 0.36, 0.32], clamp);
								const word = SHOUTS[(i + Math.floor((frame - start) / 34)) % SHOUTS.length];
								return <Label key={i} text={word} position={[p[0] + Math.sin(frame + i) * 0.05, 2.35 + life * 0.03, p[2]]} color={c} size={s} />;
							})
						: null}
				</>
			) : null}
		</ThreeCanvas>
	);
};
