# QA report – Merch Forge 2.0

Date: 17 November 2026 · Branch: `merch-forge-2` (not deployed to production)

All end-to-end tests run in Google Chrome (Playwright) against the production build (`dist/`) served with the real `_headers`, so the Content-Security-Policy is enforced during testing. 3D tests use SwiftShader (software WebGL).

## Results

| Test | Script | Result |
| --- | --- | --- |
| **A** Hoodie workflow: invalid/malicious uploads, logo upload, placement, HEX colour, rotate, PNG 2048², transparent PNG alpha, front render colour check, 5-view ZIP, collection of 3, collection ZIP, project file, nothing kept after reload, import on a fresh browser, edit after import, mobile layout | `workflow_test.py` | All passed |
| **B** Jersey designer: 6 colour slots, racing stripes, team logo / sponsor / sleeves / front number / player name + number / slogan, bold + italic, 4 views, 1920×1080 front + back export, editable after save → refresh → import | `jersey_test.py` | 8/8 |
| **C** Collection of 5 + boards: rename, duplicate, reorder, remove, Brand Kit to all, board 3840×2160 and A3 4961×3508, preview; 7 environments at 1080p / 1440p / 4K in PNG and JPG; product-only transparent PNG | `collection_board_test.py` | 18/18 |
| **D** Save / refresh / import: `.merchforge` download, refresh loses unsaved work (no hidden autosave), import restores brand kit, collection, logos, editable text, locks; clean undo history | `privacy_project_test.py` | included below |
| **E** ZIP: 5 products × 2 views + contact + A4 sheets + README, correct names, square, not stretched | `collection_board_test.py` | passed |
| **F** Portfolio: nothing pre-written, starters insert stems only, 2 versions captured, PDF contains the student's own text, stored in project file, restored on import, jsPDF runs under the CSP | `portfolio_test.py` | 9/9 |
| **G** Privacy network inspection: localStorage / sessionStorage / IndexedDB / cookies / Cache Storage / service workers all empty before and after work; every request to the site's own origin; no POST/PUT; no CSP violations; malicious project files (script injection, SVG/`javascript:` images, prototype pollution, huge values) rejected or clamped; leave-page warning | `privacy_project_test.py` | 30/30 |
| **H** Devices: desktop 1440, tablet 820×1180 touch, mobile 390×844 touch, keyboard tabs + dialogs, collapsible panels, reduced motion, WebGL switched off (2D preview mode) | `devices_test.py` | 16/16 |
| Catalogue: all 35 products build and accept a logo and text in every print location | `catalogue_test.py` | 35/35 |
| Text, patterns, scenes and export backgrounds (regression) | `text_and_patterns_test.py`, `scenes_and_backgrounds_test.py` | no errors |
| Unit tests | `npm test` | 78/78 |

`npm audit --omit=dev`: 0 vulnerabilities. The production bundle contains no `eval` / `new Function`.

## Not tested here (please check by hand)

- **Firefox and Safari** could not be installed in the test environment. Edge uses the same engine as Chrome. Please open the branch preview in Firefox and Safari (including an iPad) before going live.
- Real college GPUs and real touch devices (tests used software rendering and emulated touch).
- Screen reader walkthrough (labels and roles are in place; a full NVDA/VoiceOver pass has not been done).

## Known limitations

- The oversized T-shirt reuses the T-shirt cloth simulation scaled to a boxier fit, rather than its own simulation.
- Slight seam irregularity where the varsity sleeves meet the shoulders, visible close up.
- 2D preview mode (no WebGL) draws logos flat-lit and does not show printed patterns or free rotation.
- On 16:9 environment exports the floor/desk sits low in the frame because backgrounds are designed square and cropped.
- GitHub Pages ignores `_headers`; use Cloudflare or Netlify for the CSP to apply.
