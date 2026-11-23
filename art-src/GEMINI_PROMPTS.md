# Gemini (Nano Banana) prompt pack — creature sprites

**Status:** draft for David's first Gemini test · **Updated:** 2026-11-22
Goal: let Gemini draw the **creature bust only**; Claude then removes the background, scales it to the per-tier height (`art-src/sizes.json`), and composites it onto the shared vector cup, so anchors, cup and sizes stay exact. Prompts are in English because image models follow English best.

## How to use

1. **Step 1 – style test (one image):** paste *Prompt A* (base style) + *Prompt T6* (king). Iterate until you like it.
2. **Step 2 – keep the same character:** for every other tier, **attach the approved king image** and paste *Prompt E* (edit) with that tier's line. Editing one approved image keeps the face, colours and line style consistent; generating from scratch each time does not.
3. **Step 3 – expressions:** attach each approved tier image and paste *Prompt X* with one expression.
4. **Send Claude:** the PNGs as downloaded (any size ≥ 1024 px, magenta background is fine). Name them like `dragon_t3.png`, `dragon_t3_happy.png`. Claude handles background removal, cup, anchor and sizing.

Rules that matter for the game (repeat them if Gemini drifts):
- Side profile facing **left**, seen slightly from above.
- **Bust only**: head, S-curved neck and upper chest; the chest is cut off flat and level at the bottom. **No cup, no base, no ground, no cast shadow.**
- **Solid flat magenta background (#FF00FF)** — no gradient, no vignette, no frame, no text.
- The figure fills the frame top to bottom with a small margin; centred horizontally.
- Headwear is the hero of each tier and stays **level** (not tilted with the head).

---

## Prompt A — base style (paste first, every time you start a new chat)

```
Create a game sprite of a single fantasy creature bust for a mobile board game.

STYLE: Mike Mignola / Hellboy comic art. Thick, confident black outer contour (about twice as thick as the inner lines). Flat colour fills only — no gradients, no airbrush, no painterly texture, no rim light. Large hard-edged solid black shadow shapes (on the back of the neck, under the jaw, and on the right side), light coming from the top left. Very limited palette. Bold, graphic, readable at very small sizes. Slightly cute proportions: big head, big expressive eye, but not chibi.

POSE AND FRAMING: side profile facing LEFT, seen slightly from above. Show only the bust: head, an S-curved neck (chest pushed forward, neck curving back, head forward), and the upper chest. The head is tilted down about 30 degrees, looking forward and slightly down. The chest is cut off with a flat, level horizontal edge at the bottom of the figure. Centre the figure horizontally; it fills the image from top to bottom with a small margin.

BACKGROUND: solid flat magenta (#FF00FF) everywhere around the figure. No ground, no floor, no cast shadow, no base, no pedestal, no cup, no frame, no text, no watermark.

OUTPUT: square image, 1:1.
```

## Creature block (add after Prompt A)

**Dragon**
```
CREATURE: a red dragon. Body colour #FF6A4A, shadow-side colour #C9402C, cream accents #F4E2BD for horns, belly plates and teeth, eye colour #FFD23D with a vertical slit pupil, heavy dark brow. Long jaw with one small fang, segmented cream belly plates down the throat, a few dark red spines along the back of the neck. Small horns that sweep back and curl upward in a gentle S (keep them small — the headwear is the focus). Folded bat wings hang DOWN behind the neck: the wrist joint is the highest point with a curved claw on top, three long pointed fingertips at the bottom with deep curved scallops between them, a small thumb claw on the leading edge. Wings stay compact and close to the body.
```

**Unicorn**
```
CREATURE: a purple unicorn. Body colour #B98CFF, shadow-side colour #7D4FD1, flowing pale lavender-white mane #F6EFFF, cyan eye #7FE3FF. Horse head with a SQUARE, blunt muzzle (flat front, flat jaw line), short mouth, no fangs. One cream spiral horn on the forehead pointing up and forward. Two pointed horse ears. The neck is ONE solid colour — no belly plates, no scales. No wings.
```

(Other creatures — hydra, phoenix, basilisk, griffin, scorpion man — get their own block later.)

## Tier lines

Each tier = the creature at a life stage, wearing a chess-piece headwear. Use one line per image.

- **T1 (pawn):**
  - Dragon: `TIER: a newborn hatchling. Only the small head and tiny claws peek out of a cracked cream egg shell with a jagged top edge and a few dark spots. The egg shell replaces the chest cut. Two tiny horns. No wings.`
  - Unicorn: `TIER: a baby unicorn foal with a round little body, hugging a chocolate-chip cookie (one bite missing) against its chest with both front hooves. The cookie must NOT cover the head. Tiny horn nub, small mane tuft. No headwear.`
- **T2 (knight):** `TIER: a teenager, a bit smaller and younger-looking than an adult. A flowing cream mane down the back of the neck like a chess knight's mane. No headwear. No wings.`
- **T3 (bishop):** `TIER: young adult wearing a bishop's mitre: a tall pointed cream cap with a diagonal red slit, a gold band at the bottom and a small gold ball on top. The mitre stays level. (Dragon: small folded wings.)`
- **T4 (rook):** `TIER: adult wearing a castle-battlement crown (cream stone with square crenellations, sitting level on the head) and two bands of gold neck armour with rivets. (Dragon: medium folded wings.)`
- **T5 (queen):** `TIER: the queen, wearing a gold crown ring with five tall spikes curving outward, each tipped with a cream pearl, a small red jewel in the centre. The crown stays level. (Dragon: larger folded wings.)`
- **T6 (king):** `TIER: the king, wearing a gold crown with a cross on top, sitting level on the head, and a gold hexagonal medallion with a red jewel on the chest. (Dragon: the largest folded wings, still compact.)`

## Prompt T6 — first test (paste after Prompt A + creature block)

```
TIER: the king, wearing a gold crown with a cross on top, sitting level on the head, and a gold hexagonal medallion with a red jewel on the chest. The folded wings are the largest of all tiers but still compact and close to the body. The crown must be the most eye-catching shape; keep the horns small.
```

## Prompt E — next tier from the approved image (attach the approved image)

```
Using the attached image as the exact reference, redraw the SAME character in the SAME style, colours, line weight, pose, camera angle and framing. Keep the solid magenta (#FF00FF) background, no ground, no shadow, no cup. Change only the life stage and headwear as follows:
[paste one TIER line here]
Keep the headwear level even though the head is tilted. Do not add any other objects or text.
```

## Prompt X — expression variant (attach the tier image)

```
Using the attached image, keep EVERYTHING identical — same pixels for the body, headwear, wings, colours, framing and magenta background — and change ONLY the face to:
[pick one]
- HAPPY: eye closed into an upward crescent, mouth open in a big smile showing a pink tongue.
- FAST: eye wide open with a tiny round pupil, eyebrow raised high, mouth a small round "O".
- BLINK: eye closed as a gentle downward curve with three short lashes, relaxed brow.
```

## Checklist before sending to Claude

- [ ] Facing left, bust only, flat bottom edge, no cup or ground
- [ ] Solid magenta background (any small halo is fine; Claude cleans it)
- [ ] Same character across all tiers (face, colours, line style)
- [ ] Headwear readable as a tiny silhouette (squint test)
- [ ] Horns and wings small enough not to cover neighbours
