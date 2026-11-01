import {Composition} from 'remotion';
import c from '../data/c.json';
import d from '../data/d.json';
import {Card} from './Cards';
import {Main, Plan} from './Main';

export const Root: React.FC = () => (
	<>
		<Composition id="AbsC" component={Main} durationInFrames={c.duration} fps={30} width={1080} height={1920} defaultProps={{plan: c as unknown as Plan, video: 'c.mp4'}} />
		<Composition id="AbsD" component={Main} durationInFrames={d.duration} fps={30} width={1080} height={1920} defaultProps={{plan: d as unknown as Plan, video: 'd.mp4'}} />
		<Composition id="CardIntro" component={Card} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={{kind: 'intro' as const, len: 90}} />
		<Composition id="CardMid" component={Card} durationInFrames={60} fps={30} width={1080} height={1920} defaultProps={{kind: 'mid' as const, len: 60}} />
		<Composition id="CardOutro" component={Card} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={{kind: 'outro' as const, len: 90}} />
	</>
);
