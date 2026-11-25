# Kings of Cups (聖杯之王) — Game design

**Status:** current rules of the game as built (19.0.0) · **Updated:** 2026-11-25
What the game does now, with the `CONFIG` key for each number. Why a rule is the way it is: [docs/DECISIONS.md](docs/DECISIONS.md). Bot numbers behind stars and limits: [docs/CALIBRATION.md](docs/CALIBRATION.md). Code: [ARCHITECTURE.md](ARCHITECTURE.md). Story and Elden's lines: [STORY.md](STORY.md).

## 1. Concept

Flick a cup (a chess piece on a creature) across the table like curling. When it touches a piece of the **same creature and same tier**, they merge into the next tier. Two kings merge into a **checkmate**. A piece resting inside the line too long loses the game. 2.5D top-down view, iPad first, portrait.

## 2. Modes

| Mode (en / zh) | Mode id | Goal | Lose | Items | Ultimates | Equipment |
|---|---|---|---|---|---|---|
| **Story / 冒險故事** | `level` | Per-level goal (§9) | Level rule `danger`: `'lose'` or `'fade'`; optional `shotLimit` | Fixed per level (`items`, `slots`) | none | none |
| **Classic / 經典模式** | `classic` | Endless high score | Piece in the line too long | Earned by energy | Charged by merging | Worn |
| **Proving Grounds / 練功場** | `practice` | Practice | Never (pieces in the line fade after `rules.FADE_T` 1.2 s) | All unlimited | Always full | Worn (Lucky Coin does nothing: no VP) |

Proving Grounds: aim line always on; no best score, no VP. Classic only: difficulty ramp, rune pillars. Classic and Proving Grounds open the **Prepare for battle** screen first (team of 1–`team.max` 4 tamed creatures + up to `equip.slots` 3 pieces of gear; the last choice is preselected and shared by both modes; Restart / Play again keeps it without the screen). Story levels have fixed creatures and no gear. Mode differences are mode hooks (`Modes`, see ARCHITECTURE.md).

## 3. Core loop

1. A cup appears in the launch area; the next one is previewed in the tray at the left of the item bar (creature name + tier symbol).
2. The player drags it and launches it by crossing the line.
3. It slides with friction and collides; same creature + same tier touching → merge (chains possible).
4. `rules.SETTLE_T` 0.25 s after everything stops, the next cup appears.

## 4. Pieces

- **Tiers** (`CONFIG.tiers`): pawn → knight → bishop → rook → queen → king; radius 22 / 28 / 36 / 46 / 58 / 72 on a 600 × 945 table (`CONFIG.world`).
- **Creatures** (`CONFIG.kinds`): dragon, unicorn, hydra, phoenix, basilisk, griffin, scorpion man (id `aqrabuamelu`, zh 蠍尾人), and the finale creature **Chimera** (`finale: true`). Different creatures never merge (except with Polymorph Potion).
- **Merge**: (creature, t) + (creature, t) → (creature, t+1) at the centre of mass, keeping the combined momentum. Contact is enough; no minimum speed.
- **Cluster merge** (`CONFIG.cluster`): every same-creature, same-tier piece within `touch` 30 units of the merging group (chained) is absorbed. Result is still one tier up; from `min` 3 pieces the score is × the number of pieces. Matching pieces in reach are joined by dotted white lines on the table, with a "×N" badge when the cup in hand matches; absorbed pieces flash white and fly into the merge point.
- **Checkmate**: two kings merge → both vanish, `scoring.checkmate` +2000, shockwave (`CONFIG.shock`): pieces within `radius` 340 are pushed out (up to `push` 1100), pawns within `shatter` 170 are destroyed.
- **Petrified (stone) pieces** (levels; any creature): grey statues that never merge (not in clusters) but still collide and count for the line. A merge blast in range (pillar blast radius) or a checkmate shockwave frees them ("Freed!").
- **Spawning**: tier odds `nextTierCum` = pawn 50%, knight 30%, bishop 15%, rook 5% (never queen/king); creature uniform from the run's active creatures; seeded RNG (`?seed=N` repeats a spawn order).

