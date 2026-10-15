"""Измеряет громкость звуков (макс. RMS в окне 100 мс, dBFS) для сведения относительно голоса.

python3 scripts/measure_levels.py <папка assets> <voice.wav> <out.json>
Пишет {"voicePeakDb": ..., "assets": {"generated/whoosh_01.wav": -12.3, ...}}.
Звуки в ролике ставятся как «на N dB тише пиков голоса», поэтому SFX не перекрывают речь при любом исходнике.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf


def peak_rms_db(path, active_only=False):
    x, sr = sf.read(path, always_2d=True)
    x = x.mean(axis=1)
    h = int(sr * 0.1)
    rms = np.array([np.sqrt((x[i:i + h] ** 2).mean()) for i in range(0, max(1, len(x) - h), h // 2)])
    if active_only:
        # для голоса: 95-й перцентиль по окнам с речью, чтобы один крик не задавал опору
        db = 20 * np.log10(rms + 1e-9)
        speech = db[db > db.max() - 30]
        return float(np.percentile(speech, 95))
    return float(20 * np.log10(rms.max() + 1e-9))


assets_dir, voice, out = sys.argv[1:4]
levels = {}
for root, _, files in os.walk(assets_dir):
    for f in files:
        if f.lower().endswith(('.wav', '.mp3', '.ogg', '.flac', '.m4a')) and not f.startswith('_'):
            p = os.path.join(root, f)
            try:
                levels[os.path.relpath(p, assets_dir).replace(os.sep, '/')] = round(peak_rms_db(p), 2)
            except Exception as e:  # noqa: BLE001 — непрочитанный файл просто пропускаем
                print('skip', p, e)
data = {'voicePeakDb': round(peak_rms_db(voice, active_only=True), 2), 'assets': dict(sorted(levels.items()))}
with open(out, 'w') as fh:
    json.dump(data, fh, indent=1)
print('voicePeakDb', data['voicePeakDb'], '| assets', len(levels))
