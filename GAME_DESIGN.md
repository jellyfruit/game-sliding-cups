# Kings of Cups (聖杯之王) — Gameplay & UI Design v1.2

**Status:** reflects the game as implemented (17.0.0; chapter 3 added; chapter 4 built on its branch, not released yet) · **Updated:** 2026-11-24
Legend: ✅ built and tested · 🔜 decided, not built yet · ❓ undecided.
Related docs: `ARCHITECTURE.md` (code structure), `ART_STYLE.md` (art direction), `ASSET_SPEC.md` (sprite spec), `CLAUDE.md` (quick start).
v1.2 supersedes v1.1: translated to English; added rule additions (8c) and the finished dragon/unicorn art.

## 1. One-line concept

Flick a cup across the table like bowling or curling. When it touches a cup of the **same creature and same size**, they merge into the next tier. If the table fills up, you lose (like Tetris). Style: cute-but-detailed creatures, 2.5D top-down view from above at an angle.

## 2. Modes

| Mode | Goal | Win | Lose | Status |
|---|---|---|---|---|
| **Classic** | Endless, chase a high score | No win; compare scores | A cup rests inside the danger line for more than 3 s (shrinks with pressure, see 8c) | ✅ |
| **Levels** | One goal per level (make a piece, bank shots, chains, clusters, pillars, checkmate, kings, free stones, guardians, hydra heads) | Goal reached → next level | Per level: tutorial rules (no losing) or real rules; optional shot limit | ✅ Chapters 1–4 (32 levels) + finale levels 33–34 (35 next) |
| **Practice** | Learn the feel | None | None | ✅ (basic) |

### Practice (✅)
- Can't lose: cups that stop inside the line fade out after ~1.2 s, no penalty.
- Aim line always on (predicted path and stopping point).
- No best score, no VP. All 5 items are unlimited.
- 🔜 Not yet: undo last shot (now covered by the Undo item), clear the table, choose the next cup.

### Levels (✅ chapter 1, 13.0.0 — supersedes the 3 king levels of 1.x–12.x)
- **Chapter 1 · Training Grounds** is the tutorial: one skill per level, with a tip card before each level. Chapter 2 (real challenges) is next.
  1. **Flick!** — make a Knight (only pawns spawn; one pawn placed). No losing.
  2. **The Line** — make a Rook; far cups need power control. **Can lose** (the line rule), introduces the Next preview.
  3. **Bank Shot** — 2 bank-shot merges; an unbreakable pillar blocks the middle. No losing.
  4. **Chain** — 1 chain merge (×2): pawn next to a knight. No losing.
  5. **Cluster** — 2 cluster merges (3+): pairs of touching knights, knights spawn often. No losing.
  6. **Items** — make a Queen within **10 shots** with Upgrade, Wild, Magnet, Undo (4 slots). No losing.
  7. **Pillars** — break 2 of 3 pillars (6 hp each). No losing.
  8. **Final Exam** — a checkmate: dragon king on top, two dragon queens in a line below, 2 pillars, Inferno. **Can lose.**
- **Chapter 2 · Basilisk's Lair** (14.0.0): real challenges; every level can be lost. Third creature = **basilisk**, chosen because its gaze petrifies (David: the new mechanic should come from a creature's ability).
  - **Petrified cups** (new): grey stone statues that never merge (not in clusters, ignored by Magnet) but still collide and count for the line. A merge blast in range (same radius as pillar damage) or a checkmate shockwave frees them ("Freed!"). Stones can be any creature.
  9. **The Gaze** — make a basilisk Rook, 15 shots; first stones. 10. **Pillar Maze** — 3 bank merges in 12 shots around 4 unbreakable pillars (dragon + unicorn).
  11. **Crowded Field** — table pre-packed (19 cups, 3 stones); 2 cluster merges. 12. **Dominoes** — one shot up a pawn/knight/bishop column chains ×3; 6 shots.
  13. **Siege** — break 3 pillars (7 hp) in 15 shots (dragon + basilisk). 14. **Twin Kings** — dragon and unicorn kings; a stone basilisk rook in the way.
  15. **One Shot Each** — make a Queen in 10 shots, no items, dragon only (stones of other creatures as obstacles). 16. **Boss: The Basilisk** — a king of all three creatures; queens, rooks and bishops pre-placed, 3 pillars, 2 stones, Inferno + Undo.
  - Star targets were calibrated with a search bot (40 trial shots per turn): typical good play ≈ ★★★, a few wasted shots ≈ ★★. Chapter 2 opens after the chapter 1 final exam (sequential unlock).