## 5. Physics and controls (`CONFIG.phys` — approved feel, guarded by `tests/golden/physics.json`)

| Item | Setting |
|---|---|
| Colliders | Circles, fixed step `STEP` 1/120 s |
| Mass | ∝ radius² × tier `massK` (1.0 → 1.5) |
| Friction | Deceleration `A` 560 + damping `K` 0.7, × tier `fric` (1.0 → 1.4) |
| Bounce | Cup–cup `E` 0.6 × average tier `bounce` (1.0 → 0.75); wall `EW` 0.35 × the cup's `bounce` |
| Launch | Max `VMAX` 3600; stop threshold `STOP` 8 |

At full power every tier stops beyond the launch line after hitting the far wall.

- **Curling launch**: a pressed cup follows the finger; nothing launches inside the launch area (which reaches a quarter above the line for a run-up). The launch happens the moment the finger crosses the line (`world.LINE_Y` 720): speed from the last `HIST_MS` 100 ms of movement, finger speed up to `KNEE` 700 × `GAIN` 0.9, the excess × `GAIN_HI` 1.7, capped at `VMAX`. Slower than `VMIN` 630, or released inside the area → the cup returns to the middle.
- **Aim line** (toggle; always on in Proving Grounds): predicted path and stop point ignoring collisions; outlined, colour by power (white → orange → red), dots at wall bounces, power bar beside the cup. Follows sand and currents.
- **Aim arrow** (aim line off): a short arrow while swiping — direction, length and colour for power; no path or landing point.

## 6. Table and losing

- The line is both the **launch line** and the **danger line**. A **stopped** piece on the player's side for `rules.DANGER_T` 3 s loses (Classic, levels with `danger: 'lose'`); moving across doesn't count. The line turns red and a countdown bar fills.
- Classic pressure shortens the timer (§8); Dragon Scale Charm lengthens it.

## 7. Scoring and VP

