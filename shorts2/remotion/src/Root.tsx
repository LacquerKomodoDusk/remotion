import {Composition} from 'remotion';
import {Edit, Cfg} from './Edit';
import c1 from './configs/v1.json';
import c2 from './configs/v2.json';
import c3 from './configs/v3.json';
import c4 from './configs/v4.json';
const all = [c1, c2, c3, c4] as unknown as Cfg[];
export const RemotionRoot: React.FC = () => (
	<>
		{all.map((cfg, i) => (
			<Composition key={i} id={`V${i + 1}`} component={Edit} width={1080} height={1920} fps={60} durationInFrames={Math.round(cfg.dur * 60)} defaultProps={{cfg, video: `v${i + 1}.mp4`}} />
		))}
	</>
);
