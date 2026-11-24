// Core logic tests (no browser, no packages). Run: node tests/core.test.js
const assert = require('assert');
const SC = require('./_load').loadCore();
const { CONFIG, Physics, Game, Flow, Profile, Modes, makeRng } = SC;
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };

const newGame = (o) => Game.create(Object.assign({ seed: 1 }, o || {}));
const addCup = (g, kind, tier, x, y, vx = 0, vy = 0) => { const c = Physics.makeCup(g.world, kind, tier, x, y); c.vx = vx; c.vy = vy; g.world.cups.push(c); return c; };
const run = (g, sec, dt = 1 / 60) => { const ev = []; for (let t = 0; t < sec; t += dt) ev.push(...Game.update(g, dt)); return ev; };
// Simulate a drag. pts = [[x, y, t ms], ...] (world coordinates)
const dragPath = (g, pts) => {
  assert.ok(Game.beginDrag(g, pts[0][0], pts[0][1], 1, pts[0][2]), 'beginDrag');
  let r = null; for (let i = 1; i < pts.length; i++) r = Game.dragTo(g, pts[i][0], pts[i][1], 1, pts[i][2]) || r;
  return r;
};

console.log('RNG');
test('same seed → same random sequence', () => { const a = makeRng(7), b = makeRng(7); for (let i = 0; i < 20; i++) assert.strictEqual(a(), b()); });
test('different seeds → different numbers', () => { assert.notStrictEqual(makeRng(1)(), makeRng(2)()); });
test('games with the same seed spawn the same cups', () => {
  const a = newGame({ seed: 42, nKinds: 2 }), b = newGame({ seed: 42, nKinds: 2 });
  for (let i = 0; i < 10; i++) { assert.deepStrictEqual(a.next, b.next); a.next = a.mode.pickNext(a); b.next = b.mode.pickNext(b); }
});
test('spawns are pawn..rook and creatures are in range', () => {
  const g = newGame({ nKinds: 2 }); for (let i = 0; i < 500; i++) { const n = g.mode.pickNext(g); assert.ok(n.tier >= 0 && n.tier <= 3 && n.kind >= 0 && n.kind < 2); }
});

console.log('Merging');
test('same creature + tier → next tier at the centre of mass', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 300 + 55, 300);
  Physics.advance(g.world, 1 / 60);
  const cs = g.world.cups; assert.strictEqual(cs.length, 1); assert.strictEqual(cs[0].tier, 2); assert.ok(Math.abs(cs[0].x - 327.5) < 1);
});
test('different creatures → no merge', () => {
  const g = newGame({ nKinds: 2 }); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 1, 300, 300); addCup(g, 1, 1, 340, 300); Physics.advance(g.world, 1 / 60); assert.strictEqual(g.world.cups.length, 2);
});
test('different tiers → no merge', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 2, 340, 300); Physics.advance(g.world, 1 / 60); assert.strictEqual(g.world.cups.length, 2);
});
test('merge keeps total momentum (mass-weighted velocity)', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  const a = addCup(g, 0, 0, 300, 300, 0, 0), b = addCup(g, 0, 0, 340, 300, -400, 0);
  Physics.advance(g.world, 1 / 60); void a; void b;
  const c = g.world.cups[0]; assert.ok(c.vx < 0 && c.vx > -400);
});
test('two kings → checkmate: both vanish, +2000', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 5, 300, 300); addCup(g, 0, 5, 300 + 100, 300);
  const ev = run(g, 0.1); assert.strictEqual(g.world.cups.filter(c => !c.held).length, 0);
  assert.ok(ev.some(e => e.type === 'checkmate')); assert.strictEqual(g.score, CONFIG.scoring.checkmate);
});
test('chain scoring: the n-th merge of a shot scores ×n', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; g.phase = 'flying';
  addCup(g, 0, 0, 100, 300); addCup(g, 0, 0, 130, 300);            // → knight (1st)
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 340, 300);            // → bishop (2nd)
  const ev = run(g, 0.1).filter(e => e.type === 'merge');
  assert.deepStrictEqual(ev.map(e => e.combo), [1, 2]);
  assert.strictEqual(g.score, 10 * 2 * 1 + 10 * 4 * 2 + CONFIG.bonus.double);   // two separate pairs in the same frame also earn a double bonus
});

console.log('Physics');
test('cups slow down and stop', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, 0, 300, 700, 0, -1500);
  Physics.advance(g.world, 10); assert.strictEqual(c.vx, 0); assert.strictEqual(c.vy, 0);
});
test('heavier cups slide shorter', () => {
  const dist = (tier) => { const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, tier, 300, 800, 0, -1200); const y0 = c.y; Physics.advance(g.world, 10); return y0 - c.y; };
  assert.ok(dist(0) > dist(3) && dist(3) > dist(5));
});
test('cups never leave the table', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, 2, 300, 700, 3600, -3600);
  for (let i = 0; i < 600; i++) { Physics.advance(g.world, 1 / 60); assert.ok(c.x >= c.r - 1e-9 && c.x <= CONFIG.world.W - c.r + 1e-9 && c.y >= c.r - 1e-9 && c.y <= CONFIG.world.H - c.r + 1e-9); }
});
test('a full-power shot off the far wall never bounces back over the line', () => {
  for (let tier = 0; tier <= 5; tier++) {
    const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, tier, 300, 719, 0, -CONFIG.phys.VMAX);
    let maxY = 0; for (let i = 0; i < 1200; i++) { Physics.advance(g.world, 1 / 60); maxY = Math.max(maxY, c.y); if (!c.vx && !c.vy) break; }
    assert.ok(c.y < CONFIG.world.LINE_Y, 'tier ' + tier + ' stopped at y=' + c.y);
  }
});

console.log('Launch (curling-style)');
test('dragging inside the launch area → no launch', () => {
  const g = newGame(); const r = dragPath(g, [[300, 845, 0], [200, 820, 16], [400, 790, 32], [300, 760, 48]]);
  assert.strictEqual(r, null); assert.strictEqual(g.phase, 'ready'); assert.ok(g.held);
});
test('hard flick across the line → launch with speed', () => {
  const g = newGame(); const r = dragPath(g, [[300, 845, 0], [300, 800, 16], [300, 750, 32], [300, 700, 48]]);
  assert.strictEqual(r, 'launched'); assert.strictEqual(g.phase, 'flying'); assert.strictEqual(g.held, null);
  const c = g.world.cups[0]; assert.ok(c.vy < -CONFIG.phys.VMIN); assert.ok(!c.held);
});
test('slow crossing (too weak) → returns to the middle, no launch', () => {
  const g = newGame(); const r = dragPath(g, [[300, 845, 0], [300, 800, 400], [300, 750, 800], [300, 700, 1200]]);
  assert.strictEqual(r, 'returned'); assert.strictEqual(g.phase, 'ready'); assert.ok(g.held);
});
test('speed is capped', () => {
  const g = newGame(); dragPath(g, [[300, 845, 0], [300, 400, 16]]);
  const c = g.world.cups[0]; assert.ok(Math.hypot(c.vx, c.vy) <= CONFIG.phys.VMAX + 1e-6);
});
test('releasing inside the launch area → returns to the middle', () => {
  const g = newGame(); Game.beginDrag(g, 300, 845, 1, 0); Game.dragTo(g, 100, 800, 1, 16); Game.endDrag(g, 1);
  run(g, 1); assert.ok(Math.abs(g.held.x - 300) < 1 && Math.abs(g.held.y - 845) < 1);
});
test('pressing far above the line → cannot grab', () => { const g = newGame(); assert.strictEqual(Game.beginDrag(g, 300, 300, 1, 0), false); });
test('after everything stops → next cup spawns', () => {
  const g = newGame(); dragPath(g, [[300, 845, 0], [300, 800, 16], [300, 750, 32], [300, 700, 48]]);
  const ev = run(g, 12); assert.ok(ev.some(e => e.type === 'spawn')); assert.strictEqual(g.phase, 'ready'); assert.ok(g.held);
});

console.log('Winning, losing and modes');
test('Classic: cup resting inside the line > 3 s → lose', () => {
  const g = newGame(); addCup(g, 0, 2, 100, 780); const ev = run(g, 2.5); assert.strictEqual(g.phase, 'ready');
  const ev2 = run(g, 1); assert.ok(ev2.some(e => e.type === 'gameover')); assert.strictEqual(g.phase, 'over');
});
test('Classic: a moving cup inside the line is not danger (must be stopped)', () => {
  const g = newGame(); addCup(g, 0, 2, 100, 780, 0, 200); run(g, 0.05); assert.strictEqual(g.dangerT, 0);
});
test('Classic: no updates after losing', () => {
  const g = newGame(); g.phase = 'over'; const s = g.score; assert.deepStrictEqual(Game.update(g, 1), []); assert.strictEqual(g.score, s);
});
test('Practice: cup resting inside the line → fades out, no loss', () => {
  const g = newGame({ mode: 'practice' }); addCup(g, 0, 2, 100, 780); const ev = run(g, 4);
  assert.notStrictEqual(g.phase, 'over'); assert.ok(ev.some(e => e.type === 'fade')); assert.strictEqual(g.world.cups.filter(c => !c.held).length, 0);
});
test('Practice forces the aim line; Classic defaults off', () => {
  assert.ok(Game.assistOn(newGame({ mode: 'practice' }))); assert.ok(!Game.assistOn(newGame()));
});
test('switching mode restarts', () => { const g = newGame(); g.score = 99; Game.setMode(g, 'practice'); assert.strictEqual(g.score, 0); assert.strictEqual(g.mode.id, 'practice'); });
test('restart: score 0, only the cup in hand on the table', () => {
  const g = newGame(); addCup(g, 0, 1, 300, 300); g.score = 50; Game.restart(g);
  assert.strictEqual(g.score, 0); assert.strictEqual(g.world.cups.length, 1); assert.ok(g.world.cups[0].held);
});
test('restart with a seed → reproducible spawns', () => {
  const a = newGame({ nKinds: 2 }), b = newGame({ nKinds: 2, seed: 999 }); Game.restart(a, 999);
  assert.deepStrictEqual(a.next, b.next); assert.strictEqual(a.world.cups[0].kind, b.world.cups[0].kind);
});

console.log('Sound events');
test('cup collision → hit event with speed; very soft contacts emit nothing', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 1, 300, 300, 400, 0); addCup(g, 1 < 0 ? 0 : 0, 2, 300 + 60, 300, 0, 0);
  const ev = run(g, 0.2).filter(e => e.type === 'hit'); assert.ok(ev.length >= 1); assert.ok(ev[0].v > 40 && ev[0].tier === 2);
});
test('wall hit → wall event', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; addCup(g, 0, 0, 300, 40, 0, -1500);
  assert.ok(run(g, 0.2).some(e => e.type === 'wall'));
});
test('a merge does not also emit hit (only merge)', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; g.phase = 'flying';
  addCup(g, 0, 1, 300, 300, 300, 0); addCup(g, 0, 1, 330, 300, 0, 0);
  const ev = run(g, 0.1); assert.ok(ev.some(e => e.type === 'merge')); assert.ok(!ev.some(e => e.type === 'hit'));
});

test('hit events carry contact point and both cups (for effects)', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  const a = addCup(g, 0, 1, 300, 300, 600, 0), b = addCup(g, 0, 3, 300 + 80, 300, 0, 0);
  const h = run(g, 0.2).find(e => e.type === 'hit'); assert.ok(h);
  assert.ok(h.ta === 1 && h.tb === 3 && h.a === a.id && h.b === b.id && h.x > 300 && h.x < 380 && Math.abs(h.y - 300) < 5);
});
test('wall events carry position and cup id', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, 0, 300, 40, 0, -1500);
  const w = run(g, 0.2).find(e => e.type === 'wall'); assert.ok(w && w.id === c.id && w.v > 100 && typeof w.x === 'number');
});

