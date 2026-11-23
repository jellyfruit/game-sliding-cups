#!/usr/bin/env python3
"""SVG → PNG（768×768 透明背景）並做預覽拼圖。用法：python3 art-src/render.py <生物 id> [輸出資料夾]，例如 python3 art-src/render.py unicorn art/unicorn"""
import asyncio, base64, glob, os, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); KIND = sys.argv[1] if len(sys.argv) > 1 else 'dragon'; DEST = sys.argv[2] if len(sys.argv) > 2 else OUT
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME_PATH', '/usr/bin/google-chrome'), args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 768, 'height': 768})
        for f in sorted(glob.glob(os.path.join(OUT, KIND + '_t*.svg'))):
            await pg.set_content('<body style="margin:0;background:transparent">' + open(f).read() + '</body>')
            await pg.screenshot(path=os.path.join(DEST, os.path.basename(f)[:-4] + '.png'), omit_background=True, clip={'x': 0, 'y': 0, 'width': 768, 'height': 768})
        import re
        files = sorted(f for f in glob.glob(os.path.join(DEST, KIND + '_t*.png')) if re.search(KIND + r'_t\d\.png$', f))
        uri = lambda f: 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
        imgs = ''.join('<img src="%s" style="width:200px;height:200px">' % uri(f) for f in files)
        small = ''.join('<img src="%s" style="width:%dpx;height:%dpx">' % (uri(f), w, w) for w in (64, 36) for f in files)
        await pg.set_viewport_size({'width': 1200, 'height': 330})
        await pg.set_content('<body style="margin:0;background:#e9d3a6">' + imgs + '<div style="padding:8px">' + small + '</div></body>')
        await pg.wait_for_timeout(300); await pg.screenshot(path=os.path.join(HERE, 'preview_' + KIND + '.png'))
        # 表情一覽：每列一個階級，四欄 = idle / happy / fast / blink
        rows = ''
        for n in range(1, 7):
            rows += '<div>' + ''.join('<img src="%s" style="width:170px;height:170px">' % uri(os.path.join(DEST, '%s_t%d%s.png' % (KIND, n, suf))) for suf in ('', '_happy', '_fast', '_blink') if os.path.exists(os.path.join(DEST, '%s_t%d%s.png' % (KIND, n, suf)))) + '</div>'
        await pg.set_viewport_size({'width': 700, 'height': 6 * 120 + 20})
        await pg.set_content('<body style="margin:0;background:#e9d3a6;line-height:0">' + rows.replace('170px;height:170px', '170px;height:170px;margin:-25px 0') + '</body>')
        await pg.wait_for_timeout(300); await pg.screenshot(path=os.path.join(HERE, 'expressions_' + KIND + '.png'))
        # 臉部特寫（t1 與 t6，四種表情）：裁出頭部放大
        crop = lambda f, x, y: '<div style="display:inline-block;width:400px;height:280px;background:url(%s) -%dpx -%dpx/1150px 1150px no-repeat"></div>' % (uri(f), x, y)
        rows = ''
        for n, (x, y) in ((1, (230, 620)), (6, (190, 500))):
            rows += '<div>' + ''.join(crop(os.path.join(DEST, '%s_t%d%s.png' % (KIND, n, suf)), x, y) for suf in ('', '_happy', '_fast', '_blink')) + '</div>'
        await pg.set_viewport_size({'width': 1600, 'height': 560})
        await pg.set_content('<body style="margin:0;background:#e9d3a6;line-height:0">' + rows + '</body>')
        await pg.wait_for_timeout(300); await pg.screenshot(path=os.path.join(HERE, 'faces_' + KIND + '.png'))
        await b.close()
asyncio.run(main())
