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

// Уровни звуков для сведения относительно голоса
execFileSync('python3', [path.resolve(root, '..', 'scripts', 'measure_levels.py'), dst, path.join(root, 'public', 'voice.wav'), path.join(root, 'src', 'levels.json')], {stdio: 'inherit'});
