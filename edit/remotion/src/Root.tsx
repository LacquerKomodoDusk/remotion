import {Composition} from 'remotion';
import {Edit} from './Edit';
import data from './data.json';
export const Root = () => (
	<Composition id="Edit" component={Edit} durationInFrames={data.frames} fps={60} width={1080} height={1920} />
);
