# Sliding Cups — Gameplay & UI Design v1.2

**Status:** reflects the game as implemented (10.0.0) · **Updated:** 2026-11-22
Legend: ✅ built and tested · 🔜 decided, not built yet · ❓ undecided.
Related docs: `ARCHITECTURE.md` (code structure), `ART_STYLE.md` (art direction), `ASSET_SPEC.md` (sprite spec), `CLAUDE.md` (quick start).
v1.2 supersedes v1.1: translated to English; added rule additions (8c) and the finished dragon/unicorn art.

## 1. One-line concept

Flick a cup across the table like bowling or curling. When it touches a cup of the **same creature and same size**, they merge into the next tier. If the table fills up, you lose (like Tetris). Style: cute-but-detailed creatures, 2.5D top-down view from above at an angle.

## 2. Modes

| Mode | Goal | Win | Lose | Status |
|---|---|---|---|---|
| **Classic** | Endless, chase a high score | No win; compare scores | A cup rests inside the danger line for more than 3 s (shrinks with pressure, see 8c) | ✅ |
| **Levels** | Make a king (tier 6) of every listed creature | Goal reached → next level | Same as Classic; no shot limit | ✅ 3 levels |
| **Practice** | Learn the feel | None | None | ✅ (basic) |

### Practice (✅)
- Can't lose: cups that stop inside the line fade out after ~1.2 s, no penalty.
- Aim line always on (predicted path and stopping point).
- No best score, no VP. All 5 items are unlimited.
- 🔜 Not yet: undo last shot (now covered by the Undo item), clear the table, choose the next cup.

### Levels (✅)
- 3 levels: ① dragon ② dragon + unicorn ③ dragon + unicorn + hydra. Goal: **a king of each**. Creatures are fixed per level, not affected by unlocks.
- Sequential: clear a level to open the next one.
- **First clear** pays VP (30 / 60 / 100); replays pay nothing (no farming).
- Result screen: Next level / Replay / Menu. Top right shows king progress per creature.
- 🔜 Later: stars (by shot count), shot or time limits, narrow tables, obstacles — "levels with different constraints". `CONFIG.levels[i].items` can give starting items.

## 3. Core loop

1. A cup appears in the launch area (the next cup is previewed top left).
2. The player drags it and crosses the line to launch it.
3. It slides with friction and may collide with other cups.
4. Same creature + same tier touch → merge into the next tier (chains possible).
5. 0.25 s after everything stops, the next cup appears.
6. A cup resting inside the danger line too long → game over.

## 4. Cups

### 4.1 Creatures and tiers
- **Tiers** (chess, 6): pawn → knight → bishop → rook → queen → king. Radius 22 / 28 / 36 / 46 / 58 / 72 (world units; table is 600 × 945).
- **Creatures** (7 mythical): dragon, unicorn, hydra, phoenix, basilisk, griffin, scorpion man (Aqrabuamelu). Different creatures never merge (except with the Wild item).
- Merge: `(creature, tier t) + (creature, tier t) → (creature, tier t+1)`, placed at the centre of mass and **keeping the combined momentum**.
- **Checkmate**: two kings merge → both vanish, +2000 points, plus a shockwave (8c). ✅
- Merging only needs contact; no minimum speed. ✅ decided.

### 4.2 Spawning
- Tier odds: pawn 50%, knight 30%, bishop 15%, rook 5% (never queen or king). In Classic these shift toward bigger cups as pressure rises (8c).
- Creature: uniformly random from the creatures active this run.
- Seeded RNG: `?seed=N` reproduces the same spawn sequence (reserved for a daily challenge).

### 4.3 Creatures, VP and unlocks (✅)
- Unlocked at start: **dragon, unicorn**; only the dragon is active by default (two kinds is harder). The other 5 unlock in order with **VP (victory points)**: hydra 100, phoenix 200, basilisk 350, griffin 550, scorpion man 800.
- The Creatures screen picks which unlocked creatures to use (at least 1; more kinds = harder).
- **VP sources**: each Classic run = `floor(score ÷ 500)` + 10 per king made; first-clear level rewards; nothing in Practice. Banked once per run on game over, quit or restart.
- Values were estimated from "10,000 points is easy" and will be rebalanced from play (all in `CONFIG.vp`).

## 5. Physics (✅ feel approved; values in `CONFIG.phys`)

| Item | Setting |
|---|---|
| Colliders | Circles, fixed step 1/120 s |
| Mass | ∝ radius², times a tier factor (1.0 → 1.5; bigger is heavier) |
| Friction | Constant deceleration 560 + speed damping 0.7, times a tier factor (1.0 → 1.4; bigger stops sooner) |
| Cup–cup bounce | 0.6 × the average of both cups' bounce factors (1.0 → 0.75) |
| Wall bounce | 0.35 × the cup's bounce factor (0.55 was too high: a hard shot at the far wall bounced back over the line and lost the game) |
| Max launch speed | 3600; stop threshold 8 |

