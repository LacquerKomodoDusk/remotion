import type {Config} from './config';
import type {Accent, Analysis, ClipData} from './types';

// Один кусок выходного ролика. srcStart/srcEnd — секунды исходника,
// from/durationInFrames — кадры выходного ролика.
export type Segment = {
	kind: 'main' | 'hook' | 'replay' | 'freeze';
	srcStart: number;
	srcEnd: number;
	speed: number;
	zoom: number;
	from: number;
	durationInFrames: number;
	// звук исходника в этом куске (в slow-mo повторах и freeze выключен)
	audio: boolean;
};

export type OutRange = {from: number; to: number};

export type Timeline = {
	segments: Segment[];
	totalFrames: number;
	warnings: string[];
};

type Op = {start: number; end: number; action: 'cut' | 'speedup' | 'keep'; speed: number};

const EPS = 1e-3;

export const getAccents = (
	data: ClipData,
	analysis: Analysis | null,
	config: Config,
): Accent[] => {
	const fromAnalysis: Accent[] = (analysis?.peaks ?? []).map((p) => ({
		start: p.start,
		end: p.end,
		type: p.kind === 'gameplay' ? 'gameplay' : 'emotion',
		source: 'analysis',
	}));
	if (fromAnalysis.length > 0 && !config.accents.useAudioWhenAnalysis) {
		return [...fromAnalysis, ...data.accents.filter((a) => a.source === 'manual')];
	}

	return [...fromAnalysis, ...data.accents];
};

