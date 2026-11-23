#!/usr/bin/env python3
"""Rune pillar sprites + title cover art from Gemini originals.
Input : <RAW_DIR>/pillar/pillar_1..3.png (intact / cracked / crumbling, magenta background)
        <RAW_DIR>/cover/key_art_cover.png (portrait 3:4); RAW_DIR defaults to ../sliding-cups-art/incoming
Output: art/pillar/pillar_1..3.png — magenta keyed out, all three cropped with the SAME box (so they stay aligned),
        width 320 px; prints the anchor (base centre) and base half-width to copy into PILLAR_ART in index.html.
        art/cover/cover.jpg — the title screen background.
Usage : python3 art-src/pillars_and_cover.py"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.environ.get('RAW_DIR', os.path.join(ROOT, '..', 'sliding-cups-art', 'incoming'))
KEY = np.array([248, 1, 244], float)
OUT_W = 320

def key_out(img):                            # same keying as composite.py: magenta → alpha with de-spill
    a = np.asarray(img.convert('RGB'), float)
    d = np.sqrt(((a - KEY) ** 2).sum(-1))
    alpha = np.clip((d - 60) / 90, 0, 1)
    al = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((a - (1 - alpha)[..., None] * KEY) / al, 0, 255)
    return Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')

def pillars():
    imgs = [key_out(Image.open(os.path.join(RAW, 'pillar', f'pillar_{i}.png'))) for i in (1, 2, 3)]
    A = np.asarray(imgs[0])[..., 3] > 128                     # the intact pillar defines the base and the crop
    ys, xs = np.nonzero(A); yb = ys.max()
    base = A[int(yb - (yb - ys.min()) * 0.12):yb + 1]          # bottom 12% = the base disc
    bx = np.nonzero(base.any(0))[0]; x0, x1 = bx.min(), bx.max()
    cx, hw = (x0 + x1) / 2, (x1 - x0) / 2
    ay = yb - hw * 0.30                                        # disc centre: bottom edge minus its vertical radius
    box = None                                                 # union bbox of all three (crumbling chunks fly out)
    for im in imgs:
        b = im.getbbox(); box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    s = OUT_W / (box[2] - box[0]); oh = round((box[3] - box[1]) * s)
    os.makedirs(os.path.join(ROOT, 'art', 'pillar'), exist_ok=True)
    for i, im in enumerate(imgs, 1):
        im.crop(box).resize((OUT_W, oh), Image.LANCZOS).save(os.path.join(ROOT, 'art', 'pillar', f'pillar_{i}.png'), optimize=True)
    print('PILLAR_ART = { w: %d, h: %d, ax: %.1f, ay: %.1f, hw: %.1f }' % (OUT_W, oh, (cx - box[0]) * s, (ay - box[1]) * s, hw * s))

def cover():
    im = Image.open(os.path.join(RAW, 'cover', 'key_art_cover.png')).convert('RGB')
    os.makedirs(os.path.join(ROOT, 'art', 'cover'), exist_ok=True)
    im.save(os.path.join(ROOT, 'art', 'cover', 'cover.jpg'), quality=84, optimize=True, progressive=True)
    print('cover', im.size)

if __name__ == '__main__':
    pillars(); cover()
