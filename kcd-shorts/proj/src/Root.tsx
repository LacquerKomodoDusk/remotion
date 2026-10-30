import {Composition} from 'remotion';
import plan from '../data/plan.json';
import {Main} from './Main';

export const Root: React.FC = () => {
	return <Composition id="Main" component={Main} durationInFrames={plan.duration} fps={plan.fps} width={plan.width} height={plan.height} />;
};