console.log('VP and creatures');
test('VP: 1 per 500 points, +10 per king', () => {
  const g = newGame(); g.score = 1234; g.kings = 2; assert.deepStrictEqual(Game.vp(g), { fromScore: 2, fromKings: 20, total: 22 });
});
test('Practice gives no VP', () => { const g = newGame({ mode: 'practice' }); g.score = 99999; g.kings = 3; assert.strictEqual(Game.vp(g).total, 0); });
test('making a king counts in kings; checkmate does not double count', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; g.phase = 'flying';
  addCup(g, 0, 4, 300, 300); addCup(g, 0, 4, 300 + 100, 300); run(g, 0.1); assert.strictEqual(g.kings, 1);
});
test('restart resets kings', () => { const g = newGame(); g.kings = 3; Game.restart(g); assert.strictEqual(g.kings, 0); });
test('setKinds: only the given creatures spawn', () => {
  const g = newGame({ kinds: [2, 5] }); for (let i = 0; i < 300; i++) assert.ok([2, 5].includes(g.mode.pickNext(g).kind));
});
test('setKinds: empty / invalid → falls back to the first', () => { const g = newGame(); Game.setKinds(g, []); assert.deepStrictEqual(g.kinds, [0]); Game.setKinds(g, [99, -1]); assert.deepStrictEqual(g.kinds, [0]); });
test('unlock prices: 7 creatures for VP, first 2 free, increasing; the finale creature last and never for sale', () => {
  const u = CONFIG.vp.unlockCost, NB = Profile.NB; assert.strictEqual(u.length, CONFIG.kinds.length); assert.strictEqual(NB, 7); assert.ok(u[0] === 0 && u[1] === 0); for (let i = 3; i < NB; i++) assert.ok(u[i] > u[i - 1]);
  assert.strictEqual(Profile.CHIMERA, CONFIG.kinds.length - 1); assert.strictEqual(CONFIG.kinds[Profile.CHIMERA].id, 'chimera'); assert.strictEqual(u[Profile.CHIMERA], null);
  assert.ok(CONFIG.kinds.every((k, i) => !k.finale === (i < NB))); assert.ok(!CONFIG.ults.kinds[Profile.CHIMERA]);
});
test('default creature count never includes the finale creature', () => { const g = newGame({ nKinds: 99 }); assert.ok(!g.kinds.includes(Profile.CHIMERA)); assert.strictEqual(g.kinds.length, Profile.NB); });
test('no level uses the finale creature', () => { for (const lv of CONFIG.levels) assert.ok(!lv.kinds.includes(Profile.CHIMERA) && !(lv.cups || []).some(c => c[0] === Profile.CHIMERA), lv.id); });

console.log('Levels (chapter 1 tutorial)');
const LV = CONFIG.levels, lvIdx = (id) => LV.findIndex(l => l.id === id);
const lvGame = (id) => { const g = newGame(); Game.startLevel(g, lvIdx(id)); return g; };
const clearTable = (g) => { g.world.cups = []; g.world.pillars = []; g.held = null; g.phase = 'flying'; return g; };
test('chapter 1 has 8 levels in order', () => { assert.deepStrictEqual(LV.filter(l => l.chapter === 1).map(l => l.id), ['first', 'line', 'bank', 'chain', 'cluster', 'items', 'pillars', 'checkmate']); });
test('level config is valid (creatures, goals, stars, layout inside the table)', () => {
  const types = ['make', 'bank', 'chain', 'cluster', 'pillars', 'checkmate', 'kings', 'free', 'guardians', 'heads'];
  for (const lv of LV) {
    assert.ok(lv.reward > 0 && types.includes(lv.goal.type) && lv.goal.n >= 1 && lv.stars[0] < lv.stars[1]);
    for (const k of lv.kinds) assert.ok(k >= 0 && k < CONFIG.kinds.length);
    for (const [k, t, x, y, f] of lv.cups || []) { assert.ok(lv.kinds.includes(k) || f === 'stone', lv.id); assert.ok(f === undefined || f === 'stone'); assert.ok(x >= 0 && x <= 600 && y > 0 && y < CONFIG.world.LINE_Y - 100, lv.id); }
    const all = (lv.cups || []).map(([k, t, x, y]) => ({ x, y, r: CONFIG.tiers[t].r })).concat((lv.pillars || []).map(([x, y]) => ({ x, y, r: CONFIG.pillars.r }))).concat((lv.guards || []).map(([x, y]) => ({ x, y, r: CONFIG.guard.r }))).concat((lv.heads || []).map(([x, y]) => ({ x, y, r: CONFIG.hydra.r })));
    if (lv.rise) for (const c of all) assert.ok(c.y + c.r < CONFIG.world.LINE_Y - CONFIG.rise.max, lv.id + ' layout above the highest water');
    for (const [x, y, rx, ry] of lv.sand || []) assert.ok(rx > 0 && ry > 0 && x >= 0 && x <= 600 && y - ry >= 0 && y + ry < CONFIG.world.LINE_Y, lv.id + ' sand');
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) assert.ok(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y) > all[i].r + all[j].r, lv.id + ' overlap ' + i + ',' + j);
  }
});
test('startLevel places the fixed layout, items and spawn odds', () => {
  let g = lvGame('first'); assert.strictEqual(g.world.cups.filter(c => !c.held).length, 1); assert.strictEqual(g.held.tier, 0); assert.strictEqual(g.next.tier, 0);
  g = lvGame('items'); assert.deepStrictEqual(g.items, ['upgrade', 'wild', 'undo']); assert.strictEqual(g.danger, 'fade');
  g = lvGame('checkmate'); assert.strictEqual(g.world.pillars.length, 2); assert.strictEqual(g.danger, 'lose'); assert.deepStrictEqual(g.items, ['undo']);
});
test('goal "make": a knight clears level 1, with stars by shots', () => {
  const g = clearTable(lvGame('first')); g.shots = 2; addCup(g, 0, 0, 255, 300, 500, 0); addCup(g, 0, 0, 345, 300);
  const ev = run(g, 0.4).find(e => e.type === 'levelclear'); assert.ok(ev); assert.strictEqual(g.phase, 'won'); assert.strictEqual(ev.stars, 3);
  assert.deepStrictEqual([1, 2, 3, 4, 5, 9].map(n => Game.starsFor(LV[0], n)), [3, 3, 2, 2, 1, 1]);
});
test('goal "cluster" counts cluster merges only', () => {
  const g = clearTable(lvGame('cluster')); addCup(g, 0, 1, 200, 300, 500, 0); addCup(g, 0, 1, 290, 300); run(g, 0.4); assert.strictEqual(g.prog, 0);
  addCup(g, 0, 1, 100, 600, 500, 0); addCup(g, 0, 1, 190, 600); addCup(g, 0, 1, 246, 600); run(g, 0.4); assert.strictEqual(g.prog, 1); assert.notStrictEqual(g.phase, 'won');
});
test('goal "pillars": breaking two pillars clears the level', () => {
  const g = clearTable(lvGame('pillars')); g.world.pillars.push({ id: 'a', x: 200, y: 200, r: 26, hp: 1 }, { id: 'b', x: 400, y: 200, r: 26, hp: 1 });
  addCup(g, 0, 0, 200, 300, 300, 0); addCup(g, 0, 0, 260, 300); addCup(g, 0, 0, 360, 300, 300, 0); addCup(g, 0, 0, 420, 300);
  const ev = run(g, 0.5); assert.ok(ev.some(e => e.type === 'levelclear'));
});
test('goal "checkmate" and "chain"', () => {
  let g = clearTable(lvGame('checkmate')); addCup(g, 0, 5, 150, 300, 600, 0); addCup(g, 0, 5, 330, 300); assert.ok(run(g, 0.4).some(e => e.type === 'levelclear'));
  g = clearTable(lvGame('chain')); addCup(g, 0, 0, 255, 400, 1200, 0); addCup(g, 0, 0, 345, 400); addCup(g, 0, 1, 420, 400); assert.ok(run(g, 0.8).some(e => e.type === 'levelclear'));
});
test('tutorial levels do not lose; "line" and the final exam do', () => {
  let g = clearTable(lvGame('first')); g.phase = 'ready'; addCup(g, 0, 2, 100, 780); run(g, 5); assert.notStrictEqual(g.phase, 'over');
  g = clearTable(lvGame('line')); g.phase = 'ready'; addCup(g, 0, 2, 100, 780); run(g, 4); assert.strictEqual(g.phase, 'over');
});
test('shot limit: out of shots → lose with reason', () => {
  const g = clearTable(lvGame('items')); g.shots = 10; const ev = run(g, 1); assert.strictEqual(g.phase, 'over'); assert.ok(ev.some(e => e.type === 'gameover' && e.reason === 'shots'));
});
test('launching counts shots; Undo restores the count', () => {
  const g = lvGame('items'); g.drag = { id: 1, ox: 0, oy: 0, hist: [{ t: 0, x: 300, y: 845 }] }; Game.dragTo(g, 300, 600, 1, 30); assert.strictEqual(g.shots, 1);
  Game.useItem(g, 'undo'); assert.strictEqual(g.shots, 0);
});
test('after clearing, updates stop (no score, no loss)', () => { const g = lvGame('first'); g.phase = 'won'; const sc = g.score; assert.deepStrictEqual(Game.update(g, 5), []); assert.strictEqual(g.score, sc); });
test('Levels: Game.vp is 0 (reward only via clearLevel)', () => { const g = lvGame('first'); g.score = 99999; g.kings = 5; assert.strictEqual(Game.vp(g).total, 0); });
test('replaying a level resets progress, shots and the layout', () => { const g = lvGame('line'); g.prog = 3; g.shots = 7; g.world.cups = []; Game.startLevel(g, 1); assert.deepStrictEqual([g.prog, g.shots, g.world.cups.length], [0, 0, 3]); });
test('setMode back to classic → level cleared', () => { const g = lvGame('first'); Game.setMode(g, 'classic'); assert.strictEqual(g.level, null); assert.strictEqual(Game.goalProgress(g), null); });

console.log('Chapter 2: petrified cups and new goals');
test('chapter 2 has 8 levels, all real rules, with basilisk as the third creature', () => {
  const ch2 = LV.filter(l => l.chapter === 2); assert.strictEqual(ch2.length, 8); assert.ok(ch2.every(l => l.danger === 'lose'));
  assert.deepStrictEqual(ch2.map(l => l.id), ['gaze', 'maze', 'crowd', 'domino', 'siege', 'twins', 'precise', 'basilisk']);
  assert.ok(ch2.filter(l => l.kinds.length === 3).every(l => l.kinds.includes(4)));
});
test('stone cups never merge, are skipped by clusters, magnet and items checks', () => {
  const g = clearTable(lvGame('gaze')); const a = addCup(g, 0, 0, 255, 300, 500, 0), b = addCup(g, 0, 0, 345, 300); b.stone = true;
  const ev = run(g, 0.4); assert.ok(!ev.some(e => e.type === 'merge')); assert.ok(g.world.cups.includes(b));
});
test('a nearby merge blast frees a stone cup; far ones stay stone', () => {
  const g = clearTable(lvGame('gaze')); addCup(g, 0, 0, 255, 300, 500, 0); addCup(g, 0, 0, 345, 300);
  const near = addCup(g, 1, 2, 300, 210); near.stone = true; const far = addCup(g, 1, 2, 300, 620); far.stone = true;
  const ev = run(g, 0.4); assert.ok(ev.some(e => e.type === 'unstone' && e.id === near.id)); assert.ok(!near.stone); assert.ok(far.stone);
});
test('levels place stone cups from the layout', () => { const g = lvGame('gaze'); assert.strictEqual(g.world.cups.filter(c => c.stone).length, 2); });
test('goal chain ×3: a ×2 chain does not count, ×3 does', () => {
  const g = clearTable(lvGame('domino')); addCup(g, 0, 0, 255, 400, 1200, 0); addCup(g, 0, 0, 345, 400); addCup(g, 0, 1, 420, 400); run(g, 0.8); assert.strictEqual(g.prog, 0);
});
test('domino layout: a straight shot up the column chains ×3 and clears the level', () => {
  const g = lvGame('domino'); const h = g.held; h.held = false; g.held = null; h.vx = 0; h.vy = -1500; g.phase = 'flying'; g.shotMerges = 0; g.shots = 1;
  const ev = run(g, 2); assert.ok(ev.some(e => e.type === 'merge' && e.combo >= 3), 'chain x3'); assert.strictEqual(g.phase, 'won');
});
test('goal kings with a creature subset (twins): dragon + unicorn kings clear it', () => {
  const g = clearTable(lvGame('twins')); assert.deepStrictEqual(Game.goalProgress(g), { have: 0, need: 2 });
  addCup(g, 0, 4, 100, 150, 600, 0); addCup(g, 0, 4, 230, 150); addCup(g, 1, 4, 330, 500, 600, 0); addCup(g, 1, 4, 460, 500);
  assert.ok(run(g, 0.5).some(e => e.type === 'levelclear'));
});
test('chapter 2 opens after the chapter 1 final exam', () => { const p = Profile.fresh(0); for (let i = 0; i < 7; i++) Profile.clearLevel(p, i, 1); assert.ok(!Profile.levelOpen(p, 8)); Profile.clearLevel(p, 7, 1); assert.ok(Profile.levelOpen(p, 8)); });

