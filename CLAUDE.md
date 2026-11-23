# CLAUDE.md — Sliding Cups

**Status:** active · **Updated:** 2026-11-22 · **Version:** see `package.json`

## Purpose
Single-player flick-and-merge web game for David's family (iPad first, PWA). Same creature + same tier merge up a tier (pawn → king); two kings = checkmate. Lose when a cup rests inside the line too long.

## Conventions
- Talk to David in Traditional Chinese; code comments, identifiers, commits and new docs in English (older docs are partly Chinese — translate when touched).
- No framework, no build step. `index.html` holds everything; the core between `/*#core-start*/` and `/*#core-end*/` is DOM-free and tested in Node.
- All tunables live in `CONFIG`. Every save format has a version + migration (`Profile.migrate`).
- UI text only via the `STR` table (`t()`); English default, zh-Hant toggle.
- Versioning major.minor.patch, single source `package.json`; release with `node tools/release.js patch|minor|major -m "..."`.
- Do not change physics feel without updating `tests/golden/physics.json` on purpose and telling David.

## File map
- `index.html` — game (core: CONFIG, Physics, Modes, Game, Flow, Profile; app: Storage, i18n, Sfx, Sprites, Renderer, Fx, events, UI).
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA.
- `art/<kind>/<kind>_t1..6[_happy|_fast|_blink].png` — creature sprites (missing → procedural fallback).
- `art-src/<kind>/build.js` — vector source for sprites; `art-src/sizes.py` (per-tier sizes), `art-src/render.py <kind> art/<kind>` (export).
- `tests/` — `npm test` (core, golden physics, i18n, version), `npm run test:e2e` (Playwright + Chrome).
- Docs: `GAME_DESIGN.md`, `ARCHITECTURE.md`, `ASSET_SPEC.md`, `ART_STYLE.md`, `CHANGELOG.md`.

## Run / deploy
Open `index.html` locally, or serve the folder (`python3 -m http.server`) for the service worker. Deploy = push to `main` (GitHub Pages: https://jellyfruit.github.io/game-sliding-cups/).

## Current stage
Gameplay complete (Classic / Practice / Levels, items, VP unlocks). Art: dragon + unicorn done, 5 creatures still procedural. Now: tuning feel and rules from David's playtests.

## Decisions not to revisit
- Stay 2.5D (no 3D renderer); art is pre-made sprites.
- Physics feel (launch curve, friction, bounce) is approved — golden baseline guards it.
- Items: Inferno (sweep ~3 rows), Upgrade, Wild, Magnet, Undo; runs that use items keep a separate best score.
