import {Composition} from 'remotion';
import {Edit, Cfg} from './Edit';
import c1 from './configs/v1.json';
import c2 from './configs/v2.json';
import c3 from './configs/v3.json';
import c4 from './configs/v4.json';
import c5 from './configs/v5.json';
import c6 from './configs/v6.json';
import c7 from './configs/v7.json';
import c8 from './configs/v8.json';
import c9 from './configs/v9.json';
import c10 from './configs/v10.json';
import c11 from './configs/v11.json';
import c12 from './configs/v12.json';
import c13 from './configs/v13.json';
import c14 from './configs/v14.json';
import c15 from './configs/v15.json';
import c16 from './configs/v16.json';
const all = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16] as unknown as (Cfg & {frames: number})[];
export const RemotionRoot: React.FC = () => (
	<>
		{all.map((cfg, i) => (
			<Composition key={i} id={`V${i + 1}`} component={Edit} width={1080} height={1920} fps={60} durationInFrames={cfg.frames} defaultProps={{cfg, video: `v${i + 1}.mp4`}} />
		))}
	</>
);
