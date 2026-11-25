# Level calibration

**Updated:** 2026-11-25 · Bot results that set each level's stars (`stars: [★★★, ★★]`) and shot limits (`shotLimit`) in `CONFIG.levels`. Rules for the levels themselves: [GAME_DESIGN.md](../GAME_DESIGN.md). Why values changed: [DECISIONS.md](DECISIONS.md).

## How to run

```sh
node tools/levelbot.js <levelId,...|chN|all> [games=20] [trials=40]
node tools/levelbot.js ch3 24 40   # search bot, chapter 3, seeds 1..24
node tools/levelbot.js ch3 24 1    # random-aim bot (lower bound)
```

- The bot plays the real core (`tests/_load.js` → `loadCore()`); seeds are `1..games` (`Game.create({ seed })`), so a run is reproducible.
- **Search bot** (`trials` = 40): each turn it tries 40 random flicks (start x, angle, finger speed) on a copy of the game, keeps the best by a simple score (goal progress, guardian / hydra-head / Chimera damage, points, no cups left inside the line, no stung cups), then plays it. Max 60 turns per game.
- **Random aim** (`trials` = 1): one random flick per turn.
- Output per level: clear count, shots to clear (median / p80 / p90 / max), current stars and limit.
- Chapter 5 = the finale (`ch5`).

## Rules for setting targets

- ★★★ ≈ the search bot's median (or a little below), ★★ ≈ its 80–90th percentile.
- A shot limit must leave the search bot ≥ 90% clears, while random aim mostly fails.
- Levels the bot finds bimodal are judged by what a person would aim at (noted per table). Final tuning comes from David's playtests.

## Chapter 1 · Training Grounds (levels 1–8)

Random-aim check only (one-off script, not kept): levels 1, 2, 4, 5, 7 clear easily; 3, 6, 8 need deliberate aiming or items, as intended.

## Chapter 2 · Basilisk's Lair (levels 9–16)

Search bot with 40 trial shots per turn: typical good play ≈ ★★★, a few wasted shots ≈ ★★. Reference numbers from the same bot used for chapter 3: The Gaze median 11 (stars 5 / 9), Boss: The Basilisk median 27 (stars 18 / 26).

## Chapter 3 · Gates of the Sun (levels 17–24)

`node tools/levelbot.js ch3 24 40` (and `… 24 1`), run with sand friction 4.8 (`CONFIG.sand.fric`). Silence Before the Gate's side and bottom sand patches were made a little smaller to keep it ≥ 90% (48 seeds: 44/48; with sand 2.4: 45/48; with 4.8 and the old patches: 40/48).

| # | Level | Stars (★★★/★★) | Limit | Search bot: clear, median / p80 / p90 | Random aim: clear, median |
|---|---|---|---|---|---|
| 17 | Night Dunes | 3 / 5 | — | 24/24, 2 / 2 / 3 | 24/24, 4 |
| 18 | Obelisk Road | 3 / 5 | — | 24/24, 2 / 3 / 4 | 24/24, 13 |
| 19 | Quicksand Pit | 7 / 12 | — | 24/24, 7 / 11 / 17 | 21/24, 23 |
| 20 | Buried Pilgrims | 5 / 7 | — | 24/24, 4 / 6 / 8 | 20/24, 21 |
| 21 | Stingers | 4 / 7 | 10 | 24/24, 5 / 7 / 8 | 5/24, 9 |
| 22 | Scorpion Camp | 3 / 6 | — | 16/24, 2 / 4 / 17 | 20/24, 22 |
| 23 | Silence Before the Gate | 3 / 5 | 8 | 44/48, 3 / 5 / 7 | 2/24, 5 |
| 24 | Twin Guardians | 20 / 29 | — | 24/24, 23 / 29 / 32 | 9/24, 53 |

Scorpion Camp is bimodal for the bot (2 shots when it throws a matching knight into a pair, long when it breaks the pairs); a person aims at the pairs.

## Chapter 4 · The Drowned Capital (levels 25–32)

`node tools/levelbot.js ch4 24 40`, run with the current drift (`CONFIG.current.drift` 130). The Bell Tower's current is k −1.0 to stay ≥ 90% (48 seeds: 43/48; before the drift 44/48; with drift and k −1.2: 41/48). The Throne Stair on 48 seeds: 44/48.

| # | Level | Stars (★★★/★★) | Limit | Search bot: clear, median / p80 / p90 | Random aim: clear, median |
|---|---|---|---|---|---|
| 25 | Lighthouse Rock | 3 / 5 | — | 24/24, 2 / 3 / 3 | 24/24, 5 |
| 26 | Sunken Streets | 3 / 5 | — | 24/24, 2 / 3 / 3 | 24/24, 12 |
| 27 | Market Under Water | 7 / 13 | — | 24/24, 7 / 11 / 17 | 24/24, 19 |
| 28 | The Bell Tower | 8 / 13 | 16 | 43/48, 9 / 13 / 14 | 3/24, 15 |
| 29 | The Drowned Cathedral | 5 / 7 | — | 24/24, 4 / 6 / 8 | 15/24, 16 |
| 30 | The First Head | 2 / 5 | — | 24/24, 1 / 1 / 2 | 24/24, 15 |
| 31 | The Throne Stair | 3 / 5 | 8 | 44/48, 3 / 4 / 5 | 3/24, 2 |
| 32 | Boss: The Hydra | 16 / 35 | — | 22/24, 18 / 35 / 37 | 10/24, 30 |

