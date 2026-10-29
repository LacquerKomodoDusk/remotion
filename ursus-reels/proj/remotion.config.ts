import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(2);
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
