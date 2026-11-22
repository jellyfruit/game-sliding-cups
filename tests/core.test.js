// 核心邏輯的自動測試（不需要瀏覽器、不需要任何套件）。執行：node tests/core.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.slice(html.indexOf('/*#core-start*/'), html.indexOf('/*#core-end*/'));
const SC = new Function(code + '\nreturn SC;')();
const { CONFIG, Physics, Game, Flow, makeRng } = SC;
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };

const newGame = (o) => Game.create(Object.assign({ seed: 1 }, o || {}));
const addCup = (g, kind, tier, x, y, vx = 0, vy = 0) => { const c = Physics.makeCup(g.world, kind, tier, x, y); c.vx = vx; c.vy = vy; g.world.cups.push(c); return c; };
const run = (g, sec, dt = 1 / 60) => { const ev = []; for (let t = 0; t < sec; t += dt) ev.push(...Game.update(g, dt)); return ev; };
// 模擬一次拖曳。pts = [[x,y,t毫秒],...]（世界座標）
const dragPath = (g, pts) => {
  assert.ok(Game.beginDrag(g, pts[0][0], pts[0][1], 1, pts[0][2]), 'beginDrag');
  let r = null; for (let i = 1; i < pts.length; i++) r = Game.dragTo(g, pts[i][0], pts[i][1], 1, pts[i][2]) || r;
  return r;
};

console.log('RNG');
test('同一個種子 → 同一串亂數', () => { const a = makeRng(7), b = makeRng(7); for (let i = 0; i < 20; i++) assert.strictEqual(a(), b()); });
test('不同種子 → 不同亂數', () => { assert.notStrictEqual(makeRng(1)(), makeRng(2)()); });
test('同種子的遊戲，出杯順序相同', () => {
  const a = newGame({ seed: 42, nKinds: 2 }), b = newGame({ seed: 42, nKinds: 2 });
  for (let i = 0; i < 10; i++) { assert.deepStrictEqual(a.next, b.next); a.next = a.mode.pickNext(a); b.next = b.mode.pickNext(b); }
});
test('出杯只會是兵到城堡，種類在範圍內', () => {
  const g = newGame({ nKinds: 2 }); for (let i = 0; i < 500; i++) { const n = g.mode.pickNext(g); assert.ok(n.tier >= 0 && n.tier <= 3 && n.kind >= 0 && n.kind < 2); }
});

console.log('合併規則');
test('同種同階 → 合併成下一階，位置在質心', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 300 + 55, 300);
  Physics.advance(g.world, 1 / 60);
  const cs = g.world.cups; assert.strictEqual(cs.length, 1); assert.strictEqual(cs[0].tier, 2); assert.ok(Math.abs(cs[0].x - 327.5) < 1);
});
test('不同種類 → 不合併', () => {
  const g = newGame({ nKinds: 2 }); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 1, 300, 300); addCup(g, 1, 1, 340, 300); Physics.advance(g.world, 1 / 60); assert.strictEqual(g.world.cups.length, 2);
});
test('不同階級 → 不合併', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 2, 340, 300); Physics.advance(g.world, 1 / 60); assert.strictEqual(g.world.cups.length, 2);
});
test('合併後保留合計動量（速度為質量加權平均）', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  const a = addCup(g, 0, 0, 300, 300, 0, 0), b = addCup(g, 0, 0, 340, 300, -400, 0);
  Physics.advance(g.world, 1 / 60); void a; void b;
  const c = g.world.cups[0]; assert.ok(c.vx < 0 && c.vx > -400);
});
test('兩個國王 → 將死：兩個消失、加 2000 分', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 5, 300, 300); addCup(g, 0, 5, 300 + 100, 300);
  const ev = run(g, 0.1); assert.strictEqual(g.world.cups.filter(c => !c.held).length, 0);
  assert.ok(ev.some(e => e.type === 'checkmate')); assert.strictEqual(g.score, CONFIG.scoring.checkmate);
});
test('連鎖計分：同一次發射的第 n 次合併，分數乘以 n', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; g.phase = 'flying';
  addCup(g, 0, 0, 100, 300); addCup(g, 0, 0, 130, 300);            // → 馬（第 1 次）
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 340, 300);            // → 象（第 2 次）
  const ev = run(g, 0.1).filter(e => e.type === 'merge');
  assert.deepStrictEqual(ev.map(e => e.combo), [1, 2]);
  assert.strictEqual(g.score, 10 * 2 * 1 + 10 * 4 * 2);
});

