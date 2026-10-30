import * as THREE from 'three';
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from '../../public/fonts/rubik.typeface.json';

const font = new FontLoader().parse(fontJson as never);
const cache = new Map<string, THREE.BufferGeometry>();

// Bevelled, centred 3D text (Rubik Black, Cyrillic)
export const text3d = (text: string, size: number) => {
	const key = `${text}@${size}`;
	if (!cache.has(key)) {
		const g = new TextGeometry(text, {
			font,
			size,
			depth: size * 0.35,
			curveSegments: 8,
			bevelEnabled: true,
			bevelThickness: size * 0.06,
			bevelSize: size * 0.04,
			bevelSegments: 4,
		});
		g.center();
		cache.set(key, g);
	}
	return cache.get(key)!;
};
