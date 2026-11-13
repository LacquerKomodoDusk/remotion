import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {interpolate, spring} from 'remotion';
import * as THREE from 'three';
import {NAVY} from './theme';

// Cartoon 3D props for the punchlines (v9–v12): glossy toon materials + back-face navy outline,
// same look as the brand outline on the subtitles.
const U = 1920 / (2 * 10 * Math.tan((30 / 2) * (Math.PI / 180))); // px per world unit at z=0
export const px2w = (x: number, y: number): [number, number] => [(x - 540) / U, (960 - y) / U];

const O: React.FC<{geo: THREE.BufferGeometry; color: string; pos?: [number, number, number]; rot?: [number, number, number]; scale?: number | [number, number, number]; metal?: number; rough?: number; emissive?: string; flat?: boolean; line?: number; side?: THREE.Side}> = ({geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, metal = 0.2, rough = 0.3, emissive = '#000000', flat = false, line = 1.08, side = THREE.FrontSide}) => (
	<group position={pos} rotation={rot} scale={scale}>
		<mesh geometry={geo}>
			<meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive} flatShading={flat} side={side} />
		</mesh>
		{line > 1 ? (
			<mesh geometry={geo} scale={line}>
				<meshBasicMaterial color={NAVY} side={THREE.BackSide} />
			</mesh>
		) : null}
	</group>
);

export const Stage: React.FC<{children: React.ReactNode}> = ({children}) => (
	<div style={{position: 'absolute', inset: 0}}>
		<ThreeCanvas width={1080} height={1920} camera={{fov: 30, position: [0, 0, 10]}} gl={{antialias: true, alpha: true}}>
			<ambientLight intensity={0.95} />
			<directionalLight position={[3, 4, 6]} intensity={2.4} />
			<directionalLight position={[-4, 1, -3]} intensity={1.4} color="#7CC8FF" />
			{children}
		</ThreeCanvas>
	</div>
);

