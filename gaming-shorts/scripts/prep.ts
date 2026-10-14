// npm run prep -- <clip> [--force] [--no-whisper]
// npm run assets            (только синхронизировать assets/ → public/_assets/)
//
// Делает: нормализацию звука и видео → public/<clip>/source.mp4, audio.wav,
// технический анализ (уровни, акценты, чёрный экран, тишина), транскрипцию,
// поиск мата и пишет public/<clip>/data.json + отчёт.

import {spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {config} from '../src/lib/config';
import {buildTimeline, getAccents} from '../src/lib/timeline';
import type {Accent, Analysis, AssetManifest, ClipData, DeadTime, Word} from '../src/lib/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
const VIDEO_EXT = ['.mp4', '.mov', '.mkv', '.webm', '.m4v'];

const tool = (name: 'ffmpeg' | 'ffprobe'): string[] => {
	const configured = config.tools[name];
	if (configured !== 'auto') {
		return [configured];
	}

	// auto: системный ffmpeg из PATH, если он есть, иначе встроенный в Remotion
	// (у встроенного урезан набор фильтров, но для prep его хватает)
	if (spawnSync(name, ['-version']).status === 0) {
		return [name];
	}

	return [process.execPath, path.join(root, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), name];
};

const run = (name: 'ffmpeg' | 'ffprobe', toolArgs: string[]) => {
	const [cmd, ...pre] = tool(name);
	const res = spawnSync(cmd, [...pre, ...toolArgs], {maxBuffer: 1024 * 1024 * 256});
	if (res.status !== 0) {
		throw new Error(`${name} ${toolArgs.join(' ')}\n${res.stderr?.toString() ?? ''}`);
	}

	return res.stdout.toString();
};

// Запускает ffmpeg и отдаёт stdout по кускам (чтобы длинные клипы не грузить в память)
const stream = (toolArgs: string[], onData: (chunk: Buffer) => void) =>
	new Promise<void>((resolve, reject) => {
		const [cmd, ...pre] = tool('ffmpeg');
		const child = spawn(cmd, [...pre, ...toolArgs]);
		let stderr = '';
		child.stdout.on('data', onData);
		child.stderr.on('data', (d) => {
			stderr += d.toString();
		});
		child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr))));
	});

const syncAssets = (): {manifest: AssetManifest; warnings: string[]} => {
	const outDir = path.join(root, 'public', '_assets');
	fs.rmSync(outDir, {recursive: true, force: true});
	const manifest: AssetManifest = {sfx: {}, music: []};
	const categories: [string, RegExp][] = [
		['quack', /^(quack|кря|duck)/i],
		['whoosh', /^(whoosh|swoosh|whip|свуш)/i],
		['boom', /^(boom|vine|бум)/i],
		['error', /^(error|bruh|fail|oof)/i],
		['click', /^(click|щелч)/i],
	];
	for (const kind of ['sfx', 'music'] as const) {
		const dir = path.join(root, 'assets', kind);
		const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => AUDIO_EXT.test(f)).sort() : [];
		if (files.length > 0) {
			fs.mkdirSync(path.join(outDir, kind), {recursive: true});
		}

		for (const f of files) {
			fs.copyFileSync(path.join(dir, f), path.join(outDir, kind, f));
			if (kind === 'music') {
				manifest.music.push(`music/${f}`);
				continue;
			}

			const cat = categories.find(([, re]) => re.test(f))?.[0] ?? 'other';
			(manifest.sfx[cat] ??= []).push(`sfx/${f}`);
		}
	}

	fs.mkdirSync(outDir, {recursive: true});
	fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

	const warnings: string[] = [];
	const hints: Record<string, string> = {
		quack: '«кря» на мате (quack*.mp3)',
		whoosh: 'свуши на склейках (whoosh*.mp3)',
		boom: 'удар на gameplay-акцентах (boom*.mp3)',
		error: 'звук на freeze после чёрного экрана (error*.mp3)',
	};
	for (const [cat, hint] of Object.entries(hints)) {
		if (!manifest.sfx[cat]) {
			warnings.push(`assets/sfx: нет файлов для «${cat}» — эффект выключен: ${hint}`);
		}
	}

	if (manifest.music.length === 0) {
		warnings.push('assets/music пуст — музыка выключена');
	}

	return {manifest, warnings};
};

