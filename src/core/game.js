/* Kings of Cups — src/core/game.js
 * CORE · Game: rules + state machine (spawn, launch, scoring, bonuses, items, ultimates, equipment, pillars,
 * level goals, chapter mechanics, win/lose). update() returns events. Depends on: CONFIG, TOP, makeRng, Physics, Modes, Ults.
 * Must not touch: the DOM, the save (Profile), the screen (Flow).
 */
'use strict';

/* ───────── GAME (rules and state machine; no DOM)───────── */
const Game = (() => {
  const P = CONFIG.phys, R = CONFIG.rules, Wd = CONFIG.world, U = CONFIG.ults;

  function create(opts) {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed >>> 0 : (Math.random() * 4294967296) >>> 0;
    const g = {
      seed, rng: makeRng(seed), kinds: [], nKinds: 1, kings: 0, kingKinds: [], level: null,
      mode: Modes[opts.mode || 'classic'], world: Physics.createWorld(),
      phase: 'ready',           // ready (waiting to launch) | flying (cups sliding) | over | won
      score: 0, shotMerges: 0, dangerT: 0, settleT: 0,
      held: null, next: null, drag: null, assist: false, banked: false, runs: 0,
      features: { items: true, ults: true }, eq: {},   // set by the app from the save: unlocked features, worn equipment {id: level}
    };
    setKinds(g, opts.kinds || Array.from({ length: Math.max(1, Math.min(CONFIG.kinds.filter(k => !k.finale).length, opts.nKinds || 1)) }, (_, i) => i));
    restart(g);
    return g;
  }
  function restart(g, seed) {
    if (seed != null) { g.seed = seed >>> 0; g.rng = makeRng(g.seed); }
    g.world = Physics.createWorld();
    g.shot = null; g.rampLv = 0; g.held = null; g.drag = null; g.score = 0; g.kings = 0; g.kingKinds = []; g.banked = false; g.shotMerges = 0; g.dangerT = 0; g.settleT = 0;
    const lv = levelOf(g);
    g.danger = lv ? (lv.danger || 'lose') : g.mode.danger; g.slots = (lv && lv.slots) || CONFIG.items.slots;
    g.shots = 0; g.prog = 0; g.stars = 0; g.endReason = null; g.lineY = Wd.LINE_Y; g.roarShot = 0;   // lineY: the danger line (rises in levels with rising water)
    Ults.reset(g);
    if (lv) {                                                        // fixed starting layout (same every time)
      for (const [k, t, x, y, f] of lv.cups || []) { const c = Physics.makeCup(g.world, k, t, x, y); if (f === 'stone') c.stone = true; g.world.cups.push(c); }
      for (const [x, y, hp] of lv.pillars || []) { const h = hp > 0 ? hp : Infinity; g.world.pillars.push({ id: 'p' + (g.world.nextId++), x, y, r: CONFIG.pillars.r, hp: h, max: h }); }   // hp 0 = unbreakable
      for (const [x, y, hp] of lv.guards || []) g.world.pillars.push({ id: 'g' + (g.world.nextId++), x, y, r: CONFIG.guard.r, hp, max: hp, guard: true });   // twin guardians
      for (const [x, y, hp] of lv.heads || []) g.world.pillars.push({ id: 'h' + (g.world.nextId++), x, y, r: CONFIG.hydra.r, hp, max: hp, head: true, cut: 0 });   // hydra heads
      if (lv.chimera) { const C = lv.chimera; g.world.pillars.push({ id: 'c' + (g.world.nextId++), x: C.x, y: C.y, r: CONFIG.chimera.r, hp: C.hp[0], max: C.hp[0], chimera: true, phase: 0, since: 0 }); }   // the finale boss
      g.world.sand = (lv.sand || []).map(s => s.slice());
      g.world.current = (lv.current || []).map(b => b.slice());
    }
    const im = g.mode.items;                                       // item state (own RNG, so spawn order is unaffected)
    g.items = (im === 'fixed' ? (lv.items || []) : []).slice(0, g.slots);
    g.energy = 0; g.itemsUsed = 0; g.snap = null;
    g.itemRng = makeRng((g.seed ^ 0x9E3779B9 ^ Math.imul(++g.runs, 0x85EBCA6B)) >>> 0);
    g.pillarRng = makeRng((g.seed ^ 0x51ED2701 ^ Math.imul(g.runs, 0x27D4EB2F)) >>> 0); g.pillarWait = 0;   // own RNG: spawn order unaffected
    g.stingRng = makeRng((g.seed ^ 0x2C1B3C6D ^ Math.imul(g.runs, 0x165667B1)) >>> 0);                       // stingers: own RNG too
    g.next = g.mode.pickNext(g);
    spawn(g);
  }
  function spawn(g, out) {
    Ults.between(g, out || []);
    const lv = levelOf(g); if (lv && lv.sting) stingTick(g, lv.sting, out || []);
    curseTick(g, out || []); poisonTick(g, out || []);
    if (lv && lv.heads) regrowTick(g, out || []);
    if (lv && lv.rise) riseTick(g, out || []);
    if (g.mode.pillars) placePillars(g, out);
    const c = Physics.makeCup(g.world, g.next.kind, g.next.tier, Wd.SPAWN.x, Wd.SPAWN.y);
    c.held = true; g.world.cups.push(c); g.held = c;
    g.next = g.mode.pickNext(g);
    g.phase = 'ready';
  }
  const levelOf = (g) => (g.level != null ? CONFIG.levels[g.level] : null);
  function setMode(g, id) { g.mode = Modes[id]; g.level = null; restart(g); }
  // Replay: Levels replay the same level; other modes restart with the given creatures
  function rematch(g, kinds) { if (g.level != null) startLevel(g, g.level); else { setKinds(g, kinds); restart(g); } }
  function startLevel(g, idx) {
    g.mode = Modes.level; g.level = idx; setKinds(g, CONFIG.levels[idx].kinds); restart(g);
  }
  // creatures used this run (index array); takes effect on restart
  function setKinds(g, arr) {
    const k = [...new Set(arr)].filter(i => Number.isInteger(i) && i >= 0 && i < CONFIG.kinds.length).sort((a, b) => a - b);
    g.kinds = k.length ? k : [0]; g.nKinds = g.kinds.length;
  }
  // VP earned this run (0 in Practice)
  function vp(g) {
    if (!g.mode.givesVP) return { fromScore: 0, fromKings: 0, total: 0 };
    const fromScore = Math.floor(g.score / CONFIG.vp.perScore), fromKings = g.kings * CONFIG.vp.kingBonus, coin = eqVal(g, 'coin') || 1;   // Lucky Coin
    return { fromScore, fromKings, total: Math.round((fromScore + fromKings) * coin) };
  }
  const assistOn = (g) => g.assist || g.mode.assistForced || (eqVal(g, 'eye') || 0) >= 3;   // Seer's Eye level 3 = full aim line

  /* ── Checkmate shockwave: push nearby cups outward; shatter nearby pawns ── */
  function shockwave(g, ev, out) {
    const S = CONFIG.shock;
    for (const c of g.world.cups) {
      if (c.held || c.dead) continue;
      const dx = c.x - ev.x, dy = c.y - ev.y, d = Math.hypot(dx, dy);
      if (d >= S.radius) continue;
      if (c.tier === 0 && d < S.shatter) { c.dead = true; out.push({ type: 'shatter', x: c.x, y: c.y, kind: c.kind }); continue; }
      const v = S.push * (1 - d / S.radius), nx = d > 1e-3 ? dx / d : 0, ny = d > 1e-3 ? dy / d : -1;
      c.vx += nx * v; c.vy += ny * v;
    }
    g.world.cups = g.world.cups.filter(c => !c.dead);
    if (g.phase === 'ready' || g.phase === 'flying') { g.phase = g.held ? g.phase : 'flying'; g.settleT = 0; }
    out.push({ type: 'shockwave', x: ev.x, y: ev.y });
  }

  /* ── Rune pillars ── */
  const PL = CONFIG.pillars;
  function placePillars(g, out) {
    const w = g.world, want = PL.count[Math.min(PL.count.length - 1, rampLevel(g))];
    if (g.pillarWait > 0) { g.pillarWait--; return; }
    while (w.pillars.length < want) {
      let spot = null;
      for (let i = 0; i < 40 && !spot; i++) {
        const x = PL.area.x0 + g.pillarRng() * (PL.area.x1 - PL.area.x0), y = PL.area.y0 + g.pillarRng() * (PL.area.y1 - PL.area.y0);
        if (w.cups.some(c => Math.hypot(c.x - x, c.y - y) < c.r + PL.r + PL.gapCup)) continue;
        if (w.pillars.some(p => Math.hypot(p.x - x, p.y - y) < PL.gapPillar)) continue;
        spot = { x, y };
      }
      if (!spot) return;                                        // table too full: try again next shot
      const p = { id: 'p' + (w.nextId++), x: spot.x, y: spot.y, r: PL.r, hp: PL.hp, max: PL.hp };
      w.pillars.push(p); if (out) out.push({ type: 'pillar', x: p.x, y: p.y, id: p.id });
    }
  }
  // free petrified cups within `radius` of (x, y)
  function blastStones(g, x, y, radius, out) {
    for (const c of g.world.cups) if (c.stone && !c.dead && Math.hypot(c.x - x, c.y - y) < radius + c.r) { c.stone = false; out.push({ type: 'unstone', x: c.x, y: c.y, id: c.id, kind: c.kind }); }
  }
  // damage pillars within `radius` of (x, y); broken ones give a bonus and start the respawn wait.
  // Twin guardians (p.guard): only the nearest guardian in range is hit.
  // Hydra heads (p.head): at 0 hp a head is cut (grows back) — or burned for good when `fire` (chain, cluster, checkmate); fire also burns cut stumps.
  function blastPillars(g, x, y, radius, dmg, out, bonus, fire, mate) {
    const w = g.world; if (!w.pillars.length || dmg <= 0) return;
    dmg = Math.round(dmg * (eqVal(g, 'hammer') || 1));                 // Mason's Hammer
    const inRange = (p) => isFinite(p.hp) && Math.hypot(p.x - x, p.y - y) < radius + p.r;   // unbreakable pillars ignore blasts
    const guard = w.pillars.filter(p => p.guard && inRange(p)).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    for (const p of w.pillars) {
      if (!inRange(p) || (p.guard && p !== guard)) continue;
      if (p.head) { hitHead(g, p, dmg, out, bonus, fire); continue; }
      if (p.chimera) { if (!p.down) hitChimera(g, p, dmg, out, bonus, mate); continue; }
      p.hp = Math.max(0, p.hp - dmg);
      out.push({ type: 'pillarhit', x: p.x, y: p.y, id: p.id, dmg, hp: p.hp, guard: !!p.guard });
      if (p.hp === 0) { out.push({ type: 'pillarbreak', x: p.x, y: p.y, id: p.id, guard: !!p.guard }); if (bonus) bonus('pillar', PL.breakBonus, p.x, p.y); g.pillarWait = PL.respawnShots; }
    }
    w.pillars = w.pillars.filter(p => p.hp > 0 || (p.head && !p.burned) || p.chimera);
  }

  /* ── Hydra heads (chapter 4): cut heads grow back; Phoenix fire (chain / cluster / checkmate) burns them for good ── */
  const HY = CONFIG.hydra;
  function hitHead(g, p, dmg, out, bonus, fire) {
    if (p.cut > 0) { if (fire) burnHead(p, out, bonus); return; }       // a stump: only fire matters
    p.hp = Math.max(0, p.hp - dmg);
    out.push({ type: 'pillarhit', x: p.x, y: p.y, id: p.id, dmg, hp: p.hp, head: true });
    if (p.hp > 0) return;
    if (fire) burnHead(p, out, bonus);
    else { p.cut = HY.regrow; out.push({ type: 'headcut', x: p.x, y: p.y, id: p.id, regrow: p.cut }); }
  }
  function burnHead(p, out, bonus) {
    p.burned = true; p.hp = 0; p.cut = 0; out.push({ type: 'headburn', x: p.x, y: p.y, id: p.id });
    if (bonus) bonus('pillar', PL.breakBonus, p.x, p.y);
  }
  function regrowTick(g, out) {                                 // between shots: cut heads count down, then grow back at full health
    for (const p of g.world.pillars) if (p.head && p.cut > 0 && --p.cut === 0) { p.hp = p.max; out.push({ type: 'headgrow', x: p.x, y: p.y, id: p.id }); }
  }
  /* ── Rising water (chapter 4 boss): the danger line climbs every few shots, up to a cap ── */
  const RI = CONFIG.rise;
  function riseTick(g, out) {
    if (!g.shots || g.shots % RI.every || g.lineY <= Wd.LINE_Y - RI.max) return;
    g.lineY = Math.max(Wd.LINE_Y - RI.max, g.lineY - RI.step); out.push({ type: 'rise', y: g.lineY });
  }

  /* ── Finale hazards: lion's roar (pieces slide toward the line), goat's curse (a piece turns to stone) ── */
  const NO_HAZARD = { base: 0 };
  function hazard(g) {                                          // the active hazards { roar, curse, poison, base } (base: shot their count starts from)
    const lv = levelOf(g); if (!lv) return NO_HAZARD;
    const ch = lv.chimera && g.world.pillars.find(p => p.chimera);
    if (ch) { const ph = lv.chimera.phases[ch.phase] || {}; return { roar: ph.roar, curse: ph.curse, poison: ph.poison, base: ch.since }; }   // boss: the current phase's hazard
    return { roar: lv.roar, curse: lv.curse, poison: lv.poison, base: 0 };
  }
  const poisonOf = (g) => hazard(g).poison || [];                // venom pools on the table now [[x, y, r]]
  const inPoison = (P, c) => P.some(([x, y, r]) => Math.hypot(c.x - x, c.y - y) < r);
  function poisonTick(g, out) {                                 // between shots: pieces resting in venom count up; at `life` they drop a tier (a pawn dissolves)
    const P = poisonOf(g), w = g.world;
    w.cups = w.cups.flatMap(c => {
      if (c.held || c.dead) return [c];
      if (c.stone || !P.length || !inPoison(P, c)) { if (c.poison) c.poison = 0; return [c]; }
      if ((c.poison = (c.poison || 0) + 1) < CONFIG.poison.life) return [c];
      if (c.tier === 0) { out.push({ type: 'poisondrop', x: c.x, y: c.y, id: c.id, old: c.id, kind: c.kind, tier: -1 }); return []; }
      const n = Physics.makeCup(w, c.kind, c.tier - 1, c.x, c.y); n.pop = 1;
      out.push({ type: 'poisondrop', x: n.x, y: n.y, id: n.id, old: c.id, kind: n.kind, tier: n.tier }); return [n];
    });
  }
  /* ── The Chimera (finale boss): one health bar per phase; the last phase falls only to a checkmate in reach ── */
  function hitChimera(g, p, dmg, out, bonus, mate) {
    const lv = levelOf(g), hp = lv.chimera.hp, last = p.phase === hp.length - 1;
    const before = p.hp; p.hp = last && mate ? 0 : Math.max(last ? 1 : 0, p.hp - dmg);
    out.push({ type: 'pillarhit', x: p.x, y: p.y, id: p.id, dmg: before - p.hp, hp: p.hp, chimera: true, mateOnly: last && p.hp === 1 && !mate });
    if (p.hp > 0) return;
    if (bonus) bonus('pillar', PL.breakBonus, p.x, p.y);
    if (last) { p.down = true; out.push({ type: 'chimeradown', x: p.x, y: p.y, id: p.id }); return; }
    p.phase++; p.hp = p.max = hp[p.phase]; p.since = g.shots;
    out.push({ type: 'chimeraphase', x: p.x, y: p.y, id: p.id, phase: p.phase });
  }
  const dueAfter = (S, n) => !!S && n >= S.first && (n - S.first) % S.every === 0;   // hazard S strikes after shot n
  function hazardIn(g, key) {                                   // shots until hazard `key` strikes next (1 = after the coming shot), or null
    const h = hazard(g), S = h[key]; if (!S) return null;
    const n = g.shots - h.base; for (let k = 1; k <= S.first + S.every; k++) if (dueAfter(S, n + k)) return k;
    return null;
  }
  const roarDue = (g) => { const h = hazard(g); return g.roarShot !== g.shots && dueAfter(h.roar, g.shots - h.base); };
  function roar(g, out) {                                       // the table has stopped: every piece slides toward the line
    g.roarShot = g.shots;
    for (const c of g.world.cups) if (!c.held && !c.dead) c.vy += CONFIG.roar.push;
    out.push({ type: 'roar', x: Wd.W / 2, y: 0 });
  }
  function curseTick(g, out) {                                  // between shots: the goat's curse turns a random piece to stone
    const h = hazard(g); if (!dueAfter(h.curse, g.shots - h.base)) return;
    const pool = g.world.cups.filter(c => !c.held && !c.dead && !c.stone && c.tier >= CONFIG.curse.minTier);
    if (!pool.length) return;
    const c = pool[Math.floor(g.stingRng() * pool.length)]; c.stone = true; c.sting = 0;
    out.push({ type: 'curse', x: c.x, y: c.y, id: c.id, kind: c.kind, tier: c.tier });
  }

  /* ── Stingers (chapter 3): marked cups drop a tier unless merged in time ── */
  const ST = CONFIG.sting;
  // between shots: count down stung cups (dropping those at 0), then sting a new cup every `every` shots from shot `first`
  function stingTick(g, S, out) {
    const w = g.world;
    w.cups = w.cups.map(c => {
      if (!c.sting || c.dead || --c.sting > 0) return c;
      const n = Physics.makeCup(w, c.kind, Math.max(0, c.tier - 1), c.x, c.y); n.pop = 1;   // stung cups are tier ≥ 1, so a drop never removes one
      out.push({ type: 'stingdrop', x: n.x, y: n.y, id: n.id, old: c.id, kind: n.kind, tier: n.tier });
      return n;
    });
    if (g.shots < S.first || (g.shots - S.first) % S.every) return;
    const pool = w.cups.filter(c => !c.held && !c.dead && !c.stone && !c.sting && c.tier >= ST.minTier);
    if (!pool.length) return;
    const c = pool[Math.floor(g.stingRng() * pool.length)]; c.sting = ST.life;
    const from = w.pillars.filter(p => p.guard).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];   // the nearer guardian stings; else from the far edge
    out.push({ type: 'sting', x: c.x, y: c.y, id: c.id, kind: c.kind, tier: c.tier, from: from ? { x: from.x, y: from.y } : { x: c.x, y: 0 } });
  }

  /* ── Equipment (passive, modes with equip: true = Classic and Proving Grounds) ── */
  const EQ = CONFIG.equip;
  // effect value of worn equipment `id` (null when not worn or the mode takes no equipment)
  function eqVal(g, id) {
    const lv = g.mode.equip ? g.eq[id] || 0 : 0; if (!lv) return null;
    return EQ.defs.find(d => d.id === id).val[lv - 1];
  }
  const setFeatures = (g, f) => { g.features = { items: !!f.items, ults: !!f.ults }; };
  const setEquip = (g, eq) => { g.eq = Object.assign({}, eq || {}); };

  /* ── Creature ultimates: src/core/ults.js (Ults) ── */
  Ults.bind({ blastPillars, blastStones, eqVal });

  /* ── Level goals ── */
  // progress toward the level goal, counted from this frame's events
  function tallyGoal(g, evs) {
    const lv = levelOf(g); if (!lv) return;
    const G = lv.goal;
    for (const e of evs) {
      if (G.type === 'make' && e.type === 'merge' && e.tier >= G.tier && (G.kind == null || e.kind === G.kind)) g.prog++;
      else if (G.type === 'chain' && e.type === 'merge' && e.combo >= (G.combo || 2)) g.prog++;
      else if (G.type === 'cluster' && (e.type === 'merge' || e.type === 'checkmate') && e.n >= CONFIG.cluster.min) g.prog++;
      else if (G.type === 'bank' && e.type === 'bonus' && e.id === 'bank') g.prog++;
      else if (G.type === 'pillars' && e.type === 'pillarbreak') g.prog++;
      else if (G.type === 'checkmate' && e.type === 'checkmate') g.prog++;
      else if (G.type === 'free' && e.type === 'unstone') g.prog++;
      else if (G.type === 'guardians' && e.type === 'pillarbreak' && e.guard) g.prog++;
      else if (G.type === 'heads' && e.type === 'headburn') g.prog++;
      else if (G.type === 'chimera' && (e.type === 'chimeraphase' || e.type === 'chimeradown')) g.prog++;
    }
  }
  // { have, need } for the HUD and the win check (null outside Levels)
  function goalProgress(g) {
    const lv = levelOf(g); if (!lv) return null;
    if (lv.goal.type === 'kings') { const ks = lv.goal.kinds || lv.kinds; return { have: ks.filter(k => g.kingKinds.includes(k)).length, need: ks.length }; }
    if (lv.goal.type === 'guardians') return { have: Math.min(g.prog, (lv.guards || []).length), need: (lv.guards || []).length };
    if (lv.goal.type === 'chimera') return { have: Math.min(g.prog, lv.chimera.hp.length), need: lv.chimera.hp.length };
    if (lv.goal.type === 'heads') return { have: Math.min(g.prog, (lv.heads || []).length), need: (lv.heads || []).length };
    return { have: Math.min(g.prog, lv.goal.n), need: lv.goal.n };
  }
  const starsFor = (lv, shots) => (shots <= lv.stars[0] ? 3 : shots <= lv.stars[1] ? 2 : 1);

  /* ── Difficulty ramp ── */
  const RP = CONFIG.ramp;
  const rampLevel = (g) => (g.mode.ramp ? Math.min(RP.maxLevel, Math.floor(g.score / RP.every)) : 0);
  const rampT = (g) => rampLevel(g) / RP.maxLevel;                     // 0..1
  function spawnCum(g) {
    const k = rampT(g), lv = levelOf(g), base = (lv && lv.cum) || CONFIG.nextTierCum, cum = base.map((c, i) => c + (RP.cumMax[i] - c) * k);
    const sc = eqVal(g, 'scepter'); if (sc) { cum[0] = Math.min(0.95, cum[0] + sc); for (let i = 1; i < cum.length; i++) cum[i] = Math.max(cum[i], cum[i - 1]); }   // King's Sceptre: more pawns
    return cum;
  }
  const dangerTime = (g) => R.DANGER_T + (RP.dangerMin - R.DANGER_T) * rampT(g) + (eqVal(g, 'scale') || 0);

  /* ── Items ── */
  const IT = CONFIG.items, itemIds = IT.defs.map(d => d.id);
  const itemsOn = (g) => g.mode.items === 'fixed' || (g.features.items && (g.mode.items === 'earn' || g.mode.items === 'free'));
  const itemSlots = (g) => (!itemsOn(g) ? [] : g.mode.items === 'free' ? itemIds.slice() : g.items);   // items shown in the item bar
  function canUse(g, id) {
    if ((g.phase !== 'ready' && g.phase !== 'flying') || g.drag || !itemSlots(g).includes(id)) return false;
    const h = g.held;
    switch (id) {
      case 'upgrade': return g.phase === 'ready' && !!h && h.tier < IT.upgradeMax;
      case 'wild':    return g.phase === 'ready' && !!h && !h.wild;
      case 'undo':    return !!g.snap;
    }
    return false;
  }
  // use an item; returns events (null if not usable)
  function useItem(g, id) {
    if (!canUse(g, id)) return null;
    const w = g.world, ev = [{ type: 'item', id }], h = g.held;
    if (g.mode.items !== 'free') g.items.splice(g.items.indexOf(id), 1);
    g.itemsUsed++;
    if (id === 'upgrade') {
      const n = Physics.makeCup(w, h.kind, h.tier + 1, h.x, h.y); n.held = true; n.wild = h.wild; n.ult = h.ult; n.pop = 1;
      w.cups[w.cups.indexOf(h)] = n; g.held = n; ev.push({ type: 'upgrade', x: n.x, y: n.y, kind: n.kind, tier: n.tier });
    } else if (id === 'wild') {
      h.wild = true; ev.push({ type: 'wild', x: h.x, y: h.y });
    } else if (id === 'undo') {
      const s = g.snap; g.snap = null;
      w.cups = s.cups.map(c => ({ ...c })); w.events.length = 0; w.acc = 0; w.nextId = Math.max(w.nextId, s.nextId);
      g.score = s.score; g.kings = s.kings; g.kingKinds = s.kingKinds.slice(); g.shotMerges = 0; g.next = { ...s.next };
      g.rng.set(s.rng); g.itemRng.set(s.irng); g.energy = s.energy;
      w.pillars = s.pillars.map(p => ({ ...p })); g.pillarRng.set(s.prng); g.stingRng.set(s.srng); g.pillarWait = s.pwait; g.lineY = s.lineY; g.roarShot = s.roarShot; g.shots = s.shots; g.prog = s.prog; g.ult = s.ult.slice(); g.armed = s.armed; g.pools = s.pools.map(q => ({ ...q })); g.proj = null; g.gather = null;
      if (g.mode.items !== 'free') { g.items = s.items.slice(); const i = g.items.indexOf('undo'); if (i >= 0) g.items.splice(i, 1); }
      const k = w.cups.find(c => c.id === s.heldId);
      k.x = Wd.SPAWN.x; k.y = Wd.SPAWN.y; k.vx = k.vy = 0; k.held = true; k.pop = 0;
      g.held = k; g.phase = 'ready'; g.drag = null; g.shot = null; g.rampLv = rampLevel(g); g.settleT = 0; g.dangerT = 0;
    }
    award(g, ev);
    return ev;
  }
  // energy full → give a random item (held while the bag is full, paid when a slot frees)
  function award(g, out) {
    if (g.mode.items !== 'earn' || !itemsOn(g)) return;
    while (g.energy >= IT.energyCost && g.items.length < IT.slots) {
      g.energy -= IT.energyCost;
      const id = itemIds[Math.floor(g.itemRng() * itemIds.length)];
      g.items.push(id); out.push({ type: 'itemget', id });
    }
    if (g.items.length >= IT.slots) g.energy = Math.min(g.energy, IT.energyCost);
  }

  /* ── Launch: finger speed → cup speed (curve amplifies hard flicks) ── */
  function estimateV(g) {
    const d = g.drag;
    if (!d || d.hist.length < 2) return { vx: 0, vy: 0 };
    const a = d.hist[0], b = d.hist[d.hist.length - 1];
    const dt = Math.max((b.t - a.t) / 1000, 0.02);
    const fx = (b.x - a.x) / dt, fy = (b.y - a.y) / dt, sp = Math.hypot(fx, fy);
    if (sp < 1e-6) return { vx: 0, vy: 0 };
    const out = sp <= P.KNEE ? sp * P.GAIN : P.KNEE * P.GAIN + (sp - P.KNEE) * P.GAIN_HI;
    return { vx: fx / sp * out, vy: fy / sp * out };
  }
  function clampV(v) {
    const sp = Math.hypot(v.vx, v.vy);
    if (sp > P.VMAX) { const f = P.VMAX / sp; return { vx: v.vx * f, vy: v.vy * f }; }
    return v;
  }
  const launchV = (g) => clampV(estimateV(g));

  function beginDrag(g, wx, wy, pid, t) {
    if (g.phase !== 'ready' || !g.held || g.drag) return false;
    if (wy < Wd.LINE_Y - R.GRAB_MARGIN) return false;
    let ox = g.held.x - wx, oy = g.held.y - wy;
    const m = Math.hypot(ox, oy);
    if (m > R.GRAB_OFFSET_MAX) { ox *= R.GRAB_OFFSET_MAX / m; oy *= R.GRAB_OFFSET_MAX / m; }
    g.drag = { id: pid, ox, oy, hist: [{ t, x: g.held.x, y: g.held.y }] };
    return true;
  }
  // returns 'launched' | 'returned' | null
  function dragTo(g, wx, wy, pid, t) {
    const d = g.drag;
    if (!d || pid !== d.id || !g.held) return null;
    const h = g.held;
    const x = Math.max(h.r, Math.min(Wd.W - h.r, wx + d.ox));
    const y = Math.min(Wd.H - h.r, wy + d.oy);
    h.x = x; h.y = y;
    d.hist.push({ t, x, y });
    while (d.hist.length > 2 && t - d.hist[0].t > P.HIST_MS) d.hist.shift();
    if (y < Wd.LINE_Y) {                         // crossed the line: launch or return
      const v = launchV(g);
      if (Math.hypot(v.vx, v.vy) < P.VMIN) { h.y = Wd.LINE_Y + 10; g.drag = null; return 'returned'; }
      g.snap = { cups: g.world.cups.map(c => ({ ...c })), nextId: g.world.nextId, score: g.score, kings: g.kings, kingKinds: g.kingKinds.slice(),
                 next: { ...g.next }, rng: g.rng.get(), irng: g.itemRng.get(), pillars: g.world.pillars.map(p => ({ ...p })), prng: g.pillarRng.get(), srng: g.stingRng.get(), pwait: g.pillarWait, lineY: g.lineY, roarShot: g.roarShot, shots: g.shots, prog: g.prog, ult: g.ult.slice(), armed: g.armed, pools: g.pools.map(q => ({ ...q })), energy: g.energy, items: g.items.slice(), heldId: h.id };   // for Undo
      h.vx = v.vx; h.vy = v.vy; h.held = false;
      Ults.launch(g, h);                                        // enchanted shot
      g.held = null; g.drag = null; g.phase = 'flying'; g.shotMerges = 0; g.settleT = 0; g.shots++;
      g.shot = { id: h.id, x0: h.x, y0: h.y, walls: 0, done: false };   // for skill bonuses
      return 'launched';
    }
    return null;
  }
  function endDrag(g, pid) { if (g.drag && g.drag.id === pid) g.drag = null; }

  /* ── Per-frame update. Returns this frame's events (for effects, sound, UI) ── */
  function update(g, dt) {
    const out = [];
    if (g.phase === 'over' || g.phase === 'won') return out;
    const w = g.world;
    Ults.pre(g, dt, out);
    Physics.advance(w, dt);
    if (g.held && !w.cups.includes(g.held)) g.held = null;
    for (const c of w.cups) if (c.pop > 0) c.pop = Math.max(0, c.pop - dt / 0.35);

    if (g.held && !g.drag) {                      // finger released → glide back to the middle
      const k = Math.min(1, dt * R.RETURN_RATE);
      g.held.x += (Wd.SPAWN.x - g.held.x) * k; g.held.y += (Wd.SPAWN.y - g.held.y) * k;
    }

    let gainE = Ults.post(g, out), frameMerges = 0; const madeIds = new Set();
    const B = CONFIG.bonus, bonus = (id, gain, x, y) => { g.score += gain; gainE += gain; out.push({ type: 'bonus', id, gain, x, y }); };
    for (const ev of w.events) {                  // physics events → scoring
      if (ev.type === 'wall' && g.shot && ev.id === g.shot.id) g.shot.walls++;
      if (ev.type === 'merge' || ev.type === 'checkmate') {          // double: another, separate pair merging in the same frame (not a chain product)
        const chained = ev.ids.some(id => madeIds.has(id));
        if (frameMerges++ > 0 && !chained) bonus('double', B.double, ev.x, ev.y);
        if (ev.id) madeIds.add(ev.id);
      }
      if (ev.type === 'merge') {
        g.shotMerges++;
        if (ev.tier === TOP) { g.kings++; if (!g.kingKinds.includes(ev.kind)) g.kingKinds.push(ev.kind); }
        ev.combo = g.shotMerges;
        ev.gain = Math.round(CONFIG.scoring.base * Math.pow(2, ev.tier) * g.shotMerges * (ev.n >= CONFIG.cluster.min ? ev.n : 1));   // cluster: × cups absorbed
        g.score += ev.gain; gainE += ev.gain;
        const amt = ev.tier * U.perTier * (ev.n >= CONFIG.cluster.min ? ev.n - 1 : 1);
        Ults.charge(g, ev.kind, amt, out);
        for (const k of Ults.kindsIn(g)) if (k !== ev.kind) Ults.charge(g, k, amt * U.share, out);   // shared charge: any merge helps every portrait a little
        blastPillars(g, ev.x, ev.y, PL.blast[ev.tier], (ev.tier + 1) * (ev.n >= CONFIG.cluster.min ? ev.n - 1 : 1), out, bonus, ev.combo >= 2 || ev.n >= CONFIG.cluster.min);   // fire: chain or cluster
        blastStones(g, ev.x, ev.y, PL.blast[ev.tier], out);
      } else if (ev.type === 'checkmate') {
        blastPillars(g, ev.x, ev.y, CONFIG.shock.radius, PL.hp, out, bonus, true, true); Ults.charge(g, ev.kind, U.full / 2, out);
        blastStones(g, ev.x, ev.y, CONFIG.shock.radius, out);
        ev.gain = CONFIG.scoring.checkmate * (ev.n >= CONFIG.cluster.min ? ev.n - 1 : 1); g.score += ev.gain; gainE += ev.gain;
        shockwave(g, ev, out);
      }
      out.push(ev);
      const sh = g.shot;                          // skill bonuses: only the launched cup's first merge counts
      if (sh && !sh.done && (ev.type === 'merge' || ev.type === 'checkmate') && ev.ids.includes(sh.id)) {
        sh.done = true;
        if (sh.walls > 0) bonus('bank', Math.round(ev.gain * B.bank), ev.x, ev.y);
        if (Math.hypot(ev.x - sh.x0, ev.y - sh.y0) >= B.longDist) bonus('long', Math.round(ev.gain * B.long), ev.x, ev.y);
      }
    }
    w.events.length = 0;
    if (gainE && g.mode.items === 'earn') { g.energy += gainE; award(g, out); }
    const lv = rampLevel(g); if (lv > g.rampLv) { g.rampLv = lv; g.pillarWait = 0; out.push({ type: 'rampup', level: lv }); }

    tallyGoal(g, out);
    const gp = goalProgress(g);
    if (gp && gp.have >= gp.need) {                             // goal reached → level cleared
      g.stars = starsFor(levelOf(g), g.shots);
      g.phase = 'won'; out.push({ type: 'levelclear', level: g.level, score: g.score, shots: g.shots, stars: g.stars });
      return out;
    }

    if (g.phase === 'flying') {                   // once everything stops, spawn the next cup
      if (!Physics.isMoving(w)) {
        g.settleT += dt;
        const lim = levelOf(g) && levelOf(g).shotLimit;
        if (g.settleT > R.SETTLE_T && lim && g.shots >= lim) { g.phase = 'over'; g.endReason = 'shots'; out.push({ type: 'gameover', score: g.score, reason: 'shots' }); return out; }
        if (g.settleT > R.SETTLE_T && roarDue(g)) { g.settleT = 0; roar(g, out); }   // finale: the lion roars once the table has stopped; the next cup comes after
        else if (g.settleT > R.SETTLE_T) { g.settleT = 0; spawn(g, out); out.push({ type: 'spawn' }); }
      } else g.settleT = 0;
    }

    const danger = w.cups.some(c => Physics.isSettled(c) && c.y > g.lineY);   // a stopped cup inside the line (g.lineY = LINE_Y unless the water rose)
    if (danger) g.dangerT += dt; else g.dangerT = Math.max(0, g.dangerT - dt * 2);
    if (g.danger === 'lose') {
      if (g.dangerT >= dangerTime(g)) { g.phase = 'over'; out.push({ type: 'gameover', score: g.score }); }
    } else if (g.dangerT > R.FADE_T) {            // Practice: cups inside the line fade away, no penalty
      for (const c of w.cups) if (Physics.isSettled(c) && c.y > g.lineY) { c.dead = true; out.push({ type: 'fade', x: c.x, y: c.y }); }
      w.cups = w.cups.filter(c => !c.dead);
      g.dangerT = 0;
    }
    return out;
  }

  return { create, restart, setMode, startLevel, rematch, setKinds, vp, update, goalProgress, levelOf, starsFor, armUlt: Ults.arm, ultKinds: Ults.kindsIn, ultReady: Ults.ready, ultOf: Ults.ultOf, ultPreview: Ults.preview, hazardIn, poisonOf, setFeatures, setEquip, eqVal, beginDrag, dragTo, endDrag, estimateV, launchV, assistOn, itemSlots, canUse, useItem, rampLevel, spawnCum, dangerTime };
})();
