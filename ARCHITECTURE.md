# Sliding Cups — Architecture v0.2

**Status:** current as of 10.0.0 · **Updated:** 2026-11-22 · supersedes v0.1 (translated to English; added rules, art pipeline, layout headroom).

Goals: **easy to maintain, easy to test, easy to swap art**. One `index.html` (vanilla JS + Canvas 2D, no build tools, no backend); sprites in `art/`. iPad first.

## 1. Layers

```
index.html
├─ CORE (/*#core-start*/ … /*#core-end*/, no DOM, runs in Node)
│   ├─ CONFIG    every tunable: world size, physics, tiers, creatures, scoring, spawn odds, VP, levels, items, ramp, bonus, shock, cluster, pillars
│   ├─ RNG       seeded mulberry32 (replays, daily challenge, tests); get/set state for Undo
│   ├─ Physics   pure physics: fixed step 1/120 s, friction, walls, circle collisions, merges; only emits events
│   ├─ Modes     mode objects with rule hooks (see 7a)
│   ├─ Game      rules + state machine: spawning, curling-style launch, scoring, bonuses, items, ramp, win/lose; update() returns events
│   ├─ Flow      screen state machine (transition table)
│   └─ Profile   player progress: best scores, VP, unlocks, levels, items to pack, settings; migrations
└─ APP (browser)
    ├─ Storage   reads/writes localStorage only; everything passes through Profile.migrate
    ├─ i18n      STR { en, zh } + t()
    ├─ Sfx       Web Audio synthesis, driven by events
    ├─ Sprites   loads art/<kind>/… with procedural fallback
    ├─ Renderer  layout / project / toWorld / drawPiece / drawTable …
    ├─ Fx        visual-effect state and spawners
    ├─ events    subscribers: Sfx → FX_ON → RUN_ON
    ├─ Input     pointer events → Game.beginDrag / dragTo / endDrag
    ├─ UI        HUD, item bar, overlays (SCREENS table)
    └─ main      requestAnimationFrame loop (never dies)
```

## 2. Dependency rules

- CORE never uses `document`, `window`, `canvas` or `performance`. Time always comes from outside (`dt`, event timestamps).
- Physics knows nothing about score or winning; Game knows nothing about the screen.
- APP talks to CORE only through `Game.*`, `Profile.*` and events. Effects, sound and saving are event subscribers.

## 3. Events (returned by Game.update / Game.useItem)

| type | fields | used for |
|---|---|---|
| `hit` | v, tier, ta, tb, a, b, x, y | cup–cup impact (too soft → none): impact sound, sparks, squash |
| `wall` | v, x, y, id | wall impact |
| `merge` | kind, tier, x, y, a, b, id, combo, gain | effects, sound, level goals, bonuses |
| `checkmate` | kind, x, y, a, b, gain | two kings merged |
| `shockwave` / `shatter` | x, y (kind) | checkmate push / pawns destroyed by it |
| `bonus` | id (bank, long, double), gain, x, y | skill bonus popup |
| `rampup` | level | pressure level rose |
| `spawn` | — | new cup in hand |
| `fade` | x, y | Practice: cup faded out |
| `item`, `itemget`, `sweepcup`, `upgrade`, `wild` | … | item use / gained / burned cup / effects |
| `gameover` | score | save best, show result |
| `levelclear` | level, score | level won |

New gameplay = new mode hooks or events + subscribers; physics stays untouched. Physics events only *describe* motion — adding fields never changes the simulation (the golden baseline guards this).

## 4. Game state

`phase`: `ready` (waiting to launch) → `flying` (cups sliding) → 0.25 s after everything stops `spawn` → `ready`; danger timer full → `over`; level goal met → `won`.
Screens are managed by `Flow`:

