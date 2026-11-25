# Gemini (Nano Banana) prompt pack — creature sprites

**Status:** draft for David's Gemini tests — all 7 creatures · **Updated:** 2026-11-22
Goal: let Gemini draw the **creature bust only**; Claude then removes the background, scales it to the per-tier height (`art-src/sizes.json`), and composites it onto the shared vector cup, so anchors, cup and sizes stay exact. Prompts are in English because image models follow English best.

## How to use

1. **Step 1 – style test (one image):** paste *Prompt A* (base style) + *Prompt T6* (king). Iterate until you like it.
2. **Step 2 – keep the same character:** for every other tier, **attach the approved king image** and paste *Prompt E* (edit) with that tier's line. Editing one approved image keeps the face, colours and line style consistent; generating from scratch each time does not.
3. **Step 3 – expressions:** attach each approved tier image and paste *Prompt X* with one expression.
4. **Send Claude:** upload the PNGs to the private repo **jellyfruit/sliding-cups-art** in `incoming/<kind id>/` (Add file → Upload files → Commit). The PNGs as downloaded (any size ≥ 1024 px, magenta background is fine). Name them like `dragon_t3.png`, `dragon_t3_happy.png`. Claude handles background removal, cup, anchor and sizing.

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

**Chimera** (finale creature, added 2026-11-24 — tamed only by clearing the finale; it is also the finale boss, drawn as its king piece)
```
CREATURE: a chimera. Lion parts golden tan #D9A35A with shadow-side colour #A8703A and a thick dark-red mane #8E2F3A; goat parts dusty mauve #A8657A with shadow #6A3346; serpent parts deep green #3F8F5A with pale belly #C9E8C9. Fierce amber eyes #FFC23D with a heavy brow. The MAIN head in front is a LION (largest, nearest the viewer, wearing the headwear). Behind it, slightly smaller, a GOAT head with curled ram horns grows from the same chest. From behind the shoulders a SERPENT tail curls up over the back and ends in a small snake head that faces left too. Overlap the heads tightly so the silhouette stays compact. Head count grows with tier: T1–T2 lion only, T3–T4 lion + goat, T5–T6 lion + goat + serpent tail. Only the lion wears the headwear; at T6 the crown is TARNISHED (dark, dull gold with a few black stains) — it is the lost king's crown. No wings.
```
Save as `incoming/chimera/chimera_t1.png` … `chimera_t6.png` plus `_happy`, `_fast`, `_blink` like the other creatures.

### Chimera tier lines (use these instead of the shared tier lines; they add the extra heads per tier)
- T1: `TIER: a newborn chimera cub. A small round lion-cub head with a fluffy dark-red mane tuft and big amber eyes peeks out of a cracked dusty-mauve egg shell with a jagged top edge and a few dark spots. A tiny green snake tail tip pokes out of a crack at the back of the shell. The egg shell replaces the chest cut. Only one head. No headwear.`
- T2: `TIER: a young chimera, smaller and younger-looking than an adult. A lion head with a short, shaggy dark-red mane flowing down the back of the neck like a chess knight's mane. Only the lion head, no goat head yet; a small green serpent tail curls behind the shoulder without a head. No headwear.`
- T3: `TIER: young adult chimera wearing a bishop's mitre on the LION head: a tall pointed cream cap with a diagonal red slit, a gold band at the bottom and a small gold ball on top, level. A smaller dusty-mauve GOAT head with short curled horns grows from the same chest just behind the lion head, overlapping it. Serpent tail still without a head. The mitre stays level.`
- T4: `TIER: adult chimera. The LION head wears a castle-battlement crown (cream stone with square crenellations, sitting level), with two bands of gold neck armour with rivets. The GOAT head behind it is a bit larger now, with fully curled ram horns. Serpent tail still without a head. Only the lion wears the headwear.`
- T5: `TIER: the queen chimera. The LION head wears a gold crown ring with five tall spikes curving outward, each tipped with a cream pearl, a small red jewel in the centre, level. The GOAT head with curled ram horns sits just behind it, and now the green SERPENT tail curls up over the back and ends in a small snake head that also faces left. Three heads overlap tightly so the silhouette stays compact. Only the lion wears the headwear.`
- T6: the king line from the creature block (crown with a cross, TARNISHED — dark, dull gold with black stains — plus the gold hexagonal medallion with a red jewel on the chest), with all three heads.

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

---

# Item icons (5 buttons in the item bar)

**Status:** prompts ready, not drawn yet · **Updated:** 2026-11-23
**Status:** rewritten 2026-11-24 for the current 3 field items + 6 Forge equipment (supersedes the old 5-item list: sweep, upgrade, wild, magnet, undo) · **Updated:** 2026-11-24

