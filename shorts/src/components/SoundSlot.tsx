import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import available from '../available-assets.json';
import {dbToGain} from '../theme';

// Пустое место под звук: если файла нет в assets/ — молчит; появится — подхватится при следующем рендере.
export type SoundSlotSpec = {
	name: string;
	expectedFile: string; // путь относительно assets/, например "quack.wav"
	description: string;
	from: number; // кадр в ролике
	durationInFrames: number;
	volumeDb: number;
};

export const isAssetAvailable = (file: string) => (available as string[]).includes(file);

export const SoundSlot: React.FC<{slot: SoundSlotSpec}> = ({slot}) => {
	if (!isAssetAvailable(slot.expectedFile)) {
		return null;
	}
	return (
		<Sequence from={slot.from} durationInFrames={slot.durationInFrames} layout="none" name={`slot:${slot.name}`}>
			<Audio src={staticFile(`assets/${slot.expectedFile}`)} volume={dbToGain(slot.volumeDb)} />
		</Sequence>
	);
};

// Звук из assets/ или assets/generated/ (готовый файл, не слот)
export const Sfx: React.FC<{file: string; from: number; volumeDb: number}> = ({file, from, volumeDb}) => (
	<Sequence from={from} layout="none" name={`sfx:${file}`}>
		<Audio src={staticFile(`assets/${file}`)} volume={dbToGain(volumeDb)} />
	</Sequence>
);
