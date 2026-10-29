import {AbsoluteFill, Easing, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import './design/fonts';
import edl from './edl.json';
import {C, clamp, easeIn, easeInOut, enter, FONT_TEXT} from './design/tokens';
import {Badge} from './components/Badge';
import {Callout} from './components/Callout';
import {ChapterCard} from './components/ChapterCard';
import {Counter} from './components/Counter';
import {CTA} from './components/CTA';
import {ProgressBar} from './components/ProgressBar';
import {Subtitles} from './components/Subtitles';
import {leather, LeatherShutter} from './components/Transition';
import {Verdict} from './components/Verdict';
import {DeskScene} from './three/DeskScene';
import {GiftStreamScene} from './three/GiftStreamScene';
import {Title3D} from './three/Title3D';

const SOURCE = staticFile('source.mp4');
const FACE_ORIGIN = '50% 30%';

type Clip = {from: number; to: number; src: number; scale: number[]; pushFrom?: number};

// A piece of the real footage; scale alternates 100% / 112% between neighbours to hide jump cuts
const RealClip: React.FC<{clip: Clip}> = ({clip}) => {
	const frame = useCurrentFrame();
	const len = clip.to - clip.from;
	const push = clip.pushFrom ? interpolate(frame, [clip.pushFrom - clip.from, len], [0, 0.04], {...clamp, easing: easeInOut}) : 0;
	const s = interpolate(frame, [0, len], [clip.scale[0], clip.scale[1]], clamp) + push;
	return (
		<AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: clip.src >= 19.9 ? '50% 50%' : FACE_ORIGIN}}>
			<OffthreadVideo src={SOURCE} startFrom={Math.round(clip.src * edl.fps)} muted style={{width: 1080, height: 1920}} />
		</AbsoluteFill>
	);
};

const realClips = edl.video.filter((v) => v.kind === 'real') as Clip[];

// tracked positions of the real pillows (from work/shots.json), mapped through the 104% B-roll scale
const track = (keys: number[][], frame: number): [number, number] => {
	const src = 19.92 + (frame - 435) / edl.fps;
	const nx = interpolate(src, keys.map((k) => k[0]), keys.map((k) => k[1]), clamp);
	const ny = interpolate(src, keys.map((k) => k[0]), keys.map((k) => k[2]), clamp);
	return [540 + (nx * 1080 - 540) * 1.04, 960 + (ny * 1920 - 960) * 1.04];
};
const NECK = [
	[20.0, 0.54, 0.48],
	[20.4, 0.54, 0.48],
	[20.8, 0.5, 0.47],
	[21.0, 0.47, 0.47],
	[21.2, 0.46, 0.39],
	[21.4, 0.43, 0.26],
	[21.6, 0.44, 0.21],
	[21.8, 0.4, 0.16],
	[22.1, 0.4, 0.14],
];
const LUMBAR = [
	[21.8, 0.5, 0.69],
	[22.2, 0.5, 0.68],
	[22.6, 0.5, 0.67],
	[23.0, 0.5, 0.67],
	[23.2, 0.5, 0.64],
];

// The chair's headrest wing behind her (talking-head shot), through the slow push-in
const chairWing = (frame: number): [number, number] => {
	const s = 1 + interpolate(frame, [383, 439], [0, 0.04], {...clamp, easing: easeInOut});
	return [540 + (216 - 540) * s, 576 + (518 - 576) * s];
};

const HookLine: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = enter(frame, fps, 14);
	const out = interpolate(frame, [36, 43], [0, 1], {...clamp, easing: easeIn});
	return (
		<div
			style={{
				position: 'absolute',
				top: 1172,
				width: 1080,
				textAlign: 'center',
				fontFamily: FONT_TEXT,
				fontWeight: 800,
				fontSize: 44,
				letterSpacing: '0.02em',
				color: C.bone,
				opacity: interpolate(a, [0, 0.4], [0, 1], clamp) * (1 - out),
				transform: `translateY(${(1 - a) * 24}px)`,
				textShadow: `0 0 18px ${C.ink}`,
			}}
		>
			в подарок <span style={{color: C.ember}}>мужу-стримеру</span>
		</div>
	);
};

const Fade: React.FC<{children: React.ReactNode; fadeIn: [number, number] | null; fadeOut: [number, number] | null}> = ({
	children,
	fadeIn,
	fadeOut,
}) => {
	const frame = useCurrentFrame();
	const a = fadeIn ? interpolate(frame, fadeIn, [0, 1], clamp) : 1;
	const b = fadeOut ? interpolate(frame, fadeOut, [1, 0], {...clamp, easing: Easing.in(Easing.quad)}) : 1;
	return <AbsoluteFill style={{opacity: Math.min(a, b)}}>{children}</AbsoluteFill>;
};

export const Video: React.FC = () => {
	const [ctaFrom, ctaTo] = edl.cta;
	const [verdictFrom, verdictTo] = edl.verdict;
	return (
		<AbsoluteFill style={{backgroundColor: C.ink}}>
			{realClips.map((clip) => (
				<Sequence key={clip.from} from={clip.from} durationInFrames={clip.to - clip.from}>
					<RealClip clip={clip} />
				</Sequence>
			))}
			{/* loop: the CTA slab uncovers the exact first frame */}
			<Sequence from={ctaFrom}>
				<Freeze frame={0}>
					<RealClip clip={realClips[0]} />
				</Freeze>
			</Sequence>

			<Sequence from={104} durationInFrames={134}>
				<Fade fadeIn={null} fadeOut={[122, 134]}>
					<GiftStreamScene />
				</Fade>
			</Sequence>
			<Sequence from={524} durationInFrames={ctaFrom - 524 + 12}>
				<Fade fadeIn={[0, 8]} fadeOut={null}>
					<DeskScene />
				</Fade>
			</Sequence>

			{/* designed plinth: hides the burned-in captions of the source and carries ours */}
			<AbsoluteFill
				style={{
					...leather,
					backgroundPosition: '0 0, 0 1500px',
					WebkitMaskImage: 'linear-gradient(180deg, transparent 0px, transparent 1170px, rgba(0,0,0,0.9) 1440px, #000 1500px)',
				}}
			/>

			<Sequence from={0} durationInFrames={46}>
				<Title3D />
				<HookLine />
			</Sequence>
			<Badge from={40} to={104} />
			<ChapterCard n="01" title="Повод" from={50} to={104} />
			<ChapterCard n="02" title="Подарок" from={312} to={362} />
			<ChapterCard n="03" title="Две подушки" from={439} to={494} />
			<Counter from={326} to={392} tick={[329, 335]} highlightAt={383} />
			<Callout from={381} to={433} point={chairWing} card={[252, 700]} label="Игровое кресло" sub="одно из двух подарков" />
			<Callout from={452} to={500} point={(f) => track(NECK, f)} card={[606, 1060]} label="Под шею" sub="подушка 1 из 2" />
			<Callout from={503} to={531} point={(f) => track(LUMBAR, f)} card={[500, 930]} label="Под поясницу" sub="подушка 2 из 2" />
			<Verdict from={verdictFrom} to={verdictTo} />

			<Subtitles />
			<ProgressBar />

			<LeatherShutter from={101} duration={18} />
			<CTA from={ctaFrom} to={ctaTo} />
		</AbsoluteFill>
	);
};
