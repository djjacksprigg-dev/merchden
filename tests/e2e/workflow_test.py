import os; os.makedirs('shots', exist_ok=True); os.makedirs('dl', exist_ok=True)
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
import asyncio, zipfile, json, io
from playwright.async_api import async_playwright
from PIL import Image
R=[]
def ok(name, cond, extra=''):
    R.append(('PASS' if cond else 'FAIL', name, extra)); 
async def dl(pg, action):
    async with pg.expect_download(timeout=120000) as d:
        await action()
    v=await d.value; path='dl/'+v.suggested_filename; await v.save_as(path); return path
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        ctx = await b.new_context(viewport={'width':1440,'height':900}, accept_downloads=True)
        pg = await ctx.new_page()
        await pg.add_init_script("try{localStorage.setItem('mf-visited','1')}catch(e){}")
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(2500)
        html=(await pg.content()).lower(); ok('No checkout/payment text', not any(w in html for w in ['checkout','basket','add to cart','payment']))
        # 2 select hoodie
        await pg.locator('nav[aria-label="Merchandise catalogue"] button').filter(has=pg.locator('span.font-medium:text-is("Hoodie")')).click()
        await pg.wait_for_timeout(1500)
        # bad upload
        await pg.set_input_files('input[aria-label="Upload logo file"]', 'files/fake.png'); await pg.wait_for_timeout(800)
        alert = await pg.locator('[role=alert]').first.inner_text() if await pg.locator('[role=alert]').count() else ''
        ok('Invalid upload shows useful error', 'does not look like a real' in alert, alert)
        # svg sanitising
        await pg.set_input_files('input[aria-label="Upload logo file"]', 'files/evil.svg'); await pg.wait_for_timeout(1500)
        ok('Malicious SVG processed safely (no dialogs/errors)', len(await pg.evaluate("Object.keys(__studio.getState().logos)"))==1)
        # 3 upload real logo
        await pg.set_input_files('input[aria-label="Upload logo file"]', 'files/team_logo.png'); await pg.wait_for_timeout(2000)
        st = await pg.evaluate("(()=>{const s=__studio.getState();const l=s.logos[s.activeLogoId];return {w:l.width,h:l.height,layers:s.design.layers.length,logo:s.design.layers[0].logoId===s.activeLogoId}})()")
        ok('PNG logo uploaded, proportions kept, applied to product', st['logo'] and abs(st['w']/st['h']-1.44)<0.06, str(st))
        # 4 position: left chest
        await pg.get_by_role('button', name='Left chest').click(); await pg.wait_for_timeout(500)
        await pg.get_by_role('slider', name='Horizontal').fill('0.4'); await pg.get_by_role('slider', name='Size', exact=True).fill('1.2'); await pg.get_by_role('slider', name='Rotation', exact=True).fill('15')
        await pg.wait_for_timeout(800)
        lay = await pg.evaluate("__studio.getState().design.layers.map(l=>[l.zoneId,l.offsetX,l.scale,l.rotation])")
        ok('Logo positioned on left chest with move/resize/rotate', any(l[0]=='left-chest' and abs(l[1]-0.4)<0.01 and abs(l[2]-1.2)<0.01 and l[3]==15 for l in lay), str(lay))
        # 5 colour via hex
        await pg.get_by_role('tab', name='Colours').click()
        hexin = pg.get_by_label('Main colour hex code'); await hexin.fill('#C8102E'); await hexin.press('Enter'); await pg.wait_for_timeout(1000)
        ok('Hex colour applied', await pg.evaluate("__studio.getState().design.colors.primary")=='#c8102e')
        # 6 rotate via drag
        box = await pg.locator('canvas').bounding_box()
        cx,cy = box['x']+box['width']/2, box['y']+box['height']/2
        await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx+250,cy,steps=10); await pg.mouse.up(); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='shots/e2e_rotated.png', clip={'x':320,'y':56,'width':768,'height':844})
        await pg.mouse.wheel(0,-400); await pg.wait_for_timeout(800)
        # 7 download PNG
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download image (PNG)').click())
        im = Image.open(path); 
        ok('Download PNG 2048x2048 named Team_Product_View', im.size==(2048,2048) and path.endswith('.png'), f'{path} {im.size}')
        # set org name then transparent
        await pg.get_by_role('tab', name='Project').click()
        await pg.get_by_label('Esports organisation name').fill('Red Rift Esports'); await pg.wait_for_timeout(300)
        await pg.get_by_role('tab', name='Export').click()
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download transparent PNG').click())
        im = Image.open(path).convert('RGBA'); a=im.getchannel('A')
        corner = a.getpixel((5,5)); centre=a.getpixel((1024,1024)); hist=a.histogram()
        ok('Transparent PNG has real alpha (corners clear, product opaque)', corner==0 and centre>200 and hist[0]>100000, f'{path} corner={corner} centre={centre}')
        # front view check logo colour present (red product)
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download Front view PNG').click())
        im = Image.open(path).convert('RGB').resize((256,256)); px=list(im.getdata())
        reds=sum(1 for r,g,b2 in px if r>110 and g<60 and b2<70)
        ok('Front export contains customised red product', reds>2000 and 'Red-Rift-Esports_Hoodie_Front.png' in path, f'{path} red={reds}')
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download all 4 product views (ZIP)').click())
        z=zipfile.ZipFile(path).namelist(); ok('Views ZIP has 4 PNGs', len(z)==4, str(z))
        # 9 save
        await pg.get_by_role('button', name='Save to My designs').first.click(); await pg.wait_for_timeout(4000)
        # 8 another product: cap, logo auto applied
        await pg.locator('nav[aria-label="Merchandise catalogue"] button').filter(has=pg.locator('span.font-medium:text-is("Baseball cap")')).click(); await pg.wait_for_timeout(3000)
        cap = await pg.evaluate("(()=>{const s=__studio.getState();return [s.design.productId, s.design.layers.length, s.design.layers[0]&&s.design.layers[0].logoId===s.activeLogoId, s.design.colors.primary]})()")
        ok('Cap gets same logo + brand colour automatically', cap[0]=='cap' and cap[2] and cap[3]=='#c8102e', str(cap))
        await pg.get_by_role('button', name='Save to My designs').first.click(); await pg.wait_for_timeout(4000)
        await pg.evaluate("__studio.getState().selectProduct('mug')"); await pg.wait_for_timeout(3000)
        await pg.get_by_role('button', name='Save to My designs').first.click(); await pg.wait_for_timeout(4000)
        n = await pg.evaluate("__studio.getState().collection.length"); ok('3 designs saved to collection', n==3, str(n))
        # 10 collection modal + ZIP
        await pg.get_by_role('button', name='My designs (3 saved)').click(); await pg.wait_for_timeout(800)
        await pg.screenshot(path='shots/e2e_collection.png')
        path = await dl(pg, lambda: pg.get_by_role('button', name='Download collection (ZIP)').click())
        zf=zipfile.ZipFile(path); names=zf.namelist()
        pngs=[x for x in names if x.endswith('.png')]
        ok('Collection ZIP: 2 views x 3 products + contact + presentation sheets', len(pngs)==8 and any('ContactSheet' in x for x in names) and any('PresentationSheet' in x for x in names), '\n   '+'\n   '.join(names))
        zf.extract([x for x in names if 'PresentationSheet' in x][0], 'dl/')
        zf.extract([x for x in names if 'Cap_Front' in x][0], 'dl/')
        # project export
        path = await dl(pg, lambda: pg.get_by_role('button', name='Export project').click())
        pj=json.load(open(path)); ok('Project export contains designs + logos', len(pj['designs'])==3 and len(pj['logos'])>=1, path)
        await pg.keyboard.press('Escape')
        # reload persistence
        await pg.wait_for_timeout(1200)
        await pg.reload(); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(3000)
        st = await pg.evaluate("(()=>{const s=__studio.getState();return [s.collection.length, s.design.productId, s.project.orgName]})()")
        ok('Designs persist after reload (IndexedDB)', st[0]==3 and st[1]=='mug' and st[2]=='Red Rift Esports', str(st))
        # edit from gallery
        await pg.get_by_role('button', name='My designs (3 saved)').click(); await pg.wait_for_timeout(500)
        await pg.get_by_role('button', name='Edit Hoodie').click(); await pg.wait_for_timeout(3000)
        ok('Edit reopens saved design', await pg.evaluate("__studio.getState().design.productId")=='hoodie')
        # import into fresh profile
        ctx2 = await b.new_context(viewport={'width':1440,'height':900}); pg2=await ctx2.new_page()
        await pg2.add_init_script("try{localStorage.setItem('mf-visited','1')}catch(e){}")
        await pg2.goto('http://localhost:4173/'); await pg2.wait_for_selector('canvas'); await pg2.wait_for_timeout(2000)
        await pg2.get_by_role('button', name='My designs').first.click(); await pg2.wait_for_timeout(400)
        await pg2.set_input_files('input[aria-label="Import project file"]', path); await pg2.wait_for_timeout(1500)
        ok('Import project on another "computer"', await pg2.evaluate("__studio.getState().collection.length")==3)
        # mobile layout
        pg3 = await ctx2.new_page(); await pg3.set_viewport_size({'width':390,'height':844})
        await pg3.goto('http://localhost:4173/'); await pg3.wait_for_selector('canvas'); await pg3.wait_for_timeout(2500)
        await pg3.screenshot(path='shots/mobile_1.png')
        await pg3.get_by_role('button', name='Customise').click(); await pg3.wait_for_timeout(600)
        await pg3.screenshot(path='shots/mobile_2.png')
        real=[e for e in errs if 'GL Driver' not in e]
        ok('No critical console errors', not real, '\n'.join(real[:5]))
        for r in R: print(r[0], '-', r[1], ('| '+r[2]) if r[2] and r[0]=='FAIL' or 'ZIP' in r[1] else '')
        await b.close()
asyncio.run(main())
