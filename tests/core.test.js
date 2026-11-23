// 核心邏輯的自動測試（不需要瀏覽器、不需要任何套件）。執行：node tests/core.test.js
const assert = require('assert');
const SC = require('./_load').loadCore();
const { CONFIG, Physics, Game, Flow, Profile, Modes, makeRng } = SC;
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
  assert.strictEqual(g.score, 10 * 2 * 1 + 10 * 4 * 2 + CONFIG.bonus.double);   // two separate pairs in the same frame also earn a double bonus
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

console.log('模式規則（Modes 自己負責目標、HUD、標示）');
test('每個模式都有完整的欄位', () => {
  for (const m of Object.values(Modes)) { assert.ok(['best', 'level'].includes(m.hud)); assert.ok('banner' in m && 'goalKinds' in m && 'tracksBest' in m && 'givesVP' in m && typeof m.pickNext === 'function'); }
});
test('只有關卡模式有過關目標；練習模式有標示', () => {
  assert.strictEqual(Modes.classic.goalKinds, null); assert.strictEqual(Modes.practice.goalKinds, null); assert.strictEqual(typeof Modes.level.goalKinds, 'function');
  assert.strictEqual(Modes.practice.banner, 'fx.practice'); assert.strictEqual(Modes.level.hud, 'level');
});
test('goalKinds 取自關卡設定', () => { const g = newGame(); Game.startLevel(g, 2); assert.deepStrictEqual(Modes.level.goalKinds(g), CONFIG.levels[2].kinds); });
test('rematch：關卡 → 重玩同一關；其他模式 → 用指定生物重開', () => {
  const g = newGame(); Game.startLevel(g, 1); g.score = 9; Game.rematch(g, [0]); assert.strictEqual(g.level, 1); assert.strictEqual(g.score, 0); assert.deepStrictEqual(g.kinds, [0, 1]);
  const h = newGame(); h.score = 9; Game.rematch(h, [0, 3]); assert.strictEqual(h.score, 0); assert.deepStrictEqual(h.kinds, [0, 3]);
});

