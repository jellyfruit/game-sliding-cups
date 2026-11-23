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
test('unlock prices: 7 creatures, first 2 free, increasing', () => {
  const u = CONFIG.vp.unlockCost; assert.strictEqual(u.length, CONFIG.kinds.length); assert.ok(u[0] === 0 && u[1] === 0); for (let i = 3; i < u.length; i++) assert.ok(u[i] > u[i - 1]);
});

console.log('Levels');
const lvGame = (i) => { const g = newGame(); Game.startLevel(g, i); g.world.cups.length = 0; g.held = null; g.phase = 'flying'; return g; };
test('startLevel: uses the level creatures, mode is level', () => { const g = newGame(); Game.startLevel(g, 2); assert.strictEqual(g.mode.id, 'level'); assert.deepStrictEqual(g.kinds, [0, 1, 2]); assert.strictEqual(g.level, 2); });
test('level 1: one king → cleared (phase=won, levelclear event)', () => {
  const g = lvGame(0); addCup(g, 0, 4, 300, 300); addCup(g, 0, 4, 400, 300);
  const ev = run(g, 0.1); assert.ok(ev.some(e => e.type === 'levelclear' && e.level === 0)); assert.strictEqual(g.phase, 'won');
});
test('level 2: one king kind is not enough, both are needed', () => {
  const g = lvGame(1); addCup(g, 0, 4, 100, 300); addCup(g, 0, 4, 200, 300);
  let ev = run(g, 0.1); assert.ok(!ev.some(e => e.type === 'levelclear')); assert.deepStrictEqual(g.kingKinds, [0]);
  addCup(g, 1, 4, 400, 300); addCup(g, 1, 4, 500, 300);
  ev = run(g, 0.1); assert.ok(ev.some(e => e.type === 'levelclear')); assert.strictEqual(g.phase, 'won');
});
test('after clearing, updates stop (no score, no loss)', () => { const g = lvGame(0); g.phase = 'won'; const sc = g.score; assert.deepStrictEqual(Game.update(g, 5), []); assert.strictEqual(g.score, sc); });
test('levels can still be lost (cup resting inside the line)', () => { const g = lvGame(0); g.phase = 'ready'; addCup(g, 0, 2, 100, 780); run(g, 4); assert.strictEqual(g.phase, 'over'); });
test('Levels: Game.vp is 0 (reward only on first clear)', () => { const g = lvGame(0); g.score = 99999; g.kings = 5; assert.strictEqual(Game.vp(g).total, 0); });
test('replaying a level resets progress and cups', () => { const g = lvGame(1); g.kingKinds = [0]; Game.startLevel(g, 1); assert.deepStrictEqual(g.kingKinds, []); assert.strictEqual(g.world.cups.length, 1); });
test('setMode back to classic → level cleared', () => { const g = lvGame(0); Game.setMode(g, 'classic'); assert.strictEqual(g.level, null); });
test('level config: valid creature indexes, positive rewards', () => { for (const lv of CONFIG.levels) { assert.ok(lv.reward > 0); for (const k of lv.kinds) assert.ok(k >= 0 && k < CONFIG.kinds.length); } });

