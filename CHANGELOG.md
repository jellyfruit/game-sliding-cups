# Changelog

Versioning (`major.minor.patch`):
- **patch**: bug fixes, tuning (energy cost, VP prices, magnet strength, ranges…), text/layout tweaks.
- **minor**: new content on existing mechanics (creatures and art, items, skins, levels, languages, sounds).
- **major**: new mode, new core mechanic (e.g. items, special tables, obstacles), big physics change.
- Doc/test-only changes don't release. Release with `node tools/release.js patch|minor|major -m "..."`.

## 11.1.1 — 2026-11-23 (patch)
- Next cup moved next to the item bar (no longer covers the table); thinner aim line and arrow.

## 11.1.0 — 2026-11-23 (minor)
- Bigger Next box with creature name and tier. Aim line easier to read (outline, power colour, bounce dots, power bar); with the aim line off, a short direction/power arrow while swiping.

## 11.0.0 — 2026-11-23 (major)
- Cluster merge: matching cups touching a merging pair are absorbed too (3+ at once). Still one tier up, score × cups absorbed, bigger effects. Wild cups join clusters.

## 10.7.3 — 2026-11-23 (patch)
- Fix some creatures (e.g. dragon rook) showing the old plain cup on iPad: sprites no longer wait for decode(), which iOS Safari can leave unfinished; failed image loads retry.

## 10.7.2 — 2026-11-23 (patch)
- Removed the crowding rule (the oldest pawn no longer disappears when the table is full) to make crowded tables harder.

## 10.7.1 — 2026-11-23 (patch)
- Fix stutter on crowded tables (Level 3, many cups): sprites are decoded off the main thread and pre-shrunk once instead of every frame.

## 10.7.0 — 2026-11-23 (minor)
- Menu art: creature portraits (highest form reached; locked creatures as silhouettes), new Codex screen with all 42 forms (discovered by merging; 'New in codex!' popup), app icon now the Gemini king dragon. Save format v5 adds seen forms (older saves start with each unlocked creature's pawn).

## 10.6.0 — 2026-11-23 (minor)
- Backup screen: copy or share a save code and paste it back to restore progress (protects against iOS clearing data; moves progress between Safari and the home-screen app).

## 10.5.0 — 2026-11-23 (minor)
- Griffin and scorpion man sprites (Gemini) and hydra v2 (coiled body); all 7 creatures now use Gemini art

## 10.4.0 — 2026-11-23 (minor)
- Hydra sprites (Gemini): head count grows with tier (1 → 2 → 3)

## 10.3.0 — 2026-11-23 (minor)
- Basilisk and phoenix sprites (Gemini). composite.py: removes Gemini ground lines and finds the chest cut on the left so wing tips/tails don't skew placement

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
