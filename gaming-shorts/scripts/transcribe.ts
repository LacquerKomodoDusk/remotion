// npm run transcribe -- <clip>
// Транскрибирует input/<clip>.* через whisper-skill (.claude/skills/whisper-skill)
// и кладёт input/<clip>.json — его потом подхватит npm run prep.

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {config} from '../src/lib/config';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = path.join(root, '.claude', 'skills', 'whisper-skill');
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!arg) {
	console.error('Использование: npm run transcribe -- <имя клипа из input/>');
	process.exit(1);
}

const clip = path.basename(arg, path.extname(arg));
const inputFile = ['.mp4', '.mov', '.mkv', '.webm', '.m4v']
	.map((e) => path.join(root, 'input', clip + e))
	.find((f) => fs.existsSync(f));
if (!inputFile) {
	console.error(`Не найден input/${clip}.(mp4|mov|mkv|webm|m4v)`);
	process.exit(1);
}

// На Windows python бывает доступен как "py"
const python = ['python', 'py', 'python3'].find((p) => spawnSync(p, ['--version']).status === 0);
if (!python) {
	console.error('Python не найден. Поставь его (winget install --id Python.Python.3.12 -e) и запусти мастер: cd .claude/skills/whisper-skill; python wizard.py');
	process.exit(1);
}

const res = spawnSync(
	python,
	[
		'-m',
		'examples.transcribe_one',
		inputFile,
		'--language',
		config.whisper.language,
		'--model',
		config.whisper.skillModel,
		'--format',
		'json',
		'--output',
		path.join(root, 'input'),
	],
	{cwd: skillDir, stdio: 'inherit'},
);
if (res.status !== 0) {
	console.error('\nwhisper-skill завершился с ошибкой. Если бэкенд не установлен: cd .claude/skills/whisper-skill; python wizard.py');
	process.exit(res.status ?? 1);
}

console.log(`\n✔ input/${clip}.json — теперь запусти npm run prep -- ${clip}`);
