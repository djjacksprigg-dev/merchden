# Merch Forge 2.0 — Esports Merchandise Design Studio

A free, browser-based 3D design studio for college esports students (16–19). Students build a brand, design a full range of merchandise on real 3D products, write up their portfolio and export everything for coursework.

- **Privacy first.** No accounts, no database, no server storage, no cloud sync, no analytics, no tracking, no third-party services. Logos, designs and portfolio notes stay in the browser tab and are never uploaded.
- **Students own their files.** Work is kept by downloading a single `.merchforge` project file and importing it next lesson. Nothing is saved silently in the browser – an "Unsaved changes" badge and a leave-page warning remind students to download.
- **Free.** No payments, basket, watermarks or download limits.
- **Static site.** Cloudflare Workers (static assets), Netlify or GitHub Pages serve only the app files. No API receives student work.
- **No downloads at runtime.** All 35 products are procedural 3D models generated in the browser – no model files, stock photos, HDRs or CDNs – so it works on locked-down college networks.

## Privacy and security

| What | How |
| --- | --- |
| Storage | Work lives in memory only. No `localStorage`, `sessionStorage`, IndexedDB, cookies, caches or service workers are used (verified by `tests/e2e/privacy_project_test.py`). |
| Saving | **Download project** (Ctrl+S) creates `ProjectName.merchforge`: a JSON file with logos, Brand Kit, products, layers, text, jersey settings, collection, portfolio and versions. |
| Importing | Files are parsed as data, never executed. Every field is rebuilt against allow-lists and clamped; only real PNG/JPEG/WebP images that decode are accepted; prototype-pollution keys are ignored; files over 120 MB are refused. Older v1 project files still import. |
| Network | The page only loads its own files. A Content-Security-Policy (`public/_headers`) blocks third-party scripts, connections, frames and form posts. |
| Uploads | Logos and images are validated (size, real file signature) and SVGs are sanitised, then processed locally. |

## Features

| Area | What students can do |
| --- | --- |
| Editor | Dark navy studio with orange highlights. Top bar: logo, project name, product selector, undo/redo (Ctrl+Z / Ctrl+Y), new / import / download project, export designs, portfolio, help. Collapsible catalogue and design panels. Desktop first, tablet and mobile drawers |
| Catalogue | 35 products with rendered thumbnails and search. **Clothing:** esports jersey, T-shirt, oversized T-shirt, hoodie, zip hoodie, sweatshirt, polo, tracksuit jacket, varsity jacket, windbreaker, joggers / tracksuit bottoms. **Headwear:** cap, beanie, bucket hat. **Gaming:** XL and standard mouse mats, gaming chair, headset plates, controller skin, laptop sleeve, headset stand. **Everyday:** water bottle, mug, travel mug, sports bottle, tumbler, backpack, drawstring bag, tote, phone case, lanyard, sticker, keyring, notebook, poster |
| 3D viewer | Orbit, touch and pinch, zoom buttons, reset, Front / Back / Left / Right / ¾ views (jersey: left and right sleeve), turntable. Garments are cloth-simulated (`npm run bake:cloth`). If WebGL is switched off, a **2D preview mode** draws the same models with a software renderer (fixed views; logos, text, colours and exports still work) |
| Brand Kit | Organisation name, primary and secondary logo, primary / secondary / accent colours, preferred font, slogan. Apply to one product or the whole collection. HEX input, picker, presets and recently used colours everywhere |
| Logos and layers | PNG, JPG, WebP and SVG. Several logos per print location. Drag logos and text directly on the 3D product, or use the position pad. Size, rotation, opacity, duplicate, delete, lock, bring forward / send backward, align left / centre / right / top / bottom, centre, snap guides, reset |
| Print locations | Only where a product genuinely supports them, e.g. left / right chest, centre chest, full front, upper back, full back, left / right sleeve, jersey side panels |
| Jersey designer | Main, sleeve, collar, trim, pattern and accent colours; 27 patterns including geometric, diagonal, lightning, gamer camo, gradient, hex, abstract esports, minimalist, split colour and racing stripes; team kit builder for team logo, sponsor logo, sleeve branding, player name, player number (back and front) and slogan – all stay editable |
| Text | Ten bundled OFL fonts, size, colour, outline, bold, italic, letter spacing, curve, line alignment, rotation, position, duplicate, delete |
| Patterns | 27 options (classic and esports) printed at real scale onto the 3D surface, plus students' own uploaded patterns (tile or full print) |
| Mockup environments | White studio, dark studio, gaming desk, esports stage, clothing display, merch exhibition (uses Brand Kit colours), minimalist, plus neon, retro and pop art – all drawn locally |
| Exports | PNG, JPG, transparent PNG (product only); 1920 × 1080, 2560 × 1440, 3840 × 2160 or 2048² square (never stretched or cropped); single views, all views as ZIP, front + back on one image; collection ZIP; file names like `TeamName_Hoodie_Front.png` |
| My collection | Add, view, rename, duplicate, edit, reorder, remove, apply Brand Kit, ZIP export, A4 sheet, contact sheet |
| Collection board | 16:9 (3840 × 2160) or A3 landscape (4961 × 3508, 300 dpi); light, dark or brand style; logo, slogan, colours, rationale and every product rendered fresh from 3D |
| Portfolio mode | Optional docked panel: organisation, project title, target audience, and for each product why it was chosen, how it represents the brand, why it appeals and what to improve; optional sentence starters (stems only – nothing is written for the student); up to 4 captured versions per product with "what changed / why" notes; PDF export made in the browser |
| Accessibility | Keyboard-operable controls and tabs, labelled buttons, focus outlines, dialogs close with Escape, skip link, reduced-motion support (no camera or entrance animations), readable contrast on orange buttons |
| Performance | Lazy-loaded product modules and PDF library, render-on-demand, automatic performance mode on low-power machines |