Verified: at full power, every tier stops beyond the launch line after hitting the far wall.

## 6. Controls (curling-style launch ✅)

- Press a cup and it **follows your finger**; dragging inside the launch area never launches, so you can line up and take a run-up.
- **The launch happens the moment the cup crosses the line (y = 720)**: direction and speed come from the last ~100 ms of finger movement.
- Power curve: finger speed up to 700 maps at 0.9×, the part above at 1.7× (amplified only when you flick hard), capped at 3600.
- Crossing the line slower than 630 (too weak) → the cup returns to the middle, no launch. Releasing inside the launch area → returns to the middle.
- The launch area extends a quarter above the danger line for a run-up.
- **Aim line**: toggle; shows predicted path and stop point (ignores collisions). Always on in Practice.

## 7. Table and losing

- The player is at the bottom (launch area); the far end is at the top. The line is both the **launch line** and the **danger line**.
- A **stopped** cup on the player's side of the line for 3 s (2 s at max pressure) → game over (Classic / Levels). Crossing temporarily while moving doesn't count.
- While a cup is inside, the line turns red and a countdown bar fills.

## 8. Scoring

- Merge: `10 × 2^newTier × chain`; the n-th merge of one shot is multiplied by n.
- Checkmate +2000. Best score is tracked for Classic only (runs with items have their own best).
- Skill bonuses: see 8c.

## 8b. Items (✅ first version; values to tune after play)

**Principles**: items are rescues and variety, not keys to winning; the bag holds only 2; they never change physics feel (with no items used, the physics baseline is untouched).

