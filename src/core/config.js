/* Kings of Cups — src/core/config.js
 * CORE · CONFIG: every tunable (world, physics, rules, scoring, items, ultimates, equipment, chapter mechanics).
 * Depends on: nothing (first file). Level, tier and creature data are added by src/data/levels.js and src/data/kinds.js.
 * Must not touch: the DOM / window / performance (core is DOM-free and runs in Node via tests/_load.js).
 */
'use strict';

/* ───────── CONFIG ───────── */
const CONFIG = {
  world: { W: 600, H: 945, LINE_Y: 720, SPAWN: { x: 300, y: 845 } },   // top-down plane; y=0 far end, y=H near the player
  phys: {
    STEP: 1 / 120,  // fixed time step
    A: 560,         // sliding friction (constant deceleration)
    K: 0.7,         // speed damping
    VMAX: 3600,     // max launch speed
    VMIN: 630,      // slower than this when crossing the line → returns
    GAIN: 0.9,      // finger speed (below KNEE) → cup speed
    KNEE: 700,      // finger speed above this uses GAIN_HI for the excess
    GAIN_HI: 1.7,
    E: 0.6,         // cup–cup restitution
    EW: 0.35,       // wall restitution
    STOP: 8,        // below this speed a cup counts as stopped
    HIST_MS: 100,   // time window for measuring launch speed
  },
  rules: { DANGER_T: 3, SETTLE_T: 0.25, FADE_T: 1.2, RETURN_RATE: 14, GRAB_MARGIN: 40, GRAB_OFFSET_MAX: 120 },
  scoring: { base: 10, checkmate: 2000 },
  // VP: 1 per perScore points; +kingBonus per king made; unlockCost[i] = VP to unlock creature i (in order)
  vp: { perScore: 500, kingBonus: 10, starBonus: 10, unlockCost: [0, 0, 100, 200, 350, 550, 800, null] },   // null = never for sale (finale creature)   // starBonus: VP per newly earned level star
  nextTierCum: [0.5, 0.8, 0.95],                 // cumulative spawn-tier odds: pawn 50%, knight 30%, bishop 15%, rook 5%
  // Difficulty ramp (modes with ramp: true). Every `every` points = +1 level, up to maxLevel.
  // At max level: spawn weights shift to `cumMax` and the lose timer shrinks to `dangerMin` seconds.
  ramp: { every: 3000, maxLevel: 5, cumMax: [0.35, 0.68, 0.9], dangerMin: 2.0 },
  // Skill bonuses for the launched cup's first merge (fraction of that merge's gain), plus a flat bonus per extra simultaneous merge.
  bonus: { bank: 0.5, long: 0.3, longDist: 520, double: 150 },
  // Checkmate shockwave: pushes cups within `radius` outward (up to `push` speed); pawns within `shatter` are destroyed.
  shock: { radius: 340, push: 1100, shatter: 170 },
  // Cluster merge: when two cups merge, every same-creature same-tier cup touching the group (within `touch` units
  // of contact, chained) is absorbed too. Result is still one tier up; score × group size when it reaches `min`.
  cluster: { touch: 30, min: 3 },
  // Chapter 1 coaching: hint bar seconds on screen; demo loop timing (s) and idle time before the demo returns
  tutor: { hintT: 7, press: 0.35, swipe: 0.3, travel: 0.8, rest: 0.8, idleT: 6 },
  // Creature ultimates (modes with ults: 'charge' | 'free'). Rule: hard on low tiers, kind to big pieces.
  // Gauge per creature: each merge of that creature adds tier × perTier (× (cups − 1) for clusters); other creatures with an ultimate get `share` of that; a checkmate adds full/2 to its own creature.
  // Tap the creature's portrait when full → the held cup is enchanted → it fires on its first hit / merge / stop.
  ults: { full: 24, perTier: 3, share: 0.5, kinds: { 0: 'fireball', 1: 'holy', 2: 'venom' },
          fireball: { radius: 150, maxTier: 1, push: 700, pillarDmg: 6 },      // dragon: burns pawns + knights, pushes the rest out
          holy: { radius: 160, gatherT: 0.9, accel: 2600, vmax: 600 },          // unicorn: cups around turn into unicorns and are drawn together
          venom: { radius: 120, shots: 3, maxTier: 0, pillarDmg: 3 },           // hydra: a pool that dissolves pawns for 3 shots, corrodes stone
          slowmo: { t: 0.7, k: 0.3 } },
  // Rune pillars (modes with pillars: true, i.e. Classic): fixed stones that cups bounce off. `count[lv]` = pillars on
  // the table at pressure level lv. Every merge's blast damages pillars within `blast[result tier]` units for
  // (result tier number) hp — knight 2 … king 6 — × (cups − 1) for clusters; a checkmate deals `hp` within CONFIG.shock.radius.
  // A broken pillar gives `breakBonus` points and is replaced `respawnShots` shots later.
  pillars: { hp: 10, r: 26, count: [0, 0, 1, 1, 2, 2], blast: [0, 110, 130, 150, 170, 190], breakBonus: 300, respawnShots: 3,
             area: { x0: 70, x1: 530, y0: 90, y1: 580 }, gapCup: 12, gapPillar: 170 },
  view: { TILT: 0.7, S_FAR: 0.78 },
  // Field items (16.0.0: three fantasy items; Inferno and Magnet were cut — Dragonfire and Holy Light cover them):
  // bag holds `slots`; Classic gives a random item every energyCost points. undo = Hourglass, wild = Polymorph Potion, upgrade = Coronation Oil.
  items: { slots: 2, energyCost: 800, upgradeMax: 3, defs: [{ id: 'undo' }, { id: 'wild' }, { id: 'upgrade' }] },
  // Equipment (armory): bought and upgraded with VP, up to `slots` worn, passive, Classic only, for the whole run.
  // cost[i] = VP for level i+1; val[i] = effect at level i+1. Opens after `unlockVP` VP earned in total.
  equip: { slots: 3, unlockVP: 150, defs: [
    { id: 'scale',   cost: [60, 120, 200], val: [0.4, 0.7, 1.0] },     // Dragon Scale Charm: +seconds before a cup in the line loses
    { id: 'grail',   cost: [80, 150, 240], val: [1.2, 1.35, 1.5] },    // Grail: ultimate charge ×
    { id: 'eye',     cost: [50, 110, 220], val: [1, 2, 3] },           // Seer's Eye: 1 longer aim arrow, 2 + landing ring, 3 full aim line
    { id: 'hammer',  cost: [50, 100, 160], val: [1.5, 2, 2.5] },       // Mason's Hammer: damage to pillars ×
    { id: 'scepter', cost: [70, 140, 220], val: [0.08, 0.14, 0.2] },   // King's Sceptre: + chance the next cup is a pawn
    { id: 'coin',    cost: [100, 200, 320], val: [1.2, 1.35, 1.5] },   // Lucky Coin: VP from the run ×
  ] },
  // Progressive unlocks (David, 16.0.0): items after chapter 1 level 6, ultimates after chapter 1, armory after equip.unlockVP total VP.
  unlocks: { itemsLevel: 5, ultsLevel: 7 },
  // Story (STORY.md): chapters with an opening card (before the chapter's first level, once) and a closing card (after its last level's
  // first clear). Text in STR 'story.ch<N>.open' / '.close'; Elden's line per level in 'lv.<id>.elden'; optional art/story/ch<N>.jpg.
  // unfinished: chapters still being built (only the opening card; the closing card comes with the chapter's last level).
  story: { chapters: [1, 2, 3, 4, 5], unfinished: [] },   // 5 = the finale (header 'chapter.5'); its closing card is the ending card ('story.end')
  // Chapter 3 (Gates of the Sun) level-only obstacles — never in Classic, so its physics and the golden baseline are untouched.
  //   sand: a cup whose centre is inside a level's sand patch slides with friction × `fric` (aim line included).
  //   sting: every `every` shots (level field sting: { every, first }) a random cup of tier ≥ minTier is stung; if it is not merged
  //          within `life` shots it drops one tier. Merging it (the new cup carries no mark) cures it. Own RNG: spawn order unchanged.
  //   guard: the twin guardian statues (level field guards: [[x, y, hp]]): pillars of radius `r` drawn as stone scorpion men (`kind`);
  //          a merge blast damages only the nearest guardian in range.
  sand: { fric: 4.8 },   // 18.0.x: doubled from 2.4 (David: sand felt too weak)
  sting: { life: 3, minTier: 1 },
  guard: { r: 40, kind: 6 },
  // Chapter 4 (The Drowned Capital) level-only obstacles — never in Classic, so its physics and the golden baseline are untouched.
  //   current: water bands (level field current: [[y, h, k]]: full-width band centred on y, half-height h; k = direction × strength,
  //            + pushes right, − left, 1 = normal, up to maxK = strong). A MOVING cup whose centre is inside gets accel × k px/s² sideways
  //            (its velocity) plus a drift of drift × k px/s straight to its position (velocity untouched, 18.0.x: David wanted currents
  //            twice as strong). Resting cups stay put. accel × maxK must stay below phys.A, so friction always wins and every cup comes
  //            to rest; the drift never changes velocity, so it cannot keep a cup moving. Aim line included.
  current: { accel: 300, maxK: 1.4, drift: 130 },
  //   hydra: the Hydra's heads (level field heads: [[x, y, hp]], goal 'heads'): targets of radius `r` drawn as stone hydra statues (`kind`).
  //          A merge blast (pillar rules) damages a head; at 0 hp it is CUT and grows back to full hp `regrow` shots later.
  //          Phoenix fire: if the finishing blast came from a chain (2nd+ merge of one shot), a cluster merge or a checkmate,
  //          the head is BURNED instead and never returns; such a blast also burns a cut stump in range. Goal: burn every head.
  //   rise: rising water (level field rise: true): every `every` shots the danger line climbs `step` units, up to `max` above LINE_Y.
  hydra: { r: 34, regrow: 4, kind: 2 },
  rise: { every: 3, step: 25, max: 125 },
  // Finale (The Grail Throne) level-only hazards — never in Classic, so its physics and the golden baseline are untouched.
  // Timing { every, first }: the hazard strikes after shot n when n ≥ first and (n − first) % every = 0 (in the boss, n counts from the phase start).
  //   roar: the lion's roar (level field roar: { every, first }): once the table has stopped after such a shot, every piece gets `push` px/s
  //         toward the line and slides there with the normal physics (bigger pieces have more friction, so they slide a little less).
  //   curse: the goat's curse (level field curse: { every, first }): between shots a random piece (tier ≥ minTier, not stone) turns to stone;
  //          a merge blast or checkmate nearby frees it (chapter 2 rules). Uses the stinger RNG, so the spawn order is unchanged.
  //   poison: the serpent's venom pools ([[x, y, r]], level field poison or a boss phase): between shots a piece resting with its centre
  //           in a pool counts up; after `life` counts in a row it drops one tier (a pawn dissolves). Leaving the pool resets it; stone is immune.
  //   chimera: the boss (level field chimera: { x, y, hp: [phase 1, 2, 3], phases: [{ roar }, { curse }, { poison }] }, goal 'chimera'):
  //            a target of radius `r` at the far edge, drawn as the Chimera king piece (`kind`). Merge blasts hurt it by pillar rules; at 0 hp
  //            the next phase starts at full health and its hazard replaces the last one (counted from that shot). Plain blasts never take
  //            the last phase below 1 hp: only a checkmate within reach (CONFIG.shock.radius) defeats it.
  roar: { push: 330 },
  curse: { minTier: 0 },
  poison: { life: 3 },
  chimera: { r: 62, kind: 7 },
};