Hydra head hp trials (the bot is weak at aiming chains, so heads take it long):
- Boss with 6 hp heads: 19/24, median 28. With 4 hp: bimodal (median 11, p80 26); 48 seeds: median 14, p80 33, p90 44. Shipped with 4 hp (see DECISIONS.md).
- The First Head with 4 hp: bimodal (median 6, p80 27); 3 hp makes one chain enough (as Elden's line says). Shipped with 3 hp.

## Finale · The Grail Throne (levels 33–35, `ch5`)

`node tools/levelbot.js ch5 24 40` (and `… 24 1`).

| # | Level | Stars (★★★/★★) | Limit | Search bot: clear, median / p80 / p90 | Random aim: clear, median |
|---|---|---|---|---|---|
| 33 | The Lion's Roar | 7 / 18 | — | 24/24, 7 / 18 / 20 | 1/24, 23 |
| 34 | The Goat's Curse | 7 / 10 | — | 24/24, 7 / 9 / 12 | 24/24, 15 |
| 35 | Boss: The Chimera | 33 / 45 | — | 42/48, 32 / 40 / 45 | 0/24 |

- The Lion's Roar is bimodal for the bot (2–5 shots when the opening chain lands, 11–22 when it has to rebuild after roars); random aim almost always loses to the roar, so the level asks for real play.
- The Goat's Curse is gentle: each curse makes a new stone to free next to the pieces already being merged.
- The Chimera with dragon + unicorn: the bot cleared only 2–4 of 12 (with 6, 8 or 10 hp phases), almost always stuck in phase 3 with kings of both creatures that never met. Dragon only with 10 hp per phase: 42/48 (misses: lost to the roar in phase 1, or out of the bot's 60 turns in phase 3 with two kings apart). Random aim always loses to the roar in phase 1.

## Mechanic strength measurements (18.0.1)

- **Sand** (`sand.fric` 4.8): a mid-speed pawn crossing a 240-deep patch travels 290 units (582 with fric 2.4; 640 with no sand).
- **Currents**: sideways displacement of a pawn launched straight up through a k = 1 band, 180 deep / 120 deep, accel only → with drift 130: weak shot (900) 38 → 98 / 31 → 126; mid (1500) 20 → 41 / 13 → 27; strong (2300) 13 → 25 / 8 → 16; bishop mid 19 → 41 / 12 → 27. ≈ 2× for mid and strong shots; a slow piece that coasts to a stop inside a band is carried 2.5–5× further.

## Ultimate charge with transforming ultimates (2026-11-25)

`node tools/ultbot.js 60 [root]`: random-aim bot, Classic without items, casts every ultimate as soon as it is ready; same seeds per team (1–60); `root` = another checkout (e.g. a worktree of `main`) to compare; `ULTS='{"full":26}'` tries values. Columns: shots per game, score, first ultimate ready (median shot), shots per ultimate (all gauges together).

| Team | Old ultimates (19.2.0: full 24, share 0.5) | Transform, full 24 / share 0.5 | **Transform, full 26 / share 0.35 (chosen)** |
|---|---|---|---|
| dragon | 124 · 11832 · 14 · **8.2** | 109 · 11053 · 14 · 7.4 | 110 · 11037 · 15 · **7.9** |
| dragon, unicorn | 88 · 7266 · 23 · **6.7** | 87 · 7233 · 23 · 5.8 | 85 · 7024 · 26 · **7.4** |
| dragon, unicorn, hydra | 96 · 7256 · 30 · **6.3** | 96 · 7290 · 30 · 5.6 | 94 · 6611 · 33 · **6.7** |
| + phoenix (4) | 96 · 6080 · 37 · **7.8** (3 gauges) | 104 · 7959 · 35 · 5.2 | 101 · 6743 · 40 · **6.6** |
| basilisk, griffin, scorpion man, Chimera | — (no ultimates) | 89 · 12944 · 35 · 3.2 | 94 · 10687 · 40 · **4.3** |

Transforms set up merges, so each gauge filled ~10–12% faster; and every creature now has a gauge, so 4-creature teams cast more in total. full 26 / share 0.35 brings 1–3 creature teams back to today's rate (±10%); a 4-creature team casts a bit more often than the old 3-gauge team. Three Heads (and Stone Gaze) feed the gauges most: the late-game team of the last four creatures casts every ~4 shots. Three Heads heads one tier smaller (`three.drop` 1, 2026-11-25): no measurable change (last four 4.3; one creature alone: basilisk 8.3, griffin 7.6, scorpion man 7.4, Chimera **4.6** with about twice the score; swapping the Chimera in for the phoenix: 6.6 → 5.2), because a head that touches a piece takes that piece's tier; the drop only shrinks heads that miss. `TEAMS='[[7],[4,5,6,7]]' node tools/ultbot.js 60`. Others tried: 27 / 0.3 → 7.9 / 7.6 / 7.6 / 7.5 / 5.0; 28 / 0.25 → 8.7 / 8.3 / 8.4 / 8.6 / 5.9; 30 / 0.2 → 8.7 / 9.1 / 9.5 / 9.8 / 6.9.

## Classic trigger tuning (16.0.5)

Random-aim bot, 40 Classic games: after gauge 40 → 24, shared charge 0.5 and item energy 1500 → 800, the first ultimate is ready at median shot 19 (was 38) and the first item at shot 37 (was 51). A real player scores more than the bot, so expect faster. (Script not kept.)