const median = (xs: number[]) => {
	const s = [...xs].sort((a, b) => a - b);
	return s.length === 0 ? -90 : s[Math.floor(s.length / 2)];
};

// Слова из JSON, который делает whisper-skill (python -m examples.transcribe_one ... --format json)
// или из простого списка [{text,start,end}]
const wordsFromJson = (file: string): Word[] => {
	const json = JSON.parse(fs.readFileSync(file, 'utf8'));
	if (Array.isArray(json)) {
		return json.map((w: {text: string; start: number; end: number; confidence?: number}) => ({
			text: w.text.trim(),
			start: w.start,
			end: w.end,
			confidence: w.confidence ?? null,
		}));
	}

	const words: Word[] = [];
	for (const seg of json.segments ?? []) {
		for (const w of seg.words ?? []) {
			words.push({text: String(w.word).trim(), start: w.start, end: w.end, confidence: w.probability ?? null});
		}
	}

	if (words.length === 0 && (json.segments ?? []).length > 0) {
		throw new Error(`${file}: в сегментах нет пословных таймкодов — запусти транскрибацию без --no-words`);
	}

	return words;
};

const transcribeWithWhisperCpp = async (wav: string, durationSec: number, tmpDir: string): Promise<Word[]> => {
	const {downloadWhisperModel, installWhisperCpp, toCaptions, transcribe} = await import(
		'@remotion/install-whisper-cpp'
	);
	const w = config.whisper;
	const whisperPath = path.join(root, 'whisper.cpp');
	await installWhisperCpp({to: whisperPath, version: w.version});
	await downloadWhisperModel({
		folder: whisperPath,
		model: w.model as Parameters<typeof downloadWhisperModel>[0]['model'],
		onProgress: (done, total) => process.stdout.write(`\r  модель: ${Math.round((done / total) * 100)}%   `),
	});
	process.stdout.write('\n');

	// Длинные исходники режем на куски с нахлёстом и склеиваем обратно
	const chunks: {start: number; len: number}[] = [];
	if (durationSec <= w.chunkSec * 1.2) {
		chunks.push({start: 0, len: durationSec});
	} else {
		for (let s = 0; s < durationSec; s += w.chunkSec) {
			chunks.push({start: Math.max(0, s - w.overlapSec), len: w.chunkSec + w.overlapSec});
		}
	}

	const words: Word[] = [];
	for (const [i, chunk] of chunks.entries()) {
		let input = wav;
		if (chunks.length > 1) {
			input = path.join(tmpDir, `chunk-${i}.wav`);
			run('ffmpeg', ['-y', '-v', 'error', '-ss', String(chunk.start), '-t', String(chunk.len), '-i', wav, '-c:a', 'pcm_s16le', input]);
		}

		const output = await transcribe({
			inputPath: input,
			whisperPath,
			whisperCppVersion: w.version,
			model: w.model as Parameters<typeof transcribe>[0]['model'],
			tokenLevelTimestamps: true,
			splitOnWord: true,
			language: w.language as Parameters<typeof transcribe>[0]['language'],
			printOutput: false,
			onProgress: (p) => process.stdout.write(`\r  whisper: кусок ${i + 1}/${chunks.length}, ${Math.round(p * 100)}%   `),
		});
		const {captions} = toCaptions({whisperCppOutput: output});
		const lastEnd = words.length > 0 ? words[words.length - 1].end : -1;
		const chunkWords: Word[] = [];
		for (const c of captions) {
			if (/^\s*\[.*\]\s*$/.test(c.text)) {
				continue;
			}

			const start = chunk.start + c.startMs / 1000;
			const end = chunk.start + c.endMs / 1000;
			const prev = chunkWords[chunkWords.length - 1];
			// токен без пробела в начале — продолжение предыдущего слова
			if (prev && !c.text.startsWith(' ')) {
				prev.text += c.text;
				prev.end = end;
				continue;
			}

			chunkWords.push({text: c.text.trim(), start, end, confidence: c.confidence});
		}

		// на нахлёсте оставляем слова предыдущего куска
		words.push(...chunkWords.filter((cw) => cw.start > lastEnd - 0.05 && cw.text.length > 0));
	}

	process.stdout.write('\n');
	return words;
};

