// План монтажа clip1 — см. work/clip1/edit-plan.md. Все времена источника — в секундах исходника.
import {WORDS} from './transcript.ts';

export const FPS = 60;

// Цензура мата (утка в субтитрах + «кря» + заглушение). В clip1 по просьбе автора мат оставлен (v2).
export const CENSOR = false;

export type Layout = 'split' | 'full';

export type Seg = {
	id: string;
	src: [number, number]; // для стоп-кадра оба значения равны кадру заморозки
	rate: number;
	layout: Layout;
	freezeSec?: number; // длительность стоп-кадра
	gameZoom: [number, number]; // зум игры в начале и конце склейки
	zoomOrigin?: [number, number]; // точка зума в кадре игры (доли)
	camZoom?: [number, number];
};

export const SEGS: Seg[] = [
	{id: 'hook', src: [9.85, 11.35], rate: 1, layout: 'split', gameZoom: [1.1, 1.1], zoomOrigin: [0.75, 0.45]},
	{id: 'walk', src: [5.0, 6.3], rate: 1, layout: 'split', gameZoom: [1, 1]},
	{id: 'kill1', src: [6.3, 7.9], rate: 1, layout: 'split', gameZoom: [1.05, 1.05]},
	{id: 'hello', src: [8.62, 9.55], rate: 1, layout: 'split', gameZoom: [1, 1]},
	{id: 'arch', src: [9.55, 9.95], rate: 0.35, layout: 'split', gameZoom: [1, 1.04]},
	{id: 'jump', src: [9.95, 10.3], rate: 1, layout: 'split', gameZoom: [1, 1.3], zoomOrigin: [0.78, 0.45]},
	{id: 'hits', src: [10.3, 10.65], rate: 0.35, layout: 'split', gameZoom: [1.3, 1.34], zoomOrigin: [0.78, 0.45]},
	{id: 'kill2', src: [10.65, 11.35], rate: 1, layout: 'split', gameZoom: [1.12, 1], zoomOrigin: [0.6, 0.45]},
	{id: 'react1', src: [11.35, 12.8], rate: 1, layout: 'full', gameZoom: [1, 1], camZoom: [1, 1.06]},
	{id: 'react2', src: [13.15, 14.45], rate: 1, layout: 'full', gameZoom: [1, 1], camZoom: [1.06, 1.25]},
	{id: 'freeze', src: [14.45, 14.45], rate: 1, layout: 'full', freezeSec: 0.8, gameZoom: [1, 1], camZoom: [1.25, 1.3]},
	{id: 'tail', src: [14.45, 17.65], rate: 1, layout: 'split', gameZoom: [1, 1]},
];

export const segLen = (s: Seg) => Math.round(s.freezeSec !== undefined ? s.freezeSec * FPS : ((s.src[1] - s.src[0]) / s.rate) * FPS);

export const SEG_START: Record<string, number> = {};
let acc = 0;
for (const s of SEGS) {
	SEG_START[s.id] = acc;
	acc += segLen(s);
}
export const TOTAL_FRAMES = acc;

export const segById = (id: string) => {
	const s = SEGS.find((x) => x.id === id);
	if (!s) {
		throw new Error(`Нет склейки ${id}`);
	}
	return s;
};

/** Кадр ролика, на который приходится момент источника `src` внутри склейки `id`. */
export const at = (id: string, src: number) => {
	const s = segById(id);
	return SEG_START[id] + Math.round(((src - s.src[0]) / s.rate) * FPS);
};
export const segStart = (id: string) => SEG_START[id];
export const segEnd = (id: string) => SEG_START[id] + segLen(segById(id));

// ---------- Переходы ----------
export type Transition = {type: 'whip'; direction: 'left' | 'right'; frames: number} | {type: 'zoomPunch'; frames: number; originX: number; originY: number} | {type: 'none'};
const NONE: Transition = {type: 'none'};
export const TRANSITIONS: Record<string, {enter: Transition; exit: Transition}> = {
	// вход хука проигрывается в последних кадрах ролика — луп: хвост уходит вушем, хук въезжает
	hook: {enter: {type: 'whip', direction: 'right', frames: 10}, exit: {type: 'zoomPunch', frames: 8, originX: 760, originY: 1250}},
	walk: {enter: {type: 'zoomPunch', frames: 8, originX: 540, originY: 1300}, exit: NONE},
	kill1: {enter: NONE, exit: {type: 'whip', direction: 'right', frames: 10}},
	hello: {enter: {type: 'whip', direction: 'right', frames: 10}, exit: NONE},
	tail: {enter: NONE, exit: {type: 'whip', direction: 'right', frames: 10}},
};
export const transitionsFor = (id: string) => TRANSITIONS[id] ?? {enter: NONE, exit: NONE};

