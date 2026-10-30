import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import './design/fonts';
import plan from '../data/plan.json';
import {Corner} from './chibi/Corner';
import {C, clamp, easeIn, easeOutExpo} from './design/tokens';
import {Caption, Circle} from './fx/Caption';
import {Layout, LayoutKind} from './fx/Layout';
import {Subtitles} from './fx/Subtitles';
import {World} from './three/World';

const seg = (id: string) => plan.segments.find((s) => s.id === id)!;

// screen shake: decaying jitter after each hit
const SHAKES: [number, number][] = [
	[239, 16], // ХЭДШОТ reaction
	[338, 9], // НА
	[363, 10], // НА
	[372, 14], // СУКА
];
const shakeAt = (f: number) => {
	let x = 0;
	let y = 0;
	for (const [at, amp] of SHAKES) {
		const t = f - at;
		if (t >= 0 && t < 14) {
			const k = amp * Math.exp(-t / 4);
			x += Math.sin(t * 2.7 + at) * k;
			y += Math.cos(t * 3.3 + at) * k;
		}
	}
	return [x, y];
};

const GameSeg: React.FC<{id: string; kind: LayoutKind; zoom: (f: number) => number; focus: [number, number]; freeze?: boolean}> = ({
	id,
	kind,
	zoom,
	focus,
	freeze,
}) => {
	const s = seg(id);
	const frame = useCurrentFrame();
	return (
		<Sequence from={s.from} durationInFrames={s.to - s.from}>
			<Layout kind={kind} src={s.src!} zoom={zoom(frame)} focus={focus} freeze={Boolean(freeze)} />
		</Sequence>
	);
};

// 3D hook dives into the gameplay: zoom-blur + flash over 13 frames
const HookOut: React.FC<{children: React.ReactNode}> = ({children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [62, 75], [0, 1], {...clamp, easing: easeIn});
	return <AbsoluteFill style={{transform: `scale(${1 + t * 1.6})`, filter: `blur(${t * 16}px)`}}>{children}</AbsoluteFill>;
};

const Flash: React.FC<{at: number; len: number}> = ({at, len}) => {
	const f = useCurrentFrame();
	const o = interpolate(f, [at - 2, at, at + len], [0, 0.9, 0], clamp);
	return o > 0 ? <AbsoluteFill style={{background: '#fff', opacity: o}} /> : null;
};

// gameplay entering after the hook: settles from a blurred zoom
const ArriveBlur: React.FC<{from: number; children: React.ReactNode}> = ({from, children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [from, from + 8], [1, 0], {...clamp, easing: easeOutExpo});
	return <AbsoluteFill style={{transform: `scale(${1 + t * 0.35})`, filter: t > 0.01 ? `blur(${t * 14}px)` : undefined}}>{children}</AbsoluteFill>;
};

// stop-frame look: desaturated, vignette
const FreezeTint: React.FC = () => {
	const f = useCurrentFrame();
	const s = seg('freeze');
	if (f < s.from || f >= s.to) {
		return null;
	}
	return <AbsoluteFill style={{backdropFilter: 'grayscale(0.85) contrast(1.15)', background: 'radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)'}} />;
};

// the body lies near the barrels; the camera runs toward it (tracked by hand from the frames)
const bodyAt = (f: number): [number, number] => [
	interpolate(f, [271, 292], [560, 520], clamp),
	interpolate(f, [271, 292], [1150, 1260], clamp),
];

export const Main: React.FC = () => {
	const frame = useCurrentFrame();
	const [sx, sy] = shakeAt(frame);
	const setup = seg('setup');
	const fight = seg('fight');
	return (
		<AbsoluteFill style={{backgroundColor: C.ink}}>
			<AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) scale(${1 + (sx || sy ? 0.03 : 0)})`}}>
				<ArriveBlur from={setup.from}>
					<GameSeg id="setup" kind="split" zoom={(f) => interpolate(f, [setup.from, setup.to], [1, 1.14], clamp)} focus={[540, 1180]} />
					<GameSeg id="freeze" kind="split" zoom={() => 1.14} focus={[540, 1180]} freeze />
				</ArriveBlur>
				<GameSeg id="reaction" kind="webcam-full" zoom={(f) => interpolate(f, [239, 247, 271], [1.25, 1.05, 1.12], clamp)} focus={[540, 960]} />
				<GameSeg id="body" kind="game-full" zoom={(f) => interpolate(f, [271, 292], [1, 1.08], clamp)} focus={[540, 960]} />
				<GameSeg
					id="fight"
					kind="split"
					zoom={(f) => (f >= 372 ? 1.3 : f >= 363 ? 1.2 : f >= 338 ? 1.12 : interpolate(f, [fight.from, 338], [1, 1.05], clamp))}
					focus={[540, 1250]}
				/>
				<GameSeg id="loot" kind="split" zoom={(f) => interpolate(f, [382, 406], [1, 1.06], clamp)} focus={[540, 1250]} />
				<GameSeg id="sausage" kind="webcam-full" zoom={(f) => interpolate(f, [406, 410, 459], [1.2, 1, 1.1], clamp)} focus={[540, 960]} />
				<FreezeTint />
			</AbsoluteFill>

			<Sequence from={0} durationInFrames={75}>
				<HookOut>
					<World mode="hook" />
				</HookOut>
			</Sequence>
			<Sequence from={seg('bullet').from} durationInFrames={72}>
				<World mode="bullet" />
			</Sequence>
			<Sequence from={seg('outro').from} durationInFrames={51}>
				<World mode="outro" />
			</Sequence>

			<Flash at={75} len={6} />
			<Flash at={211} len={5} />
			<Flash at={239} len={4} />

			<Caption text="ОН ЕЩЁ НЕ ЗНАЕТ…" from={36} to={66} style="hook" x={0} y={1180} />
			<Caption text="ну давай, Робин Гуд" from={150} to={167} style="comment" x={90} y={840} />
			<Caption text="ХЭДШОТ!" from={211} to={239} style="impact" x={0} y={1130} />
			<Circle from={273} to={292} at={bodyAt} r={120} />
			<Caption text="вот он" from={275} to={292} style="comment" x={620} y={930} />
			<Corner from={296} to={336} mood="panic" sign="ВТОРОЙ?!" x={40} y={770} />
			<Caption text="лут за два трупа:" from={384} to={406} style="comment" x={90} y={840} />
			<Corner from={412} to={459} mood="trophy" sign="ТРОФЕЙ" x={10} y={880} />

			<Subtitles y={1330} />
		</AbsoluteFill>
	);
};
