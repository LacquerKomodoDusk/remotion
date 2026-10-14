import rawConfig from '../../config.json';

export type Config = typeof rawConfig;
export const config: Config = rawConfig;
