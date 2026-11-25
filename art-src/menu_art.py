"""Menu art from the in-game sprites.

  python3 art-src/menu_art.py            -> art/<kind>/<kind>_t1..6_thumb.png (codex / creature screen)
                                            icons/icon-512.png, icon-192.png, apple-touch-icon.png (dragon king)

Thumbnails share one crop box across every kind and tier, so they line up in the codex;
the page scales them by tier to show growth. Re-run after any sprite changes.
"""
import os, json
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KINDS = ['dragon', 'unicorn', 'hydra', 'phoenix', 'basilisk', 'griffin', 'aqrabuamelu', 'chimera']
THUMB_H = 150
BG = (58, 45, 73)

def sprite(kind, tier):
    return Image.open(os.path.join(ROOT, 'art', kind, f'{kind}_t{tier}.png')).convert('RGBA')

def thumbs():
    box = None
    for k in KINDS:
        for t in range(1, 7):
            b = sprite(k, t).getbbox()
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    w = round((box[2] - box[0]) * THUMB_H / (box[3] - box[1]))
    for k in KINDS:
        for t in range(1, 7):
            im = sprite(k, t).crop(box).resize((w, THUMB_H), Image.LANCZOS)
            im = im.quantize(colors=160, method=Image.FASTOCTREE, dither=Image.NONE)   # palette PNG: ~3x smaller
            im.save(os.path.join(ROOT, 'art', k, f'{k}_t{t}_thumb.png'), optimize=True)
    print('thumbs', w, 'x', THUMB_H, 'box', box)

def icon(size):
    bg = Image.new('RGBA', (size, size), BG + (255,))
    glow = Image.new('L', (size, size), 0)
    ImageDraw.Draw(glow).ellipse((size * .12, size * .30, size * .88, size * 1.02), fill=120)
    glow = glow.filter(ImageFilter.GaussianBlur(size * .08))
    bg = Image.composite(Image.new('RGBA', (size, size), (150, 110, 95, 255)), bg, glow)
    art = sprite('dragon', 6).crop((190, 372, 570, 768))   # king dragon in its cup (from the Gemini sprite)
    s = size * 0.86 / max(art.size)                          # keep inside the maskable safe zone
    art = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS)
    bg.alpha_composite(art, ((size - art.width) // 2, round(size * 0.53 - art.height / 2)))
    return bg.convert('RGB')

def icons():
    d = os.path.join(ROOT, 'icons')
    for name, size in (('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180)):
        icon(size).save(os.path.join(d, name), optimize=True)
    print('icons done')

if __name__ == '__main__':
    thumbs(); icons()