console.log('Chapter 3: sand, stingers, twin guardians');
const slide = (g, sand) => { g.world.sand = sand; const c = addCup(g, 0, 0, 300, 600, 0, -1300); for (let i = 0; i < 400 && (c.vx || c.vy); i++) Physics.advance(g.world, 1 / 60); return 600 - c.y; };
test('chapter 3 has 8 levels (17–24) in STORY.md order, all with sand', () => {
  const ch3 = LV.filter(l => l.chapter === 3); assert.deepStrictEqual(ch3.map(l => l.id), ['dunes', 'obelisk', 'quicksand', 'pilgrims', 'stingers', 'camp', 'silence', 'guardians']);
  assert.strictEqual(lvIdx('dunes'), 16); assert.ok(ch3.every(l => l.sand && l.sand.length)); assert.deepStrictEqual(ch3.map(l => l.danger === 'lose'), [false, false, true, true, true, true, true, true]);
  assert.deepStrictEqual(ch3.filter(l => l.sting).map(l => l.id), ['stingers', 'camp', 'guardians']); assert.strictEqual(LV[lvIdx('dunes')].intro, 'griffin');
  assert.deepStrictEqual(CONFIG.story.chapters.slice(0, 3), [1, 2, 3]);
});
test('sand slows a cup that crosses it; no sand = the same distance as Classic', () => {
  const free = slide(clearTable(newGame()), []), cl = (() => { const g = newGame(); g.world.cups = []; const c = addCup(g, 0, 0, 300, 600, 0, -1300); for (let i = 0; i < 400 && (c.vx || c.vy); i++) Physics.advance(g.world, 1 / 60); return 600 - c.y; })();
  assert.strictEqual(free, cl); const sandy = slide(clearTable(newGame()), [[300, 450, 200, 120]]); assert.ok(sandy < free * 0.8, sandy + ' vs ' + free);
  assert.ok(Physics.inSand([[300, 450, 200, 120]], 300, 400) && !Physics.inSand([[300, 450, 200, 120]], 300, 300));
});
test('Classic never has sand; levels load their patches and the aim line slows inside them', () => {
  const g = newGame(); assert.deepStrictEqual(g.world.sand, []); const L = lvGame('dunes'); assert.deepStrictEqual(L.world.sand, LV[lvIdx('dunes')].sand);
  const c = { x: 300, y: 845, r: 22, fric: 1, bounce: 1 }, v = { vx: 0, vy: -1500 };
  const a = Physics.predictPath(c, v, []), b = Physics.predictPath(c, v, [], [[300, 480, 250, 70]]); assert.ok(b[b.length - 1].y > a[a.length - 1].y + 50);
});
const stingGame = () => { const g = clearTable(lvGame('stingers')); g.phase = 'ready'; return g; };
test('stingers: a cup is stung on schedule; unmerged after 3 shots it drops one tier', () => {
  const g = lvGame('stingers'), S = LV[lvIdx('stingers')].sting; assert.ok(!g.world.cups.some(c => c.sting), 'nothing stung before the first shot');
  g.world.cups = g.world.cups.filter(c => c.held); const b = addCup(g, 5, 2, 300, 300); g.world.cups = g.world.cups.filter(c => !c.held); g.held = null;
  const settle = () => { g.phase = 'flying'; g.settleT = 0; g.shots++; return run(g, 0.5); };
  let ev = settle(); assert.strictEqual(g.shots, S.first); assert.ok(ev.some(e => e.type === 'sting' && e.id === b.id)); assert.strictEqual(b.sting, CONFIG.sting.life);
  g.world.cups = g.world.cups.filter(c => !c.held); settle(); g.world.cups = g.world.cups.filter(c => !c.held); assert.strictEqual(b.sting, 2);
  settle(); g.world.cups = g.world.cups.filter(c => !c.held); assert.strictEqual(b.sting, 1);
  ev = settle(); const d = ev.find(e => e.type === 'stingdrop'); assert.ok(d && d.old === b.id && d.tier === 1);
  const n = g.world.cups.find(c => c.id === d.id); assert.ok(n && n.tier === 1 && !g.world.cups.includes(b));   // (the only cup left may be stung again right away)
});
test('stingers: merging a stung cup cures it; pawns and stones are never stung; own RNG keeps spawn order', () => {
  const g = clearTable(lvGame('stingers')); const a = addCup(g, 5, 1, 255, 300, 500, 0), b = addCup(g, 5, 1, 345, 300); b.sting = 1;
  run(g, 0.4); assert.ok(g.world.cups.every(c => !c.sting) && g.world.cups.some(c => c.tier === 2));
  const h = clearTable(lvGame('stingers')); addCup(h, 5, 0, 200, 200); const st = addCup(h, 5, 2, 400, 200); st.stone = true; h.shots = 1; h.settleT = 0;
  const ev = run(h, 0.5); assert.ok(!ev.some(e => e.type === 'sting'));
  const spawnAfterShot = (cup) => { const q = clearTable(lvGame('stingers')); if (cup) addCup(q, 5, 2, 300, 300); q.shots = 1; q.settleT = 0; const ev = run(q, 0.5); return [ev.some(e => e.type === 'sting'), q.rng.get(), q.next]; };
  const [stung, r1, n1] = spawnAfterShot(true), [none, r2, n2] = spawnAfterShot(false); assert.ok(stung && !none); assert.strictEqual(r1, r2); assert.deepStrictEqual(n1, n2);   // stings never touch the spawn RNG
});
test('Undo restores stung marks and the sting RNG', () => {
  const g = lvGame('stingers'); g.items = ['undo']; g.world.cups.find(c => !c.held && c.tier >= 1).sting = 2; const r = g.stingRng.get();
  g.drag = { id: 1, ox: 0, oy: 0, hist: [{ t: 0, x: 300, y: 845 }] }; Game.dragTo(g, 300, 600, 1, 30); g.stingRng(); g.world.cups.forEach(c => { c.sting = 0; });
  Game.useItem(g, 'undo'); assert.strictEqual(g.stingRng.get(), r); assert.ok(g.world.cups.some(c => c.sting === 2));
});
test('twin guardians: two statues with separate hp; a blast hits only the nearer one', () => {
  const g = lvGame('guardians'), gs = g.world.pillars.filter(p => p.guard); assert.strictEqual(gs.length, 2); assert.ok(gs.every(p => p.hp === p.max && p.r === CONFIG.guard.r));
  assert.deepStrictEqual(Game.goalProgress(g), { have: 0, need: 2 });
  clearTable(g); g.world.pillars = gs; addCup(g, 0, 4, 200, 140, 600, 0); addCup(g, 0, 4, 330, 140);   // a king forms between them, nearer the left one: both in blast range
  const ev = run(g, 0.4), hits = ev.filter(e => e.type === 'pillarhit'); assert.strictEqual(hits.length, 1); assert.strictEqual(hits[0].id, gs[0].id); assert.ok(gs[1].hp === gs[1].max);
});
test('twin guardians: breaking both clears the boss; one is not enough', () => {
  const g = clearTable(lvGame('guardians')); g.world.pillars = [{ id: 'gA', x: 150, y: 140, r: 40, hp: 1, max: 16, guard: true }, { id: 'gB', x: 450, y: 140, r: 40, hp: 1, max: 16, guard: true }];
  addCup(g, 5, 0, 110, 260, 400, 0); addCup(g, 5, 0, 170, 260); let ev = run(g, 0.4); assert.ok(ev.some(e => e.type === 'pillarbreak' && e.guard)); assert.notStrictEqual(g.phase, 'won');
  addCup(g, 5, 0, 410, 260, 400, 0); addCup(g, 5, 0, 470, 260); ev = run(g, 0.4); assert.ok(ev.some(e => e.type === 'levelclear')); assert.strictEqual(g.phase, 'won');
});
test('guardians sting from the nearer statue', () => {
  const g = clearTable(lvGame('guardians')); g.world.pillars = lvGame('guardians').world.pillars; const c = addCup(g, 6, 2, 480, 400); g.shots = 2; g.settleT = 0;
  const e = run(g, 0.5).find(q => q.type === 'sting'); assert.ok(e && e.id === c.id); assert.deepStrictEqual(e.from, { x: 450, y: 140 });
});
test('goal "free" counts freed stone cups', () => {
  const g = clearTable(lvGame('pilgrims')); for (const x of [150, 450]) { const s = addCup(g, 1, 2, x, 210); s.stone = true; }
  addCup(g, 0, 0, 110, 300, 500, 0); addCup(g, 0, 0, 190, 300); run(g, 0.4); assert.strictEqual(g.prog, 1);
});
test('chapter 3 opens after the basilisk; its story cards are 3.open / 3.close', () => {
  const p = Profile.fresh(0), first = lvIdx('dunes'), last = lvIdx('guardians'); for (let i = 0; i < first - 1; i++) Profile.clearLevel(p, i, 1);
  assert.ok(!Profile.levelOpen(p, first)); Profile.clearLevel(p, first - 1, 1); assert.ok(Profile.levelOpen(p, first));
  assert.strictEqual(Profile.storyBefore(p, first), 'ch3.open'); Profile.clearLevel(p, last, 1); assert.strictEqual(Profile.storyAfter(p, last), 'ch3.close');
});
test('old saves gain the new levels unplayed (no save-format change)', () => {
  const p = Profile.migrate({ v: 8, cleared: [0, 1, 15], stars: [3, 2] }); assert.strictEqual(p.stars.length, LV.length); assert.deepStrictEqual(p.stars.slice(16), Array(LV.length - 16).fill(0));
});

console.log('Chapter 4: currents');
const drift = (bands, tier = 0, vy = -1300) => { const g = clearTable(newGame()); g.world.current = bands; const c = addCup(g, 0, tier, 300, 680, 0, vy); let t = 0; for (; t < 30 && (c.vx || c.vy); t += 1 / 60) Physics.advance(g.world, 1 / 60); return { dx: c.x - 300, y: c.y, t }; };
test('chapter 4 has 8 levels (25–32) in STORY.md order, all with currents; phoenix cameo on 25; heads on 30 and 32; rising water only on 32', () => {
  const ch4 = LV.filter(l => l.chapter === 4); assert.deepStrictEqual(ch4.map(l => l.id), ['lighthouse', 'streets', 'market', 'belltower', 'cathedral', 'firsthead', 'stair', 'hydra']);
  assert.strictEqual(lvIdx('lighthouse'), 24); assert.strictEqual(LV.length, 32); assert.ok(ch4.every(l => l.current && l.current.length)); assert.deepStrictEqual(ch4.map(l => l.danger === 'lose'), [false, false, true, true, true, true, true, true]);
  assert.deepStrictEqual(ch4.filter(l => l.heads).map(l => [l.id, l.heads.length, l.goal.type]), [['firsthead', 1, 'heads'], ['hydra', 3, 'heads']]); assert.deepStrictEqual(LV.filter(l => l.rise).map(l => l.id), ['hydra']);
  assert.deepStrictEqual(LV[lvIdx('stair')].goal, { type: 'make', tier: 4, n: 1 }); assert.strictEqual(LV[lvIdx('stair')].shotLimit, 8);
  assert.strictEqual(LV[lvIdx('lighthouse')].intro, 'phoenix'); assert.deepStrictEqual(LV[lvIdx('belltower')].goal, { type: 'pillars', n: 3 }); assert.deepStrictEqual(LV[lvIdx('cathedral')].goal, { type: 'free', n: 4 });
  assert.ok(CONFIG.story.chapters.includes(4));
});
test('current config: friction always beats the strongest push; level bands are valid', () => {
  assert.ok(CONFIG.current.accel * CONFIG.current.maxK <= 0.8 * CONFIG.phys.A);
  for (const lv of LV) for (const [y, h, k] of lv.current || []) assert.ok(h > 0 && y - h >= 0 && y + h < CONFIG.world.LINE_Y && k && Math.abs(k) <= CONFIG.current.maxK, lv.id + ' current');
});
test('a current pushes a moving cup sideways (+k right, −k left), stronger k = more; no bands = Classic distance', () => {
  const none = drift([]), r = drift([[400, 120, 1]]), l = drift([[400, 120, -1]]), strong = drift([[400, 120, 1.4]]);
  assert.strictEqual(none.dx, 0); assert.ok(r.dx > 15 && l.dx < -15, r.dx + ' ' + l.dx); assert.ok(Math.abs(r.dx + l.dx) < 1e-6); assert.ok(strong.dx > r.dx);
  assert.ok(drift([[400, 120, 1.4]], 3).dx < strong.dx, 'bigger pieces drift less');
  assert.ok(r.t < 4 && strong.t < 4, 'every cup still comes to rest');
});
test('a resting cup inside a band is not moved; Classic has no bands; levels load theirs', () => {
  const g = clearTable(newGame()); g.world.current = [[400, 120, 1.4]]; const c = addCup(g, 0, 0, 300, 400); Physics.advance(g.world, 1); assert.strictEqual(c.x, 300);
  assert.deepStrictEqual(newGame().world.current, []); assert.deepStrictEqual(lvGame('market').world.current, LV[lvIdx('market')].current);
  assert.strictEqual(Physics.currentAt([[400, 50, -1]], 420), -CONFIG.current.accel); assert.strictEqual(Physics.currentAt([[400, 50, -1]], 460), 0); assert.strictEqual(Physics.currentAt(undefined, 400), 0);
});
test('the aim line follows the current like the real cup', () => {
  const g = clearTable(newGame()); g.world.current = [[400, 120, 1.2]]; const c = addCup(g, 0, 0, 300, 680, 0, -1300);
  const pts = Physics.predictPath(c, { vx: 0, vy: -1300 }, [], [], g.world.current), end = pts[pts.length - 1], plain = Physics.predictPath(c, { vx: 0, vy: -1300 }, [], [], []);
  for (let t = 0; t < 30 && (c.vx || c.vy); t += 1 / 60) Physics.advance(g.world, 1 / 60);
  assert.ok(Math.abs(end.x - c.x) < 6 && Math.abs(end.y - c.y) < 12, JSON.stringify([end, c.x, c.y])); assert.strictEqual(plain[plain.length - 1].x, 300);
});
test('chapter 4 opens after the twin guardians; its opening card is ch4.open; no closing card until the chapter is complete', () => {
  const p = Profile.fresh(0), first = lvIdx('lighthouse'), last = LV.map((l, i) => i).filter(i => LV[i].chapter === 4).pop();
  for (let i = 0; i < first - 1; i++) Profile.clearLevel(p, i, 1); assert.ok(!Profile.levelOpen(p, first)); Profile.clearLevel(p, first - 1, 1); assert.ok(Profile.levelOpen(p, first));
  assert.strictEqual(Profile.storyBefore(p, first), 'ch4.open'); Profile.clearLevel(p, last, 1);
  assert.strictEqual(Profile.storyAfter(p, last), (CONFIG.story.unfinished || []).includes(4) ? null : 'ch4.close');
  assert.ok(!(CONFIG.story.unfinished || []).includes(4), 'chapter 4 is complete: closing card on');
});