- Merge: `scoring.base` 10 × 2^newTier × chain (the n-th merge of one shot × n); cluster × pieces; checkmate +2000.
- **Skill bonuses** (`CONFIG.bonus`, the launched cup's first merge of a shot): bank shot (wall first) +`bank` 50%, long shot (≥ `longDist` 520 from launch) +`long` 30%; **Double** (a separate pair merging in the same frame) +`double` 150.
- Best score: Classic only; runs that used an item keep a separate best (`best.classicItems`); equipment runs count for the normal best.
- **VP** (`CONFIG.vp`): Classic run = floor(score ÷ `perScore` 500) + `kingBonus` 10 per king, × Lucky Coin; banked once per run (game over, quit or restart). Story: level `reward` on first clear + `starBonus` 10 per newly earned star. Proving Grounds: none.
- **Creature unlocks** (`vp.unlockCost`): dragon and unicorn free; then hydra 100, phoenix 200, basilisk 350, griffin 550, scorpion man 800, in order. Chimera: `null` = never for sale; tamed by clearing the finale. The team (`active`, 1–`team.max` 4, default dragon only) is picked on the prep screen; Capture Beasts only lists and tames.

## 8. Classic systems

- **Difficulty ramp** (`CONFIG.ramp`): every `every` 3000 points = +1 pressure, max `maxLevel` 5. Spawn odds move toward `cumMax` (pawn 35%, rook 10% at max); lose timer toward `dangerMin` 2 s. Shown under the Next box with a popup.
- **Rune pillars** (`CONFIG.pillars`): `count` by pressure (1 at pressure 2, 2 at pressure 4), placed between shots away from pieces and the launch zone; `hp` 10, radius `r` 26. Pieces bounce off (counts as a wall hit, so bank shots work; the aim line bends around them). Each merge's blast hits pillars within `blast[tier]` (110–190) for the new tier number (knight 2 … king 6), × (pieces − 1) for clusters; a checkmate deals `hp` within the shock radius. Broken: +`breakBonus` 300, replaced `respawnShots` 3 shots later. Sprites show intact / cracked / crumbling.
- **Field items** (`CONFIG.items`): bag of `slots` 2; a random item every `energyCost` 800 points (energy bar; Undo restores it). ⏳ **Hourglass** (`undo`): takes back the last shot (pieces, score, spawn order, energy, gauges). 🧪 **Polymorph Potion** (`wild`): the cup in hand merges with any piece of the same tier, becoming its creature (joins clusters, can checkmate). 👑 **Coronation Oil** (`upgrade`): the cup in hand goes up a tier, max rook (`upgradeMax`).
- **Ultimates** (`CONFIG.ults`; Classic charges, Proving Grounds always full, never in Story): every creature has an ultimate and a gauge (portrait in the tray, name + charge % / "Tap!" / "Flick!"). A merge adds tier × `perTier` 3 (× (pieces − 1) for clusters) to its creature and `share` 0.35 of that to the other creatures in play; a checkmate adds `full`/2. Full at `full` 26. Tap the portrait → the cup in hand is enchanted. Dragonfire, Holy Light and Venom Pool fire on its first piece/pillar hit, merge or stop (wall bounces don't fire them); the other five fire as it leaves the hand and show what they will do while aiming (always, aim line or not). Slow motion and a cut-in. **Theme: every ultimate transforms pieces into its creature, each keeping its own tier** (stone falls away too); each one picks and moves those pieces differently. Transforms score nothing by themselves; the merges they set up do.
  - 🐉 **Dragonfire** (`fireball`): pieces within `radius` 150 become dragons, then the blast pushes them outward (`push` 460, from `pushMin` 0.5× at the edge to 1× at the centre) so they bounce off walls and each other and merge when same-tier dragons meet; pillars −`pillarDmg` 6; the flicked cup is used up.
  - 🦄 **Holy Light** (`holy`): pieces within 160 become unicorns and are drawn together for 0.9 s, so same-tier ones merge.
  - 🐍 **Venom Pool** (`venom`): a pool of `radius` 110 stays for `shots` 3 shots; every piece that touches it (resting at its edge when it appears, or sliding in later) becomes a hydra; pillars −`pillarDmg` 3 when it appears and each shot; the flicked cup is used up.
  - 🔥 **Rebirth** (`rebirth`, fires as the cup leaves the hand): every piece whose edge is within `near` 60 of the danger line (or inside it) flies (`flyT` 0.8 s) to the most open spot of the upper table (`area` y 60–360, no overlaps) and becomes a phoenix. Only those pieces transform; the flicked cup goes on as a normal shot. Clears an imminent loss.
  - 🦅 **Fly Over** (`flyover`, fires as the cup leaves the hand): the cup becomes a griffin and flies over every piece and pillar to the aimed end point (the aim line's stop, ignoring pieces and pillars, at least `lineGap` 20 above the line; shown as an arc and landing ring while aiming, even with the aim line off). On landing it roars: the `near` 2 nearest pieces become griffins (own tier) and are drawn to it for `pullT` 0.9 s, so a same-tier one merges with it.
  - 🐍 **Stone Gaze** (`gaze`, at launch; the cone is shown while aiming): every piece in a cone ahead of the launch point (± `angle` 20°, `range` 700) turns to stone for `shots` 3 shots after this one (a teal badge counts down): a wall for bank shots that never merges and is **not freed early by anything** (merge blasts, other ultimates, Three Heads); then the stone falls away and each is a basilisk. The flicked cup goes on as a normal shot (it can bank off the new stones).
  - 🦂 **Piercing Sting** (`pierce`, at launch; its straight line and stop are shown while aiming): the cup becomes a scorpion man and a sting that flies straight along the aim at `speed` 1600, through every piece on its line without hitting it (each becomes a scorpion man, own tier), and stops at the first wall or pillar, where it stays. Same-tier neighbours that touch merge as usual.
  - 🦁 **Three Heads** (`three`, at launch; three rays are shown while aiming): the cup splits into three chimeras (own tier), fanning ± `spread` 22° at the same speed. A head that touches a piece becomes that piece's creature and tier and merges with it at once (frees ordinary stone; bounces off Stone Gaze stone and pillars); the heads pass through each other; a head that touches nothing stops as a chimera.
- **Equipment** (`CONFIG.equip`, The Forge): bought and upgraded (3 levels) with VP, up to `slots` 3 worn (chosen on the prep screen), passive, Classic and Proving Grounds (never Story). 🐲 Dragon Scale Charm +0.4/0.7/1.0 s line timer · 🏆 Grail ultimate charge ×1.2/1.35/1.5 · 👁️ Seer's Eye longer arrow / + landing point / full aim line · 🔨 Mason's Hammer pillar damage ×1.5/2/2.5 · ⚜️ King's Sceptre +8/14/20% pawn chance · 🪙 Lucky Coin VP ×1.2/1.35/1.5. A chip row under the tray shows what is worn; the result lists it.
- **Progressive unlocks** (`CONFIG.unlocks`, `equip.unlockVP`): field items after Story level 6 (`itemsLevel` 5), ultimates after chapter 1 (`ultsLevel` 7), The Forge after 150 VP earned in total. The menu shows a one-time notice for each. Story levels always give their own items.

## 9. Story levels (`CONFIG.levels`, 35 levels)

Common rules: sequential unlock; creatures fixed per level; a briefing card (Elden's line, tip, goal, star targets, rules) before each level; in play the top right shows "🎯 have/need", shots and the stars you'd get now; Pause repeats goal and tip. **Stars** by shots: ★★★ within `stars[0]`, ★★ within `stars[1]`, else ★. Goal types: `make`, `bank`, `chain`, `cluster`, `pillars`, `checkmate`, `kings`, `free`, `guardians`, `heads`, `chimera`. Level pillars are fixed (`pillars: [[x, y, hp]]`, hp 0 = unbreakable). **Chapter mechanics are level-only: Classic never has them.** Story cards: an opening card before a chapter's first level (once) and a closing card after the first clear of its last level, re-readable from 📜 on the chapter list.

**Chapter 1 · Training Grounds** (tutorial, one skill each; table "day"): 1 Flick! (make a knight) · 2 The Line (make a rook; can lose; Next preview) · 3 Bank Shot (2 bank merges around an unbreakable pillar) · 4 Chain (1 chain) · 5 Cluster (2 cluster merges) · 6 Items (queen within 10 shots with all three items) · 7 Pillars (break 2 of 3) · 8 Final Exam (a checkmate; can lose). Only 2 and 8 use the line rule; level 6 is lost only by running out of shots. Coaching (`hints`, `demo`, `CONFIG.tutor`): ghost-shot demo on Flick!, Bank Shot, Chain and Cluster (stops on touch, returns after `idleT` 6 s idle); one-line hint bar at key moments (fades after `hintT` 7 s); recap "✅ You learned … / Next …" on clear.

**Chapter 2 · Basilisk's Lair** (every level can be lost; petrified pieces): 9 The Gaze (basilisk rook, 15 shots) · 10 Pillar Maze (3 bank merges, 12 shots, 4 unbreakable pillars) · 11 Crowded Field (19 pieces, 3 stones; 2 clusters) · 12 Dominoes (one shot chains ×3; 6 shots) · 13 Siege (3 pillars of 7 hp, 15 shots) · 14 Twin Kings (dragon and unicorn kings) · 15 One Shot Each (queen in 10 shots, no items) · 16 Boss: The Basilisk (a king; Hourglass + Polymorph Potion).

**Chapter 3 · Gates of the Sun** (griffin, scorpion man; table "night"):
- **Shifting sand** (`CONFIG.sand.fric` 4.8; level `sand: [[x, y, rx, ry]]`): a piece whose centre is inside an ellipse patch slides with 4.8× friction; in every chapter 3 level.
- **Stingers** (`CONFIG.sting` `life` 3, `minTier` 1; level `sting: { every, first }`): between shots a random knight-or-bigger piece (not stone, not held) is stung (purple countdown badge). Not merged within 3 shots → drops a tier ("Poison! −1 tier"). Merging cures it. Own RNG (spawn order unchanged); Undo restores it.
- **Twin Guardians** (`CONFIG.guard.r` 40; level `guards: [[x, y, hp]]`, goal `guardians`): two stone scorpion-man statues (16 hp each). Pieces bounce off; a merge blast (pillar rules) or checkmate damages only the **nearest** guardian in range. Every 3 shots the nearer guardian stings a piece.
- **Griffin cameo** (level 17, `intro: 'griffin'`): the griffin drops the first piece.
- Levels: 17 Night Dunes (bishop) · 18 Obelisk Road (2 banks) · 19 Quicksand Pit (2 chains) · 20 Buried Pilgrims (free 4 of 6 stones) · 21 Stingers (rook in 10) · 22 Scorpion Camp (2 clusters, packed table) · 23 Silence Before the Gate (queen in 8) · 24 Boss: The Twin Guardians (Hourglass + Polymorph Potion).

**Chapter 4 · The Drowned Capital** (phoenix, hydra; table "lake"):
- **Currents** (`CONFIG.current` `accel` 300, `maxK` 1.4, `drift` 130; level `current: [[y, h, k]]`): full-width bands (centre y, half-height h; k > 0 right, < 0 left, |k| up to 1.4). A **moving** piece inside gets accel × k px/s² sideways plus a position drift of drift × k px/s (velocity untouched). Resting pieces are never moved; accel × maxK < `phys.A`, so every piece still stops. Blue strips with drifting arrows.
- **Hydra heads** (`CONFIG.hydra` `r` 34, `regrow` 4; level `heads: [[x, y, hp]]`, goal `heads`): stone hydra statues with health. A merge blast (pillar rules) damages them; at 0 hp a head is **cut** (stump, grows back at full hp after 4 spawns). If the finishing blast is a chain (2nd+ merge of one shot), a cluster (3+) or a checkmate, the head is **burned** for good (+300); such a blast also burns a stump in range. Goal: burn every head.
- **Rising water** (`CONFIG.rise` `every` 3, `step` 25, `max` 125; level `rise: true`): after every 3rd shot the danger line climbs 25, up to 125 above normal; pieces below it count as in the line. The launch line does not move.
- **Phoenix cameo** (level 25, `intro: 'phoenix'`): the dark table brightens behind the phoenix.
- Levels: 25 Lighthouse Rock (bishop) · 26 Sunken Streets (2 banks) · 27 Market Under Water (2 chains) · 28 The Bell Tower (3 pillars of 6 hp, 16 shots) · 29 The Drowned Cathedral (free 4 of 6) · 30 The First Head (burn 1 head, 3 hp) · 31 The Throne Stair (queen in 8, k ±1.4) · 32 Boss: The Hydra (burn 3 heads of 4 hp; rising water; Hourglass + Polymorph Potion).

**Finale · The Grail Throne** (chapter 5 in code; table "throne"). Hazard timing `{ every, first }`: strikes after shot `first`, `first + every`, …; the HUD shows "🦁 Roar in N" / "🐐 Curse in N".
- **Lion's roar** (`CONFIG.roar.push` 330; level `roar`): once the table stops after such a shot, every piece except the held one gets 330 px/s toward the line and slides with normal physics (a pawn about 75 units, a king about 53); a piece pushed over the line starts the lose timer.
- **Goat's curse** (`CONFIG.curse.minTier` 0; level `curse`): between shots a random piece (not stone, not held) turns to stone (stinger RNG; Undo restores).
- **Serpent's venom** (`CONFIG.poison.life` 3; pools `[[x, y, r]]`): a piece resting with its centre in a pool counts up between shots; after 3 in a row it drops a tier (a pawn dissolves). Leaving resets; stone is immune.
- **The Chimera** (`CONFIG.chimera` `r` 62, `kind` 7; level `chimera: { x, y, hp, phases }`, goal `chimera`): a large target on a gold-trimmed dais at the far edge, three phases of 10 hp, with phase pips (🦁 🐐 🐍) and a health bar. Blasts hurt it by pillar rules; at 0 hp the next phase starts at full hp and its hazard replaces the last: phase 1 roar (after shot 2, then every 3), phase 2 curse (after shot 1, then every 2), phase 3 two venom pools (r 70). In phase 3 plain blasts stop at 1 hp; only a checkmate in reach (shock radius + its radius) defeats it. A checkmate in phase 1–2 deals 10.
- **Ending**: the first clear of level 35 tames the Chimera (`Profile.unlockChimera`) — "🐲 The Chimera joins you!" — then the ending card ("The End / 結局").
- Levels: 33 The Lion's Roar (queen; dragon + phoenix) · 34 The Goat's Curse (free 4; unicorn + griffin) · 35 Boss: The Chimera (dragon only; Hourglass + Coronation Oil).

## 10. Screens (portrait, one-handed: controls at the bottom)

| Screen | Contents |
|---|---|
| Title | Cover art (`art/cover/cover.jpg`; the seven kings if it fails), name, **Enter** (first tap unlocks iOS audio) |
| Menu | **📜 Story** (big; chapter + stars) · **⚔️ Classic** (best) + **🛡️ Proving Grounds** (both open Prepare for battle) · **Capture Beasts** + **The Forge** tiles · ⚙️ Settings · one-time unlock notices |
| Settings / Backup | Language (en default / 繁體中文); Backup: copy/share a save code (`SC1.…`), paste to restore (second tap confirms) |
| Prepare for battle | Before Classic / Proving Grounds: creature cards (portrait, name, ultimate or not; 1–4, the rest disabled when full), gear cards (icon, level pips, effect; up to 3; locked note until The Forge opens), **Start**, Back |
| Capture Beasts / Codex | List only: tamed or not, taming price and VP still missing, ultimate or not, Codex button (portrait = highest form reached; Chimera "???" until tamed). Codex: every creature × 6 forms, revealed when first made by merging ("New in codex!") |
| The Forge | List only: level pips, current effect → next level, price and VP still missing, Buy / Upgrade |
| Levels / Story card / Briefing | Chapter list with stars and 📜 card buttons; story cards; briefing (§9) |
| Game | Score, best (Story: level, goal, shots, stars); table; tray (Next, items, energy, ultimate portraits, worn strip); bottom: Pause, Aim line, Sound |
| Pause / Result | Resume / Restart / Menu (leaving the tab pauses); score, new best, VP or reward, Play again / Next level / Menu |

## 11. Look and sound

- 2.5D: physics on a flat plane, projected when drawn. Tier = headwear (pawn → king's cross crown); creature heights rise 50 → 170 world units. Expressions: idle, happy (merge), fast (sliding), blink (~every 4 s). All 8 creatures have Gemini sprites (`ASSET_SPEC.md`, `ART_STYLE.md`); missing art falls back to a procedural cup.
- Table themes by chapter: day (Classic, ch 1–2), night (3), lake (4), throne (finale).
- Sound: Web Audio synthesis, no files — stone impacts by size and speed, walls, launch whoosh, pentatonic merge chords rising with tier and chain, jingles, item, bonus, pressure and shockwave sounds. No haptics on iPad.
- Juice (`JUICE`, 0.35–0.6): chips, rings, squash, flash, shake, hit-stop.

## 12. Platform

PWA on GitHub Pages: add to Home Screen, full screen, offline. Saves in localStorage with versioned migrations; the home-screen app and the Safari tab have separate saves (use Backup codes to move progress).

Tuning panel (David only): a device opened once with `?tune=elden` gets a Tuning tab in the debug panel (tap the version label) with sliders for feel values; changes apply live, stay on that device, and Export copies the changed values as JSON for Claude to put into `CONFIG`. While any value is changed a red "TUNING ON" badge shows and runs save no best score, VP, stars or level progress. `?tune=off` removes the tab and every change. Other players never see it.

## 13. Open

**Decided, not built**: Practice: clear the table, choose the next cup. Story art `art/story/chN.jpg`.

**Ideas (not discussed)**: more items (heavy shot, preview next three, ice); special tables (slopes, ice); daily challenge (fixed seed; seeding is ready); aim-line difficulty levels; narrow tables, target zones.

**Open ❓**: rebalance VP values and unlock prices from real play; should Classic add creatures automatically as the score rises?