console.log('物理');
test('杯子會慢慢停下來', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, 0, 300, 700, 0, -1500);
  Physics.advance(g.world, 10); assert.strictEqual(c.vx, 0); assert.strictEqual(c.vy, 0);
});
test('越重的杯子，滑得越近', () => {
  const dist = (tier) => { const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, tier, 300, 800, 0, -1200); const y0 = c.y; Physics.advance(g.world, 10); return y0 - c.y; };
  assert.ok(dist(0) > dist(3) && dist(3) > dist(5));
});
test('杯子不會穿出桌面', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, 2, 300, 700, 3600, -3600);
  for (let i = 0; i < 600; i++) { Physics.advance(g.world, 1 / 60); assert.ok(c.x >= c.r - 1e-9 && c.x <= CONFIG.world.W - c.r + 1e-9 && c.y >= c.r - 1e-9 && c.y <= CONFIG.world.H - c.r + 1e-9); }
});
test('最大力度撞遠端牆後，不會彈回越過發射線', () => {
  for (let tier = 0; tier <= 5; tier++) {
    const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, tier, 300, 719, 0, -CONFIG.phys.VMAX);
    let maxY = 0; for (let i = 0; i < 1200; i++) { Physics.advance(g.world, 1 / 60); maxY = Math.max(maxY, c.y); if (!c.vx && !c.vy) break; }
    assert.ok(c.y < CONFIG.world.LINE_Y, 'tier ' + tier + ' 停在 y=' + c.y);
  }
});

console.log('發射（冰壺式）');
test('在發射區內拖曳 → 不算發射', () => {
  const g = newGame(); const r = dragPath(g, [[300, 845, 0], [200, 820, 16], [400, 790, 32], [300, 760, 48]]);
  assert.strictEqual(r, null); assert.strictEqual(g.phase, 'ready'); assert.ok(g.held);
});
test('用力越線 → 發射，並帶著速度', () => {
  const g = newGame(); const r = dragPath(g, [[300, 845, 0], [300, 800, 16], [300, 750, 32], [300, 700, 48]]);
  assert.strictEqual(r, 'launched'); assert.strictEqual(g.phase, 'flying'); assert.strictEqual(g.held, null);
  const c = g.world.cups[0]; assert.ok(c.vy < -CONFIG.phys.VMIN); assert.ok(!c.held);
});
test('慢慢越線（力道不足）→ 退回中間，不算發射', () => {
  const g = newGame(); const r = dragPath(g, [[300, 845, 0], [300, 800, 400], [300, 750, 800], [300, 700, 1200]]);
  assert.strictEqual(r, 'returned'); assert.strictEqual(g.phase, 'ready'); assert.ok(g.held);
});
test('速度有上限', () => {
  const g = newGame(); dragPath(g, [[300, 845, 0], [300, 400, 16]]);
  const c = g.world.cups[0]; assert.ok(Math.hypot(c.vx, c.vy) <= CONFIG.phys.VMAX + 1e-6);
});
test('放開手指時還在發射區 → 退回中間', () => {
  const g = newGame(); Game.beginDrag(g, 300, 845, 1, 0); Game.dragTo(g, 100, 800, 1, 16); Game.endDrag(g, 1);
  run(g, 1); assert.ok(Math.abs(g.held.x - 300) < 1 && Math.abs(g.held.y - 845) < 1);
});
test('離線太遠（桌面上方）按下 → 不能抓', () => { const g = newGame(); assert.strictEqual(Game.beginDrag(g, 300, 300, 1, 0), false); });
test('杯子都停下後 → 出下一個杯子', () => {
  const g = newGame(); dragPath(g, [[300, 845, 0], [300, 800, 16], [300, 750, 32], [300, 700, 48]]);
  const ev = run(g, 12); assert.ok(ev.some(e => e.type === 'spawn')); assert.strictEqual(g.phase, 'ready'); assert.ok(g.held);
});

