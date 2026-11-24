# Changelog

Versioning (`major.minor.patch`):
- **patch**: bug fixes, tuning (energy cost, VP prices, magnet strength, ranges…), text/layout tweaks.
- **minor**: new content on existing mechanics (creatures and art, items, skins, levels, languages, sounds).
- **major**: new mode, new core mechanic (e.g. items, special tables, obstacles), big physics change.
- Doc/test-only changes don't release. Release with `node tools/release.js patch|minor|major -m "..."`.

## 18.1.0 — 2026-11-24 (minor)
- Gemini icons replace the emoji for items (Hourglass, Polymorph Potion, Coronation Oil) and equipment (item bar, Forge, worn-gear strip, menu tile); emoji stay as fallback

## 18.0.1 — 2026-11-24 (patch)
- Sand and water currents are twice as strong (David's playtest): sand friction 4.8×, currents add a drift; chapter 3–4 stars re-calibrated, Silence Before the Gate and Bell Tower layouts eased

## 18.0.0 — 2026-11-24 (major)
- Chapter 4 · The Drowned Capital: levels 25–32 with water currents, the Phoenix lighting the lighthouse, the Hydra's stone heads (cut ones grow back; chains, cluster merges and checkmates burn them for good) and rising water in the boss fight; chapter 4 story cards and Elden's lines. Endless Campaign physics unchanged.

## 17.1.0 — 2026-11-24 (minor)
- Chimera: 8th Capture Beasts slot shown as a locked "???" silhouette (also in the Codex), tamed only by defeating the final boss, never for sale; save v9 adds finaleCleared. Every screen card now has a dark panel so text reads clearly over the table.

## 17.0.0 — 2026-11-24 (major)
- Chapter 3 · Gates of the Sun: levels 17–24 with shifting sand (level-only friction patches), stingers (a stung piece drops a tier unless merged within 3 shots), the Twin Guardians boss (two statues, separate health, blasts hit the nearer one, timed stings), the griffin's intro cameo, a moonlit table, and chapter 3 story cards and Elden's lines (en + zh). Chapter list re-reads only cards already read. Classic physics unchanged.

## 16.2.2 — 2026-11-24 (patch)
- Menu: Story (冒險故事) is the big button, Endless Campaign + Training Hall (練功場) below; zh wording: 棋子, 收服, 次 instead of 發; shorter unlock notices

## 16.2.1 — 2026-11-24 (patch)
- Fix the cup in hand sometimes not drawn (sprite copy failing on iOS): fall back to the full image or procedural cup; release old sprite canvases

## 16.2.0 — 2026-11-24 (minor)
- Story cards: chapter opening/closing cards and Elden's line on every level briefing (chapters 1–2, en + zh); save v8

## 16.1.0 — 2026-11-24 (minor)
- Chapter 1 coaching (demo, hint bar, recap); cluster merges reach 30 units with link preview and flash-and-fuse animation

## 16.0.5 — 2026-11-24 (patch)
- Tune triggers: ult gauge 24, shared charge 0.5, item energy 800

## 16.0.4 — 2026-11-24 (patch)
- Ultimate portraits show name and status (charge %, Tap!, Flick!)

## 16.0.3 — 2026-11-24 (patch)
- Show worn equipment (icon, name, effect) under the tray during Endless Campaign runs

## 16.0.2 — 2026-11-23 (patch)
- Rename modes: Classic Campaign -> Endless Campaign (無盡戰役), Practice -> Proving Grounds (演武場)

## 16.0.1 — 2026-11-23 (patch)
- Menu: Classic Campaign is now the big button; fantasy names — Classic Campaign, The Quest, Capture Beasts, The Forge (傳統戰役、展開歷險、捕獲神獸、鐵匠鋪).

## 16.0.0 — 2026-11-23 (major)
- Items reworked into three fantasy items (Hourglass, Polymorph Potion, Coronation Oil); new Armory with 6 upgradable equipment pieces for Classic (replaces packing an item, which is refunded); features now unlock step by step with a notice in the menu.

## 15.0.0 — 2026-11-23 (major)
- Creature ultimates (Classic + Practice): merge a creature to charge its gauge, tap its portrait to enchant your cup, flick to unleash — Dragonfire, Holy Light, Venom Pool — with slow motion and a cut-in.

## 14.0.0 — 2026-11-23 (major)
- Levels chapter 2 'Basilisk's Lair': 8 real-challenge levels with the basilisk and a new mechanic — petrified cups that can't merge until a nearby merge blast frees them.

## 13.2.0 — 2026-11-23 (minor)
- Renamed to Kings of Cups / 聖杯之王. Title screen uses the Gemini key art; rune pillars use Gemini sprites with three damage states (intact, cracked, crumbling).

## 13.1.0 — 2026-11-23 (minor)
- Title screen with cover art and an Enter button; main menu reordered (Levels, Classic, Practice, Creatures, Items) with Settings (language, backup) behind a gear.

## 13.0.0 — 2026-11-23 (major)
- Levels rebuilt: Chapter 1 'Training Grounds' — 8 tutorial levels, one skill each, with a briefing card, an on-screen goal and progress, shot counter and 1–3 stars (extra VP). Old level progress carries over.

## 12.0.1 — 2026-11-23 (patch)
- Rune pillars recoloured: slate grey with small sapphire-blue sigils (no creature uses blue); no big letter-like rune.

## 12.0.0 — 2026-11-23 (major)
- Rune pillars in Classic: from pressure 2, stone pillars block the table; merges' blasts chip them (knight 2 hp … king 6, checkmate 10), Inferno burns them, broken pillars give +300.

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