// ---------- v9: low-poly tree + judge's gavel ----------
export const TreeGavel: React.FC<{lf: number; fps: number; hit: number; at: [number, number]}> = ({lf, fps, hit, at}) => {
	const g = useMemo(() => ({
		trunk: new THREE.CylinderGeometry(0.1, 0.16, 0.8, 8),
		c1: new THREE.IcosahedronGeometry(0.42, 0),
		c2: new THREE.IcosahedronGeometry(0.34, 0),
		c3: new THREE.IcosahedronGeometry(0.3, 0),
		ghead: new THREE.CylinderGeometry(0.14, 0.14, 0.5, 20),
		gband: new THREE.CylinderGeometry(0.155, 0.155, 0.06, 20),
		ghandle: new THREE.CylinderGeometry(0.04, 0.05, 0.85, 12),
	}), []);
	const inP = spring({frame: lf, fps, config: {damping: 10, stiffness: 170}});
	const h = lf - hit;
	// gavel swings from raised (-1.1 rad) down onto the tree top at `hit`
	const swing = h < -14 ? -0.9 : h < 0 ? interpolate(h, [-14, -6, 0], [-0.9, -1.1, 0.15], {easing: (x) => x * x}) : 0.15 + Math.sin(h / 2) * 0.12 * Math.exp(-h / 8);
	const gIn = interpolate(h, [-22, -14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const squash = h >= 0 ? 1 - 0.18 * Math.exp(-h / 5) * Math.cos(h / 2) : 1;
	const [x, y] = px2w(at[0], at[1]);
	return (
		<group position={[x, y, 0]} scale={inP * 0.72}>
			<group rotation={[0.15, lf * 0.03, 0]} scale={[2 - squash, squash, 2 - squash]}>
				<O geo={g.trunk} color="#7A4A22" pos={[0, -0.25, 0]} flat />
				<O geo={g.c1} color="#3DBA4E" pos={[0, 0.35, 0]} flat />
				<O geo={g.c2} color="#4FD15E" pos={[-0.28, 0.12, 0.1]} flat />
				<O geo={g.c3} color="#34A845" pos={[0.27, 0.15, -0.05]} flat />
			</group>
			{gIn > 0 ? (
				<group position={[0.85, 0.98, 0.25]} rotation={[0, 0, swing]} scale={gIn * 0.9}>
					<O geo={g.ghandle} color="#8B5A2B" pos={[-0.42, 0, 0]} rot={[0, 0, Math.PI / 2]} />
					<O geo={g.ghead} color="#6B3A1A" pos={[-0.88, 0, 0]} />
					<O geo={g.gband} color="#FFC83D" pos={[-0.88, 0.15, 0]} metal={0.5} />
					<O geo={g.gband} color="#FFC83D" pos={[-0.88, -0.15, 0]} metal={0.5} />
				</group>
			) : null}
		</group>
	);
};

// ---------- v10: one brass cartridge per shot ----------
export const Shells: React.FC<{t: number; fps: number; shots: number[]; promised: number; rowY: number}> = ({t, fps, shots, promised, rowY}) => {
	const g = useMemo(() => ({
		body: new THREE.CylinderGeometry(0.075, 0.075, 0.34, 20),
		tip: new THREE.ConeGeometry(0.075, 0.16, 20),
		rim: new THREE.CylinderGeometry(0.085, 0.085, 0.03, 20),
	}), []);
	const gap = 112;
	return (
		<>
			{shots.map((s, i) => {
				const lf = (t - s) * fps;
				if (lf < 0) return null;
				const p = spring({frame: lf, fps, config: {damping: 9, stiffness: 180}});
				const extra = i >= promised;
				const [x, y] = px2w(459 + (i - (shots.length - 1) / 2) * gap, rowY);
				return (
					<group key={i} position={[x, y + (1 - p) * 1.2, 0]} rotation={[0.25, (1 - p) * 6 + t * 1.2 + i, (1 - p) * 2 + 0.12]} scale={1.25}>
						<O geo={g.body} color={extra ? '#E8322B' : '#E2A93B'} metal={0.55} rough={0.25} />
						<O geo={g.tip} color={extra ? '#8E1C16' : '#B8642E'} pos={[0, 0.25, 0]} metal={0.55} rough={0.25} />
						<O geo={g.rim} color={extra ? '#C42A23' : '#C98F2A'} pos={[0, -0.18, 0]} metal={0.55} rough={0.25} />
					</group>
				);
			})}
		</>
	);
};

// ---------- v11: swinging chandelier ----------
export const Chandelier: React.FC<{lf: number; fps: number; at: [number, number]}> = ({lf, fps, at}) => {
	const g = useMemo(() => ({
		ring: new THREE.TorusGeometry(0.55, 0.05, 12, 48),
		ring2: new THREE.TorusGeometry(0.3, 0.04, 12, 40),
		ball: new THREE.SphereGeometry(0.16, 24, 16),
		drop: new THREE.OctahedronGeometry(0.07, 0),
		candle: new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10),
		flame: new THREE.ConeGeometry(0.035, 0.1, 10),
		chain: new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6),
	}), []);
	const inP = spring({frame: lf, fps, config: {damping: 12, stiffness: 120}});
	const sw = Math.sin(lf / 11) * 0.28 * Math.exp(-lf / 90) + (1 - inP) * 0.6;
	const [x, y] = px2w(at[0], at[1]);
	const N = 8;
	return (
		<group position={[x, y + (1 - inP) * 2.4 + 0.45, 0]} rotation={[0, 0, sw]} scale={0.8}>
			<O geo={g.chain} color="#C9A43B" pos={[0, 0, 0]} metal={0.6} />
			<group position={[0, -0.5, 0]} rotation={[0.18, lf * 0.02, 0]}>
				<O geo={g.ball} color="#FFC83D" metal={0.55} rough={0.25} />
				<O geo={g.ring} color="#FFC83D" pos={[0, -0.05, 0]} rot={[Math.PI / 2, 0, 0]} metal={0.55} rough={0.25} />
				<O geo={g.ring2} color="#FFC83D" pos={[0, -0.22, 0]} rot={[Math.PI / 2, 0, 0]} metal={0.55} rough={0.25} />
				{Array.from({length: N}).map((_, i) => {
					const a = (i / N) * Math.PI * 2;
					const cx = Math.cos(a) * 0.55;
					const cz = Math.sin(a) * 0.55;
					const fl = 1 + Math.sin(lf / 2.3 + i * 1.7) * 0.15;
					return (
						<group key={i}>
							<O geo={g.candle} color="#FFF6E6" pos={[cx, 0.06, cz]} />
							<mesh geometry={g.flame} position={[cx, 0.2, cz]} scale={[1, fl, 1]}>
								<meshBasicMaterial color="#FFD23F" />
							</mesh>
							<O geo={g.drop} color="#BFE8FF" pos={[Math.cos(a + 0.4) * 0.3, -0.33, Math.sin(a + 0.4) * 0.3]} metal={0.1} rough={0.05} />
						</group>
					);
				})}
			</group>
		</group>
	);
};

