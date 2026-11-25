# Kings of Cups — Architecture

**Status:** current code (19.0.0, save v9) · **Updated:** 2026-11-25
How the code is built now. Rules and numbers: [GAME_DESIGN.md](GAME_DESIGN.md). Why: [docs/DECISIONS.md](docs/DECISIONS.md). Art spec: [ASSET_SPEC.md](ASSET_SPEC.md).

Goals: easy to maintain, easy to test, easy to swap art. One `index.html` (vanilla JS + Canvas 2D, no build step, no backend); sprites in `art/`. iPad first.

## 1. Layers

```
index.html
├─ CORE  /*#core-start*/ … /*#core-end*/  — one closure `SC`, no DOM, loaded in Node by tests/_load.js
│   ├─ CONFIG   every tunable (world, phys, rules, scoring, vp, ramp, bonus, shock, cluster, tutor, ults, pillars,
│   │           items, equip, unlocks, story, sand, sting, guard, current, hydra, rise, roar, curse, poison, chimera,
│   │           levels, tiers, kinds)
│   ├─ makeRng  seeded mulberry32 with get/set state (Undo, replays, tests)
│   ├─ Physics  fixed step, friction, walls, circle collisions, pillars, merges/clusters, sand, currents; emits events only
│   ├─ Modes    classic / level / practice: rule hooks (§4)
│   ├─ Game     rules + state machine: spawn, launch, scoring, bonuses, items, ultimates, equipment, ramp, pillars,
│   │           level goals and chapter mechanics, win/lose; update() returns events
│   ├─ Flow     screen state machine (transition table)
│   └─ Profile  save format v9 + migrations, VP, unlocks, levels/stars, story cards, equipment, backup codes
└─ APP (browser)
    Storage · STR/t() · Sfx · Sprites · layout/project/toWorld · Renderer (draw*) · Fx · FX_ON / RUN_ON · Tutor ·
    Input (pointer → Game.beginDrag/dragTo/endDrag) · SCREENS/showScreen/go/act · frame() loop
```

**Dependency rules**: CORE never touches `document`, `window`, `canvas` or `performance`; time comes in as `dt` or event timestamps. Physics knows nothing of score or winning; Game knows nothing of the screen. APP talks to CORE only through `Game.*`, `Profile.*`, `Flow.*` and events; effects, sound and saving are event subscribers. Physics events only describe motion — adding fields never changes the simulation (the golden baseline guards this). New gameplay = new mode hooks, level fields or events + subscribers; Classic physics stays untouched.

## 2. Core entry points

| Module | Exports |
|---|---|
| `Physics` | `createWorld, makeCup, advance, substep, isMoving, isSettled, predictPath, inSand, currentAt` |
| `Game` | `create, restart, setMode, startLevel, rematch, setKinds, vp, update, goalProgress, levelOf, starsFor, armUlt, ultKinds, ultReady, ultOf, hazardIn, poisonOf, setFeatures, setEquip, eqVal, beginDrag, dragTo, endDrag, estimateV, launchV, assistOn, itemSlots, canUse, useItem, rampLevel, spawnCum, dangerTime` |
| `Flow` | `create(start = 'title'), send(f, ev)` (illegal transitions return false and are ignored) |
| `Profile` | `VERSION, NB, CHIMERA, fresh, migrate, nextLockedKind, buy, unlockChimera, toggleKind, levelOpen, storyIds, storyBefore, storyAfter, readStory, clearLevel, bestKey, recordBest, eqNextCost, buyEquip, toggleWear, wornLevels, features, newFeatures, ackFeature, bankRun, finishRun, setLang, toggleSound, see, discovered, exportCode, importCode` |

**Game state**: `phase` `ready` (cup in hand) → `flying` → `SETTLE_T` after everything stops `spawn` → `ready`; danger timer full or out of shots → `over`; level goal met → `won` (`levelclear` carries `shots`, `stars`). `Game.update` runs only while Flow is `playing`.

