import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Freeze, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import './design/fonts';
import {C, clamp, easeIn, FONT_SUB, pop} from './design/tokens';
import {HOLO, HoloBox, HoloCam, HoloStage, V3} from './three/Holo';

// Title cards of the compilation "Тактическое бездействие" — same hologram room as the 3D breakdowns
const Room: React.FC<{frame: number}> = ({frame}) => {
	const {width, height} = useVideoConfig();
	const a = frame * 0.006;
	const pos: V3 = [Math.sin(a) * 9, 6, Math.cos(a) * 9];
	return (
		<ThreeCanvas width={width} height={height} gl={{antialias: true}} style={{position: 'absolute'}}>
			<HoloCam pos={pos} look={[0, 1, 0]} fov={55} />
			<HoloStage size={10} />
			<HoloBox size={[1.2, 1.0, 1.2]} position={[-2, 0.5, 1]} color={HOLO.line} />
			<HoloBox size={[0.7, 3, 0.7]} position={[2, 1.5, -1]} color={HOLO.line} />
			<HoloBox size={[2.4, 0.5, 1.2]} position={[0, 0.25, -3]} color={HOLO.us} />
		</ThreeCanvas>
	);
};

const Line: React.FC<{text: string; at: number; size: number; color: string; mono?: boolean}> = ({text, at, size, color, mono}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = pop(frame, fps, at);
	return (
		<div
			style={{
				fontFamily: mono ? FONT_SUB : FONT_SUB,
				fontWeight: 900,
				fontSize: size,
				lineHeight: 1.05,
				color,
				letterSpacing: mono ? '0.18em' : '-0.01em',
				opacity: interpolate(a, [0, 0.4], [0, 1], clamp),
				transform: `translateY(${(1 - a) * 30}px)`,
				textShadow: '0 6px 30px rgba(0,0,0,0.7)',
			}}
		>
			{text}
		</div>
	);
};

export const Card: React.FC<{kind: 'intro' | 'mid'; len: number}> = ({kind, len}) => {
	const frame = useCurrentFrame();
	const out = interpolate(frame, [len - 8, len], [1, 0], {...clamp, easing: easeIn});
	return (
		<AbsoluteFill style={{background: '#111'}}>
			{/* blurred still of the clip that follows: the card grows out of the game itself */}
			<AbsoluteFill style={{filter: 'blur(26px) brightness(0.45) saturate(1.2)', transform: `scale(${1.15 + frame * 0.002})`}}>
				<Freeze frame={0}>
					<OffthreadVideo src={staticFile(kind === 'intro' ? 'd.mp4' : 'c.mp4')} muted style={{width: 1080, height: 1920}} />
				</Freeze>
			</AbsoluteFill>
			<AbsoluteFill style={{padding: '0 80px', justifyContent: 'center', opacity: out}}>
				{kind === 'intro' ? (
					<>
						<Line text="CS2" at={2} size={40} color={HOLO.line} mono />
						<div style={{height: 20}} />
						<Line text="КОМАНДА" at={6} size={150} color="#fff" />
						<Line text="МЕЧТЫ" at={11} size={150} color={C.yellow} />
					</>
				) : (
					<>
						<Line text="ДВА РАУНДА" at={2} size={110} color="#fff" />
						<Line text="СПУСТЯ" at={6} size={110} color={C.yellow} />
					</>
				)}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
