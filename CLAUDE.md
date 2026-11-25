# CLAUDE.md — Kings of Cups (repo: game-sliding-cups)

**Status:** active · **Updated:** 2026-11-25 · **Version:** see `package.json`

## Purpose
Single-player flick-and-merge web game for David's family (iPad first, PWA). Same creature + same tier merge up a tier (pawn → king); two kings = checkmate. Lose when a cup rests inside the line too long.

## Session rules
- One task per session; when done, update the docs and the handoff (Current stage / Next steps), then end the session.
- Read CLAUDE.md first, then open only the files the task needs (use the file map and grep, not whole-file reads).
- New decisions replace old text (and go to `docs/DECISIONS.md`); never append contradicting notes.
- Verification by tests and bots, not by long reasoning in chat.

## Conventions
- Talk to David in Traditional Chinese; code comments, identifiers, commits and docs in English (only the zh UI strings in `STR.zh` are Chinese).
- No framework, no build step. `index.html` = markup, CSS, inline error reporter + `APP_VERSION`, then plain `<script src>` files from `src/` sharing one global scope (order matters; top-level code may use only earlier files). Core (`src/core`, `src/data`) is DOM-free and tested in Node. New file → script tag + `CODE` in `sw.js`; files ≤ ~600 lines, each with a header (owns / depends on / must not touch).
- All tunables live in `CONFIG`. Every save format has a version + migration (`Profile.migrate`).
- UI text only via the `STR` table (`t()`); English default, zh-Hant toggle.
- Versioning major.minor.patch, single source `package.json`; release with `node tools/release.js patch|minor|major -m "..."`.
- Do not change physics feel without updating `tests/golden/physics.json` on purpose and telling David.
- Docs: one fact, one place. Rules → `GAME_DESIGN.md`; code → `ARCHITECTURE.md`; why → `docs/DECISIONS.md`; bot numbers → `docs/CALIBRATION.md`; releases → `CHANGELOG.md`.

## File map
| File | Owns | Main entry points |
|---|---|---|
| `index.html` | Markup, CSS, inline error reporter (`APP_VERSION`, red bar), script tags (load order) | — |
| `src/core/` | `config.js` `CONFIG` (all tunables) · `rng.js` `makeRng` · `physics.js` · `modes.js` · `game.js` (rules, ≈560 lines) · `flow.js` · `profile.js` (save v9) + `SC` | `Game.create/update/startLevel`, `Physics.advance/predictPath`, `Flow.send`, `Profile.migrate` |
| `src/data/` | `levels.js` `CONFIG.levels` (field reference at top) · `kinds.js` `CONFIG.tiers`, `CONFIG.kinds` | — |
| `src/app/` | `storage.js` `Storage`, save · `i18n.js` `STR` + `t()` · `sfx.js` · `stage.js` game, canvas, `layout`/`project` · `sprites.js` `Sprites`, `drawPiece` · `draw.js` world `draw*`, `PILLAR_ART` · `fx.js` `Fx`, `FX_ON`/`RUN_ON` · `tutor.js` · `renderer.js` `render` · `input.js` · `ui.js` HUD, `SCREENS`, `go`/`act` · `tune.js` `Tune` (tuning panel, `?tune=elden`) · `main.js` `frame()`, debug | `frame()`, `go(ev)`, `act(a)`, `showScreen()`, `drawPiece` |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA, offline cache (name = version; precaches every `src/` file) | — |
| `art/<kind>/` | Creature sprites `<kind>_t1..6[_happy\|_fast\|_blink].png`, menu thumbs `_tN_thumb.png` (missing → procedural) | `Sprites.get/draw` |
| `art/pillar/`, `art/cover/`, `art/items/`, `art/equip/` | Pillar sprites, title key art, item/equipment icons (128 px; emoji fallback `ICON_EMOJI` / `EQ_EMOJI`) | `PILLAR_ART`, `iconImg` |
| `art-src/` | Art tools: `composite.py <kind>` (Gemini busts), `pillars_and_cover.py`, `menu_art.py`, `icons.py`, `sizes.py`, `render.py` + `<kind>/build.js` (old vectors), `GEMINI_PROMPTS.md` | see ARCHITECTURE.md §10 |
| `tests/` | `core.test.js`, `golden.test.js` + `golden/physics.json`, `i18n.test.js`, `version.test.js`, `e2e/run.py`, `perf/bench.py`, `_load.js` (loads the core files in Node) | `npm test`, `npm run test:e2e` |
| `tools/levelbot.js` | Level calibration bot | `node tools/levelbot.js ch3 24 40` |
| `tools/release.js` | Releases (coordinator only) | `node tools/release.js minor -m "..."` |
| `GAME_DESIGN.md` | Current rules, with CONFIG keys | — |
| `ARCHITECTURE.md` | Current code structure, events, saves, tests | — |
| `docs/DECISIONS.md` | Decision log (date · decision · reason · supersedes) | — |
| `docs/CALIBRATION.md` | Bot tables, seeds, clear rates, how to run the bot | — |
| `STORY.md` | Campaign story, Elden's level lines (David's text) | — |
| `ASSET_SPEC.md`, `ART_STYLE.md` | Sprite spec, art direction | — |
| `README.md`, `CHANGELOG.md` | Public intro; releases only | — |