const loadProfanity = () =>
	fs
		.readFileSync(path.join(root, 'profanity.txt'), 'utf8')
		.split(/\r?\n/)
		.map((l) => l.trim().toLowerCase().replace(/ё/g, 'е'))
		.filter((l) => l.length > 0 && !l.startsWith('#'));

const normalizeWord = (w: string) => w.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}]/gu, '');

const isProfane = (word: string, patterns: string[]) => {
	const w = normalizeWord(word);
	if (w.length === 0) {
		return false;
	}

	return patterns.some((p) => {
		const starts = p.startsWith('*');
		const ends = p.endsWith('*');
		const core = p.replace(/^\*|\*$/g, '');
		if (starts && ends) {
			return w.includes(core);
		}

		if (ends) {
			return w.startsWith(core);
		}

		if (starts) {
			return w.endsWith(core);
		}

		return w === core;
	});
};

const main = async () => {
	if (flags.has('--assets-only')) {
		const {warnings} = syncAssets();
		console.log('assets → public/_assets/ синхронизированы');
		warnings.forEach((w) => console.log(`⚠ ${w}`));
		return;
	}

	const arg = positional[0];
	if (!arg) {
		console.error('Использование: npm run prep -- <имя клипа из input/>');
		process.exit(1);
	}

	const clip = path.basename(arg, path.extname(arg));
	const inputFile = VIDEO_EXT.map((e) => path.join(root, 'input', clip + e)).find((f) => fs.existsSync(f));
	if (!inputFile) {
		console.error(`Не найден input/${clip}.(${VIDEO_EXT.map((e) => e.slice(1)).join('|')})`);
		process.exit(1);
	}

	const outDir = path.join(root, 'public', clip);
	const tmpDir = path.join(outDir, 'tmp');
	fs.mkdirSync(tmpDir, {recursive: true});
	const report: string[] = [];
	const fps = config.composition.fps;

	console.log(`▶ ${path.relative(root, inputFile)} (ffmpeg: ${tool('ffmpeg').length === 1 ? 'системный' : 'встроенный в Remotion'})`);
	const probe = JSON.parse(
		run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', inputFile]),
	);
	const vStream = probe.streams.find((s: {codec_type: string}) => s.codec_type === 'video');
	const hasAudio = probe.streams.some((s: {codec_type: string}) => s.codec_type === 'audio');
	const [num, den] = String(vStream.r_frame_rate).split('/').map(Number);
	const srcFps = num / (den || 1);

	// 1. Нормализованный исходник для Remotion
	const sourceMp4 = path.join(outDir, 'source.mp4');
	const fresh = fs.existsSync(sourceMp4) && fs.statSync(sourceMp4).mtimeMs > fs.statSync(inputFile).mtimeMs;
	if (!fresh || flags.has('--force')) {
		console.log('1/6 звук → −14 LUFS, видео → H.264 ...');
		const videoArgs = config.prep.reencodeVideo
			? ['-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-g', String(Math.round(srcFps * config.prep.keyframeEverySec))]
			: ['-c:v', 'copy'];
		// Двухпроходный loudnorm в линейном режиме: одинаковое усиление на весь клип,
		// без «накачки» тихих мест (однопроходный режим поднимает фоновый шум)
		let audioArgs: string[] = [];
		if (hasAudio) {
			const target = `I=${config.prep.loudnessLufs}:TP=-1.5:LRA=20`;
			const [cmd, ...pre] = tool('ffmpeg');
			const pass1 = spawnSync(cmd, [...pre, '-hide_banner', '-i', inputFile, '-vn', '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'], {maxBuffer: 1024 * 1024 * 64});
			const stderr = pass1.stderr.toString();
			const m = JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
			const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
			report.push(`громкость исходника: ${m.input_i} LUFS → ${config.prep.loudnessLufs} LUFS`);
			audioArgs = ['-af', `loudnorm=${target}:${measured}:linear=true`, '-ar', '48000', '-c:a', 'aac', '-b:a', '320k'];
		}
		run('ffmpeg', ['-y', '-v', 'error', '-i', inputFile, '-map', '0:v:0', ...(hasAudio ? ['-map', '0:a:0'] : []), ...videoArgs, ...audioArgs, '-movflags', '+faststart', sourceMp4]);
	} else {
		console.log('1/6 source.mp4 уже готов (--force чтобы пересобрать)');
	}

	const durationSec = Number(
		JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', sourceMp4])).format.duration,
	);

	// 2. WAV 16 кГц моно для Whisper и анализа
	console.log('2/6 audio.wav ...');
	const wav = path.join(outDir, 'audio.wav');
	if (hasAudio) {
		run('ffmpeg', ['-y', '-v', 'error', '-i', sourceMp4, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav]);
	}

	// 3. Уровни RMS окнами по windowMs (потоком)
	console.log('3/6 анализ звука и картинки ...');
	const winSamples = Math.round((16000 * config.accents.windowMs) / 1000);
	const levels: number[] = [];
	if (hasAudio) {
		let header: Buffer | null = Buffer.alloc(0);
		let carry: Buffer = Buffer.alloc(0);
		let sum = 0;
		let n = 0;
		await stream(['-v', 'error', '-i', wav, '-f', 'wav', '-c:a', 'pcm_s16le', '-'], (chunk) => {
			let buf = chunk;
			if (header) {
				header = Buffer.concat([header, buf]);
				const dataAt = header.indexOf('data');
				if (dataAt === -1 || header.length < dataAt + 8) {
					return;
				}

				buf = header.subarray(dataAt + 8);
				header = null;
			}

			buf = Buffer.concat([carry, buf]);
			const usable = buf.length - (buf.length % 2);
			for (let i = 0; i < usable; i += 2) {
				const s = buf.readInt16LE(i) / 32768;
				sum += s * s;
				n++;
				if (n === winSamples) {
					levels.push(20 * Math.log10(Math.sqrt(sum / n) + 1e-9));
					sum = 0;
					n = 0;
				}
			}

			carry = buf.subarray(usable);
		});
	}

	const win = config.accents.windowMs / 1000;
	const sliding = durationSec >= config.accents.slidingBaselineFromSec;
	const globalBase = median(levels);
	const baselines: number[] = [];
	const half = Math.round(config.accents.baselineWindowSec / 2 / win);
	for (let i = 0; i < levels.length; i++) {
		if (!sliding) {
			baselines.push(globalBase);
		} else if (i % 10 === 0) {
			baselines.push(median(levels.slice(Math.max(0, i - half), i + half)));
		} else {
			baselines.push(baselines[i - 1]);
		}
	}

	// Яркость и движение нижней (игровой) части кадра, 10 кадров/сек
	const frameStats: {luma: number; motion: number}[] = [];
	{
		const f = config.layout.sourceWebcamFraction;
		const size = 32 * 32;
		let carry: Buffer = Buffer.alloc(0);
		let prev: Buffer | null = null;
		await stream(
			['-v', 'error', '-i', sourceMp4, '-an', '-vf', `crop=iw:ih*${1 - f}:0:ih*${f},scale=32:32,format=gray`, '-r', '10', '-c:v', 'rawvideo', '-f', 'image2pipe', '-'],
			(chunk) => {
				carry = Buffer.concat([carry, chunk]);
				while (carry.length >= size) {
					const frame = carry.subarray(0, size);
					let luma = 0;
					let motion = 0;
					for (let i = 0; i < size; i++) {
						luma += frame[i];
						motion += prev ? Math.abs(frame[i] - prev[i]) : 0;
					}

					frameStats.push({luma: luma / size, motion: motion / size});
					prev = Buffer.from(frame);
					carry = carry.subarray(size);
				}
			},
		);
	}

	// Ищет непрерывные участки, где cond(i) истинно; возвращает [startIdx, endIdx)
	const runs = (len: number, cond: (i: number) => boolean) => {
		const out: [number, number][] = [];
		let s = -1;
		for (let i = 0; i <= len; i++) {
			const ok = i < len && cond(i);
			if (ok && s === -1) {
				s = i;
			} else if (!ok && s !== -1) {
				out.push([s, i]);
				s = -1;
			}
		}

		return out;
	};

	// 4. Мёртвое время
	const deadTime: DeadTime[] = [];
	const dt = config.deadTime;
	if (dt.black.enabled) {
		for (const [a, b] of runs(frameStats.length, (i) => frameStats[i].luma < dt.black.lumaThreshold)) {
			if ((b - a) / 10 >= dt.black.minSec) {
				deadTime.push({start: a / 10, end: b / 10, kind: 'black', action: 'cut', speed: null, freezeSec: dt.black.freezeSec});
			}
		}
	}

	if (dt.silence.enabled && hasAudio) {
		const still = (t: number) => {
			const s = frameStats[Math.min(frameStats.length - 1, Math.floor(t * 10))];
			return !s || s.motion < dt.silence.motionThreshold;
		};
		for (const [a, b] of runs(levels.length, (i) => levels[i] < baselines[i] + dt.silence.aboveBaselineDb && (!dt.silence.requireNoMotion || still(i * win)))) {
			const start = a * win;
			const end = b * win;
			if (end - start < dt.silence.minSec || deadTime.some((d) => start < d.end && end > d.start)) {
				continue;
			}

			deadTime.push({
				start,
				end,
				kind: 'silence',
				action: dt.silence.action as 'cut' | 'speedup',
				speed: dt.silence.action === 'speedup' ? dt.silence.speed : null,
				freezeSec: null,
			});
		}
	}

	// 5. Акценты по звуку (вторичный сигнал, SPEC 5)
	const ac = config.accents;
	const candidates: (Accent & {peak: number})[] = [];
	const minEmotion = Math.ceil(ac.emotionMinMs / config.accents.windowMs);
	const maxGameplay = Math.max(1, Math.floor(ac.gameplayMaxMs / config.accents.windowMs));
	for (const [a, b] of runs(levels.length, (i) => levels[i] > baselines[i] + ac.emotionAboveBaselineDb)) {
		const peak = Math.max(...levels.slice(a, b));
		if (b - a >= minEmotion) {
			candidates.push({start: a * win - ac.paddingSec, end: b * win + ac.paddingSec, type: 'emotion', source: 'audio', peak});
		} else if (b - a <= maxGameplay && peak > baselines[a] + ac.gameplayAboveBaselineDb) {
			candidates.push({start: a * win - ac.paddingSec, end: b * win + ac.paddingSec, type: 'gameplay', source: 'audio', peak});
		}
	}

	const accents: Accent[] = [];
	let accentTotal = 0;
	for (const c of candidates.sort((x, y) => y.peak - x.peak)) {
		const clash = accents.some((a) => c.start < a.end + ac.minGapSec && c.end > a.start - ac.minGapSec);
		if (clash || accentTotal + (c.end - c.start) > durationSec * ac.maxShareOfVideo) {
			continue;
		}

		accents.push({start: Math.max(0, c.start), end: Math.min(durationSec, c.end), type: c.type, source: 'audio'});
		accentTotal += c.end - c.start;
	}

	accents.sort((x, y) => x.start - y.start);

	// 6. Слова: ручной JSON / JSON от whisper-skill / whisper.cpp
	console.log('4/6 транскрипция ...');
	let words: Word[] = [];
	const manualWords = path.join(root, 'input', `${clip}.words.json`);
	const skillJson = path.join(root, 'input', `${clip}.json`);
	if (fs.existsSync(manualWords)) {
		words = wordsFromJson(manualWords);
		report.push(`слова: из input/${clip}.words.json`);
	} else if (fs.existsSync(skillJson)) {
		words = wordsFromJson(skillJson);
		report.push(`слова: из input/${clip}.json (whisper-skill)`);
	} else if (config.whisper.enabled && !flags.has('--no-whisper') && hasAudio) {
		try {
			words = await transcribeWithWhisperCpp(wav, durationSec, tmpDir);
			report.push(`слова: whisper.cpp ${config.whisper.version}, модель ${config.whisper.model}`);
		} catch (e) {
			report.push(`⚠ whisper.cpp не отработал: ${(e as Error).message.split('\n')[0]} — субтитров не будет`);
		}
	} else {
		report.push('⚠ транскрипции нет: субтитры и «кря» выключены');
	}

	// 7. Мат
	console.log('5/6 мат ...');
	const patterns = loadProfanity();
	const profanity = words.map((w, i) => (isProfane(w.text, patterns) ? i : -1)).filter((i) => i >= 0);

	const data: ClipData = {
		version: 1,
		clip,
		source: {file: 'source.mp4', width: vStream.width, height: vStream.height, fps: srcFps, durationSec},
		words,
		profanity,
		accents,
		deadTime,
		report: [],
	};

	// 8. Отчёт
	console.log('6/6 отчёт ...');
	const analysisFile = path.join(outDir, 'analysis.json');
	const analysis: Analysis | null = fs.existsSync(analysisFile) ? JSON.parse(fs.readFileSync(analysisFile, 'utf8')) : null;
	const timeline = buildTimeline(data, analysis, config);
	const outSec = timeline.totalFrames / fps;
	const {warnings: assetWarnings} = syncAssets();

	report.push(`исходник: ${durationSec.toFixed(2)} с, ${vStream.width}×${vStream.height}, ${srcFps.toFixed(2)} fps`);
	report.push(`после вырезок: ${outSec.toFixed(2)} с (${timeline.segments.length} кусков)${analysis ? ', с учётом analysis.json' : ', без analysis.json'}`);
	report.push(`baseline звука: ${globalBase.toFixed(1)} dBFS${sliding ? ' (скользящий)' : ''}`);
	report.push(`слов: ${words.length}, акцентов по звуку: ${accents.length} (emotion ${accents.filter((a) => a.type === 'emotion').length}, gameplay ${accents.filter((a) => a.type === 'gameplay').length}), итоговых: ${getAccents(data, analysis, config).length}`);
	report.push(`мёртвое время: ${deadTime.map((d) => `${d.kind} ${d.start.toFixed(2)}–${d.end.toFixed(2)} ${d.action}${d.speed ? ' ×' + d.speed : ''}`).join(', ') || 'нет'}`);
	report.push(`мат: ${profanity.length}${profanity.length ? ' → ' + profanity.map((i) => `«${words[i].text}» ${words[i].start.toFixed(2)}с`).join(', ') : ''}`);
	if (profanity.length / Math.max(1, durationSec) > config.profanity.maxPerSec) {
		report.push(`⚠ мата много (чаще раза в ${(1 / config.profanity.maxPerSec).toFixed(1)} с): закрой «кря» самые сильные, остальное лучше вырезать в analysis.json → cuts`);
	}

	const early = profanity.filter((i) => words[i].start < config.profanity.warnFirstSec);
	if (early.length > 0) {
		report.push(`⚠ мат в первые ${config.profanity.warnFirstSec} с: ${early.map((i) => words[i].text).join(', ')} — может ограничить показы`);
	}

	if (outSec > config.length.maxSec) {
		const empty = timeline.segments
			.filter((s) => s.kind === 'main')
			.map((s) => ({s, len: s.durationInFrames / fps}))
			.filter(({s}) => !words.some((w) => w.start < s.srcEnd && w.end > s.srcStart))
			.sort((a, b) => b.len - a.len)
			.slice(0, 3);
		report.push(`⚠ ролик длиннее ${config.length.maxSec} с. Самые пустые участки (без речи): ${empty.map(({s, len}) => `${s.srcStart.toFixed(1)}–${s.srcEnd.toFixed(1)} (${len.toFixed(1)} с)`).join(', ') || '—'}`);
	}

	if (outSec < config.length.minSec) {
		report.push(`⚠ ролик короче ${config.length.minSec} с`);
	}

	report.push(...timeline.warnings.map((w) => `⚠ ${w}`), ...assetWarnings.map((w) => `⚠ ${w}`));
	data.report = report;
	fs.writeFileSync(path.join(outDir, 'data.json'), JSON.stringify(data, null, 2));
	fs.writeFileSync(path.join(tmpDir, 'levels.json'), JSON.stringify({windowSec: win, levels, frameStats}));

	console.log(`\n✔ public/${clip}/data.json\n`);
	report.forEach((r) => console.log(`  ${r}`));
	if (!analysis) {
		console.log(`\nДальше: попроси Claude Code «проанализируй монолог ${clip} по SPEC.md, раздел 5а» → public/${clip}/analysis.json`);
	}
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
