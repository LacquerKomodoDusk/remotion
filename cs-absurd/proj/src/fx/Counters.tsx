import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, clamp, FONT_SUB, pop} from '../design/tokens';

export type CounterData = {visible: number[][]; shots: number[]; until: number; hideFrom: number};

// Live, factual counters driven by source time (frozen during stop-frames and 3D inserts)
export const Counters: React.FC<{data: CounterData; srcAt: (f: number) => number; hidden: boolean}> = ({data, srcAt, hidden}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (frame >= data.hideFrom || hidden) {
		return null;
	}
	const t = Math.min(srcAt(frame), data.until);
	const seen = data.visible.reduce((acc, [a, b]) => acc + Math.max(0, Math.min(t, b) - a), 0);
	const onScreen = data.visible.some(([a, b]) => t >= a && t < b);
	const shots = data.shots.filter((s) => t >= s).length;
	const lastShot = [...data.shots].reverse().find((s) => t >= s);
	const bump = lastShot !== undefined ? 1 + 0.25 * Math.exp(-(t - lastShot) * 8) : 1;
	const a = pop(frame, fps, 6);
	const Box: React.FC<{label: string; value: string; hot: boolean; scale: number}> = ({label, value, hot, scale}) => (
		<div
			style={{
				background: 'rgba(10,14,20,0.82)',
				border: `4px solid ${hot ? C.red : 'rgba(255,255,255,0.25)'}`,
				borderRadius: 14,
				padding: '10px 18px 8px',
				minWidth: 300,
				transform: `scale(${scale})`,
			}}
		>
			<div style={{fontFamily: FONT_SUB, fontWeight: 900, fontSize: 24, letterSpacing: '0.12em', color: hot ? C.red : '#9fb3c8'}}>{label}</div>
			<div style={{fontFamily: FONT_SUB, fontWeight: 900, fontSize: 62, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1.05}}>{value}</div>
		</div>
	);
	return (
		<div style={{position: 'absolute', left: 50, top: 720, display: 'flex', gap: 18, transform: `scale(${a})`, transformOrigin: 'left top'}}>
			<Box label={onScreen ? '● ВРАГ В КАДРЕ' : 'ВРАГ В КАДРЕ'} value={`${seen.toFixed(1).replace('.', ',')} с`} hot={onScreen} scale={1} />
			<Box label="ЕГО ВЫСТРЕЛОВ" value={String(shots)} hot={shots > 0} scale={bump} />
		</div>
	);
};

export const Summary: React.FC<{from: number; rows: string[][]}> = ({from, rows}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (frame < from) {
		return null;
	}
	return (
		<div style={{position: 'absolute', left: 60, right: 140, top: 560, background: 'rgba(10,14,20,0.88)', borderRadius: 22, padding: '30px 34px', border: '3px solid rgba(255,255,255,0.15)'}}>
			<div style={{fontFamily: FONT_SUB, fontWeight: 900, fontSize: 34, letterSpacing: '0.2em', color: C.yellow, marginBottom: 18}}>ПРОТОКОЛ</div>
			{rows.map(([k, v], i) => {
				const a = pop(frame, fps, from + 6 + i * 9);
				return (
					<div
						key={k}
						style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20, padding: '10px 0', borderTop: i ? '2px solid rgba(255,255,255,0.1)' : 'none', opacity: interpolate(a, [0, 0.4], [0, 1], clamp), transform: `translateX(${(1 - a) * 40}px)`}}
					>
						<span style={{fontFamily: FONT_SUB, fontWeight: 900, fontSize: 34, color: '#9fb3c8'}}>{k}</span>
						<span style={{fontFamily: FONT_SUB, fontWeight: 900, fontSize: 52, color: i === rows.length - 1 ? '#FF9A3C' : '#fff'}}>{v}</span>
					</div>
				);
			})}
		</div>
	);
};