// Смена раскладки (вебка на весь экран и обратно) — пружина в начале склейки
export const LAYOUT_SWITCHES = [
	{at: segStart('react1'), to: 1},
	{at: segStart('tail'), to: 0},
];

// ---------- Субтитры ----------
type Style = {color: 'white' | 'yellow' | 'red' | 'green' | 'blue'; size: number; shake: boolean};
const WORD_STYLE: Record<string, Style> = {
	здорово: {color: 'yellow', size: 118, shake: false},
	епта: {color: 'white', size: 104, shake: false},
	нихуя: {color: 'red', size: 128, shake: true},
	себе: {color: 'red', size: 128, shake: true},
	блять: {color: 'red', size: 128, shake: true},
	я: {color: 'white', size: 110, shake: false},
	испугался: {color: 'yellow', size: 120, shake: false},
	нахуй: {color: 'red', size: 116, shake: true},
};

export type PlanWord = {text: string; start: number; end: number; mat: boolean; style: Style};
const fromTranscript = (w: (typeof WORDS)[number]): PlanWord => ({text: w.text + (w.word === 'здорово' ? ',' : ''), start: w.start, end: w.end, mat: w.mat, style: WORD_STYLE[w.word]});
const byWords = (...names: string[]) => names.map((n) => fromTranscript(WORDS.find((w) => w.word === n)!));

// Фразы (вскрик без слов — по подтверждению: «А-А!» красным, дрожит)
export const PHRASES: PlanWord[][] = [
	byWords('здорово', 'епта'),
	[{text: 'А-А-А!', start: 10.55, end: 11.2, mat: false, style: {color: 'red', size: 150, shake: true}}],
	byWords('нихуя', 'себе', 'блять'),
	byWords('я', 'испугался', 'нахуй'),
];
export const PHRASE_HOLD_SEC = 0.35;

// ---------- Графика (якоря: [склейка, время источника]) ----------
type Anchor = [string, number];
export type Overlay =
	| {kind: 'title'; from: number; to: number; before: string; keyword: string}
	| {kind: 'burst'; at: Anchor; sec: number; text: string; color: 'red' | 'yellow' | 'blue'; x: number; y: number; rot: number; size: number}
	| {kind: 'callout'; from: Anchor; to: Anchor; text: string; x: number; y: number; rot: number}
	| {kind: 'emoji'; at: Anchor; sec: number; emoji: string; x: number; y: number; size: number}
	| {kind: 'counter'; from: Anchor; to: Anchor; label: string; steps: {at: Anchor; value: number}[]; x: number; y: number}
	| {kind: 'vignette'; from: Anchor; to: Anchor; color: string; strength: number; pulse: boolean}
	| {kind: 'speedLines'; from: Anchor; to: Anchor; cx: number; cy: number}
	| {kind: 'flash'; at: Anchor}
	| {kind: 'shake'; from: Anchor; to: Anchor; intensity: number}
	| {kind: 'halftone'; seg: string};

export const OVERLAYS: Overlay[] = [
	{kind: 'title', from: 0, to: Math.round(2.6 * FPS), before: 'сказал «здарова» —', keyword: 'ЕМУ ОТВЕТИЛИ'},
	{kind: 'shake', from: ['hook', 10.35], to: ['hook', 10.65], intensity: 18},
	{kind: 'burst', at: ['kill1', 7.4], sec: 0.33, text: 'БАЦ!', color: 'yellow', x: 640, y: 1080, rot: 6, size: 330},
	{kind: 'emoji', at: ['hello', 8.7], sec: 0.85, emoji: '👋', x: 860, y: 1250, size: 130},
	{kind: 'callout', from: ['hello', 9.3], to: ['arch', 9.95], text: 'он ещё не знает…', x: 70, y: 860, rot: -4},
	{kind: 'vignette', from: ['arch', 9.55], to: ['arch', 9.95], color: 'rgba(0,0,0,0.85)', strength: 1, pulse: false},
	{kind: 'flash', at: ['jump', 9.95]},
	{kind: 'speedLines', from: ['jump', 9.95], to: ['hits', 10.4], cx: 840, cy: 1270},
	{kind: 'shake', from: ['hits', 10.3], to: ['hits', 10.65], intensity: 14},
	{kind: 'vignette', from: ['hits', 10.3], to: ['kill2', 11.0], color: 'rgba(255,20,20,0.9)', strength: 1, pulse: true},
	{
		kind: 'counter',
		from: ['hits', 10.3],
		to: ['kill2', 11.35],
		label: 'HP',
		steps: [
			{at: ['hits', 10.3], value: 91},
			{at: ['hits', 10.36], value: 64},
			{at: ['hits', 10.5], value: 8},
		],
		x: 50,
		y: 870,
	},
	{kind: 'flash', at: ['kill2', 10.85]},
	{kind: 'burst', at: ['kill2', 10.85], sec: 0.45, text: 'БАХ!', color: 'red', x: 330, y: 1130, rot: -7, size: 300},
	{kind: 'shake', from: ['react1', 11.44], to: ['react1', 11.8], intensity: 10},
	{kind: 'emoji', at: ['react2', 13.4], sec: 1.6, emoji: '😱', x: 870, y: 470, size: 150},
	{kind: 'halftone', seg: 'freeze'},
	{kind: 'callout', from: ['tail', 14.7], to: ['tail', 16.9], text: '8 HP. Раунд наш 😎', x: 90, y: 1230, rot: 4},
];

