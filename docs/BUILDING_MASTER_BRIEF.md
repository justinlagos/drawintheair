# Building Mode — Master Image Brief

A spec for generating the master image (and per-piece variants) that will replace the current independently-rendered AI clay pieces in `public/building/pieces/`.

> Status: Phase 0 visual debt. The Building mode currently uses 5 AI-clay pieces that were generated independently → they don't share perspective/lighting/scale, so the assembled vase doesn't read as ONE object. Solving this is the highest-leverage visual fix in the mode.

## The deliverable you give back

**Six PNGs** at minimum 1024×1024 each, pure white or transparent background, all rendered in the same style/lighting/camera setup:

| File | Content |
| --- | --- |
| `master.png` | Complete assembled flower vase — vase body with stem and leaf inside, two flower blossoms on top |
| `piece-vase.png` | Same scene, **only the vase body** visible (everything else transparent or removed) |
| `piece-stem.png` | Same scene, **only the stem + leaf** visible |
| `piece-coral.png` | Same scene, **only the coral/pink flower** visible |
| `piece-yellow.png` | Same scene, **only the yellow flower** visible |
| `piece-leaf.png` | Same scene, **only the single accent leaf** visible (optional, can merge into stem) |

The "same scene" constraint is the entire game. Each piece image must be the master rendered with the other elements hidden — same camera, same light, same colors, same scale. So when I composite them, they reconstruct `master.png` exactly.

If your tool can't do "render same scene with element removed" (most can't easily), there's an alternative: generate **one master with all pieces clearly separated in 2D space** (an "exploded view"), so I can slice via bounding box. See the alt prompt below.

## Primary prompt (use this on DALL-E 3, Midjourney v6, or Flux)

```
A soft 3D claymation-style flower vase, kawaii Pixar Up illustration, centered front-facing view on pure white background.

Composition:
- Pale blue glossy ceramic vase at the bottom, rounded bulbous shape with a narrow neck
- Single green stem rising vertically out of the vase neck
- One small lime-green leaf attached to the lower-left of the stem
- Two large 8-petal flowers blooming from the top of the stem: coral pink flower on the upper-left, sunshine yellow flower on the upper-right
- All elements rendered in matte soft clay material with a glossy finish on the vase

Lighting: single soft light source from the upper-left, casting consistent gentle shadows toward the lower-right on every element. No backlight, no rim light, no second source.

Camera: fixed front-facing view, no perspective tilt, no isometric angle. Every piece must read as if photographed from the same camera angle.

Style: premium children's app illustration, kawaii, soft pastel palette, glossy clay finish, smooth rounded geometry, low visual noise, no text, no other objects, no signature, no watermark.

Reference for aesthetic: the background scene in /public/building/scene/background.png — the pieces must look like they belong in that world.

Square 1:1 aspect ratio.
```

After you generate the master you like, **re-generate it 4-5 more times with the exact same prompt + reference image (use img2img / character reference / style reference)** but ask for one element removed each time:
- Master only the vase: append "showing ONLY the vase, no flowers, no stem, no leaf"
- Master only the stem+leaf: append "showing ONLY the stem and leaf, no flowers, no vase"
- Master only the coral flower: append "showing ONLY the coral pink flower (no yellow flower, no stem, no vase, no leaf)"
- Master only the yellow flower: append "showing ONLY the yellow flower (no coral flower, no stem, no vase, no leaf)"

This is the part most tools struggle with. **Quality of the per-piece variants is more important than the master itself** — they decide whether the pieces slot together believably.

## Alt prompt — "exploded view" (use if per-piece variants are too painful)

```
A soft 3D claymation-style flower vase parts laid out as an exploded assembly diagram, kawaii Pixar Up illustration, pure white background, square 1:1 frame.

Five distinct parts arranged with clear empty space between them:
- bottom-center: a pale blue glossy ceramic vase
- left-center: a small lime-green leaf
- right-center: a vertical green stem
- top-left: a coral pink 8-petal flower
- top-right: a sunshine yellow 8-petal flower

All five parts rendered in the same camera angle (front-facing) with the same upper-left light source so they look like they could be assembled into one continuous object. Glossy clay finish. No text, no labels, no other objects.
```

Then send me just that one image. I'll bbox-detect each piece and crop them out.

## Tool-specific tips

**DALL-E 3 (ChatGPT)** — Strong style consistency across iterations. After the master is generated, say "now show me the same vase with everything removed except the yellow flower" and DALL-E will preserve style/lighting.

**Midjourney v6+** — Use `--style raw --no signature --no watermark --ar 1:1 --quality 2`. For per-piece variants, use the master URL as `--cref` (character reference) with weight `--cw 100`.

**Flux Pro (Replicate / fal.ai)** — Use Flux Redux for style reference. Pass the master as the reference image with high strength (0.9+) and modify only the textual subject ("only the vase"/"only the yellow flower").

**Stable Diffusion XL with ControlNet** — Use the master as input to ControlNet-segment, then mask out everything except the target piece. Highest precision; most setup.

## What to give me back

When you're done, drop the files anywhere in the repo (or send them through chat) and tell me where they live. I will:

1. Run rembg on each file to ensure clean alpha
2. Tight-crop to bounding box with small transparent padding
3. Compute master-aligned snap coords from each piece's bbox in the master
4. Update `src/features/modes/building/buildingWorlds.ts` to use the new master-and-slice positioning
5. Update `public/building/pieces/*.png` with the new sprites
6. Update `public/building/objects/flower-vase-thumbnail.png` from the master

You don't need to crop, resize, or remove backgrounds — I handle all of that. Just give me the raw outputs.

## What "good" looks like

A child watching the completion animation should see:
- All five pieces lit from the same angle
- All five pieces showing the same level of detail / glossiness
- All five pieces at consistent scale (the leaf isn't accidentally vase-sized, the flowers aren't accidentally leaf-sized)
- The assembled object reading as ONE complete flower vase, not "five clay objects positioned near each other"

If you look at the assembled result and could plausibly tell a child "this is a real flower vase someone put on the table," we shipped it.
