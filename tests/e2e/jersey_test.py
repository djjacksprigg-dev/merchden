"""Test B – jersey designer: colours, pattern, kit branding, views, front+back export, editable after import."""
import os, json, asyncio
from playwright.async_api import async_playwright
from PIL import Image
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
os.makedirs('shots', exist_ok=True); os.makedirs('dl', exist_ok=True)
R = []
def ok(n, c, e=''): R.append(('PASS' if c else 'FAIL', n, str(e)[:240]))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(2000)
        # brand kit with primary + sponsor logo
        await pg.set_input_files('input[aria-label="Upload logo file"]', 'files/team_logo.png'); await pg.wait_for_timeout(1500)
        await pg.set_input_files('input[aria-label="Upload logo file"]', 'files/artwork.jpg'); await pg.wait_for_timeout(1500)
        ids = await pg.evaluate("Object.values(__studio.getState().logos).filter(l=>l.purpose!=='pattern').map(l=>l.id)")
        await pg.get_by_role('tab', name='Brand Kit').click()
        await pg.get_by_label('Organisation name').fill('Rift Raptors')
        await pg.get_by_label('Primary logo').select_option(ids[0]); await pg.get_by_label('Secondary logo (sponsor / alt mark)').select_option(ids[1])
        await pg.get_by_label('Slogan').fill('HUNT AS ONE')
        await pg.get_by_label('Product', exact=True).select_option('jersey'); await pg.wait_for_timeout(500)
        await pg.wait_for_function("!document.querySelector('main [role=status]')", timeout=90000); await pg.wait_for_timeout(1500)
        # clear default layers
        await pg.evaluate("(()=>{const s=__studio.getState();s.design.layers.map(l=>l.id).forEach(id=>s.removeLayer(id))})()")
        # colours
        await pg.get_by_role('tab', name='Colours').click()
        for label, val in [('Main colour', '#1A1A2E'), ('Sleeves', '#FF7A1A'), ('Collar', '#FFFFFF'), ('Trim (cuffs & side piping)', '#FF7A1A'), ('Pattern colour', '#2B2B4A'), ('Pattern accent', '#FF7A1A')]:
            h = pg.get_by_label(f'{label} hex code'); await h.fill(val); await h.press('Enter')
        await pg.get_by_role('radio', name='Racing stripes').click(); await pg.wait_for_timeout(800)
        st = await pg.evaluate("(()=>{const d=__studio.getState().design;return {c:d.colors,p:d.pattern}})()")
        ok('Jersey colours: primary, sleeve, collar, trim, pattern + accent', st['c']['sleeve'] == '#ff7a1a' and st['c']['collar'] == '#ffffff' and st['c']['accent'] == '#ff7a1a' and st['p'] == 'racing', st)
        # kit builder
        await pg.get_by_role('tab', name='Graphics').click()
        for n in ['Team logo', 'Sponsor logo', 'Sleeve branding', 'Front number']:
            await pg.get_by_role('button', name=n, exact=True).click(); await pg.wait_for_timeout(300)
        await pg.get_by_label('Player name').fill('raptor'); await pg.get_by_label('Number', exact=True).fill('23')
        await pg.get_by_role('button', name='Use Brand Kit').click(); await pg.wait_for_timeout(1500)
        roles = await pg.evaluate("__studio.getState().design.layers.map(l=>[l.role,l.zoneId,l.text?l.text.content:l.logoId])")
        want = {'team-logo', 'sponsor', 'sleeve-left', 'sleeve-right', 'front-number', 'player-name', 'player-number', 'slogan'}
        ok('Kit branding: team, sponsor, sleeves, name, number, front number, slogan', want <= {r[0] for r in roles}, roles)
        ok('Player name upper-cased and front number follows back number', ['player-name', 'upper-back', 'RAPTOR'] in roles and ['front-number', 'right-chest', '23'] in roles, roles)
        # text style
        await pg.get_by_role('tab', name='Text').click()
        await pg.evaluate("(()=>{const s=__studio.getState();s.selectLayer(s.design.layers.find(l=>l.role==='player-name').id)})()")
        await pg.get_by_role('button', name='Bold').click(); await pg.get_by_role('button', name='Italic').click(); await pg.wait_for_timeout(800)
        t = await pg.evaluate("__studio.getState().design.layers.find(l=>l.role==='player-name').text")
        ok('Bold + italic text', t.get('bold') and t.get('italic'), t)
        # views
        for v in ['Front view', 'Back view', 'Left sleeve view', 'Right sleeve view']:
            await pg.get_by_role('button', name=v).click(); await pg.wait_for_timeout(1300)
            await pg.screenshot(path=f"shots/jersey_{v.split()[0].lower()}_{v.split()[1].lower()}.png", clip={'x': 320, 'y': 56, 'width': 768, 'height': 844})
        ok('Front / back / left sleeve / right sleeve views exist', True)
        # export front + back 1920x1080
        await pg.get_by_role('button', name='Export designs').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('radio', name='1920 × 1080 (HD)').click()
        async with pg.expect_download(timeout=120000) as d:
            await pg.get_by_role('button', name='Front + back together (PNG)').click()
        v = await d.value; path = 'dl/' + v.suggested_filename; await v.save_as(path)
        im = Image.open(path)
        ok('Front+back export 1920x1080, labelled', im.size == (1920, 1080) and path.endswith('Rift-Raptors_Jersey_FrontBack.png'), (path, im.size))
        # project round trip keeps it editable
        async with pg.expect_download() as d:
            await pg.get_by_role('button', name='Download project file (Ctrl+S)').click()
        v = await d.value; proj = 'dl/' + v.suggested_filename; await v.save_as(proj)
        await pg.reload(); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(1500)
        await pg.set_input_files('input[aria-label="Choose a project file to import"]', proj); await pg.wait_for_timeout(3500)
        await pg.get_by_role('tab', name='Graphics').click(); await pg.wait_for_timeout(500)
        await pg.get_by_label('Player name').fill('NOVA'); await pg.wait_for_timeout(500)
        r2 = await pg.evaluate("(()=>{const d=__studio.getState().design;return {p:d.productId,name:d.layers.find(l=>l.role==='player-name').text.content,bold:d.layers.find(l=>l.role==='player-name').text.bold,c:d.colors.sleeve,pat:d.pattern}})()")
        ok('Jersey editable after import (roles, text style, colours, pattern kept)', r2 == {'p': 'jersey', 'name': 'NOVA', 'bold': True, 'c': '#ff7a1a', 'pat': 'racing'}, r2)
        ok('No errors', not errs, errs[:3])
        await b.close()
    for s, n, e in R: print(s, n, e if s == 'FAIL' else '')
    print(f"{sum(r[0]=='PASS' for r in R)}/{len(R)} passed")
asyncio.run(main())