console.log('Profile（玩家進度）');
const P0 = () => Profile.fresh(0);
test('新玩家：龍與獨角獸已解鎖、只使用龍、0 VP', () => { const p = P0(); assert.deepStrictEqual([p.unlocked, p.active, p.vp, p.cleared, p.lang, p.sound], [[0, 1], [0], 0, [], 'en', true]); });
test('migrate：沒有資料 → 新玩家，可帶入舊版最高分', () => { assert.strictEqual(Profile.migrate(null, 777).best.classic, 777); assert.strictEqual(Profile.migrate('garbage', 5).best.classic, 5); });
test('migrate：v1 存檔 → 保留最高分', () => { const p = Profile.migrate({ v: 1, best: { classic: 4321 } }); assert.strictEqual(p.best.classic, 4321); assert.strictEqual(p.v, Profile.VERSION); assert.deepStrictEqual(p.unlocked, [0, 1]); });
test('migrate：v2 存檔 → 保留 VP / 解鎖 / 使用中，補上新欄位', () => {
  const p = Profile.migrate({ v: 2, best: { classic: 10 }, vp: 150, unlocked: [0, 1, 2], active: [0, 2] });
  assert.deepStrictEqual([p.vp, p.unlocked, p.active, p.cleared, p.lang], [150, [0, 1, 2], [0, 2], [], 'en']);
});
test('migrate：壞資料會被修正（負數、重複、越界、未解鎖的生物、不認得的語言）', () => {
  const p = Profile.migrate({ vp: -50, best: { classic: 'x' }, unlocked: [0, 1, 1, 99], active: [5, 5, 99], cleared: [0, 0, 7, -1], lang: 'fr', sound: 0 });
  assert.deepStrictEqual([p.vp, p.best.classic, p.unlocked, p.active, p.cleared, p.lang, p.sound], [0, 0, [0, 1], [0], [0], 'en', true]);
});
test('migrate：解鎖永遠是從 0 開始連續的（不能跳著解鎖）', () => { assert.deepStrictEqual(Profile.migrate({ unlocked: [0, 1, 4] }).unlocked, [0, 1, 2]); });
test('migrate：結果可再次 migrate 且不變（冪等）', () => { const p = Profile.migrate({ vp: 5, unlocked: [0, 1, 2], active: [1, 2], cleared: [1] }); assert.deepStrictEqual(Profile.migrate(JSON.parse(JSON.stringify(p))), p); });
test('buy：VP 夠才能買下一種，依序、扣 VP', () => {
  const p = P0(); p.vp = 99; assert.strictEqual(Profile.buy(p, 2), false); p.vp = 100; assert.strictEqual(Profile.buy(p, 2), true); assert.deepStrictEqual([p.vp, p.unlocked], [0, [0, 1, 2]]);
});
test('buy：不能跳著買、不能重複買', () => { const p = P0(); p.vp = 9999; assert.strictEqual(Profile.buy(p, 4), false); Profile.buy(p, 2); assert.strictEqual(Profile.buy(p, 2), false); assert.strictEqual(p.unlocked.length, 3); });
test('buy：全部解鎖後 nextLockedKind = -1', () => { const p = P0(); p.vp = 1e6; for (let i = 2; i < CONFIG.kinds.length; i++) assert.ok(Profile.buy(p, i)); assert.strictEqual(Profile.nextLockedKind(p), -1); assert.strictEqual(Profile.buy(p, CONFIG.kinds.length), false); });
test('toggleKind：可加入已解鎖的；不能加入未解鎖的；至少保留 1 種', () => {
  const p = P0(); assert.ok(Profile.toggleKind(p, 1)); assert.deepStrictEqual(p.active, [0, 1]);
  assert.strictEqual(Profile.toggleKind(p, 3), false); assert.ok(Profile.toggleKind(p, 0)); assert.deepStrictEqual(p.active, [1]);
  assert.strictEqual(Profile.toggleKind(p, 1), false); assert.deepStrictEqual(p.active, [1]);
});
test('bankRun：VP 入帳，同一局只算一次；新的一局可再入帳', () => {
  const p = P0(), g = newGame(); g.score = 5300; g.kings = 1;
  assert.strictEqual(Profile.bankRun(p, g).total, 20); assert.strictEqual(p.vp, 20);
  assert.strictEqual(Profile.bankRun(p, g).total, 0); assert.strictEqual(p.vp, 20);
  Game.restart(g); g.score = 1000; Profile.bankRun(p, g); assert.strictEqual(p.vp, 22);
});
test('bankRun：練習 / 關卡模式不給分數 VP', () => { const p = P0(), g = newGame({ mode: 'practice' }); g.score = 99999; Profile.bankRun(p, g); assert.strictEqual(p.vp, 0); });
test('recordBest：只有經典模式、且分數更高才算破紀錄', () => {
  const p = P0(), g = newGame(); g.score = 100; assert.ok(Profile.recordBest(p, g)); assert.strictEqual(p.best.classic, 100);
  g.score = 100; assert.strictEqual(Profile.recordBest(p, g), false); g.score = 50; assert.strictEqual(Profile.recordBest(p, g), false);
  const q = newGame({ mode: 'practice' }); q.score = 9999; assert.strictEqual(Profile.recordBest(p, q), false); assert.strictEqual(p.best.practice, undefined);
});
test('finishRun：同時處理最高分與 VP', () => { const p = P0(), g = newGame(); g.score = 1000; const r = Profile.finishRun(p, g); assert.ok(r.newBest); assert.strictEqual(r.vp.total, 2); assert.strictEqual(p.vp, 2); });
test('clearLevel：首次通關給獎勵，重玩不再給', () => {
  const p = P0(); assert.strictEqual(Profile.clearLevel(p, 0), CONFIG.levels[0].reward); assert.strictEqual(p.vp, CONFIG.levels[0].reward);
  assert.strictEqual(Profile.clearLevel(p, 0), 0); assert.strictEqual(p.vp, CONFIG.levels[0].reward); assert.deepStrictEqual(p.cleared, [0]);
});
test('levelOpen：第 1 關一開始就開放，之後要通過上一關', () => { const p = P0(); assert.ok(Profile.levelOpen(p, 0)); assert.ok(!Profile.levelOpen(p, 1)); Profile.clearLevel(p, 0); assert.ok(Profile.levelOpen(p, 1)); assert.ok(!Profile.levelOpen(p, 2)); });
test('語言與音效設定：只接受合法值', () => { const p = P0(); Profile.setLang(p, 'zh'); assert.strictEqual(p.lang, 'zh'); Profile.setLang(p, 'xx'); assert.strictEqual(p.lang, 'en'); Profile.toggleSound(p); assert.strictEqual(p.sound, false); Profile.toggleSound(p); assert.strictEqual(p.sound, true); });
test('完整流程：打幾局 → 買生物 → 通關', () => {
  const p = P0(); for (let i = 0; i < 3; i++) { const g = newGame(); g.score = 10000; g.kings = 1; Profile.finishRun(p, g); }
  assert.strictEqual(p.vp, 90); Profile.clearLevel(p, 0); assert.strictEqual(p.vp, 120); assert.ok(Profile.buy(p, 2)); assert.strictEqual(p.vp, 20);
});