// ---------- v12: spinning gold trophy cup ----------
export const Cup: React.FC<{lf: number; fps: number; at: [number, number]}> = ({lf, fps, at}) => {
	const g = useMemo(() => {
		const prof = [[0.0, 0.0], [0.3, 0.0], [0.32, 0.05], [0.13, 0.14], [0.07, 0.3], [0.07, 0.5], [0.16, 0.6], [0.0, 0.62]].map(([r, h]) => new THREE.Vector2(r, h));
		const bowl = [[0.0, 0.0], [0.08, 0.0], [0.3, 0.08], [0.46, 0.3], [0.52, 0.62], [0.54, 0.66], [0.5, 0.66], [0.47, 0.34], [0.0, 0.3]].map(([r, h]) => new THREE.Vector2(r, h));
		return {
			stem: new THREE.LatheGeometry(prof, 40),
			bowl: new THREE.LatheGeometry(bowl, 48),
			handle: new THREE.TorusGeometry(0.2, 0.045, 12, 32, Math.PI * 1.15),
			base: new THREE.BoxGeometry(0.62, 0.18, 0.62),
			star: new THREE.OctahedronGeometry(0.07, 0),
		};
	}, []);
	const inP = spring({frame: lf, fps, config: {damping: 9, stiffness: 150}});
	const [x, y] = px2w(at[0], at[1]);
	const gold = {color: '#FFC83D', metal: 0.15, rough: 0.3, emissive: '#6A4300'};
	return (
		<group position={[x, y - (1 - inP) * 1.5, 0]} scale={inP * 0.6} rotation={[0.28, lf * 0.06 + (1 - inP) * 4, 0]}>
			<O geo={g.base} {...gold} color="#5B2BC8" emissive="#1A0840" pos={[0, -0.71, 0]} />
			<O geo={g.stem} {...gold} pos={[0, -0.62, 0]} side={THREE.DoubleSide} />
			<O geo={g.bowl} {...gold} pos={[0, 0.0, 0]} line={1} side={THREE.DoubleSide} />
			<O geo={g.handle} {...gold} pos={[-0.56, 0.32, 0]} rot={[0, 0, Math.PI * 0.42]} />
			<O geo={g.handle} {...gold} pos={[0.56, 0.32, 0]} rot={[0, Math.PI, Math.PI * 0.42]} />
			{Array.from({length: 6}).map((_, i) => {
				const a = lf * 0.05 + (i / 6) * Math.PI * 2;
				const tw = 0.6 + 0.4 * Math.sin(lf / 3 + i * 2);
				return (
					<mesh key={i} geometry={g.star} position={[Math.cos(a) * 0.95, 0.3 + Math.sin(a * 2) * 0.25, Math.sin(a) * 0.95]} scale={tw}>
						<meshBasicMaterial color="#FFF3B0" />
					</mesh>
				);
			})}
		</group>
	);
};