**Launch rule** (core of the feel — don't change casually): the cup follows the finger; nothing launches inside the launch area. When the finger crosses `LINE_Y`, speed = last `HIST_MS` of movement: `out = sp ≤ KNEE ? sp·GAIN : KNEE·GAIN + (sp−KNEE)·GAIN_HI`, capped at `VMAX`; below `VMIN` or released inside → back to the middle.

## 3. Events (returned by `Game.update` / `Game.useItem` / `Game.armUlt`)

| type | fields | meaning |
|---|---|---|
| `hit` | v, tier, ta, tb, a, b, x, y | cup–cup impact (too soft → none) |
| `wall` | v, x, y, id, pillar? | wall or pillar impact (counts for bank shots and ultimate triggers) |
| `merge` / `checkmate` | kind, tier, x, y, a, b, id, combo, gain, n, ids, from | merge (n = pieces absorbed, `from` = their positions) / two kings |
| `shockwave` / `shatter` | x, y (kind) | checkmate push / pawn destroyed |
| `bonus` | id (bank, long, double), gain, x, y | skill bonus |
| `rampup` | level | Classic pressure rose |
| `spawn`, `fade` | — / x, y | new cup in hand / piece faded (`danger: 'fade'`) |
| `item`, `itemget`, `upgrade`, `wild` | … | item used / gained / effects |
| `ultready`, `ultarm`, `ultimate`, `burn`, `dissolve`, `convert` | … | ultimates |
| `pillar`, `pillarhit` {dmg, hp, guard?, head?, chimera?, mateOnly?}, `pillarbreak` | … | pillars, guardians, heads, Chimera |
| `unstone` | x, y, id | stone piece freed (goal `free`) |
| `sting`, `stingdrop` | x, y, id, kind, tier, from / old | chapter 3 stingers |
| `headcut`, `headburn`, `headgrow` / `rise` | x, y, id / y | chapter 4 |
| `roar`, `curse`, `poisondrop`, `chimeraphase`, `chimeradown` | … | finale |
| `gameover` / `levelclear` | score / level, score, shots, stars | end of run |

## 4. Modes (`Modes`)

Hooks: `danger` ('lose' | 'fade'), `assistForced`, `tracksBest`, `givesVP`, `hud` ('best' | 'level'), `items` ('earn' | 'fixed' | 'free' | 'none'), `ults` ('charge' | 'free' | 'none'), `banner` (i18n key or null), `ramp`, `pillars`, `pickNext(g)`. APP and Game never test the mode id except `eqVal` (equipment = Classic only) and `bestKey`. New mode = add an object and translate its `banner`. `Game.rematch(g, kinds)`: levels replay the same level, other modes restart with the given creatures.

## 5. Flow (screens)

```
title ─enter→ menu
menu ─start→ playing · ─kinds→ kinds ─codex→ codex · ─armory→ armory · ─settings→ settings ─backup→ backup
menu ─levels→ levels ─brief→ brief ─start→ playing
levels ─story→ story ─brief→ brief | ─levels→ levels | ─story→ story (closing card → next opening)
playing ─pause→ paused ─resume/restart→ playing | ─menu→ menu | ─levels→ levels
playing ─gameover/clear→ result ─restart→ playing | ─brief→ brief | ─story→ story | ─menu→ menu
```

Back edges (`menu`, `settings`, `kinds`) return to the parent. `Flow.create('menu')` skips the title (tests). Backgrounding the tab pauses; the result fades in after 0.9 s.

## 6. Core systems

- **Clusters**: `Physics.merge` calls `clusterOf` (breadth-first over matching pieces within `cluster.touch`, wilds included; two wilds adopt the first real creature). Stones are skipped by `collide` and `clusterOf`.
- **Ramp** (`CONFIG.ramp`, hook `ramp`): `rampLevel(g)` = floor(score / every) capped; `spawnCum(g)` interpolates toward `cumMax`; `dangerTime(g)` toward `dangerMin` (+ Dragon Scale Charm).
- **Bonuses** (`CONFIG.bonus`): on launch `g.shot = { id, x0, y0, walls, done }`; the first merge involving the shot cup pays bank (walls > 0) and/or long; double = a second merge in the same frame whose parents weren't made that frame (uses `ids`).
- **Shockwave** (`CONFIG.shock`): applied in `Game.update` on checkmate — radial push with linear falloff; pawns inside `shatter` removed.
- **Pillars** (`world.pillars` {id, x, y, r, hp, …}): `Physics.hitPillars` after cup collisions (wall-like bounce, emits `wall` with `pillar: true`). Classic: `placePillars` at each spawn (own `pillarRng`). `blastPillars(g, x, y, radius, dmg, out, bonus, fire, mate)` on merge (radius `pillars.blast[tier]`, dmg (tier+1) × (n−1 for clusters ≥ `cluster.min`), `fire` = combo ≥ 2 or cluster) and checkmate (shock radius, `pillars.hp`, fire + mate). Guardians, heads and the Chimera are pillars with flags (§7).
- **Stones**: `cup.stone`; `blastStones` frees them on merge/checkmate (`unstone`). Layout cups mark them with a 5th field `'stone'`.
- **Items** (`CONFIG.items`): `itemSlots / canUse / useItem(g, id)` (events, or `null` if not usable). Own RNG `g.itemRng` (spawn order unaffected). **Undo** = snapshot before every launch (`g.snap`: cups, score, kings, next cup, spawn/item/pillar/sting RNG states, pillars, pillar wait, `lineY`, `roarShot`, shots, goal progress, gauges, armed ultimate, pools, energy, bag); replay after undo is identical (tested). **Wild** = cup flag `wild`; `collide` merges same tier when same kind or either is wild.
- **Ultimates** (`CONFIG.ults`, hook `ults`): `g.ult[kind]` gauges, `g.armed`, `g.proj` (enchanted cup in flight), `g.pools`, `g.gather`. `armUlt` enchants the held cup (`cup.ult`); `checkProjectile` (each frame, before scoring) calls `castUlt` on hit / pillar hit / merge / stop.
- **Equipment & features**: the app calls `Game.setFeatures(g, Profile.features(save))` and `Game.setEquip(g, wornLevels)` at each start/restart (`applyProfile`). Core reads equipment only via `eqVal(g, id)` (null outside Classic): line timer, ultimate charge, spawn odds, pillar damage, VP, aim assist; the app reads Seer's Eye for the arrow / landing ring.
- **Levels** (`CONFIG.levels[i]`): `{ id, chapter, kinds, reward, goal: { type, n, tier?, kind?, combo?, kinds? }, danger, stars: [a, b], shotLimit?, cum?, items?, slots?, cups: [[kind, tier, x, y, 'stone'?]], pillars?, hints?, demo?, sand?, sting?, guards?, current?, heads?, rise?, intro?, roar?, curse?, poison?, chimera? }`. `Game.restart` applies layout, danger rule, item slots and spawn odds; `tallyGoal` counts goal events each frame; `goalProgress` drives the HUD and the win check; shots are counted at launch (Undo restores them).

## 7. Chapter mechanics (level-only; Classic code paths and the golden baseline unchanged)

- **Sand** (ch3): `world.sand` [x, y, rx, ry] ellipses. `Physics.integrate` multiplies friction by `sand.fric` only while `world.sand` is non-empty and the centre is inside (`Physics.inSand`); `predictPath(c, v, pillars, sand, current)` does the same for the aim line.
- **Stingers** (ch3): `cup.sting` = shots left. `stingTick` (in `spawn`, levels with `sting`) counts down → `stingdrop` replaces the cup with tier − 1; then maybe stings a new one using `g.stingRng` (Undo snapshot `srng`).
- **Guardians** (ch3): pillars with `guard: true`, radius `guard.r`, from `guards`; `blastPillars` hits only the nearest guardian in range. Goals `guardians` (need = number of guards), `free` (`unstone`).
- **Currents** (ch4): `world.current` [y, h, k] bands (empty in `createWorld`). In `Physics.integrate`, only for a cup still moving after the friction step: `vx += currentAt(bands, y) × dt` (k × `current.accel`), then `x += driftAt(bands, y) × dt` (k × `current.drift`, velocity untouched), so currents can never keep a cup moving. Same in `predictPath`.
- **Hydra heads** (ch4): pillars with `head: true`, radius `hydra.r`, `cut` (shots to regrow; 0 = standing), `burned`. `blastPillars` → `hitHead`: damage; at 0 hp `headcut` (stump stays as an obstacle, `cut = regrow`) or with `fire` `headburn` (`burnHead`, removed, bonus); fire on a stump burns it. `regrowTick` (in `spawn`) counts stumps down → `headgrow`. Goal `heads` counts `headburn`.
- **Rising water** (ch4): `g.lineY` = danger line (`LINE_Y` at restart). `riseTick` (in `spawn`, levels with `rise`) moves it up by `rise.step` every `rise.every` shots down to `LINE_Y − rise.max`, emits `rise`. Danger/fade checks use `g.lineY`; launching uses `LINE_Y`. Layout pieces of a rising-water level must sit above the highest water (core test).
- **Finale hazards** (ch5): `hazard(g)` → `{ roar, curse, poison, base }` (the level's fields, or the Chimera's current phase with `base` = phase start shot); `dueAfter(S, n)` tests `{ every, first }`; `Game.hazardIn(g, 'roar'|'curse')` = shots to the next strike (HUD). **Roar**: when the table settles after a due shot, `roarDue(g)` (once per shot via `g.roarShot`) runs `roar()` instead of `spawn` — every non-held cup gets `vy += roar.push`, event `roar`; the next settle spawns. **Curse**: `curseTick` (in `spawn`) petrifies one random cup with `g.stingRng` → `curse`. **Venom**: `poisonOf(g)` = active pools; `poisonTick` (in `spawn`) counts `cup.poison` for resting non-stone cups inside (reset outside); at `poison.life` → tier − 1 (pawn removed), event `poisondrop` (tier −1 = dissolved).
- **The Chimera** (ch5): one pillar with `chimera: true, phase, since`, radius `chimera.r`. `blastPillars` → `hitChimera`: pillar damage; the last phase is clamped at 1 hp unless `mate` (`pillarhit.mateOnly`); at 0 hp `chimeraphase` (next phase, full hp, `since = g.shots`) or in the last phase `p.down = true` + `chimeradown`. Goal `chimera` counts both; need = phases.
- **Finale creature**: last entry of `CONFIG.kinds` with `finale: true` (a kind with `art: false` would get no image requests and a procedural cup); `vp.unlockCost` `null`. `Profile.NB` = VP-buyable creatures (sequential), `Profile.CHIMERA` = its index; `nextLockedKind` / `buy` never offer it; `Game.create` default kinds and `?kinds=N` exclude it.

## 8. Saves (`Profile`, save v9)

`localStorage['slidingcups.save']` (APP `Storage` only reads/writes; legacy `slidingcups.best` is read once):

```
{ v: 9, best: { classic, classicItems }, vp, unlocked: [0,1,…], active: [0], cleared: [], stars: [per level],
  equip: { id: level }, worn: [ids], vpEarned, ack: [features], story: [card ids], finaleCleared, lang, sound, seen: [per kind] }
```

- Everything read goes through `Profile.migrate`, which turns any input (old, broken, edited) into a valid v9 save: unknown fields dropped, negatives/duplicates/out-of-range fixed, VP unlocks contiguous from 0 (at least 2), the Chimera only with `finaleCleared`.
- Migrations by version: v5 `seen` (highest tier per creature; old saves start with each unlocked creature's pawn) · v6 `stars`; v≤5 level progress mapped onto chapter 1 · v7 `equip`, `worn`, `vpEarned` (estimated for old saves), `ack`; v≤6 packed `carry` item refunded · v8 `story` · v9 `finaleCleared`. Changing the format: bump `Profile.VERSION` (assigned by the coordinator) and add the step in `migrate`.
- `bankRun` banks VP once per run (`g.banked`); `clearLevel` pays the reward on first clear and `starBonus` per new star; `bestKey(g)` = `classicItems` for Classic runs that used an item.
- **Story cards**: `CONFIG.story.chapters` (+ `unfinished`: chapters with an opening card only). Ids `ch<N>.open` / `ch<N>.close`. `storyBefore(p, level)` → opening card before a chapter's first level (once); `storyAfter(p, level)` → closing card after the first clear of its last level; `readStory` marks it read.
- **Features**: `features(p)` → `{ items, ults, equip }` from `CONFIG.unlocks` and `equip.unlockVP`; `newFeatures` / `ackFeature` drive the one-time menu notices.
- **Backup codes**: `exportCode` → `SC1.<base64url JSON>.<FNV-1a checksum>`; `importCode` strips whitespace, checks the checksum, then runs `migrate` (old or edited codes are repaired, not trusted). The Backup screen validates first and replaces progress only on a second tap.

## 9. APP

- **Event bus**: each event goes to `Sfx.event` → `FX_ON[type]` (visual only) → `RUN_ON[type]` (progress and screen changes). New event = a function in the right table; unhandled events are ignored. `RUN_ON.levelclear` calls `Profile.clearLevel`, and for a `chimera` goal `Profile.unlockChimera` (result notice `result.chimera`).
- **Screens**: `SCREENS = { title, menu, settings, backup, kinds, codex, armory, levels, brief, story, paused, result }`, each returns HTML; `showScreen()` picks by Flow state; `go(ev)` sends a Flow event (start/restart also reset `Fx`, `Tutor` and start a cameo); `act(a)` handles `data-act` buttons. New screen = entry + Flow transition + `act()` case. Story card text: STR `story.ch<N>.*`, Elden's line `lv.<id>.elden`, title via `storyTitle(id)` ('story.end' for the last chapter's closing card); optional art `art/story/ch<N>.jpg`.
- **Drawing**: `render()` draws the table (`drawTable` → theme from `TABLE_THEMES` by `TABLE_BY_CHAPTER` {3: night, 4: lake, 5: throne}, else day; `drawSand`, `drawCurrent`, `drawPoison`, `drawRisenWater`), depth-sorted pieces and pillars (`drawPiece`, `drawPillar` with `PILLAR_ART`, `drawGuard`, `drawHead`, `drawChimera`), badges (`drawStingBadge`, `drawPoisonBadge`), sting darts (`drawStings`), ultimate pools (`drawPools`), cluster fuse (`drawGathers`), `drawClusterLinks`, `drawAssist` (aim line via `Physics.predictPath`, or `drawAimArrow`; sizes in `AIM`), `drawDemo`; then the top layer, unaffected by shake: `drawNextBox` (pressure label), `drawParticlesAndPopups`, `drawModeInfo` (goal, shots, stars, hazard countdowns), `drawHint`, `drawCutin`. The Next cup is a DOM tile in `#tray` (`refreshNext`); the `#items` bar and ultimate portraits (`[data-ult]`) use `pointerdown` so redraws never swallow taps.
- **`Fx`**: all effect state (particles, popups, sparks, rings, flames, gathers, stings, squash, shake, hitstop, `slow` (scales game dt), `cutin`, `cameo`) with spawners, `update(dt)`, `reset()`. `startCameo()` starts the griffin (`drawCameo`, hides the dropped cup until it lands) or phoenix (`drawLightCameo`) intro for the level's `intro`. `JUICE` strength multipliers (0 disables).
- **`Tutor`** (visual only): chapter 1 coaching from each level's `hints` / `demo`, a subscriber like Fx; `update(dt)` tracks shots and idle time; drawn by `drawHint` and `drawDemo`.
- **Sprites**: `drawPiece(sx, sy, R, kind, tier, state)` is the only way a piece is drawn. With a sprite: `art/<kind>/<kind>_t<1..6>[_happy|_fast|_blink].png` (768², anchor (384, 690), rim radius 128 px), scaled by cup radius ÷ 128. Without (missing, failed, `?art=0`, `art: false`): procedural cup, per creature × tier. The run's creatures preload at start; failed loads retry. Each sprite is shrunk once per tier into a small canvas (`scaled`, rebuilt on layout change, old canvases released) after it decodes (or 2 s); if a canvas or draw fails the full image is drawn, then the procedural cup — a piece never vanishes (`sprite-fails` in the debug panel). `stoneOf` = cached slate copy for stones/statues. Missing expressions fall back to the default image. Hit squash applies to sprites, the white flash only to procedural cups. Collisions always use the logical radius. `layout()` reserves headroom so a king at the far edge (`ART_TOP` ≈ 174) stays on screen.
- **Icons**: item and equipment icons are `<img>` from `art/items/<id>.png` / `art/equip/<id>.png` via `iconImg`; on error they become the emoji in `ICON_EMOJI` / `EQ_EMOJI`. Menu thumbnails `art/<kind>/<kind>_tN_thumb.png`.
- **i18n**: `STR = { en, zh }` + `t(key, vars)`; English default, missing keys fall back to English; core has no text. All visible text goes through `t()`. New language = add `STR.xx` and the toggle.
- **Sound** (`Sfx`): Web Audio synthesis from events (`Sfx.event`); `Sfx.unlock()` on the first `pointerdown`; `navigator.audioSession.type = 'playback'`; suspends in the background; impacts rate-limited; output through a compressor.
- **Stability**: `frame()` uses try/catch/finally so the loop never dies; `layout()` skips while the stage is tiny (iOS home-screen launch), re-run by `ResizeObserver`, `resize`, `pageshow`, `visualViewport`; no `inset` shorthand. A red error bar shows real errors with the version; sanitized "Script error." goes to `window.__ext` (debug panel). Tap the version label for the debug panel.
- **Debug hooks**: URL `?kinds=N`, `?seed=N`, `?art=0`; `window.SC` (core), `__game`, `__flow`, `__act`, `__sfx`, `__sprites`, `__project`, `__render`, `__tutor`, `__fx`.

## 10. Art pipeline

- Creature sprites: Gemini raw busts in the private repo jellyfruit/sliding-cups-art (`incoming/<kind id>/`, cloned next to this repo) → `python3 art-src/composite.py <kind>` → `art/<kind>/` (24 PNGs). Old vector sources: `art-src/<kind>/build.js` → `python3 art-src/render.py <kind> art/<kind>`; per-tier scale from `art-src/sizes.py` → `art-src/sizes.json`.
- `python3 art-src/menu_art.py` → menu thumbnails and app icons (re-run after sprite changes).
- `python3 art-src/pillars_and_cover.py` → `art/pillar/pillar_1..3.png`, `art/cover/cover.jpg`; prints the `PILLAR_ART` numbers for index.html.
- `python3 art-src/icons.py [art repo]` → `art/items/<id>.png`, `art/equip/<id>.png` (128 px) from `incoming/items/item_<id>.png`, `incoming/equip/eq_<id>.png`.
- Prompts: `art-src/GEMINI_PROMPTS.md`. Never commit raw images here.

## 11. PWA

`manifest.webmanifest` (standalone, portrait, icons 192/512 incl. maskable), `icons/`, `sw.js`; iOS meta tags. Caching: the page network-first (`cache: 'no-store'`, cache offline), `art/` stale-while-revalidate, others cache-first; cache name = version. The service worker registers only on http(s). New art shows after one reopen and works offline. Hosted on GitHub Pages (`main`, root). iPad: Safari → Share → Add to Home Screen; home-screen and Safari-tab saves are separate.

**Needs on-device testing**: `audioSession` playback under the mute switch (Safari 17+), clipboard/share of backup codes in the iOS PWA, sprite cache memory on iPad.

## 12. Versioning

`major.minor.patch`, single source `package.json`; `tools/release.js` updates `APP_VERSION` in index.html, the `sw.js` cache name and `CHANGELOG.md`; `tests/version.test.js` and e2e check they match. patch = fixes, tuning, text; minor = new content on existing mechanics; major = new mode or core mechanic or big physics change. Doc/test-only changes don't release. The save version (`Profile.VERSION`) is independent. Only the coordinator session releases (CLAUDE.md).

## 13. Tests

`npm test` (= `./tests/run.sh`): Node tests; `npm run test:e2e` (= `python3 tests/e2e/run.py`, needs `pip install playwright` and Chrome at `CHROME_PATH`, default `/usr/bin/google-chrome`).
- `tests/core.test.js` (214): RNG, physics, merges, clusters, scoring, launch, modes, Flow, Profile and migrations, items, Undo, ramp, bonuses, shockwave, pillars, ultimates, equipment, levels and goals, story order, every chapter mechanic, the Chimera and the ending.
- `tests/golden.test.js` + `tests/golden/physics.json`: physics baseline (5 seeds × 3 lengths, 16 cups, precision 1e-6). Regenerate only for a deliberate feel change: `node tests/golden.test.js --update`, and tell David.
- `tests/i18n.test.js` (10): en/zh key and `{var}` parity, every used key exists, names for every creature/item/bonus, story cards and Elden lines per level, no Chinese in English.
- `tests/version.test.js` (4): version consistency incl. the latest CHANGELOG entry.
- `tests/e2e/run.py` (139, Playwright + Chrome): menus, pause, lose, replay, launch and sound, VP and unlocks, corrupted save, levels, items, language, sprites, PWA offline, iPhone touch, zero-size layout, error bar, and walk-throughs of chapters 3, 4 and the finale (cards, cameos, mechanics, bosses, ending, en + zh).
- `tests/perf/bench.py`: render time on a crowded table (desktop numbers are relative only).
- `tests/_load.js`: `loadCore()` and `extractObject` (STR) from index.html. `tools/levelbot.js` (not a test): level calibration, see [docs/CALIBRATION.md](docs/CALIBRATION.md).
