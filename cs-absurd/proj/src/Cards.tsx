import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
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
				textShadow: '0 0 30px rgba(73,182,255,0.35)',
			}}
		>
			{text}
		</div>
	);
};

export const Card: React.FC<{kind: 'intro' | 'mid' | 'outro'; len: number}> = ({kind, len}) => {
	const frame = useCurrentFrame();
	const out = interpolate(frame, [len - 8, len], [1, 0], {...clamp, easing: easeIn});
	return (
		<AbsoluteFill style={{background: HOLO.bg}}>
			<Room frame={frame} />
			<AbsoluteFill style={{padding: '0 80px', justifyContent: 'center', opacity: out}}>
				{kind === 'intro' ? (
					<>
						<Line text="CS2 · ДВА ДЕЛА" at={2} size={36} color={HOLO.line} mono />
						<div style={{height: 24}} />
						<Line text="ТАКТИЧЕСКОЕ" at={6} size={128} color="#fff" />
						<Line text="БЕЗДЕЙСТВИЕ" at={11} size={128} color={C.yellow} />
						<div style={{height: 40}} />
						<Line text="ДЕЛО №1 · НАБЛЮДАТЕЛЬ" at={24} size={52} color={HOLO.us} />
						<Line text="враг ходит рядом. он — смотрит." at={30} size={40} color="#9fb3c8" />
					</>
				) : kind === 'mid' ? (
					<>
						<Line text="ДЕЛО №1 ЗАКРЫТО" at={2} size={44} color="#9fb3c8" mono />
						<div style={{height: 30}} />
						<Line text="ДЕЛО №2" at={10} size={72} color="#fff" />
						<Line text="ЗВЕРИ" at={14} size={170} color="#FF9A3C" />
						<Line text="счёт 1:11. все орут. он — парит." at={22} size={40} color="#9fb3c8" />
					</>
				) : (
					<>
						<Line text="ПРОТОКОЛ" at={2} size={36} color={HOLO.line} mono />
						<div style={{height: 24}} />
						<Line text="8,7 с врага в кадре —" at={8} size={60} color="#fff" />
						<Line text="0 выстрелов." at={12} size={60} color={C.yellow} />
						<div style={{height: 20}} />
						<Line text="1:11 на табло —" at={20} size={60} color="#fff" />
						<Line text="танец и облако." at={24} size={60} color="#FF9A3C" />
						<div style={{height: 40}} />
						<Line text="ТАКТИЧЕСКОЕ БЕЗДЕЙСТВИЕ" at={34} size={58} color={C.yellow} />
					</>
				)}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
