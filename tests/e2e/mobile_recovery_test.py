"""Phone: automatic performance mode, Scene tab, and recovering from a lost 3D view without losing work."""
import os, asyncio
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
os.makedirs('shots', exist_ok=True)
R = []
def ok(n, c, e=''): R.append(('PASS' if c else 'FAIL', n, str(e)[:200]))
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, user_agent=UA, is_mobile=True, has_touch=True, device_scale_factor=3)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(3000)
        ok('Phone starts in performance mode', await pg.evaluate("__studio.getState().quality") == 'low')
        await pg.get_by_role('button', name='Nova Vanguard').count()
        await pg.get_by_role('button', name='Customise').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('tab', name='Scene').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('radio', name='Gaming desk On a gaming desk · clothing on a wall rail').click(); await pg.wait_for_timeout(500)
        ok('Scene tab sets the environment', await pg.evaluate("__studio.getState().scene") == 'desk')
        await pg.screenshot(path='shots/mobile_scene_tab.png')
        await pg.get_by_role('tab', name='Brand Kit').click()
        await pg.get_by_label('Organisation name').fill('Keep Me FC'); await pg.wait_for_timeout(700)
        await pg.evaluate("__studio.getState().setMobilePanel(null)"); await pg.wait_for_timeout(400)
        # simulate the graphics memory loss
        await pg.evaluate("document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()"); await pg.wait_for_timeout(800)
        ok('Lost 3D view message shown', await pg.get_by_text('The 3D view stopped').count() == 1)
        ok('Offers download first (unsaved work)', await pg.get_by_role('button', name='Download project first').count() == 1)
        await pg.screenshot(path='shots/mobile_lost.png')
        await pg.get_by_role('button', name='Restart 3D view').click(); await pg.wait_for_timeout(3500)
        ok('3D view restarts without a page reload', await pg.locator('canvas').count() >= 1 and await pg.get_by_text('The 3D view stopped').count() == 0)
        ok('Work is kept after restart', await pg.evaluate("__studio.getState().brandKit.orgName") == 'Keep Me FC')
        ok('No errors', not errs, errs[:2])
        await b.close()
    for s, n, e in R: print(s, n, e if s == 'FAIL' else '')
    print(f"{sum(r[0]=='PASS' for r in R)}/{len(R)} passed")
asyncio.run(main())