The tray and the Forge still use emoji (field items ⏳ 🧪 👑; equipment 🐲 🏆 👁️ 🔨 ⚜️ 🪙). These 9 icons replace them. Two badge colours keep the layers apart: **field items = plum badge**, **equipment = iron badge with a bronze rim**.

Upload to **jellyfruit/sliding-cups-art**:
- `incoming/items/item_undo.png`, `item_wild.png`, `item_upgrade.png`
- `incoming/equip/eq_scale.png`, `eq_grail.png`, `eq_eye.png`, `eq_hammer.png`, `eq_scepter.png`, `eq_coin.png`

Claude keys out the magenta, trims, and exports 128 px icons to `art/items/` and `art/equip/`.

How to use: paste *Prompt I* once, then the badge line (items or equipment), then one object line per image. When the first icon looks right, attach it to the next request and say "same style, same badge, same line weight" so the set matches.

## Prompt I — icon base style

```
Create a single game UI icon for a mobile fantasy board game.

STYLE: Mike Mignola / Hellboy comic art, matching a set of creature sprites: thick confident black outer contour, flat colour fills only (no gradients, no glow, no texture), large hard-edged black shadow shapes, light from the top left, very limited palette. Must read clearly at 48 pixels: one simple bold silhouette, no small details.

SHAPE: one bold object centred in a round badge. The object overlaps the badge edge slightly at the top. No text, no letters, no numbers.

BACKGROUND: solid flat magenta (#FF00FF) outside the badge. No cast shadow, no frame, no watermark.

OUTPUT: square image, 1:1, badge fills about 85% of the width.
```

## Badge lines (pick one, paste after Prompt I)

- **Field item badge:** `BADGE: a dark plum disc (#3A2D49) with a thick black outline and a thin cream (#F4E2BD) inner ring.`
- **Equipment badge:** `BADGE: a dark iron-grey disc (#3B3F47) with a thick black outline and a wide bronze (#B8793A) rim with four small rivets at top, bottom, left and right, like the face of a forged shield.`

## Field items (plum badge)

- **Hourglass (undo):** `OBJECT: an antique brass hourglass (#D9A441 frame) with pale sand (#F4E2BD) flowing UPWARD from the bottom bulb to the top, and a thick cream curved arrow wrapping counter-clockwise around it — time turning back.`
- **Polymorph Potion (wild):** `OBJECT: a round-bellied glass potion flask with a cork, filled with swirling liquid in flat bands of red, orange, yellow, green, blue and purple, with two small bubbles rising from the neck — a brew that can become any creature.`
- **Coronation Oil (upgrade):** `OBJECT: a small golden (#FFD23D) anointing flask shaped like a teardrop with a tiny crown for a stopper, one thick drop of oil falling from its spout — the oil used to crown a king.`

## Equipment (iron badge)

- **Dragon Scale Charm (more time before the line loses):** `OBJECT: a single large dragon scale, deep red (#C8473A) with black shadow shapes, hung on a short leather cord like an amulet, pointed tip downward.`
- **Grail (ultimates charge faster):** `OBJECT: a golden chalice (#FFD23D) with a wide cup and short stem, three flat white light rays rising from its brim.`
- **Seer's Eye (better aim help):** `OBJECT: one wide-open mystic eye with a pale blue (#7FC8E8) iris and black pupil, set in a cream almond shape with three short black rays above it, like a seer's sigil.`
- **Mason's Hammer (more pillar damage):** `OBJECT: a heavy stonemason's war hammer, grey stone-coloured head (#9AA0A8) with one chipped corner, short brown wooden handle, tilted 30 degrees, two small stone chips flying from the head.`
- **King's Scepter (more pawns in the next cup):** `OBJECT: a royal golden scepter (#FFD23D) held upright, topped by a small cream chess pawn instead of a jewel, with a deep red (#C8473A) gem set in the shaft.`
- **Lucky Coin (more VP per run):** `OBJECT: one thick gold coin (#FFD23D) tilted slightly, stamped with a simple cup (chalice) shape, a four-leaf clover in green (#5BA35B) resting on its edge, one small sparkle star.`

---

# Rune pillar (Classic obstacle)

**Status:** reference approved by David (2026-11-23: tapered stone on a round base, Celtic knot band, rows of glowing runes); prompts recolour it to sapphire blue · **Updated:** 2026-11-23
Glow colour is sapphire blue — the one colour no creature uses (red, purple, green, gold, teal, brown, tan are taken; magenta is the keying background). Upload to **jellyfruit/sliding-cups-art** `incoming/pillar/` as `pillar_1.png` (intact, 7–10 hp), `pillar_2.png` (cracked, 4–6 hp), `pillar_3.png` (crumbling, 1–3 hp). Claude keys out the magenta, aligns the base disc to the pillar footprint (radius 26 world units) and replaces the procedural drawing; the hp bar stays drawn in code.