export const buildTimeline = (
	data: ClipData,
	analysis: Analysis | null,
	config: Config,
): Timeline => {
	const {fps} = config.composition;
	const duration = data.source.durationSec;
	const warnings: string[] = [];
	const ops: Op[] = [];

	// Очень короткий исходник: без вырезок и ускорений (SPEC 8а)
	const tooShort = duration < 5;

	if (!tooShort) {
		for (const d of data.deadTime) {
			ops.push({
				start: d.start,
				end: d.end,
				action: d.action,
				speed: d.speed ?? 1,
			});
		}

		for (const c of analysis?.cuts ?? []) {
			ops.push({start: c.start, end: c.end, action: c.action, speed: c.speed ?? 2});
		}
	}

	if (config.length.mode === 'fit' && !tooShort) {
		const target = (config.length.targetSec as number | null) ?? 30;
		const pad = config.length.fitPaddingSec;
		const moments = [
			...(analysis?.hook ? [{start: analysis.hook.start, end: analysis.hook.end, score: 2}] : []),
			...(analysis?.peaks ?? []).map((p) => ({start: p.start, end: p.end, score: 1 + p.intensity})),
			...getAccents(data, analysis, config).map((a) => ({
				start: a.start,
				end: a.end,
				score: a.type === 'emotion' ? 0.7 : 0.6,
			})),
		].sort((a, b) => b.score - a.score);

		const chosen: {start: number; end: number}[] = [];
		let total = 0;
		for (const m of moments) {
			if (total >= target) {
				break;
			}

			const start = Math.max(0, m.start - pad);
			const end = Math.min(duration, m.end + pad);
			if (chosen.some((c) => start < c.end && end > c.start)) {
				continue;
			}

			chosen.push({start, end});
			total += end - start;
		}

		chosen.sort((a, b) => a.start - b.start);
		let cursor = 0;
		for (const c of chosen) {
			if (c.start > cursor) {
				ops.push({start: cursor, end: c.start, action: 'cut', speed: 1});
			}

			cursor = c.end;
		}

		if (cursor < duration) {
			ops.push({start: cursor, end: duration, action: 'cut', speed: 1});
		}

		if (chosen.length === 0) {
			warnings.push('length.mode = fit: не нашлось ни одного момента (нет акцентов и analysis.json), ролик не ужат');
			ops.splice(0, ops.length);
		}
	}

	// Разбиваем исходник на элементарные интервалы по границам всех операций
	const bounds = new Set<number>([0, duration]);
	// повтор должен встать сразу после своего момента, поэтому режем кусок по его концу
	for (const rep of analysis?.replays ?? []) {
		bounds.add(Math.max(0, Math.min(duration, rep.end)));
	}

	for (const op of ops) {
		bounds.add(Math.max(0, Math.min(duration, op.start)));
		bounds.add(Math.max(0, Math.min(duration, op.end)));
	}

	const sorted = [...bounds].sort((a, b) => a - b);
	const kept: {srcStart: number; srcEnd: number; speed: number}[] = [];
	for (let i = 0; i < sorted.length - 1; i++) {
		const a = sorted[i];
		const b = sorted[i + 1];
		if (b - a < EPS) {
			continue;
		}

		const mid = (a + b) / 2;
		const covering = ops.filter((op) => op.start <= mid && op.end >= mid);
		let speed = 1;
		if (covering.some((op) => op.action === 'keep')) {
			speed = 1;
		} else if (covering.some((op) => op.action === 'cut')) {
			continue;
		} else {
			const speedups = covering.filter((op) => op.action === 'speedup');
			speed = speedups.length > 0 ? Math.max(...speedups.map((s) => s.speed)) : 1;
		}

		const last = kept[kept.length - 1];
		const replayBoundary = (analysis?.replays ?? []).some((r) => Math.abs(r.end - a) < EPS);
		if (last && Math.abs(last.srcEnd - a) < EPS && last.speed === speed && !replayBoundary) {
			last.srcEnd = b;
		} else {
			kept.push({srcStart: a, srcEnd: b, speed});
		}
	}

	type Draft = Omit<Segment, 'from' | 'durationInFrames'> & {freezeSec?: number};
	const drafts: Draft[] = [];

	if (analysis?.hook?.prepend) {
		drafts.push({
			kind: 'hook',
			srcStart: analysis.hook.start,
			srcEnd: analysis.hook.end,
			speed: 1,
			zoom: 1,
			audio: true,
		});
	}

	const blackFreezes = tooShort
		? []
		: data.deadTime.filter((d) => d.kind === 'black' && d.action === 'cut' && (d.freezeSec ?? 0) > 0);
	const replays = [...(analysis?.replays ?? [])];

	for (const k of kept) {
		drafts.push({kind: 'main', ...k, zoom: 1, audio: true});

		for (const f of blackFreezes) {
			if (Math.abs(f.start - k.srcEnd) < 0.05) {
				drafts.push({
					kind: 'freeze',
					srcStart: Math.max(0, f.start - 1 / fps),
					srcEnd: f.start,
					speed: 1,
					zoom: 1,
					audio: false,
					freezeSec: f.freezeSec ?? 0,
				});
			}
		}

		// повтор вставляется сразу после куска, в котором закончился момент
		for (let r = replays.length - 1; r >= 0; r--) {
			const rep = replays[r];
			if (rep.end > k.srcStart - EPS && rep.end <= k.srcEnd + EPS) {
				drafts.push({
					kind: 'replay',
					srcStart: rep.start,
					srcEnd: rep.end,
					speed: rep.speed,
					zoom: rep.zoom,
					audio: false,
				});
				replays.splice(r, 1);
			}
		}
	}

	for (const rep of replays) {
		warnings.push(`replay ${rep.start}–${rep.end} попал в вырезанный участок и пропущен`);
	}

	const segments: Segment[] = [];
	let from = 0;
	for (const d of drafts) {
		const durationInFrames =
			d.kind === 'freeze'
				? Math.round((d.freezeSec ?? 0) * fps)
				: Math.round(((d.srcEnd - d.srcStart) / d.speed) * fps);
		if (durationInFrames < 1) {
			continue;
		}

		segments.push({
			kind: d.kind,
			srcStart: d.srcStart,
			srcEnd: d.srcEnd,
			speed: d.speed,
			zoom: d.zoom,
			audio: d.audio,
			from,
			durationInFrames,
		});
		from += durationInFrames;
	}

	return {segments, totalFrames: Math.max(1, from), warnings};
};

// Все места выходного ролика (в кадрах), где звучит момент исходника t.
// Обычно одно; если хук продублирован в начало — два.
export const srcToOut = (timeline: Timeline, t: number, fps: number): number[] => {
	const out: number[] = [];
	for (const s of timeline.segments) {
		if ((s.kind === 'main' || s.kind === 'hook') && t >= s.srcStart - EPS && t < s.srcEnd) {
			out.push(s.from + ((t - s.srcStart) / s.speed) * fps);
		}
	}

	return out;
};

// Переносит отрезок исходника [start, end] в выходные кадры (по каждому вхождению).
// Конец обрезается границей куска, в котором начался отрезок.
export const rangeToOut = (
	timeline: Timeline,
	start: number,
	end: number,
	fps: number,
): OutRange[] => {
	const out: OutRange[] = [];
	for (const s of timeline.segments) {
		if (s.kind !== 'main' && s.kind !== 'hook') {
			continue;
		}

		const a = Math.max(start, s.srcStart);
		const b = Math.min(end, s.srcEnd);
		if (b - a < EPS) {
			continue;
		}

		out.push({
			from: s.from + ((a - s.srcStart) / s.speed) * fps,
			to: s.from + ((b - s.srcStart) / s.speed) * fps,
		});
	}

	return out;
};