console.log('勝負與模式');
test('經典：杯子停在線內超過 3 秒 → 輸', () => {
  const g = newGame(); addCup(g, 0, 2, 100, 780); const ev = run(g, 2.5); assert.strictEqual(g.phase, 'ready');
  const ev2 = run(g, 1); assert.ok(ev2.some(e => e.type === 'gameover')); assert.strictEqual(g.phase, 'over');
});
test('經典：杯子還在滑動時，就算在線內也不算危險（要停下才算）', () => {
  const g = newGame(); addCup(g, 0, 2, 100, 780, 0, 200); run(g, 0.05); assert.strictEqual(g.dangerT, 0);
});
test('經典：輸了之後遊戲不再更新', () => {
  const g = newGame(); g.phase = 'over'; const s = g.score; assert.deepStrictEqual(Game.update(g, 1), []); assert.strictEqual(g.score, s);
});
test('練習：杯子停在線內 → 不會輸，而是淡出消失', () => {
  const g = newGame({ mode: 'practice' }); addCup(g, 0, 2, 100, 780); const ev = run(g, 4);
  assert.notStrictEqual(g.phase, 'over'); assert.ok(ev.some(e => e.type === 'fade')); assert.strictEqual(g.world.cups.filter(c => !c.held).length, 0);
});
test('練習：強制開啟輔助線；經典預設關閉', () => {
  assert.ok(Game.assistOn(newGame({ mode: 'practice' }))); assert.ok(!Game.assistOn(newGame()));
});
test('切換模式會重新開始', () => { const g = newGame(); g.score = 99; Game.setMode(g, 'practice'); assert.strictEqual(g.score, 0); assert.strictEqual(g.mode.id, 'practice'); });
test('重新開始：分數歸零、桌面只有一個待發射的杯子', () => {
  const g = newGame(); addCup(g, 0, 1, 300, 300); g.score = 50; Game.restart(g);
  assert.strictEqual(g.score, 0); assert.strictEqual(g.world.cups.length, 1); assert.ok(g.world.cups[0].held);
});
test('帶種子重新開始 → 出杯順序可重現', () => {
  const a = newGame({ nKinds: 2 }), b = newGame({ nKinds: 2, seed: 999 }); Game.restart(a, 999);
  assert.deepStrictEqual(a.next, b.next); assert.strictEqual(a.world.cups[0].kind, b.world.cups[0].kind);
});

console.log('音效事件');
test('杯子互撞 → hit 事件（帶撞擊速度）；太輕的碰撞不發', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  addCup(g, 0, 1, 300, 300, 400, 0); addCup(g, 1 < 0 ? 0 : 0, 2, 300 + 60, 300, 0, 0);
  const ev = run(g, 0.2).filter(e => e.type === 'hit'); assert.ok(ev.length >= 1); assert.ok(ev[0].v > 40 && ev[0].tier === 2);
});
test('撞牆 → wall 事件', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; addCup(g, 0, 0, 300, 40, 0, -1500);
  assert.ok(run(g, 0.2).some(e => e.type === 'wall'));
});
test('合併不會同時發 hit（只發 merge）', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; g.phase = 'flying';
  addCup(g, 0, 1, 300, 300, 300, 0); addCup(g, 0, 1, 330, 300, 0, 0);
  const ev = run(g, 0.1); assert.ok(ev.some(e => e.type === 'merge')); assert.ok(!ev.some(e => e.type === 'hit'));
});

