/* Kings of Cups — src/core/rng.js
 * CORE · makeRng: seeded mulberry32 with get/set state (Undo, replays, tests).
 * Depends on: nothing.
 * Must not touch: the DOM, Math.random (seeded only).
 */
'use strict';

/* ───────── RNG (mulberry32, seeded → replays, daily challenge, tests)───────── */
function makeRng(seed) {
  let a = seed >>> 0;
  const f = function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.get = () => a; f.set = (v) => { a = v >>> 0; };   // state access (used by Undo)
  return f;
}