// ---------- Звуки ----------
// relDb — на сколько dB звук тише пиков голоса (уровни меряет scripts/measure_levels.py)
export type SfxCue = {file: string; frame: number; relDb: number};
export const SFX: SfxCue[] = [
	{file: 'generated/impact_03.wav', frame: at('hook', 10.35), relDb: -6},
	{file: 'generated/whoosh_03.wav', frame: segStart('walk') - 10, relDb: -10},
	{file: 'generated/pop_02.wav', frame: segStart('walk'), relDb: -12},
	{file: 'generated/impact_02.wav', frame: at('kill1', 7.4), relDb: -6},
	{file: 'generated/whoosh_01.wav', frame: segStart('hello') - 10, relDb: -10},
	{file: 'generated/pop_soft_01.wav', frame: at('hello', 8.7), relDb: -12},
	{file: 'generated/riser_01.wav', frame: segStart('jump') - FPS, relDb: -12},
	{file: 'generated/impact_heavy_01.wav', frame: segStart('jump'), relDb: -3},
	{file: 'generated/bass_drop_01.wav', frame: segStart('jump'), relDb: -8},
	{file: 'generated/tick_01.wav', frame: at('hits', 10.36), relDb: -12},
	{file: 'generated/tick_02.wav', frame: at('hits', 10.5), relDb: -12},
	{file: 'generated/ding_01.wav', frame: at('kill2', 10.85), relDb: -12},
	{file: 'generated/whoosh_02.wav', frame: segStart('react1') - 8, relDb: -10},
	{file: 'generated/pop_03.wav', frame: at('react2', 13.4), relDb: -12},
	{file: 'generated/whoosh_01.wav', frame: segStart('tail') - 8, relDb: -10},
	{file: 'generated/pop_02.wav', frame: at('tail', 14.7), relDb: -12},
	{file: 'generated/whoosh_03.wav', frame: TOTAL_FRAMES - 12, relDb: -10},
];

export type Slot = {name: string; expectedFile: string; description: string; reason: string; from: number; durationInFrames: number; relDb: number};

// «Кря» на каждый мат — точно по таймкодам слова
const matSlots: Slot[] = SEGS.filter((s) => CENSOR && s.freezeSec === undefined).flatMap((s) =>
	PHRASES.flat()
		.filter((w) => w.mat && w.start >= s.src[0] && w.start < s.src[1])
		.map((w) => ({
			name: `quack_${w.text.toLowerCase()}`,
			expectedFile: 'quack.wav',
			description: 'кря (утка)',
			reason: `мат «${w.text.toLowerCase()}»`,
			from: at(s.id, w.start),
			durationInFrames: Math.max(Math.round(((w.end - w.start) / s.rate) * FPS), 12),
			relDb: -2,
		})),
);

export const SLOTS: Slot[] = [
	...matSlots,
	{
		name: 'meme_freeze',
		expectedFile: 'meme_freeze.wav',
		description: 'мем-звук (например «vine boom» / «bruh»)',
		reason: 'стоп-кадр после «я испугался»',
		from: segStart('freeze'),
		durationInFrames: segLen(segById('freeze')),
		relDb: -3,
	},
];

// Мат глушим на обеих дорожках (в game.wav после разделения остаётся эхо голоса), даже если «кря» ещё нет
export const MAT_RANGES: [number, number][] = PHRASES.flat()
	.filter((w) => CENSOR && w.mat)
	.map((w) => [w.start - 0.06, w.end + 0.08]);
// Где звучит голос — под ним игра тише на 6 dB
export const VOICE_RANGES: [number, number][] = PHRASES.flat().map((w) => [w.start - 0.15, w.end + 0.15]);