Order: attach David's reference image → P1. Attach the P1 result → P2. Attach the P2 result → P3.

## P1 — intact, recoloured (attach the reference)

```
Edit this image. Keep the pillar exactly the same: same shape, size, position, camera angle, line art, Celtic knot band, cracks and stone colours. Change ONLY the glow colour of the runes and their halo outlines: from lavender to flat sapphire blue #4A8CFF, with a pale blue #BFD9FF inner core on each rune stroke and a thin dark navy #1E3A7A edge. Flat colour fills only, no soft glow, no airbrush, no gradient. Keep the solid flat magenta (#FF00FF) background, no shadow, no ground, no text.
```

## P2 — cracked (attach the P1 result)

```
Same pillar, same style, same size, same position and same camera angle, same Mignola / Hellboy comic line art with flat colours. The runes stay sapphire blue but slightly dimmer: #3A6FD0 with a pale blue #9DBFF0 core. Now it is damaged: two or three bold black cracks run down from the top through the runes, one chunk missing from the top rim with a few pebbles floating just off it, a few runes split by the cracks. Keep the solid flat magenta (#FF00FF) background, no shadow, no ground, no text.
```

## P3 — crumbling (attach the P2 result)

```
Same pillar, same style, same size, same position and same camera angle, same Mignola / Hellboy comic line art with flat colours. Now it is about to break: deep cracks all over, a large piece of the top broken off, several stone chunks drifting away from the sides. Most runes are dark and fading, dark blue #25467F, except one or two still bright sapphire #4A8CFF with a small pale-blue #BFD9FF spark. Still clearly standing on its base. Keep the solid flat magenta (#FF00FF) background, no shadow, no ground, no text.
```

---

# Cover art (title screen)

**Status:** prompt ready, not drawn yet · **Updated:** 2026-11-23
Full-screen key art behind the title screen. The game draws the title text and the Enter button itself, so the picture has **no text** and keeps the top ~22% and bottom ~20% calm (they sit under the logo and the button). Upload to **jellyfruit/sliding-cups-art** `incoming/cover/cover.png`; Claude exports `art/cover/cover.jpg` (until then the title screen shows the seven king sprites). Portrait 3:4 covers iPad; iPhone crops the sides, so keep every creature's head inside the middle 70% of the width.

## Prompt C

```
Create the key art / cover illustration for a mobile fantasy board game about mythical creatures riding in game cups on a wooden table, like chess pieces.

STYLE: Mike Mignola / Hellboy comic art: thick confident black contours, flat colour fills, large hard-edged solid black shadow shapes, very limited palette, strong graphic silhouettes, light from the top left. No gradients except a simple flat dark-purple background glow. Matches a set of creature sprites in the same style.

SCENE: a heroic group portrait seen slightly from above. Seven creature kings, each wearing a small gold crown and sitting in a round cup (cream rim, coloured cup body matching the creature), gathered in a tight arc on a warm wooden tabletop that fades into darkness, ready for battle:
- centre front, largest: a RED DRAGON king (#FF6A4A) with folded bat wings and cream horns;
- left of it: a PURPLE UNICORN king (#B98CFF) with a white mane and spiral horn;
- right of it: a GOLDEN PHOENIX king (#FFC23D) with flame-like feathers;
- back left: a GREEN two-headed HYDRA king (#5FD08A);
- back right: a TEAL BASILISK serpent king (#3CC7C2);
- far left: a BROWN GRIFFIN king (#C58A5A) with eagle head and wings;
- far right: a SAND-GOLD SCORPION MAN king (#E8B86A), armoured warrior with a scorpion tail.
All seven face the viewer or three-quarter view, proud and slightly playful, not scary. Between them on the table: two small chess-pawn cups and a short slate-grey rune pillar with tiny glowing sapphire-blue (#4A8CFF) sigils.

COMPOSITION: portrait, 3:4. The group fills the middle 60% of the height. Keep the top 22% as calm dark purple sky / background (the game title goes there) and the bottom 20% as plain dark wooden table (a button goes there). Keep every creature's head inside the middle 70% of the width.

NO text, NO letters, NO logo, NO title, NO watermark, NO frame, NO border.

OUTPUT: portrait 3:4, high resolution.
```

If Gemini drifts: attach a few approved creature sprites as reference and add "same character designs as the attached images".
