import React from 'react';
import {Composition} from 'remotion';
import {Clip1} from './clip1/Clip1';
import {FPS, TOTAL_FRAMES} from './clip1/plan';
import {H, W} from './theme';

export const Root: React.FC = () => (
	<Composition id="clip1" component={Clip1} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
);
