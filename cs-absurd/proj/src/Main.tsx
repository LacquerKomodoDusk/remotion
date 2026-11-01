import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import './design/fonts';
import {C, clamp} from './design/tokens';
import {Caption, CaptionData, Hp} from './fx/Caption';
import {Layout, LayoutKind} from './fx/Layout';
import {Subtitles, Word} from './fx/Subtitles';
import {Counters, CounterData, Summary} from './fx/Counters';
import {DocPlates} from './fx/Doc';
import {AllTalkDust} from './three/AllTalkDust';
import {BesideDust} from './three/BesideDust';
import {QueueDust} from './three/QueueDust';
import {Freeze, OffthreadVideo, staticFile} from 'remotion';

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
	scene?: 'alltalk' | 'beside' | 'queue';
	rate?: number;
	mute?: boolean;
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
	counters?: CounterData;
	summary?: {from: number; rows: string[][]};
	magnifiers?: {from: number; to: number; src: number; point: number[]; at: number[]; r: number; scale: number}[];
};

// source time shown at an output frame (frozen on stop-frames, held through 3D inserts)
const srcAt = (plan: Plan, f: number) => {
	let last = 0;
	for (const s of plan.segments) {
		if (f < s.from) {
			break;
		}
		if (s.freeze || s.kind === '3d') {
			last = s.src;
		} else {
			last = s.src + (Math.min(f, s.to) - s.from) / 30;
		}
	}
	return last;
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
		return seg.scene === 'alltalk' ? <AllTalkDust /> : seg.scene === 'queue' ? <QueueDust /> : <BesideDust />;
	}
	return (
		<>
			<Layout video={video} kind={seg.kind} src={seg.src} zoom={zoomAt(seg.zoom, t)} focus={(seg.focus ?? [540, 1250]) as [number, number]} freeze={Boolean(seg.freeze)} rate={seg.rate ?? 1} />
			<Tint tint={seg.tint} len={seg.len} />
		</>
	);
};

// round magnifying glass over a frozen detail of the frame (e.g. the ammo counter)
const Magnifier: React.FC<{m: NonNullable<Plan['magnifiers']>[number]; video: string}> = ({m, video}) => {
	const f = useCurrentFrame();
	if (f < m.from || f >= m.to) {
		return null;
	}
	const a = interpolate(f, [m.from, m.from + 6], [0, 1], clamp);
	const s = m.scale;
	return (
		<div style={{position: 'absolute', left: m.at[0] - m.r, top: m.at[1] - m.r, width: m.r * 2, height: m.r * 2, borderRadius: '50%', overflow: 'hidden', border: `10px solid #fff`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', transform: `scale(${a})`}}>
			<div style={{position: 'absolute', left: m.r - m.point[0] * s, top: m.r - m.point[1] * s, width: 1080, height: 1920, transform: `scale(${s})`, transformOrigin: '0 0'}}>
				<Freeze frame={0}>
					<OffthreadVideo src={staticFile(video)} startFrom={Math.round(m.src * 30)} muted style={{width: 1080, height: 1920}} />
				</Freeze>
			</div>
		</div>
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
			{(plan.magnifiers ?? []).map((m) => (
				<Sequence key={m.from} from={0}>
					<Magnifier m={m} video={video} />
				</Sequence>
			))}
			{plan.flashes.map(([at, len]) => (
				<Flash key={at} at={at} len={len} />
			))}
			{plan.hp.map((h) => (
				<Hp key={h.from} {...h} />
			))}
			{plan.captions
				.filter((c) => c.style !== 'doc')
				.map((c) => (
					<Caption key={`${c.text}${c.from}`} {...c} />
				))}
			<DocPlates plates={plan.captions.filter((c) => c.style === 'doc')} low={plan.segments.some((s) => s.kind === '3d' && frame >= s.from && frame < s.to)} />
			{plan.counters ? <Counters data={plan.counters} srcAt={(f) => srcAt(plan, f)} hidden={plan.segments.some((s) => s.kind === '3d' && frame >= s.from && frame < s.to)} /> : null}
			{plan.summary ? <Summary {...plan.summary} /> : null}
			<Subtitles words={plan.words} groups={plan.groups} y={1310} />
		</AbsoluteFill>
	);
};
