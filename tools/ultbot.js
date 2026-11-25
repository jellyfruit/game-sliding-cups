/* Kings of Cups — tools/ultbot.js
 * TOOL · Ultimate charge check: a random-aim bot plays Classic (no items) and casts every ultimate as soon as it is ready.
 * Reports per team: shots per game, score, first ultimate ready (shot), shots between ultimates, casts per game.
 * Usage: [ULTS='{"full":28}'] node tools/ultbot.js [games] [root]   (root = another checkout to compare, e.g. a worktree of main)
 * Depends on: tests/_load.js of `root`. Must not touch: anything (read only).
 */
'use strict';
const path = require('path');
const games = +process.argv[2] || 60, root = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const { CONFIG, Game, makeRng } = require(path.join(root, 'tests/_load')).loadCore();
if (process.env.ULTS) Object.assign(CONFIG.ults, JSON.parse(process.env.ULTS));   // try values, e.g. ULTS='{"full":28,"share":0.3}'
const TEAMS = process.env.TEAMS ? JSON.parse(process.env.TEAMS) : [[0], [0, 1], [0, 1, 2], [0, 1, 2, 3], [4, 5, 6, 7]];   // TEAMS='[[4,5,6]]' to pick teams
const MAX_SHOTS = 200, DT = 1 / 60;

function fire(g, rnd) {                                    // finger flick from the held cup toward a random point of the table
  const h = g.held, tx = 40 + rnd() * 520, ty = 60 + rnd() * 560, dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
  const sp = 700 + rnd() * 1300, ux = dx / d, uy = dy / d, len = h.y - 700;
  g.drag = { id: 1, ox: 0, oy: 0, hist: [{ t: 0, x: h.x, y: h.y }] };
  return Game.dragTo(g, h.x + ux / -uy * len, 700, 1, len / (sp * -uy) * 1000);
}
function play(team, seed) {
  const g = Game.create({ seed, mode: 'classic' }), rnd = makeRng(seed * 7919 + 1);
  Game.setKinds(g, team); Game.setFeatures(g, { items: false, ults: true }); Game.restart(g);
  const r = { shots: 0, score: 0, ready: [], casts: 0 };
  while (g.phase !== 'over' && g.shots < MAX_SHOTS) {
    let n = 0; while (g.phase !== 'ready' && g.phase !== 'over' && n++ < 3600) for (const e of Game.update(g, DT)) if (e.type === 'ultready') r.ready.push(g.shots);
    if (g.phase !== 'ready') break;
    const k = Game.ultKinds(g).find(k => Game.ultReady(g, k));
    if (k != null) { Game.armUlt(g, k); r.casts++; }
    if (fire(g, rnd) !== 'launched') { g.drag = null; g.held.y = 845; }
  }
  r.shots = g.shots; r.score = g.score; return r;
}
const med = (a) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
console.log('root ' + root + ' · ' + games + ' games per team · ults.full ' + CONFIG.ults.full + ', perTier ' + CONFIG.ults.perTier + ', share ' + CONFIG.ults.share);
console.log('team        | shots/game | score  | 1st ready (median shot) | shots per ultimate | casts/game');
for (const team of TEAMS) {
  if (!team.some(k => CONFIG.ults.kinds[k])) continue;
  const rs = Array.from({ length: games }, (_, i) => play(team, i + 1));
  const shots = rs.map(r => r.shots), casts = rs.map(r => r.casts);
  const per = avg(shots) / Math.max(1e-9, avg(rs.map(r => r.ready.length)));
  console.log(JSON.stringify(team).padEnd(12) + '| ' + avg(shots).toFixed(1).padStart(10) + ' | ' + avg(rs.map(r => r.score)).toFixed(0).padStart(6) + ' | ' +
    String(med(rs.map(r => r.ready[0]).filter(x => x != null))).padStart(23) + ' | ' + per.toFixed(1).padStart(18) + ' | ' + avg(casts).toFixed(2).padStart(10));
}
