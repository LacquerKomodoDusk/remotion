---
name: remotion-google-whisk
description: Generating images and short clips with Google Whisk and using them in Remotion videos
version: 4.0.535
---

[Google Whisk](https://labs.google/fx/tools/whisk) is an experimental Google Labs tool that generates images from reference images instead of long text prompts.
Whisk Animate can turn a generated image into a short video clip.

Whisk has no public API. You cannot generate assets on the user's behalf.
Your job is to plan the assets, write the inputs the user enters in Whisk, and wire the downloaded files into the Remotion project.
Do not automate the Whisk website or scrape it.

## How Whisk works

Whisk takes up to three kinds of reference images:

- **Subject**: what the image is about (a character, a product, an object).
- **Scene**: where the subject is placed (a background, environment).
- **Style**: the visual treatment (illustration, clay, sticker, photo look).

Whisk describes the references with Gemini and generates new images with Imagen.
It captures the essence of a reference, not an exact copy. Faces, logos, text and exact product details may drift.
The user can add a short text prompt and pick an aspect ratio before generating.

Whisk Animate turns a generated image into a short clip (around 8 seconds) using Veo. Availability depends on the user's region and account.

Generated media carries an invisible SynthID watermark. Remind the user to follow Google's terms of use for the generated media.

## Planning the assets

Before asking the user to open Whisk:

1. Read the composition's `width`, `height`, `fps` and `durationInFrames` so the assets match the video.
2. Pick the matching Whisk aspect ratio: landscape (16:9) for 1920x1080, portrait (9:16) for 1080x1920, square (1:1) for 1080x1080.
3. Split the video into scenes and decide for each scene whether it needs a still image or an animated clip.
4. Keep one style reference for the whole video so the scenes look consistent.

Give the user a short brief per asset, for example:

```md
### Scene 2: Product on the beach

- Subject: the user's product photo (`product.png`)
- Scene: a sunny beach at golden hour
- Style: same style reference as all other scenes (`style.png`)
- Prompt: "the bottle standing in the sand, waves in the background"
- Aspect ratio: landscape
- Animate: yes, "slow camera push-in, waves moving"
- Save as: `public/whisk/scene-2.mp4`
```

Don't put text, logos or UI that must be legible into the Whisk image. Whisk may garble them. Render text with Remotion on top of the image instead.

## Adding the files to the project

Ask the user to download the results and put them into the `public/whisk/` folder with the file names from the brief.
Use lowercase names without spaces.

Check that the files exist before referencing them. If a file is missing, ask the user for it instead of inventing one.

## Using a Whisk image

Use `<Img>` and `staticFile()`. Cover the frame and add motion with Remotion, since Whisk images are still.

```tsx
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

export const WhiskScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.1]);

  return (
    <Img
      src={staticFile("whisk/scene-1.png")}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${scale})`,
      }}
    />
  );
};
```

Whisk images may have a lower resolution than the composition. Prefer `objectFit: "cover"` and avoid scaling them far beyond their size.
Use `getImageDimensions()` as described in [images.md](../remotion-markup/images.md) if you need the exact size.

## Using a Whisk Animate clip

Use `<Video>` from `@remotion/media` as described in [embedding-videos.md](../remotion-markup/embedding-videos.md).

```tsx
import {Video} from "@remotion/media";
import {staticFile} from "remotion";

export const WhiskClip: React.FC = () => {
  return (
    <Video
      src={staticFile("whisk/scene-2.mp4")}
      muted
      style={{width: "100%", height: "100%", objectFit: "cover"}}
    />
  );
};
```

Clips are short. Don't make the scene longer than the clip, or use `loop`, slow down with `playbackRate`, or end on a still image.
Use the clip's real duration from [Remotion Multimedia](../remotion-multimedia/SKILL.md) instead of guessing it.

## Combining scenes

Put each Whisk asset into its own scene and connect them with transitions.
See [multi-scene-video.md](../remotion-markup/multi-scene-video.md) and [transitions.md](../remotion-markup/transitions.md).

## Post-creation

After you're done, load this skill: [Remotion Best Practices](../remotion-best-practices/SKILL.md)

If not already done, open the Remotion Studio, unless instructed otherwise.
