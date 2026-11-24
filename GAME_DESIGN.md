# Kings of Cups (聖杯之王) — Gameplay & UI Design v1.2

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
| **Levels** | One goal per level (make a piece, bank shots, chains, clusters, pillars, checkmate, kings) | Goal reached → next level | Per level: tutorial rules (no losing) or real rules; optional shot limit | ✅ Chapter 1 (8 levels) |
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
- ⏳ **Story campaign** (decided 2026-11-24, see `STORY.md`): epic tone; 4 chapters + finale; bosses Basilisk (ch2), Twin Scorpion Guardians (ch3), Hydra (ch4), Chimera (finale, = King Aurel, freed by the Rebirth Feather). Companions Dragon, Unicorn, Griffin, Phoenix. Text cards first (chapter open/close, Elden's line per level). The Chimera is an 8th creature that VP cannot buy; clearing the finale unlocks it. Chapter 3 level plan and mechanics (shifting sand, stingers, twin boss) are in `STORY.md`; not built yet.
- ~~Crowding~~ — removed in 10.7.2 (David: a full table should be harder, not rescued). Supersedes the 10.0.0 rule that removed the oldest pawn above 24 cups.

## 9. Screens (✅ portrait, iPad first)

| Screen | Contents |
|---|---|
| **Name** | **Kings of Cups / 聖杯之王** (decided and applied 2026-11-23, 13.2.0; was Sliding Cups / 滑杯子), subtitle "Flick · Merge · Checkmate / 甩出去・合成・將死". Repo name, URL, storage key and backup-code prefix `SC1` unchanged so saves and codes still work. Close to the "King's Cup" drinking game: before any App Store release, do a proper trademark search and use the store subtitle to signal "mythic creature merge" (fallback name: "Chalice Kings"). |
| **Title** | Cover art (`art/cover/cover.jpg`, Gemini key art: seven crowned creatures around a glowing chalice; the seven king sprites show if it fails to load) + game name + one **Enter** button (13.1.0). The first tap also unlocks iOS audio. |
| **Menu** | 16.0.1 (David): **⚔️ Endless Campaign / 無盡戰役** is the big button; **🗺️ The Quest / 展開歷險** (levels, chapter + stars) and **Practice (Proving Grounds / 演武場)** side by side; **Capture Beasts / 捕獲神獸** and **⚒️ The Forge / 鐵匠鋪** tiles; ⚙️ Settings. Supersedes the 13.1.0 order (was: **Levels** (big, chapter + stars), **Classic** (best score) and **Practice** side by side, **Creatures** and **Items** tiles; ⚙️ Settings (top right) holds language and Backup — the usual game layout keeps rarely used options out of the main menu.) |
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
- Chapter 3+: to be designed. Ideas still open: narrow tables, target zones, the basilisk's gaze petrifying cups during play.

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
