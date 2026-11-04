import {Composition} from 'remotion';
import {Edit} from './Edit';
import data from './data.json';
import data2 from './data2.json';
export const Root = () => (
	<>
		<Composition id="Edit" component={Edit} durationInFrames={data.frames} fps={60} width={1080} height={1920} defaultProps={{clip: 'a'}} />
		<Composition id="Edit2" component={Edit} durationInFrames={data2.frames} fps={60} width={1080} height={1920} defaultProps={{clip: 'b'}} />
	</>
);
