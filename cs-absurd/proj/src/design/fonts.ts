import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

const faces: [string, string, string, string?][] = [
	['Ruslan Display', '400', 'ruslan-display-cyrillic-400-normal.woff2'],
	['Ruslan Display', '400', 'ruslan-display-latin-400-normal.woff2'],
	['Rubik', '900', 'rubik-cyrillic-900-normal.woff2'],
	['Rubik', '900', 'rubik-latin-900-normal.woff2'],
	['PT Serif', '400', 'pt-serif-cyrillic-400-italic.woff2', 'italic'],
	['PT Serif', '400', 'pt-serif-latin-400-italic.woff2', 'italic'],
	['PT Serif', '700', 'pt-serif-cyrillic-700-normal.woff2', 'normal'],
	['PT Serif', '700', 'pt-serif-latin-700-normal.woff2', 'normal'],
];

const handle = delayRender('fonts');
export const fontsReady = Promise.all(
	faces.map(([family, weight, file, style]) => {
		const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight, style: style ?? 'normal'});
		document.fonts.add(face);
		return face.load();
	}),
).then(() => continueRender(handle));

// canvas textures need the webfonts before they draw
export const useFontsReady = () => {
	const [ready, setReady] = useState(false);
	const [h] = useState(() => delayRender('fonts for canvas textures'));
	useEffect(() => {
		fontsReady.then(() => {
			setReady(true);
			continueRender(h);
		});
	}, [h]);
	return ready;
};