test('hit 事件帶接觸點與雙方資訊（給特效用）', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null;
  const a = addCup(g, 0, 1, 300, 300, 600, 0), b = addCup(g, 0, 3, 300 + 80, 300, 0, 0);
  const h = run(g, 0.2).find(e => e.type === 'hit'); assert.ok(h);
  assert.ok(h.ta === 1 && h.tb === 3 && h.a === a.id && h.b === b.id && h.x > 300 && h.x < 380 && Math.abs(h.y - 300) < 5);
});
test('wall 事件帶位置與杯子 id', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; const c = addCup(g, 0, 0, 300, 40, 0, -1500);
  const w = run(g, 0.2).find(e => e.type === 'wall'); assert.ok(w && w.id === c.id && w.v > 100 && typeof w.x === 'number');
});

console.log('VP 與生物');
test('VP：每 500 分 1 VP，每個國王 +10', () => {
  const g = newGame(); g.score = 1234; g.kings = 2; assert.deepStrictEqual(Game.vp(g), { fromScore: 2, fromKings: 20, total: 22 });
});
test('練習模式沒有 VP', () => { const g = newGame({ mode: 'practice' }); g.score = 99999; g.kings = 3; assert.strictEqual(Game.vp(g).total, 0); });
test('做出國王會計入 kings；將死不重複計', () => {
  const g = newGame(); g.world.cups.length = 0; g.held = null; g.phase = 'flying';
  addCup(g, 0, 4, 300, 300); addCup(g, 0, 4, 300 + 100, 300); run(g, 0.1); assert.strictEqual(g.kings, 1);
});
test('重新開始 kings 歸零', () => { const g = newGame(); g.kings = 3; Game.restart(g); assert.strictEqual(g.kings, 0); });
test('setKinds：只會出指定的種類', () => {
  const g = newGame({ kinds: [2, 5] }); for (let i = 0; i < 300; i++) assert.ok([2, 5].includes(g.mode.pickNext(g).kind));
});
test('setKinds：空 / 無效 → 退回第一種', () => { const g = newGame(); Game.setKinds(g, []); assert.deepStrictEqual(g.kinds, [0]); Game.setKinds(g, [99, -1]); assert.deepStrictEqual(g.kinds, [0]); });
test('解鎖價格表：7 種，前 2 種免費且遞增', () => {
  const u = CONFIG.vp.unlockCost; assert.strictEqual(u.length, CONFIG.kinds.length); assert.ok(u[0] === 0 && u[1] === 0); for (let i = 3; i < u.length; i++) assert.ok(u[i] > u[i - 1]);
});

