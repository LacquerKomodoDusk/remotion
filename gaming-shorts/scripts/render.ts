// npm run render -- <clip> [--frames=0-150] [--out=out/file.mp4]
// Браузер можно задать через переменную REMOTION_BROWSER_EXECUTABLE.
// За корпоративным прокси с подменой сертификатов: REMOTION_IGNORE_CERTIFICATE_ERRORS=1.

import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {config} from '../src/lib/config';
import {compositionIdForClip} from '../src/lib/ids';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const clip = args.find((a) => !a.startsWith('--'));
const option = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? null;

if (!clip) {
	console.error('Использование: npm run render -- <clip> [--frames=0-150]');
	process.exit(1);
}

const framesArg = option('frames');
const frameRange = framesArg
	? (framesArg.split('-').map(Number) as [number, number])
	: null;
const outputLocation = path.resolve(
	root,
	option('out') ?? path.join('out', framesArg ? `${clip}-preview.mp4` : `${clip}.mp4`),
);

const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), publicDir: path.join(root, 'public')});
const inputProps = {clip, data: null, analysis: null, assets: null};
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const chromiumOptions = {ignoreCertificateErrors: process.env.REMOTION_IGNORE_CERTIFICATE_ERRORS === '1'};
const composition = await selectComposition({
	serveUrl,
	id: compositionIdForClip(clip),
	inputProps,
	browserExecutable,
	chromiumOptions,
});

console.log(`▶ ${composition.id}: ${composition.durationInFrames} кадров (${(composition.durationInFrames / composition.fps).toFixed(2)} с)`);
let lastPercent = -1;
await renderMedia({
	composition,
	serveUrl,
	codec: 'h264',
	crf: config.composition.crf,
	audioBitrate: config.composition.audioBitrate as `${number}k`,
	outputLocation,
	inputProps,
	frameRange,
	browserExecutable,
	chromiumOptions,
	onProgress: ({progress}) => {
		const percent = Math.round(progress * 100);
		if (percent !== lastPercent) {
			lastPercent = percent;
			process.stdout.write(`\r  рендер: ${percent}%   `);
		}
	},
});
console.log(`\n✔ ${path.relative(root, outputLocation)}`);