```
menu ──kinds──▶ kinds ──menu──▶ menu
menu ──items──▶ items ──menu──▶ menu
menu ──levels─▶ levels ──start──▶ playing
menu ──start──▶ playing ──pause──▶ paused ──resume/restart──▶ playing
                   │                  └──menu──▶ menu
                   └─gameover/clear─▶ result ──restart──▶ playing
                                        └──menu──▶ menu
```
`Game.update` runs only in `playing`; backgrounding the tab pauses; the result screen fades in after 0.9 s so the final table is visible. Illegal transitions are ignored.

## 5. Launch rule (core of the feel — don't change casually)

The cup follows the finger and nothing launches inside the launch area. The moment the finger crosses `LINE_Y`, speed comes from the last 100 ms of finger movement:
`out = sp ≤ KNEE ? sp·GAIN : KNEE·GAIN + (sp−KNEE)·GAIN_HI`, capped at `VMAX`.
Below `VMIN` → back to the middle; releasing inside the launch area → back to the middle. Values in `CONFIG.phys`.

## 6. Rendering and art

`drawPiece(sx, sy, R, kind, tier, state)` is the only way a cup is drawn (table, Next preview, level goals):
- **With a sprite**: `art/<kind>/<kind>_t<1..6>.png` (768×768, anchor (384,690), rim radius 128 px — see ASSET_SPEC.md). Drawn size = image × (cup radius ÷ 128). Shadows and the selection glow are drawn by the game.
- **Without** (not delivered, failed to load, or `?art=0`): procedural `drawCupAt`. Decided per creature × tier, so art can arrive one image at a time.
- **Expressions**: `_happy` on merge, `_fast` while sliding fast, `_blink` about every 4 s (staggered by cup id); falls back to the default image.
- Preloading: the run's creatures (all expressions) load on start; procedural drawing covers the gap.
- Collisions always use the logical circle (CONFIG.tiers radius), independent of art. Hit squash applies to sprites; the white flash only to procedural cups.
- **Layout headroom**: `layout()` reserves space above the table so the tallest piece (king, `ART_TOP` ≈ 174 world units) stays on screen even at the far edge.
- The service worker serves `art/` stale-while-revalidate: new art shows after one reopen and works offline.
- **Art pipeline**: `art-src/<kind>/build.js` generates SVGs (Mignola style: thick silhouette line, hard black shadows, flat fills; S-curved neck, head tilted 30°, headwear kept level). `art-src/sizes.py` computes per-tier creature scale into `art-src/sizes.json` so in-game heights rise 50 → 70 → 95 → 120 → 145 → 170. `python3 art-src/render.py <kind> art/<kind>` exports the 24 PNGs and preview sheets.

## 7. Saves and progress (Profile)

`localStorage['slidingcups.save'] = { v: 4, best: { classic, classicItems }, vp, unlocked: [0,1], active: [0], cleared: [], carry: null, lang: 'en', sound: true }`. To change the format bump `v` and add a migration in `Profile.migrate` (v1 → v2 → v3 → v4 exist; progress is kept).

**All progress rules live in core `Profile`** (no DOM, tested). APP `Storage` only reads/writes localStorage; everything read goes through `Profile.migrate`, which repairs any bad data (negatives, duplicates, out-of-range or locked creatures, unknown language; unlocks are always contiguous from 0).
- `fresh / migrate / buy / toggleKind / nextLockedKind / levelOpen / clearLevel / bestKey / recordBest / toggleCarry / takeCarry / bankRun / finishRun / setLang / toggleSound`.
- `bankRun` banks VP once per run via `game.banked`; `clearLevel` pays only on the first clear.
- **Sprite cache (performance)**: drawing the 768 px sprites shrunk every frame made crowded late-game tables stutter on iPad (David, Level 3, three creatures, table 2/3 full). Each sprite is now `decode()`d off the main thread and shrunk once into a small canvas sized for its tier's largest on-screen size (`Sprites.scaled`, rebuilt when the layout changes); frames draw only those copies. `tests/perf/bench.py` measures render time on a crowded table (desktop numbers are relative only; iPad needs on-device testing).
- **Menu art**: `python3 art-src/menu_art.py` makes `art/<kind>/<kind>_tN_thumb.png` (one shared crop box, palette PNG, ~8 KB each) and the app icons (Gemini king dragon) from the game sprites; re-run after sprite changes.
- Save v5 adds `seen[k]` = highest tier made per creature (-1 = none); `Profile.see` records it on merge events.
- ✅ Backup codes (`Profile.exportCode` / `Profile.importCode`): `SC1.<base64url JSON>.<FNV-1a checksum>`. Import strips whitespace, verifies the checksum, then runs `migrate`, so old or hand-edited codes are repaired rather than trusted. The Backup screen validates first and replaces progress only on a second tap (no browser confirm dialogs). Used because iOS can evict site data and the Safari tab and home-screen app keep separate storage. Clipboard/share on iOS PWA: needs on-device testing.