console.log('Chapter 4: hydra heads, rising water');
const headGame = (hp, cut) => { const g = clearTable(lvGame('firsthead')); g.world.pillars = [{ id: 'hA', x: 300, y: 140, r: CONFIG.hydra.r, hp: hp, max: 4, head: true, cut: cut || 0 }]; return g; };
const pairAt = (g, kind, tier, x, y) => { addCup(g, kind, tier, x - 45, y, 500, 0); addCup(g, kind, tier, x + 45, y); };
test('hydra heads load as targets with health; goal 0/need', () => {
  const g = lvGame('hydra'), hs = g.world.pillars.filter(p => p.head); assert.strictEqual(hs.length, 3); assert.ok(hs.every(p => p.hp === p.max && p.r === CONFIG.hydra.r && !p.cut));
  assert.deepStrictEqual(Game.goalProgress(g), { have: 0, need: 3 }); assert.deepStrictEqual(Game.goalProgress(lvGame('firsthead')), { have: 0, need: 1 });
});
test('a plain merge blast damages a head; at 0 hp it is cut (not burned) and grows back after `regrow` shots', () => {
  const g = headGame(2); pairAt(g, 2, 0, 300, 230); let ev = run(g, 0.4);
  const h = g.world.pillars[0]; assert.ok(ev.some(e => e.type === 'headcut')); assert.ok(!ev.some(e => e.type === 'headburn')); assert.strictEqual(h.hp, 0); assert.strictEqual(h.cut, CONFIG.hydra.regrow);
  assert.strictEqual(g.world.pillars.length, 1, 'the stump stays'); assert.notStrictEqual(g.phase, 'won');
  g.world.cups = []; for (let i = 1; i < CONFIG.hydra.regrow; i++) { g.phase = 'flying'; g.shots++; ev = run(g, 0.5); g.world.cups = []; assert.strictEqual(h.cut, CONFIG.hydra.regrow - i); assert.ok(!ev.some(e => e.type === 'headgrow')); }
  g.phase = 'flying'; g.shots++; ev = run(g, 0.5); assert.ok(ev.some(e => e.type === 'headgrow' && e.id === 'hA')); assert.strictEqual(h.cut, 0); assert.strictEqual(h.hp, h.max);
});
test('Phoenix fire: a chain finishing a head burns it for good (goal +1, level cleared)', () => {
  const g = headGame(3); addCup(g, 2, 1, 230, 235); addCup(g, 2, 0, 230, 295); addCup(g, 2, 0, 230, 400, 0, -900);   // pawn → knight → chain bishop
  const ev = run(g, 0.8); const m = ev.filter(e => e.type === 'merge'); assert.ok(m.some(e => e.combo >= 2), JSON.stringify(m.map(e => [e.tier, e.combo])));
  assert.ok(ev.some(e => e.type === 'headburn')); assert.ok(!ev.some(e => e.type === 'headcut')); assert.strictEqual(g.world.pillars.length, 0); assert.strictEqual(g.phase, 'won');
});
test('Phoenix fire: a cluster merge burns a head; any fire burns a cut stump; a plain merge does nothing to a stump', () => {
  let g = headGame(2); addCup(g, 2, 0, 255, 230, 500, 0); addCup(g, 2, 0, 345, 230); addCup(g, 2, 0, 300, 268); let ev = run(g, 0.4);
  assert.ok(ev.some(e => e.type === 'merge' && e.n >= 3)); assert.ok(ev.some(e => e.type === 'headburn'));
  g = headGame(0, 2); pairAt(g, 2, 0, 300, 230); ev = run(g, 0.4); assert.ok(!ev.some(e => /^head/.test(e.type))); assert.strictEqual(g.world.pillars[0].cut, 2);
  g = headGame(0, 2); addCup(g, 2, 0, 255, 230, 500, 0); addCup(g, 2, 0, 345, 230); addCup(g, 2, 0, 300, 268); ev = run(g, 0.4); assert.ok(ev.some(e => e.type === 'headburn')); assert.strictEqual(g.phase, 'won');
});
test('a checkmate burns heads in range', () => {
  const g = headGame(4); pairAt(g, 2, 5, 300, 330); const ev = run(g, 0.4); assert.ok(ev.some(e => e.type === 'checkmate') && ev.some(e => e.type === 'headburn'));
});
test('burning all three heads clears the Hydra; two is not enough', () => {
  const g = clearTable(lvGame('hydra')); g.world.pillars = lvGame('hydra').world.pillars; for (const p of g.world.pillars) { p.hp = 0; p.cut = 2; }
  let ev; for (const x of [140, 300]) { addCup(g, 2, 0, x - 45, 240, 500, 0); addCup(g, 2, 0, x + 45, 240); addCup(g, 2, 0, x, 278); }
  ev = run(g, 0.4); assert.strictEqual(ev.filter(e => e.type === 'headburn').length, 2); assert.notStrictEqual(g.phase, 'won'); assert.deepStrictEqual(Game.goalProgress(g), { have: 2, need: 3 });
  addCup(g, 2, 0, 415, 240, 500, 0); addCup(g, 2, 0, 505, 240); addCup(g, 2, 0, 460, 278); g.phase = 'flying'; ev = run(g, 0.4); assert.ok(ev.some(e => e.type === 'levelclear'));
});
test('rising water: every `every` shots the danger line climbs `step`, capped at `max`; Classic and other levels never move it', () => {
  const R = CONFIG.rise, g = lvGame('hydra'), L = CONFIG.world.LINE_Y; assert.strictEqual(g.lineY, L);
  const seen = []; for (let s = 1; s <= R.every * 8; s++) { g.world.cups = []; g.held = null; g.phase = 'flying'; g.shots = s; g.settleT = 0; const ev = run(g, 0.5); if (ev.some(e => e.type === 'rise')) seen.push(s); }
  assert.deepStrictEqual(seen, Array.from({ length: R.max / R.step }, (_, i) => (i + 1) * R.every)); assert.strictEqual(g.lineY, L - R.max);
  const m = lvGame('market'); m.world.cups = []; m.held = null; m.phase = 'flying'; m.shots = R.every; m.settleT = 0; run(m, 0.5); assert.strictEqual(m.lineY, L);
  assert.strictEqual(newGame().lineY, L);
});
test('rising water: a piece resting below the risen line counts as in danger', () => {
  const g = clearTable(lvGame('hydra')); g.lineY = CONFIG.world.LINE_Y - 100; addCup(g, 2, 1, 300, CONFIG.world.LINE_Y - 50); run(g, CONFIG.rules.DANGER_T + 0.5); assert.strictEqual(g.phase, 'over');
  const h = clearTable(lvGame('hydra')); addCup(h, 2, 1, 300, CONFIG.world.LINE_Y - 50); run(h, CONFIG.rules.DANGER_T + 0.5); assert.notStrictEqual(h.phase, 'over');
});
test('Undo restores head damage, stumps and the water level', () => {
  const g = lvGame('hydra'); g.items = ['undo']; const h = g.world.pillars.find(p => p.head); h.hp = 2; g.lineY -= 50;
  g.drag = { id: 1, ox: 0, oy: 0, hist: [{ t: 0, x: 300, y: 845 }] }; Game.dragTo(g, 300, 600, 1, 30); h.hp = 0; h.cut = 3; g.lineY -= 25;
  Game.useItem(g, 'undo'); const h2 = g.world.pillars.find(p => p.id === h.id); assert.strictEqual(h2.hp, 2); assert.ok(!h2.cut); assert.strictEqual(g.lineY, CONFIG.world.LINE_Y - 50);
});

console.log('Creature ultimates');
const UC = CONFIG.ults;
const ultGame = (mode) => { const g = newGame({ mode: mode || 'classic' }); Game.setKinds(g, [0, 1, 2]); Game.restart(g); g.world.cups = g.world.cups.filter(c => c.held); return g; };
const fireAt = (g, vx, vy) => { const sp = Math.hypot(vx, vy), d = g.held.y - 700, ms = d / sp * 1000; g.drag = { id: 1, ox: 0, oy: 0, hist: [{ t: 0, x: g.held.x, y: g.held.y }] }; return Game.dragTo(g, g.held.x + vx / sp * d, 700, 1, ms); };
test('modes: Classic charges, Practice always full, Levels have none', () => {
  assert.deepStrictEqual([Modes.classic.ults, Modes.practice.ults, Modes.level.ults], ['charge', 'free', 'none']);
  assert.ok(ultGame('practice').ult.slice(0, 3).every(v => v === UC.full)); const L = newGame(); Game.startLevel(L, 0); assert.deepStrictEqual(Game.ultKinds(L), []);
});
test('only dragon, unicorn and hydra have ultimates (first batch), and only when in play', () => { const g = ultGame(); assert.deepStrictEqual(Game.ultKinds(g), [0, 1, 2]); Game.setKinds(g, [0, 3]); assert.deepStrictEqual(Game.ultKinds(g), [0]); });
test('merging a creature charges its gauge by tier; full → ultready event', () => {
  const g = ultGame(); g.held = null; g.phase = 'flying'; addCup(g, 0, 2, 255, 300, 500, 0); addCup(g, 0, 2, 345, 300);
  run(g, 0.3); assert.strictEqual(g.ult[0], 3 * UC.perTier); assert.strictEqual(g.ult[1], 3 * UC.perTier * UC.share, 'other creatures get a shared part'); assert.strictEqual(g.ult[3], 0);
  g.ult[0] = UC.full - 1; addCup(g, 0, 0, 100, 600, 500, 0); addCup(g, 0, 0, 190, 600); assert.ok(run(g, 0.3).some(e => e.type === 'ultready' && e.kind === 0));
});
test('arming needs a full gauge and a cup in hand; tapping again disarms', () => {
  const g = ultGame(); assert.strictEqual(Game.armUlt(g, 0), null); g.ult[0] = UC.full;
  assert.ok(Game.armUlt(g, 0)); assert.strictEqual(g.held.ult, 0); assert.ok(Game.armUlt(g, 0)); assert.strictEqual(g.held.ult, null); assert.strictEqual(g.ult[0], UC.full);
});
test('Dragonfire: burns pawns and knights in range (points), pushes bigger cups, spends the gauge', () => {
  const g = ultGame(); g.ult[0] = UC.full; Game.armUlt(g, 0);
  const pawn = addCup(g, 1, 0, 300, 420), knight = addCup(g, 2, 1, 360, 380), rook = addCup(g, 1, 3, 240, 360), far = addCup(g, 1, 0, 60, 80);
  assert.strictEqual(fireAt(g, 0, -1100), 'launched'); assert.strictEqual(g.ult[0], 0);
  const ev = run(g, 1); assert.ok(ev.some(e => e.type === 'ultimate' && e.ult === 'fireball'));
  assert.ok(!g.world.cups.includes(pawn) && !g.world.cups.includes(knight)); assert.ok(g.world.cups.includes(rook) && g.world.cups.includes(far));
  assert.ok(ev.filter(e => e.type === 'burn').length >= 2); assert.ok(g.score > 0);
});
test('Holy Light: cups around turn into unicorns and same-tier ones merge', () => {
  const g = ultGame(); g.ult[1] = UC.full; Game.armUlt(g, 1);
  addCup(g, 0, 1, 260, 330); addCup(g, 2, 1, 340, 330); addCup(g, 0, 1, 300, 420);
  fireAt(g, 0, -900); const ev = run(g, 2.5);
  assert.ok(ev.some(e => e.type === 'ultimate' && e.ult === 'holy')); assert.ok(ev.some(e => e.type === 'convert'));
  assert.ok(ev.some(e => e.type === 'merge' && e.kind === 1), 'converted cups merged');
});
test('Venom Pool: dissolves pawns now and for 3 shots, frees stone, then dries up', () => {
  const g = ultGame(); g.held.kind = 2; g.ult[2] = UC.full; Game.armUlt(g, 2);
  const pawn = addCup(g, 0, 0, 300, 420), bishop = addCup(g, 1, 2, 390, 420), stone = addCup(g, 1, 1, 222, 500); stone.stone = true;
  fireAt(g, 0, -700); const ev = run(g, 2);
  assert.ok(ev.some(e => e.type === 'ultimate' && e.ult === 'venom')); assert.strictEqual(g.pools.length, 1);
  assert.ok(!g.world.cups.includes(pawn)); assert.ok(g.world.cups.includes(bishop)); assert.ok(!stone.stone);
  const q = g.pools[0]; q.shots = 1; g.held = null; g.phase = 'flying'; addCup(g, 0, 0, q.x, q.y); run(g, 1.5); assert.strictEqual(g.pools.length, 0);
});
test('Undo after an ultimate shot restores the gauge and the table', () => {
  const g = ultGame(); g.ult[0] = UC.full; Game.armUlt(g, 0); addCup(g, 1, 0, 300, 420); fireAt(g, 0, -1100); run(g, 1);
  g.items = ['undo']; assert.ok(Game.useItem(g, 'undo')); assert.strictEqual(g.ult[0], UC.full); assert.strictEqual(g.world.cups.filter(c => !c.held).length, 1);
});
test('Practice refills the gauge after casting', () => { const g = ultGame('practice'); Game.armUlt(g, 0); fireAt(g, 0, -1100); assert.strictEqual(g.ult[0], UC.full); });

