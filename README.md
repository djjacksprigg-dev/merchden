# Merch Forge — Esports Merchandise Design Studio

A free, browser-based 3D design studio for college esports students (16–19). Students upload their own team logo, put it on realistic interactive 3D merchandise, customise colours and download high-quality PNGs for coursework.

- **Free for students.** No account, no payments, no basket, no watermark, no download limits.
- **Private.** Logos and designs never leave the computer. Everything is stored in the browser (IndexedDB).
- **No backend.** It's a static website you can host on GitHub Pages, Netlify or Cloudflare Pages for free.
- **No downloads at runtime.** All 23 products are procedural 3D models generated in the browser, with no model files, HDRs or CDNs. It works on locked-down college networks.

## Features

| Area | What students can do |
| --- | --- |
| Catalogue | 23 products in 4 categories (clothing, headwear, gaming accessories, everyday merchandise) with search |
| 3D viewer | 360° drag rotation, limited vertical tilt, touch + pinch, scroll zoom, Front / Back / Side / ¾ views, reset camera, turntable mode, smooth product transitions |
| Cloth simulation | All seven tops (jersey, T-shirt, polo, sweatshirt, hoodie, zip hoodie, track jacket) are **cloth-simulated**: each is draped on an invisible ghost mannequin with gravity, extra fabric length and gathered rib cuffs and waistbands, using a position-based-dynamics solver (`src/three/engine/cloth.ts`). Folds and drape come from physics, not hand-drawn noise. The drape is baked at build time (`npm run bake:cloth`), so it costs nothing on student computers. Pockets, hems, zips, seams, prints and logos all follow the simulated fabric |
| Scene styles | Studio, Dark studio, Neon (glow + grid floor), Retro (synthwave sunset, scanlines, film grain), Arena (spotlight + crowd bokeh), Pop art (halftone burst). Each changes the lighting colours, backdrop and finishing effects in the viewer and in downloads |
| Export backgrounds | Scene background, team brand (team colours, large faded logo, logo + organisation name in the corner), black, white or none (transparent) |
| Realism | Product-photography rendering: light seamless studio sweep (dark option), Khronos PBR Neutral tone mapping for accurate colours, procedural softbox lighting, soft key-light and contact shadows, baked ambient occlusion (ray-traced per vertex at load with a BVH) so folds, seams, collars and openings shade like a photo, shaded garment interiors, fabric sheen. Garments are built like real clothing: rolled hems with thickness, set-in sleeve seams, double-needle hem stitching, ribbed cuffs and waistbands, pocket edges, crease-profile folds, coil zips |
| Logos | Drag-and-drop or file picker; PNG, JPG, WEBP, SVG; transparency kept; proportions kept; size/format/signature validation; SVG sanitising; clear error messages; logo library with replace and remove; two fictional sample brands |
| Images | The Graphics tab takes any image, not just team logos: sponsor logos, badges, mascots, artwork. Several images can go on one product in different placement areas |
| Text | Team names, gamer tags, player numbers, slogans. 10 bundled display fonts (Orbitron, Russo One, Audiowide, Black Ops One, Bebas Neue, Anton, Oswald, Teko, Press Start 2P, clean sans); colour, outline + outline colour, letter spacing, arched or curved text, optional second line. Presets: team name, gamer tag + number (back of the shirt), slogan, curved crest. Presets pick an empty placement area and a readable colour automatically. Text is printed onto the 3D surface like logos and can be moved, resized and rotated |
| Own patterns | Students upload their own pattern or artwork in the Colours tab: **repeat (tile)** at real size with a size control, or **one big print** stretched across the whole print area (sublimation style). Uploaded patterns are kept in a personal pattern library |
| Placement | Logos are projected onto the real 3D surface as decals (they wrap over folds and curves and stay attached when rotating); move, resize, rotate, reset; several placement areas per product (only genuinely supported ones); double-click the product to place; keyboard-operable position pad |
| Colours | Presets + HEX input for every colour slot (main, secondary, trim, etc.), reset to original; brand colours carry over to new products |
| Patterns | 23 options on 21 products (everything except the lanyard and sticker, which are logo-led). **Esports:** team-logo monogram, crosshairs, controllers, arcade icons, WASD keycaps, circuit board, lightning, pixel fade, glitch, binary code, gamer (digital) camo. **Classic:** solid, two-tone, colour-blocked, gradient, diagonal stripes, pinstripe, hoops, geometric, hex grid, halftone, camo, carbon fibre. All symbols are original canvas drawings (no console or brand marks). Contrast-aware default pattern colours, plus pattern colour, highlight and size controls. Printed onto the 3D surface at real-world scale, following folds and curves |
| Export | PNG at 1024 / 2048 / 4096 px (capped by the GPU), transparent PNG, front/back/side/¾ views, 4-view ZIP, dark/light/white backgrounds. File names like `TeamName_Hoodie_Front.png` |
| Collection | Save designs (with thumbnails) to My designs; edit, download, delete; ZIP of the whole range; contact sheet; A4 landscape presentation sheet (organisation, images, product names, brand colours, rationale) |
| Moving computers | Export project (`.merchforge.json`, logos included) and import it on another computer. Browser storage does **not** sync between devices. |
| Accessibility | Keyboard-reachable controls, labelled buttons, focus outlines, ARIA tabs/dialogs, reduced-motion support, skip link |
| Performance | Lazy-loaded model modules, render-on-demand, automatic performance mode on low-power/software-GPU machines, WebGL-missing and context-loss screens, geometry/texture disposal when changing products |

### Product list

