# Sliding Cups — Sprite Spec (ASSET_SPEC v0.3)

**Status:** current · **Updated:** 2026-11-22 · supersedes v0.2 (translated to English; tier content updated to the shipped headwear system).

- **Dragon done (9.2.0)** and **unicorn done (9.3.0)**: generated as vectors by `art-src/<kind>/build.js` (Mignola style: thick silhouette line, hard black shadows, flat fills) and exported with `python3 art-src/render.py <kind> art/<kind>` — 24 PNGs per creature (6 tiers × idle / `_happy` / `_fast` / `_blink`).
- **Sizes (9.3.0)**: per-tier creature scale (the part above the cup) lives in `art-src/sizes.json`, computed by `python3 art-src/sizes.py` so in-game heights rise H = [50, 70, 95, 120, 145, 170] world units; 170 for t6 is the cap. `layout()` reserves room above the table for a king at the far edge (`ART_TOP`).
- **Gemini pipeline (10.1.0)**: the dragon is now drawn by Gemini (Nano Banana) from `art-src/GEMINI_PROMPTS.md`. Raw busts on magenta go in `art-src/incoming/<kind>/`; `python3 art-src/composite.py <kind>` keys out the magenta (with de-spill), finds the chest cut line, scales the bust to the same per-tier height budget, places the chest front at the cup centre − 78 px and composites it onto the shared vector cup, writing `art/<kind>/`. **Never upload raw images straight into `art/`** — that folder is live.
- **Adding a creature**: write `art-src/<id>/build.js` → add the id to `KINDS` in `sizes.py` → run `sizes.py` → `node art-src/<id>/build.js` → `python3 art-src/render.py <id> art/<id>`.

This spec says how art must be delivered so the game can use it — whoever draws it (Claude via code, or hand-drawn). Reference template: `art/template/tier_template.png` (anchor and collision guides).

## 1. Deliverables

- **One PNG per creature × tier**: 6 per creature, plus optional expression variants.
- Names: `dragon_t1.png` … `dragon_t6.png` (t1 pawn, t2 knight, t3 bishop, t4 rook, t5 queen, t6 king); variants `dragon_t3_happy.png`, etc.
- Folder: `art/<kind>/` (e.g. `art/unicorn/unicorn_t1.png`).
- Each image is **one complete cup**: cup base + creature in the same image.

## 2. Format

| Item | Spec |
|---|---|
| File | **PNG-32 with transparency** |
| Canvas | **768 × 768 px**, the same for every image |
| Background | **Transparent**. No shadows, floor or glow (the game draws shadows) |
| Colour | sRGB |
| Source | Keep editable sources (`art-src/` build scripts, or layered PSD/Procreate files) |

## 3. Anchor and size (most important)

The game scales each image and places it on the table, so **every image must share one reference**:

- **Anchor = centre of the cup's bottom ellipse = canvas (384, 690)**. This maps to the cup's position on the table.
- Rim width is fixed at **256 px** (R = 128 px) for **every tier**; the game scales the whole image per tier (pawn smallest, king largest).
- **Collision footprint**: an ellipse on the ground centred on the anchor, 256 wide × 90 tall. The cup base should sit roughly inside it (base radius ≈ 0.8R ≈ 102 px).
- Cup height ≈ 58–100 px (0.45–0.78R).
- Creature, horns, wings and crowns **may extend beyond the footprint** but must stay on the canvas and within the per-tier height budget (see Sizes above).

## 4. View

- **From above at ~45°**. Rim ellipse height : width ≈ 0.7 : 1 (256 wide × ~180 tall). Must match the table.
- **Light from the top left.**

## 5. Tier content (shipped system)

Tier is read from the **headwear** (the hero); horns are secondary.

| File | Chess | Dragon | Unicorn |
|---|---|---|---|
| `_t1` | pawn | hatchling in an egg shell | baby holding a cookie with its hooves |
| `_t2` | knight | teen-sized, flowing mane, no wings | mane, no headwear |
| `_t3` | bishop | mitre + small folded wings | mitre |
| `_t4` | rook | battlement crown + neck armour | battlement crown + neck armour |
| `_t5` | queen | queen's spiked crown + larger wings | queen's spiked crown |
| `_t6` | king | cross crown + chest medallion + largest wings | cross crown + chest medallion |

- Shared pose: S-curved neck, head tilted 30° down and shifted right; headwear stays level.
- Dragon wings are folded bat wings hanging down (wrist claw at top, three long pointed fingertips). Unicorns have no wings; square horse muzzle, spiral horn, single-colour neck (no belly plates).
- **Faces are on the creature's head**, never on the cup.

## 6. Expressions

| Suffix | Used when | Look |
|---|---|---|
| (none) | idle | default face |
| `_happy` | merging | crescent eyes, open smile |
| `_fast` | sliding fast | wide eyes, tiny pupils, O mouth |
| `_blink` | about every 4 s | closed eyes |

Variants are **pixel-aligned** with idle (same canvas and anchor; only the face differs). Missing variants fall back to idle.

## 7. Animation

- Merge bounce and scaling are done in code; **no frame animation needed**. Frame animation (e.g. hatching) would need a separate discussion.

## 8. How the game uses the art

- Scale: `drawn size = image × (tier R ÷ 128) × screen scale × perspective scale`. Pawn (R = 22) ≈ 17% of the image, king (R = 72) ≈ 56%.
- **Small tiers get tiny**, so pawns must read at small size (strong silhouette).
- Cups are drawn back to front by table y; nearer cups cover farther ones.
- All 6 tiers of a creature use **the same cup**; only the creature changes.

## 9. Acceptance checks

- [ ] All images 768 × 768 with transparent background
- [ ] Rim 256 px, anchor (384, 690)
- [ ] Silhouette test: the 6 tiers stay distinguishable as black silhouettes
- [ ] At real pawn size (~28 px wide) the creature is still recognisable
- [ ] Rim ellipse and view angle match across tiers
- [ ] A king at the far edge of the table stays on screen (iPad and iPhone)

## 10. In the game

- The game loads `art/<kind>/<kind>_t<1..6>[_variant].png`: **drop the files in, commit, push, reopen**. Missing images fall back to procedural cups, so art can arrive one image at a time.
- `?art=0` forces procedural cups for comparison.
- Art ships with GitHub Pages; the home-screen app picks up new art after one reopen.
