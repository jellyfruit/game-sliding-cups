# CLAUDE.md — Kings of Cups (repo: game-sliding-cups)

**Status:** active · **Updated:** 2026-11-24 · **Version:** see `package.json`

## Purpose
Single-player flick-and-merge web game for David's family (iPad first, PWA). Same creature + same tier merge up a tier (pawn → king); two kings = checkmate. Lose when a cup rests inside the line too long.

## Conventions
- Talk to David in Traditional Chinese; code comments, identifiers, commits and docs in English (only the zh UI strings in `STR.zh` are Chinese).
- No framework, no build step. `index.html` holds everything; the core between `/*#core-start*/` and `/*#core-end*/` is DOM-free and tested in Node.
- All tunables live in `CONFIG`. Every save format has a version + migration (`Profile.migrate`).
- UI text only via the `STR` table (`t()`); English default, zh-Hant toggle.
- Versioning major.minor.patch, single source `package.json`; release with `node tools/release.js patch|minor|major -m "..."`.
- Do not change physics feel without updating `tests/golden/physics.json` on purpose and telling David.

## File map
- `index.html` — game (core: CONFIG, Physics, Modes, Game, Flow, Profile; app: Storage, i18n, Sfx, Sprites, Renderer, Fx, events, UI).
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA.
- `art/<kind>/<kind>_t1..6[_happy|_fast|_blink].png` — creature sprites (missing → procedural fallback).
- `art/pillar/pillar_1..3.png`, `art/cover/cover.jpg` — Gemini pillar sprites and title key art, made by `python3 art-src/pillars_and_cover.py` (prints `PILLAR_ART` numbers for index.html).
- `art/<kind>/<kind>_tN_thumb.png`, `icons/` — menu thumbnails and app icons made by `python3 art-src/menu_art.py`.
- `art-src/<kind>/build.js` — vector source for sprites; `art-src/sizes.py` (per-tier sizes), `art-src/render.py <kind> art/<kind>` (export). Gemini art: raw busts live in the separate private repo **jellyfruit/sliding-cups-art** (`incoming/<kind id>/`), cloned next to this repo; then `python3 art-src/composite.py <kind>`. Never commit raw images to this repo (history was purged once to remove them).
- `tests/` — `npm test` (core, golden physics, i18n, version), `npm run test:e2e` (Playwright + Chrome).
- `tools/levelbot.js` — level calibration bot (`node tools/levelbot.js ch3 24 40`); `tools/release.js` — releases.
- Docs: `README.md`, `STORY.md` (campaign story, Elden's level lines, chapter 3 plan), `GAME_DESIGN.md`, `ARCHITECTURE.md`, `ASSET_SPEC.md`, `ART_STYLE.md`, `CHANGELOG.md`.

## Run / deploy
Open `index.html` locally, or serve the folder (`python3 -m http.server`) for the service worker. Deploy = push to `main` (GitHub Pages: https://jellyfruit.github.io/game-sliding-cups/).

## Current stage
Gameplay complete (Classic / Practice / Levels, items, VP unlocks, save backup codes, cluster merges of 3+, rune pillars in Classic, Levels: chapter 1 = 8-level tutorial with in-play coaching (hint bar, ghost-shot demo, recap), chapter 2 = Basilisk's Lair with petrified cups, chapter 3 = Gates of the Sun with shifting sand, stingers and the Twin Guardians boss; goals and stars; creature ultimates for dragon/unicorn/hydra; 3 fantasy field items; Armory equipment; progressive unlocks). Art: all 7 creatures drawn by Gemini (raw busts in jellyfruit/sliding-cups-art; scorpion man's id is `aqrabuamelu`). Old vector sources stay in `art-src/<kind>/build.js`. Now: tuning feel from David's playtests, and building the story campaign.

## Next steps (agreed 2026-11-24, in this order)
1. ✅ **Story text in game** (16.2.0): chapter opening/closing cards and Elden's one line per level card for chapters 1–2 (text in `STORY.md`; strings via `STR`, en + zh). Closing card shows after a chapter's last level is cleared. Text-only cards; later `art/story/chN.jpg` if present.
2. ✅ **Chapter 3 · Gates of the Sun** (17.0.0; levels 17–24, `STORY.md` table): shifting sand (level-only friction patches — must not change Classic physics or `tests/golden/physics.json`), stingers (mark a cup; unmerged within 3 shots → drops a tier), Twin Guardians boss (two statues, separate hp, blast hits the nearer one, timed stings), Griffin cameo dropping the first cup on level 17. Put numbers in `CONFIG`, calibrate with bots, document in GAME_DESIGN.md.
3. **Chimera** locked silhouette ("???") in Capture Beasts; unlock only by clearing the finale (save migration needed).
4. Chapter 4 and the finale wait for David's story decisions (open questions at the end of `STORY.md`).
Ask David before changing story text; he edits it in his Story Bible doc.

## Decisions not to revisit
- Stay 2.5D (no 3D renderer); art is pre-made sprites.
- Physics feel (launch curve, friction, bounce) is approved — golden baseline guards it.
- Three layers with one job each: equipment (pre-run, passive), ultimates (in-run skill), field items (random help: Hourglass, Polymorph Potion, Coronation Oil). Runs that use items keep a separate best score. Don't add a system that overlaps another.
