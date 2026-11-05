import {Composition} from 'remotion';
import {Main} from './Main';
import data from './data.json';
export const RemotionRoot: React.FC = () => (
	<Composition id="Short" component={Main} width={1080} height={1920} fps={60} durationInFrames={Math.floor(data.timemap.total * 60)} />
);
