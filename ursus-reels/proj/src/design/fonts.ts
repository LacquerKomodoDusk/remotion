import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

const faces: [string, string, string][] = [
	['Unbounded', '700', 'unbounded-latin-700-normal.woff2'],
	['Unbounded', '700', 'unbounded-cyrillic-700-normal.woff2'],
	['Unbounded', '800', 'unbounded-latin-800-normal.woff2'],
	['Unbounded', '800', 'unbounded-cyrillic-800-normal.woff2'],
	['Manrope', '600', 'manrope-latin-600-normal.woff2'],
	['Manrope', '600', 'manrope-cyrillic-600-normal.woff2'],
	['Manrope', '800', 'manrope-latin-800-normal.woff2'],
	['Manrope', '800', 'manrope-cyrillic-800-normal.woff2'],
];

const handle = delayRender('fonts');
export const fontsReady = Promise.all(
	faces.map(([family, weight, file]) => {
		const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight});
		document.fonts.add(face);
		return face.load();
	}),
).then(() => continueRender(handle));

// Canvas textures need the webfonts before they draw
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
