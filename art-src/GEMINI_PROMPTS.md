# Gemini (Nano Banana) prompt pack — creature sprites

**Status:** draft for David's Gemini tests — all 7 creatures · **Updated:** 2026-11-22
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

**Hydra**
```
CREATURE: a green hydra. Body colour #5FD08A, shadow-side colour #2F9A58, pale mint accents #C9F2D8 for belly scales, small fangs and frills, amber eye #FFC23D with a vertical slit pupil. A serpent-dragon with several snake-like heads on long S-curved necks growing from one chest: ONE main head in front (largest, nearest the viewer) and the extra heads smaller and slightly behind it, overlapping in a tight cluster so the silhouette stays compact. Only the main head wears the headwear; the extra heads have no headwear. Smooth snake heads with a short frill behind the jaw, no horns. No wings. Head count grows with tier: T1–T2 one head, T3–T4 two heads, T5–T6 three heads.
```

**Phoenix**
```
CREATURE: a phoenix, a fiery bird. Plumage golden yellow #FFC23D, shadow-side colour #D18F00, pale cream #FFE7A8 for the chest feathers, flame-red #E8452C for the tips of the crest and wing feathers. Curved hooked beak in cream, dark eye with a bright highlight and a heavy brow. A swept-back crest of flame-shaped feathers behind the head (keep it small so the headwear stays the focus). Folded bird wings hang DOWN behind the neck like a closed cape, their long flight feathers ending in pointed flame-shaped tips. Because the plumage is gold, give the gold headwear an extra-thick black outline so it separates from the head.
```

**Basilisk**
```
CREATURE: a basilisk, the serpent king. Body colour #3CC7C2 (teal), shadow-side colour #1D8F8B, pale aqua accents #BFF0EE for belly scales and fangs, glowing yellow eye #FFE14D with a vertical slit pupil and a menacing heavy brow. A large snake head with a broad jaw and two small fangs, smooth overlapping scales, and a short spiny fin running down the back of the neck. A small rooster-like fleshy crest sits low at the back of the skull (keep it small; the headwear goes on top). The S-curved neck is a thick snake body. No wings, no legs.
```

**Griffin**
```
CREATURE: a griffin — eagle head and lion body. Fur colour #C58A5A (tawny brown), shadow-side colour #8A5832, cream #ECD0B6 for the feathered head, chest ruff and beak, amber eye #FFB326 with a round pupil and a fierce heavy brow. Eagle head with a strong hooked cream beak and two pointed feathered ear tufts. Feathers on the head and neck turn into lion fur on the chest. Folded eagle wings hang DOWN behind the neck, their long flight feathers ending in rounded-pointed tips, compact and close to the body.
```

**Scorpion man (Aqrabuamelu)**
```
CREATURE: a scorpion man from Mesopotamian myth — humanoid upper body with a scorpion tail. Skin and armour colour #E8B86A (sand gold), shadow-side colour #B27D2C, pale sand accents #F8E3BD, dark bronze details #5A3A1A, glowing amber eye. A stern bearded face in side profile (cartoon, not realistic), the head bowed forward. Segmented chitin plates on the shoulders and chest. The SIGNATURE is a segmented scorpion tail rising from behind the back and arching over the shoulder, ending in a curved stinger above the head — keep it compact so it stays inside the frame. One small pincer raised in front of the chest. Instead of an S-shaped animal neck, use a strong neck and hunched shoulders with the same forward-leaning head. Because the body is sand gold, give the gold headwear an extra-thick black outline.
```

### T1 (pawn) lines for these creatures
- Hydra: `TIER: a newborn hydra. One small snake head and a coil of body peek out of a cracked mint-green egg shell with a jagged top edge and dark spots. The shell replaces the chest cut. No headwear.`
- Phoenix: `TIER: a newborn phoenix chick, fluffy and round, peeking out of a cracked golden egg resting in a little nest of embers. A tiny flame tuft on its head. The egg replaces the chest cut. No headwear.`
- Basilisk: `TIER: a newborn basilisk. A small snake head with big eyes peeks out of a cracked teal egg shell with a jagged top edge. The shell replaces the chest cut. No headwear.`
- Griffin: `TIER: a griffin cub, a fluffy round eagle-headed chick with tiny wings, sitting in a cracked cream egg shell. The shell replaces the chest cut. No headwear.`
- Scorpion man: `TIER: a small scorpion-man child peeking out of a mound of sand, holding up two tiny pincers, a short curled tail behind it. The sand mound replaces the chest cut. No headwear.`

## Tier lines

Each tier = the creature at a life stage, wearing a chess-piece headwear. Use one line per image. The T2–T6 lines are shared by all creatures; T1 is creature-specific (dragon and unicorn below, the others listed after their creature blocks).

- **T1 (pawn):**
  - Dragon: `TIER: a newborn hatchling. Only the small head and tiny claws peek out of a cracked cream egg shell with a jagged top edge and a few dark spots. The egg shell replaces the chest cut. Two tiny horns. No wings.`
  - Unicorn: `TIER: a baby unicorn foal with a round little body, hugging a chocolate-chip cookie (one bite missing) against its chest with both front hooves. The cookie must NOT cover the head. Tiny horn nub, small mane tuft. No headwear.`
- **T2 (knight):** `TIER: a teenager, a bit smaller and younger-looking than an adult. A flowing cream mane down the back of the neck like a chess knight's mane. No headwear. No wings.`
- **T3 (bishop):** `TIER: young adult wearing a bishop's mitre: a tall pointed cream cap with a diagonal red slit, a gold band at the bottom and a small gold ball on top. The mitre stays level. (Winged creatures — dragon, phoenix, griffin: small folded wings.)`
- **T4 (rook):** `TIER: adult wearing a castle-battlement crown (cream stone with square crenellations, sitting level on the head) and two bands of gold neck armour with rivets. (Winged creatures: medium folded wings.)`
- **T5 (queen):** `TIER: the queen, wearing a gold crown ring with five tall spikes curving outward, each tipped with a cream pearl, a small red jewel in the centre. The crown stays level. (Winged creatures: larger folded wings.)`
- **T6 (king):** `TIER: the king, wearing a gold crown with a cross on top, sitting level on the head, and a gold hexagonal medallion with a red jewel on the chest. (Winged creatures: the largest folded wings, still compact.)`

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
