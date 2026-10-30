import {useMemo} from 'react';
import * as THREE from 'three';

// 3-step cel shading ramp
const ramp = (() => {
	const data = new Uint8Array([90, 170, 255]);
	const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
	tex.minFilter = THREE.NearestFilter;
	tex.magFilter = THREE.NearestFilter;
	tex.needsUpdate = true;
	return tex;
})();

const outline = new THREE.MeshBasicMaterial({color: '#141210', side: THREE.BackSide});

export const useToon = (color: string, map: THREE.Texture | null = null) =>
	useMemo(() => new THREE.MeshToonMaterial({color, gradientMap: ramp, map}), [color, map]);

// Mesh + inverted-hull outline
export const Toon: React.FC<{
	geometry: THREE.BufferGeometry;
	material: THREE.Material;
	position?: [number, number, number];
	rotation?: [number, number, number];
	scale?: [number, number, number];
	line?: number;
}> = ({geometry, material, position, rotation, scale, line = 1.06}) => {
	const s = scale ?? [1, 1, 1];
	return (
		<group position={position} rotation={rotation}>
			<mesh geometry={geometry} material={material} scale={s} castShadow />
			<mesh geometry={geometry} material={outline} scale={[s[0] * line, s[1] * line, s[2] * line]} />
		</group>
	);
};