console.log('Mode hooks (modes own their HUD, banner)');
test('every mode has all fields', () => {
  for (const m of Object.values(Modes)) { assert.ok(['best', 'level'].includes(m.hud)); assert.ok('banner' in m && 'tracksBest' in m && 'givesVP' in m && typeof m.pickNext === 'function'); }
});
test('Practice has a banner; Levels use the level HUD', () => { assert.strictEqual(Modes.practice.banner, 'fx.practice'); assert.strictEqual(Modes.level.hud, 'level'); });
test('rematch: Levels → same level; other modes → restart with given creatures', () => {
  const g = newGame(); Game.startLevel(g, 5); g.score = 9; Game.rematch(g, [0]); assert.strictEqual(g.level, 5); assert.strictEqual(g.score, 0); assert.deepStrictEqual(g.kinds, [0, 1]);
  const h = newGame(); h.score = 9; Game.rematch(h, [0, 3]); assert.strictEqual(h.score, 0); assert.deepStrictEqual(h.kinds, [0, 3]);
});

console.log('Profile (player progress)');
const P0 = () => Profile.fresh(0);
test('new player: dragon + unicorn unlocked, dragon active, 0 VP', () => { const p = P0(); assert.deepStrictEqual([p.unlocked, p.active, p.vp, p.cleared, p.lang, p.sound], [[0, 1], [0], 0, [], 'en', true]); });
test('migrate: no data → new player, keeps legacy best', () => { assert.strictEqual(Profile.migrate(null, 777).best.classic, 777); assert.strictEqual(Profile.migrate('garbage', 5).best.classic, 5); });
test('migrate: v1 save → keeps best', () => { const p = Profile.migrate({ v: 1, best: { classic: 4321 } }); assert.strictEqual(p.best.classic, 4321); assert.strictEqual(p.v, Profile.VERSION); assert.deepStrictEqual(p.unlocked, [0, 1]); });
test('migrate: v2 save → keeps VP / unlocks / active, adds new fields', () => {
  const p = Profile.migrate({ v: 2, best: { classic: 10 }, vp: 150, unlocked: [0, 1, 2], active: [0, 2] });
  assert.deepStrictEqual([p.vp, p.unlocked, p.active, p.cleared, p.lang], [150, [0, 1, 2], [0, 2], [], 'en']);
});
test('migrate: bad data is repaired (negatives, duplicates, out of range, locked creatures, unknown language)', () => {
  const p = Profile.migrate({ vp: -50, best: { classic: 'x' }, unlocked: [0, 1, 1, 99], active: [5, 5, 99], cleared: [0, 0, 7, -1], lang: 'fr', sound: 0 });
  assert.deepStrictEqual([p.vp, p.best.classic, p.unlocked, p.active, p.cleared, p.lang, p.sound], [0, 0, [0, 1], [0], [0], 'en', true]);
});
test('migrate: unlocks are always contiguous from 0', () => { assert.deepStrictEqual(Profile.migrate({ unlocked: [0, 1, 4] }).unlocked, [0, 1, 2]); });
test('migrate: idempotent', () => { const p = Profile.migrate({ vp: 5, unlocked: [0, 1, 2], active: [1, 2], cleared: [1] }); assert.deepStrictEqual(Profile.migrate(JSON.parse(JSON.stringify(p))), p); });
test('buy: needs enough VP, in order, deducts VP', () => {
  const p = P0(); p.vp = 99; assert.strictEqual(Profile.buy(p, 2), false); p.vp = 100; assert.strictEqual(Profile.buy(p, 2), true); assert.deepStrictEqual([p.vp, p.unlocked], [0, [0, 1, 2]]);
});
test('buy: no skipping, no buying twice', () => { const p = P0(); p.vp = 9999; assert.strictEqual(Profile.buy(p, 4), false); Profile.buy(p, 2); assert.strictEqual(Profile.buy(p, 2), false); assert.strictEqual(p.unlocked.length, 3); });
test('buy: all unlocked → nextLockedKind = -1, the finale creature cannot be bought', () => { const p = P0(); p.vp = 1e6; for (let i = 2; i < Profile.NB; i++) assert.ok(Profile.buy(p, i)); assert.strictEqual(Profile.nextLockedKind(p), -1); assert.strictEqual(Profile.buy(p, Profile.CHIMERA), false); assert.strictEqual(Profile.buy(p, CONFIG.kinds.length), false); assert.ok(!p.unlocked.includes(Profile.CHIMERA)); assert.strictEqual(p.vp, 1e6 - 2000); });
test('unlockChimera: only via the finale flag; once; stays out of the VP sequence', () => {
  const C = Profile.CHIMERA, p = P0(); assert.ok(!p.finaleCleared); assert.strictEqual(p.seen[C], -1); assert.ok(!Profile.toggleKind(p, C));
  assert.ok(!Profile.see(p, C, 3)); assert.strictEqual(p.seen[C], -1);                       // cannot be discovered while locked
  assert.ok(Profile.unlockChimera(p)); assert.ok(!Profile.unlockChimera(p)); assert.deepStrictEqual(p.unlocked, [0, 1, C]); assert.strictEqual(p.seen[C], 0); assert.ok(p.finaleCleared);
  assert.strictEqual(Profile.nextLockedKind(p), 2); p.vp = 100; assert.ok(Profile.buy(p, 2)); assert.deepStrictEqual(p.unlocked, [0, 1, 2, C]);   // VP unlocks continue in order
  assert.ok(Profile.toggleKind(p, C)); assert.deepStrictEqual(p.active, [0, C]); assert.ok(Profile.see(p, C, 2));
  const q = Profile.migrate(JSON.parse(JSON.stringify(p))); assert.deepStrictEqual(q, p);
});
test('migrate v9: v8 saves get finaleCleared = false; a locked finale creature is stripped from unlocked/active/seen', () => {
  const C = Profile.CHIMERA;
  const a = Profile.migrate({ v: 8, vp: 10, unlocked: [0, 1, 2], active: [0, 2], seen: [3, 1, 0] }); assert.strictEqual(a.v, 9); assert.strictEqual(a.finaleCleared, false); assert.deepStrictEqual(a.unlocked, [0, 1, 2]); assert.strictEqual(a.seen[C], -1); assert.strictEqual(a.seen.length, CONFIG.kinds.length);
  const b = Profile.migrate({ v: 8, finaleCleared: true, unlocked: [0, 1, C], active: [C], seen: [0, 0, -1, -1, -1, -1, -1, 4] }); assert.ok(!b.finaleCleared); assert.deepStrictEqual([b.unlocked, b.active, b.seen[C]], [[0, 1], [0], -1]);
  const c = Profile.migrate({ v: 9, finaleCleared: 'yes', unlocked: [0, 1, C], active: [0, C] }); assert.ok(!c.finaleCleared); assert.deepStrictEqual([c.unlocked, c.active], [[0, 1], [0]]);
  const d = Profile.migrate({ v: 9, finaleCleared: true, vp: 0, unlocked: [0, 1, 2, 3, 4, 5, 6], active: [6, C] }); assert.deepStrictEqual([d.unlocked, d.active, d.seen[C]], [[0, 1, 2, 3, 4, 5, 6, C], [6, C], 0]);
  assert.strictEqual(d.vpEarned, 0);                                                         // v9 keeps lifetime VP as stored
  assert.strictEqual(Profile.migrate({ v: 6, unlocked: [0, 1, 2, 3, 4, 5, 6] }).vpEarned, 2000);   // estimate ignores the unpriced finale creature
  const r = Profile.importCode(Profile.exportCode(d)); assert.ok(r.ok); assert.deepStrictEqual(r.profile, d);
});
test('toggleKind: add unlocked ones only; keep at least 1', () => {
  const p = P0(); assert.ok(Profile.toggleKind(p, 1)); assert.deepStrictEqual(p.active, [0, 1]);
  assert.strictEqual(Profile.toggleKind(p, 3), false); assert.ok(Profile.toggleKind(p, 0)); assert.deepStrictEqual(p.active, [1]);
  assert.strictEqual(Profile.toggleKind(p, 1), false); assert.deepStrictEqual(p.active, [1]);
});
test('bankRun: banks once per run; a new run can bank again', () => {
  const p = P0(), g = newGame(); g.score = 5300; g.kings = 1;
  assert.strictEqual(Profile.bankRun(p, g).total, 20); assert.strictEqual(p.vp, 20);
  assert.strictEqual(Profile.bankRun(p, g).total, 0); assert.strictEqual(p.vp, 20);
  Game.restart(g); g.score = 1000; Profile.bankRun(p, g); assert.strictEqual(p.vp, 22);
});
test('bankRun: Practice / Levels give no score VP', () => { const p = P0(), g = newGame({ mode: 'practice' }); g.score = 99999; Profile.bankRun(p, g); assert.strictEqual(p.vp, 0); });
test('recordBest: Classic only, and only when higher', () => {
  const p = P0(), g = newGame(); g.score = 100; assert.ok(Profile.recordBest(p, g)); assert.strictEqual(p.best.classic, 100);
  g.score = 100; assert.strictEqual(Profile.recordBest(p, g), false); g.score = 50; assert.strictEqual(Profile.recordBest(p, g), false);
  const q = newGame({ mode: 'practice' }); q.score = 9999; assert.strictEqual(Profile.recordBest(p, q), false); assert.strictEqual(p.best.practice, undefined);
});
test('finishRun: handles best score and VP together', () => { const p = P0(), g = newGame(); g.score = 1000; const r = Profile.finishRun(p, g); assert.ok(r.newBest); assert.strictEqual(r.vp.total, 2); assert.strictEqual(p.vp, 2); });
test('clearLevel: reward on first clear only; extra VP per newly earned star', () => {
  const p = P0(), R = CONFIG.levels[0].reward, S = CONFIG.vp.starBonus;
  assert.strictEqual(Profile.clearLevel(p, 0, 1), R); assert.strictEqual(Profile.clearLevel(p, 0, 1), 0); assert.deepStrictEqual(p.cleared, [0]);
  assert.strictEqual(Profile.clearLevel(p, 0, 3), 2 * S); assert.strictEqual(Profile.clearLevel(p, 0, 2), 0); assert.strictEqual(p.stars[0], 3); assert.strictEqual(p.vp, R + 2 * S);
  const q = P0(); assert.strictEqual(Profile.clearLevel(q, 1, 3), CONFIG.levels[1].reward + 2 * S);
});
test('migrate v5 → v6: old level progress maps onto chapter 1', () => {
  assert.deepStrictEqual(Profile.migrate({ v: 5, cleared: [0] }).cleared, [0]);
  const p = Profile.migrate({ v: 5, cleared: [0, 1] }); assert.deepStrictEqual(p.cleared, [0, 1, 2, 3, 4, 5, 6, 7]); assert.ok(p.stars.slice(0, 8).every(s => s === 1));
  const q = Profile.migrate({ v: 6, cleared: [0, 1], stars: [3, 9, 2] }); assert.deepStrictEqual(q.stars.slice(0, 3), [3, 3, 0]);
});
test('levelOpen: level 1 open, others need the previous one', () => { const p = P0(); assert.ok(Profile.levelOpen(p, 0)); assert.ok(!Profile.levelOpen(p, 1)); Profile.clearLevel(p, 0); assert.ok(Profile.levelOpen(p, 1)); assert.ok(!Profile.levelOpen(p, 2)); });
test('language and sound settings accept valid values only', () => { const p = P0(); Profile.setLang(p, 'zh'); assert.strictEqual(p.lang, 'zh'); Profile.setLang(p, 'xx'); assert.strictEqual(p.lang, 'en'); Profile.toggleSound(p); assert.strictEqual(p.sound, false); Profile.toggleSound(p); assert.strictEqual(p.sound, true); });
test('full flow: play runs → buy a creature → clear a level', () => {
  const p = P0(); for (let i = 0; i < 3; i++) { const g = newGame(); g.score = 10000; g.kings = 1; Profile.finishRun(p, g); }
  assert.strictEqual(p.vp, 90); Profile.clearLevel(p, 0, 1); assert.strictEqual(p.vp, 90 + CONFIG.levels[0].reward); assert.ok(Profile.buy(p, 2)); assert.strictEqual(p.vp, 90 + CONFIG.levels[0].reward - 100);
});

