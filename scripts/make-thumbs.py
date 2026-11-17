"""Renders catalogue thumbnails from the real 3D models.
  npx vite --port 5174 &      (dev server, so the page can import the render service)
  python3 scripts/make-thumbs.py
Writes src/assets/thumbs/<product-id>.webp (96 x 96).
"""
import asyncio, base64, io, os, re, sys
from playwright.async_api import async_playwright
from PIL import Image
OUT = 'src/assets/thumbs'; os.makedirs(OUT, exist_ok=True)
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
BG = (233, 234, 238)
async def main():
    ids = re.findall(r"^\s{4}id: '([a-z0-9-]+)',", open('src/three/catalogue.ts').read(), re.M)
    only = sys.argv[1:]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        pg = await (await b.new_context(viewport={'width': 1440, 'height': 900})).new_page()
        await pg.goto('http://localhost:5174/'); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(4000)
        for pid in ids:
            if only and pid not in only: continue
            await pg.evaluate(f"__studio.getState().selectProduct('{pid}')"); await pg.wait_for_timeout(800)
            await pg.wait_for_function("!document.querySelector('main [role=status]')", timeout=90000)
            await pg.wait_for_timeout(1500)
            url = await pg.evaluate("""async () => { const m = await import('/src/three/renderService.ts'); return m.captureScene({ size: 384, transparent: true, view: 'three-quarter' }).toDataURL('image/png') }""")
            im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA')
            box = im.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
            if box: im = im.crop(box)
            side = int(max(im.size) * 1.12)
            canvas = Image.new('RGBA', (side, side), BG + (255,))
            canvas.alpha_composite(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2))
            canvas.convert('RGB').resize((96, 96), Image.LANCZOS).save(f'{OUT}/{pid}.webp', 'WEBP', quality=82, method=6)
            print('thumb', pid)
        await b.close()
asyncio.run(main())