console.log('關卡模式');
const lvGame = (i) => { const g = newGame(); Game.startLevel(g, i); g.world.cups.length = 0; g.held = null; g.phase = 'flying'; return g; };
test('startLevel：使用該關的生物、模式為 level', () => { const g = newGame(); Game.startLevel(g, 2); assert.strictEqual(g.mode.id, 'level'); assert.deepStrictEqual(g.kinds, [0, 1, 2]); assert.strictEqual(g.level, 2); });
test('第 1 關：做出一個國王 → 過關（phase=won、levelclear 事件）', () => {
  const g = lvGame(0); addCup(g, 0, 4, 300, 300); addCup(g, 0, 4, 400, 300);
  const ev = run(g, 0.1); assert.ok(ev.some(e => e.type === 'levelclear' && e.level === 0)); assert.strictEqual(g.phase, 'won');
});
test('第 2 關：只做出一種國王不過關，兩種都做出才過關', () => {
  const g = lvGame(1); addCup(g, 0, 4, 100, 300); addCup(g, 0, 4, 200, 300);
  let ev = run(g, 0.1); assert.ok(!ev.some(e => e.type === 'levelclear')); assert.deepStrictEqual(g.kingKinds, [0]);
  addCup(g, 1, 4, 400, 300); addCup(g, 1, 4, 500, 300);
  ev = run(g, 0.1); assert.ok(ev.some(e => e.type === 'levelclear')); assert.strictEqual(g.phase, 'won');
});
test('過關後遊戲停止更新（不再計分、不再輸）', () => { const g = lvGame(0); g.phase = 'won'; const sc = g.score; assert.deepStrictEqual(Game.update(g, 5), []); assert.strictEqual(g.score, sc); });
test('關卡中仍會輸（杯子停在線內太久）', () => { const g = lvGame(0); g.phase = 'ready'; addCup(g, 0, 2, 100, 780); run(g, 4); assert.strictEqual(g.phase, 'over'); });
test('關卡模式：Game.vp 為 0（獎勵只在首次通關）', () => { const g = lvGame(0); g.score = 99999; g.kings = 5; assert.strictEqual(Game.vp(g).total, 0); });
test('重玩關卡：進度與杯子歸零', () => { const g = lvGame(1); g.kingKinds = [0]; Game.startLevel(g, 1); assert.deepStrictEqual(g.kingKinds, []); assert.strictEqual(g.world.cups.length, 1); });
test('setMode 回到經典 → level 清空', () => { const g = lvGame(0); Game.setMode(g, 'classic'); assert.strictEqual(g.level, null); });
test('關卡設定：生物索引有效、獎勵為正', () => { for (const lv of CONFIG.levels) { assert.ok(lv.reward > 0); for (const k of lv.kinds) assert.ok(k >= 0 && k < CONFIG.kinds.length); } });

console.log('畫面流程（Flow）');
test('關卡選單：menu → levels → start；過關 → result', () => {
  const f = Flow.create(); assert.ok(Flow.send(f, 'levels')); assert.strictEqual(f.state, 'levels'); Flow.send(f, 'start'); assert.strictEqual(f.state, 'playing');
  Flow.send(f, 'clear'); assert.strictEqual(f.state, 'result');
});
test('選單 ↔ 生物頁', () => { const f = Flow.create(); Flow.send(f, 'kinds'); assert.strictEqual(f.state, 'kinds'); assert.strictEqual(Flow.send(f, 'start'), false); Flow.send(f, 'menu'); assert.strictEqual(f.state, 'menu'); });
test('開始於選單；start → playing', () => { const f = Flow.create(); assert.strictEqual(f.state, 'menu'); assert.ok(Flow.send(f, 'start')); assert.strictEqual(f.state, 'playing'); });
test('暫停 ↔ 繼續', () => { const f = Flow.create(); Flow.send(f, 'start'); Flow.send(f, 'pause'); assert.strictEqual(f.state, 'paused'); Flow.send(f, 'resume'); assert.strictEqual(f.state, 'playing'); });
test('遊戲結束 → 結算 → 再玩一次 / 回選單', () => {
  const f = Flow.create(); Flow.send(f, 'start'); Flow.send(f, 'gameover'); assert.strictEqual(f.state, 'result');
  Flow.send(f, 'restart'); assert.strictEqual(f.state, 'playing'); Flow.send(f, 'gameover'); Flow.send(f, 'menu'); assert.strictEqual(f.state, 'menu');
});
test('不合法的轉換被忽略（選單時不能暫停、暫停時不會結束）', () => {
  const f = Flow.create(); assert.strictEqual(Flow.send(f, 'pause'), false); assert.strictEqual(f.state, 'menu');
  Flow.send(f, 'start'); Flow.send(f, 'pause'); assert.strictEqual(Flow.send(f, 'gameover'), false); assert.strictEqual(f.state, 'paused');
});

console.log('\n' + passed + ' 項通過' + (process.exitCode ? '，有失敗' : ''));
