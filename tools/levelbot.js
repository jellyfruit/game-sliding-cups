// Level calibration bot (not a test). Plays levels with the real core and prints clear rate and shots to clear.
//   node tools/levelbot.js [levelId,...|chN|all] [games=20] [trials=40]
// Each turn it tries `trials` random flicks (start x, angle, finger speed) on a copy of the game, keeps the best by a
// simple score (goal progress, guardian damage, points, no cups left inside the line, no stung cups), then plays it.
// trials=1 is a random-aim bot (lower bound). Star targets: ★★★ ≈ the search bot's median, ★★ ≈ its 80–90th percentile.
const { loadCore } = require('../tests/_load');
const { CONFIG, Game, makeRng } = loadCore();
const LV = CONFIG.levels, LINE = CONFIG.world.LINE_Y;

function clone(g) {
  const plain = {};
  for (const k in g) if (typeof g[k] !== 'function' && k !== 'mode' && k !== 'snap') plain[k] = g[k];
  const c = structuredClone(plain);                          // keeps c.held === one of c.world.cups
  c.mode = g.mode; c.snap = null;
  for (const k of ['rng', 'itemRng', 'pillarRng', 'stingRng']) { c[k] = makeRng(0); c[k].set(g[k].get()); }
  return c;
}
function flick(g, x0, ang, fsp) {                             // finger flick from x0 toward angle `ang` (0 = straight up) at finger speed fsp
  const h = g.held; h.x = Math.max(h.r, Math.min(600 - h.r, x0));
  const vx = Math.sin(ang), vy = -Math.cos(ang), d = (h.y - 700) / -vy;
  g.drag = { id: 1, ox: 0, oy: 0, hist: [{ t: 0, x: h.x, y: h.y }] };
  return Game.dragTo(g, h.x + vx * d, 700, 1, d / fsp * 1000);
}
function settle(g) {                                         // run until the next cup is in hand, or the level ends
  for (let i = 0; i < 60 * 12; i++) { Game.update(g, 1 / 60); if (g.phase !== 'flying') break; }
}
function value(g) {
  if (g.phase === 'won') return 1e7 - g.shots;
  if (g.phase === 'over') return -1e7;
  const gp = Game.goalProgress(g); let v = gp.have * 1e5 + g.score * 0.5;
  for (const p of g.world.pillars) if (p.guard) v += (p.max - p.hp) * 3000;
  for (const c of g.world.cups) {
    if (c.held) continue;
    if (c.y > LINE - c.r) v -= 4000;                         // risky: inside / on the line
    if (c.sting) v -= 300 * c.tier / c.sting;
    v -= 15;                                                 // fewer cups = more room
    if (!c.stone) v += 20 * c.tier * c.tier;                 // bigger pieces are progress
  }
  return v;
}
function play(idx, seed, trials) {
  const g = Game.create({ seed }); Game.startLevel(g, idx);
  const rnd = makeRng(seed * 7919 + 1);
  for (let turn = 0; turn < 60 && g.phase === 'ready'; turn++) {
    let best = null;
    for (let i = 0; i < trials; i++) {
      const p = [40 + rnd() * 520, (rnd() - 0.5) * 1.3, 760 + rnd() * 1900];
      const c = clone(g); if (flick(c, ...p) !== 'launched') continue; settle(c);
      const v = value(c); if (!best || v > best.v) best = { v, p };
    }
    if (!best || flick(g, ...best.p) !== 'launched') break;
    settle(g);
  }
  return g.phase === 'won' ? g.shots : null;
}
const pct = (a, q) => a[Math.min(a.length - 1, Math.floor(q * a.length))];
const arg = process.argv[2] || 'ch3', games = +process.argv[3] || 20, trials = +process.argv[4] || 40;
const ids = arg === 'all' ? LV.map(l => l.id) : /^ch\d$/.test(arg) ? LV.filter(l => l.chapter === +arg[2]).map(l => l.id) : arg.split(',');
for (const id of ids) {
  const idx = LV.findIndex(l => l.id === id), L = LV[idx], res = [];
  for (let s = 1; s <= games; s++) res.push(play(idx, s, trials));
  const won = res.filter(x => x != null).sort((a, b) => a - b);
  console.log(`${String(idx + 1).padStart(2)} ${id.padEnd(10)} clear ${won.length}/${games}  shots median ${won.length ? pct(won, 0.5) : '-'} p80 ${won.length ? pct(won, 0.8) : '-'} p90 ${won.length ? pct(won, 0.9) : '-'} max ${won.length ? won[won.length - 1] : '-'}  | stars ${L.stars}${L.shotLimit ? ' limit ' + L.shotLimit : ''}`);
}
