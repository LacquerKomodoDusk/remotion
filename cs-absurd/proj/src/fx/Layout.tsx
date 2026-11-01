import {AbsoluteFill, Freeze, OffthreadVideo, staticFile} from 'remotion';

// 900x1600 sources scaled to 1080x1920: webcam is y 0..612 (channel logo sits on the seam), scoreboard + game below
export const SEAM = 612;
const FACE: [number, number] = [552, 288];

export type LayoutKind = 'split' | 'webcam-full' | 'game-full';

export const Layout: React.FC<{video: string; kind: LayoutKind; src: number; zoom: number; focus: [number, number]; freeze: boolean}> = ({
	video,
	kind,
	src,
	zoom,
	focus,
	freeze,
}) => {
	const raw = <OffthreadVideo src={staticFile(video)} startFrom={Math.round(src * 30)} muted style={{width: 1080, height: 1920}} />;
	const v = freeze ? <Freeze frame={0}>{raw}</Freeze> : raw;
	if (kind === 'webcam-full') {
		const s = 2.15 * zoom;
		return (
			<AbsoluteFill style={{overflow: 'hidden', background: '#141210'}}>
				<AbsoluteFill style={{transform: `translate(${540 - FACE[0] * 3.4}px, 0px) scale(3.4)`, transformOrigin: '0 0', filter: 'blur(28px) brightness(0.55)'}}>
					{v}
				</AbsoluteFill>
				<AbsoluteFill
					style={{
						transform: `translate(${540 - FACE[0] * s}px, ${760 - FACE[1] * s}px) scale(${s})`,
						transformOrigin: '0 0',
						clipPath: `inset(0 0 ${1920 - SEAM}px 0)`,
						WebkitMaskImage: 'linear-gradient(180deg, #000 0px, #000 470px, transparent 540px)',
					}}
				>
					{v}
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}
	if (kind === 'game-full') {
		// gameplay without the scoreboard strip fills the frame
		const top = 700;
		const s = (1920 / (1920 - top)) * zoom;
		return (
			<AbsoluteFill style={{overflow: 'hidden'}}>
				<AbsoluteFill style={{transform: `translate(${(1080 - 1080 * s) / 2}px, ${-top * s}px) scale(${s})`, transformOrigin: '0 0'}}>{v}</AbsoluteFill>
			</AbsoluteFill>
		);
	}
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<AbsoluteFill style={{clipPath: `inset(0 0 ${1920 - SEAM}px 0)`}}>{v}</AbsoluteFill>
			<AbsoluteFill style={{clipPath: `inset(${SEAM}px 0 0 0)`}}>
				<AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: `${focus[0]}px ${focus[1]}px`}}>{v}</AbsoluteFill>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
