# CLAUDE.md — Sliding Cups

**Status:** active · **Updated:** 2026-11-22 · **Version:** see `package.json`

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
- `art/<kind>/<kind>_tN_thumb.png`, `icons/` — menu thumbnails and app icons made by `python3 art-src/menu_art.py`.
- `art-src/<kind>/build.js` — vector source for sprites; `art-src/sizes.py` (per-tier sizes), `art-src/render.py <kind> art/<kind>` (export). Gemini art: raw busts live in the separate private repo **jellyfruit/sliding-cups-art** (`incoming/<kind id>/`), cloned next to this repo; then `python3 art-src/composite.py <kind>`. Never commit raw images to this repo (history was purged once to remove them).
- `tests/` — `npm test` (core, golden physics, i18n, version), `npm run test:e2e` (Playwright + Chrome).
- Docs: `README.md`, `GAME_DESIGN.md`, `ARCHITECTURE.md`, `ASSET_SPEC.md`, `ART_STYLE.md`, `CHANGELOG.md`.

## Run / deploy
Open `index.html` locally, or serve the folder (`python3 -m http.server`) for the service worker. Deploy = push to `main` (GitHub Pages: https://jellyfruit.github.io/game-sliding-cups/).

## Current stage
Gameplay complete (Classic / Practice / Levels, items, VP unlocks, save backup codes). Art: all 7 creatures drawn by Gemini (raw busts in jellyfruit/sliding-cups-art; scorpion man's id is `aqrabuamelu`). Old vector sources stay in `art-src/<kind>/build.js`. Now: tuning feel and rules from David's playtests.

## Decisions not to revisit
- Stay 2.5D (no 3D renderer); art is pre-made sprites.
- Physics feel (launch curve, friction, bounce) is approved — golden baseline guards it.
- Items: Inferno (sweep ~3 rows), Upgrade, Wild, Magnet, Undo; runs that use items keep a separate best score.