## Getting started

Requires Node.js 18+ (20 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (models, decals, patterns, logo validation, SVG sanitiser)
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

No environment secrets, API keys, databases or paid services are needed. `public/_headers` (copied into `dist/`) sets the Content-Security-Policy and other security headers on Cloudflare and Netlify. GitHub Pages ignores `_headers`, so prefer Cloudflare or Netlify if you want the CSP enforced.

## Project structure

```
src/
  app/App.tsx                       layout (catalogue | viewer | design controls | portfolio)
  components/
    layout/TopBar.tsx               project name, product selector, undo/redo, project file, export, help
    layout/DesignSidebar.tsx        Brand Kit / Graphics / Text / Colours / Export tabs
    catalogue/CatalogueSidebar.tsx  catalogue with thumbnails (src/assets/thumbs, made by scripts/make-thumbs.py)
    viewer/Viewer.tsx               3D canvas and view controls
    viewer/ProductStage.tsx         models, materials, decals, drag-on-product
    viewer/Fallback2D.tsx           software-rendered 2D preview when WebGL is unavailable
    viewer/ExportBridge.tsx         high-resolution capture + export composition
    project/BrandKitPanel.tsx       Brand Kit
    placement/                      placement, layers, team kit builder
    collection/                     My collection and the collection board
    portfolio/PortfolioPanel.tsx    student portfolio mode
  three/                            catalogue, procedural geometry engine, models, scenes
  lib/                              exporter, boards/sheets, portfolio PDF, logo pipeline, types
  storage/projectFile.ts            .merchforge download / validated import (no browser storage)
  state/studio.ts, state/history.ts Zustand state, undo/redo and unsaved-changes tracking
public/_headers                     CSP and security headers
tests/                              Vitest unit tests + Playwright end-to-end tests (tests/e2e/run_all.sh)
```

### Adding a product

1. Write a builder in `src/three/models/` that returns `{ parts, zones }`. Build geometry with the helpers in `engine/geometry.ts`, or load a GLB and convert its meshes to parts. Each part names a colour slot (or a fixed colour) and a finish. Each zone describes a placement area: `planar` (projected from a direction) or `wrap` (around a vertical axis).
2. Register it in `src/three/catalogue.ts` with its colour slots, defaults and default zone.
3. Run `npm test`. The model test automatically checks the new product's geometry and that every placement area accepts a logo at the centre and at the edges.

## Testing

- `npm test` – 78 unit tests: catalogue, geometry for every product, decals in every print location, pattern surfaces, logo validation and SVG sanitising.
- `tests/e2e/run_all.sh` – end-to-end tests with Chrome against `dist/` served with the real security headers (`python3 tests/e2e/serve_dist.py dist`):
  - **A** `workflow_test.py` – hoodie: uploads, placement, colour, PNG/transparent/views exports, collection, project file, import
  - **B** `jersey_test.py` – jersey colours, pattern, kit builder, views, front + back export, editable after import
  - **C/E** `collection_board_test.py` – collection of 5, board 16:9 + A3, ZIP, environments at all resolutions
  - **D/G** `privacy_project_test.py` – no browser storage, save / refresh / import, malicious files, leave warning, network inspection, CSP
  - **F** `portfolio_test.py` – portfolio mode and PDF
  - **H** `devices_test.py` – desktop, tablet, mobile, keyboard, reduced motion, WebGL off
  - `catalogue_test.py` – every product opens and accepts logos and text in every location

See `QA_REPORT.md` for the latest results.

## Licence

Source code: MIT. Third-party packages and assets: see `ASSET_LICENCES.md`.
