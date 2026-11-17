"""Test D (save / refresh / import) + Test G (privacy network inspection) + project-file security.
Run:  python3 tests/e2e/serve_dist.py dist &   then   cd tests/e2e && python3 privacy_project_test.py
"""
import os, json, asyncio, base64
from urllib.parse import urlparse
from playwright.async_api import async_playwright
os.makedirs('shots', exist_ok=True); os.makedirs('dl', exist_ok=True)
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
URL = 'http://localhost:4173/'
R = []
def ok(name, cond, extra=''):
    R.append(('PASS' if cond else 'FAIL', name, str(extra)[:300]))

async def storage_snapshot(pg):
    return await pg.evaluate("""async () => ({
      ls: (()=>{try{return localStorage.length}catch(e){return -1}})(),
      ss: (()=>{try{return sessionStorage.length}catch(e){return -1}})(),
      idb: indexedDB.databases ? (await indexedDB.databases()).map(d=>d.name) : [],
      cookie: document.cookie,
      caches: 'caches' in self ? (await caches.keys()) : [],
      sw: navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0,
    })""")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        pg = await ctx.new_page()
        requests, posts, csp, errs = [], [], [], []
        pg.on('request', lambda r: (requests.append(r.url), posts.append((r.method, r.url)) if r.method not in ('GET', 'HEAD') else None))
        pg.on('console', lambda m: (csp.append(m.text) if 'Content Security Policy' in m.text else None, errs.append(m.text) if m.type == 'error' else None))
        pg.on('pageerror', lambda e: errs.append(str(e)))

        resp = await pg.goto(URL)
        ok('CSP header served', 'default-src' in (resp.headers.get('content-security-policy') or ''), resp.headers.get('content-security-policy'))
        await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(2500)
        s0 = await storage_snapshot(pg)
        ok('Nothing in browser storage on load', s0['ls'] == 0 and s0['ss'] == 0 and not s0['idb'] and not s0['cookie'] and not s0['caches'] and not s0['sw'], s0)
        ok('Starts clean (Saved to file badge)', await pg.get_by_role('status').filter(has_text='Saved to file').count() == 1)

        # ---- build a project ----
        await pg.get_by_role('tab', name='Brand Kit').click()
        await pg.get_by_label('Organisation name').fill('Red Rift Esports')
        await pg.get_by_label('Slogan').fill('Rise Together')
        await pg.get_by_role('tab', name='Graphics').click()
        await pg.set_input_files('input[aria-label="Upload logo file"]', 'files/team_logo.png'); await pg.wait_for_timeout(2000)
        await pg.get_by_role('tab', name='Brand Kit').click()
        logo_id = await pg.evaluate("__studio.getState().activeLogoId")
        await pg.get_by_label('Primary logo').select_option(logo_id)
        h = pg.get_by_label('Primary colour hex code'); await h.fill('#C8102E'); await h.press('Enter')
        await pg.get_by_role('button', name='Apply to this product').click(); await pg.wait_for_timeout(800)
        ok('Unsaved badge after edits', await pg.get_by_role('status').filter(has_text='Unsaved changes').count() == 1)
        ok('Brand kit applied to product', await pg.evaluate("__studio.getState().design.colors.primary") == '#c8102e')

        # layers: duplicate, lock, opacity, order
        await pg.get_by_role('tab', name='Graphics').click()
        n0 = await pg.evaluate("__studio.getState().design.layers.length")
        first = await pg.evaluate("__studio.getState().design.layers[0].id")
        await pg.get_by_role('button', name='Duplicate this layer').click(); await pg.wait_for_timeout(300)
        n1 = await pg.evaluate("__studio.getState().design.layers.length")
        ok('Duplicate layer', n1 == n0 + 1, (n0, n1))
        await pg.get_by_label('Opacity of selected layer').fill('0.5'); await pg.wait_for_timeout(300)
        sel = await pg.evaluate("(()=>{const s=__studio.getState();return s.design.layers.find(l=>l.id===s.selectedLayerId)})()")
        ok('Opacity set on selected layer', abs(sel['opacity'] - 0.5) < 0.01, sel['opacity'])
        await pg.get_by_role('button', name='Align left').click(); await pg.wait_for_timeout(200)
        ok('Align left', await pg.evaluate("(()=>{const s=__studio.getState();return s.design.layers.find(l=>l.id===s.selectedLayerId).offsetX})()") == -1)
        await pg.get_by_role('button', name='Centre', exact=True).click(); await pg.wait_for_timeout(200)
        ok('Centre', await pg.evaluate("(()=>{const s=__studio.getState();const l=s.design.layers.find(l=>l.id===s.selectedLayerId);return l.offsetX===0&&l.offsetY===0})()"))
        lock_btn = pg.locator('button[aria-label^="Lock "]').first
        await lock_btn.click(); await pg.wait_for_timeout(200)
        locked = await pg.evaluate("__studio.getState().design.layers.filter(l=>l.locked).map(l=>l.id)")
        await pg.evaluate(f"__studio.getState().updateLayer('{locked[0]}', {{offsetX: 0.7}})")
        ok('Locked layer cannot move', await pg.evaluate(f"__studio.getState().design.layers.find(l=>l.id==='{locked[0]}').offsetX") != 0.7)
        order0 = await pg.evaluate("__studio.getState().design.layers.map(l=>l.id)")
        await pg.locator('button[aria-label^="Send "]').first.click(); await pg.wait_for_timeout(200)
        order1 = await pg.evaluate("__studio.getState().design.layers.map(l=>l.id)")
        ok('Layer order changes', order0 != order1 and sorted(order0) == sorted(order1))

        # text
        await pg.get_by_role('tab', name='Text').click()
        await pg.get_by_role('button', name='Add text').first.click(); await pg.wait_for_timeout(1000)
        ok('Text layer added', await pg.evaluate("__studio.getState().design.layers.some(l=>l.text)"))

        # undo / redo
        before = await pg.evaluate("__studio.getState().design.layers.length")
        await pg.get_by_role('button', name='Undo (Ctrl+Z)').click(); await pg.wait_for_timeout(300)
        after_undo = await pg.evaluate("__studio.getState().design.layers.length")
        await pg.keyboard.press('Control+y'); await pg.wait_for_timeout(300)
        after_redo = await pg.evaluate("__studio.getState().design.layers.length")
        ok('Undo removes text layer, Ctrl+Y restores it', after_undo == before - 1 and after_redo == before, (before, after_undo, after_redo))

        # collection
        await pg.get_by_role('button', name='Add this product to My collection').click(); await pg.wait_for_timeout(4000)
        await pg.evaluate("__studio.getState().selectProduct('cap')"); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button', name='Add this product to My collection').click(); await pg.wait_for_timeout(4000)
        n_coll = await pg.evaluate("__studio.getState().collection.length")
        ok('Two products in collection', n_coll == 2, n_coll)

        s1 = await storage_snapshot(pg)
        ok('Still nothing in browser storage after working', s1['ls'] == 0 and s1['ss'] == 0 and not s1['idb'] and not s1['cookie'], s1)

        # ---- download project ----
        async with pg.expect_download() as d:
            await pg.get_by_role('button', name='Download project file (Ctrl+S)').click()
        dlv = await d.value; path = 'dl/' + dlv.suggested_filename; await dlv.save_as(path)
        ok('Project file named .merchforge', path.endswith('.merchforge'), path)
        data = json.load(open(path))
        ok('Project file v2 contents', data['format'] == 'merchforge' and data['version'] == 2 and data['brandKit']['orgName'] == 'Red Rift Esports' and len(data['collection']) == 2 and len(data['images']) >= 1, {k: (v if not isinstance(v, (list, dict)) else len(v)) for k, v in data.items()})
        await pg.wait_for_timeout(500)
        ok('Badge shows Saved to file after download', await pg.get_by_role('status').filter(has_text='Saved to file').count() == 1)

        # ---- refresh: nothing persists ----
        await pg.reload(); await pg.wait_for_selector('canvas'); await pg.wait_for_timeout(2000)
        st = await pg.evaluate("(()=>{const s=__studio.getState();return {c:s.collection.length,l:Object.keys(s.logos).length,org:s.brandKit.orgName}})()")
        ok('Refresh does not restore work (no hidden autosave)', st == {'c': 0, 'l': 0, 'org': ''}, st)

        # ---- import ----
        await pg.set_input_files('input[aria-label="Choose a project file to import"]', path); await pg.wait_for_timeout(3000)
        st = await pg.evaluate("(()=>{const s=__studio.getState();return {c:s.collection.length,l:Object.keys(s.logos).length,org:s.brandKit.orgName,slogan:s.brandKit.slogan,name:s.projectName,text:s.collection.concat([s.design]).some(d=>d.layers.some(l=>l.text)),locked:s.collection.concat([s.design]).some(d=>d.layers.some(l=>l.locked)),dirty:s.dirty,undo:s.canUndo}})()")
        ok('Import restores collection, logos, brand kit, editable text, locks', st['c'] == 2 and st['l'] >= 1 and st['org'] == 'Red Rift Esports' and st['slogan'] == 'Rise Together' and st['text'] and st['locked'], st)
        ok('Import is a clean state (not dirty, no undo into previous project)', not st['dirty'] and not st['undo'], st)
        await pg.screenshot(path='shots/after_import.png')

        # ---- malicious / broken files ----
        evil = {
            'format': 'merchforge', 'version': 2, 'projectName': '<img src=x onerror=window.__pwned=1>',
            'brandKit': {'orgName': '<script>window.__pwned=1</script>', 'primary': 'javascript:alert(1)', 'primaryLogoId': 'x'},
            'images': [
                {'id': 'bad1', 'dataUrl': 'data:image/svg+xml;base64,' + base64.b64encode(b'<svg onload="window.__pwned=1"/>').decode()},
                {'id': 'bad2', 'dataUrl': 'javascript:window.__pwned=1'},
                {'id': 'bad3', 'dataUrl': 'data:image/png;base64,AAAAAAAA'},
                {'id': '../../etc', 'dataUrl': 'data:image/png;base64,iVBORw0KGgo='},
            ],
            'current': {'productId': '__proto__', 'layers': []},
            'collection': [{'productId': 'hoodie', 'colors': {'primary': 'red;background:url(http://evil)'}, 'layers': [{'zoneId': 'chest', 'logoId': 'bad1', 'scale': 1e9, 'text': {'content': 'A' * 5000, 'font': 'http://evil/font'}}]}],
            'drafts': 'nope', 'portfolio': {'products': {'__proto__': {'why': 'x'}}},
            '__proto__': {'polluted': True},
        }
        open('dl/evil.merchforge', 'w').write(json.dumps(evil))
        await pg.set_input_files('input[aria-label="Choose a project file to import"]', 'dl/evil.merchforge')
        await pg.wait_for_timeout(500)
        if await pg.get_by_role('button', name='Discard and open').count():
            pass
        await pg.wait_for_timeout(2500)
        st = await pg.evaluate("""(()=>{const s=__studio.getState();const d=s.collection[0];return {
            pwned: !!window.__pwned, polluted: ({}).polluted === true, logos: Object.keys(s.logos),
            primary: s.brandKit.primary, name: s.projectName, prod: s.design.productId,
            c0: d && {primary: d.colors.primary, scale: d.layers[0] && d.layers[0].scale, len: d.layers[0] && d.layers[0].text.content.length, font: d.layers[0] && d.layers[0].text.font, logo: d.layers[0] && d.layers[0].logoId}}})()""")
        ok('Malicious project: no code runs, no prototype pollution', not st['pwned'] and not st['polluted'], st)
        ok('Malicious project: bad images/ids/colours/values rejected or clamped', st['logos'] == [] and st['primary'].startswith('#') and st['c0']['primary'].startswith('#') and st['c0']['scale'] <= 6 and st['c0']['len'] <= 32 and st['c0']['font'] == 'orbitron' and st['c0']['logo'] is None, st)
        name_in_dom = await pg.evaluate("document.querySelectorAll('img[src=\"x\"]').length")
        ok('Project name rendered as text, not HTML', name_in_dom == 0)

        print('DEBUG errs', errs[-5:]); await pg.screenshot(path='shots/after_evil.png')
        open('dl/notjson.merchforge', 'w').write('this is not json')
        await pg.set_input_files('input[aria-label="Choose a project file to import"]', 'dl/notjson.merchforge'); await pg.wait_for_timeout(800)
        toast = await pg.locator('[role=status], [role=alert]').all_inner_texts()
        ok('Invalid file gives friendly error', any('not a Merch Forge project' in t for t in toast), toast)

        # ---- beforeunload warning when dirty ----
        await pg.get_by_label('Project name').fill('Changed name'); await pg.wait_for_timeout(700)
        dialogs = []
        async def on_dialog(dg):
            dialogs.append(dg.type); await dg.dismiss()
        pg.on('dialog', lambda dg: asyncio.ensure_future(on_dialog(dg)))
        await pg.close(run_before_unload=True); await asyncio.sleep(1.5)
        ok('Leave-page warning when there are unsaved changes', 'beforeunload' in dialogs, dialogs)

        # ---- network inspection ----
        hosts = sorted({urlparse(u).netloc for u in requests if not u.startswith(('data:', 'blob:'))})
        ok('All requests go to this site only', hosts == ['localhost:4173'], hosts)
        ok('No POST/PUT requests (nothing uploaded)', not posts, posts)
        ok('No CSP violations', not csp, csp[:3])
        ok('No JS errors', not [e for e in errs if 'Content Security Policy' not in e and 'WebGL' not in e and 'GPU' not in e], errs[:5])
        await b.close()
    w = max(len(n) for _, n, _ in R)
    for s, n, e in R: print(f'{s}  {n.ljust(w)}  {e if s == "FAIL" else ""}')
    print(f"\n{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")

asyncio.run(main())
