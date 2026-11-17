import os; os.makedirs('shots', exist_ok=True); os.makedirs('dl', exist_ok=True)
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
import asyncio
from playwright.async_api import async_playwright
from PIL import Image
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        ctx = await b.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True); pg=await ctx.new_page()
        await pg.add_init_script("try{localStorage.setItem('mf-visited','1')}catch(e){}")
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button', name='Nova Vanguard').click(); await pg.wait_for_timeout(1000)
        shots=[]
        async def snap(name, view='three-quarter'):
            await pg.evaluate(f"__studio.getState().requestView('{view}')"); await pg.wait_for_timeout(1800)
            pth=f'shots/tx_{name}.png'; await pg.screenshot(path=pth, clip={'x':390,'y':90,'width':630,'height':720}); shots.append(pth)
        # 1 jersey: gamer tag + number on back, team name front
        await pg.evaluate("__studio.getState().selectProduct('jersey')"); await pg.wait_for_timeout(3000)
        await pg.get_by_role('tab', name='Project').click(); await pg.get_by_label('Esports organisation name').fill('Nova Vanguard')
        await pg.get_by_role('tab', name='Text').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button', name='Gamer tag + number').click(); await pg.wait_for_timeout(500)
        await pg.get_by_role('button', name='GAMERTAG').click(); await pg.wait_for_timeout(300); await pg.get_by_role('textbox', name='Text', exact=True).fill('SHADOWBYTE'); await pg.wait_for_timeout(1500)
        await snap('jersey_back','back')
        await pg.get_by_role('button', name='Curved crest text').click(); await pg.wait_for_timeout(1500)
        await pg.evaluate("(()=>{const s=__studio.getState(); const l=s.design.layers.find(x=>x.text&&x.text.arc>0); s.updateLayer(l.id,{zoneId:'centre-front',offsetY:0.9,scale:1.1})})()"); await pg.wait_for_timeout(1500)
        await snap('jersey_front','front')
        # 2 hoodie: uploaded seamless pattern tile + team name text
        await pg.evaluate("__studio.getState().selectProduct('hoodie')"); await pg.wait_for_timeout(3000)
        await pg.get_by_role('tab', name='Colours').click()
        await pg.set_input_files('input[aria-label="Upload pattern image"]', 'files/student_pattern.png'); await pg.wait_for_timeout(2500)
        await pg.get_by_role('tab', name='Text').click()
        await pg.get_by_role('button', name='Slogan').click(); await pg.wait_for_timeout(1500)
        await snap('hoodie_pattern')
        # 3 mouse mat: artwork fill + text
        await pg.evaluate("__studio.getState().selectProduct('extended-mousemat')"); await pg.wait_for_timeout(3000)
        await pg.get_by_role('tab', name='Colours').click()
        await pg.set_input_files('input[aria-label="Upload pattern image"]', 'files/artwork.jpg'); await pg.wait_for_timeout(1500)
        await pg.get_by_role('radio', name='One big print').click(); await pg.wait_for_timeout(1500)
        await pg.get_by_role('tab', name='Text').click()
        await pg.get_by_role('button', name='Team name').click(); await pg.wait_for_timeout(1500)
        await snap('mat_fill')
        # 4 mug with text only
        await pg.evaluate("__studio.getState().selectProduct('mug')"); await pg.wait_for_timeout(3000)
        await pg.get_by_role('tab', name='Text').click()
        await pg.get_by_role('button', name='Curved crest text').click(); await pg.wait_for_timeout(1500)
        await snap('mug_text','front')
        # export check: hoodie with pattern + text renders and downloads
        await pg.evaluate("__studio.getState().selectProduct('hoodie')"); await pg.wait_for_timeout(3000)
        async with pg.expect_download() as d: await pg.get_by_role('button', name='Download image (PNG)').click()
        f=await d.value; await f.save_as('dl/hoodie_custom.png'); print('export', Image.open('dl/hoodie_custom.png').size, f.suggested_filename)
        # panel screenshot
        await pg.get_by_role('tab', name='Text').click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/tx_panel.png', clip={'x':1088,'y':56,'width':352,'height':944})
        g=Image.new('RGB',(4*420,480))
        for i,t in enumerate(shots[:4]): g.paste(Image.open(t).resize((420,480)),(i*420,0))
        g.save('shots/tx_grid.png')
        g2=Image.new('RGB',(2*420,480))
        for i,t in enumerate(shots[4:6]): g2.paste(Image.open(t).resize((420,480)),(i*420,0))
        g2.save('shots/tx_grid2.png')
        print('\n'.join(errs) or 'no errors')
        await b.close()
asyncio.run(main())
