import os; os.makedirs('shots', exist_ok=True); os.makedirs('dl', exist_ok=True)
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
import asyncio
from playwright.async_api import async_playwright
from PIL import Image
SC=['studio-light','studio-dark','neon','retro','arena','pop']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        ctx = await b.new_context(viewport={'width':1440,'height':900}, accept_downloads=True); pg=await ctx.new_page()
        await pg.add_init_script("try{localStorage.setItem('mf-visited','1')}catch(e){}")
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button', name='Nova Vanguard').click(); await pg.wait_for_timeout(1000)
        await pg.evaluate("__studio.getState().setProject({orgName:'Nova Vanguard'})")
        await pg.evaluate("__studio.getState().selectProduct('hoodie')"); await pg.wait_for_timeout(3500)
        await pg.evaluate("__studio.getState().setColor('primary','#1d2b4f')"); await pg.wait_for_timeout(800)
        tiles=[]
        for sc in SC:
            await pg.evaluate(f"__studio.getState().setScene('{sc}')"); await pg.wait_for_timeout(2200)
            pth=f'shots/sc_{sc}.png'; await pg.screenshot(path=pth, clip={'x':320,'y':56,'width':768,'height':844}); tiles.append(pth)
        g=Image.new('RGB',(6*384,422))
        for i,t in enumerate(tiles): g.paste(Image.open(t).resize((384,422)),(i*384,0))
        g.save('shots/scenes_grid.png')
        # exports with each background (neon scene + others)
        outs=[]
        for sc,bg in [('neon','scene'),('retro','scene'),('arena','scene'),('pop','scene'),('studio-light','brand'),('studio-light','black'),('studio-light','white'),('studio-light','transparent')]:
            await pg.evaluate(f"__studio.getState().setScene('{sc}'); __studio.getState().setExportBackground('{bg}')"); await pg.wait_for_timeout(1200)
            async with pg.expect_download() as d: await pg.get_by_role('button', name='Download image (PNG)').click()
            f=await d.value; pth=f'dl/bg_{sc}_{bg}.png'; await f.save_as(pth); outs.append(pth); await pg.wait_for_timeout(500)
        g=Image.new('RGB',(4*400,2*400),(255,0,255))
        for i,t in enumerate(outs):
            im=Image.open(t).convert('RGBA').resize((400,400))
            bgc=Image.new('RGBA',(400,400),(200,200,200,255)) 
            # checkerboard for transparent
            for yy in range(0,400,20):
                for xx in range(0,400,20):
                    if (xx//20+yy//20)%2: bgc.paste((235,235,235,255),(xx,yy,xx+20,yy+20))
            bgc.alpha_composite(im); g.paste(bgc.convert('RGB'),((i%4)*400,(i//4)*400))
        g.save('shots/exports_grid.png')
        print('\n'.join(e for e in errs if 'GL Driver' not in e) or 'no errors')
        await b.close()
asyncio.run(main())