console.log('Items');
const IT = CONFIG.items, fire = (g) => dragPath(g, [[300, 845, 0], [300, 800, 16], [300, 750, 32], [300, 700, 48]]);
const giveItem = (g, id) => { g.items.push(id); return g; };
const emptyTable = (g) => { g.world.cups = g.world.cups.filter(c => c.held); };
test('config: 3 fantasy items (Hourglass, Polymorph Potion, Coronation Oil), bag of 2', () => { assert.deepStrictEqual(IT.defs.map(d => d.id), ['undo', 'wild', 'upgrade']); assert.strictEqual(IT.slots, 2); });
test('item rules per mode: Classic earns, Levels fixed, Practice unlimited', () => { assert.deepStrictEqual([Modes.classic.items, Modes.level.items, Modes.practice.items], ['earn', 'fixed', 'free']); });
test('new run: empty bag, 0 energy', () => { const g = newGame(); assert.deepStrictEqual([g.items, g.energy, g.itemsUsed], [[], 0, 0]); });
test('Levels: start with the level items', () => { const g = newGame(); Game.startLevel(g, 7); assert.deepStrictEqual(g.items, ['undo']); });
test('merge points charge energy; full energy gives a random item and spends energy', () => {
  const g = newGame(); g.energy = IT.energyCost - 40; g.phase = 'flying'; emptyTable(g);
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 300 + 55, 300);                 // knight + knight → bishop, 40 points
  const ev = run(g, 0.1); assert.strictEqual(g.items.length, 1); assert.ok(ev.some(e => e.type === 'itemget' && e.id === g.items[0])); assert.strictEqual(g.energy, 0);
});
test('full bag: no more items, energy holds at full; pays out when a slot frees', () => {
  const g = newGame(); g.items = ['wild', 'undo']; g.energy = IT.energyCost * 3; g.phase = 'flying'; emptyTable(g);
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 355, 300); run(g, 0.1);
  assert.strictEqual(g.items.length, 2); assert.strictEqual(g.energy, IT.energyCost);
  g.world.cups.push(Physics.makeCup(g.world, 0, 0, 100, 800)); Game.useItem(g, 'undo');        // undo has no snapshot → unusable
  assert.strictEqual(g.items.length, 2);
  g.held = g.world.cups.find(c => c.tier === 0); g.held.held = true; g.phase = 'ready';
  Game.useItem(g, 'wild'); assert.strictEqual(g.items.length, 2, 'using one immediately pays out another (energy was full)'); assert.strictEqual(g.energy, 0);
});
test('Practice / Levels do not charge energy', () => { for (const m of ['practice']) { const g = newGame({ mode: m }); g.phase = 'flying'; emptyTable(g); addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 355, 300); run(g, 0.1); assert.strictEqual(g.energy, 0); assert.deepStrictEqual(g.items, []); } });
test('items use their own RNG: spawn order is the same either way', () => {
  const a = newGame({ seed: 9, nKinds: 2 }), b = newGame({ seed: 9, nKinds: 2 }); b.energy = 1e9;
  const seq = (g) => { const o = []; for (let i = 0; i < 12; i++) { o.push(g.mode.pickNext(g)); } return JSON.stringify(o); };
  b.items = []; const ev = []; b.phase = 'flying'; emptyTable(b); addCup(b, 0, 1, 300, 300); addCup(b, 0, 1, 355, 300); run(b, 0.1);
  assert.ok(b.items.length > 0); a.next = b.next; assert.strictEqual(seq(a), seq(b));
});
test('same seed → same item sequence', () => {
  const g1 = newGame({ seed: 5 }), g2 = newGame({ seed: 5 });
  const roll = (g) => { const o = []; for (let i = 0; i < 8; i++) { g.items = ['undo']; g.energy = IT.energyCost; g.snap = { }; g.items = []; g.phase = 'flying'; emptyTable(g); addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 355, 300); run(g, 0.05); o.push(g.items[0]); } return o.join(); };
  assert.strictEqual(roll(g1), roll(g2));
});
test('cannot use items not in the bag, or after the game ends', () => { const g = newGame(); assert.strictEqual(Game.useItem(g, 'undo'), null); giveItem(g, 'wild'); g.phase = 'over'; assert.strictEqual(Game.useItem(g, 'wild'), null); });

test('⬆️ Upgrade: cup in hand +1 tier (same place and creature); unusable at the cap', () => {
  const g = newGame(); giveItem(g, 'upgrade'); const t0 = g.held.tier, k0 = g.held.kind; g.held.tier = 0; const h = g.held; g.world.cups[g.world.cups.indexOf(h)] = Physics.makeCup(g.world, k0, 0, h.x, h.y); g.held = g.world.cups[g.world.cups.length - 1]; g.held.held = true;
  const r0 = g.held.r; Game.useItem(g, 'upgrade'); assert.strictEqual(g.held.tier, 1); assert.ok(g.held.r > r0); assert.ok(g.held.held); assert.strictEqual(g.held.kind, k0); assert.strictEqual(g.world.cups.filter(c => c.held).length, 1);
  giveItem(g, 'upgrade'); g.held.tier = IT.upgradeMax; assert.strictEqual(Game.canUse(g, 'upgrade'), false);
});
test('⬆️ / 🌈 only while waiting to launch (not while cups slide)', () => { const g = newGame(); giveItem(g, 'upgrade'); giveItem(g, 'wild'); g.phase = 'flying'; g.held = null; assert.ok(!Game.canUse(g, 'upgrade')); assert.ok(!Game.canUse(g, 'wild')); });
test('🌈 Wild: merges with any same-tier cup and becomes its creature; different tiers do not merge', () => {
  const g = newGame({ nKinds: 3 }); giveItem(g, 'wild'); emptyTable(g); const h = g.held; h.tier = 1; h.kind = 0; Game.useItem(g, 'wild'); assert.ok(h.wild);
  h.held = false; h.x = 300; h.y = 300; h.r = CONFIG.tiers[1].r; const o = addCup(g, 2, 1, 300 + 55, 300); const far = addCup(g, 1, 3, 100, 100);
  g.held = null; Physics.advance(g.world, 1 / 60);
  const m = g.world.cups.find(c => c.tier === 2); assert.ok(m && m.kind === 2 && !m.wild, 'becomes the other creature and is no longer wild'); assert.ok(g.world.cups.includes(far));
  const g2 = newGame({ nKinds: 2 }); emptyTable(g2); addCup(g2, 0, 1, 300, 300).wild = true; addCup(g2, 1, 2, 355, 300); Physics.advance(g2.world, 1 / 60); assert.strictEqual(g2.world.cups.filter(c => !c.held).length, 2);
});
test('🌈 wild king meets a king → checkmate (other creature)', () => { const g = newGame({ nKinds: 2 }); emptyTable(g); addCup(g, 0, 5, 300, 300).wild = true; addCup(g, 1, 5, 380, 300); Physics.advance(g.world, 1 / 60); const e = g.world.events.find(x => x.type === 'checkmate'); assert.ok(e && e.kind === 1); });
test('⏪ Undo: unusable before a launch; after one → back to before it (cups, score, spawn order)', () => {
  const g = newGame({ seed: 3, nKinds: 2 }); giveItem(g, 'undo'); assert.ok(!Game.canUse(g, 'undo'));
  emptyTable(g); addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 360, 300);        // a pair on the table that can be hit
  const before = JSON.stringify({ cups: g.world.cups.map(c => [c.id, c.kind, c.tier, Math.round(c.x), Math.round(c.y)]), score: g.score, next: g.next, heldKind: g.held.kind, heldTier: g.held.tier });
  const nextRng = g.rng.get();
  fire(g); assert.strictEqual(g.phase, 'flying'); run(g, 6); g.score += 777;
  const ev = Game.useItem(g, 'undo'); assert.ok(ev && ev[0].id === 'undo');
  assert.strictEqual(g.phase, 'ready'); assert.ok(g.held && g.held.held); assert.strictEqual(g.held.x, CONFIG.world.SPAWN.x); assert.strictEqual(g.held.y, CONFIG.world.SPAWN.y);
  const after = JSON.stringify({ cups: g.world.cups.map(c => [c.id, c.kind, c.tier, Math.round(c.x), Math.round(c.y)]), score: g.score, next: g.next, heldKind: g.held.kind, heldTier: g.held.tier });
  assert.strictEqual(after, before); assert.strictEqual(g.rng.get(), nextRng); assert.ok(!Game.canUse(g, 'undo') || g.items.includes('undo') === false);
});
test('⏪ after Undo, replaying gives the identical result (RNG and state restored)', () => {
  const g = newGame({ seed: 8, nKinds: 2 }); giveItem(g, 'undo'); fire(g); run(g, 6); const first = JSON.stringify([g.score, g.world.cups.map(c => [c.kind, c.tier, Math.round(c.x), Math.round(c.y)]), g.next]);
  Game.useItem(g, 'undo'); fire(g); run(g, 6); assert.strictEqual(JSON.stringify([g.score, g.world.cups.map(c => [c.kind, c.tier, Math.round(c.x), Math.round(c.y)]), g.next]), first);
});
test('⏪ Undo cannot repeat, and cannot farm energy from the undone shot', () => {
  const g = newGame({ seed: 4 }); giveItem(g, 'undo'); giveItem(g, 'undo'); fire(g); run(g, 1);
  g.energy += 500; Game.useItem(g, 'undo'); assert.ok(!g.snap); assert.strictEqual(g.energy, 0, 'energy restored to before the shot'); assert.strictEqual(Game.useItem(g, 'undo'), null);
});
test('Practice: all items unlimited, never consumed', () => {
  const g = newGame({ mode: 'practice' }); assert.deepStrictEqual(Game.itemSlots(g), IT.defs.map(d => d.id));
  for (let i = 0; i < 3; i++) { g.held.wild = false; assert.ok(Game.useItem(g, 'wild')); } assert.strictEqual(Game.itemSlots(g).length, 3);
});

console.log('Items and Profile');
test('story: opening card before a chapter\'s first level only, once', () => {
  const p = Profile.fresh(), ch2 = CONFIG.levels.findIndex(L => L.chapter === 2);
  assert.strictEqual(Profile.storyBefore(p, 0), 'ch1.open'); assert.strictEqual(Profile.storyBefore(p, 1), null); assert.strictEqual(Profile.storyBefore(p, ch2), 'ch2.open');
  assert.ok(Profile.readStory(p, 'ch1.open')); assert.ok(!Profile.readStory(p, 'ch1.open')); assert.ok(!Profile.readStory(p, 'ch9.open'));
  assert.strictEqual(Profile.storyBefore(p, 0), null);
});
test('story: closing card after the first clear of a chapter\'s last level', () => {
  const p = Profile.fresh(), last1 = CONFIG.levels.findIndex(L => L.chapter === 2) - 1;
  assert.strictEqual(Profile.storyAfter(p, last1), null);                    // not cleared yet
  Profile.clearLevel(p, last1, 1); assert.strictEqual(Profile.storyAfter(p, last1), 'ch1.close'); assert.strictEqual(Profile.storyAfter(p, 0), null);
  Profile.readStory(p, 'ch1.close'); assert.strictEqual(Profile.storyAfter(p, last1), null);   // replaying the boss does not show it again
});
test('migrate v7 → v8: story list added; unknown ids dropped; idempotent', () => {
  assert.deepStrictEqual(Profile.migrate({ v: 7, cleared: [0] }).story, []);
  const p = Profile.migrate({ v: 8, story: ['ch1.open', 'ch1.open', 'ch99.close', 5] }); assert.deepStrictEqual(p.story, ['ch1.open']);
  assert.deepStrictEqual(Profile.migrate(JSON.parse(JSON.stringify(p))), p);
});
test('Flow: levels → story → brief; result → story → story → brief; story → levels', () => {
  const f = Flow.create('levels'); assert.ok(Flow.send(f, 'story')); assert.ok(!Flow.send(f, 'start')); assert.ok(Flow.send(f, 'brief')); assert.strictEqual(f.state, 'brief');
  const g = Flow.create('result'); assert.ok(Flow.send(g, 'story')); assert.ok(Flow.send(g, 'story')); assert.ok(Flow.send(g, 'levels')); assert.strictEqual(g.state, 'levels');
});
test('Flow: menu ↔ armory screen', () => { const f = Flow.create('menu'); assert.ok(Flow.send(f, 'armory')); assert.strictEqual(f.state, 'armory'); assert.ok(!Flow.send(f, 'start')); assert.ok(Flow.send(f, 'menu')); assert.strictEqual(f.state, 'menu'); });
test('migrate v6 → v7: a packed item is refunded (equipment replaced it); lifetime VP estimated', () => {
  const p = Profile.migrate({ v: 6, vp: 5, carry: 'sweep', unlocked: [0, 1, 2] }); assert.strictEqual(p.vp, 25); assert.strictEqual(p.carry, undefined);
  assert.strictEqual(p.vpEarned, 25 + CONFIG.vp.unlockCost[2]); assert.deepStrictEqual([p.equip, p.worn, p.ack], [{}, [], []]);
  assert.strictEqual(Profile.migrate({ v: 6, carry: 'hax' }).vp, 0);
  const q = Profile.migrate({ v: 7, equip: { grail: 9, nope: 2 }, worn: ['grail', 'coin'], vpEarned: 40 }); assert.deepStrictEqual([q.equip, q.worn, q.vpEarned], [{ grail: 3 }, ['grail'], 40]);
});