// ---------- v9: wood splinters per shot + the crowned boss tree ----------
export const Splinters: React.FC<{t: number; fps: number; hits: number[]; at: [number, number]}> = ({t, fps, hits, at}) => {
	const geo = useMemo(() => new THREE.BoxGeometry(0.09, 0.28, 0.06), []);
	const [x, y] = px2w(at[0], at[1]);
	return (
		<>
			{hits.map((h, k) => {
				const lf = (t - h) * fps;
				if (lf < 0 || lf > 26) return null;
				return Array.from({length: 9}).map((_, i) => {
					const a = i * 2.39 + k * 1.3;
					const sp = 0.045 + ((i * 37) % 10) * 0.004;
					const px = x + Math.cos(a) * sp * lf;
					const py = y + Math.sin(a) * sp * lf * 0.8 + 0.03 * lf - 0.0016 * lf * lf * 1.6;
					const o = Math.max(0, 1 - lf / 26);
					return <O key={`${k}-${i}`} geo={geo} color={i % 3 ? '#C8873E' : '#F2D19A'} pos={[px, py, 0.4]} rot={[lf * 0.4 + i, lf * 0.3, a]} scale={o} line={1.15} flat />;
				});
			})}
		</>
	);
};

export const CrownTree: React.FC<{lf: number; fps: number; at: [number, number]}> = ({lf, fps, at}) => {
	const g = useMemo(() => ({
		trunk: new THREE.CylinderGeometry(0.1, 0.16, 0.8, 8),
		c1: new THREE.IcosahedronGeometry(0.42, 0),
		c2: new THREE.IcosahedronGeometry(0.34, 0),
		c3: new THREE.IcosahedronGeometry(0.3, 0),
		band: new THREE.CylinderGeometry(0.26, 0.24, 0.12, 24, 1, true),
		spike: new THREE.ConeGeometry(0.06, 0.18, 4),
		gem: new THREE.OctahedronGeometry(0.05, 0),
	}), []);
	const inP = spring({frame: lf, fps, config: {damping: 10, stiffness: 160}});
	const crownP = spring({frame: lf - 14, fps, config: {damping: 8, stiffness: 200}});
	const [x, y] = px2w(at[0], at[1]);
	const gold = {color: '#FFC83D', metal: 0.2, rough: 0.3, emissive: '#5A3A00'};
	return (
		<group position={[x, y, 0]} scale={inP * 0.8} rotation={[0.12, lf * 0.035, 0]}>
			<O geo={g.trunk} color="#7A4A22" pos={[0, -0.25, 0]} flat />
			<O geo={g.c1} color="#3DBA4E" pos={[0, 0.35, 0]} flat />
			<O geo={g.c2} color="#4FD15E" pos={[-0.28, 0.12, 0.1]} flat />
			<O geo={g.c3} color="#34A845" pos={[0.27, 0.15, -0.05]} flat />
			<group position={[0, 0.82 + (1 - crownP) * 1.4, 0]} rotation={[0.2, 0, 0.12]}>
				<O geo={g.band} {...gold} side={THREE.DoubleSide} />
				{Array.from({length: 6}).map((_, i) => {
					const a = (i / 6) * Math.PI * 2;
					return <O key={i} geo={g.spike} {...gold} pos={[Math.cos(a) * 0.23, 0.13, Math.sin(a) * 0.23]} />;
				})}
				<O geo={g.gem} color="#FF3B3B" pos={[0, 0, 0.26]} emissive="#400000" />
			</group>
		</group>
	);
};

// ---------- v11: velvet curtains + thrown flowers ----------
export const Curtains: React.FC<{open: number}> = ({open}) => {
	const geo = useMemo(() => {
		const g = new THREE.PlaneGeometry(1.75, 5.8, 40, 1);
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.06);
		g.computeVertexNormals();
		return g;
	}, []);
	const val = useMemo(() => new THREE.BoxGeometry(3.4, 0.42, 0.2), []);
	const trim = useMemo(() => new THREE.BoxGeometry(3.4, 0.06, 0.22), []);
	// open 0 = closed (meeting in the middle), 1 = fully out of frame
	const off = open * 1.65;
	const velvet = {color: '#9E1027', rough: 0.75, metal: 0.05, emissive: '#2A0008'};
	return (
		<>
			<group position={[-0.86 - off, 0, 1]} rotation={[0, 0.05, 0]}><O geo={geo} {...velvet} line={1} side={THREE.DoubleSide} /></group>
			<group position={[0.86 + off, 0, 1]} rotation={[0, -0.05, 0]}><O geo={geo} {...velvet} line={1} side={THREE.DoubleSide} /></group>
			<group position={[0, 2.55 + open * 0.5, 1.2]}>
				<O geo={val} {...velvet} line={1} />
				<O geo={trim} color="#FFC83D" metal={0.3} emissive="#5A3A00" pos={[0, -0.22, 0]} line={1} />
			</group>
		</>
	);
};

