import os; os.makedirs('shots', exist_ok=True); os.makedirs('dl', exist_ok=True)
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
import asyncio, sys
from playwright.async_api import async_playwright
from PIL import Image
# args: list of product:view pairs
pairs=[a.split(':') for a in sys.argv[1].split(',')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':1440,'height':900})
        await pg.add_init_script("try{localStorage.setItem('mf-visited','1')}catch(e){}")
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button', name='Nova Vanguard').click(); await pg.wait_for_timeout(1200)
        tiles=[]
        for pid,view in pairs:
            await pg.evaluate(f"__studio.getState().selectProduct('{pid}')"); await pg.wait_for_timeout(500)
            await pg.wait_for_function("!document.querySelector('main [role=status]')", timeout=60000)
            await pg.wait_for_timeout(900)
            await pg.evaluate(f"__studio.getState().requestView('{view}')"); await pg.wait_for_timeout(1600)
            path=f'shots/m_{len(tiles)}.png'
            await pg.screenshot(path=path, clip={'x':390,'y':90,'width':630,'height':720}); tiles.append(path)
        cols=min(4,len(tiles)); w,h=420,480; rows=(len(tiles)+cols-1)//cols
        g=Image.new('RGB',(cols*w,rows*h))
        for i,t in enumerate(tiles): g.paste(Image.open(t).resize((w,h)),((i%cols)*w,(i//cols)*h))
        g.save('shots/multi.png'); print('\n'.join(errs) or 'ok')
        await b.close()
asyncio.run(main())
