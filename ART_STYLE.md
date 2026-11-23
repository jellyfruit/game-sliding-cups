# Sliding Cups — Art Style (ART_STYLE v1.0)

**Status:** approved by David (dragon and unicorn shipped) · **Updated:** 2026-11-22
Supersedes v0.2 ("cute realism", cel shading, procedural `sheet.html` sketch, full-size wings). `sheet.html` is kept only as an old reference.
Source of truth for the look: the Gemini dragon (10.1.0) and unicorn (10.2.0) in `art-src/incoming/`, which follow these rules with richer detail; the earlier vector versions remain in `art-src/<kind>/build.js`. Creatures are moving to Gemini art via `art-src/GEMINI_PROMPTS.md` + `art-src/composite.py`.

## 1. Structure

Each piece = **cup base** + **creature bust** standing in the cup.
- One cup shape for every creature: cream body with a band in the creature colour, hard black shadow on the right.
- The **collision circle is always the cup** (radius R: 22 / 28 / 36 / 46 / 58 / 72). Horns, wings and crowns may extend outside it and never collide.
- Creature height above the cup rises per tier (in-game 50 → 70 → 95 → 120 → 145 → 170 world units, set by `art-src/sizes.py`). The king is the cap: it must stay on screen at the far edge of the table.

## 2. Reading order

1. **Tier** — from the **headwear** and height (the hero).
2. **Creature** — from colour and one signature shape (dragon: horns + folded wings; unicorn: spiral horn + mane + square muzzle).
3. Details (face, scales, highlights) must never compete with 1 and 2.

## 3. Tier = chess headwear (shared by all creatures)

| Tier | Chess | Headwear / feature |
|---|---|---|
| 1 | pawn | baby form (dragon: egg shell; unicorn: hugging a cookie, head never covered) |
| 2 | knight | teen height (between t1 and t3, closer to t3), mane, no headwear |
| 3 | bishop | mitre (pointed, slit, gold band and ball) |
| 4 | rook | battlement crown + gold neck armour with rivets |
| 5 | queen | gold ring with 5 outward-curving spikes tipped with pearls |
| 6 | king | cross crown + chest medallion |

Horns are scaled down (≈ 0.5–0.6) so the headwear dominates. Headwear always stays **level**, even though the head is tilted.

## 4. Pose

- Side view facing left; **S-curved neck** (chest forward → neck back → head forward).
- Head **tilted 30° counter-clockwise** (mouth down) and shifted right; the neck bends smoothly (point-warped, no seams).
- Dragon wings: **folded bat wings hanging down** behind the neck — wrist claw at the top, three long pointed fingertips with deep scallops between, small thumb claw. Wings grow from t3 to t6 but stay compact so they barely overlap neighbouring cups.

## 5. Line and shading (Mignola / Hellboy reference)

- **Thick outer silhouette line** (about twice the inner line) so overlapping shapes separate.
- **Flat colour + large hard-edged black shadows** (nape, under the jaw, right side). No gradients.
- Very few colours per creature: body, dark, cream accents, gold for headwear, one eye colour.
- Pointed things (horns, spikes) have wide bases.

## 6. Faces

- On the creature's head, never on the cup. Almond eye with slit pupil and a heavy brow.
- Expressions: idle, happy (crescent eye, open smile), fast (big eye, tiny pupil, O mouth), blink (closed lid with lashes).
- Dragon: long jaw with a small fang. Unicorn: short horse mouth, no fang.

## 7. Palettes

| | Body | Dark | Accent | Eye |
|---|---|---|---|---|
| Dragon | `#ff6a4a` | `#c9402c` | cream `#f4e2bd` | `#ffd23d` |
| Unicorn | `#b98cff` | `#7d4fd1` | mane `#f6efff` | `#7fe3ff` |
Shared: ink `#17101a`, gold `#ffc23d` / `#c98a14`.

## 8. Acceptance checklist

- [ ] Silhouette test: 6 tiers distinguishable in black
- [ ] Next to other creatures, distinguishable in greyscale
- [ ] Pawn readable at real size (~28 px wide)
- [ ] Heights rise every tier; king stays on screen at the far edge (iPad and iPhone)
- [ ] Wings/horns don't hide neighbouring cups much

## 9. Remaining creatures (draft ideas)

| Creature | Pawn idea | Signature shape | Notes |
|---|---|---|---|
| Hydra | one-headed baby snake | multiple heads | head count could rise with tier |
| Phoenix | chick | head crest | folded flame wings |
| Basilisk | baby snake | fleshy crown | coiled body |
| Griffin | cub | pointed ears + beak | folded eagle wings |
| Scorpion man | small scorpion-man | scorpion tail | pincers |
