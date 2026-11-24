#!/usr/bin/env python3
"""Item and equipment icons from Gemini art.

Input : raw icons on a solid magenta background, in the separate private repo jellyfruit/sliding-cups-art
        (cloned next to this repo): incoming/items/item_<id>.png, incoming/equip/eq_<id>.png (1024×1024).
Output: art/items/<id>.png and art/equip/<id>.png — magenta keyed out with de-spill, cropped to the icon, 128×128.
Usage : python3 art-src/icons.py [path to sliding-cups-art]   (default ../sliding-cups-art)
"""
import glob, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'sliding-cups-art'))
KEY = np.array([248, 1, 244], float)          # Gemini magenta (same as composite.py)
SIZE = 128                                    # drawn at up to 64 CSS px → sharp at 2× on iPad

def key_out(img):                             # magenta → alpha, then remove the magenta tint from edge pixels
    a = np.asarray(img.convert('RGB'), float)
    d = np.sqrt(((a - KEY) ** 2).sum(-1))
    alpha = np.clip((d - 60) / 90, 0, 1)
    al = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((a - (1 - alpha)[..., None] * KEY) / al, 0, 255)
    return Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')

def square(img):                              # crop to the visible icon, centre it on a square canvas
    box = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    img = img.crop(box); s = max(img.size)
    out = Image.new('RGBA', (s, s), (0, 0, 0, 0)); out.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
    return out

def main():
    jobs = [(f, 'items', os.path.basename(f)[5:-4]) for f in sorted(glob.glob(os.path.join(SRC, 'incoming/items/item_*.png')))]
    jobs += [(f, 'equip', os.path.basename(f)[3:-4]) for f in sorted(glob.glob(os.path.join(SRC, 'incoming/equip/eq_*.png')))]
    if not jobs: sys.exit('no icons found under ' + SRC + '/incoming/{items,equip}')
    for f, kind, id_ in jobs:
        out_dir = os.path.join(ROOT, 'art', kind); os.makedirs(out_dir, exist_ok=True)
        icon = square(key_out(Image.open(f))).resize((SIZE, SIZE), Image.LANCZOS)
        path = os.path.join(out_dir, id_ + '.png'); icon.save(path, optimize=True)
        print(path, os.path.getsize(path) // 1024, 'KB')

if __name__ == '__main__':
    main()
