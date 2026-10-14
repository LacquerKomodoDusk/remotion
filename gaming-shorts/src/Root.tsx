import {getStaticFiles} from '@remotion/studio';
import React from 'react';
import {Composition} from 'remotion';
import {config} from './lib/config';
import {compositionIdForClip} from './lib/ids';
import {calculateShortMetadata, Short} from './Short';

export const RemotionRoot: React.FC = () => {
	const clips = getStaticFiles()
		.map((f) => /^([^/\\]+)[/\\]data\.json$/.exec(f.name)?.[1])
		.filter((c): c is string => Boolean(c));

	return (
		<>
			{clips.map((clip) => (
				<Composition
					key={clip}
					id={compositionIdForClip(clip)}
					component={Short}
					durationInFrames={1}
					fps={config.composition.fps}
					width={config.composition.width}
					height={config.composition.height}
					defaultProps={{clip, data: null, analysis: null, assets: null}}
					calculateMetadata={calculateShortMetadata}
				/>
			))}
		</>
	);
};
