// Пишет out/<имя>_missing-sounds.md и .json — пустые места под звуки по таймкодам итогового ролика.
import fs from 'node:fs';
import path from 'node:path';
import {FPS, SLOTS} from '../src/clip1/plan.ts';

const [outBase] = process.argv.slice(2);
const available: string[] = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'available-assets.json'), 'utf8'));
const tc = (f: number) => {
	const s = Math.floor(f / FPS);
	return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(f % FPS).padStart(2, '0')}`;
};
const missing = SLOTS.filter((s) => !available.includes(s.expectedFile));
const rows = missing.map(
	(s, i) =>
		`| ${i + 1} | ${tc(s.from)} | ${(s.durationInFrames / FPS).toFixed(2).replace('.', ',')} сек | ${s.description} | ${s.reason} | assets/${s.expectedFile} | ${s.relDb} dB от пиков голоса |`,
);
const md = [
	`# Пустые места под звуки — ${path.basename(outBase)}`,
	'',
	`Таймкоды по итоговому ролику, формат мм:сс.кадр (${FPS} fps). Положи файл с указанным именем в \`assets/\` и попроси перерендер — слот подхватит его сам.`,
	'',
	'| # | Таймкод | Длит. | Что должно звучать | Зачем | Ожидаемый файл | Громкость |',
	'|---|---|---|---|---|---|---|',
	...rows,
	'',
].join('\n');
fs.writeFileSync(`${outBase}_missing-sounds.md`, md);
fs.writeFileSync(
	`${outBase}_missing-sounds.json`,
	JSON.stringify(missing.map((s) => ({...s, timecode: tc(s.from), seconds: +(s.from / FPS).toFixed(3), durationSec: +(s.durationInFrames / FPS).toFixed(3)})), null, 1),
);
console.log(`пустых мест: ${missing.length}`);
