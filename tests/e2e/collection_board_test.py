"""Test C (collection of 5 + boards) and Test E (ZIP) and environment exports."""
import os, io, zipfile, asyncio
from playwright.async_api import async_playwright
from PIL import Image
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
os.makedirs('shots', exist_ok=True); os.makedirs('dl', exist_ok=True)
R = []
def ok(n, c, e=''): R.append(('PASS' if c else 'FAIL', n, str(e)[:260]))
async def dl(pg, action, timeout=300000):
    async with pg.expect_download(timeout=timeout) as d:
        await action()
    v = await d.value; path = 'dl/' + v.suggested_filename; await v.save_as(path); return path
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(2000)
        await pg.set_input_files('input[aria-label="Upload logo file"]', 'files/team_logo.png'); await pg.wait_for_timeout(1500)
        await pg.get_by_role('tab', name='Brand Kit').click()
        await pg.get_by_label('Organisation name').fill('Blackpool Bolts')
        await pg.get_by_label('Primary logo').select_option(await pg.evaluate("__studio.getState().activeLogoId"))
        h = pg.get_by_label('Primary colour hex code'); await h.fill('#0E2A47'); await h.press('Enter')
        h = pg.get_by_label('Secondary colour hex code'); await h.fill('#FF7A1A'); await h.press('Enter')
        await pg.get_by_label('Slogan').fill('Strike First')
        await pg.get_by_label('Design rationale (printed on the collection board)').fill('Navy and orange reflect the seaside town and its illuminations. The bolt logo stays on the chest for instant recognition.')
        for pid in ['hoodie', 'jersey', 'cap', 'travel-mug', 'extended-mousemat']:
            await pg.get_by_label('Product', exact=True).select_option(pid); await pg.wait_for_timeout(600)
            await pg.wait_for_function("!document.querySelector('main [role=status]')", timeout=90000); await pg.wait_for_timeout(1200)
            await pg.get_by_role('button', name='Apply to this product').click(); await pg.wait_for_timeout(800)
            await pg.get_by_role('button', name='Add this product to My collection').click(); await pg.wait_for_timeout(3500)
        n = await pg.evaluate("__studio.getState().collection.length")
        ok('Collection of 5 products', n == 5, n)
        await pg.get_by_role('button', name='My collection (5 saved)').click(); await pg.wait_for_timeout(500)
        first = pg.locator('input[aria-label^="Rename"]').first
        await first.fill('Bolts Home Hoodie'); await pg.wait_for_timeout(200)
        await pg.locator('button[aria-label^="Duplicate"]').nth(1).click(); await pg.wait_for_timeout(300)
        await pg.locator('button[aria-label$="later"]').first.click(); await pg.wait_for_timeout(300)
        st = await pg.evaluate("__studio.getState().collection.map(c=>[c.title,c.productId])")
        ok('Rename, duplicate and reorder in collection', st[0][1] == 'jersey' and st[1][0] == 'Bolts Home Hoodie' and len(st) == 6 and st[2][0].endswith('copy'), st)
        await pg.locator('button[aria-label^="Delete"]').nth(3).click(); await pg.get_by_role('button', name='Delete', exact=True).click(); await pg.wait_for_timeout(300)
        ok('Remove from collection', await pg.evaluate("__studio.getState().collection.length") == 5)
        await pg.get_by_role('button', name='Apply Brand Kit to all').click(); await pg.wait_for_timeout(300)
        prim = await pg.evaluate("__studio.getState().collection.map(c=>c.colors.primary)")
        ok('Brand Kit applied to whole collection', all(c == '#0e2a47' for c in prim), prim)
        # ZIP (Test E)
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download collection (ZIP)').click())
        z = zipfile.ZipFile(path); names = z.namelist()
        pngs = [n for n in names if n.endswith('.png')]
        ok('ZIP: 5 products × 2 views + sheets + README, correctly named', len(pngs) == 12 and any('ContactSheet' in n for n in names) and any(n.endswith('README.txt') for n in names) and all(n.startswith('Blackpool-Bolts_Collection/') for n in names), names[:6])
        sizes = {Image.open(io.BytesIO(z.read(n))).size for n in pngs if 'Sheet' not in n}
        ok('ZIP images are square 2048 renders (not stretched)', sizes == {(2048, 2048)}, sizes)
        # Board
        await pg.get_by_role('button', name='Collection board').click(); await pg.wait_for_timeout(400)
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download board (PNG)').click())
        im = Image.open(path); im.convert('RGB').resize((1280, 720)).save('shots/board_16x9.jpg')
        ok('Collection board 16:9 (3840×2160)', im.size == (3840, 2160) and path.endswith('Blackpool-Bolts_CollectionBoard_16x9.png'), (path, im.size))
        await pg.get_by_role('radio', name='A3 landscape (4961 × 3508, 300 dpi)').click(); await pg.get_by_role('radio', name='Dark').click()
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download board (PNG)').click())
        im = Image.open(path); im.convert('RGB').resize((1240, 877)).save('shots/board_a3.jpg')
        ok('Collection board A3 landscape (4961×3508)', im.size == (4961, 3508), im.size)
        ok('Board preview shown', await pg.locator('img[alt="Preview of the downloaded collection board"]').count() == 1)
        await pg.keyboard.press('Escape')
        # Environments + resolutions + JPG
        await pg.get_by_role('button', name='Export designs').click(); await pg.wait_for_timeout(300)
        envs = ['White studio', 'Dark studio', 'Gaming desk', 'Esports stage', 'Clothing display', 'Merch exhibition', 'Minimalist']
        tiles = []
        for i, e in enumerate(envs):
            await pg.get_by_role('radio', name=e, exact=True).click(); await pg.wait_for_timeout(700)
            await pg.get_by_role('radio', name=['1920 × 1080 (HD)', '2560 × 1440 (QHD)', '3840 × 2160 (4K)'][i % 3]).click()
            await pg.get_by_role('radio', name='JPG' if i % 2 else 'PNG').click()
            path = await dl(pg, lambda: pg.get_by_role('button', name='Download JPG (current view)' if i % 2 else 'Download PNG (current view)').click())
            im = Image.open(path); tiles.append(im.convert('RGB').resize((480, 270)))
            want = [(1920, 1080), (2560, 1440), (3840, 2160)][i % 3]
            ok(f'{e}: {want[0]}×{want[1]} {"JPG" if i % 2 else "PNG"}', im.size == want and path.endswith('.jpg' if i % 2 else '.png'), (path, im.size))
        g = Image.new('RGB', (480 * 4, 270 * 2), 'white')
        for i, t in enumerate(tiles): g.paste(t, ((i % 4) * 480, (i // 4) * 270))
        g.save('shots/environments.jpg')
        await pg.get_by_role('radio', name='PNG').click()
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download transparent PNG').click())
        im = Image.open(path)
        ok('Product-only transparent PNG', im.mode == 'RGBA' and im.getpixel((5, 5))[3] == 0, (path, im.mode))
        ok('No errors', not errs, errs[:3])
        await b.close()
    for s, n, e in R: print(s, n, e if s == 'FAIL' else '')
    print(f"{sum(r[0]=='PASS' for r in R)}/{len(R)} passed")
asyncio.run(main())
