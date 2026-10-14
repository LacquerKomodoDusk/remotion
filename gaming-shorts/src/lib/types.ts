// Общие типы для prep (Node) и композиции (браузер).
// Все времена в data.json и analysis.json хранятся в секундах ИСХОДНИКА.

export type Word = {
	text: string;
	start: number;
	end: number;
	confidence: number | null;
};

export type AccentType = 'emotion' | 'gameplay';

export type Accent = {
	start: number;
	end: number;
	type: AccentType;
	source: 'audio' | 'analysis' | 'manual';
};

export type DeadTime = {
	start: number;
	end: number;
	kind: 'black' | 'silence';
	action: 'cut' | 'speedup';
	speed: number | null;
	freezeSec: number | null;
};

export type ClipData = {
	version: 1;
	clip: string;
	source: {
		file: string;
		width: number;
		height: number;
		fps: number;
		durationSec: number;
	};
	words: Word[];
	// индексы слов из words[], которые нашлись в profanity.txt
	profanity: number[];
	accents: Accent[];
	deadTime: DeadTime[];
	report: string[];
};

export type AnalysisCut = {
	start: number;
	end: number;
	// keep — защитить участок от технических вырезок (расширение SPEC)
	action: 'cut' | 'speedup' | 'keep';
	speed?: number;
	reason: string;
	confidence: number;
};

export type Analysis = {
	topic: string;
	genre: string;
	hook: {
		start: number;
		end: number;
		text: string;
		reason: string;
		confidence: number;
		// true = продублировать хук в начало ролика. По SPEC только после подтверждения.
		prepend?: boolean;
	} | null;
	segments: {
		start: number;
		end: number;
		role: string;
		summary: string;
		pace: string;
	}[];
	keywords: {wordIndex: number; reason: string; confidence: number}[];
	peaks: {
		start: number;
		end: number;
		kind: string;
		intensity: number;
		reason: string;
	}[];
	cuts: AnalysisCut[];
	// повтор момента в slow-mo сразу после него (расширение SPEC)
	replays?: {
		start: number;
		end: number;
		speed: number;
		zoom: number;
		reason: string;
	}[];
};

export type AssetManifest = {
	sfx: Record<string, string[]>;
	music: string[];
};