export const Flowers: React.FC<{lf: number; n: number}> = ({lf, n}) => {
	const g = useMemo(() => ({head: new THREE.IcosahedronGeometry(0.07, 0), stem: new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6)}), []);
	if (lf < 0) return null;
	return (
		<>
			{Array.from({length: n}).map((_, i) => {
				const d = (i % 7) * 3;
				const l = lf - d;
				if (l < 0) return null;
				const x = -1.3 + ((i * 53) % 100) / 100 * 2.6;
				const y = 2.9 - l * (0.045 + (i % 4) * 0.008);
				if (y < -2.8) return null;
				return (
					<group key={i} position={[x + Math.sin(l / 9 + i) * 0.15, y, 0.5]} rotation={[l * 0.08 + i, l * 0.05, l * 0.11 + i]}>
						<O geo={g.head} color={i % 3 === 0 ? '#FFD23F' : '#FF3B5C'} pos={[0, 0.16, 0]} flat />
						<O geo={g.stem} color="#3DBA4E" line={1.3} />
					</group>
				);
			})}
		</>
	);
};

// ---------- v12: the house with its residents ----------
export const House: React.FC<{t: number; fps: number; out: number[]; extra: number; at: [number, number]; scale: number; inAt: number; scary?: number}> = ({t, fps, out, extra, at, scale, inAt, scary = 0}) => {
	const g = useMemo(() => ({
		body: new THREE.BoxGeometry(1.0, 0.72, 0.8),
		roof: (() => {
			const sh = new THREE.Shape();
			sh.moveTo(-0.62, 0);
			sh.lineTo(0.62, 0);
			sh.lineTo(0, 0.5);
			sh.closePath();
			const g = new THREE.ExtrudeGeometry(sh, {depth: 0.9, bevelEnabled: false});
			g.translate(0, 0, -0.45);
			return g;
		})(),
		door: new THREE.BoxGeometry(0.2, 0.34, 0.04),
		win: new THREE.BoxGeometry(0.2, 0.18, 0.04),
		chim: new THREE.BoxGeometry(0.16, 0.36, 0.16),
		body2: new THREE.CapsuleGeometry(0.08, 0.14, 6, 12),
		head: new THREE.SphereGeometry(0.08, 16, 12),
	}), []);
	const lf = (t - inAt) * fps;
	const inP = spring({frame: lf, fps, config: {damping: 10, stiffness: 170}});
	const [x, y] = px2w(at[0], at[1]);
	const lastPop = [...out, extra].filter((o) => t >= o).sort((a, b) => b - a)[0] ?? -9;
	const shake = Math.sin((t - lastPop) * 70) * 0.06 * Math.max(0, 1 - (t - lastPop) * 4);
	const fig = (k: number, home: [number, number, number], leave: number, color: string) => {
		const l = (t - leave) * fps;
		if (l > 40) return null;
		const fly = l > 0 ? l : 0;
		const appear = k === 3 ? spring({frame: (t - leave + 0.35) * fps, fps, config: {damping: 9, stiffness: 220}}) : 1;
		if (k === 3 && t < leave - 0.35) return null;
		return (
			<group key={k} position={[home[0] + fly * 0.035 * (k % 2 ? 1 : -1), home[1] + fly * 0.06 - fly * fly * 0.0012 + (k === 3 ? (appear - 1) * 0.3 : 0), home[2] + fly * 0.02]} rotation={[0, 0, fly * 0.25]} scale={Math.max(0, 1 - fly / 40) * appear}>
				<O geo={g.body2} color={color} />
				<O geo={g.head} color={color} pos={[0, 0.2, 0]} />
			</group>
		);
	};
	return (
		<group position={[x + shake, y, 0]} scale={inP * scale} rotation={[0.25, -0.5 + Math.sin(t * 0.8) * 0.12, 0]}>
			<O geo={g.body} color={scary > 0.5 ? '#3A3F4A' : '#F2EEE3'} />
			<O geo={g.roof} color="#E8322B" pos={[0, 0.36, 0]} line={1.06} />
			<O geo={g.chim} color="#B9C0CC" pos={[0.28, 0.82, 0.12]} />
			<O geo={g.door} color={scary > 0.5 ? '#000000' : '#7A4A22'} pos={[0, -0.19, 0.41]} />
			<O geo={g.win} color={scary > 0.5 ? '#FF0000' : '#FFD23F'} emissive={scary > 0.5 ? '#FF2020' : '#806000'} pos={[-0.3, 0.1, 0.41]} />
			<O geo={g.win} color={scary > 0.5 ? '#FF0000' : '#FFD23F'} emissive={scary > 0.5 ? '#FF2020' : '#806000'} pos={[0.3, 0.1, 0.41]} />
			{scary > 0.5 ? null : fig(0, [-0.3, -0.24, 0.62], out[0], '#FF3B3B')}
			{scary > 0.5 ? null : fig(1, [0.0, -0.24, 0.72], out[1], '#FF3B3B')}
			{scary > 0.5 ? null : fig(2, [0.3, -0.24, 0.62], out[2], '#FF3B3B')}
			{fig(3, [0.28, 1.12, 0.12], extra, '#B69CFF')}
		</group>
	);
};