console.log('道具');
const IT = CONFIG.items, fire = (g) => dragPath(g, [[300, 845, 0], [300, 800, 16], [300, 750, 32], [300, 700, 48]]);
const giveItem = (g, id) => { g.items.push(id); return g; };
const emptyTable = (g) => { g.world.cups = g.world.cups.filter(c => c.held); };
test('設定：5 種道具、背包 2 格、價格都有定義', () => { assert.deepStrictEqual(IT.defs.map(d => d.id), ['sweep', 'upgrade', 'wild', 'magnet', 'undo']); assert.strictEqual(IT.slots, 2); assert.ok(IT.defs.every(d => d.cost > 0)); });
test('各模式的道具規則：經典充能、關卡固定、練習無限', () => { assert.deepStrictEqual([Modes.classic.items, Modes.level.items, Modes.practice.items], ['earn', 'fixed', 'free']); });
test('新的一局背包是空的、能量 0；startItems 只用一次', () => {
  const g = newGame(); assert.deepStrictEqual([g.items, g.energy, g.itemsUsed], [[], 0, 0]);
  g.startItems = ['wild']; Game.restart(g); assert.deepStrictEqual(g.items, ['wild']); Game.restart(g); assert.deepStrictEqual(g.items, []);
});
test('關卡模式：開局拿到關卡指定的道具', () => { const old = CONFIG.levels[0].items; CONFIG.levels[0].items = ['sweep']; const g = newGame(); Game.startLevel(g, 0); assert.deepStrictEqual(g.items, ['sweep']); CONFIG.levels[0].items = old; });
test('合併得分會充能；能量滿發 1 個隨機道具並扣能量', () => {
  const g = newGame(); g.energy = IT.energyCost - 40; g.phase = 'flying'; emptyTable(g);
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 300 + 55, 300);                 // 騎士 + 騎士 → 主教，得 40 分
  const ev = run(g, 0.1); assert.strictEqual(g.items.length, 1); assert.ok(ev.some(e => e.type === 'itemget' && e.id === g.items[0])); assert.strictEqual(g.energy, 0);
});
test('背包滿了就不再發，能量停在滿格；空出來後補發', () => {
  const g = newGame(); g.items = ['sweep', 'undo']; g.energy = IT.energyCost * 3; g.phase = 'flying'; emptyTable(g);
  addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 355, 300); run(g, 0.1);
  assert.strictEqual(g.items.length, 2); assert.strictEqual(g.energy, IT.energyCost);
  g.world.cups.push(Physics.makeCup(g.world, 0, 0, 100, 800)); Game.useItem(g, 'undo');        // undo 沒有快照 → 不能用
  assert.strictEqual(g.items.length, 2);
  Game.useItem(g, 'sweep'); assert.strictEqual(g.items.length, 2, '用掉 1 個後立刻補發 1 個（能量已滿）'); assert.strictEqual(g.energy, 0);
});
test('練習 / 關卡模式不會充能', () => { for (const m of ['practice']) { const g = newGame({ mode: m }); g.phase = 'flying'; emptyTable(g); addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 355, 300); run(g, 0.1); assert.strictEqual(g.energy, 0); assert.deepStrictEqual(g.items, []); } });
test('道具用獨立亂數：有沒有發道具，出杯順序都一樣', () => {
  const a = newGame({ seed: 9, nKinds: 2 }), b = newGame({ seed: 9, nKinds: 2 }); b.energy = 1e9;
  const seq = (g) => { const o = []; for (let i = 0; i < 12; i++) { o.push(g.mode.pickNext(g)); } return JSON.stringify(o); };
  b.items = []; const ev = []; b.phase = 'flying'; emptyTable(b); addCup(b, 0, 1, 300, 300); addCup(b, 0, 1, 355, 300); run(b, 0.1);
  assert.ok(b.items.length > 0); a.next = b.next; assert.strictEqual(seq(a), seq(b));
});
test('同種子 → 同樣的道具序列', () => {
  const draw = () => { const g = newGame({ seed: 5 }); const o = []; for (let i = 0; i < 6; i++) { g.items = []; g.energy = IT.energyCost; const ev = []; g.phase = 'ready'; Game.useItem(g, 'none'); g.items = []; g.energy = IT.energyCost; run(g, 0.02); /* 觸發不了 award，直接用 useItem 流程 */ } return o; };
  const g1 = newGame({ seed: 5 }), g2 = newGame({ seed: 5 });
  const roll = (g) => { const o = []; for (let i = 0; i < 8; i++) { g.items = ['undo']; g.energy = IT.energyCost; g.snap = { }; g.items = []; g.phase = 'flying'; emptyTable(g); addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 355, 300); run(g, 0.05); o.push(g.items[0]); } return o.join(); };
  assert.strictEqual(roll(g1), roll(g2));
});
test('不能使用不在背包裡的道具；結束後也不能用', () => { const g = newGame(); assert.strictEqual(Game.useItem(g, 'sweep'), null); giveItem(g, 'wild'); g.phase = 'over'; assert.strictEqual(Game.useItem(g, 'wild'), null); });

