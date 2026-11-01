import {ThreeCanvas} from '@remotion/three';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut} from '../design/tokens';
import {useFontsReady} from '../design/fonts';
import {Figure, HOLO, HoloBox, HoloCam, HoloStage, Label, lerp3, V3} from './Holo';

// The score as architecture: a knee-high "1" with his team dancing under confetti,
// next to an "11" tower where the winners stand still.
export const PodiumHolo: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const ready = useFontsReady();
	const grow = interpolate(frame, [0, 26], [0.02, 1], {...clamp, easing: easeInOut});
	const towerH = 6.6 * grow;
	const t = interpolate(frame, [0, 96], [0, 1], {...clamp, easing: easeInOut});
	// start low looking up at the tower, end level with the tiny podium
	const pos = lerp3([3.5, 1.5, 13.5], [-0.8, 4.2, 12.5], t);
	const look = lerp3([0.6, 3.6, 0], [0.2, 2.8, 0], t);
	const ours: V3[] = [[-2.7, 0.6, 0.3], [-2.15, 0.6, -0.2], [-1.6, 0.6, 0.3], [-1.05, 0.6, -0.2], [-0.5, 0.6, 0.3]];
	const theirs: V3[] = [[1.4, 0, 0.35], [2.0, 0, 0.35], [2.6, 0, 0.35], [1.7, 0, -0.35], [2.3, 0, -0.35]];
	return (
		<ThreeCanvas width={width} height={height} gl={{antialias: true}} style={{position: 'absolute'}}>
			<HoloCam pos={pos} look={look} fov={50} />
			<HoloStage size={10} />
			<HoloBox size={[3.0, 0.6, 1.4]} position={[-1.6, 0.3, 0]} color={HOLO.us} opacity={0.22} />
			<HoloBox size={[2.0, towerH, 1.4]} position={[2.0, towerH / 2, 0]} color={HOLO.enemy} opacity={0.18} />
			{ours.map((p, i) => {
				const beat = Math.sin(frame / 3.2 + i * 1.3);
				return <Figure key={i} position={[p[0], p[1] + Math.max(0, beat) * 0.22, p[2]]} color={HOLO.us} scale={0.62} armsUp={0.5 + beat * 0.5} tilt={beat * 0.15} />;
			})}
			{theirs.map((p, i) => (
				<Figure key={i} position={[p[0], towerH + p[1], p[2]]} color={HOLO.enemy} scale={0.5} armsUp={0} />
			))}
			{new Array(40).fill(0).map((_, i) => {
				const x = -3 + random(`cx${i}`) * 2.9;
				const y = 3.6 - ((frame * (0.03 + random(`cs${i}`) * 0.03) + random(`cy${i}`) * 3.6) % 3.6);
				return (
					<mesh key={i} position={[x, y, -0.6 + random(`cz${i}`) * 1.2]} rotation={[frame * 0.2 + i, i, 0]}>
						<planeGeometry args={[0.08, 0.05]} />
						<meshBasicMaterial color={i % 3 === 0 ? HOLO.gold : i % 3 === 1 ? HOLO.us : '#ffffff'} side={2} />
					</mesh>
				);
			})}
			{ready ? (
				<>
					<Label text="1" position={[-1.6, 2.1, 0.8]} color={HOLO.us} size={0.7} />
					<Label text="11" position={[2.0, towerH + 1.4, 0.8]} color={HOLO.enemy} size={0.9} opacity={grow} />
					{frame >= 30 ? <Label text="ТАНЕЦ ПОБЕДИТЕЛЕЙ" position={[-1.0, 3.1, 0.8]} color={HOLO.gold} size={0.36} /> : null}
				</>
			) : null}
		</ThreeCanvas>
	);
};