// ---------- v12: generic gamepad (no brand shapes) for the «PlayStation?» line ----------
export const Pad: React.FC<{lf: number; fps: number; at: [number, number]; shake: number}> = ({lf, fps, at, shake}) => {
	const g = useMemo(() => ({
		body: new THREE.BoxGeometry(1.1, 0.42, 0.26),
		grip: new THREE.SphereGeometry(0.26, 24, 16),
		dpad: new THREE.BoxGeometry(0.2, 0.06, 0.06),
		btn: new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16),
		stick: new THREE.CylinderGeometry(0.075, 0.06, 0.08, 20),
	}), []);
	if (lf < 0) return null;
	const p = spring({frame: lf, fps, config: {damping: 9, stiffness: 170}});
	const [x, y] = px2w(at[0], at[1]);
	const sh = Math.sin(lf * 1.7) * 0.05 * shake;
	return (
		<group position={[x + sh, y, 0]} scale={p * 0.85} rotation={[0.55 + Math.sin(lf / 20) * 0.08, (1 - p) * 5 + Math.sin(lf / 25) * 0.35, sh * 2]}>
			<O geo={g.body} color="#2B2F3A" rough={0.45} />
			<O geo={g.grip} color="#2B2F3A" rough={0.45} pos={[-0.48, -0.12, 0]} scale={[1, 1.15, 0.7]} />
			<O geo={g.grip} color="#2B2F3A" rough={0.45} pos={[0.48, -0.12, 0]} scale={[1, 1.15, 0.7]} />
			<O geo={g.dpad} color="#B9C0CC" pos={[-0.36, 0.05, 0.15]} line={1.12} />
			<O geo={g.dpad} color="#B9C0CC" pos={[-0.36, 0.05, 0.15]} rot={[0, 0, Math.PI / 2]} line={1.12} />
			{[[0.36, 0.13, '#7CFF6B'], [0.36, -0.03, '#FF3B3B'], [0.28, 0.05, '#5AC8FF'], [0.44, 0.05, '#FFD23F']].map(([bx, by, c], i) => (
				<O key={i} geo={g.btn} color={c as string} pos={[bx as number, by as number, 0.15]} rot={[Math.PI / 2, 0, 0]} emissive="#202020" line={1.15} />
			))}
			<O geo={g.stick} color="#11141B" pos={[-0.17, -0.12, 0.16]} rot={[Math.PI / 2, 0, 0]} />
			<O geo={g.stick} color="#11141B" pos={[0.17, -0.12, 0.16]} rot={[Math.PI / 2, 0, 0]} />
		</group>
	);
};

