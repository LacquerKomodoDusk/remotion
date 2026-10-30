import {AbsoluteFill, Freeze, OffthreadVideo, staticFile} from 'remotion';

const GAME = staticFile('game.mp4');
// source layout scaled to 1080x1920: webcam is y 0..677, gameplay 677..1920
export const SEAM = 677;
const FACE: [number, number] = [461, 323];

export type LayoutKind = 'split' | 'webcam-full' | 'game-full';

const Video: React.FC<{src: number}> = ({src}) => (
	<OffthreadVideo src={GAME} startFrom={Math.round(src * 30)} muted style={{width: 1080, height: 1920}} />
);

// `zoom` and `focus` apply to the gameplay half only, the webcam stays put
export const Layout: React.FC<{kind: LayoutKind; src: number; zoom: number; focus: [number, number]; freeze: boolean}> = ({
	kind,
	src,
	zoom,
	focus,
	freeze,
}) => {
	const v = freeze ? (
		<Freeze frame={0}>
			<Video src={src} />
		</Freeze>
	) : (
		<Video src={src} />
	);
	if (kind === 'webcam-full') {
		const s = 2.1 * zoom;
		const tx = 540 - FACE[0] * s;
		const ty = 760 - FACE[1] * s;
		return (
			<AbsoluteFill style={{overflow: 'hidden', background: '#141210'}}>
				<AbsoluteFill style={{transform: `translate(${540 - FACE[0] * 3.4}px, 0px) scale(3.4)`, transformOrigin: '0 0', filter: 'blur(28px) brightness(0.6)'}}>
					{v}
				</AbsoluteFill>
				<AbsoluteFill
					style={{
						transform: `translate(${tx}px, ${ty}px) scale(${s})`,
						transformOrigin: '0 0',
						clipPath: `inset(0 0 ${1920 - SEAM}px 0)`,
						// fade out above the channel logo that sits on the seam
						WebkitMaskImage: 'linear-gradient(180deg, #000 0px, #000 470px, transparent 560px)',
					}}
				>
					{v}
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}
	if (kind === 'game-full') {
		const s = (1920 / (1920 - SEAM)) * zoom;
		return (
			<AbsoluteFill style={{overflow: 'hidden'}}>
				<AbsoluteFill style={{transform: `translate(${(1080 - 1080 * s) / 2}px, ${-SEAM * s}px) scale(${s})`, transformOrigin: '0 0'}}>{v}</AbsoluteFill>
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
