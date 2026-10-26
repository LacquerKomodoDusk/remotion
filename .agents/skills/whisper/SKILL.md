---
name: whisper
description: Transcribe speech from a video or audio file locally with whisper.cpp and get word-level timestamps as Remotion Caption JSON. Use when asked to transcribe, get subtitles/captions, find timecodes of phrases, or check speech for profanity (e.g. to bleep it), including in sandboxes where Hugging Face is blocked.
---

# Whisper (whisper.cpp, offline)

Builds the official `ggml-org/whisper.cpp` from GitHub, obtains a ggml model and transcribes with one-word segments, so every word gets its own timestamps.

## 1. Setup (once per container)

```bash
bash .agents/skills/whisper/scripts/setup.sh [model]   # model: small (default), tiny, base, medium, large-v3-turbo, large-v3
```

- Builds `whisper-cli` into `~/.cache/whisper-skill/whisper.cpp/build/bin/` (needs `git`, `cmake`, `g++`).
- Puts the model at `~/.cache/whisper-skill/models/ggml-<model>.bin`.
- Model sources, in order: `$WHISPER_MODEL_PATH` (a file the user provided) → cache → Hugging Face `ggerganov/whisper.cpp` → GitHub release mirrors listed in `setup.sh`.
- **Every model file is checked against the SHA1 from the official `whisper.cpp/models/README.md`.** A mismatch deletes the file and the script fails. Never skip this check: mirrors are third-party.
- If no source is reachable, ask the user to upload `ggml-<model>.bin` and rerun with `WHISPER_MODEL_PATH=<file>`.

For Russian, use `small` or larger. `tiny`/`base` garble shouting and slang.

## 2. Transcribe

```bash
bash .agents/skills/whisper/scripts/transcribe.sh <input.mp4|mov|wav> <out.json> [lang=ru] [model=small]
```

Writes `<out.json>`:

```json
{
  "language": "ru",
  "model": "small",
  "text": "full transcript",
  "captions": [
    {"text": " Слово", "startMs": 120, "endMs": 410, "timestampMs": 265, "confidence": 0.93}
  ]
}
```

`captions` follows Remotion's `Caption` type (`@remotion/captions`), so it plugs straight into `createTikTokStyleCaptions()`. Each `text` keeps its leading space, as Remotion expects.

## 3. Refine timestamps (needed for short clips, shouting, game/music under voice)

On noisy audio whisper.cpp often falls back to coarse 2 s chunks and spreads words evenly across them, and `-dtw` does not help. Check: if many `startMs` are multiples of 2000, the timings are fake. Then:

1. **Locate:** transcribe 1.5 s windows with a 0.5 s hop (`ffmpeg -ss S -t 1.5 … -af apad=pad_dur=1`, then `whisper-cli -nt -np`). A word belongs to the overlap of the windows that hear it.
2. **Snap:** inside that range, take the 50 ms RMS envelope in the speech band (`highpass=f=300,lowpass=f=3000,asetnsamples=800,astats=metadata=1:reset=1`). The word is the burst that rises 10+ dB above its neighbours.
3. Write the corrected words by hand into the JSON. Mark unclear stretches as `[неразборчиво]` instead of guessing.

## 4. Check the result

- Whisper hallucinates on silence and music ("Продолжение следует…", "Субтитры сделал…"). Drop words whose time range is silent (check RMS) and words with `confidence` < 0.3, and say so to the user.
- Shouts and laughter are often transcribed badly or skipped. Show the transcript to the user before building captions on it.
- **Profanity check:** read through `captions` for swear words (including partially recognized ones). Bleeping uses each word's `startMs`/`endMs`, padded by ±40 ms.