// ---------- v13: oni mask ----------
export const OniMask: React.FC<{lf: number; fps: number; at: [number, number]; flip: number; scale: number}> = ({lf, fps, at, flip, scale}) => {
	const g = useMemo(() => ({
		face: new THREE.SphereGeometry(0.5, 32, 24),
		horn: new THREE.ConeGeometry(0.09, 0.42, 16),
		eye: new THREE.BoxGeometry(0.22, 0.07, 0.08),
		brow: new THREE.BoxGeometry(0.26, 0.06, 0.08),
		tooth: new THREE.ConeGeometry(0.05, 0.14, 4),
	}), []);
	if (lf < 0) return null;
	const p = spring({frame: lf, fps, config: {damping: 9, stiffness: 180}});
	const fp = spring({frame: lf - flip, fps, config: {damping: 10, stiffness: 160}});
	const voidMode = lf >= flip;
	const col = voidMode ? '#6B2BD8' : '#E8322B';
	const [x, y] = px2w(at[0], at[1]);
	return (
		<group position={[x, y, 0]} scale={p * scale} rotation={[0.1, (1 - p) * 4 + fp * Math.PI * 2 + Math.sin(lf / 18) * 0.25, Math.sin(lf / 23) * 0.08]}>
			<O geo={g.face} color={col} emissive={voidMode ? '#220044' : '#300000'} scale={[1, 1.12, 0.55]} />
			<O geo={g.horn} color="#F4F1E8" pos={[-0.3, 0.6, 0]} rot={[0, 0, 0.35]} />
			<O geo={g.horn} color="#F4F1E8" pos={[0.3, 0.6, 0]} rot={[0, 0, -0.35]} />
			<O geo={g.brow} color="#11141B" pos={[-0.19, 0.2, 0.27]} rot={[0, 0, -0.35]} line={1} />
			<O geo={g.brow} color="#11141B" pos={[0.19, 0.2, 0.27]} rot={[0, 0, 0.35]} line={1} />
			<mesh geometry={g.eye} position={[-0.18, 0.08, 0.28]}><meshBasicMaterial color={voidMode ? '#C9A2FF' : '#FFD23F'} /></mesh>
			<mesh geometry={g.eye} position={[0.18, 0.08, 0.28]}><meshBasicMaterial color={voidMode ? '#C9A2FF' : '#FFD23F'} /></mesh>
			{[-0.16, -0.05, 0.05, 0.16].map((tx, i) => <O key={i} geo={g.tooth} color="#FFFFFF" pos={[tx, -0.28, 0.26]} rot={[Math.PI, 0, 0]} line={1.05} />)}
		</group>
	);
};

// ---------- v14: vinyl record + notes ----------
export const Vinyl: React.FC<{lf: number; fps: number; at: [number, number]; scale: number}> = ({lf, fps, at, scale}) => {
	const g = useMemo(() => ({
		disc: new THREE.CylinderGeometry(0.6, 0.6, 0.04, 48),
		label: new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32),
		groove: new THREE.TorusGeometry(0.42, 0.006, 6, 48),
		head: new THREE.SphereGeometry(0.07, 16, 12),
		stem: new THREE.BoxGeometry(0.025, 0.26, 0.025),
	}), []);
	if (lf < 0) return null;
	const p = spring({frame: lf, fps, config: {damping: 8, stiffness: 160}});
	const [x, y] = px2w(at[0], at[1]);
	return (
		<group position={[x, y, 0]} scale={p * scale}>
			<group rotation={[1.1, 0, (lf / 8) % (Math.PI * 2)]}>
				<O geo={g.disc} color="#15171E" rough={0.25} metal={0.3} />
				<O geo={g.label} color="#FF3B5C" emissive="#300010" line={1} />
				<mesh geometry={g.groove} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><meshBasicMaterial color="#3A3F4A" /></mesh>
				<mesh geometry={g.groove} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} scale={0.8}><meshBasicMaterial color="#3A3F4A" /></mesh>
			</group>
			{[0, 1, 2].map((i) => {
				const l = (lf + i * 14) % 42;
				return (
					<group key={i} position={[(i - 1) * 0.45, 0.45 + l * 0.02, 0.2]} scale={Math.sin((l / 42) * Math.PI)} rotation={[0, 0, Math.sin(l / 6) * 0.3]}>
						<O geo={g.head} color="#FFD23F" scale={[1.2, 0.9, 0.9]} />
						<O geo={g.stem} color="#FFD23F" pos={[0.07, 0.13, 0]} />
					</group>
				);
			})}
		</group>
	);
};

