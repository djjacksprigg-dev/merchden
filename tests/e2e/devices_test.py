"""Test H – browsers / devices (Chromium engine: Chrome & Edge), touch, reduced motion, keyboard, WebGL off."""
import os, asyncio
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
os.makedirs('shots', exist_ok=True)
R = []
def ok(n, c, e=''): R.append(('PASS' if c else 'FAIL', n, str(e)[:260]))
GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
async def run(p, name, args, ctx_opts, fn):
    b = await p.chromium.launch(executable_path=CHROME, args=args)
    ctx = await b.new_context(**ctx_opts)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(3500)
    try:
        await fn(pg)
    finally:
        ok(f'{name}: no errors', not errs, errs[:2])
        await b.close()
async def main():
    async with async_playwright() as p:
        async def desktop(pg):
            ok('Desktop 1440: no horizontal overflow', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            await pg.screenshot(path='shots/device_desktop.png')
            # keyboard: tab into the design tabs and switch with arrow keys
            await pg.get_by_role('tab', name='Graphics').focus(); await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(200)
            ok('Keyboard: arrow keys switch design tabs', await pg.evaluate("document.activeElement && __studio.getState().rightTab") == 'text')
            await pg.keyboard.press('Control+z')
            await pg.get_by_role('button', name='Help, privacy and licences').focus(); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
            ok('Keyboard: Help opens with Enter and closes with Escape', await pg.get_by_role('dialog').count() == 1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            ok('Escape closes dialog', await pg.get_by_role('dialog').count() == 0)
            # collapse panels
            await pg.get_by_role('button', name='Hide catalogue panel').click(); await pg.get_by_role('button', name='Hide design panel').click(); await pg.wait_for_timeout(500)
            w = await pg.evaluate("document.querySelector('main').getBoundingClientRect().width")
            ok('Collapsible panels give the preview the full width', w > 1400, w)
            await pg.screenshot(path='shots/device_collapsed.png')
        await run(p, 'Desktop Chrome', GL, {'viewport': {'width': 1440, 'height': 900}}, desktop)

        async def tablet(pg):
            ok('Tablet 820×1180 (touch): no horizontal overflow', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            box = await pg.locator('canvas').bounding_box()
            await pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            await pg.screenshot(path='shots/device_tablet.png')
            await pg.get_by_role('button', name='Customise').click(); await pg.wait_for_timeout(500)
            ok('Tablet: design drawer opens', await pg.locator('#design-controls').evaluate("e => e.getBoundingClientRect().right <= innerWidth + 1 && e.getBoundingClientRect().left < innerWidth"))
        await run(p, 'Tablet', GL, {'viewport': {'width': 820, 'height': 1180}, 'has_touch': True, 'is_mobile': True, 'device_scale_factor': 2}, tablet)

        async def mobile(pg):
            ok('Mobile 390×844: no horizontal overflow', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            await pg.screenshot(path='shots/device_mobile.png')
            await pg.get_by_role('button', name='Products').click(); await pg.wait_for_timeout(400)
            await pg.get_by_role('button', name='Esports jersey').first.click(); await pg.wait_for_timeout(3000)
            ok('Mobile: product picked from drawer', await pg.evaluate("__studio.getState().design.productId") == 'jersey')
            await pg.get_by_role('button', name='Customise').click(); await pg.wait_for_timeout(500)
            await pg.screenshot(path='shots/device_mobile_panel.png')
        await run(p, 'Mobile', GL, {'viewport': {'width': 390, 'height': 844}, 'has_touch': True, 'is_mobile': True, 'device_scale_factor': 3}, mobile)

        async def reduced(pg):
            await pg.get_by_role('button', name='Start turntable rotation').click(); await pg.wait_for_timeout(300)
            dur = await pg.evaluate("getComputedStyle(document.querySelector('aside')).transitionDuration")
            ok('Reduced motion: transitions switched off', dur in ('0s', '1e-05s', '0.00001s'), dur)
        await run(p, 'Reduced motion', GL, {'viewport': {'width': 1280, 'height': 800}, 'reduced_motion': 'reduce'}, reduced)

        async def nogl(pg):
            ok('WebGL off: 2D preview mode shown', await pg.get_by_text('2D preview mode.').count() == 1)
            await pg.screenshot(path='shots/device_nowebgl.png')
        await run(p, 'WebGL disabled', ['--disable-webgl', '--disable-3d-apis', '--no-sandbox'], {'viewport': {'width': 1280, 'height': 800}}, nogl)
    for s, n, e in R: print(s, n, e if s == 'FAIL' else '')
    print(f"{sum(r[0]=='PASS' for r in R)}/{len(R)} passed")
asyncio.run(main())
