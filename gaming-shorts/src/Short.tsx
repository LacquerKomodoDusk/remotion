import {Audio} from '@remotion/media';
import React, {useMemo} from 'react';
import {
	AbsoluteFill,
	type CalculateMetadataFunction,
	Sequence,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {Captions, makePages, type OutWord} from './components/Captions';
import {type OutAccent, SegmentVideo} from './components/SegmentVideo';
import {config} from './lib/config';
import {buildTimeline, getAccents, type OutRange, rangeToOut, type Timeline} from './lib/timeline';
import type {Analysis, AssetManifest, ClipData} from './lib/types';

export type ShortProps = {
	clip: string;
	data: ClipData | null;
	analysis: Analysis | null;
	assets: AssetManifest | null;
};

const fetchJson = async <T,>(file: string, signal: AbortSignal): Promise<T | null> => {
	const res = await fetch(staticFile(file), {signal});
	if (!res.ok) {
		return null;
	}

	return (await res.json()) as T;
};

export const calculateShortMetadata: CalculateMetadataFunction<ShortProps> = async ({
	props,
	abortSignal,
}) => {
	const data = await fetchJson<ClipData>(`${props.clip}/data.json`, abortSignal);
	if (!data) {
		throw new Error(`Нет public/${props.clip}/data.json — сначала запусти npm run prep -- ${props.clip}`);
	}

	const analysis = await fetchJson<Analysis>(`${props.clip}/analysis.json`, abortSignal);
	const assets = await fetchJson<AssetManifest>('_assets/manifest.json', abortSignal);
	const timeline = buildTimeline(data, analysis, config);
	for (const w of timeline.warnings) {
		console.warn(w);
	}

	return {
		durationInFrames: timeline.totalFrames,
		fps: config.composition.fps,
		width: config.composition.width,
		height: config.composition.height,
		props: {...props, data, analysis, assets},
	};
};

// Выбор файла из категории детерминированно по индексу события
const pick = (files: string[] | undefined, i: number): string | null => {
	if (!files || files.length === 0) {
		return null;
	}

	return staticFile(`_assets/${files[i % files.length]}`);
};

type SfxEvent = {from: number; durationInFrames: number | null; src: string; volume: number};

const Music: React.FC<{
	src: string;
	voice: OutRange[];
	silences: OutRange[];
}> = ({src, voice, silences}) => {
	const frame = useCurrentFrame();
	const silent = silences.some((s) => frame >= s.from && frame < s.to);
	const ducked = voice.some((v) => frame >= v.from && frame < v.to);
	const volume = silent ? 0 : config.audio.musicVolume * (ducked ? config.audio.musicDuckFactor : 1);
	return <Audio src={src} loop volume={volume} />;
};

export const Short: React.FC<ShortProps> = ({clip, data, analysis, assets}) => {
	const {fps} = useVideoConfig();

	const built = useMemo(() => {
		if (!data) {
			return null;
		}

		const timeline: Timeline = buildTimeline(data, analysis, config);
		const profane = new Set(data.profanity);
		const keywords = new Set((analysis?.keywords ?? []).map((k) => k.wordIndex));

		const accents: OutAccent[] = [];
		getAccents(data, analysis, config).forEach((a, index) => {
			for (const r of rangeToOut(timeline, a.start, a.end, fps)) {
				accents.push({...r, type: a.type, index});
			}
		});

		const words: OutWord[] = [];
		data.words.forEach((w, wordIndex) => {
			const text = config.captions.stripPunctuation
				? w.text.replace(/[^\p{L}\p{N}!?'\-]/gu, '')
				: w.text.trim();
			if (text.length === 0) {
				return;
			}

			for (const r of rangeToOut(timeline, w.start, w.end, fps)) {
				const inEmotion = accents.some((a) => a.type === 'emotion' && r.from >= a.from && r.from < a.to);
				words.push({
					text: text.toUpperCase(),
					from: Math.round(r.from),
					to: Math.max(Math.round(r.to), Math.round(r.from) + 1),
					wordIndex,
					profane: profane.has(wordIndex),
					keyword: keywords.has(wordIndex),
					emotion:
						inEmotion ||
						/!$/.test(w.text.trim()) ||
						config.captions.emotionWords.includes(text.toUpperCase().replace(/[!?]/g, '')),
				});
			}
		});

		const p = config.profanity;
		const mutes: OutRange[] = words
			.filter((w) => w.profane)
			.map((w) => ({from: w.from - p.muteBeforeFrames, to: w.to + p.muteAfterFrames}));

		const sfx: SfxEvent[] = [];
		const vol = config.audio.sfxVolume;
		words
			.filter((w) => w.profane)
			.forEach((w, i) => {
				const src = pick(assets?.sfx.quack, i);
				if (src) {
					sfx.push({
						from: Math.max(0, w.from - p.muteBeforeFrames),
						durationInFrames: Math.max(6, w.to - w.from + p.muteBeforeFrames + p.muteAfterFrames),
						src,
						volume: p.quackVolume,
					});
				}
			});

		accents
			.filter((a) => a.type === 'gameplay')
			.forEach((a, i) => {
				const src = pick(assets?.sfx.boom, i);
				if (src) {
					sfx.push({from: Math.round(a.from), durationInFrames: null, src, volume: vol});
				}
			});

		let whooshIndex = 0;
		timeline.segments.forEach((s, i) => {
			const prev = timeline.segments[i - 1];
			if (s.kind === 'freeze') {
				const src = pick(assets?.sfx.error, i);
				if (src) {
					sfx.push({from: s.from, durationInFrames: null, src, volume: vol});
				}

				return;
			}

			const jump =
				prev &&
				(prev.kind !== s.kind ||
					s.kind === 'replay' ||
					Math.abs(s.srcStart - prev.srcEnd) > config.audio.whooshOnJumpSec);
			if (jump) {
				const src = pick(assets?.sfx.whoosh, whooshIndex++);
				if (src) {
					sfx.push({from: Math.max(0, s.from - 3), durationInFrames: null, src, volume: vol});
				}
			}
		});

		if (config.audio.wordClickVolume > 0) {
			words.forEach((w, i) => {
				const src = pick(assets?.sfx.click, i);
				if (src) {
					sfx.push({from: w.from, durationInFrames: null, src, volume: config.audio.wordClickVolume});
				}
			});
		}

		// тишина в музыке перед кульминацией (по analysis.json)
		const silences: OutRange[] = (analysis?.segments ?? [])
			.filter((s) => s.role === 'climax' || s.role === 'punchline')
			.flatMap((s) => rangeToOut(timeline, s.start, s.end, fps).slice(0, 1))
			.map((r) => ({from: r.from - config.audio.preClimaxSilenceSec * fps, to: r.from}));

		return {
			timeline,
			accents,
			pages: makePages(words, config, fps),
			mutes,
			sfx,
			voice: words.map((w) => ({from: w.from, to: w.to})),
			silences,
		};
	}, [data, analysis, assets, fps]);

	if (!data || !built) {
		return <AbsoluteFill style={{backgroundColor: 'black'}} />;
	}

	const src = staticFile(`${clip}/source.mp4`);
	const music = pick(assets?.music, 0);

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{built.timeline.segments.map((s, i) => (
				<Sequence
					key={`${s.kind}-${i}`}
					from={s.from}
					durationInFrames={s.durationInFrames}
					name={`${s.kind} ${s.srcStart.toFixed(2)}–${s.srcEnd.toFixed(2)}${s.speed === 1 ? '' : ` ×${s.speed}`}`}
				>
					<SegmentVideo
						segment={s}
						src={src}
						source={data.source}
						accents={built.accents}
						mutes={built.mutes}
						config={config}
					/>
				</Sequence>
			))}
			<Captions pages={built.pages} config={config} />
			{music ? <Music src={music} voice={built.voice} silences={built.silences} /> : null}
			{built.sfx.map((e, i) => (
				<Sequence
					key={`sfx-${i}`}
					from={e.from}
					durationInFrames={e.durationInFrames ?? undefined}
					name="sfx"
				>
					<Audio src={e.src} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
