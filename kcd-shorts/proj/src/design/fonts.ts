import {continueRender, delayRender, staticFile} from 'remotion';

const faces: [string, string, string][] = [
	['Ruslan Display', '400', 'ruslan-display-cyrillic-400-normal.woff2'],
	['Ruslan Display', '400', 'ruslan-display-latin-400-normal.woff2'],
	['Rubik', '900', 'rubik-cyrillic-900-normal.woff2'],
	['Rubik', '900', 'rubik-latin-900-normal.woff2'],
];

const handle = delayRender('fonts');
Promise.all(
	faces.map(([family, weight, file]) => {
		const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight});
		document.fonts.add(face);
		return face.load();
	}),
).then(() => continueRender(handle));