| Item | Effect | When usable |
|---|---|---|
| 🔥 Inferno (id `sweep`) | Burns away about 3 rows of cups nearest the player (inside the line + ~240 units past it, `sweepDepth`) — **every tier**, big cups included (the player's trade-off). Farther cups are untouched; no score. While held, an orange dashed line marks the range | Any time (even on an empty table — just wasted) |
| ⬆️ Upgrade | The cup in hand goes up one tier (max rook) | Waiting to launch, cup in hand below rook |
| 🌈 Wild | The cup in hand merges with any cup of the **same tier**, becoming that cup's creature (also checkmates kings) | Waiting to launch |
| 🧲 Magnet | For ~1.6 s, same-creature same-tier cups attract each other | A matching pair is on the table |
| ⏪ Undo | Takes back the last shot: cups, score, spawn order and energy all restored | After a launch (only the latest shot) |

**How to get them**
- **Energy bar** (Classic): points from merges, checkmates and bonuses charge it; every 1500 points gives a **random** item. With a full bag it holds at full and pays out as soon as a slot frees. Undo restores energy too, so it can't be farmed.
- **Pack one** (a VP sink): the Items screen spends VP to start your **next** Classic run with 1 item (Inferno 20 / Upgrade 10 / Wild 10 / Magnet 10 / Undo 6 VP). Tap again to cancel with a full refund. Used for one run only.
- **Practice**: all 5 items unlimited. **Levels**: starting items from `CONFIG.levels[i].items` (none yet); no earning.
- **Best score**: Classic runs that used any item go to a separate "best with items" so they never overwrite the no-item best.
- Item icons are emoji placeholders.

## 8c. Rule additions (10.0.0, all values in CONFIG — tune after playtesting)

- **Difficulty ramp** (`CONFIG.ramp`, Classic only via mode hook `ramp: true`): every 3000 points = +1 pressure level, max 5. Each level moves spawn odds toward bigger cups (pawn 50% → 35%, rook 5% → 10% at max) and shrinks the lose timer (3 s → 2 s). The level shows under the Next box ("Pressure N") with a popup when it rises.
- **Skill bonuses** (`CONFIG.bonus`), only for the launched cup's first merge of a shot: **Bank shot** (it bounced off a wall first) +50% of that merge; **Long shot** (merge ≥ 520 units from the launch point) +30%. **Double**: another, separate pair merging in the same frame (not a chain product) +150. Bonuses also charge item energy.
- **Checkmate shockwave** (`CONFIG.shock`): two kings merging pushes every cup within 340 units outward (up to 1100 speed, falling off with distance) and shatters pawns within 170 (no score).
- ✅ **Cluster merge** (`CONFIG.cluster`, 11.0.0): when two cups merge, every same-creature, same-tier cup touching the group (within 6 units, chained) is absorbed in the same merge. The result is still one tier up (decided: +2 tiers for 4+ would make kings and checkmates too easy); score × number of cups when 3 or more (checkmate × n−1). Wild cups join any cluster. Effects scale with size: absorbed cups streak into the centre, triple ring, heavier shake and hit-stop, "N× MERGE!" label, extra sound. Phone vibration only on Android — iOS Safari has no vibration API.
- ~~Crowding~~ — removed in 10.7.2 (David: a full table should be harder, not rescued). Supersedes the 10.0.0 rule that removed the oldest pawn above 24 cups.

## 9. Screens (✅ portrait, iPad first)

| Screen | Contents |
|---|---|
| **Menu** | Classic / Practice / Levels / Creatures (shows VP) / Items / best scores / language |
| **Game** | Top: score, best (Levels: level number + goal progress); table; item bar + energy; bottom: Pause, Aim line, Sound |
| **Pause** | Resume / Restart / Menu (switching away from the tab also pauses) |
| **Result** | Score, new best, VP earned (or first-clear reward), Play again / Next level / Menu |
| **Creatures** | Unlock state, price and active toggle for all 7 creatures |
| **Items** | Item descriptions and "pack for next run" |
| **Levels** | Goal, lock state and first-clear reward for each level |

- **Language**: English (default) / Traditional Chinese, toggled in the menu and remembered.
- ✅ Codex (Creatures → Codex): all 7 × 6 forms; a form is revealed the first time you make it by merging (any mode), shown as a silhouette until then, with a "New in codex!" popup. The Creatures screen shows each creature's highest form reached as its portrait; locked creatures show the king's silhouette.
- One-handed: controls sit at the bottom of the screen.

## 10. Visuals, sound and juice

### Visuals (✅)
- 2.5D: physics on a flat plane, projected when drawn; touches are projected back onto the plane.
- **Sprites**: `art/<creature>/<creature>_t1..6[_happy|_fast|_blink].png` (spec in `ASSET_SPEC.md`). **Dragon and unicorn are done** (vector-generated from `art-src/`, Mignola-style); the other 5 creatures still use the procedural fallback (chess glyph + face).
- Tier = headwear (the hero): egg/cookie → mane → bishop mitre → battlements → queen's crown → king's cross crown. Creature heights rise per tier (50 → 170 world units); the king's height is capped so it never leaves the screen at the far edge.
- Expressions: idle, happy (on merge), fast (sliding), blink (about every 4 s, staggered per cup).

### Sound (✅ Web Audio synthesis, no audio files)
- Impacts: stone on stone — a low "thunk", low-passed grit and a tiny click; one per cup, deeper and duller for bigger cups; volume follows impact speed. Walls are a dull thud.
- Launch whoosh, merge chord (pentatonic; higher tier = higher note, chains climb, with a stone thunk), checkmate / level clear / game over jingles, spawn, button clicks, item sounds (inferno roar and crackle, etc.), bonus chime, pressure-up, shockwave boom.
- Bottom "Sound" button toggles; iOS needs a first tap before audio plays; iPad Safari has no vibration API, so no haptics.

### Juice (✅ toned down)
Stone chips and impact rings at contact points, struck cups squash and flash, screen shake, brief hit-stop on heavy hits and high merges, inferno flames, shockwave ring. Strength multipliers in `JUICE` (about 0.35–0.6).

## 11. Tech and release (✅)

- Single `index.html` (vanilla JS + Canvas 2D, no build tools, no backend); sprites in `art/`. Layers and tests in `ARCHITECTURE.md`.
- Core logic (physics, rules, modes, flow, progress) never touches the DOM and is tested in Node: 117 core + 15 physics-baseline + 9 i18n + 4 version tests, plus 53 browser end-to-end tests; the physics baseline was matched bit-for-bit against the original prototype.
- **PWA**: add to the iPad home screen, full screen, playable offline; hosted on GitHub Pages.
- Saves in localStorage (versioned with migrations). **The home-screen app and the Safari tab have separate saves**; no cross-device sync (needs a backend). ✅ Backup screen (menu → Backup): copy/share a save code, paste it on any device or in the home-screen app to restore (also protects against iOS clearing site data).

## 12. Not built yet / open questions

**Decided, not built**
- Practice: clear the table, choose the next cup.
- Item icons drawn in the creature art style (Gemini prompts ready in `art-src/GEMINI_PROMPTS.md`).
- Level variety: stars, shot/time limits, narrow tables, obstacles; more levels.

**Ideas (not discussed)**
- **More items**: heavy shot (next cup heavier), preview next three, ice (lower friction briefly); danger insurance (guaranteed Inferno on the first danger warning, off by default).
- **Special tables**: obstacles, slopes, ice.
- **Daily challenge**: fixed-seed spawn order, compare scores (seeding is ready).
- Aim-line difficulty levels (easy / normal / hard).
- Power indicator while dragging; near-miss merge assist (both deferred by David).

**Open ❓**
1. Rebalance VP values and unlock prices from real play.
2. Direction for level 4+ (more creatures? constraints?).
3. Should Classic add creatures automatically as the score rises (currently the player chooses)?