Gemini art: raw busts live in the separate private repo **jellyfruit/sliding-cups-art** (`incoming/<kind id>/`, `incoming/items/`, `incoming/equip/`), cloned next to this repo. Never commit raw images to this repo (history was purged once to remove them). The scorpion man's id is `aqrabuamelu`.

## Run / test / deploy
- Play: `python3 -m http.server` and open http://localhost:8000/ (service worker + full error messages). Opening `index.html` from disk also plays, but Chrome then hides error details from `src/` files.
- Test: `npm test` (core, golden physics, i18n, version); `python3 tests/e2e/run.py` (needs `pip install playwright`, Chrome at `CHROME_PATH`).
- Calibrate levels: `node tools/levelbot.js <ids|chN|all> [games] [trials]` (see `docs/CALIBRATION.md`).
- Release (coordinator only): `node tools/release.js patch|minor|major -m "..."` → tests → commit → tag → push.
- Deploy = push to `main` (GitHub Pages: https://jellyfruit.github.io/game-sliding-cups/).

## Current stage
Gameplay complete (19.0.1; code split into src/ files): Classic / Proving Grounds / Story; items, ultimates (dragon, unicorn, hydra), Armory equipment, progressive unlocks, VP, backup codes, cluster merges, rune pillars in Classic. Story: chapter 1 tutorial with coaching, chapter 2 Basilisk's Lair (petrified cups), chapter 3 Gates of the Sun (sand, stingers, Twin Guardians), chapter 4 The Drowned Capital (currents, Hydra heads, rising water), finale The Grail Throne (roar, curse, three-phase Chimera, ending; the Chimera joins after it). All 8 creatures have Gemini art. Now: tuning feel from David's playtests.

## Next steps (agreed 2026-11-24)
1–5. ✅ Story cards (16.2.0), chapter 3 (17.0.0), Chimera silhouette (16.3.0), chapter 4 (18.0.0), finale (19.0.0).
6. Next: tuning from David's playtests (roar, curse, boss health, sand, currents) — on-device tuning panel built (`?tune=elden`, branch claude/tuning-panel): David exports changed values as JSON, then put them into `CONFIG` (+ golden baseline on purpose); Chimera ultimate (Three Heads) inside the ultimates layer, when David wants it.

Ask David before changing story text; he edits it in his Story Bible doc.

## How work is split (agreed with David 2026-11-24)
- **One coordinator session** owns the main line (`main` and the coordinator's branch): it talks to David, merges, releases and deploys. Each new feature or separate task runs in its own **side session** on its own branch.
- **Side sessions never release:** no `tools/release.js`, no edits to the version in `package.json` / `APP_VERSION` / `sw.js`, no `CHANGELOG.md` entry, no tags, no push to `main`. They put a one-line changelog suggestion in their final report; the coordinator releases at merge time.
- **Save versions are assigned by the coordinator** when a side session starts (e.g. "use save v9"); a side session that needs a save change and has no number asks first.
- **Small slices, merged often:** split a feature into pieces that each work on their own, finish each with tests, and let the coordinator merge it; side sessions merge the latest `main` into their branch before reporting.
- **Run in parallel only what touches different areas** (e.g. creature screen vs. levels); work on the same area (e.g. two sets of new levels) runs one after the other.
- zh wording rules (David, 16.2.2): pieces are 棋子 (not 杯子), creatures are 收服 (tamed), shots are counted with 次 (not 發); 蠍尾人 stays the creature name; the endless score mode is 經典模式 / Classic (was 無盡戰役 / Endless Campaign, renamed 18.1.1). Story text in `STORY.md` is David's and is not reworded.

## Decisions not to revisit
Full log with reasons: `docs/DECISIONS.md`.
- Stay 2.5D (no 3D renderer); art is pre-made sprites.
- Physics feel (launch curve, friction, bounce) is approved — golden baseline guards it. Chapter mechanics are level-only; Classic never gets them.
- Three layers with one job each: equipment (pre-run, passive), ultimates (in-run skill), field items (random help: Hourglass, Polymorph Potion, Coronation Oil). Runs that use items keep a separate best score. Don't add a system that overlaps another.
