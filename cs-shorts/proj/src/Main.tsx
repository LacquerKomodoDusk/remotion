import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import './design/fonts';
import {C, clamp} from './design/tokens';
import {Caption, CaptionData, Hp} from './fx/Caption';
import {Layout, LayoutKind} from './fx/Layout';
import {Subtitles, Word} from './fx/Subtitles';
import {SmokeScene} from './three/SmokeScene';
import {UhBurst} from './three/UhBurst';

export type Segment = {
	id: string;
	kind: LayoutKind | '3d';
	src: number;
	len: number;
	from: number;
	to: number;
	zoom?: number[][];
	focus?: number[];
	freeze?: boolean;
	tint?: 'bw' | 'replay' | 'redfade';
	overlay3d?: 'uh';
	scene?: 'smoke';
};
export type Plan = {
	duration: number;
	segments: Segment[];
	words: Word[];
	groups: number[][];
	captions: CaptionData[];
	hp: {from: number; to: number; value: number}[];
	shakes: number[][];
	flashes: number[][];
};

const zoomAt = (keys: number[][] | undefined, t: number) =>
	keys ? interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[1]), clamp) : 1;

// decaying jitter after each hit
const shakeAt = (shakes: number[][], f: number) => {
	let x = 0;
	let y = 0;
	for (const [at, amp] of shakes) {
		const t = f - at;
		if (t >= 0 && t < 14) {
			const k = amp * Math.exp(-t / 4);
			x += Math.sin(t * 2.7 + at) * k;
			y += Math.cos(t * 3.3 + at) * k;
		}
	}
	return [x, y];
};

const Tint: React.FC<{tint: Segment['tint']; len: number}> = ({tint, len}) => {
	const t = useCurrentFrame();
	if (tint === 'bw') {
		return <AbsoluteFill style={{backdropFilter: 'grayscale(0.9) contrast(1.15)', background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)'}} />;
	}
	if (tint === 'replay') {
		// VHS-ish replay: scanlines + slight colour shift
		return (
			<AbsoluteFill
				style={{
					backdropFilter: 'saturate(1.6) contrast(1.2) hue-rotate(-8deg)',
					backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 2px, transparent 2px, transparent 6px)',
				}}
			/>
		);
	}
	if (tint === 'redfade') {
		return <AbsoluteFill style={{background: C.red, mixBlendMode: 'multiply', opacity: interpolate(t, [0, len * 0.7], [0.6, 0], clamp)}} />;
	}
	return null;
};

const Shot: React.FC<{seg: Segment; video: string; plan: Plan}> = ({seg, video, plan}) => {
	const t = useCurrentFrame();
	if (seg.kind === '3d') {
		const local = (w: Word) => w.from - seg.from;
		const inSeg = plan.words.filter((w) => w.from >= seg.from && w.from < seg.to);
		return <SmokeScene shout={local(inSeg[0])} insult={local(inSeg[inSeg.length - 1])} />;
	}
	const spawns = plan.words.filter((w) => w.text.startsWith('УХ') && w.from >= seg.from && w.from < seg.to).map((w) => w.from - seg.from);
	return (
		<>
			<Layout video={video} kind={seg.kind} src={seg.src} zoom={zoomAt(seg.zoom, t)} focus={(seg.focus ?? [540, 1250]) as [number, number]} freeze={Boolean(seg.freeze)} />
			<Tint tint={seg.tint} len={seg.len} />
			{seg.overlay3d === 'uh' ? <UhBurst spawns={spawns} mouth={[540, 990]} /> : null}
		</>
	);
};

const Flash: React.FC<{at: number; len: number}> = ({at, len}) => {
	const f = useCurrentFrame();
	const o = interpolate(f, [at - 2, at, at + len], [0, 0.85, 0], clamp);
	return o > 0 ? <AbsoluteFill style={{background: '#fff', opacity: o}} /> : null;
};

export const Main: React.FC<{plan: Plan; video: string}> = ({plan, video}) => {
	const frame = useCurrentFrame();
	const [sx, sy] = shakeAt(plan.shakes, frame);
	return (
		<AbsoluteFill style={{backgroundColor: C.ink}}>
			<AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) scale(${sx || sy ? 1.03 : 1})`}}>
				{plan.segments.map((seg) => (
					<Sequence key={seg.id} from={seg.from} durationInFrames={seg.len}>
						<Shot seg={seg} video={video} plan={plan} />
					</Sequence>
				))}
			</AbsoluteFill>
			{plan.flashes.map(([at, len]) => (
				<Flash key={at} at={at} len={len} />
			))}
			{plan.hp.map((h) => (
				<Hp key={h.from} {...h} />
			))}
			{plan.captions.map((c) => (
				<Caption key={`${c.text}${c.from}`} {...c} />
			))}
			<Subtitles words={plan.words} groups={plan.groups} y={1310} />
		</AbsoluteFill>
	);
};