console.log('Equipment and unlocks');
const EQC = CONFIG.equip;
test('armory: buy, upgrade to max, costs per level', () => {
  const p = Profile.fresh(0); p.vp = 1000; const d = EQC.defs.find(x => x.id === 'coin');
  for (let l = 0; l < d.cost.length; l++) { assert.strictEqual(Profile.eqNextCost(p, 'coin'), d.cost[l]); assert.ok(Profile.buyEquip(p, 'coin')); }
  assert.strictEqual(p.equip.coin, 3); assert.strictEqual(Profile.eqNextCost(p, 'coin'), null); assert.ok(!Profile.buyEquip(p, 'coin')); assert.strictEqual(p.vp, 1000 - d.cost.reduce((a, b) => a + b, 0));
  const q = Profile.fresh(0); q.vp = 10; assert.ok(!Profile.buyEquip(q, 'coin')); assert.ok(!Profile.buyEquip(q, 'xx'));
});
test('wear: owned only, up to 3, tap again to take off', () => {
  const p = Profile.fresh(0); p.vp = 9999; assert.ok(!Profile.toggleWear(p, 'eye'));
  for (const id of ['eye', 'coin', 'grail', 'hammer']) Profile.buyEquip(p, id);
  assert.ok(Profile.toggleWear(p, 'eye')); assert.ok(Profile.toggleWear(p, 'coin')); assert.ok(Profile.toggleWear(p, 'grail')); assert.ok(!Profile.toggleWear(p, 'hammer'));
  assert.ok(Profile.toggleWear(p, 'coin')); assert.deepStrictEqual(p.worn, ['eye', 'grail']); assert.deepStrictEqual(Profile.wornLevels(p), { eye: 1, grail: 1 });
});
test('equipment effects (Classic only): scale, grail, hammer, sceptre, coin, eye', () => {
  const g = newGame(); const base = Game.dangerTime(g), cum0 = Game.spawnCum(g)[0];
  Game.setEquip(g, { scale: 3, scepter: 1, coin: 2, eye: 3 }); assert.strictEqual(Game.dangerTime(g), base + 1.0);
  assert.ok(Math.abs(Game.spawnCum(g)[0] - (cum0 + 0.08)) < 1e-9); g.score = 5000; g.kings = 1; assert.strictEqual(Game.vp(g).total, Math.round((10 + 10) * 1.35)); assert.ok(Game.assistOn(g));
  const pr = newGame({ mode: 'practice' }); Game.setEquip(pr, { scale: 3 }); assert.strictEqual(Game.eqVal(pr, 'scale'), null);
  const h = newGame(); Game.setEquip(h, { hammer: 1 }); emptyTable(h); h.held = null; h.phase = 'flying'; const pl = { id: 'x', x: 300, y: 200, r: 26, hp: 10, max: 10 }; h.world.pillars.push(pl);
  addCup(h, 0, 0, 255, 300, 500, 0); addCup(h, 0, 0, 345, 300); run(h, 0.4); assert.strictEqual(pl.hp, 10 - 3);
  const gr = newGame(); Game.setKinds(gr, [0, 1]); Game.restart(gr); Game.setEquip(gr, { grail: 1 }); emptyTable(gr); gr.held = null; gr.phase = 'flying'; addCup(gr, 0, 2, 255, 300, 500, 0); addCup(gr, 0, 2, 345, 300); run(gr, 0.3); assert.ok(Math.abs(gr.ult[0] - 3 * CONFIG.ults.perTier * 1.2) < 1e-9);
});
test('progressive unlocks: items after ch1 level 6, ultimates after ch1, armory after 150 VP earned', () => {
  const p = Profile.fresh(0); assert.deepStrictEqual(Profile.features(p), { items: false, ults: false, equip: false });
  for (let i = 0; i <= 5; i++) Profile.clearLevel(p, i, 1); assert.ok(Profile.features(p).items && !Profile.features(p).ults);
  Profile.clearLevel(p, 6, 1); Profile.clearLevel(p, 7, 1); assert.ok(Profile.features(p).ults);
  assert.strictEqual(Profile.features(p).equip, p.vpEarned >= EQC.unlockVP);
  assert.deepStrictEqual(Profile.newFeatures(p).slice(0, 2), ['items', 'ults']); Profile.ackFeature(p, 'items'); assert.ok(!Profile.newFeatures(p).includes('items'));
});
test('locked features stay off in a run: no items earned, no ultimate portraits', () => {
  const g = newGame(); Game.setKinds(g, [0, 1]); Game.restart(g); Game.setFeatures(g, { items: false, ults: false });
  assert.deepStrictEqual(Game.ultKinds(g), []); g.energy = IT.energyCost * 2; g.phase = 'flying'; emptyTable(g); addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 355, 300); run(g, 0.1);
  assert.deepStrictEqual(g.items, []); assert.deepStrictEqual(Game.itemSlots(g), []);
  const L = newGame(); Game.setFeatures(L, { items: false, ults: false }); Game.startLevel(L, 5); assert.deepStrictEqual(Game.itemSlots(L), ['upgrade', 'wild', 'undo'], 'level items are always on');
});
test('best score: runs with items are tracked separately, never overwriting the no-item best', () => {
  const p = Profile.fresh(0), g = newGame(); g.score = 500; Profile.recordBest(p, g); assert.strictEqual(p.best.classic, 500);
  g.itemsUsed = 1; g.score = 9000; assert.ok(Profile.recordBest(p, g)); assert.deepStrictEqual([p.best.classic, p.best.classicItems], [500, 9000]); assert.strictEqual(Profile.bestKey(g), 'classicItems');
  const q = newGame({ mode: 'practice' }); q.itemsUsed = 3; q.score = 1e5; assert.strictEqual(Profile.recordBest(p, q), false);
});

console.log('Rules: difficulty ramp, skill bonuses, checkmate shockwave');
test('ramp: level rises every CONFIG.ramp.every points (classic only), capped', () => {
  const g = newGame(); assert.strictEqual(Game.rampLevel(g), 0); g.score = CONFIG.ramp.every * 2 + 5; assert.strictEqual(Game.rampLevel(g), 2);
  g.score = 1e9; assert.strictEqual(Game.rampLevel(g), CONFIG.ramp.maxLevel);
  const p = newGame({ mode: 'practice' }); p.score = 1e9; assert.strictEqual(Game.rampLevel(p), 0);
});
test('ramp: spawn weights shift toward bigger cups and the lose timer shrinks', () => {
  const g = newGame(); assert.deepStrictEqual(Game.spawnCum(g), CONFIG.nextTierCum); assert.strictEqual(Game.dangerTime(g), CONFIG.rules.DANGER_T);
  g.score = 1e9; assert.deepStrictEqual(Game.spawnCum(g).map(v => +v.toFixed(6)), CONFIG.ramp.cumMax); assert.strictEqual(Game.dangerTime(g), CONFIG.ramp.dangerMin);
  let pawns0 = 0, pawns1 = 0; const a = newGame({ seed: 3 }), b = newGame({ seed: 3 }); b.score = 1e9;
  for (let i = 0; i < 2000; i++) { if (a.mode.pickNext(a).tier === 0) pawns0++; if (b.mode.pickNext(b).tier === 0) pawns1++; }
  assert.ok(pawns1 < pawns0 * 0.85, pawns0 + ' vs ' + pawns1);
});
test('ramp: at max level the game is lost after dangerMin seconds', () => {
  const g = newGame(); g.score = 1e9; g.world.cups.push(Physics.makeCup(g.world, 0, 2, 100, 800));
  run(g, CONFIG.ramp.dangerMin - 0.2); assert.notStrictEqual(g.phase, 'over'); run(g, 0.5); assert.strictEqual(g.phase, 'over');
});
const shoot = (g, cupId, x0, y0) => { g.shot = { id: cupId, x0, y0, walls: 0, done: false }; g.phase = 'flying'; };
test('bank shot: launched cup hits a wall, then merges → +50% of that merge', () => {
  const g = newGame(); emptyTable(g); g.held = null; const c = addCup(g, 0, 1, 540, 300, 1600, 0); addCup(g, 0, 1, 420, 300);
  shoot(g, c.id, 560, 800); const ev = run(g, 1);
  const m = ev.find(e => e.type === 'merge'), b = ev.find(e => e.type === 'bonus' && e.id === 'bank');
  assert.ok(m && b, 'merge + bank bonus'); assert.strictEqual(b.gain, Math.round(m.gain * CONFIG.bonus.bank));
});
test('long shot: first merge far from the launch point → +30%; short merges get nothing', () => {
  const g = newGame(); emptyTable(g); g.held = null; const c = addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 350, 300);
  shoot(g, c.id, 300, 845); const ev = run(g, 0.1); const b = ev.find(e => e.type === 'bonus' && e.id === 'long'); assert.ok(b);
  const h = newGame(); emptyTable(h); h.held = null; const d = addCup(h, 0, 1, 300, 700); addCup(h, 0, 1, 350, 700);
  shoot(h, d.id, 300, 845); assert.ok(!run(h, 0.1).some(e => e.type === 'bonus'));
});
test('bonuses only for the launched cup, and only once per shot', () => {
  const g = newGame(); emptyTable(g); g.held = null; addCup(g, 0, 1, 300, 200); addCup(g, 0, 1, 350, 200);
  shoot(g, 9999, 300, 845); assert.ok(!run(g, 0.1).some(e => e.type === 'bonus' && e.id !== 'double'));
});
test('chain merge (product merges again) is not a double', () => {
  const g = newGame(); emptyTable(g); g.held = null; g.phase = 'flying';
  addCup(g, 0, 0, 300, 300); addCup(g, 0, 0, 330, 300); addCup(g, 0, 1, 330, 300);   // pawns → knight, which overlaps the other knight at once
  const ev = run(g, 0.2); assert.ok(ev.filter(e => e.type === 'merge').length >= 2); assert.ok(!ev.some(e => e.type === 'bonus' && e.id === 'double'));
});
test('checkmate shockwave: nearby cups pushed outward, nearby pawns shattered, far cups untouched', () => {
  const g = newGame({ nKinds: 2 }); emptyTable(g); g.held = null; g.phase = 'flying';
  addCup(g, 0, 5, 300, 400); addCup(g, 0, 5, 380, 400);
  const pawn = addCup(g, 1, 0, 340, 520), mid = addCup(g, 1, 2, 340, 620), far = addCup(g, 1, 2, 60, 60);
  const ev = run(g, 1 / 60);
  assert.ok(ev.some(e => e.type === 'shockwave')); assert.ok(ev.some(e => e.type === 'shatter')); assert.ok(!g.world.cups.includes(pawn));
  assert.ok(mid.vy > 300, 'pushed away (down) vy=' + mid.vy); assert.strictEqual(far.vx, 0);
});
test('no crowding rule: a full table keeps every cup (removed in 10.7.2 for difficulty)', () => {
  const g = newGame(); emptyTable(g); g.held = null; g.phase = 'flying';
  for (let i = 0; i < 30; i++) addCup(g, 0, i % 3 === 0 ? 0 : 3, 40 + (i % 6) * 100, 60 + Math.floor(i / 6) * 110);
  const before = g.world.cups.length; const ev = run(g, 0.5);
  assert.ok(!ev.some(e => e.type === 'crowd')); assert.ok(g.world.cups.length >= before - 2, 'only merges may remove cups');
});

console.log('Cluster merge (3+ at once)');
const clusterSetup = (extra) => { const g = newGame(); emptyTable(g); g.held = null; g.phase = 'flying'; g.shotMerges = 0;
  const a = addCup(g, 0, 0, 200, 300, 500, 0), b = addCup(g, 0, 0, 290, 300); extra(g); return { g, a, b }; };