## 7a. Mode hooks

Each mode declares its rules; APP/Game never test `mode.id === 'x'`: `hud` ('best' | 'level'), `banner` (i18n key or null), `goalKinds(g)` (level goal or null), `givesVP`, `tracksBest`, `pickNext`, `assistForced`, `danger` ('lose' | 'fade'), `items` ('earn' | 'fixed' | 'free'), `ramp` (difficulty ramp on/off). New mode = add an object to `Modes` and make sure its `banner` has translations. `Game.rematch(g, kinds)`: Levels replay the same level, others restart with the given creatures.

## 7b. VP and unlocks (`CONFIG.vp`)

- VP per run = `floor(score / 500)` + `kings × 10`; 0 in Practice. Banked once on game over, quit or restart.
- Sequential unlocks: dragon and unicorn free; then 100 / 200 / 350 / 550 / 800 VP. Prices are estimates; rebalance from play.
- `active` = creatures for the next run (at least 1, default dragon only). `?kinds=N` forces the first N (testing).

## 7c. Levels

- `CONFIG.levels[i] = { kinds, reward, items }`: goal is a king of every kind listed; creatures fixed; lose rule as Classic. 3 levels: dragon → dragon + unicorn → dragon + unicorn + hydra.
- On success `Game.update` emits `levelclear` and sets `phase = 'won'`; Flow goes to the result via `clear`.
- Reward only on the **first clear**. Levels unlock in order.
- Constraint levels later: add fields (e.g. `maxShots`, `timeLimit`) and check them in `Game.update`; physics untouched.

## 7d. i18n

`STR = { en, zh }` + `t(key, {vars})`, English default, toggled in the menu and saved. Core contains no text; events carry data only. All visible text (overlays, canvas text, creature/item names) goes through `t()`. Missing keys fall back to English. New language = add `STR.xx` and the toggle.

## 7e. Sound

`Sfx` synthesizes everything with Web Audio (no files): impacts (volume by speed, pitch by cup size), walls, launch whoosh, merge chords (pentatonic, rising with tier and chain), jingles, spawn, clicks, item sounds, bonus chime, pressure-up, shockwave. All driven by events via `Sfx.event(ev)`.
- iOS starts audio only after the first touch (`Sfx.unlock()` on `pointerdown`); `navigator.audioSession.type = 'playback'` so the mute switch doesn't silence it (Safari 17+, needs on-device testing).
- Bottom "Sound" button saved as `sound`. Audio suspends when backgrounded. Impacts/walls are rate-limited; output goes through a compressor.

## 7f. Juice

All in APP, event-driven, never affects physics: stone-impact sounds, chips and impact rings, squash + flash on struck cups, screen shake, short hit-stop on heavy hits and high merges. `JUICE = { shake, hitstop, sparks, squash, rings }` are strength multipliers (0.45 / 0.35 / 0.35 / 0.5 / 0.6; 0 disables).

## 7g. PWA

