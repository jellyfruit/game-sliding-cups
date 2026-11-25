# Decision log

One entry per decision: **date · decision · reason · supersedes**. Newest first within each topic. A new decision that changes an old one gets its own entry with "supersedes"; the current rule itself lives in [GAME_DESIGN.md](../GAME_DESIGN.md) or [ARCHITECTURE.md](../ARCHITECTURE.md), not here. Dates come from `CHANGELOG.md` and git history (version in brackets).

## Project and process

| Date | Decision | Reason | Supersedes |
|---|---|---|---|
| 2026-11-25 | On-device tuning panel for David, **locked**: invisible on every device until it opens the game once with `?tune=elden`; `?tune=off` removes the flag and all overrides. Overrides live in their own localStorage key (not the save), app layer only; runs with overrides save no best score, VP, stars or progress, and show a "TUNING ON" badge. Final numbers come back as exported JSON and go into `CONFIG` (and the golden baseline) on purpose. | David's decision: tune feel by finger on the iPad, send the numbers once; ordinary testers must never see or be affected by it; tuned runs must not pollute scores. | Tuning by describing feel in chat |
| 2026-11-25 | Code split from one `index.html` into ~20 files under `src/` (core, data, app; ≤ ~600 lines each) as **plain `<script src>` files sharing one global scope**, not ES modules; the core is loaded in Node by concatenating its files; `APP_VERSION` stays inline in index.html with the error reporter. | Smaller files per task; plain scripts keep `file://` play, need no import/export rewrite (the split is a pure cut, verified identical), Node needs no ESM loader, and the error reporter is in place before any file runs. | Single-file `index.html` with `/*#core-start*/` markers |
| 2026-11-25 | Docs split: CLAUDE.md is the map; GAME_DESIGN.md = current rules, ARCHITECTURE.md = current code, decisions here, bot numbers in `docs/CALIBRATION.md`. | Every session reads less; one fact, one place. | History notes inside the design and architecture docs |
| 2026-11-24 | One coordinator session owns `main`, merges, releases and deploys; each feature runs in a side session on its own branch; side sessions never release; save versions are assigned by the coordinator; small slices merged often; parallel only for different areas. | Agreed with David to keep the main line safe while work runs in parallel. | — |
| 2026-11-24 | Story text belongs to David (he edits it in his Story Bible doc); ask him before changing it; `STORY.md` is not reworded. | It is his family's story. | — |
| 2026-11-23 | Raw Gemini images live only in the private repo jellyfruit/sliding-cups-art; never commit them here (history was purged once). | Keep the public repo small and the raw art private. | Raw images under `art-src/incoming` |
| 2026-11-22 | Versioning major.minor.patch, single source `package.json`, released with `tools/release.js`; doc/test-only changes don't release. [9.0.0] | Predictable releases and cache names. | Build numbers v1–v9 |

## Name, tone and story