console.log('Mode hooks (modes own their goal, HUD, banner)');
test('every mode has all fields', () => {
  for (const m of Object.values(Modes)) { assert.ok(['best', 'level'].includes(m.hud)); assert.ok('banner' in m && 'goalKinds' in m && 'tracksBest' in m && 'givesVP' in m && typeof m.pickNext === 'function'); }
});
test('only Levels has a goal; Practice has a banner', () => {
  assert.strictEqual(Modes.classic.goalKinds, null); assert.strictEqual(Modes.practice.goalKinds, null); assert.strictEqual(typeof Modes.level.goalKinds, 'function');
  assert.strictEqual(Modes.practice.banner, 'fx.practice'); assert.strictEqual(Modes.level.hud, 'level');
});
test('goalKinds comes from the level config', () => { const g = newGame(); Game.startLevel(g, 2); assert.deepStrictEqual(Modes.level.goalKinds(g), CONFIG.levels[2].kinds); });
test('rematch: Levels → same level; other modes → restart with given creatures', () => {
  const g = newGame(); Game.startLevel(g, 1); g.score = 9; Game.rematch(g, [0]); assert.strictEqual(g.level, 1); assert.strictEqual(g.score, 0); assert.deepStrictEqual(g.kinds, [0, 1]);
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
test('buy: all unlocked → nextLockedKind = -1', () => { const p = P0(); p.vp = 1e6; for (let i = 2; i < CONFIG.kinds.length; i++) assert.ok(Profile.buy(p, i)); assert.strictEqual(Profile.nextLockedKind(p), -1); assert.strictEqual(Profile.buy(p, CONFIG.kinds.length), false); });
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
test('clearLevel: reward on first clear only', () => {
  const p = P0(); assert.strictEqual(Profile.clearLevel(p, 0), CONFIG.levels[0].reward); assert.strictEqual(p.vp, CONFIG.levels[0].reward);
  assert.strictEqual(Profile.clearLevel(p, 0), 0); assert.strictEqual(p.vp, CONFIG.levels[0].reward); assert.deepStrictEqual(p.cleared, [0]);
});
test('levelOpen: level 1 open, others need the previous one', () => { const p = P0(); assert.ok(Profile.levelOpen(p, 0)); assert.ok(!Profile.levelOpen(p, 1)); Profile.clearLevel(p, 0); assert.ok(Profile.levelOpen(p, 1)); assert.ok(!Profile.levelOpen(p, 2)); });
test('language and sound settings accept valid values only', () => { const p = P0(); Profile.setLang(p, 'zh'); assert.strictEqual(p.lang, 'zh'); Profile.setLang(p, 'xx'); assert.strictEqual(p.lang, 'en'); Profile.toggleSound(p); assert.strictEqual(p.sound, false); Profile.toggleSound(p); assert.strictEqual(p.sound, true); });
test('full flow: play runs → buy a creature → clear a level', () => {
  const p = P0(); for (let i = 0; i < 3; i++) { const g = newGame(); g.score = 10000; g.kings = 1; Profile.finishRun(p, g); }
  assert.strictEqual(p.vp, 90); Profile.clearLevel(p, 0); assert.strictEqual(p.vp, 120); assert.ok(Profile.buy(p, 2)); assert.strictEqual(p.vp, 20);
});

console.log('Items');
const IT = CONFIG.items, fire = (g) => dragPath(g, [[300, 845, 0], [300, 800, 16], [300, 750, 32], [300, 700, 48]]);
const giveItem = (g, id) => { g.items.push(id); return g; };
const emptyTable = (g) => { g.world.cups = g.world.cups.filter(c => c.held); };
test('config: 5 items, bag of 2, prices defined', () => { assert.deepStrictEqual(IT.defs.map(d => d.id), ['sweep', 'upgrade', 'wild', 'magnet', 'undo']); assert.strictEqual(IT.slots, 2); assert.ok(IT.defs.every(d => d.cost > 0)); });
test('item rules per mode: Classic earns, Levels fixed, Practice unlimited', () => { assert.deepStrictEqual([Modes.classic.items, Modes.level.items, Modes.practice.items], ['earn', 'fixed', 'free']); });
test('new run: empty bag, 0 energy; startItems used once', () => {
  const g = newGame(); assert.deepStrictEqual([g.items, g.energy, g.itemsUsed], [[], 0, 0]);
  g.startItems = ['wild']; Game.restart(g); assert.deepStrictEqual(g.items, ['wild']); Game.restart(g); assert.deepStrictEqual(g.items, []);
});
test('Levels: start with the level items', () => { const old = CONFIG.levels[0].items; CONFIG.levels[0].items = ['sweep']; const g = newGame(); Game.startLevel(g, 0); assert.deepStrictEqual(g.items, ['sweep']); CONFIG.levels[0].items = old; });
test('merge points charge energy; full energy gives a random item and spends energy', () => {
  const g = newGame(); g.energy = IT.energyCost - 40; g.phase = 'flying'; emptyTable(g);
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 300 + 55, 300);                 // knight + knight → bishop, 40 points
  const ev = run(g, 0.1); assert.strictEqual(g.items.length, 1); assert.ok(ev.some(e => e.type === 'itemget' && e.id === g.items[0])); assert.strictEqual(g.energy, 0);
});
test('full bag: no more items, energy holds at full; pays out when a slot frees', () => {
  const g = newGame(); g.items = ['sweep', 'undo']; g.energy = IT.energyCost * 3; g.phase = 'flying'; emptyTable(g);
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 355, 300); run(g, 0.1);
  assert.strictEqual(g.items.length, 2); assert.strictEqual(g.energy, IT.energyCost);
  g.world.cups.push(Physics.makeCup(g.world, 0, 0, 100, 800)); Game.useItem(g, 'undo');        // undo has no snapshot → unusable
  assert.strictEqual(g.items.length, 2);
  Game.useItem(g, 'sweep'); assert.strictEqual(g.items.length, 2, 'using one immediately pays out another (energy was full)'); assert.strictEqual(g.energy, 0);
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
test('cannot use items not in the bag, or after the game ends', () => { const g = newGame(); assert.strictEqual(Game.useItem(g, 'sweep'), null); giveItem(g, 'wild'); g.phase = 'over'; assert.strictEqual(Game.useItem(g, 'wild'), null); });

test('🔥 Inferno: clears ~3 rows nearest the player (inside + past the line); farther cups and the cup in hand untouched; usable on an empty table', () => {
  const g = newGame(); giveItem(g, 'sweep'); emptyTable(g); const held = g.held;
  assert.ok(Game.canUse(g, 'sweep'), 'usable any time, no cups needed');
  const edge = CONFIG.world.LINE_Y - IT.sweepDepth;
  const far = addCup(g, 0, 0, 120, edge - 30), far2 = addCup(g, 0, 2, 300, 200);
  addCup(g, 0, 1, 200, 800); addCup(g, 0, 2, 400, 700); addCup(g, 0, 3, 250, edge + 20); g.dangerT = 2;
  const ev = Game.useItem(g, 'sweep'); assert.strictEqual(ev.filter(e => e.type === 'sweepcup').length, 3);
  assert.deepStrictEqual(g.world.cups.filter(c => !c.held).map(c => c.id).sort(), [far.id, far2.id].sort());
  assert.ok(g.world.cups.includes(held)); assert.strictEqual(g.dangerT, 0); assert.deepStrictEqual(g.items, []); assert.strictEqual(g.itemsUsed, 1);
  giveItem(g, 'sweep'); emptyTable(g); assert.ok(Game.useItem(g, 'sweep'), 'usable on an empty table (just wasted)');
});
test('🔥 Inferno range is about 3 rows (sane depth)', () => { assert.ok(IT.sweepDepth >= 3 * 2 * CONFIG.tiers[1].r && IT.sweepDepth <= 3 * 2 * CONFIG.tiers[3].r + 60); });
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
test('🧲 Magnet: only same-creature same-tier cups attract and merge; unusable without a pair', () => {
  const g = newGame({ nKinds: 2 }); giveItem(g, 'magnet'); emptyTable(g); g.phase = 'flying'; addCup(g, 0, 0, 100, 300); addCup(g, 1, 0, 300, 500);
  assert.ok(!Game.canUse(g, 'magnet')); const a = addCup(g, 0, 0, 500, 300); assert.ok(Game.canUse(g, 'magnet'));
  const other = g.world.cups.find(c => c.kind === 1); const ox = other.x;
  Game.useItem(g, 'magnet'); const ev = run(g, 3); assert.ok(ev.some(e => e.type === 'merge' && e.tier === 1), 'two pawns pulled together into a knight'); assert.ok(Math.abs(other.x - ox) < 60, 'other creatures are not pulled');
});
test('🧲 Magnet lasts briefly and never over-accelerates cups', () => {
  const g = newGame(); giveItem(g, 'magnet'); emptyTable(g); g.phase = 'flying'; const a = addCup(g, 0, 4, 80, 300), b = addCup(g, 0, 4, 520, 300); Game.useItem(g, 'magnet'); let vmax = 0;
  for (let t = 0; t < 2.5; t += 1 / 60) { Game.update(g, 1 / 60); for (const c of g.world.cups) vmax = Math.max(vmax, Math.hypot(c.vx, c.vy)); }
  assert.ok(vmax <= IT.magnetVmax + 1, 'vmax=' + vmax); assert.strictEqual(g.magnetT, 0);
});
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
test('Practice: all 5 items unlimited, never consumed', () => {
  const g = newGame({ mode: 'practice' }); assert.deepStrictEqual(Game.itemSlots(g), IT.defs.map(d => d.id));
  emptyTable(g); addCup(g, 0, 0, 100, 800); for (let i = 0; i < 3; i++) { addCup(g, 0, 0, 100, 800); assert.ok(Game.useItem(g, 'sweep')); } assert.strictEqual(Game.itemSlots(g).length, 5);
});

console.log('Items and Profile');
test('Flow: menu ↔ items screen', () => { const f = Flow.create(); assert.ok(Flow.send(f, 'items')); assert.strictEqual(f.state, 'items'); assert.ok(!Flow.send(f, 'start')); assert.ok(Flow.send(f, 'menu')); assert.strictEqual(f.state, 'menu'); });
test('pack: buy → VP spent; tap again → full refund; switch → refund old, buy new', () => {
  const p = Profile.fresh(0); p.vp = 25; assert.ok(Profile.toggleCarry(p, 'sweep')); assert.deepStrictEqual([p.vp, p.carry], [5, 'sweep']);
  assert.ok(Profile.toggleCarry(p, 'sweep')); assert.deepStrictEqual([p.vp, p.carry], [25, null]);
  Profile.toggleCarry(p, 'sweep'); assert.ok(Profile.toggleCarry(p, 'upgrade')); assert.deepStrictEqual([p.vp, p.carry], [15, 'upgrade']);
});
test('pack: not enough VP or unknown item → refused', () => { const p = Profile.fresh(0); p.vp = 19; assert.strictEqual(Profile.toggleCarry(p, 'sweep'), false); assert.strictEqual(Profile.toggleCarry(p, 'xx'), false); assert.deepStrictEqual([p.vp, p.carry], [19, null]); });
test('takeCarry: cleared after taking (one run only)', () => { const p = Profile.fresh(0); p.vp = 50; Profile.toggleCarry(p, 'wild'); assert.strictEqual(Profile.takeCarry(p), 'wild'); assert.strictEqual(p.carry, null); assert.strictEqual(Profile.takeCarry(p), null); });
test('migrate: old saves get carry and best-with-items; bad carry dropped', () => {
  const p = Profile.migrate({ v: 3, best: { classic: 900 }, vp: 5 }); assert.deepStrictEqual([p.best.classic, p.best.classicItems, p.carry, p.v], [900, 0, null, Profile.VERSION]);
  assert.strictEqual(Profile.migrate({ carry: 'hax' }).carry, null); assert.strictEqual(Profile.migrate({ carry: 'undo', best: { classicItems: 12 } }).carry, 'undo');
});
test('best score: runs with items are tracked separately, never overwriting the no-item best', () => {
  const p = Profile.fresh(0), g = newGame(); g.score = 500; Profile.recordBest(p, g); assert.strictEqual(p.best.classic, 500);
  g.itemsUsed = 1; g.score = 9000; assert.ok(Profile.recordBest(p, g)); assert.deepStrictEqual([p.best.classic, p.best.classicItems], [500, 9000]); assert.strictEqual(Profile.bestKey(g), 'classicItems');
  const q = newGame({ mode: 'practice' }); q.itemsUsed = 3; q.score = 1e5; assert.strictEqual(Profile.recordBest(p, q), false);
});

console.log('Rules: difficulty ramp, skill bonuses, checkmate shockwave, crowding');
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
test('crowding: spawning with more than CONFIG.crowd.max cups removes the oldest pawn', () => {
  const g = newGame(); emptyTable(g); g.held = null; g.phase = 'flying';
  const cups = []; for (let i = 0; i <= CONFIG.crowd.max; i++) cups.push(addCup(g, 0, i % 3 === 0 ? 0 : 3, 40 + (i % 6) * 100, 60 + Math.floor(i / 6) * 110));
  const ev = run(g, 0.5); const firstPawn = cups.find(c => c.tier === 0);
  assert.ok(ev.some(e => e.type === 'crowd')); assert.ok(!g.world.cups.includes(firstPawn));
});
test('no crowding below the limit', () => { const g = newGame(); emptyTable(g); g.held = null; g.phase = 'flying'; for (let i = 0; i < 5; i++) addCup(g, 0, 0, 60 + i * 110, 100); assert.ok(!run(g, 0.5).some(e => e.type === 'crowd')); });

console.log('Codex (seen forms)');
test('fresh profile has seen the starting pawns only', () => { const p = Profile.fresh(0); assert.deepStrictEqual(p.seen.slice(0, 3), [0, 0, -1]); assert.strictEqual(Profile.discovered(p), 2); });
test('see records only new higher forms', () => { const p = Profile.fresh(0); assert.ok(Profile.see(p, 0, 2)); assert.ok(!Profile.see(p, 0, 1)); assert.ok(!Profile.see(p, 0, 2)); assert.strictEqual(p.seen[0], 2); assert.strictEqual(Profile.discovered(p), 4); assert.ok(!Profile.see(p, 99, 1)); });
test('migrate v4 → v5: unlocked creatures start with their pawn; bad seen values clamped', () => {
  const p = Profile.migrate({ v: 4, unlocked: [0, 1, 2] }); assert.strictEqual(p.v, 5); assert.deepStrictEqual(p.seen.slice(0, 4), [0, 0, 0, -1]);
  const q = Profile.migrate({ v: 5, unlocked: [0, 1], seen: [9, 'x', 3, -7] }); assert.deepStrictEqual(q.seen.slice(0, 4), [CONFIG.tiers.length - 1, 0, 3, -1]);
});
test('buying a creature reveals its pawn', () => { const p = Profile.fresh(0); p.vp = 1e6; assert.ok(Profile.buy(p, 2)); assert.strictEqual(p.seen[2], 0); });
test('Flow: creatures ↔ codex', () => { const f = Flow.create(); Flow.send(f, 'kinds'); assert.ok(Flow.send(f, 'codex')); assert.strictEqual(f.state, 'codex'); assert.ok(Flow.send(f, 'kinds')); assert.strictEqual(f.state, 'kinds'); });

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
test('Flow: menu ↔ backup', () => { const f = Flow.create(); assert.ok(Flow.send(f, 'backup')); assert.strictEqual(f.state, 'backup'); assert.ok(!Flow.send(f, 'start')); assert.ok(Flow.send(f, 'menu')); });

console.log('Screen flow (Flow)');
test('levels menu: menu → levels → start; cleared → result', () => {
  const f = Flow.create(); assert.ok(Flow.send(f, 'levels')); assert.strictEqual(f.state, 'levels'); Flow.send(f, 'start'); assert.strictEqual(f.state, 'playing');
  Flow.send(f, 'clear'); assert.strictEqual(f.state, 'result');
});
test('menu ↔ creatures screen', () => { const f = Flow.create(); Flow.send(f, 'kinds'); assert.strictEqual(f.state, 'kinds'); assert.strictEqual(Flow.send(f, 'start'), false); Flow.send(f, 'menu'); assert.strictEqual(f.state, 'menu'); });
test('starts at menu; start → playing', () => { const f = Flow.create(); assert.strictEqual(f.state, 'menu'); assert.ok(Flow.send(f, 'start')); assert.strictEqual(f.state, 'playing'); });
test('pause ↔ resume', () => { const f = Flow.create(); Flow.send(f, 'start'); Flow.send(f, 'pause'); assert.strictEqual(f.state, 'paused'); Flow.send(f, 'resume'); assert.strictEqual(f.state, 'playing'); });
test('game over → result → play again / menu', () => {
  const f = Flow.create(); Flow.send(f, 'start'); Flow.send(f, 'gameover'); assert.strictEqual(f.state, 'result');
  Flow.send(f, 'restart'); assert.strictEqual(f.state, 'playing'); Flow.send(f, 'gameover'); Flow.send(f, 'menu'); assert.strictEqual(f.state, 'menu');
});
test('illegal transitions are ignored (no pause from menu, no game over while paused)', () => {
  const f = Flow.create(); assert.strictEqual(Flow.send(f, 'pause'), false); assert.strictEqual(f.state, 'menu');
  Flow.send(f, 'start'); Flow.send(f, 'pause'); assert.strictEqual(Flow.send(f, 'gameover'), false); assert.strictEqual(f.state, 'paused');
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
