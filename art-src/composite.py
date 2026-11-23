#!/usr/bin/env python3
"""Turn raw Gemini creature busts into game sprites.
Input : art-src/incoming/<kind>/<kind>_t<1..6>[_happy|_fast|_blink].png  (bust on a solid magenta background)
Output: art/<kind>/… 768×768 PNGs — magenta keyed out with de-spill, scaled to the per-tier height budget,
        placed on the shared vector cup (anchor (384,690), rim radius 128) so collisions and sizes stay exact.
Usage : python3 art-src/composite.py <kind>        (needs Playwright + Chrome to render the cup once)
All four expressions of a tier reuse the idle image's placement so they stay pixel-aligned."""
import asyncio, glob, json, os, re, sys
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
KIND = sys.argv[1]
R = [22, 28, 36, 46, 58, 72]                 # tier radii (CONFIG.tiers)
H = [50, 70, 95, 120, 145, 170]              # in-game height per tier, world units (same budget as sizes.py)
ANCHOR_Y, BASE_Y, CX = 690, 650, 384         # cup anchor, plinth line the bust stands on, centre x
KEY = np.array([248, 1, 244], float)         # Gemini magenta
SUFFIXES = ['', '_happy', '_fast', '_blink']

def band_colour(kind):                       # creature colour for the cup band, read from CONFIG in index.html
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    m = re.search(r"id: '%s',[^}]*?body: '(#[0-9a-fA-F]{6})'" % kind, html)
    return m.group(1) if m else '#ff6a4a'

def cup_svg(colour):                         # shared cup + plinth, cut from the dragon's generated SVG
    svg = open(os.path.join(HERE, 'out', 'dragon_t3.svg'), encoding='utf-8').read()
    body = svg[svg.index('>') + 1:]
    cup = body[:body.index('<ellipse cx="384" cy="650" rx="84"')]
    plinth = '<ellipse cx="384" cy="650" rx="84" ry="28" fill="#17101a"/>'
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768">' + cup.replace('#ff6a4a', colour) + plinth + '</svg>'

async def render_cup(colour, path):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME_PATH', '/usr/bin/google-chrome'), args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 768, 'height': 768})
        await pg.set_content('<body style="margin:0;background:transparent">' + cup_svg(colour) + '</body>')
        await pg.screenshot(path=path, omit_background=True); await b.close()

def key_out(img):                            # magenta → alpha, then remove the magenta tint from edge pixels
    a = np.asarray(img.convert('RGB'), float)
    d = np.sqrt(((a - KEY) ** 2).sum(-1))
    alpha = np.clip((d - 60) / 90, 0, 1)
    al = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((a - (1 - alpha)[..., None] * KEY) / al, 0, 255)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def placement(idle):
    """bbox of the idle image + the chest cut line (lowest row that is still wide; wing tips may hang below it)."""
    a = np.asarray(idle.getchannel('A')) > 128
    ys = np.nonzero(a.any(1))[0]; xs = np.nonzero(a.any(0))[0]
    widths = a.sum(1); base = int(np.nonzero(widths > 0.3 * widths.max())[0].max())
    left = int(np.nonzero(a[base - 3:base + 1].any(0))[0][0])       # chest front edge on the cut line
    return (int(xs[0]), int(ys[0]), int(xs[-1]) + 1, int(ys[-1]) + 1), base, left

def main():
    src = os.path.join(HERE, 'incoming', KIND); dst = os.path.join(ROOT, 'art', KIND); os.makedirs(dst, exist_ok=True)
    cup_png = '/tmp/_cup_%s.png' % KIND; asyncio.run(render_cup(band_colour(KIND), cup_png)); cup = Image.open(cup_png).convert('RGBA')
    for t in range(1, 7):
        idle_path = os.path.join(src, '%s_t%d.png' % (KIND, t))
        if not os.path.exists(idle_path): print('missing', idle_path); continue
        box, base, left = placement(key_out(Image.open(idle_path)))
        bw, bh = box[2] - box[0], box[3] - box[1]
        top = ANCHOR_Y - H[t - 1] * 128 / R[t - 1]          # where the art's top edge must land
        s = (BASE_Y - top) / (base - box[1])                  # top of art → chest cut line
        s = min(s, 740 / bw)                                  # never wider than the canvas
        for suf in SUFFIXES:
            p = os.path.join(src, '%s_t%d%s.png' % (KIND, t, suf))
            if not os.path.exists(p): p = idle_path
            k = key_out(Image.open(p)).crop(box)
            k = k.resize((max(1, round(bw * s)), max(1, round(bh * s))), Image.LANCZOS)
            # chest front edge sits at CX-78 like the vector sprites (wings/manes extend right); t1 (egg / baby) is centred
            x = round(CX - k.width / 2) if t == 1 else round(CX - 78 - (left - box[0]) * s)
            y = round(BASE_Y + 4 - (base - box[1]) * s)
            canvas = cup.copy()
            canvas.alpha_composite(k, (x, y))
            canvas.save(os.path.join(dst, '%s_t%d%s.png' % (KIND, t, suf)), optimize=True)
        print('t%d scale %.3f' % (t, s))

main()
