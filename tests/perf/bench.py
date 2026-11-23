#!/usr/bin/env python3
"""Render benchmark: a crowded late-game table (Level 3, 24 cups of 3 creatures, tiers 1-6).
Usage: python3 tests/perf/bench.py [cpu_throttle]   -> average ms per render() call.
Desktop Chrome numbers are only relative (compare before/after a change); iPad needs on-device testing."""
import asyncio, functools, http.server, os, socketserver, sys, threading
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT))
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
THROTTLE = float(sys.argv[1]) if len(sys.argv) > 1 else 4

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME_PATH', '/usr/bin/google-chrome'))
        c = await b.new_context(viewport={'width': 820, 'height': 1180}, device_scale_factor=2); pg = await c.new_page()
        await pg.goto(URL + (sys.argv[2] if len(sys.argv) > 2 else '')); await pg.evaluate('()=>localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>__act('level:2')"); await pg.wait_for_timeout(300)
        await pg.evaluate("""()=>{const g=__game,P=SC.Physics;let i=0;
          for(let row=0;row<4;row++)for(let col=0;col<6;col++){const t=(i*7)%6,k=i%3;g.world.cups.push(P.makeCup(g.world,k,t,40+col*65,180+row*130));i++;}
          __sprites.preload([0,1,2]);}""")
        await pg.wait_for_timeout(2500)                       # let every sprite/variant load
        cdp = await c.new_cdp_session(pg); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': THROTTLE})
        ms = await pg.evaluate("()=>{for(let i=0;i<20;i++)__render();const t=performance.now();const x=document.getElementById('c').getContext('2d');for(let i=0;i<60;i++){__render();x.getImageData(0,0,1,1);}return (performance.now()-t)/60}")
        print('cups=%d  throttle=%gx  render=%.2f ms' % (await pg.evaluate('()=>__game.world.cups.length'), THROTTLE, ms))
        await pg.screenshot(path='/tmp/v/bench.png'); await b.close()
asyncio.run(main())
