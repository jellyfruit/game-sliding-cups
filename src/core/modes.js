/* Kings of Cups — src/core/modes.js
 * CORE · Modes: classic / level / practice rule hooks (danger, items, ults, ramp, pickNext …).
 * Depends on: Game (at call time only).
 * Must not touch: the DOM; Physics internals.
 */
'use strict';

/* ───────── MODES (mode objects: rule hooks such as what spawns and how you lose)───────── */
const Modes = {
  classic: {
    id: 'classic',
    danger: 'lose',            // a cup resting inside the line too long → lose
    assistForced: false,
    tracksBest: true,
    givesVP: true,
    hud: 'best',               // top-right HUD: 'best' best score | 'level' level number
    items: 'earn',             // items: 'earn' charged by scoring | 'fixed' set per level | 'free' unlimited | 'none'
    ults: 'charge',            // creature ultimates: 'charge' by merging | 'free' always ready | 'none'
    banner: null,              // on-screen mode label (i18n key)
    ramp: true,                // difficulty rises with score (see CONFIG.ramp)
    pillars: true,             // rune pillars appear as pressure rises (see CONFIG.pillars)
    equip: true,               // worn equipment applies (Game.eqVal); team + gear chosen on the prep screen
    pickNext(g) {              // same roll order as the prototype: tier first, then creature
      const t = g.rng(), cum = Game.spawnCum(g);
      let tier = cum.length; for (let i = 0; i < cum.length; i++) if (t < cum[i]) { tier = i; break; }
      return { kind: g.kinds[Math.floor(g.rng() * g.kinds.length)], tier };
    },
  },
  level: {
    id: 'level',
    danger: 'lose',
    assistForced: false,
    tracksBest: false,
    givesVP: false,            // Levels only pay the first-clear reward (Profile.clearLevel)
    hud: 'level',
    items: 'fixed',
    ults: 'none',
    equip: false,              // Story levels: fixed creatures, no equipment
    banner: null,
    pickNext(g) { return Modes.classic.pickNext(g); },
  },
  practice: {
    id: 'practice',
    danger: 'fade',            // cups resting inside the line fade away; no losing
    assistForced: true,
    tracksBest: false,
    givesVP: false,
    hud: 'best',
    items: 'free',
    ults: 'free',
    equip: true,               // gear works here too (Lucky Coin does nothing: givesVP is false)
    banner: 'fx.practice',
    pickNext(g) { return Modes.classic.pickNext(g); },
  },
};