Clothing: esports jersey, T-shirt, hoodie, zip-up hoodie, sweatshirt, polo shirt, tracksuit jacket, joggers ·
Headwear: baseball cap, beanie, bucket hat ·
Gaming: extended mouse mat, mouse mat, gaming chair, headset accessory (custom ear-cup plates shown on a headset) ·
Everyday: water bottle, coffee mug, backpack, drawstring bag, tote bag, phone case, lanyard (repeating strap print + badge card), sticker (die-cut from the logo's own outline, circle or rounded square).

## Getting started

Requires Node.js 18+ (20 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (models, decals, logo validation, SVG sanitiser)
npm run build      # production build in dist/
npm run preview    # serve the production build at http://localhost:4173
```

`npm run build:single` produces `dist-single/index.html`, a single self-contained file (handy for offline USB use or intranets).

## Re-baking the cloth drapes

If you change garment shapes in `src/three/models/garments.ts` or the drape settings in `src/three/models/drape.ts`, re-run the simulation (about 1–2 minutes per garment):

```bash
npm run bake:cloth            # all tops
npm run bake:cloth -- hoodie  # one garment
```

This rewrites `src/three/models/baked.ts`. Commit that file; hosting providers do not need to run the simulation.

## Deployment (free static hosting)

The build uses relative paths (`base: './'`), so it works at a domain root or in a sub-folder.

**Netlify**
1. Push the project to GitHub.
2. In Netlify: *Add new site → Import an existing project* and pick the repo. `netlify.toml` already sets the build command (`npm ci && npm run build`) and publish folder (`dist`).
3. Or drag the `dist/` folder onto <https://app.netlify.com/drop>.

**GitHub Pages**
1. Push to a GitHub repo on the `main` branch.
2. *Settings → Pages → Build and deployment → Source: GitHub Actions.*
3. The included workflow `.github/workflows/deploy-pages.yml` tests, builds and publishes on every push.

**Cloudflare Pages** (recommended)
1. In the Cloudflare dashboard: *Workers & Pages → Create → Pages → Connect to Git*, and pick this repository.
2. Framework preset: **None** (or Vite). Build command: **`npm run build`**. Build output directory: **`dist`**.
3. Under *Environment variables*, add **`NODE_VERSION`** = **`20`**.
4. Save and deploy. Every push to `main` redeploys automatically.

If Cloudflare set the project up as a **Worker** (its deploy step runs `npx wrangler deploy`), that works too: `wrangler.jsonc` in this repo tells Wrangler to serve `dist/` as a static site, so it doesn't try to auto-configure Vite.

No environment secrets, API keys or paid services are needed.

## Project structure

```
src/
  app/App.tsx                     application layout (catalogue | viewer | controls, mobile drawers)
  components/
    layout/TopBar.tsx             top navigation (catalogue, my designs, reset, save, download)
    layout/DesignSidebar.tsx      tabbed design controls
    catalogue/CatalogueSidebar.tsx   product catalogue
    viewer/Viewer.tsx             3D canvas, view buttons, WebGL fallback
    viewer/ProductStage.tsx       loads models, materials, logo decals, double-click placement
    viewer/CameraRig.tsx          orbit controls, view animations, turntable
    viewer/StudioLights.tsx       procedural studio lighting + contact shadows
    viewer/ExportBridge.tsx       high-resolution capture of the live scene
    logo/LogoUploader.tsx         upload, validation errors, logo library, samples
    placement/PlacementPanel.tsx  placement areas, position pad, sliders
    colour/ColourPanel.tsx        colour slots, presets, HEX, jersey patterns
    project/InfoPanel.tsx         organisation / project / product info
    export/ExportPanel.tsx        PNG, transparent, views, ZIP
    collection/CollectionModal.tsx   gallery, ZIP, sheets, project import/export
  three/
    catalogue.ts                  product model registry (add products here)
    engine/geometry.ts            procedural geometry toolkit (bodies, tubes, lathes, cushions…)
    engine/decals.ts              surface decal projection
    engine/materials.ts           fabric/plastic/ceramic finishes
    engine/textures.ts            procedural normal maps, patterns, strap + sticker artwork
    models/*.ts                   the 23 product builders
    renderService.ts              bridge between UI and WebGL for exports
  lib/                            logo pipeline, exporter, sheets, utilities, types
  storage/db.ts                   IndexedDB persistence + project files
  state/studio.ts                 Zustand design state
tests/                            Vitest unit tests + Playwright end-to-end scripts
```

### Adding a product

1. Write a builder in `src/three/models/` that returns `{ parts, zones }`. Build geometry with the helpers in `engine/geometry.ts`, or load a GLB and convert its meshes to parts. Each part names a colour slot (or a fixed colour) and a finish. Each zone describes a placement area: `planar` (projected from a direction) or `wrap` (around a vertical axis).
2. Register it in `src/three/catalogue.ts` with its colour slots, defaults and default zone.
3. Run `npm test`. The model test automatically checks the new product's geometry and that every placement area accepts a logo at the centre and at the edges.

## Testing

- `npm test` runs 54 unit tests: catalogue completeness, geometry validity for every product, a logo decal projected in every zone at five offsets, offset round-trips, file validation, signature sniffing, SVG sanitising (scripts, handlers, external links, CSS imports, entities) and file naming.
- `tests/e2e/workflow_test.py` (Python Playwright + Chrome) runs the full student workflow against `npm run preview`. It covers bad and malicious uploads, logo upload, placement, HEX colour, mouse rotation, 2048 px PNG, transparent PNG alpha check, colour check of the render, 4-view ZIP, saving 3 products, collection ZIP contents, project export, reload persistence, edit, import into a fresh browser profile, mobile layout and console errors.
- `tests/e2e/render_products.py "hoodie:front,mug:three-quarter"` renders products to a contact grid for visual review.

See `QA_REPORT.md` for the latest results and what still needs a human eye.

## Licence

Source code: MIT. Third-party packages and assets: see `ASSET_LICENCES.md`.
