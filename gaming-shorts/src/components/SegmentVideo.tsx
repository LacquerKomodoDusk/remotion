import React from 'react';
import {
	AbsoluteFill,
	Freeze,
	interpolate,
	OffthreadVideo,
	random,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import type {Config} from '../lib/config';
import type {OutRange, Segment} from '../lib/timeline';
import type {AccentType} from '../lib/types';

export type OutAccent = OutRange & {type: AccentType; index: number};

type Focus = {x: number; y: number};

// Позиция видео так, чтобы область исходника [regionTop, regionTop + regionHeight]
// заполнила коробку box, с зумом вокруг точки focus и без выхода за область.
const placeVideo = ({
	srcW,
	srcH,
	regionTop,
	regionHeight,
	boxW,
	boxH,
	zoom,
	focus,
}: {
	srcW: number;
	srcH: number;
	regionTop: number;
	regionHeight: number;
	boxW: number;
	boxH: number;
	zoom: number;
	focus: Focus;
}): React.CSSProperties => {
	const s = Math.max(boxW / srcW, boxH / regionHeight) * zoom;
	const fx = focus.x * srcW * s;
	const fy = (regionTop + focus.y * regionHeight) * s;
	const left = Math.min(0, Math.max(boxW - srcW * s, boxW / 2 - fx));
	const top = Math.min(
		-regionTop * s,
		Math.max(boxH - (regionTop + regionHeight) * s, boxH / 2 - fy),
	);
	return {
		position: 'absolute',
		left,
		top,
		width: srcW * s,
		height: srcH * s,
		maxWidth: 'none',
	};
};

const layoutAt = (frame: number, accents: OutAccent[], config: Config, fps: number) => {
	const {states, transitionFrames, zoomPunch, shake} = config.layout;
	let best: {accent: OutAccent; weight: number} | null = null;
	for (const a of accents) {
		const springIn = spring({
			frame: frame - a.from,
			fps,
			config: {damping: 200},
			durationInFrames: transitionFrames,
		});
		const springOut = spring({
			frame: frame - a.to,
			fps,
			config: {damping: 200},
			durationInFrames: transitionFrames,
		});
		const weight = Math.max(0, Math.min(1, springIn - springOut));
		if (weight > 0.001 && (!best || weight > best.weight)) {
			best = {accent: a, weight};
		}
	}

	const def = states.default;
	if (!best) {
		return {webcam: def.webcam, webcamZoom: def.webcamZoom, gameplayZoom: 1, shakeX: 0, shakeY: 0};
	}

	const {accent, weight} = best;
	const target = states[accent.type];
	let gameplayZoom = 1;
	let shakeX = 0;
	let shakeY = 0;
	if (accent.type === 'gameplay') {
		const local = frame - accent.from;
		const punch = interpolate(local, zoomPunch.frames, [1, zoomPunch.peak, zoomPunch.settle], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		});
		gameplayZoom = 1 + (punch - 1) * weight;
		if (local >= 0 && local < shake.frames) {
			const decay = 1 - local / shake.frames;
			shakeX = (random(`sx-${accent.index}-${local}`) * 2 - 1) * shake.amplitudePx * decay;
			shakeY = (random(`sy-${accent.index}-${local}`) * 2 - 1) * shake.amplitudePx * decay;
		}
	}

	return {
		webcam: def.webcam + (target.webcam - def.webcam) * weight,
		webcamZoom: def.webcamZoom + (target.webcamZoom - def.webcamZoom) * weight,
		gameplayZoom,
		shakeX,
		shakeY,
	};
};

export const SegmentVideo: React.FC<{
	segment: Segment;
	src: string;
	source: {width: number; height: number};
	accents: OutAccent[];
	mutes: OutRange[];
	config: Config;
}> = ({segment, src, source, accents, mutes, config}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const global = segment.from + frame;
	const layout = layoutAt(global, accents, config, fps);

	const camRegionHeight = source.height * config.layout.sourceWebcamFraction;
	const camBoxH = Math.round(height * layout.webcam);
	const gameBoxH = height - camBoxH;

	const muted = mutes.some((m) => global >= m.from && global < m.to);
	const volume = segment.audio && !muted ? config.audio.sourceVolume : 0;
	const trimBefore = Math.round(segment.srcStart * fps);

	const video = (style: React.CSSProperties, withAudio: boolean) => (
		<OffthreadVideo
			src={src}
			trimBefore={trimBefore}
			playbackRate={segment.speed}
			muted={!withAudio}
			volume={withAudio ? volume : 0}
			style={style}
		/>
	);

	const content = (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width,
					height: camBoxH,
					overflow: 'hidden',
				}}
			>
				{video(
					placeVideo({
						srcW: source.width,
						srcH: source.height,
						regionTop: 0,
						regionHeight: camRegionHeight,
						boxW: width,
						boxH: camBoxH,
						zoom: layout.webcamZoom,
						focus: config.layout.webcamFocus,
					}),
					true,
				)}
			</div>
			<div
				style={{
					position: 'absolute',
					top: camBoxH,
					left: 0,
					width,
					height: gameBoxH,
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						transform: `translate(${layout.shakeX}px, ${layout.shakeY}px)`,
					}}
				>
					{video(
						placeVideo({
							srcW: source.width,
							srcH: source.height,
							regionTop: camRegionHeight,
							regionHeight: source.height - camRegionHeight,
							boxW: width,
							boxH: gameBoxH,
							zoom: layout.gameplayZoom * segment.zoom,
							focus: config.layout.gameplayFocus,
						}),
						false,
					)}
				</div>
			</div>
		</AbsoluteFill>
	);

	if (segment.kind === 'freeze') {
		return <Freeze frame={0}>{content}</Freeze>;
	}

	return content;
};