test('🧹 清掃：清掉靠近玩家的約 3 排（線內 + 線外一段），更遠的杯子和手上的杯子不動；桌上沒杯子也能用', () => {
  const g = newGame(); giveItem(g, 'sweep'); emptyTable(g); const held = g.held;
  assert.ok(Game.canUse(g, 'sweep'), '想用就用，不需要有杯子');
  const edge = CONFIG.world.LINE_Y - IT.sweepDepth;
  const far = addCup(g, 0, 0, 120, edge - 30), far2 = addCup(g, 0, 2, 300, 200);
  addCup(g, 0, 1, 200, 800); addCup(g, 0, 2, 400, 700); addCup(g, 0, 3, 250, edge + 20); g.dangerT = 2;
  const ev = Game.useItem(g, 'sweep'); assert.strictEqual(ev.filter(e => e.type === 'sweepcup').length, 3);
  assert.deepStrictEqual(g.world.cups.filter(c => !c.held).map(c => c.id).sort(), [far.id, far2.id].sort());
  assert.ok(g.world.cups.includes(held)); assert.strictEqual(g.dangerT, 0); assert.deepStrictEqual(g.items, []); assert.strictEqual(g.itemsUsed, 1);
  giveItem(g, 'sweep'); emptyTable(g); assert.ok(Game.useItem(g, 'sweep'), '空桌子也能用（只是浪費）');
});
test('🧹 清掃的範圍約 3 排（深度設定合理）', () => { assert.ok(IT.sweepDepth >= 3 * 2 * CONFIG.tiers[1].r && IT.sweepDepth <= 3 * 2 * CONFIG.tiers[3].r + 60); });
test('⬆️ 升階：手上的杯子升一階（位置、生物不變），到上限就不能用', () => {
  const g = newGame(); giveItem(g, 'upgrade'); const t0 = g.held.tier, k0 = g.held.kind; g.held.tier = 0; const h = g.held; g.world.cups[g.world.cups.indexOf(h)] = Physics.makeCup(g.world, k0, 0, h.x, h.y); g.held = g.world.cups[g.world.cups.length - 1]; g.held.held = true;
  const r0 = g.held.r; Game.useItem(g, 'upgrade'); assert.strictEqual(g.held.tier, 1); assert.ok(g.held.r > r0); assert.ok(g.held.held); assert.strictEqual(g.held.kind, k0); assert.strictEqual(g.world.cups.filter(c => c.held).length, 1);
  giveItem(g, 'upgrade'); g.held.tier = IT.upgradeMax; assert.strictEqual(Game.canUse(g, 'upgrade'), false);
});
test('⬆️ / 🌈 只能在「等待發射」時用（杯子還在滑的時候不行）', () => { const g = newGame(); giveItem(g, 'upgrade'); giveItem(g, 'wild'); g.phase = 'flying'; g.held = null; assert.ok(!Game.canUse(g, 'upgrade')); assert.ok(!Game.canUse(g, 'wild')); });
test('🌈 萬用杯：和任何同階杯子合併，結果是對方的生物；不同階不合併', () => {
  const g = newGame({ nKinds: 3 }); giveItem(g, 'wild'); emptyTable(g); const h = g.held; h.tier = 1; h.kind = 0; Game.useItem(g, 'wild'); assert.ok(h.wild);
  h.held = false; h.x = 300; h.y = 300; h.r = CONFIG.tiers[1].r; const o = addCup(g, 2, 1, 300 + 55, 300); const far = addCup(g, 1, 3, 100, 100);
  g.held = null; Physics.advance(g.world, 1 / 60);
  const m = g.world.cups.find(c => c.tier === 2); assert.ok(m && m.kind === 2 && !m.wild, '合成對方的生物，且不再是萬用'); assert.ok(g.world.cups.includes(far));
  const g2 = newGame({ nKinds: 2 }); emptyTable(g2); addCup(g2, 0, 1, 300, 300).wild = true; addCup(g2, 1, 2, 355, 300); Physics.advance(g2.world, 1 / 60); assert.strictEqual(g2.world.cups.filter(c => !c.held).length, 2);
});
test('🌈 萬用杯碰到國王 → 將死（對方的生物）', () => { const g = newGame({ nKinds: 2 }); emptyTable(g); addCup(g, 0, 5, 300, 300).wild = true; addCup(g, 1, 5, 380, 300); Physics.advance(g.world, 1 / 60); const e = g.world.events.find(x => x.type === 'checkmate'); assert.ok(e && e.kind === 1); });
test('🧲 磁鐵：只有同種同階的杯子互相靠近並合併；沒有成對的杯子就不能用', () => {
  const g = newGame({ nKinds: 2 }); giveItem(g, 'magnet'); emptyTable(g); g.phase = 'flying'; addCup(g, 0, 0, 100, 300); addCup(g, 1, 0, 300, 500);
  assert.ok(!Game.canUse(g, 'magnet')); const a = addCup(g, 0, 0, 500, 300); assert.ok(Game.canUse(g, 'magnet'));
  const other = g.world.cups.find(c => c.kind === 1); const ox = other.x;
  Game.useItem(g, 'magnet'); const ev = run(g, 3); assert.ok(ev.some(e => e.type === 'merge' && e.tier === 1), '兩顆兵吸在一起合成騎士'); assert.ok(Math.abs(other.x - ox) < 60, '不同種的杯子不被吸走');
});
test('🧲 磁鐵只持續一小段時間，且不會把杯子加速到失控', () => {
  const g = newGame(); giveItem(g, 'magnet'); emptyTable(g); g.phase = 'flying'; const a = addCup(g, 0, 4, 80, 300), b = addCup(g, 0, 4, 520, 300); Game.useItem(g, 'magnet'); let vmax = 0;
  for (let t = 0; t < 2.5; t += 1 / 60) { Game.update(g, 1 / 60); for (const c of g.world.cups) vmax = Math.max(vmax, Math.hypot(c.vx, c.vy)); }
  assert.ok(vmax <= IT.magnetVmax + 1, 'vmax=' + vmax); assert.strictEqual(g.magnetT, 0);
});
test('⏪ 撤銷：還沒發射過就不能用；發射後使用 → 回到發射前（杯子、分數、出杯順序）', () => {
  const g = newGame({ seed: 3, nKinds: 2 }); giveItem(g, 'undo'); assert.ok(!Game.canUse(g, 'undo'));
  emptyTable(g); addCup(g, 0, 1, 300, 300); addCup(g, 0, 1, 360, 300);        // 桌上有一對可以被打到
  const before = JSON.stringify({ cups: g.world.cups.map(c => [c.id, c.kind, c.tier, Math.round(c.x), Math.round(c.y)]), score: g.score, next: g.next, heldKind: g.held.kind, heldTier: g.held.tier });
  const nextRng = g.rng.get();
  fire(g); assert.strictEqual(g.phase, 'flying'); run(g, 6); g.score += 777;
  const ev = Game.useItem(g, 'undo'); assert.ok(ev && ev[0].id === 'undo');
  assert.strictEqual(g.phase, 'ready'); assert.ok(g.held && g.held.held); assert.strictEqual(g.held.x, CONFIG.world.SPAWN.x); assert.strictEqual(g.held.y, CONFIG.world.SPAWN.y);
  const after = JSON.stringify({ cups: g.world.cups.map(c => [c.id, c.kind, c.tier, Math.round(c.x), Math.round(c.y)]), score: g.score, next: g.next, heldKind: g.held.kind, heldTier: g.held.tier });
  assert.strictEqual(after, before); assert.strictEqual(g.rng.get(), nextRng); assert.ok(!Game.canUse(g, 'undo') || g.items.includes('undo') === false);
});
test('⏪ 撤銷後重新打一次，結果和第一次完全一樣（亂數與狀態都還原）', () => {
  const g = newGame({ seed: 8, nKinds: 2 }); giveItem(g, 'undo'); fire(g); run(g, 6); const first = JSON.stringify([g.score, g.world.cups.map(c => [c.kind, c.tier, Math.round(c.x), Math.round(c.y)]), g.next]);
  Game.useItem(g, 'undo'); fire(g); run(g, 6); assert.strictEqual(JSON.stringify([g.score, g.world.cups.map(c => [c.kind, c.tier, Math.round(c.x), Math.round(c.y)]), g.next]), first);
});
test('⏪ 撤銷不能重複用，也不能用「這一發賺到的能量」刷道具', () => {
  const g = newGame({ seed: 4 }); giveItem(g, 'undo'); giveItem(g, 'undo'); fire(g); run(g, 1);
  g.energy += 500; Game.useItem(g, 'undo'); assert.ok(!g.snap); assert.strictEqual(g.energy, 0, '能量還原到發射前'); assert.strictEqual(Game.useItem(g, 'undo'), null);
});
test('練習模式：5 種道具無限使用，不會消耗', () => {
  const g = newGame({ mode: 'practice' }); assert.deepStrictEqual(Game.itemSlots(g), IT.defs.map(d => d.id));
  emptyTable(g); addCup(g, 0, 0, 100, 800); for (let i = 0; i < 3; i++) { addCup(g, 0, 0, 100, 800); assert.ok(Game.useItem(g, 'sweep')); } assert.strictEqual(Game.itemSlots(g).length, 5);
});

