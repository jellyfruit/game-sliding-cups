#!/usr/bin/env python3
"""瀏覽器端到端測試（Playwright + Chrome）。用法：python3 tests/e2e/run.py
需要：pip install playwright，以及 Chrome（路徑可用環境變數 CHROME_PATH 指定，預設 /usr/bin/google-chrome）。
會在本機自己開一個 HTTP 伺服器（service worker 需要 http），不需要網路。"""
import asyncio, functools, http.server, json, os, socketserver, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

results, page_errors = [], []
def check(name, cond, detail=''):
    results.append((name, bool(cond))); print(('  ok  ' if cond else 'FAIL  ') + name + ('' if cond else '   ' + str(detail)))

async def new_page(browser, **ctx):
    c = await browser.new_context(**ctx); pg = await c.new_page()
    pg.on('pageerror', lambda e: page_errors.append(str(e)))
    return c, pg
async def fresh(pg, query=''):
    await pg.goto(URL + query); await pg.evaluate('()=>localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(400)
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
    print('選單與畫面流程'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    check('開啟時在選單', await flow(pg) == 'menu')
    await pg.click('[data-act="start:classic"]'); check('開始經典 → playing', await flow(pg) == 'playing')
    await pg.click('#bPause'); check('暫停 → paused', await flow(pg) == 'paused')
    await pg.click('[data-act="resume"]'); check('繼續 → playing', await flow(pg) == 'playing')
    await force_loss(pg); await pg.wait_for_timeout(1300)
    check('杯子停在線內太久 → 結算畫面', await flow(pg) == 'result' and await pg.evaluate("()=>__game.phase") == 'over')
    await pg.click('[data-act="restart"]'); check('再玩一次 → playing、phase=ready', await flow(pg) == 'playing' and await pg.evaluate("()=>__game.phase") == 'ready')
    await pg.click('#bPause'); await pg.click('[data-act="menu"]'); check('回選單', await flow(pg) == 'menu')
    await pg.click('[data-act="start:practice"]'); check('練習模式', await pg.evaluate("()=>__game.mode.id") == 'practice')
    await c.close()

async def t_play_sound(b):
    print('發射與音效'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.click('[data-act="start:practice"]')
    for i in range(4): await swipe(pg, (i % 3 - 1) * 20); await pg.wait_for_timeout(2300)
    st = await pg.evaluate('()=>__sfx.stats')
    check('發射、出杯、撞牆都有觸發音效', st.get('launch', 0) >= 3 and st.get('spawn', 0) >= 3 and st.get('wall', 0) >= 1, st)
    await pg.click('#bSound'); before = json.dumps(await pg.evaluate('()=>__sfx.stats'))
    await pg.click('#bPause'); await pg.click('[data-act="resume"]')
    check('關閉音效後不再發聲', json.dumps(await pg.evaluate('()=>__sfx.stats')) == before)
    check('音效設定被記住', (await save(pg))['sound'] is False)
    await c.close()

async def t_progress(b):
    print('VP、解鎖與存檔'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.click('[data-act="start:classic"]')
    await pg.evaluate('()=>{__game.score=5300;__game.kings=1}'); await force_loss(pg); await pg.wait_for_timeout(1300)
    check('輸了之後 VP 入帳（5300 分 + 1 國王 = 20 VP）與最高分', (await save(pg))['vp'] == 20 and (await save(pg))['best']['classic'] == 5300, await save(pg))
    await pg.click('[data-act="restart"]'); await pg.evaluate('()=>{__game.score=1000}'); await pg.click('#bPause'); await pg.click('[data-act="menu"]')
    check('中途退出也入帳（+2 VP）', (await save(pg))['vp'] == 22)
    await pg.click('[data-act="kinds"]'); check('VP 不夠時，解鎖按鈕是停用的', await pg.evaluate("()=>document.querySelector('[data-act=\"buy:2\"]').disabled"))
    await pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('slidingcups.save'));s.vp=150;localStorage.setItem('slidingcups.save',JSON.stringify(s))}")
    await pg.reload(); await pg.wait_for_timeout(400); await pg.click('[data-act="kinds"]'); await pg.click('[data-act="buy:2"]')
    s = await save(pg); check('解鎖第 3 種：扣 100 VP', s['vp'] == 50 and s['unlocked'] == [0, 1, 2], s)
    await pg.click('[data-act="kind:2"]'); await pg.click('[data-act="menu"]'); await pg.click('[data-act="start:classic"]')
    check('選用的生物進入遊戲', await pg.evaluate('()=>__game.kinds') == [0, 2])
    await pg.evaluate("()=>localStorage.setItem('slidingcups.save','{壞掉的存檔')"); await pg.reload(); await pg.wait_for_timeout(400)
    check('存檔損壞時不會當機，回到新玩家狀態', await flow(pg) == 'menu')
    await c.close()

async def t_levels(b):
    print('關卡模式'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.click('[data-act="levels"]')
    check('第 2、3 關一開始是鎖定的', await pg.evaluate("()=>[1,2].every(i=>document.querySelector('[data-act=\"level:'+i+'\"]').disabled)"))
    await pg.click('[data-act="level:0"]'); await clear_level(pg); await pg.wait_for_timeout(1300)
    check('過關 → 結算畫面、首次通關 +30 VP', await flow(pg) == 'result' and await pg.evaluate("()=>__game.phase") == 'won' and (await save(pg))['vp'] == 30 and (await save(pg))['cleared'] == [0], await save(pg))
    await pg.click('[data-act="next"]'); check('下一關：進入第 2 關（龍 + 獨角獸）', await pg.evaluate('()=>[__game.level,__game.kinds]') == [1, [0, 1]])
    await pg.click('#bPause'); await pg.click('[data-act="restart"]'); check('關卡中重新開始仍是同一關', await pg.evaluate('()=>__game.level') == 1)
    await pg.click('#bPause'); await pg.click('[data-act="menu"]'); await pg.click('[data-act="levels"]'); await pg.click('[data-act="level:0"]'); await clear_level(pg); await pg.wait_for_timeout(1300)
    check('重玩已通過的關卡：不再給 VP', (await save(pg))['vp'] == 30)
    await c.close()

async def t_language(b):
    print('語言'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    check('預設英文', 'Classic' in await pg.inner_text('#ov'))
    await pg.click('[data-act="lang"]'); check('切換成繁體中文', '經典' in await pg.inner_text('#ov') and await pg.evaluate('()=>document.documentElement.lang') == 'zh-Hant')
    await pg.reload(); await pg.wait_for_timeout(400); check('重新整理後仍是繁體中文', '經典' in await pg.inner_text('#ov'))
    await c.close()

async def t_pwa(b):
    print('PWA 與離線'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await pg.goto(URL); await pg.wait_for_timeout(1500)
    check('service worker 已啟用', await pg.evaluate("async()=>{const r=await navigator.serviceWorker.ready;return r.active&&r.active.state}") == 'activated')
    mf = await pg.evaluate("async()=>{const r=await fetch(document.querySelector('link[rel=manifest]').href);return r.json()}")
    check('manifest 完整（名稱、standalone、圖示）', mf['name'] and mf['display'] == 'standalone' and len(mf['icons']) >= 2)
    await c.set_offline(True); await pg.reload(); await pg.wait_for_timeout(800)
    check('斷網後重新整理仍可開啟並開始遊戲', await pg.evaluate("()=>!!document.querySelector('[data-act=\"start:classic\"]')"))
    await pg.click('[data-act="start:classic"]'); check('離線可遊玩', await flow(pg) == 'playing')
    await c.close()

async def t_iphone(b):
    print('iPhone 觸控與穩定性'); c, pg = await new_page(b, viewport={'width': 390, 'height': 760}, device_scale_factor=3, is_mobile=True, has_touch=True)
    await pg.goto(URL); await pg.evaluate('()=>localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(500)
    await pg.tap('[data-act="start:classic"]'); cdp = await c.new_cdp_session(pg)
    h = await pg.evaluate("()=>{const c=__game.held;const p=__project(c.x,c.y);const r=document.getElementById('c').getBoundingClientRect();return {x:p.sx+r.left,y:p.sy+r.top-6}}")
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': h['x'], 'y': h['y']}]})
    for i in range(1, 8):
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': h['x'], 'y': h['y'] - i * 30}]}); await asyncio.sleep(0.012)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(800)
    check('手機觸控可以發射', (await pg.evaluate('()=>__sfx.stats')).get('launch', 0) >= 1)
    await pg.evaluate("()=>{document.getElementById('stage').style.display='none';window.dispatchEvent(new Event('resize'))}"); await pg.wait_for_timeout(300)
    await pg.evaluate("()=>{document.getElementById('stage').style.display='';window.dispatchEvent(new Event('resize'))}"); await pg.wait_for_timeout(500)
    moved = await pg.evaluate("()=>new Promise(r=>{const g=__game,c=SC.Physics.makeCup(g.world,0,0,300,500);c.vx=400;g.world.cups.push(c);const x0=c.x;setTimeout(()=>r(c.x!==x0),400)})")
    check('桌面尺寸短暫為 0 之後，遊戲迴圈仍在運作（iOS 主畫面版凍結的原因）', moved)
    await pg.evaluate("()=>window.dispatchEvent(new ErrorEvent('error',{message:'Script error.'}))")
    check('瀏覽器 / 擴充功能的「Script error.」不會跳紅色錯誤條', not await pg.evaluate("()=>document.getElementById('err').style.display==='block'"))
    await pg.evaluate("()=>setTimeout(()=>{throw new Error('boom')},0)"); await pg.wait_for_timeout(200)
    check('真正的錯誤會顯示在紅色錯誤條（附版本號）', 'boom' in await pg.inner_text('#err'))
    page_errors[:] = [e for e in page_errors if 'boom' not in e]
    await c.close()

async def t_items(b):
    print('道具'); c, pg = await new_page(b, viewport={'width': 820, 'height': 1100}); await fresh(pg)
    await pg.click('[data-act="start:classic"]')
    check('經典模式：有能量條與 2 個空格，沒有道具', await pg.evaluate("()=>!!document.querySelector('#items .em') && document.querySelectorAll('#items .slot').length===2 && !document.querySelector('#items button.it')"))
    await pg.evaluate("()=>{__game.items.push('sweep','wild')}"); await pg.wait_for_timeout(200)
    check('拿到道具後出現在道具列', await pg.evaluate("()=>[...document.querySelectorAll('#items button.it')].map(b=>b.dataset.item)") == ['sweep', 'wild'])
    check('清掃隨時可用（桌上沒杯子也是）', not await pg.evaluate("()=>document.querySelector('[data-item=sweep]').disabled"))
    await pg.click('[data-item=wild]'); await pg.wait_for_timeout(200)
    check('點萬用 → 手上的杯子變萬用、道具被用掉、音效觸發', await pg.evaluate("()=>[__game.held.wild,__game.items.join(),__game.itemsUsed,__sfx.stats.wild]") == [True, 'sweep', 1, 1])
    await pg.evaluate("()=>{const g=__game;g.world.cups.push(SC.Physics.makeCup(g.world,0,1,200,800))}"); await pg.wait_for_timeout(150)
    await pg.click('[data-item=sweep]'); await pg.wait_for_timeout(150)
    check('清掃：靠近玩家的杯子被清掉', await pg.evaluate("()=>__game.world.cups.filter(c=>!c.held).length") == 0 and await pg.evaluate("()=>__game.items.length") == 0)
    await pg.evaluate("()=>{__game.score=3000;__game.energy=0}"); await force_loss(pg); await pg.wait_for_timeout(1300)
    s = await save(pg)
    check('用過道具的局：分數記在「使用道具最高分」，不蓋掉無道具最高分', s['best']['classicItems'] == 3000 and s['best']['classic'] == 0, s['best'])
    check('結算畫面註明分數另外記錄', 'scored separately' in await pg.inner_text('#ov'))
    await pg.click('[data-act="menu"]')
    await pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('slidingcups.save'));s.vp=100;localStorage.setItem('slidingcups.save',JSON.stringify(s))}")
    await pg.reload(); await pg.wait_for_timeout(400)
    await pg.click('[data-act="items"]'); check('進入道具頁', await flow(pg) == 'items')
    await pg.click('[data-act="carry:undo"]'); s = await save(pg); check('帶 1 個撤銷進下一局：扣 6 VP', s['carry'] == 'undo' and s['vp'] == 94, s)
    await pg.click('[data-act="carry:sweep"]'); s = await save(pg); check('換成清掃：退舊買新', s['carry'] == 'sweep' and s['vp'] == 80, s)
    await pg.click('[data-act="menu"]'); await pg.click('[data-act="start:classic"]')
    check('開局就有攜帶的道具，且只用一局', await pg.evaluate("()=>__game.items.join()") == 'sweep' and (await save(pg))['carry'] is None)
    await pg.click('#bPause'); await pg.click('[data-act="restart"]'); check('再來一局：不再有攜帶的道具', await pg.evaluate("()=>__game.items.length") == 0)
    await pg.click('#bPause'); await pg.click('[data-act="menu"]'); await pg.click('[data-act="start:practice"]'); await pg.wait_for_timeout(200)
    check('練習模式：5 種道具、用了不會減少', await pg.evaluate("()=>document.querySelectorAll('#items button.it').length") == 5)
    await pg.click('[data-item=upgrade]'); await pg.wait_for_timeout(200)
    check('練習模式使用升階後仍然有 5 個', await pg.evaluate("()=>document.querySelectorAll('#items button.it').length") == 5)
    await swipe(pg); await pg.wait_for_timeout(500)
    check('發射後可以撤銷，回到發射前', await pg.evaluate("()=>document.querySelector('[data-item=undo]').disabled") is False)
    await pg.click('[data-item=undo]'); await pg.wait_for_timeout(200)
    check('撤銷：杯子回到手上、可以再發射', await pg.evaluate("()=>[__game.phase,!!__game.held]") == ['ready', True])
    await pg.click('#bPause'); await pg.click('[data-act="menu"]'); await pg.click('[data-act="levels"]'); await pg.click('[data-act="level:0"]')
    check('關卡模式沒有指定道具時，不顯示道具列', await pg.evaluate("()=>!document.getElementById('items').classList.contains('on')"))
    await c.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        for t in (t_menu_flow, t_play_sound, t_progress, t_levels, t_items, t_language, t_pwa, t_iphone):
            try: await t(b)
            except Exception as e: check(t.__name__ + ' 執行中發生例外', False, repr(e)[:300])
        await b.close()
    check('整個過程沒有頁面錯誤（pageerror）', not page_errors, page_errors[:3])
    bad = [n for n, ok in results if not ok]
    print('\n%d 項通過%s' % (len(results) - len(bad), '，%d 項失敗' % len(bad) if bad else ''))
    sys.exit(1 if bad else 0)
asyncio.run(main())
