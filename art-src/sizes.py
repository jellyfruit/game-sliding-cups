#!/usr/bin/env python3
"""依階級重新計算每種生物的大小（寫入 art-src/sizes.json，build.js 會讀）。
做法：先不縮放輸出，量出每階圖最上緣，換算成遊戲中的高度（世界單位 = 圖高 × R / 128），再算出讓高度等於 H 的縮放。
t6 的 H 是上限：放在桌子最遠端時不能超出畫面。用法：python3 art-src/sizes.py"""
import asyncio, json, os, subprocess
from playwright.async_api import async_playwright
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); KINDS = ['dragon', 'unicorn']
R = [22, 28, 36, 46, 58, 72]; H = [50, 70, 95, 120, 145, 170]
async def tops():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME_PATH', '/usr/bin/google-chrome'), args=['--no-sandbox']); pg = await b.new_page(viewport={'width': 768, 'height': 768})
        for k in KINDS:
            subprocess.run(['node', os.path.join(HERE, k, 'build.js')], env={**os.environ, 'NOSCALE': '1'}, check=True, capture_output=True)
            out[k] = []
            for n in range(1, 7):
                await pg.set_content('<body style="margin:0">' + open(os.path.join(HERE, 'out', '%s_t%d.svg' % (k, n))).read() + '</body>')
                await pg.screenshot(path='/tmp/_sz.png', omit_background=True); out[k].append(Image.open('/tmp/_sz.png').getbbox()[1])
        await b.close()
    return out
t = asyncio.run(tops())
res = {k: {str(n + 1): round(((H[n] * 128 / R[n]) - 40) / (650 - t[k][n]), 3) for n in range(6)} for k in KINDS}
res['_note'] = '每階生物（杯子以上）的縮放；遊戲中的高度（世界單位）依階級遞增 H = %s，t6 為上限。由 art-src/sizes.py 產生' % H
json.dump(res, open(os.path.join(HERE, 'sizes.json'), 'w'), ensure_ascii=False, indent=1); print(res)