- `manifest.webmanifest` (standalone, portrait, icons 192/512 incl. maskable), `icons/`, `sw.js`. iOS meta tags for home screen, full screen, dark status bar.
- Caching: the page is network-first (`cache: 'no-store'`, falls back to cache offline); `art/` stale-while-revalidate; other files cache-first. The cache name follows the version (`tools/release.js`).
- The service worker registers only on http(s), so opening the file locally is unaffected. Hosted on GitHub Pages (main / root).
- iPad: Safari → Share → Add to Home Screen. **Home-screen and Safari-tab saves are separate.**

## 7h. Stability and diagnostics (iOS)

- **The loop never dies**: `frame()` uses try/catch/finally; errors are shown, never freeze the game.
- **Size guard**: `layout()` skips drawing while the stage is tiny (iOS home-screen launch can report 0 briefly); `ResizeObserver`, `resize`, `pageshow` and `visualViewport` all re-run it.
- No `inset` shorthand (old iOS).
- **Red error bar** at the bottom shows any real error with the version (tap to close); sanitized "Script error." from extensions/share sheets is ignored. Version label bottom right; tap it for the debug panel.

## 7i. Items (core, `CONFIG.items`)

- Config: `slots`, `energyCost`, `sweepDepth` (Inferno range; item id is still `sweep`), `defs[{id,cost}]` (`cost` = VP to pack), item parameters (`upgradeMax`, `magnet*`).
- `Game.itemSlots / canUse / useItem(g, id)` (returns events, or `null` if not usable).
- **Items use their own RNG** (`g.itemRng`), so spawn order is unaffected.
- **Undo** = a snapshot before every launch (`g.snap`: cups, score, kings, next cup, both RNG states, energy, bag); replaying after undo gives an identical result (tested).
- **Wild** = cup flag `wild`; `Physics.collide` merges same-tier cups when same kind or either is wild. Without items the simulation is bit-identical to before.
- Profile: `carry`, `toggleCarry / takeCarry`, `best.classicItems`, `bestKey(g)`.
- APP: `#items` bar (uses `pointerdown` so redraws never swallow taps), energy bar, Items screen, sounds and effects (magnet glow, wild rainbow ring, inferno flames + range line). Icons are emoji (`ICON`) for now.

## 7j. Rule additions (core, 10.0.0)

- **Ramp** (`CONFIG.ramp`, mode hook `ramp`): `Game.rampLevel(g)` = floor(score / every), capped; `Game.spawnCum(g)` interpolates spawn odds toward `cumMax`; `Game.dangerTime(g)` interpolates the lose timer toward `dangerMin`. Emits `rampup`.
- **Bonuses** (`CONFIG.bonus`): on launch `g.shot = { id, x0, y0, walls, done }`; wall events for that cup count `walls`; the first merge involving the shot cup pays bank (walls > 0) and/or long (distance ≥ `longDist`). Double = a second merge in the same frame whose parents weren't made earlier that frame. Uses the `a`, `b`, `id` fields on merge events.
- **Shockwave** (`CONFIG.shock`): applied in `Game.update` on checkmate — radial velocity push with linear falloff; pawns inside `shatter` are removed.
- **Aim drawing**: `drawAssist` (after cups) → full path via `Physics.predictPath` (now also returns `pts.bounces`) when the aim line is on, otherwise `drawAimArrow`; power colour/bar from `aimPower`/`aimColor`; sizes in `AIM`. The Next cup is a DOM tile (`#tray` → `#nextBox`, own small canvas redrawn by `refreshNext` only when the next cup changes); the canvas no longer draws a Next box.
- **Rune pillars**: `world.pillars` ({id, x, y, r, hp}); `Physics.hitPillars` runs after cup collisions (wall-like bounce, emits `wall`). Game: `placePillars` at each spawn (own `pillarRng`, so spawn order is unchanged), `blastPillars` on merge/checkmate, Inferno removes pillars in range, Undo snapshots pillars + RNG + respawn wait. Events: `pillar`, `pillarhit` {dmg, hp}, `pillarbreak`. Drawn procedurally (`drawPillar`), depth-sorted with cups.
- **Cluster merge**: `Physics.merge` calls `clusterOf` (breadth-first over touching matching cups, wilds included; two wilds adopt the first real creature that joins). `merge`/`checkmate` events carry `n` (cups absorbed), `ids` and `from` (their positions, for effects); scoring, the double bonus and the shot bonuses use `ids`.
- Crowding rule removed in 10.7.2 (`CONFIG.crowd` and the `crowd` event are gone).

