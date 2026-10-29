import {Composition} from 'remotion';
import edl from './edl.json';
import {Video} from './Video';

export const Root: React.FC = () => {
	return (
		<Composition
			id="UrsusReels"
			component={Video}
			durationInFrames={edl.duration}
			fps={edl.fps}
			width={edl.width}
			height={edl.height}
		/>
	);
};
