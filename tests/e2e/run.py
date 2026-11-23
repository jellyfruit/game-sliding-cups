#!/usr/bin/env python3
"""Browser end-to-end tests (Playwright + Chrome). Usage: python3 tests/e2e/run.py
Needs: pip install playwright, and Chrome (override the path with CHROME_PATH, default /usr/bin/google-chrome).
Starts its own local HTTP server (the service worker needs http); no network needed."""
import asyncio, functools, http.server, json, os, socketserver, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

VERSION = json.load(open(os.path.join(ROOT, 'package.json')))['version']
results, page_errors = [], []
def check(name, cond, detail=''):
    results.append((name, bool(cond))); print(('  ok  ' if cond else 'FAIL  ') + name + ('' if cond else '   ' + str(detail)))

async def new_page(browser, **ctx):
    c = await browser.new_context(**ctx); pg = await c.new_page()
    pg.on('pageerror', lambda e: page_errors.append(str(e)))
    return c, pg
async def enter(pg):                                   # the app opens on the title screen: tap Enter
    if await pg.evaluate("()=>window.__flow&&__flow.state==='title'"): await pg.click('[data-act="enter"]')
async def fresh(pg, query=''):
    await pg.goto(URL + query); await pg.evaluate('()=>localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(400); await enter(pg); await enter(pg)
flow = lambda pg: pg.evaluate('()=>__flow.state')
save = lambda pg: pg.evaluate("()=>JSON.parse(localStorage.getItem('slidingcups.save'))")
async def swipe(pg, dx=0):
    h = await pg.evaluate("()=>{const c=__game.held;if(!c)return null;const p=__project(c.x,c.y);const r=document.getElementById('c').getBoundingClientRect();return {x:p.sx+r.left,y:p.sy+r.top-8}}")
    if not h: return False
    await pg.mouse.move(h['x'], h['y']); await pg.mouse.down()
    for i in range(1, 6): await pg.mouse.move(h['x'] + dx, h['y'] - i * 50)
    await pg.mouse.up(); return True
async def force_loss(pg):
    await pg.evaluate("()=>{const g=__game;g.world.cups.push(SC.Physics.makeCup(g.world,0,2,100,800))}")
    await pg.wait_for_timeout(4300)
async def clear_level(pg):
    await pg.evaluate("()=>{const g=__game,P=SC.Physics,k=g.mode.goalKinds(g);for(const kind of k){g.world.cups.push(P.makeCup(g.world,kind,4,150,300),P.makeCup(g.world,kind,4,250,300));}g.phase='flying'}")
    await pg.wait_for_timeout(1500)

async def t_menu_flow(b):
    print('Menus and screen flow'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    check('opens on the menu', await flow(pg) == 'menu')
    await pg.click('[data-act="start:classic"]'); check('start Classic → playing', await flow(pg) == 'playing')
    await pg.click('#bPause'); check('pause → paused', await flow(pg) == 'paused')
    await pg.click('[data-act="resume"]'); check('resume → playing', await flow(pg) == 'playing')
    await force_loss(pg); await pg.wait_for_timeout(1300)
    check('cup resting inside the line too long → result screen', await flow(pg) == 'result' and await pg.evaluate("()=>__game.phase") == 'over')
    await pg.click('[data-act="restart"]'); check('play again → playing, phase=ready', await flow(pg) == 'playing' and await pg.evaluate("()=>__game.phase") == 'ready')
    await pg.click('#bPause'); await pg.click('[data-act="menu"]'); check('back to menu', await flow(pg) == 'menu')
    await pg.click('[data-act="start:practice"]'); check('Practice mode', await pg.evaluate("()=>__game.mode.id") == 'practice')
    await pg.wait_for_timeout(800)
    check('dragon sprites (with expressions) loaded', await pg.evaluate("()=>['dragon_t1','dragon_t6','dragon_t3_happy','dragon_t4_fast','dragon_t2_blink'].every(k=>__sprites.imgs[k]&&__sprites.imgs[k].ok)"))
    await c.close()

async def t_play_sound(b):
    print('Launch and sound'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.click('[data-act="start:practice"]')
    for i in range(4): await swipe(pg, (i % 3 - 1) * 20); await pg.wait_for_timeout(2300)
    st = await pg.evaluate('()=>__sfx.stats')
    check('launch, spawn and wall hits trigger sounds', st.get('launch', 0) >= 3 and st.get('spawn', 0) >= 3 and st.get('wall', 0) >= 1, st)
    await pg.click('#bSound'); before = json.dumps(await pg.evaluate('()=>__sfx.stats'))
    await pg.click('#bPause'); await pg.click('[data-act="resume"]')
    check('no sounds after muting', json.dumps(await pg.evaluate('()=>__sfx.stats')) == before)
    check('sound setting is saved', (await save(pg))['sound'] is False)
    await c.close()

async def t_progress(b):
    print('VP, unlocks and saves'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.click('[data-act="start:classic"]')
    await pg.evaluate('()=>{__game.score=5300;__game.kings=1}'); await force_loss(pg); await pg.wait_for_timeout(1300)
    check('VP banked after losing (5300 points + 1 king = 20 VP) plus best score', (await save(pg))['vp'] == 20 and (await save(pg))['best']['classic'] == 5300, await save(pg))
    await pg.click('[data-act="restart"]'); await pg.evaluate('()=>{__game.score=1000}'); await pg.click('#bPause'); await pg.click('[data-act="menu"]')
    check('quitting mid-run also banks (+2 VP)', (await save(pg))['vp'] == 22)
    await pg.click('[data-act="kinds"]'); check('unlock button disabled without enough VP', await pg.evaluate("()=>document.querySelector('[data-act=\"buy:2\"]').disabled"))
    await pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('slidingcups.save'));s.vp=150;localStorage.setItem('slidingcups.save',JSON.stringify(s))}")
    await pg.reload(); await pg.wait_for_timeout(400); await enter(pg); await pg.click('[data-act="kinds"]'); await pg.click('[data-act="buy:2"]')
    s = await save(pg); check('unlock 3rd creature: -100 VP', s['vp'] == 50 and s['unlocked'] == [0, 1, 2], s)
    await pg.click('[data-act="kind:2"]'); await pg.click('[data-act="menu"]'); await pg.click('[data-act="start:classic"]')
    check('selected creatures are used in the game', await pg.evaluate('()=>__game.kinds') == [0, 2])
    await pg.evaluate("()=>localStorage.setItem('slidingcups.save','{broken save')"); await pg.reload(); await pg.wait_for_timeout(400); await enter(pg)
    check('a corrupted save does not crash; back to a fresh player', await flow(pg) == 'menu')
    await c.close()

async def t_levels(b):
    print('Levels'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.click('[data-act="levels"]')
    check('chapters 1 and 2 listed (16 levels); only level 1 open', await pg.evaluate("()=>[...document.querySelectorAll('[data-act^=\"level:\"]')].map(e=>e.disabled).join()") == ','.join(['false'] + ['true'] * 15) and 'Chapter 2' in await pg.inner_text('#ov'))
    await pg.click('[data-act="level:0"]')
    check('level opens on a briefing card with the goal', await flow(pg) == 'brief' and 'Make a Knight' in await pg.inner_text('#ov'))
    await pg.click('[data-act="start"]'); await pg.wait_for_timeout(300)
    check('start → playing level 1 with its layout', await flow(pg) == 'playing' and await pg.evaluate("()=>[__game.level,__game.world.cups.length]") == [0, 2])
    await pg.click('#bPause'); check('pause shows the goal and progress', 'Make a Knight' in await pg.inner_text('#ov') and '0/1' in await pg.inner_text('#ov'))
    await pg.click('[data-act="resume"]')
    await pg.evaluate("()=>{__game.prog=1}"); await pg.wait_for_timeout(1300)
    s = await save(pg)
    check('clear → result with stars, first clear + star VP', await flow(pg) == 'result' and '★★★' in await pg.inner_text('#ov') and s['cleared'] == [0] and s['stars'][0] == 3 and s['vp'] == 20 + 20, s)
    await pg.click('[data-act="next"]'); check('next → briefing of level 2', await flow(pg) == 'brief' and await pg.evaluate('()=>__game.level') == 1)
    await pg.click('[data-act="start"]'); await pg.click('#bPause'); await pg.click('[data-act="restart"]'); check('restarting inside a level keeps the same level', await pg.evaluate('()=>__game.level') == 1)
    await pg.click('#bPause'); await pg.click('[data-act="levels"]'); await pg.click('[data-act="level:0"]'); await pg.click('[data-act="start"]')
    await pg.evaluate("()=>{__game.prog=1}"); await pg.wait_for_timeout(1300)
    check('replaying a cleared level gives no VP', (await save(pg))['vp'] == 40)
    await c.close()

async def t_language(b):
    print('Language'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    check('English by default', 'Classic' in await pg.inner_text('#ov'))
    await pg.click('[data-act="settings"]'); await pg.click('[data-act="lang"]'); await pg.click('[data-act="menu"]'); check('switch to Traditional Chinese', '傳統戰役' in await pg.inner_text('#ov') and await pg.evaluate('()=>document.documentElement.lang') == 'zh-Hant')
    await pg.reload(); await pg.wait_for_timeout(400); await enter(pg); check('still Traditional Chinese after reload', '傳統戰役' in await pg.inner_text('#ov'))
    await c.close()

async def t_pwa(b):
    print('PWA and offline'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await pg.goto(URL); await pg.wait_for_timeout(1500)
    check('service worker active', await pg.evaluate("async()=>{const r=await navigator.serviceWorker.ready;return r.active&&r.active.state}") == 'activated')
    check('version label and cache name match package.json', await pg.evaluate("async()=>(await caches.keys()).join()") == 'sc-' + VERSION and 'v' + VERSION in await pg.inner_text('#ver'))
    mf = await pg.evaluate("async()=>{const r=await fetch(document.querySelector('link[rel=manifest]').href);return r.json()}")
    check('manifest complete (name, standalone, icons)', mf['name'] and mf['display'] == 'standalone' and len(mf['icons']) >= 2)
    await c.set_offline(True); await pg.reload(); await pg.wait_for_timeout(800); await enter(pg)
    check('reload while offline still opens and can start a game', await pg.evaluate("()=>!!document.querySelector('[data-act=\"start:classic\"]')"))
    await pg.click('[data-act="start:classic"]'); check('playable offline', await flow(pg) == 'playing')
    await c.close()

async def t_iphone(b):
    print('iPhone touch and stability'); c, pg = await new_page(b, viewport={'width': 390, 'height': 760}, device_scale_factor=3, is_mobile=True, has_touch=True)
    await pg.goto(URL); await pg.evaluate('()=>localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(500); await enter(pg)
    await pg.tap('[data-act="start:classic"]'); await pg.wait_for_timeout(300); cdp = await c.new_cdp_session(pg)
    h = await pg.evaluate("()=>{const c=__game.held;const p=__project(c.x,c.y);const r=document.getElementById('c').getBoundingClientRect();return {x:p.sx+r.left,y:p.sy+r.top-6}}")
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': h['x'], 'y': h['y']}]})
    for i in range(1, 8):
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': h['x'], 'y': h['y'] - i * 30}]}); await asyncio.sleep(0.012)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(800)
    st = await pg.evaluate('()=>[__sfx.stats,__flow.state,__game.phase,__game.shots]'); check('touch can launch on a phone', st[0].get('launch', 0) >= 1, st)
    await pg.evaluate("()=>{document.getElementById('stage').style.display='none';window.dispatchEvent(new Event('resize'))}"); await pg.wait_for_timeout(300)
    await pg.evaluate("()=>{document.getElementById('stage').style.display='';window.dispatchEvent(new Event('resize'))}"); await pg.wait_for_timeout(500)
    moved = await pg.evaluate("()=>new Promise(r=>{const g=__game,c=SC.Physics.makeCup(g.world,0,0,300,500);c.vx=400;g.world.cups.push(c);const x0=c.x;setTimeout(()=>r(c.x!==x0),400)})")
    check('game loop survives a zero-size stage (the cause of the iOS home-screen freeze)', moved)
    await pg.evaluate("()=>window.dispatchEvent(new ErrorEvent('error',{message:'Script error.'}))")
    check("browser/extension 'Script error.' does not show the red error bar", not await pg.evaluate("()=>document.getElementById('err').style.display==='block'"))
    await pg.evaluate("()=>setTimeout(()=>{throw new Error('boom')},0)"); await pg.wait_for_timeout(200)
    check('real errors show in the red error bar (with version)', 'boom' in await pg.inner_text('#err'))
    page_errors[:] = [e for e in page_errors if 'boom' not in e]
    await c.close()

async def t_items(b):
    print('Items, equipment and unlocks'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.click('[data-act="start:classic"]'); await pg.wait_for_timeout(250)
    check('new player: no item bar and no ultimates yet (locked)', await pg.evaluate("()=>!document.querySelector('#items.on')"))
    await pg.click('#bPause'); await pg.click('[data-act="menu"]'); await pg.click('[data-act="armory"]')
    check('armory locked until 150 VP earned', '150' in await pg.inner_text('#ov') and not await pg.evaluate("()=>!!document.querySelector('[data-act^=eqbuy]')"))
    await pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('slidingcups.save'));s.cleared=[0,1,2,3,4,5,6,7];s.stars=[1,1,1,1,1,1,1,1];s.vp=300;s.vpEarned=300;localStorage.setItem('slidingcups.save',JSON.stringify(s))}")
    await pg.reload(); await pg.wait_for_timeout(400); await enter(pg)
    check('menu announces the three new features', await pg.evaluate("()=>document.querySelectorAll('[data-act^=ack]').length") == 3)
    await pg.click('[data-act="ack:items"]'); check('acknowledging hides that notice', await pg.evaluate("()=>document.querySelectorAll('[data-act^=ack]').length") == 2)
    await pg.click('[data-act="start:classic"]'); await pg.wait_for_timeout(250)
    check('Classic: energy bar, 2 empty slots and the dragon ultimate portrait', await pg.evaluate("()=>!!document.querySelector('#items .em') && document.querySelectorAll('#items .slot').length===2 && document.querySelectorAll('#items [data-ult]').length===1"))
    await pg.evaluate("()=>{__game.items.push('undo','wild')}"); await pg.wait_for_timeout(200)
    check('items appear with their fantasy icons', await pg.evaluate("()=>[...document.querySelectorAll('#items button.it')].map(b=>b.dataset.item)") == ['undo', 'wild'] and '🧪' in await pg.inner_text('[data-item=wild]'))
    await pg.click('[data-item=wild]'); await pg.wait_for_timeout(200)
    check('tap Polymorph Potion → cup in hand becomes wild, item used, sound played', await pg.evaluate("()=>[__game.held.wild,__game.items.join(),__game.itemsUsed,__sfx.stats.wild]") == [True, 'undo', 1, 1])
    await pg.evaluate("()=>{__game.score=3000;__game.energy=0}"); await force_loss(pg); await pg.wait_for_timeout(1300)
    s = await save(pg)
    check('run with items: score goes to best-with-items, no-item best untouched', s['best']['classicItems'] == 3000 and s['best']['classic'] == 0, s['best'])
    check('result screen says the score is tracked separately', 'scored separately' in await pg.inner_text('#ov'))
    await pg.click('[data-act="menu"]'); await pg.click('[data-act="armory"]'); check('open the armory', await flow(pg) == 'armory')
    await pg.click('[data-act="eqbuy:coin"]'); s = await save(pg); check('buy the Lucky Coin: -100 VP', s['equip'] == {'coin': 1} and s['vp'] == 300 + 6 - 100, s)
    await pg.click('[data-act="eqwear:coin"]'); s = await save(pg); check('wear it', s['worn'] == ['coin'])
    await pg.click('[data-act="menu"]'); await pg.click('[data-act="start:classic"]'); await pg.wait_for_timeout(200)
    check('worn equipment is active in the Classic run', await pg.evaluate("()=>JSON.stringify(__game.eq)") == '{"coin":1}')
    await pg.evaluate("()=>{__game.score=5000}"); await force_loss(pg); await pg.wait_for_timeout(1300)
    check('result lists the equipment used', 'Lucky Coin' in await pg.inner_text('#ov'))
    await pg.click('[data-act="menu"]'); await pg.click('[data-act="start:practice"]'); await pg.wait_for_timeout(200)
    check('Practice: 3 items that are not consumed', await pg.evaluate("()=>document.querySelectorAll('#items button.it').length") == 3)
    await pg.click('[data-item=wild]'); await pg.wait_for_timeout(200)
    check('Practice still shows 3 items after use', await pg.evaluate("()=>document.querySelectorAll('#items button.it').length") == 3)
    await swipe(pg); await pg.wait_for_timeout(500)
    check('after a launch, Undo is available', await pg.evaluate("()=>document.querySelector('[data-item=undo]').disabled") is False)
    await pg.click('[data-item=undo]'); await pg.wait_for_timeout(200)
    check('Undo: cup back in hand, can launch again', await pg.evaluate("()=>[__game.phase,!!__game.held]") == ['ready', True])
    await pg.click('#bPause'); await pg.click('[data-act="menu"]'); await pg.click('[data-act="levels"]'); await pg.click('[data-act="level:0"]')
    check('Levels without items: no item bar', await pg.evaluate("()=>!document.getElementById('items').classList.contains('on')"))
    await c.close()

async def t_backup(b):
    print('Backup'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('slidingcups.save'))||{};s.vp=77;s.best={classic:4321};s.unlocked=[0,1,2];localStorage.setItem('slidingcups.save',JSON.stringify(s))}")
    await pg.reload(); await pg.wait_for_timeout(400); await enter(pg)
    await pg.click('[data-act="settings"]'); await pg.click('[data-act="backup"]'); check('open the backup screen', await flow(pg) == 'backup')
    code = await pg.input_value('#bkOut'); check('backup code shown', code.startswith('SC1.'))
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400); await enter(pg)
    check('progress gone after clearing storage', (await pg.evaluate("()=>JSON.parse(localStorage.getItem('slidingcups.save')||'null')")) in (None,) or (await save(pg))['vp'] == 0)
    await pg.click('[data-act="settings"]'); await pg.click('[data-act="backup"]'); await pg.fill('#bkIn', 'not a code'); await pg.click('[data-act="backup:check"]')
    check('bad code shows an error, nothing to apply', not await pg.evaluate('()=>!!document.querySelector("[data-act=\'backup:apply\']")') and 'backup code' in await pg.inner_text('#ov'))
    await pg.fill('#bkIn', code[:20] + '\n' + code[20:]); await pg.click('[data-act="backup:check"]')
    check('valid code (even with a line break) shows a summary', '77 VP' in await pg.inner_text('#ov'))
    await pg.click('[data-act="backup:apply"]'); s = await save(pg)
    check('restore replaces progress', s['vp'] == 77 and s['best']['classic'] == 4321 and s['unlocked'] == [0, 1, 2], s)
    await pg.reload(); await pg.wait_for_timeout(400); await enter(pg); check('restored progress survives a reload', (await save(pg))['vp'] == 77)
    await c.close()

async def t_codex(b):
    print('Codex'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('slidingcups.save'))||{};s.unlocked=[0,1,2];s.seen=[5,2,0,-1,-1,-1,-1];localStorage.setItem('slidingcups.save',JSON.stringify(s))}")
    await pg.reload(); await pg.wait_for_timeout(400); await enter(pg)
    await pg.click('[data-act="kinds"]'); await pg.wait_for_timeout(600)
    check('creature rows show portraits; locked ones are silhouettes', await pg.evaluate("()=>[document.querySelectorAll('#ov img.pt').length, document.querySelectorAll('#ov img.pt.sil').length]") == [7, 4])
    check('portrait art loads', await pg.evaluate("()=>[...document.querySelectorAll('#ov img.pt')].every(i=>i.complete&&i.naturalWidth>0)"))
    await pg.screenshot(path='/tmp/v/kinds.png')
    await pg.click('[data-act="codex"]'); await pg.wait_for_timeout(600); check('codex opens', await flow(pg) == 'codex')
    check('codex shows 42 forms, 10 discovered', await pg.evaluate("()=>[document.querySelectorAll('.codex img').length, document.querySelectorAll('.codex img:not(.sil)').length]") == [42, 10])
    await pg.screenshot(path='/tmp/v/codex.png')
    await pg.click('[data-act="kinds"]'); check('back to creatures', await flow(pg) == 'kinds')
    await c.close()

async def t_title(b):
    print('Title screen'); c, pg = await new_page(b, viewport={'width': 390, 'height': 844}); await pg.goto(URL); await pg.wait_for_timeout(600)
    check('app opens on the title screen with one Enter button', await flow(pg) == 'title' and await pg.evaluate("()=>document.querySelectorAll('#ov [data-act]').length") == 1)
    await pg.click('[data-act="enter"]'); order = await pg.evaluate("()=>[...document.querySelectorAll('#ov [data-act]')].map(e=>e.dataset.act).join()")
    check('menu order: settings gear, Campaign (big), Quest, Practice, Capture Beasts, Forge', order == 'settings,start:classic,levels,start:practice,kinds,armory', order)
    await pg.click('[data-act="settings"]'); check('settings holds language and backup', await pg.evaluate("()=>!!document.querySelector('[data-act=lang]')&&!!document.querySelector('[data-act=backup]')"))
    await c.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        for t in (t_title, t_menu_flow, t_play_sound, t_progress, t_levels, t_items, t_backup, t_codex, t_language, t_pwa, t_iphone):
            try: await t(b)
            except Exception as e: check(t.__name__ + ' raised an exception', False, repr(e)[:300])
        await b.close()
    check('no page errors during the whole run', not page_errors, page_errors[:3])
    bad = [n for n, ok in results if not ok]
    print('\n%d passed%s' % (len(results) - len(bad), ', %d FAILED' % len(bad) if bad else ''))
    sys.exit(1 if bad else 0)
asyncio.run(main())
