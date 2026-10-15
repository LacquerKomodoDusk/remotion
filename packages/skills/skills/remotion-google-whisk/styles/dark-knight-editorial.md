# Style: Dark Knight Editorial

Dark fantasy and knightcore subjects, photographed like a high-fashion studio editorial.
Lonely hooded figures, knights and gothic castles in fog, lit with one hard light and graded cold.

Use this preset when the user asks for this style by name, or for dark fantasy, knightcore, gothic or moody editorial videos.

## Visual DNA

- **Subjects**: hooded cloaked wanderers, knights in plate armor or chainmail coifs, skeleton warriors, lone riders, gothic cathedrals and castle silhouettes, swords stuck in the ground.
- **Composition**: one small figure against a huge environment, often seen from behind. Or a tight editorial portrait with the face partly hidden (coif, helmet, shadow, hand, motion blur). Lots of negative space.
- **Light**: a single hard light source. Deep crushed blacks, silhouettes, rim light. Glowing accents only: light-blades, a campfire, a reflection on steel.
- **Atmosphere**: fog, mist, overcast sky, dust, falling sparks.
- **Contrast motif**: cold steel next to something soft, like a knight lying in a wildflower meadow.
- **Texture**: film grain, slight softness, painterly oil-painting look in landscapes, polished chrome and chainmail in close-ups.
- **Motion feel**: slow, heavy, ceremonial. Sudden flashes of light, never fast cuts.

## Palette

| Role | Color | Hex |
| --- | --- | --- |
| Background | Abyss black | `#07080A` |
| Shadows | Charcoal | `#1A1C20` |
| Mist | Fog grey | `#8C9096` |
| Highlights | Bone white | `#E8E6E1` |
| Cold accent | Steel cobalt | `#2E4A7A` |
| Nature | Moss green | `#2F3B2A` |
| Warm accent (rare) | Ember | `#E0662B` |
| Magic accent (rare) | Violet | `#4B2BB8` |

At least 80% of every frame is black, charcoal or fog grey. Use only one accent color per scene.

## Whisk inputs

- **Style reference**: one image that already has this look, for example a monochrome cobalt-tinted studio portrait or a foggy black-and-white landscape. Reuse the same style image for every scene.
- **Scene reference**: foggy hills, a gothic cathedral in mist, a dark forest, a wildflower meadow at dusk, or a seamless grey studio backdrop.
- **Subject reference**: the knight, cloaked figure or product.
- **Prompt suffix** (append to every prompt):

```
dark fantasy editorial photograph, single hard light, deep black shadows,
thick fog, desaturated cold cobalt tones, film grain, cinematic, lonely figure,
vast negative space, medieval, melancholic, no text
```

Example prompts:

- `a hooded wanderer walking toward a gothic castle on a hill, seen from behind` + suffix
- `glowing white swords stuck in a misty hillside around a cloaked figure` + suffix
- `a knight in silver armor lying in a meadow of small white flowers at dusk` + suffix
- `close-up portrait of a person in a chainmail coif, a blade of light crossing the frame` + suffix

Whisk Animate prompts: `slow push-in, fog drifting`, `cloak moving in the wind`, `light flickering on the swords`, `petals moving in the wind, armor stays still`.

## Remotion treatment

Apply the same grade, grain and vignette on top of every Whisk asset so that all scenes match.

```tsx
import {AbsoluteFill, useCurrentFrame} from "remotion";

export const DarkKnightGrade: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{backgroundColor: "#07080A"}}>
      <AbsoluteFill
        style={{filter: "saturate(0.45) contrast(1.2) brightness(0.85)"}}
      >
        {children}
      </AbsoluteFill>
      {/* Cold cobalt tint */}
      <AbsoluteFill
        style={{backgroundColor: "#2E4A7A", mixBlendMode: "soft-light", opacity: 0.5}}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(7,8,10,0.9) 100%)",
        }}
      />
      {/* Film grain, new pattern every 2 frames */}
      <AbsoluteFill style={{opacity: 0.12, mixBlendMode: "overlay"}}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves={2}
              seed={Math.floor(frame / 2)}
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### Typography

- Titles: `Cormorant Garamond`, uppercase, letter spacing `0.2em`, bone white, small and centered or in a corner. Never large and loud.
- Captions and credits: `Inter Tight`, 14–18px at 1080p, fog grey, like an editorial poster ("WHO AM I?", dates, short lines of poetry).
- Load both with `@remotion/google-fonts`, see [google-fonts.md](../../remotion-markup/google-fonts.md).

### Motion and timing

- Scenes: 3–5 seconds each. Slow push-in of 1.00 → 1.08 scale over the scene with an ease-in-out curve.
- Transitions: fade through black (12–20 frames), or a quick white light flash (4–6 frames) on dramatic beats.
- Text: fade in over 20 frames with a 10px upward drift and a slight blur that resolves to sharp.
- Accents: let light-blades, embers or steel reflections flicker with a subtle opacity noise.
- Audio fits: low drones, wind, distant bells, metal clinks, choir pads.

## Avoid

- Bright saturated colors, sunny skies, cheerful or comedic tone.
- Busy frames with many characters.
- Readable text, logos or symbols generated inside Whisk images.
- Fast cuts, bouncy springs and flashy motion graphics.
