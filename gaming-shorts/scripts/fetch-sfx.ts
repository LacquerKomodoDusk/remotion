// npm run fetch-sfx
// Скачивает стартовый набор звуков из @remotion/sfx (remotion.media) в assets/sfx/.
// Существующие файлы не перезаписывает. Свои звуки просто клади рядом.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'assets', 'sfx');
fs.mkdirSync(dir, {recursive: true});

const files: Record<string, string> = {
	'quack1.wav': 'https://remotion.media/mac-quack.wav',
	'whoosh1.wav': 'https://remotion.media/whoosh.wav',
	'whoosh2.wav': 'https://remotion.media/whip.wav',
	'boom1.wav': 'https://remotion.media/vine-boom.wav',
	'error1.wav': 'https://remotion.media/bruh.wav',
};

for (const [name, url] of Object.entries(files)) {
	const target = path.join(dir, name);
	if (fs.existsSync(target)) {
		console.log(`= ${name} уже есть`);
		continue;
	}

	const res = await fetch(url);
	if (!res.ok) {
		console.error(`✖ ${name}: ${res.status} ${url}`);
		continue;
	}

	fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
	console.log(`+ ${name}`);
}

console.log('Готово. Запусти npm run assets, чтобы обновить public/_assets/.');
