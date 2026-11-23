# Changelog

Versioning (`major.minor.patch`):
- **patch**: bug fixes, tuning (energy cost, VP prices, magnet strength, ranges…), text/layout tweaks.
- **minor**: new content on existing mechanics (creatures and art, items, skins, levels, languages, sounds).
- **major**: new mode, new core mechanic (e.g. items, special tables, obstacles), big physics change.
- Doc/test-only changes don't release. Release with `node tools/release.js patch|minor|major -m "..."`.

## 10.2.0 — 2026-11-23 (minor)
- Unicorn art replaced with Gemini-drawn sprites (6 tiers × 4 expressions) via art-src/composite.py

## 10.1.0 — 2026-11-23 (minor)
- Dragon art replaced with Gemini-drawn sprites (6 tiers × 4 expressions), composited onto the shared cup by art-src/composite.py

## 10.0.0 — 2026-11-23 (major)
- Rule additions: difficulty ramp (pressure levels), skill bonuses (bank shot / long shot / double), checkmate shockwave, crowding rule. Added CLAUDE.md.

## 9.3.0 — 2026-11-23 (minor)
- Unicorn art (6 tiers × 4 expressions). Dragon and unicorn heights re-ranked by tier (t1 → t6 rise every step, t6 is the cap). The table leaves room above it so a king at the far edge never leaves the screen.

## 9.2.1 — 2026-11-22 (patch)
- Dragon t4–t6 creatures scaled down (cup and collision unchanged) so big cups stop hiding others.

## 9.2.0 — 2026-11-22 (minor)
- Dragon art: 6 tiers × 4 expressions (idle / happy on merge / fast / blink), Mignola-style vectors; each cup blinks about every 4 s.

## 9.1.3 — 2026-11-22 (patch)
- Internal: effect state and spawners moved into one `Fx` object (with `reset`, so a new run clears leftover effects).

## 9.1.2 — 2026-11-22 (patch)
- Internal: overlays turned into a `SCREENS` table; `render()` split out the top-layer drawing (no visible change).

## 9.1.1 — 2026-11-22 (patch)
- Internal: event handling split into sound / effects / progress-and-screens subscribers (`FX_ON` / `RUN_ON`), no visible change.

## 9.1.0 — 2026-11-22 (minor)
- Sweep renamed **Inferno**: a big fire burns about 3 rows of cups (big ones included — the player's trade-off), 🔥 icon; while held, an orange dashed line marks its range; flame effects and sound.

## 9.0.0 — 2026-11-22
- Switched to major.minor.patch versioning, starting here (earlier v1–v9 were build numbers and aren't backfilled).
- Contents: Classic / Practice / Levels (3); 7 creatures (dragon art in progress, others procedural); VP and unlocks; 5 items (sweep, upgrade, wild, magnet, undo) earned by energy or packed with VP; English / Traditional Chinese; stone sounds and juice; offline PWA; saved progress.