// ---------- v16: weather icons (sun / storm cloud / brick wall) ----------
export const Weather: React.FC<{t: number; fps: number; kind: 'sun' | 'storm' | 'wall'; since: number; at: [number, number]; scale: number}> = ({t, fps, kind, since, at, scale}) => {
	const g = useMemo(() => {
		const bolt = new THREE.Shape();
		[[0.05, 0.3], [-0.12, 0.0], [0.0, 0.0], [-0.08, -0.32], [0.14, 0.04], [0.02, 0.04], [0.12, 0.3]].forEach(([bx, by], i) => (i ? bolt.lineTo(bx, by) : bolt.moveTo(bx, by)));
		return {
			sun: new THREE.SphereGeometry(0.32, 32, 24),
			ray: new THREE.ConeGeometry(0.06, 0.2, 8),
			puff: new THREE.SphereGeometry(0.22, 24, 16),
			bolt: new THREE.ExtrudeGeometry(bolt, {depth: 0.06, bevelEnabled: false}),
			brick: new THREE.BoxGeometry(0.3, 0.14, 0.16),
		};
	}, []);
	const lf = (t - since) * fps;
	const p = spring({frame: lf, fps, config: {damping: 9, stiffness: 190}});
	const [x, y] = px2w(at[0], at[1]);
	return (
		<group position={[x, y, 0]} scale={p * scale} rotation={[0.15, Math.sin(t * 1.3) * 0.3, 0]}>
			{kind === 'sun' ? (
				<group rotation={[0, 0, t * 0.8]}>
					<O geo={g.sun} color="#FFC83D" emissive="#7A4A00" />
					{Array.from({length: 8}).map((_, i) => {
						const a = (i / 8) * Math.PI * 2;
						return <O key={i} geo={g.ray} color="#FFD23F" emissive="#5A3A00" pos={[Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0]} rot={[0, 0, a - Math.PI / 2]} />;
					})}
				</group>
			) : null}
			{kind === 'storm' ? (
				<group position={[Math.sin(t * 40) * 0.02 * Math.max(0, 1 - lf / 20), 0, 0]}>
					{[[-0.22, 0.05, 0.9], [0.05, 0.14, 1.15], [0.28, 0.02, 0.85], [0.02, -0.06, 1]].map(([px, py, s2], i) => (
						<O key={i} geo={g.puff} color="#5B6478" pos={[px, py, 0]} scale={s2} />
					))}
					<group position={[0, -0.32 - ((lf % 30) < 4 ? 0.04 : 0), 0.15]} scale={(lf % 30) < 18 ? 1 : 0.0001}>
						<O geo={g.bolt} color="#FFD23F" emissive="#806000" />
					</group>
				</group>
			) : null}
			{kind === 'wall' ? (
				<group position={[0, -0.2, 0]}>
					{Array.from({length: 4}).map((_, r) =>
						Array.from({length: 3}).map((_, c) => {
							const k = r * 3 + c;
							const drop = spring({frame: lf - k * 1.5, fps, config: {damping: 11, stiffness: 220}});
							return <O key={k} geo={g.brick} color={k % 2 ? '#B5512C' : '#C9623A'} pos={[(c - 1) * 0.31 + (r % 2 ? 0.15 : 0), r * 0.15 + (1 - drop) * 0.8, 0]} scale={drop} />;
						}),
					)}
				</group>
			) : null}
		</group>
	);
};