| Date | Decision | Reason | Supersedes |
|---|---|---|---|
| 2026-11-25 | Finale = two warm-up levels (one per head: Lion's Roar, Goat's Curse), then the three-phase Chimera boss; only a checkmate finishes phase 3; clearing it tames the Chimera and shows the ending card. [19.0.0] | Agreed with David: each head is taught before the boss combines them. | — |
| 2026-11-24 | Story campaign: epic tone; 4 chapters + finale; bosses Basilisk (ch2), Twin Scorpion Guardians (ch3), Hydra (ch4), Chimera (finale, = King Aurel, freed by the Rebirth Feather); companions Dragon, Unicorn, Griffin, Phoenix; text cards first (chapter open/close, Elden's line per level), art `art/story/` later. | Give the levels a reason and a goal for the family. | — |
| 2026-11-24 | The Chimera is an 8th creature VP can never buy; shown as a "???" silhouette in Capture Beasts and the Codex until the finale is cleared (save v9 `finaleCleared`). [16.3.0 / 17.1.0] | A reward only the finale gives. | — |
| 2026-11-23 | Name **Kings of Cups / 聖杯之王**, subtitle "Flick · Merge · Checkmate / 甩出去・合成・將死"; repo name, URL, storage key and backup prefix `SC1` unchanged. Before any App Store release: trademark search (close to the "King's Cup" drinking game), store subtitle signals "mythic creature merge", fallback name "Chalice Kings". [13.2.0] | Matches the Gemini key art and the chess theme; keeps saves and codes working. | Sliding Cups / 滑杯子 |

## Menu, screens and wording

| Date | Decision | Reason | Supersedes |
|---|---|---|---|
| 2026-11-25 | Locked features show how to unlock them: 🔒 tray placeholders (Classic, Proving Grounds), prep-screen hints, one "Next unlock" line on the menu (next feature only). | David: players didn't know items, ultimates and The Forge unlock, or how. | One-time "New" notice only after unlocking |
| 2026-11-25 | Endless mode is **Classic / 經典模式** everywhere. [18.1.1] | David's request. | Endless Campaign / 無盡戰役 (16.0.2) |
| 2026-11-24 | Menu: **📜 Story / 冒險故事** is the big button; Classic and **🛡️ Proving Grounds / 練功場** side by side; Capture Beasts / 捕獲神獸 and The Forge / 鐵匠鋪 tiles; ⚙️ Settings (language, Backup). [16.2.2] | David: the story is the main way to play. | 16.0.1 order (Endless Campaign big) and 13.1.0 order (Levels big, Classic + Practice, Creatures + Items tiles) |
| 2026-11-24 | zh wording: pieces are 棋子 (not 杯子), creatures are 收服 (tamed), shots are counted with 次 (not 發); 蠍尾人 stays the creature name. [16.2.2] | David's wording. | — |
| 2026-11-23 | Fantasy names: Practice → Proving Grounds (練功場; was 演武場 in 16.0.2), Creatures → Capture Beasts, Items/Armory → The Forge. [16.0.1–16.0.2] | Fits the fantasy story. | Plain names (Practice, Creatures, Items) |
| 2026-11-23 | Title screen (cover art + one Enter button; first tap unlocks iOS audio); language and Backup behind a ⚙️ Settings gear. [13.1.0] | The usual game layout keeps rarely used options out of the main menu. | Language/backup in the menu |
| 2026-11-23 | Next cup preview sits in the item tray at the left of the item bar. [11.1.1] | Never covers the table; it is where the eye already is. | Next box on the table (11.1.0) |

## Rules and physics

| Date | Decision | Reason | Supersedes |
|---|---|---|---|
| 2026-11-23 | Physics feel (launch curve, friction, bounce) is approved; `tests/golden/physics.json` guards it; change only on purpose and tell David. | David approved the feel. | — |
| 2026-11-23 | Stay 2.5D (no 3D renderer); art is pre-made sprites. | Simple, fast on iPad, art can be swapped. | — |
| 2026-11-23 | No crowding rule: a full table is not rescued. [10.7.2] | David: a full table should be harder. | 10.0.0 rule that removed the oldest pawn above 24 cups |
| 2026-11-23 | Cluster merges (3+) still go up only one tier; score × cups. [11.0.0] | +2 tiers for 4+ would make kings and checkmates too easy. | — |
| 2026-11-24 | Cluster reach `cluster.touch` 30 units, with link preview lines and a flash-and-fuse animation. [16.1.0] | David: cluster merges didn't feel satisfying; with 6 a cluster almost never formed (touching matches merge at once). | `touch` 6 (11.0.0) |
| 2026-11-23 | Aim line: outline, power colour, bounce dots, power bar; with the aim line off, a short direction/power arrow only (no path or landing point). [11.1.0–11.1.1] | Playtest: hard to judge distance and direction in Classic; judging distance stays a skill. | Plain aim line, nothing in Classic |
| early | Wall bounce `phys.EW` 0.35. | 0.55 was too high: a hard shot at the far wall bounced back over the line and lost the game. | 0.55 |
| early | Merging needs only contact, no minimum speed. | Decided early; no reason recorded. | — |
| — | Deferred by David: power indicator while dragging; near-miss merge assist. | Not wanted yet. | — |

## Items, ultimates, equipment

| Date | Decision | Reason | Supersedes |
|---|---|---|---|
| 2026-11-25 | **Ultimates transform**: every ultimate turns pieces into the caster's creature, each keeping its own tier (stone falls away); each one differs in which pieces and how they move (dragon pushes out, unicorn pulls in, hydra pool catches what touches it, …). Ultimates no longer destroy pieces or score by themselves; all eight creatures (Chimera: Three Heads) have one. Stone Gaze stone is not freed early by anything. Charge rebalanced to full 26, share 0.35 (bot numbers in `docs/CALIBRATION.md`). Code moved to `src/core/ults.js`. | Agreed with David: one clear theme for all eight creatures; the merges the transforms set up are the reward. | Dragonfire burning pawns/knights, Venom Pool dissolving pawns ("hard on low tiers"); ultimates only for dragon, unicorn, hydra; full 24 / share 0.5 |
| 2026-11-25 | Pre-run **Prepare for battle** screen for Classic and Proving Grounds: team of 1–4 tamed creatures (`team.max`) + up to 3 gear; last choice preselected and shared; Restart skips it. Equipment now also works in Proving Grounds. Capture Beasts and The Forge become list-only (tame / buy / upgrade). Save v10 caps `active` at 4. | Agreed with David: choose team and gear right before a run, in one place; more than 4 creatures made merging too hard. | Team toggle in Capture Beasts, Wear toggle in The Forge, equipment Classic only |
| 2026-11-24 | Gemini icons for items and equipment; emoji stay as fallback. [18.1.0] | Icons in the creature art style (decided earlier, prompts in `art-src/GEMINI_PROMPTS.md`). | Emoji icons |
| 2026-11-24 | Trigger tuning: ultimate gauge full 24, shared charge 0.5 to other in-play ultimate creatures, item energy 800 points. [16.0.5] | David: ultimates and items rarely triggered (bot numbers in `docs/CALIBRATION.md`). | gauge 40, no share, energy 1500 |
| 2026-11-24 | Worn-equipment strip under the tray in Classic runs. [16.0.3] | David: "how do we know what is worn?" | — |
| 2026-11-23 | **Three layers, one job each**: equipment (pre-run, passive), ultimates (in-run creature skill), field items (random help). Don't add a system that overlaps another. Few interactive buttons; equipment adds none. [16.0.0] | Agreed with David after reviewing complexity. | Overlapping 5-item set |
| 2026-11-23 | Field items: Hourglass (undo), Polymorph Potion (wild), Coronation Oil (up a tier, max rook). Inferno and Magnet removed (Dragonfire and Holy Light cover them); packing an item for the next run removed and refunded. [16.0.0] | Remove overlaps with ultimates and equipment. | 5 items (Inferno/sweep, Upgrade, Wild, Magnet, Undo) and "pack one" (9.x) |
| 2026-11-23 | Armory equipment: 6 pieces, 3 levels each, bought with VP, up to 3 worn, Classic only; equipment runs count for the normal best. [16.0.0] | A VP sink that replaces packed items. | Pack one item |
| 2026-11-23 | Progressive unlocks: merging only → items after chapter 1 level 6 → ultimates after chapter 1 → Armory after 150 VP earned; one-time notice each. [16.0.0] | Agreed with David (16.0.0): start simple, open features as the player learns. | Everything open from the start |
| 2026-11-22 | VP values and unlock prices estimated from "10,000 points is easy"; rebalance from real play (open). | First guess before playtests. | — |
| 2026-11-23 | Runs that use items keep a separate best score. | Item help should not overwrite the no-item best. | — |
| 2026-11-23 | Ultimates: **hard on low tiers, kind to big pieces**; creature-specific and earned; items stay generic and random. [15.0.0] | Clear space without wrecking the pieces being built. | — |

## Levels and chapters

| Date | Decision | Reason | Supersedes |
|---|---|---|---|
| 2026-11-25 | Chimera boss is dragon only, 10 hp per phase. | With dragon + unicorn the closing checkmate was nearly impossible (bot 2–4/12). | Dragon + unicorn draft |
| 2026-11-24 | Sand friction ×4.8; currents add a position drift (130 × k px/s) instead of more acceleration; Bell Tower current k −1.0; Silence Before the Gate sand patches smaller. [18.0.1] | David's playtest: sand and currents felt too weak, "twice as strong". Raising accel would break "friction always wins" (accel × maxK < `phys.A`). Layout changes keep bot clears ≥ 90%. | sand 2.4; currents accel only; Bell Tower k −1.2 |
| 2026-11-24 | Hydra boss heads have 4 hp and are drawn as stone statues. [18.0.0] | David: a shorter fight; stone so they are never mistaken for playable hydra pieces. | 5 hp (side session's first choice; 6 hp tried) |
| 2026-11-24 | The First Head has 3 hp. | One chain burns it in a single stroke, as Elden's line says. | 4 hp draft |
| 2026-11-24 | Chapter 4 mechanics: currents (whole chapter), Hydra heads that regrow unless burned by chain/cluster/checkmate, rising water on the boss; phoenix cameo. [18.0.0] | Agreed with David from the story. | — |
| 2026-11-24 | Night table for chapter 3. [17.0.1] | David: sand patches must stand out. | Warm table for all chapters |
| 2026-11-24 | Chapter 3 mechanics: shifting sand, stingers, Twin Guardians boss; griffin cameo. All chapter mechanics are level-only: Classic never has them and `tests/golden/physics.json` stays unchanged. [17.0.0] | Level ids, sand and stinger rules approved by David 2026-11-24; Classic physics is approved. | — |
| 2026-11-23 | Chapter 1 coaching: A (ghost-shot demo), B (hint bar), D (recap), animation only. C (a hint button that shows the answer) waits for family playtests. [16.1.0] | David chose A + B + D. | — |
| 2026-11-23 | Chapter 2's creature is the basilisk; its gaze petrifies cups. [14.0.0] | David: a new mechanic should come from a creature's ability. | — |
| 2026-11-23 | Levels need a visible goal: briefing card (tip, goal, stars, rules), on-screen goal/shots/stars, Pause repeats them. [13.0.0] | David. | — |
| 2026-11-23 | Levels rebuilt as chapters; chapter 1 = 8-level tutorial, one skill each; stars by shots; sequential unlock; old level progress carried over. [13.0.0] | A tutorial path for the family. | 3 king levels (1.x–12.x) |

## Art

| Date | Decision | Reason | Supersedes |
|---|---|---|---|
| 2026-11-25 | Chimera Gemini art (24 sprites). [19.0.0] | Finale creature. | Procedural cup (`art: false`) |
| 2026-11-23 | Rune pillars: Gemini sprites from David's approved reference (tapered stone, knotwork band, sapphire-blue runes) with 3 damage states. [12.0.1, 13.2.0] | Blue is the one colour no creature uses; no letter-like rune. | Procedural pillar with big rune |
| 2026-11-23 | All creatures drawn by Gemini; vector sources kept in `art-src/<kind>/build.js`. [10.1.0–10.5.0] | Richer detail. | Vector Mignola-style art (9.2–9.3) |
| 2026-11-23 | Sprites pre-scaled once per tier into small canvases; never gated on `decode()`; on any canvas failure fall back to the full image, then the procedural cup. [10.7.1, 10.7.3, 16.2.1] | David: stutter on crowded tables on iPad; iOS decode can hang; a cup must never vanish. | Full-size draw every frame |
| 2026-11-25 | The Chimera's Three Heads stays as strong as built, but its gauge needs 2.5× the charge (`ults.fullK`). | David: the Chimera may be a bit stronger than the others, but it should feel like a long-charged super ultimate. | Option of weaker heads (tier drop) tried by bot and not adopted |
