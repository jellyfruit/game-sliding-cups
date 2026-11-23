// Physics baseline regression: the same starting cups and time must give exactly the results in tests/golden/physics.json.
// The baseline comes from the original prototype (matched bit-for-bit). For a deliberate feel change: node tests/golden.test.js --update
const fs = require('fs'), path = require('path'), assert = require('assert');
const { loadCore } = require('./_load');
const SC = loadCore();
const FILE = path.join(__dirname, 'golden', 'physics.json');

function scenario(seed) {                       // 16 random cups (some fast), using a simple LCG independent of SC.makeRng
  let a = seed >>> 0; const rnd = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
  const world = SC.Physics.createWorld();
  for (let i = 0; i < 16; i++) {
    const tier = Math.floor(rnd() * 4), kind = Math.floor(rnd() * 2), T = SC.CONFIG.tiers[tier];
    const c = SC.Physics.makeCup(world, kind, tier, T.r + rnd() * (600 - 2 * T.r), 100 + rnd() * 600);
    c.vx = (rnd() - 0.5) * 5000; c.vy = (rnd() - 0.5) * 5000; world.cups.push(c);
  }
  return world;
}
function simulate(seed, frames) {
  const w = scenario(seed);
  for (let f = 0; f < frames; f++) SC.Physics.advance(w, 1 / 60);
  return w.cups.map(c => [c.kind, c.tier, c.x, c.y, c.vx, c.vy].map(v => Math.round(v * 1e6) / 1e6)).sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2] || p[3] - q[3]);
}
const cases = []; for (const seed of [1, 2, 3, 4, 5]) for (const frames of [60, 300, 1200]) cases.push({ seed, frames });
const actual = cases.map(c => Object.assign({}, c, { cups: simulate(c.seed, c.frames) }));

if (process.argv.includes('--update')) { fs.writeFileSync(FILE, JSON.stringify(actual)); console.log('Baseline updated: ' + FILE); return; }
const expected = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let bad = 0;
actual.forEach((a, i) => { try { assert.deepStrictEqual(a, expected[i]); } catch (e) { bad++; console.log('FAIL  seed=' + a.seed + ' frames=' + a.frames + ' (physics differs from the baseline)'); } });
if (bad) { console.log(bad + ' case(s) differ from the baseline. If the feel change is deliberate, run node tests/golden.test.js --update'); process.exitCode = 1; }
else console.log('Physics baseline: all ' + actual.length + ' cases match');
