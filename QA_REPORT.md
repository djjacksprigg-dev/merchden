# QA report

Run on 15 November 2026 against the production build (`npm run build && npm run preview`), with headless Chrome using SwiftShader (software WebGL).

## Automated: all passing

**Unit tests (`npm test`): 54/54**
- Catalogue contains all 23 required products.
- Every product builds valid geometry (no NaN), every part maps to a colour slot or fixed colour, and the default placement exists.
- For every projected placement area on every product (72 areas, plus the lanyard strap and sticker artwork), a logo decal is projected at the centre and at the four extreme offsets. It produces surface triangles, stays local to the logo (no bleed onto the far side) and maps back to the right offsets.
- Upload validation (formats, size limits, empty files, file-signature sniffing), SVG sanitising, HEX parsing, file naming.

**End-to-end student workflow (`tests/e2e/workflow_test.py`)**

| Check | Result |
| --- | --- |
| No checkout / basket / payment UI | Pass |
| Renamed non-image upload gives a clear error | Pass |
| SVG with `<script>`, `onload`, `onclick`, external `<image>` imports safely | Pass |
| PNG logo uploads, keeps proportions (transparent border trimmed) and appears on the hoodie | Pass |
| Logo moved to left chest, resized and rotated | Pass |
| HEX colour entry recolours the product | Pass |
| Mouse-drag rotation and wheel zoom | Pass |
| Download image → 2048 × 2048 PNG | Pass |
| Transparent PNG → corners alpha 0, product alpha 255 | Pass |
| Front export contains the customised (red) product; named `Red-Rift-Esports_Hoodie_Front.png` | Pass |
| 4-view ZIP has Front/Back/Side/Three-quarter PNGs | Pass |
| Selecting the cap auto-applies the same logo and brand colour | Pass |
| 3 designs saved to My designs | Pass |
| Collection ZIP: 6 product PNGs + contact sheet + presentation sheet + README | Pass |
| Project export includes designs and logos | Pass |
| Reload keeps collection, current product and project info (IndexedDB) | Pass |
| Edit reopens a saved design | Pass |
| Import project into a fresh browser profile | Pass |
| Mobile layout (390 × 844) with slide-over panels | Pass |
| No console errors | Pass |

**Visual render checks:** every product was rendered with a logo applied and reviewed. All 23 load, are recognisable, and show the logo on the surface. Jersey patterns were checked individually.

## Realism pass (second iteration)

The renders moved from a dark "game" look to product photography: a light studio sweep, neutral tone mapping, softbox lighting, baked ambient occlusion, shaded interiors, rolled hems, seams, stitching, real-height pocket placement and colour-linked trims. All 23 products were re-rendered and checked, and all automated tests were re-run and pass.

## Patterns (third iteration)

Patterns are now available on 21 products (12 options). New unit tests check that every patterned product has printable main-colour parts with measurable surfaces (54 unit tests in total). Patterns were render-checked across hoodie, T-shirt, jersey, joggers, cap, beanie, XL mouse mat, mug, bottle, backpack, phone case, gaming chair and tote. The full workflow test was re-run and passes.

## Esports patterns (fourth iteration)

Added 11 esports patterns built from original symbols, including a monogram of the team's own logo, and grouped the picker into Esports and Classic. Default pattern colours are now chosen for contrast. Round products (mugs, bottles, hats) now map patterns by real height, so prints keep their proportions. Every esports pattern was render-checked on at least one product. All unit tests and the workflow test pass.

## Text, images and own patterns (fifth iteration)

New features: a text tool (10 OFL fonts, outline, spacing, curve, second line, presets that pick empty areas and readable colours), uploading any image as a graphic, and students' own pattern uploads (tile or one big print). `tests/e2e/text_and_patterns_test.py` adds a gamer tag + number to a jersey back and curved crest text on the front, uploads a seamless tile onto a hoodie with a slogan, prints uploaded artwork as one big print on the XL mouse mat with a team name, and exports a 2048 px PNG. It produced no console errors. The original workflow test and all unit tests still pass.

## Cloth simulation, scene styles and export backgrounds (sixth iteration)

The seven tops are now cloth-simulated drapes. They were render-checked in light and dark colours from front, back, side and three-quarter views. Six scene styles and five export backgrounds were render-checked in the viewer and in 2048 px downloads (`tests/e2e/scenes_and_backgrounds_test.py`). The transparent download keeps real transparency. All 54 unit tests and both workflow tests pass with no console errors.

## Needs manual testing on real hardware

- **Real GPUs and college PCs.** The tests used software rendering. Check frame rate on typical college machines, and whether performance mode switches on automatically on weak hardware.
- **Touch devices.** Pinch zoom and one-finger rotation on a real iPad or Android tablet.
- **Safari and Firefox.** Tests ran in Chrome only. Check uploads, downloads and IndexedDB.
- **4096 px exports.** These depend on GPU memory and may be capped on some machines (the UI disables sizes the GPU can't handle).
- **Visual realism judgement.** The models are procedural, "ghost-mannequin" style product renders. They read clearly as each product, but they are not photogrammetry scans. The hoodie hood and jogger crotch are the most stylised areas.
- **Screen readers.** Labels and roles are in place, but they have not been tested with NVDA or VoiceOver.

## Known limitations

- Every product is procedural; no external GLB models are used. That avoids licensing risk and network requests. Better scanned models can be added later through the registry (see README).
- Designs live in one browser on one computer. Use Export/Import project to move them.
- The "Headset accessory" is interpreted as custom ear-cup plates, shown on a generic headset.
