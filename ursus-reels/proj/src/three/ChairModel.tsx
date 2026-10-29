import {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {C} from '../design/tokens';

// Diamond quilting like the real chair: dark leather + light stitching
const quiltTexture = (repeatX: number, repeatY: number) => {
	const s = 256;
	const canvas = document.createElement('canvas');
	canvas.width = s;
	canvas.height = s;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#1b191a';
	ctx.fillRect(0, 0, s, s);
	ctx.strokeStyle = 'rgba(184,182,183,0.55)';
	ctx.lineWidth = 3;
	ctx.setLineDash([9, 6]);
	ctx.beginPath();
	ctx.moveTo(0, s / 2);
	ctx.lineTo(s / 2, 0);
	ctx.lineTo(s, s / 2);
	ctx.lineTo(s / 2, s);
	ctx.closePath();
	ctx.stroke();
	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(repeatX, repeatY);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
};

const logoTexture = () => {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 160;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#b8b6b7';
	ctx.font = '800 92px Unbounded';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('URZUS', 256, 84);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
};

export type ChairHighlight = {
	neck: number;
	lumbar: number;
	dim: number;
};

export const ChairModel: React.FC<{
	highlight: ChairHighlight;
	pulse: number;
	position: [number, number, number];
	rotationY: number;
}> = ({highlight, pulse, position, rotationY}) => {
	const geo = useMemo(
		() => ({
			seat: new RoundedBoxGeometry(0.54, 0.1, 0.5, 4, 0.04),
			bolster: new RoundedBoxGeometry(0.08, 0.1, 0.48, 4, 0.035),
			back: new RoundedBoxGeometry(0.5, 0.86, 0.09, 4, 0.04),
			wing: new RoundedBoxGeometry(0.08, 0.62, 0.12, 4, 0.035),
			head: new RoundedBoxGeometry(0.34, 0.2, 0.09, 4, 0.04),
			neck: new RoundedBoxGeometry(0.3, 0.12, 0.08, 6, 0.05),
			armPad: new RoundedBoxGeometry(0.07, 0.035, 0.26, 3, 0.015),
		}),
		[],
	);
	const mats = useMemo(() => {
		const quilt = quiltTexture(3, 5);
		const leather = new THREE.MeshStandardMaterial({map: quilt, roughness: 0.42, metalness: 0.05});
		const plain = new THREE.MeshStandardMaterial({color: C.ink, roughness: 0.45, metalness: 0.05});
		const metal = new THREE.MeshStandardMaterial({color: '#6e6a6c', roughness: 0.25, metalness: 0.9});
		const neck = new THREE.MeshStandardMaterial({color: '#1b191a', roughness: 0.4});
		const lumbar = new THREE.MeshStandardMaterial({color: '#1b191a', roughness: 0.4});
		const logo = new THREE.MeshBasicMaterial({map: logoTexture(), transparent: true});
		return {leather, plain, metal, neck, lumbar, logo};
	}, []);

	const ember = new THREE.Color(C.ember);
	const glow = (v: number) => v * (0.75 + 0.45 * pulse);
	mats.neck.emissive = ember;
	mats.neck.emissiveIntensity = glow(highlight.neck);
	mats.lumbar.emissive = ember;
	mats.lumbar.emissiveIntensity = glow(highlight.lumbar);
	const dimColor = new THREE.Color('#ffffff').lerp(new THREE.Color('#5a5a5a'), highlight.dim);
	mats.leather.color = dimColor;
	mats.plain.color = new THREE.Color(C.ink).lerp(new THREE.Color('#080808'), highlight.dim);

	const legs = [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2);
	return (
		<group position={position} rotation={[0, rotationY, 0]}>
			{/* five-star base + casters */}
			{legs.map((a) => (
				<group key={a} rotation={[0, a, 0]}>
					<mesh position={[0, 0.09, 0.17]} material={mats.plain} castShadow>
						<boxGeometry args={[0.05, 0.035, 0.34]} />
					</mesh>
					<mesh position={[0, 0.035, 0.33]} rotation={[0, 0, Math.PI / 2]} material={mats.plain} castShadow>
						<cylinderGeometry args={[0.032, 0.032, 0.04, 16]} />
					</mesh>
				</group>
			))}
			{/* gas lift */}
			<mesh position={[0, 0.2, 0]} material={mats.plain} castShadow>
				<cylinderGeometry args={[0.042, 0.05, 0.2, 20]} />
			</mesh>
			<mesh position={[0, 0.35, 0]} material={mats.metal} castShadow>
				<cylinderGeometry args={[0.026, 0.026, 0.16, 20]} />
			</mesh>
			{/* seat */}
			<mesh geometry={geo.seat} material={mats.leather} position={[0, 0.48, 0]} castShadow receiveShadow />
			<mesh geometry={geo.bolster} material={mats.plain} position={[-0.25, 0.53, 0]} castShadow />
			<mesh geometry={geo.bolster} material={mats.plain} position={[0.25, 0.53, 0]} castShadow />
			{/* armrests */}
			{[-1, 1].map((sx) => (
				<group key={sx}>
					<mesh position={[sx * 0.31, 0.6, -0.02]} material={mats.plain} castShadow>
						<boxGeometry args={[0.035, 0.22, 0.05]} />
					</mesh>
					<mesh geometry={geo.armPad} material={mats.plain} position={[sx * 0.31, 0.72, 0.02]} castShadow />
				</group>
			))}
			{/* backrest, reclined a little */}
			<group position={[0, 0.52, -0.24]} rotation={[-0.14, 0, 0]}>
				<mesh geometry={geo.back} material={mats.leather} position={[0, 0.45, 0]} castShadow receiveShadow />
				<mesh geometry={geo.wing} material={mats.plain} position={[-0.24, 0.36, 0.03]} castShadow />
				<mesh geometry={geo.wing} material={mats.plain} position={[0.24, 0.36, 0.03]} castShadow />
				<mesh geometry={geo.head} material={mats.leather} position={[0, 0.94, 0]} castShadow />
				{/* neck pillow with URZUS lettering */}
				<mesh geometry={geo.neck} material={mats.neck} position={[0, 0.76, 0.08]} castShadow />
				<mesh material={mats.logo} position={[0, 0.76, 0.121]}>
					<planeGeometry args={[0.22, 0.07]} />
				</mesh>
				{/* lumbar roll */}
				<mesh material={mats.lumbar} position={[0, 0.2, 0.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
					<capsuleGeometry args={[0.06, 0.26, 8, 20]} />
				</mesh>
			</group>
		</group>
	);
};
