import {C} from '../design/tokens';

// Line icons, one stroke style, drawn on with `draw` 0..1
const stroke = (draw: number, len: number) => ({
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 4,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const,
	strokeDasharray: len,
	strokeDashoffset: len * (1 - draw),
});

export const CheckIcon: React.FC<{draw: number; size: number}> = ({draw, size}) => (
	<svg width={size} height={size} viewBox="0 0 48 48" style={{color: C.ember}}>
		<circle cx="24" cy="24" r="20" {...stroke(draw, 126)} />
		<path d="M15 24.5l6 6 12-13" {...stroke(Math.max(0, draw * 1.6 - 0.6), 30)} />
	</svg>
);

export const GiftIcon: React.FC<{draw: number; size: number; color: string}> = ({draw, size, color}) => (
	<svg width={size} height={size} viewBox="0 0 48 48" style={{color}}>
		<path d="M8 20h32v22H8zM5 13h38v7H5zM24 13v29M24 13c-4-8-12-8-12-2 0 2 4 2 12 2M24 13c4-8 12-8 12-2 0 2-4 2-12 2" {...stroke(draw, 260)} />
	</svg>
);

export const BookmarkIcon: React.FC<{draw: number; size: number}> = ({draw, size}) => (
	<svg width={size} height={size} viewBox="0 0 48 48" style={{color: C.ember}}>
		<path d="M13 6h22v36l-11-8-11 8z" {...stroke(draw, 120)} />
	</svg>
);