## 7k. Versioning

`major.minor.patch`, **single source `package.json`**; `index.html` `APP_VERSION` (shown bottom right) and the `sw.js` cache name are updated together by `tools/release.js`; `tests/version.test.js` and the e2e tests check they match.
- **patch**: fixes, tuning, text/layout tweaks. **minor**: new content on existing mechanics (creatures, art, items, skins, levels, languages, sounds). **major**: new mode, new core mechanic, big physics change. Lower parts reset. Doc/test-only changes don't release.
- Changing feel/physics means regenerating `tests/golden/physics.json` deliberately and noting it in the changelog.
- The save-format version (`Profile.VERSION`) is independent of the game version.
- Flow: `node tools/release.js minor -m "..."` → run tests → commit → `git tag vX.Y.Z` → push.

## 7l. APP structure

- **Event bus**: events go to `subscribers` in order — `Sfx.event` → `FX_ON[type]` (visual only) → `RUN_ON[type]` (progress and screen changes). New event = add a function to the right table; unhandled events are ignored.
- **Overlays**: `SCREENS = { menu, kinds, items, levels, paused, result }`, each returns HTML; `showScreen()` picks one by `Flow` state. New screen = entry + Flow transition + `act()` handling.
- **Drawing**: `render()` draws table and cups; overlays on top via `drawNextBox / drawParticlesAndPopups / drawModeInfo` (not affected by shake).
- **`Fx` object**: all effect state (`particles / popups / sparks / rings / flames / squash / fireT / shake / hitstop`) with spawners (`kick / hold / ignite / impact / burst / popup / flame`), `update(dt)`, `reset()` (called on start/restart).

## 8. Tests

`npm test` (or `./tests/run.sh`) runs all Node tests; `npm run test:e2e` (or `./tests/run.sh --e2e`) adds browser end-to-end tests.
- `tests/core.test.js` (117): RNG, merges, scoring, checkmate, physics, launch, mode hooks, Profile, items, ramp, bonuses, shockwave, crowding, Flow, levels, sound events.
- `tests/golden.test.js` + `tests/golden/physics.json`: **physics baseline** (5 seeds × 3 lengths, 16 cups each, precision 1e-6), matched bit-for-bit against the original prototype. Regenerate only for deliberate feel changes: `node tests/golden.test.js --update`.
- `tests/i18n.test.js` (9): en/zh key parity, `{var}` parity, every used key exists, names for every creature/item/bonus, no Chinese in English strings.
- `tests/version.test.js` (4): version consistency.
- `tests/e2e/run.py` (53, Playwright + Chrome, `CHROME_PATH` to override): menus, pause, lose, replay, launch and sound, VP and unlocks, corrupted save, levels, items, language, sprites loaded, PWA offline, iPhone touch, zero-size layout survival, error bar.
- `tests/_load.js`: extracts the core (`loadCore()`) and `STR` (`extractObject`) from `index.html`.
- URL params: `?kinds=N`, `?seed=N`, `?art=0`. Debug hooks: `window.SC`, `window.__game`, `__flow`, `__sfx`, `__sprites`.

## 9. History

1. ✅ Layered refactor (feel unchanged) + tests
2. ✅ Flow, menus / pause / result overlays
3. ✅ Saves, VP, sequential unlocks, Creatures screen
4. ✅ Levels; English / Traditional Chinese
5. ✅ Sprite rendering with fallback
6. ✅ Web Audio sound; 7. ✅ PWA
8. ✅ Items (9.x); semver releases (9.0.0)
9. ✅ Dragon and unicorn art (9.2–9.3)
10. ✅ Rule additions: ramp, bonuses, shockwave, crowding (10.0.0)
