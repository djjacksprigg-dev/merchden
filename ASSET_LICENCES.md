# Asset & licence register

Last reviewed: 15 November 2026.

## 3D models

All 23 product models are **original procedural geometry written for this project** (`src/three/models/*.ts`). They are generated at runtime from code. No third-party model files, scans or images are used.

| Product(s) | Source | Licence | Attribution needed |
| --- | --- | --- | --- |
| Jersey, T-shirt, hoodie, zip hoodie, sweatshirt, polo, tracksuit jacket, joggers | Original procedural (`garments.ts`) | MIT (this project) | No |
| Baseball cap, beanie, bucket hat | Original procedural (`headwear.ts`) | MIT (this project) | No |
| Mouse mats, gaming chair, headset | Original procedural (`gaming.ts`) | MIT (this project) | No |
| Bottle, mug, backpack, drawstring bag, tote, phone case, lanyard, sticker | Original procedural (`everyday.ts`) | MIT (this project) | No |

The phone case uses a generic phone shape and does not reproduce any manufacturer's product design or trademark.

## Textures, lighting, images

| Asset | Source | Licence |
| --- | --- | --- |
| Fabric / material normal maps (knit, fleece, rib, piqué, twill, canvas, nylon, leather…) | Generated in the browser with Canvas 2D (`engine/textures.ts`) | MIT (this project) |
| Jersey pattern textures | Generated in the browser | MIT (this project) |
| Studio lighting environment | Procedural light-formers (no HDR files) | MIT (this project) |
| Sample logos "Nova Vanguard" and "Ember Wolves" | Original SVGs for this project, fictional organisations (`src/data/sampleLogos.ts`) | CC0 |
| Studio icon / favicon | Original SVG | CC0 |
| UI icons | [Lucide](https://lucide.dev) | ISC |
| Inter typeface | [@fontsource-variable/inter](https://fontsource.org/fonts/inter) | SIL Open Font License 1.1 |
| Text tool fonts: Orbitron, Russo One, Audiowide, Black Ops One, Bebas Neue, Anton, Oswald, Teko, Press Start 2P | [Fontsource](https://fontsource.org) packages of Google Fonts (latin subset bundled) | SIL Open Font License 1.1 – free to bundle and use, including in exported images |
| Esports pattern symbols (crosshairs, controllers, keycaps, bolts, trophies, pixel hearts, circuit art) | Original canvas drawings in `engine/patterns.ts` | MIT (this project). No console button marks or brand logos |

No stock photos, AI-generated images, scraped merchandise imagery, watermarked images or real team logos are included.

## Software dependencies (bundled)

| Package | Licence |
| --- | --- |
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber, @react-three/drei | MIT |
| zustand | MIT |
| lucide-react | ISC |
| idb-keyval | Apache-2.0 |
| fflate | MIT |
| @fontsource-variable/inter | OFL-1.1 (font), MIT (package) |

Build-only tools (Vite, TypeScript, Tailwind CSS, Vitest, jsdom, vite-plugin-singlefile) are MIT-licensed and are not shipped as runtime code apart from Tailwind's generated CSS (MIT).

All licences allow free redistribution in an educational web application. Keep this file with the project.

## Student uploads

Logos, images and pattern artwork uploaded by students are processed and stored only in that student's browser. Students are responsible for having permission to use the logos they upload. The sample brands exist so that nobody needs to use a real professional team's trademark for demonstrations.
