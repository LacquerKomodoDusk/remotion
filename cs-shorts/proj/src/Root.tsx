import {Composition} from 'remotion';
import a from '../data/a.json';
import b from '../data/b.json';
import {Main, Plan} from './Main';

export const Root: React.FC = () => (
	<>
		<Composition id="CsA" component={Main} durationInFrames={a.duration} fps={30} width={1080} height={1920} defaultProps={{plan: a as unknown as Plan, video: 'a.mp4'}} />
		<Composition id="CsB" component={Main} durationInFrames={b.duration} fps={30} width={1080} height={1920} defaultProps={{plan: b as unknown as Plan, video: 'b.mp4'}} />
	</>
);
