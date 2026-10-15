// Синхронизирует ../assets → public/assets и пишет список доступных файлов для SoundSlot.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const src = path.resolve(root, '..', 'assets');
const dst = path.join(root, 'public', 'assets');
fs.rmSync(dst, {recursive: true, force: true});
fs.cpSync(src, dst, {recursive: true, filter: (p) => !path.basename(p).startsWith('.')});
const list = [];
const walk = (d) => {
	for (const e of fs.readdirSync(d, {withFileTypes: true})) {
		const p = path.join(d, e.name);
		if (e.isDirectory()) walk(p);
		else list.push(path.relative(dst, p).split(path.sep).join('/'));
	}
};
walk(dst);
fs.writeFileSync(path.join(root, 'src', 'available-assets.json'), JSON.stringify(list.sort(), null, 1));
console.log(`assets: ${list.length} файлов`);

// Голос: срез низа + компрессор, чтобы тихие фразы не тонули рядом с криками
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(root, 'public', 'voice.wav'), '-af', 'highpass=f=80,acompressor=threshold=-30dB:ratio=4:attack=5:release=150:makeup=8dB,alimiter=limit=0.89', path.join(root, 'public', 'voice_proc.wav')], {stdio: 'inherit'});

// Уровни звуков для сведения относительно голоса
execFileSync('python3', [path.resolve(root, '..', 'scripts', 'measure_levels.py'), dst, path.join(root, 'public', 'voice_proc.wav'), path.join(root, 'src', 'levels.json')], {stdio: 'inherit'});