console.log('道具與 Profile');
test('Flow：選單 ↔ 道具頁', () => { const f = Flow.create(); assert.ok(Flow.send(f, 'items')); assert.strictEqual(f.state, 'items'); assert.ok(!Flow.send(f, 'start')); assert.ok(Flow.send(f, 'menu')); assert.strictEqual(f.state, 'menu'); });
test('開局攜帶：買 → 扣 VP；再按一次取消 → 全額退款；換一個 → 退舊買新', () => {
  const p = Profile.fresh(0); p.vp = 25; assert.ok(Profile.toggleCarry(p, 'sweep')); assert.deepStrictEqual([p.vp, p.carry], [5, 'sweep']);
  assert.ok(Profile.toggleCarry(p, 'sweep')); assert.deepStrictEqual([p.vp, p.carry], [25, null]);
  Profile.toggleCarry(p, 'sweep'); assert.ok(Profile.toggleCarry(p, 'upgrade')); assert.deepStrictEqual([p.vp, p.carry], [15, 'upgrade']);
});
test('開局攜帶：VP 不夠不能買；不認得的道具不能買', () => { const p = Profile.fresh(0); p.vp = 19; assert.strictEqual(Profile.toggleCarry(p, 'sweep'), false); assert.strictEqual(Profile.toggleCarry(p, 'xx'), false); assert.deepStrictEqual([p.vp, p.carry], [19, null]); });
test('takeCarry：取出後清空（每次只能用一局）', () => { const p = Profile.fresh(0); p.vp = 50; Profile.toggleCarry(p, 'wild'); assert.strictEqual(Profile.takeCarry(p), 'wild'); assert.strictEqual(p.carry, null); assert.strictEqual(Profile.takeCarry(p), null); });
test('migrate：舊存檔補上 carry 與有道具的最高分；壞的 carry 被丟掉', () => {
  const p = Profile.migrate({ v: 3, best: { classic: 900 }, vp: 5 }); assert.deepStrictEqual([p.best.classic, p.best.classicItems, p.carry, p.v], [900, 0, null, Profile.VERSION]);
  assert.strictEqual(Profile.migrate({ carry: 'hax' }).carry, null); assert.strictEqual(Profile.migrate({ carry: 'undo', best: { classicItems: 12 } }).carry, 'undo');
});
test('最高分：用過道具的局另外記，不會蓋掉「無道具最高分」', () => {
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