test('cluster reach: a matching cup with a gap under cluster.touch joins; beyond it, it does not', () => {
  const T = CONFIG.cluster.touch, r = CONFIG.tiers[0].r;
  const near = clusterSetup(g => addCup(g, 0, 0, 290 + 2 * r + T - 6, 300)), far = clusterSetup(g => addCup(g, 0, 0, 290 + 2 * r + T + 30, 300));
  assert.strictEqual(run(near.g, 0.6).filter(e => e.type === 'merge')[0].n, 3); assert.strictEqual(run(far.g, 0.6).filter(e => e.type === 'merge')[0].n, 2);
});
test('chapter 1 levels each have coach hints with a start hint; demo levels use a known demo', () => {
  for (const l of LV.filter(l => l.chapter === 1)) { assert.ok(l.hints && l.hints.some(h => h[0] === 'start'), l.id); if (l.demo) assert.ok(['aim', 'bank'].includes(l.demo), l.id); }
});
test('a third matching cup touching the pair is absorbed: one merge, n=3, score ×3', () => {
  const { g } = clusterSetup(g => addCup(g, 0, 0, 290 + 46, 300));
  const ev = run(g, 0.6).filter(e => e.type === 'merge'); assert.strictEqual(ev.length, 1); assert.strictEqual(ev[0].n, 3);
  assert.strictEqual(ev[0].gain, CONFIG.scoring.base * 2 * 3); assert.deepStrictEqual(g.world.cups.filter(c => !c.held).map(c => c.tier), [1]);
});
test('chained touching cups all join (4 in a row)', () => {
  const { g } = clusterSetup(g => { addCup(g, 0, 0, 336, 300); addCup(g, 0, 0, 382, 300); });
  const ev = run(g, 0.6).filter(e => e.type === 'merge'); assert.strictEqual(ev[0].n, 4); assert.strictEqual(g.world.cups.filter(c => !c.held).length, 1);
});
test('a matching cup that is not touching stays out (plain pair merge)', () => {
  const { g } = clusterSetup(g => addCup(g, 0, 0, 450, 300));
  const ev = run(g, 0.3).filter(e => e.type === 'merge'); assert.strictEqual(ev[0].n, 2); assert.strictEqual(ev[0].gain, CONFIG.scoring.base * 2);
});
test('a different creature or tier touching the pair is not absorbed', () => {
  const { g } = clusterSetup(g => { addCup(g, 1, 0, 336, 300); addCup(g, 0, 1, 290, 300 + 22 + 28 + 2); });
  const ev = run(g, 0.3).filter(e => e.type === 'merge'); assert.strictEqual(ev[0].n, 2);
});
test('a Wild cup touching the pair is absorbed', () => {
  const { g } = clusterSetup(g => { addCup(g, 2, 0, 336, 300).wild = true; });
  const ev = run(g, 0.6).filter(e => e.type === 'merge'); assert.strictEqual(ev[0].n, 3); assert.strictEqual(ev[0].kind, 0);
});

console.log('Rune pillars (Classic)');
const PLC = CONFIG.pillars;
const pillarGame = (score) => { const g = newGame(); emptyTable(g); g.score = score; g.rampLv = Game.rampLevel(g); g.held = null; g.world.cups = []; g.phase = 'flying'; return g; };
const addPillar = (g, x, y, hp) => { const p = { id: 'p' + (g.world.nextId++), x, y, r: PLC.r, hp: hp || PLC.hp }; g.world.pillars.push(p); return p; };
test('no pillars at pressure 0; pressure 2 → 1 pillar, pressure 4 → 2 (placed between shots)', () => {
  let g = pillarGame(0); run(g, 1); assert.strictEqual(g.world.pillars.length, 0);
  g = pillarGame(CONFIG.ramp.every * 2); run(g, 1); assert.strictEqual(g.world.pillars.length, 1);
  g = pillarGame(CONFIG.ramp.every * 4); run(g, 1); assert.strictEqual(g.world.pillars.length, 2);
  const [a, b] = g.world.pillars; assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= PLC.gapPillar); assert.ok(a.y < CONFIG.world.LINE_Y - 100);
});
test('pillars only in Classic (not Practice or Levels)', () => {
  const g = newGame({ mode: 'practice' }); emptyTable(g); g.score = CONFIG.ramp.every * 4; g.held = null; g.world.cups = []; g.phase = 'flying'; run(g, 1); assert.strictEqual(g.world.pillars.length, 0);
});
test('a cup bounces off a pillar and it counts as a wall hit', () => {
  const g = pillarGame(0); addPillar(g, 300, 300); const c = addCup(g, 0, 0, 300, 500, 0, -900);
  const ev = run(g, 0.5); assert.ok(c.vy > 0 || c.y > 330, 'bounced back'); assert.ok(ev.some(e => e.type === 'wall' && e.id === c.id));
});
test('predicted aim path bounces off pillars', () => {
  const c = { x: 300, y: 600, r: 22, fric: 1, bounce: 1 }; const pts = SC.Physics.predictPath(c, { vx: 0, vy: -1500 }, [{ x: 300, y: 300, r: PLC.r }]);
  assert.ok(pts.bounces.length >= 1); assert.ok(pts[pts.length - 1].y > 300);
});
test('merge blast: knight 2 hp in range, nothing out of range; cluster × (n−1)', () => {
  let g = pillarGame(0); const near = addPillar(g, 300, 200), far = addPillar(g, 300, 650);
  addCup(g, 0, 0, 255, 300, 500, 0); addCup(g, 0, 0, 345, 300); run(g, 0.4);
  assert.strictEqual(near.hp, PLC.hp - 2); assert.strictEqual(far.hp, PLC.hp);
  g = pillarGame(0); const p = addPillar(g, 290, 220);
  addCup(g, 0, 0, 200, 300, 500, 0); addCup(g, 0, 0, 290, 300); addCup(g, 0, 0, 336, 300); run(g, 0.5);
  assert.strictEqual(p.hp, PLC.hp - 2 * 2);
});
test('checkmate breaks a pillar: bonus, removed, replaced after the respawn wait', () => {
  const g = pillarGame(0); const p = addPillar(g, 300, 150); const top = CONFIG.tiers.length - 1;
  addCup(g, 0, top, 150, 300, 600, 0); addCup(g, 0, top, 320, 300);
  const ev = run(g, 0.4); assert.ok(ev.some(e => e.type === 'pillarbreak')); assert.ok(ev.some(e => e.type === 'bonus' && e.id === 'pillar' && e.gain === PLC.breakBonus));
  assert.ok(!g.world.pillars.includes(p)); assert.strictEqual(g.pillarWait <= PLC.respawnShots, true);
});
test('Undo restores pillars and their hp', () => {
  const g = newGame({ mode: 'practice' }); emptyTable(g); const p = addPillar(g, 300, 300, 7);
  g.drag = { id: 1, ox: 0, oy: 0, hist: [{ t: 0, x: 300, y: 845 }] }; Game.dragTo(g, 300, 600, 1, 30);
  g.world.pillars = []; assert.ok(Game.useItem(g, 'undo')); assert.deepStrictEqual(g.world.pillars.map(q => [q.x, q.y, q.hp]), [[300, 300, 7]]);
});

console.log('Codex (seen forms)');
test('fresh profile has seen the starting pawns only', () => { const p = Profile.fresh(0); assert.deepStrictEqual(p.seen.slice(0, 3), [0, 0, -1]); assert.strictEqual(Profile.discovered(p), 2); });
test('see records only new higher forms', () => { const p = Profile.fresh(0); assert.ok(Profile.see(p, 0, 2)); assert.ok(!Profile.see(p, 0, 1)); assert.ok(!Profile.see(p, 0, 2)); assert.strictEqual(p.seen[0], 2); assert.strictEqual(Profile.discovered(p), 4); assert.ok(!Profile.see(p, 99, 1)); });
test('migrate v4 → v5: unlocked creatures start with their pawn; bad seen values clamped', () => {
  const p = Profile.migrate({ v: 4, unlocked: [0, 1, 2] }); assert.strictEqual(p.v, Profile.VERSION); assert.deepStrictEqual(p.seen.slice(0, 4), [0, 0, 0, -1]);
  const q = Profile.migrate({ v: 5, unlocked: [0, 1], seen: [9, 'x', 3, -7] }); assert.deepStrictEqual(q.seen.slice(0, 4), [CONFIG.tiers.length - 1, 0, 3, -1]);
});
test('buying a creature reveals its pawn', () => { const p = Profile.fresh(0); p.vp = 1e6; assert.ok(Profile.buy(p, 2)); assert.strictEqual(p.seen[2], 0); });
test('Flow: creatures ↔ codex', () => { const f = Flow.create('menu'); Flow.send(f, 'kinds'); assert.ok(Flow.send(f, 'codex')); assert.strictEqual(f.state, 'codex'); assert.ok(Flow.send(f, 'kinds')); assert.strictEqual(f.state, 'kinds'); });

console.log('Backup codes');
test('export → import round-trips the whole profile', () => {
  const p = Profile.fresh(0); p.vp = 321; p.best.classic = 9876; p.unlocked = [0, 1, 2, 3]; p.active = [0, 2]; p.cleared = [0, 1]; p.lang = 'zh'; p.carry = 'undo';
  const code = Profile.exportCode(p); assert.match(code, /^SC1\.[A-Za-z0-9_-]+\.[0-9a-z]+$/);
  const r = Profile.importCode(code); assert.ok(r.ok); assert.deepStrictEqual(r.profile, Profile.migrate(JSON.parse(JSON.stringify(p))));
});
test('import tolerates spaces and line breaks from pasting', () => { const code = Profile.exportCode(Profile.fresh(5)); const messy = '  ' + code.slice(0, 10) + '\n ' + code.slice(10) + '\n'; assert.ok(Profile.importCode(messy).ok); });
test('import rejects empty, junk and tampered codes', () => {
  assert.strictEqual(Profile.importCode('').error, 'empty'); assert.strictEqual(Profile.importCode('hello').error, 'format');
  const code = Profile.exportCode(Profile.fresh(0)); const parts = code.split('.');
  const tampered = parts[0] + '.' + parts[1].slice(0, -2) + (parts[1].slice(-2) === 'AA' ? 'BB' : 'AA') + '.' + parts[2];
  assert.ok(['checksum', 'format'].includes(Profile.importCode(tampered).error));
  assert.strictEqual(Profile.importCode(code.slice(0, -1) + (code.slice(-1) === '0' ? '1' : '0')).error, 'checksum');
});
test('imported data is sanitised by migrate (bad values repaired)', () => {
  const json = JSON.stringify({ v: 2, vp: -5, unlocked: [0, 1, 1, 9], active: [7] });
  let h = 2166136261; for (let i = 0; i < json.length; i++) { h ^= json.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const code = 'SC1.' + btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '.' + h.toString(36);
  const r = Profile.importCode(code); assert.ok(r.ok); assert.deepStrictEqual([r.profile.vp, r.profile.unlocked, r.profile.active], [0, [0, 1], [0]]);
});
test('Flow: menu → settings → backup → settings → menu', () => { const f = Flow.create('menu'); assert.ok(!Flow.send(f, 'backup')); assert.ok(Flow.send(f, 'settings')); assert.ok(Flow.send(f, 'backup')); assert.strictEqual(f.state, 'backup'); assert.ok(!Flow.send(f, 'start')); assert.ok(Flow.send(f, 'settings')); assert.ok(Flow.send(f, 'menu')); });

console.log('Screen flow (Flow)');
test('levels menu: menu → levels → briefing → start; cleared → result → next briefing', () => {
  const f = Flow.create('menu'); assert.ok(Flow.send(f, 'levels')); assert.ok(!Flow.send(f, 'start')); Flow.send(f, 'brief'); assert.strictEqual(f.state, 'brief');
  Flow.send(f, 'start'); assert.strictEqual(f.state, 'playing');
  Flow.send(f, 'clear'); assert.strictEqual(f.state, 'result'); assert.ok(Flow.send(f, 'brief')); assert.ok(Flow.send(f, 'levels'));
});
test('menu ↔ creatures screen', () => { const f = Flow.create('menu'); Flow.send(f, 'kinds'); assert.strictEqual(f.state, 'kinds'); assert.strictEqual(Flow.send(f, 'start'), false); Flow.send(f, 'menu'); assert.strictEqual(f.state, 'menu'); });
test('starts at the title screen; enter → menu; start → playing', () => { const f = Flow.create(); assert.strictEqual(f.state, 'title'); assert.ok(!Flow.send(f, 'start')); assert.ok(Flow.send(f, 'enter')); assert.strictEqual(f.state, 'menu'); assert.ok(Flow.send(f, 'start')); assert.strictEqual(f.state, 'playing'); });
test('pause ↔ resume', () => { const f = Flow.create('menu'); Flow.send(f, 'start'); Flow.send(f, 'pause'); assert.strictEqual(f.state, 'paused'); Flow.send(f, 'resume'); assert.strictEqual(f.state, 'playing'); });
test('game over → result → play again / menu', () => {
  const f = Flow.create('menu'); Flow.send(f, 'start'); Flow.send(f, 'gameover'); assert.strictEqual(f.state, 'result');
  Flow.send(f, 'restart'); assert.strictEqual(f.state, 'playing'); Flow.send(f, 'gameover'); Flow.send(f, 'menu'); assert.strictEqual(f.state, 'menu');
});
test('illegal transitions are ignored (no pause from menu, no game over while paused)', () => {
  const f = Flow.create('menu'); assert.strictEqual(Flow.send(f, 'pause'), false); assert.strictEqual(f.state, 'menu');
  Flow.send(f, 'start'); Flow.send(f, 'pause'); assert.strictEqual(Flow.send(f, 'gameover'), false); assert.strictEqual(f.state, 'paused');
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