- **Goal hint** (David: levels need a visible goal): the briefing card shows tip, goal, star targets and rules; during play the top right shows "🎯 goal have/need", shots and the stars you'd get now; Pause repeats goal and tip.
- **Stars** by shots: ★★★ within `stars[0]`, ★★ within `stars[1]`, else ★. First clear pays the reward; each newly earned star adds 10 VP.
- Sequential unlock; creatures per level are fixed (not affected by unlocks). Old saves: old level 1 → new level 1; old level 2 or 3 cleared → all of chapter 1 cleared (1★).
- Bot check (random aim, `/tmp`-style script, not a test): levels 1, 2, 4, 5, 7 clear easily; 3, 6, 8 need deliberate aiming or items, as intended.
- **Chapter 3 · Gates of the Sun** (17.0.0, story in `STORY.md`): the griffin carries the Knight across the desert to the Twin Guardians. Creatures: griffin (companion) and scorpion man (the guardians' kind), with dragon/unicorn in some levels. Three new level-only mechanics, all values in `CONFIG`:
  - **Shifting sand** (`CONFIG.sand.fric` = 4.8 — doubled from 2.4 after David's playtest, "sand feels too weak"; level field `sand: [[x, y, rx, ry]]` ellipses): a cup whose centre is inside a patch slides with 4.8× friction (a mid-speed pawn crossing a 240-deep patch now travels 290 instead of 582 units; 640 with no sand); the aim line follows the same rule. Every chapter 3 level has sand. **Classic never has sand**, so its physics and `tests/golden/physics.json` are unchanged.
  - **Stingers** (from level 21; `CONFIG.sting` life 3, minTier 1; level field `sting: { every, first }`): between shots, every `every` shots from shot `first`, a random cup of knight or bigger (not stone, not held) is stung — a purple badge counts down the shots left. If it is still on the table after 3 more shots it drops one tier ("Poison! −1 tier"). Merging it cures it (the new cup has no mark). Stings use their own RNG, so the spawn order is unchanged; Undo restores marks and the RNG.
  - **Twin Guardians** (level 24; `CONFIG.guard` r 40; level field `guards: [[x, y, hp]]`): two stone scorpion-man statues, left and right, 16 hp each, with their own health bars. Cups bounce off them like pillars. A merge blast (pillar rules: radius by tier, damage = tier number × cluster size) damages **only the nearest guardian in range**; a checkmate too. Both must fall (goal `guardians`). Every 3 shots the nearer guardian stings a cup (a dart flies from the statue).
  - **Night table** (17.0.1, David): chapter 3 is played on a darker, cool moonlit table (app `TABLE_THEMES.night`, chosen per chapter by `TABLE_BY_CHAPTER`) so the sand patches stand out; other chapters keep the warm table.
  - **Griffin cameo** (level 17, `intro: 'griffin'`): at the start the griffin flies across and drops the first layout cup, which lands with a puff of sand (app only; the cup is on the table in the core from the start).
  17. **Night Dunes** — make a Bishop (griffin only), sand band across the middle. No losing. 18. **Obelisk Road** — 2 bank merges around 3 unbreakable obelisks, sand in the centre lane. No losing.
  19. **Quicksand Pit** — 2 chain merges; both chain setups sit in sand. 20. **Buried Pilgrims** — free 4 of 6 stone cups (goal `free`).
  21. **Stingers** — make a Rook in 10 shots; a sting every 3 shots. 22. **Scorpion Camp** — 2 cluster merges on a packed table (17 cups, 2 stones), stingers + sand.
  23. **Silence Before the Gate** — make a Queen in 8 shots, four sand patches; rook, bishop and two knights lined up for a chain. 24. **Boss: The Twin Guardians** — break both statues (16 hp each); stings every 3 shots; Hourglass + Polymorph Potion.
  - **Calibration** (`node tools/levelbot.js ch3 24 40`: search bot, 40 trial flicks per turn, 24 seeds; `… 24 1` = random aim). ★★★ ≈ the search bot's median or a little below, ★★ ≈ its 80–90th percentile; shot limits leave the search bot ≥ 90% clears while random aim mostly fails. Re-calibrated after doubling sand (fric 4.8); Silence's side and bottom sand patches were made a little smaller to keep it ≥ 90% (48 seeds: 44/48; old sand 45/48, doubled sand with the old patches 40/48):

    | # | Level | Stars (★★★/★★) | Limit | Search bot: clear, median / p80 / p90 | Random aim: clear, median |
    |---|---|---|---|---|---|
    | 17 | Night Dunes | 3 / 5 | — | 24/24, 2 / 2 / 3 | 24/24, 4 |
    | 18 | Obelisk Road | 3 / 5 | — | 24/24, 2 / 3 / 4 | 24/24, 13 |
    | 19 | Quicksand Pit | 7 / 12 | — | 24/24, 7 / 11 / 17 | 21/24, 23 |
    | 20 | Buried Pilgrims | 5 / 7 | — | 24/24, 4 / 6 / 8 | 20/24, 21 |
    | 21 | Stingers | 4 / 7 | 10 | 24/24, 5 / 7 / 8 | 5/24, 9 |
    | 22 | Scorpion Camp | 3 / 6 | — | 16/24, 2 / 4 / 17 | 20/24, 22 |
    | 23 | Silence Before the Gate | 3 / 5 | 8 | 44/48, 3 / 5 / 7 | 2/24, 5 |
    | 24 | Twin Guardians | 20 / 29 | — | 24/24, 23 / 29 / 32 | 9/24, 53 |

    For reference the same bot on chapter 2: basilisk boss median 27 (stars 18/26), gaze 11 (5/9). Scorpion Camp is bimodal for the bot (2 shots when it throws a matching knight into a pair, long when it breaks the pairs); a person aims at the pairs. Tune from David's playtests.
- **Chapter 4 · The Drowned Capital** (story in `STORY.md`): the phoenix's lighthouse, the sunken streets and cathedral of Aurelia, the Hydra in the throne tower. Creatures: phoenix (companion) and hydra (the boss's kind), with dragon/unicorn in some levels. Lake table (`TABLE_BY_CHAPTER[4] = 'lake'`, cool blue-grey). Level-only mechanics, all values in `CONFIG`:
  - **Currents** (whole chapter; `CONFIG.current` accel 300, maxK 1.4, drift 130; level field `current: [[y, h, k]]`): full-width water bands (centre y, half-height h). A **moving** piece whose centre is inside a band is pushed sideways two ways: its velocity gets accel × k px/s², and its position drifts drift × k px/s (velocity untouched) (k > 0 right, k < 0 left; |k| 1 normal, up to 1.4 strong). Resting pieces are never moved, accel × maxK stays below the sliding friction (`phys.A` 560), and the drift never changes velocity, so every piece still comes to rest exactly when it would without the drift. The drift was added after David's playtest ("currents feel too weak; twice as strong") because raising accel would break that rule. Sideways displacement of a pawn launched straight up through a k = 1 band (180 deep / 120 deep), before → after: weak shot (900) 38 → 98 / 31 → 126, mid (1500) 20 → 41 / 13 → 27, strong (2300) 13 → 25 / 8 → 16; bishop mid 19 → 41 / 12 → 27. So ≈ 2× for mid and strong shots; a slow piece that coasts to a stop inside a band is carried 2.5–5× further (it spends longer in the water). The aim line follows the same rule. Drawn as blue strips with arrows drifting in the push direction. **Classic never has currents**, so its physics and `tests/golden/physics.json` are unchanged.
  - **Hydra heads** (levels 30 and 32; `CONFIG.hydra` r 34, regrow 4; level field `heads: [[x, y, hp]]`, goal `heads`): targets with health (bar + hp number) standing in coils; pieces bounce off them like pillars. A merge blast damages them by pillar rules (radius by tier, damage = tier number × cluster size). At 0 hp a head is **cut**: a stump with a green countdown badge, and after 4 spawns it grows back at full health (≈ 3 shots to deal with it). **Phoenix fire**: when the finishing blast comes from a chain (2nd+ merge of one shot), a cluster merge (3+) or a checkmate, the head is **burned** instead and never returns; such a blast also burns a cut stump in range (a plain merge does nothing to a stump). So the play is: cut with anything, burn with a chain or cluster — or finish a weak head with fire in one stroke. Goal: burn every head (the "Burned!" flames + 300 bonus).
  - **Rising water** (level 32 only; `CONFIG.rise` every 3, step 25, max 125; level field `rise: true`): after every 3rd shot the danger line climbs 25 units, up to 125 above the normal line (after 15 shots). Pieces resting below the risen line count as inside it (the usual 3 s lose timer). The water between the risen line and the launch line is drawn blue with a wavy edge; the launch line itself does not move. Layout pieces of a rising-water level must sit above the highest water (core test).
  - **Phoenix cameo** (level 25, `intro: 'phoenix'`): the table starts dark; the phoenix flies across trailing fire and the table brightens behind her (app only, no game state).
  25. **Lighthouse Rock** — make a Bishop (phoenix only), one band across the middle. No losing. 26. **Sunken Streets** — 2 bank merges; two bands flowing opposite ways and two unbreakable ruined towers. No losing.
  27. **Market Under Water** — 2 chain merges; both chain setups sit beyond a strong current. 28. **The Bell Tower** — break 3 bell pillars (6 hp) standing in the current (k −1), 16 shots; a bishop pair beside each outer pillar.
  29. **The Drowned Cathedral** — free 4 of 6 stone knights (goal `free`); two opposite bands. 30. **The First Head** — burn 1 head (3 hp); two hydra chain setups (pawn below a knight) beside it: one chain burns it in a single stroke, a plain merge only cuts it.
  31. **The Throne Stair** — make a Queen in 8 shots; two strong opposite currents (k ±1.4); rook, bishop and two knights lined up. 32. **Boss: The Hydra** — burn 3 heads (4 hp each; stone statues so they are never mistaken for playable hydra pieces — David), rising water, one current; Hourglass + Polymorph Potion.
  - **Calibration** (`node tools/levelbot.js ch4 24 40`, same method as chapter 3; re-run after the drift was added). The Bell Tower's current was eased from −1.2 to −1.0 to stay ≥ 90% (48 seeds: 43/48; before the drift 44/48, with drift and −1.2 41/48). The Throne Stair on 48 seeds: 44/48:

    | # | Level | Stars (★★★/★★) | Limit | Search bot: clear, median / p80 / p90 | Random aim: clear, median |
    |---|---|---|---|---|---|
    | 25 | Lighthouse Rock | 3 / 5 | — | 24/24, 2 / 3 / 3 | 24/24, 5 |
    | 26 | Sunken Streets | 3 / 5 | — | 24/24, 2 / 3 / 3 | 24/24, 12 |
    | 27 | Market Under Water | 7 / 13 | — | 24/24, 7 / 11 / 17 | 24/24, 19 |
    | 28 | The Bell Tower | 8 / 13 | 16 | 43/48, 9 / 13 / 14 | 3/24, 15 |
    | 29 | The Drowned Cathedral | 5 / 7 | — | 24/24, 4 / 6 / 8 | 15/24, 16 |
    | 30 | The First Head | 2 / 5 | — | 24/24, 1 / 1 / 2 | 24/24, 15 |
    | 31 | The Throne Stair | 3 / 5 | 8 | 44/48, 3 / 4 / 5 | 3/24, 2 |
    | 32 | Boss: The Hydra | 16 / 35 | — | 22/24, 18 / 35 / 37 | 10/24, 30 |

    The bot is weak at aiming chains, so heads take it long: with 6 hp heads it cleared the boss 19/24 (median 28), with 4 hp it was bimodal (median 11, p80 26); the side session first chose 5 hp; David asked for 4 hp (shorter fight), re-run on 48 seeds: median 14, p80 33, p90 44. The First Head at 4 hp was bimodal for the bot too (median 6, p80 27); 3 hp makes one chain enough, as Elden's line says. Tune from David's playtests.
- **Finale · The Grail Throne** (story in `STORY.md`; chapter 5 in the code, header "Finale · The Grail Throne / 終章・聖杯王座"): two warm-up levels, one per head, then the three-phase Chimera boss (level 35, slice 2). Throne-hall table (`TABLE_BY_CHAPTER[5] = 'throne'`: cold grey-violet, gold rim). Level-only hazards, all values in `CONFIG`; timing `{ every, first }` = strikes after shot `first`, `first + every`, … (the HUD shows "🦁 Roar in N" / "🐐 Curse in N" under the shot count):
  - **Lion's roar** (level 33; `CONFIG.roar` push 330; level field `roar: { every, first }`): once the table has stopped after such a shot, every piece on the table gets 330 px/s toward the line and slides there with the normal physics — a pawn about 75 units, a king about 53 (bigger pieces have more friction). Then the next cup comes. A piece pushed over the line starts the usual lose timer. The held cup is never pushed. **Classic never roars**, so its physics and `tests/golden/physics.json` are unchanged.
  - **Goat's curse** (level 34; `CONFIG.curse` minTier 0; level field `curse: { every, first }`): between shots a random piece on the table (not stone, not held) turns to stone — the chapter 2 petrified piece: it cannot merge until a merge blast or checkmate nearby frees it ("Freed!", counts for the `free` goal). Uses the stinger RNG, so the spawn order is unchanged; Undo restores it.
  33. **The Lion's Roar** — make a Queen; dragon + phoenix; rook, bishops and knights laid out; roar after shot 2, then every 3. 34. **The Goat's Curse** — free 4 stone pieces; unicorn + griffin; two stone bishops at the start, a curse after shot 1, then every 2.
  - **Calibration** (`node tools/levelbot.js lion,goat 24 40`, same method as chapters 3–4; `… 24 1` = random aim):

    | # | Level | Stars (★★★/★★) | Limit | Search bot: clear, median / p80 / p90 | Random aim: clear, median |
    |---|---|---|---|---|---|
    | 33 | The Lion's Roar | 7 / 18 | — | 24/24, 7 / 18 / 20 | 1/24, 23 |
    | 34 | The Goat's Curse | 7 / 10 | — | 24/24, 7 / 9 / 12 | 24/24, 15 |

    The Lion's Roar is bimodal for the bot (2–5 shots when the opening chain lands, 11–22 when it has to rebuild after roars); random aim almost always loses to the roar, so the level asks for real play. The Goat's Curse is gentle (each curse makes a new stone to free next to the pieces you are already merging). Tune from David's playtests.

## 3. Core loop

1. A cup appears in the launch area (the next cup is previewed in a box at the left of the item bar, with its creature name and tier symbol — moved there in 11.1.1 so it never covers the table and sits where the eye already is).
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
- **Aim line**: toggle; shows predicted path and stop point (ignores collisions). Always on in Practice. Since 11.1.0 (playtest: "hard to judge distance and direction" in Classic): a line with a thin dark outline (thinned in 11.1.1), colour shows power (white → orange → red), dots mark wall bounces, and a power bar sits beside the cup.
- **Aim arrow** (aim line off, e.g. Classic): a short arrow from the cup while swiping — direction, with length and colour for power; no path or landing point, so judging distance stays a skill.

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
- **Practice**: all 5 items unlimited. **Levels**: starting items from `CONFIG.levels[i].items` (+ `slots`); no earning.
- **Best score**: Classic runs that used any item go to a separate "best with items" so they never overwrite the no-item best.
- Item icons are emoji placeholders.

## 8c. Rule additions (10.0.0, all values in CONFIG — tune after playtesting)

- **Difficulty ramp** (`CONFIG.ramp`, Classic only via mode hook `ramp: true`): every 3000 points = +1 pressure level, max 5. Each level moves spawn odds toward bigger cups (pawn 50% → 35%, rook 5% → 10% at max) and shrinks the lose timer (3 s → 2 s). The level shows under the Next box ("Pressure N") with a popup when it rises.
- **Skill bonuses** (`CONFIG.bonus`), only for the launched cup's first merge of a shot: **Bank shot** (it bounced off a wall first) +50% of that merge; **Long shot** (merge ≥ 520 units from the launch point) +30%. **Double**: another, separate pair merging in the same frame (not a chain product) +150. Bonuses also charge item energy.
- **Checkmate shockwave** (`CONFIG.shock`): two kings merging pushes every cup within 340 units outward (up to 1100 speed, falling off with distance) and shatters pawns within 170 (no score).
- ✅ **Three layers, one job each** (16.0.0, agreed with David after reviewing complexity): **equipment** = chosen before a run, passive, whole run; **ultimates** = earned in the run, creature skill and timing; **field items** = random help. Overlaps were cut (Inferno ≈ Dragonfire, Magnet ≈ Holy Light, packed item ≈ equipment). Interactive buttons on screen stay few; equipment adds none.
- ✅ **Field items, fantasy versions** (16.0.0): ⏳ Hourglass (undo), 🧪 Polymorph Potion (wild), 👑 Coronation Oil (up a tier, max rook). Inferno and Magnet removed. Supersedes the 5-item set and the "pack one item for the next run" option.
- ✅ **Armory / equipment** (`CONFIG.equip`, 16.0.0): bought and upgraded (3 levels) with VP, wear up to 3, Classic only, passive for the whole run. 🐲 Dragon Scale Charm (+0.4/0.7/1.0 s on the line timer), 🏆 Grail (ultimate charge ×1.2/1.35/1.5), 👁️ Seer's Eye (longer arrow / + landing point / full aim line), 🔨 Mason's Hammer (pillar damage ×1.5/2/2.5), ⚜️ King's Sceptre (+8/14/20% pawn chance), 🪙 Lucky Coin (VP ×1.2/1.35/1.5). Equipment runs count for the normal best; the result screen lists what was worn. Old packed items were refunded.
- ✅ **Worn-equipment strip** (16.0.3, David: "how do we know what is worn?"): during an Endless Campaign run a small chip row under the tray shows each worn item as icon + name + effect (e.g. 🪙 Lucky Coin ×1.2). Hidden in Proving Grounds / Quest, where equipment is off.
- ✅ **Trigger tuning** (16.0.5, David: "ultimates and items rarely trigger"): ultimate gauge full 40 → 24; a merge now also gives other in-play creatures with an ultimate `share` (0.5) of its charge; item energy cost 1500 → 800 points. Random-aim bot (40 games): first ultimate ready at median shot 38 → 19; first item 51 → 37. A real player scores more than the bot, so expect faster.
- ✅ **Ultimate label** (16.0.4): each ultimate portrait in the tray now shows its name and a status line under it: charge % while charging, "Tap!" when full, "Flick!" once armed.
- ✅ **Progressive unlocks** (`CONFIG.unlocks`, 16.0.0): start with merging only → field items after chapter 1 level 6 → ultimates after chapter 1 → Armory after 150 VP earned in total. The menu shows a one-time notice for each ("Got it"). Levels always give their own items.
- ✅ **Creature ultimates** (`CONFIG.ults`, 15.0.0; Classic charges, Practice always full, not in Levels). Principle (agreed with David): **hard on low tiers, kind to big pieces** — clear space without wrecking the pieces you are building, and help big merges happen.
  - Each creature has its own gauge (portrait with a charge ring in the item tray); merging that creature fills it (tier × 3, × (cups − 1) for clusters; checkmate +half). Full = 40.
  - Tap the glowing portrait → the cup in hand is enchanted (aura in the move's colour; tap again to cancel) → aim and flick as usual → it fires on its first cup/pillar hit, merge, or when it stops (wall bounces don't trigger, so bank shots work). Firing: slow motion, a cut-in with the creature king and the move's name, flash and shake.
  - 🐉 **Dragonfire** (dragon): explosion radius 150 — pawns and knights burn (points), bigger cups are pushed out, pillars −6 hp, stone freed. The enchanted cup is used up.
  - 🦄 **Holy Light** (unicorn): every cup within 160 becomes a unicorn and they are drawn together for ~1 s, so same-tier ones merge (clusters).
  - 🐍 **Venom Pool** (hydra): a pool (radius 120) that dissolves pawns now and before each of the next 3 shots, frees stone, and corrodes pillars (−3 per shot).
  - Items stay as they are (David): items are generic and random, ultimates are creature-specific and earned. Undo restores gauges.
  - Next batch: phoenix (Rebirth: burning trail, the phoenix cup itself goes up a tier), griffin (Gust: blows everything away from the line), basilisk (gaze: freezes a row into temporary walls), scorpion man (Piercing Sting).
- ✅ **Rune pillars** (`CONFIG.pillars`, Classic only, 12.0.0): Gemini pillar sprites (13.2.0; from David's approved reference: tapered stone on a round base, knotwork band, rows of sapphire-blue runes — blue being the one colour no creature uses) with 3 damage states: intact > 60% hp, cracked > 30%, crumbling below; procedural drawing as fallback that cups bounce off (counts as a wall hit, so bank shots work; the aim line bends around them). Pressure 2 → 1 pillar, pressure 4 → 2; placed only between shots, away from cups and the launch zone. 10 hp. Every merge's blast damages pillars in range: the new cup's tier number in hp (knight 2 … king 6) within 110–190 units, × (cups − 1) for cluster merges; a checkmate deals 10 within the shockwave radius. Inferno burns pillars in its range. A broken pillar gives +300 and is replaced 3 shots later. Levels place fixed pillars instead (hp per pillar; hp 0 = unbreakable).
- ✅ **Cluster merge** (`CONFIG.cluster`, 11.0.0): when two cups merge, every same-creature, same-tier cup touching the group (within 6 units, chained; 30 units since 16.1.0 — see below) is absorbed in the same merge. The result is still one tier up (decided: +2 tiers for 4+ would make kings and checkmates too easy); score × number of cups when 3 or more (checkmate × n−1). Wild cups join any cluster. Effects scale with size: absorbed cups streak into the centre, triple ring, heavier shake and hit-stop, "N× MERGE!" label, extra sound. Phone vibration only on Android — iOS Safari has no vibration API.
- ✅ **Cluster feel** (16.1.0, David: "cluster merges don't feel satisfying — make the trigger and the display clearer, e.g. the cups flash white and fuse"): reach `cluster.touch` 6 → 30 units (supersedes 6: with 6 a cluster almost never formed, since touching matches merge at once). Matching cups within reach on the table are joined by pulsing dotted white lines; when the cup in hand matches, the lines brighten and a "×N" badge shows the merge size. On a cluster merge the absorbed cups flash white where they stand, then fly into the merge point and bloom; the new cup is hidden until they arrive (visual only, ~0.4 s).
- ✅ **Chapter 1 coaching** (16.1.0, David chose A + B + D, animation only): **A** demo — on Flick!, Bank Shot, Chain and Cluster, a touch dot presses the cup and swipes, then a ghost cup slides along the path (via a wall on Bank Shot) to a pulsing target; it stops when the player touches and returns after 6 s idle until the goal is done. **B** hint bar — the briefing tip is one sentence; in play a one-line hint appears at the top at the right moment (level start, first shot, first merge, bank bonus, chain, cluster, item, pillar break, first king) and fades after 7 s. **D** recap — clearing a chapter 1 level shows "✅ You learned: …" and "Next: …". Not done: a hint button that shows the answer (C) — wait for family playtests. Data: `hints` / `demo` per level, timing in `CONFIG.tutor`.
- ⏳ **Story campaign** (decided 2026-11-24, see `STORY.md`): epic tone; 4 chapters + finale; bosses Basilisk (ch2), Twin Scorpion Guardians (ch3), Hydra (ch4), Chimera (finale, = King Aurel, freed by the Rebirth Feather). Companions Dragon, Unicorn, Griffin, Phoenix. Text cards first (chapter open/close, Elden's line per level) — ✅ built for chapters 1–4: opening card once before a chapter's first level, closing card after the first clear of its last level, both re-readable from 📜 buttons on the chapter list. The Chimera is an 8th creature that VP cannot buy; clearing the finale unlocks it — ✅ built: 8th slot in Capture Beasts / Codex shows a dark silhouette "???" with "Defeat the final boss to unlock."; `Profile.unlockChimera` (save v9 `finaleCleared`) is ready for the finale to call. No art yet (procedural cup), no ultimate. Chapters 3 (17.0.0) and 4 (currents, hydra heads, rising water) are built; the finale is next.
- ~~Crowding~~ — removed in 10.7.2 (David: a full table should be harder, not rescued). Supersedes the 10.0.0 rule that removed the oldest pawn above 24 cups.

## 9. Screens (✅ portrait, iPad first)

| Screen | Contents |
|---|---|
| **Name** | **Kings of Cups / 聖杯之王** (decided and applied 2026-11-23, 13.2.0; was Sliding Cups / 滑杯子), subtitle "Flick · Merge · Checkmate / 甩出去・合成・將死". Repo name, URL, storage key and backup-code prefix `SC1` unchanged so saves and codes still work. Close to the "King's Cup" drinking game: before any App Store release, do a proper trademark search and use the store subtitle to signal "mythic creature merge" (fallback name: "Chalice Kings"). |
| **Title** | Cover art (`art/cover/cover.jpg`, Gemini key art: seven crowned creatures around a glowing chalice; the seven king sprites show if it fails to load) + game name + one **Enter** button (13.1.0). The first tap also unlocks iOS audio. |
| **Menu** | 16.2.2 (David): **📜 Story / 冒險故事** is the big orange button (opens the chapter/level list; shows chapter + stars); **⚔️ Classic / 經典模式** (renamed from Endless Campaign / 無盡戰役 in 18.1.1) (best score) and **🛡️ Proving Grounds / 練功場** side by side; zh wording: pieces are 棋子 (not 杯子), creatures are 收服 (tamed), shots are 次 (not 發), 蠍尾人 kept. Before (16.0.1): Endless Campaign was the big button; **Capture Beasts / 捕獲神獸** and **⚒️ The Forge / 鐵匠鋪** tiles; ⚙️ Settings. Supersedes the 13.1.0 order (was: **Levels** (big, chapter + stars), **Classic** (best score) and **Practice** side by side, **Creatures** and **Items** tiles; ⚙️ Settings (top right) holds language and Backup — the usual game layout keeps rarely used options out of the main menu.) |
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
- Chapter 4+: to be designed (see `STORY.md` open questions). Ideas still open: narrow tables, target zones, the basilisk's gaze petrifying cups during play.

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
