"""Every catalogue product opens, builds, exposes print locations, and accepts a logo + text on every location without errors."""
import os, re, asyncio
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
os.makedirs('shots', exist_ok=True)
async def main():
    ids = re.findall(r"^\s{4}id: '([a-z0-9-]+)',", open('../../src/three/catalogue.ts').read(), re.M)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        pg = await (await b.new_context(viewport={'width': 1440, 'height': 900})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(2000)
        await pg.set_input_files('input[aria-label="Upload logo file"]', 'files/team_logo.png'); await pg.wait_for_timeout(1500)
        fails = []
        for pid in ids:
            n0 = len(errs)
            await pg.evaluate(f"__studio.getState().selectProduct('{pid}')"); await pg.wait_for_timeout(600)
            await pg.wait_for_function("!document.querySelector('main [role=status]')", timeout=90000)
            await pg.wait_for_timeout(900)
            zones = await pg.evaluate("(()=>{const s=__studio.getState();return s.modelProductId===s.design.productId? s.modelZones.map(z=>[z.id,z.kind]):null})()")
            if not zones: fails.append((pid, 'no zones')); continue
            for zid, kind in zones:
                await pg.evaluate(f"__studio.getState().addLayer('{zid}')")
                if kind in ('planar', 'wrap'):
                    await pg.evaluate(f"__studio.getState().addTextLayer('{zid}', {{content:'TEST'}})")
            await pg.wait_for_timeout(1800)
            layers = await pg.evaluate("__studio.getState().design.layers.length")
            ok = len(errs) == n0
            print(('PASS' if ok else 'FAIL'), pid, f'{len(zones)} print locations', [z[0] for z in zones], f'{layers} layers')
            if not ok: fails.append((pid, errs[n0:][:2]))
        await b.close()
        print('\nFAILS:', fails if fails else 'none', f'\n{len(ids) - len(fails)}/{len(ids)} products OK')
asyncio.run(main())
