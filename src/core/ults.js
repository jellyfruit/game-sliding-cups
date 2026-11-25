/* Kings of Cups — src/core/ults.js
 * CORE · Ults: creature ultimates — gauge, arming, casting, per-frame effects and between-shot ticks.
 * Theme (David, 2026-11-25): every ultimate TRANSFORMS pieces into the caster's creature (each keeps its own tier);
 * each one moves or picks those pieces differently. All numbers live in CONFIG.ults.
 * Depends on: CONFIG, Physics; Game helpers handed over once with Ults.bind (blastPillars, blastStones, eqVal).
 * Must not touch: the DOM, the save, the screen. Only Game calls it (Classic / Proving Grounds; never Story).
 */
'use strict';

/* ───────── ULTS (no DOM) ───────── */
const Ults = (() => {
  const U = CONFIG.ults;
  let H = null;                                                 // Game helpers (set by Game at load)
  const bind = (h) => { H = h; };

  /* ── Gauge and arming ── */
  const ultOf = (k) => U.kinds[k] || null;
  const kindsIn = (g) => (g.features.ults && g.mode.ults && g.mode.ults !== 'none' ? g.kinds.filter(ultOf) : []);   // portraits shown in the tray
  const fullOf = (k) => U.full * ((U.fullK && U.fullK[k]) || 1);   // charge a creature's gauge needs (Chimera: longer, a true super ultimate)
  const ready = (g, k) => kindsIn(g).includes(k) && g.ult[k] >= fullOf(k);
  function reset(g) { g.ult = CONFIG.kinds.map((K, k) => (g.mode.ults === 'free' ? fullOf(k) : 0)); g.armed = null; g.proj = null; g.pools = []; g.gather = null; }
  // tap a portrait: arm (enchant the held cup) or disarm; returns events or null
  function arm(g, k) {
    if (g.phase !== 'ready' || !g.held || g.drag) return null;
    if (g.armed === k) { g.armed = null; g.held.ult = null; return [{ type: 'ultarm', kind: k, on: false }]; }
    if (!ready(g, k)) return null;
    g.armed = k; g.held.ult = k; return [{ type: 'ultarm', kind: k, on: true }];
  }
  function charge(g, kind, amount, out) {
    if (g.mode.ults !== 'charge' || !g.features.ults || !ultOf(kind)) return;
    const before = g.ult[kind]; g.ult[kind] = Math.min(fullOf(kind), before + amount * (H.eqVal(g, 'grail') || 1));
    if (before < fullOf(kind) && g.ult[kind] >= fullOf(kind)) out.push({ type: 'ultready', kind });
  }
  // the enchanted cup leaves the hand: the gauge is spent. Most fire on the cup's first piece/pillar hit, merge or stop;
  // AT_LAUNCH ones fire as it leaves the hand (next frame, before physics)
  const AT_LAUNCH = { rebirth: 1, flyover: 1, gaze: 1, pierce: 1, three: 1 };
  function launch(g, h) {
    if (h.ult == null) return;
    g.proj = { id: h.id, kind: h.ult, now: !!AT_LAUNCH[ultOf(h.ult)] }; g.ult[h.ult] = g.mode.ults === 'free' ? fullOf(h.ult) : 0; g.armed = null;
  }

  /* ── Transform: the shared core of every ultimate ── */
  const live = (c) => !c.held && !c.dead;
  // piece c becomes creature `kind` (own tier); stone falls away. Returns true when it changed.
  function transform(c, kind, out) {
    if (c.gaze) return false;                                   // Stone Gaze: stays stone until its gaze ends
    if (c.stone) { c.stone = false; out.push({ type: 'unstone', x: c.x, y: c.y, id: c.id, kind: c.kind }); }
    if (c.kind === kind && !c.wild) return false;
    c.kind = kind; c.wild = false; out.push({ type: 'convert', x: c.x, y: c.y, id: c.id, kind }); return true;
  }

  /* ── Casting ── */
  // the enchanted cup fires on its first cup hit, pillar hit, merge, or when it stops (wall bounces don't count)
  function checkProjectile(g, out) {
    const P = g.proj; if (!P) return 0;
    const w = g.world, c = w.cups.find(q => q.id === P.id);
    let at = null, made = null;
    for (const ev of w.events) {
      if ((ev.type === 'merge' || ev.type === 'checkmate') && ev.ids.includes(P.id)) { at = { x: ev.x, y: ev.y }; made = ev.id; break; }
      if ((ev.type === 'hit' && (ev.a === P.id || ev.b === P.id)) || (ev.type === 'wall' && ev.pillar && ev.id === P.id)) at = c ? { x: c.x, y: c.y } : { x: ev.x, y: ev.y };
    }
    if (!at && c && !c.vx && !c.vy) at = { x: c.x, y: c.y };
    if (!at && !c) { g.proj = null; return 0; }               // gone without firing
    if (!at) return 0;
    g.proj = null;
    return cast(g, P.kind, at, made ? null : c, made, out);    // a merge already used up the enchanted cup; its result is spared from the push
  }
  function cast(g, kind, at, cup, keepId, out) {
    const w = g.world, name = ultOf(kind);
    out.push({ type: 'ultimate', kind, ult: name, x: at.x, y: at.y });
    if (name === 'fireball') dragonfire(g, kind, at, cup, keepId, out);
    else if (name === 'holy') holyLight(g, kind, at, out);
    else if (name === 'venom') venomPool(g, kind, at, cup, out);
    else if (name === 'rebirth') rebirth(g, kind, cup, out);
    else if (name === 'flyover') flyOver(g, kind, cup, out);
    else if (name === 'gaze') stoneGaze(g, kind, cup, out);
    else if (name === 'pierce') pierce(g, kind, cup, out);
    else if (name === 'three') threeHeads(g, kind, cup, out);
    w.cups = w.cups.filter(c => !c.dead);
    if (g.phase === 'ready' && !g.held) g.phase = 'flying';
    g.settleT = 0; return 0;
  }
  // 🐉 Dragonfire: pieces in the radius become dragons, then the blast pushes them gently outward to bounce and meet
  function dragonfire(g, kind, at, cup, keepId, out) {
    const F = U.fireball, w = g.world; if (cup) cup.dead = true;
    for (const c of w.cups) {
      if (!live(c)) continue;
      const dx = c.x - at.x, dy = c.y - at.y, d = Math.hypot(dx, dy);
      if (d >= F.radius + c.r * 0.5) continue;
      transform(c, kind, out);
      if (c.id === keepId) continue;
      const v = F.push * (F.pushMin + (1 - F.pushMin) * Math.max(0, 1 - d / F.radius)), nx = d > 1e-3 ? dx / d : 0, ny = d > 1e-3 ? dy / d : -1;
      c.vx += nx * v; c.vy += ny * v;
    }
    H.blastPillars(g, at.x, at.y, F.radius, F.pillarDmg, out, null);
  }
  // 🦄 Holy Light: cups around turn into unicorns and are drawn together (applyGather)
  function holyLight(g, kind, at, out) {
    const Hc = U.holy;
    for (const c of g.world.cups) {
      if (!live(c) || c.stone || Math.hypot(c.x - at.x, c.y - at.y) >= Hc.radius + c.r * 0.5) continue;
      if (c.kind !== kind || c.wild) out.push({ type: 'convert', x: c.x, y: c.y, id: c.id, kind });
      c.kind = kind; c.wild = false;
    }
    g.gather = { x: at.x, y: at.y, r: Hc.radius * 1.4, t: Hc.gatherT, kind };
  }
  function applyGather(g, dt) {                                // holy light: converted cups are drawn to the centre (griffin's roar: only G.ids)
    const G = g.gather, Hc = U.holy;
    for (const c of g.world.cups) {
      if (!live(c) || c.air || c.kind !== G.kind || (G.ids && !G.ids.includes(c.id))) continue;
      const dx = G.x - c.x, dy = G.y - c.y, d = Math.hypot(dx, dy); if (d > G.r || d < 1) continue;
      c.vx += dx / d * Hc.accel * dt; c.vy += dy / d * Hc.accel * dt;
      const sp = Math.hypot(c.vx, c.vy); if (sp > Hc.vmax) { c.vx *= Hc.vmax / sp; c.vy *= Hc.vmax / sp; }
    }
    G.t -= dt; if (G.t <= 0) g.gather = null;
  }
  // 🐍 Venom Pool: stays `shots` shots; any piece touching it becomes a hydra (also checked every frame by poolContact)
  function venomPool(g, kind, at, cup, out) {
    const V = U.venom; if (cup) cup.dead = true;
    const pool = { x: at.x, y: at.y, r: V.radius, shots: V.shots, kind };
    g.pools.push(pool); poolContact(g, out);
    H.blastPillars(g, pool.x, pool.y, pool.r, V.pillarDmg, out, null);
  }
  function poolContact(g, out) {
    for (const q of g.pools) for (const c of g.world.cups)
      if (live(c) && Math.hypot(c.x - q.x, c.y - q.y) < q.r + c.r) transform(c, q.kind, out);
  }

  // 🔥 Rebirth: every piece below or near the danger line flies up to a free spot in the upper table as a phoenix
  function rebirth(g, kind, cup, out) {
    const Rb = U.rebirth, w = g.world;
    const lift = w.cups.filter(c => live(c) && !c.air && c !== cup && c.y + c.r > g.lineY - Rb.near).sort((a, b) => b.tier - a.tier || a.id - b.id);
    const taken = w.cups.filter(c => live(c) && c !== cup && !lift.includes(c)).map(c => ({ x: c.x, y: c.y, r: c.r })).concat(w.pillars.map(p => ({ x: p.x, y: p.y, r: p.r })));
    for (const c of lift) {
      const s = freeSpot(c.r, taken, Rb.area, Rb.step); taken.push({ x: s.x, y: s.y, r: c.r });
      transform(c, kind, out); fly(c, s.x, s.y, Rb.flyT, Rb.arc, kind, false);
    }
  }
  // the most open spot for a piece of radius r inside `area` (grid search, deterministic): largest gap to everything taken
  function freeSpot(r, taken, A, step) {
    const W = CONFIG.world.W; let best = null, bestGap = -Infinity;
    for (let y = Math.max(A.y0, r); y <= A.y1; y += step) for (let x = Math.max(A.x0, r); x <= Math.min(A.x1, W - r); x += step) {
      let gap = Infinity; for (const t of taken) gap = Math.min(gap, Math.hypot(t.x - x, t.y - y) - t.r - r);
      if (gap > bestGap) { bestGap = gap; best = { x, y }; }
    }
    return best;
  }
  // 🦅 Fly Over: the cup flies over everything to the aimed end point, lands as a griffin, and its roar turns the nearest pieces
  function flyOver(g, kind, cup, out) {
    if (!cup) return;
    const F = U.flyover, e = flyTarget(g, cup, { vx: cup.vx, vy: cup.vy }), d = Math.hypot(e.x - cup.x, e.y - cup.y);
    transform(cup, kind, out); fly(cup, e.x, e.y, Math.max(F.minT, Math.min(F.maxT, d / F.speed)), F.arc, kind, true);
  }
  // where a griffin shot lands: the aim line's end point ignoring pieces and pillars, kept above the danger line
  function flyTarget(g, c, v) {
    const pts = Physics.predictPath(c, v, null, g.world.sand, g.world.current), e = pts[pts.length - 1];
    return { x: e.x, y: Math.min(e.y, g.lineY - c.r - U.flyover.lineGap) };
  }
  function roar(g, c, kind, out) {                             // griffin lands: the nearest pieces turn and are drawn to it
    const F = U.flyover, near = g.world.cups.filter(q => live(q) && !q.air && q !== c && !q.gaze).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y)).slice(0, F.near);
    for (const q of near) transform(q, kind, out);
    if (near.length) g.gather = { x: c.x, y: c.y, r: Infinity, t: F.pullT, kind, ids: near.map(q => q.id) };
  }

  // 🐍 Stone Gaze: pieces in a cone ahead of the launch turn to stone for `shots` shots (walls for bank shots, no merging,
  // not freed early by anything), then the stone falls away and each is a basilisk. The flicked cup goes on as a normal shot.
  const unit = (v) => { const s = Math.hypot(v.vx, v.vy) || 1; return { x: v.vx / s, y: v.vy / s }; };
  const inCone = (C, c) => { const dx = c.x - C.x, dy = c.y - C.y, d = Math.hypot(dx, dy); if (d < 1 || d > C.range + c.r) return false;
    return Math.acos(Math.max(-1, Math.min(1, (dx * C.dx + dy * C.dy) / d))) <= C.angle + Math.asin(Math.min(1, c.r / d)); };
  const coneOf = (c, v) => { const G = U.gaze, u = unit(v); return { x: c.x, y: c.y, dx: u.x, dy: u.y, angle: G.angle * Math.PI / 180, range: G.range }; };
  function stoneGaze(g, kind, cup, out) {
    if (!cup) return;
    const C = coneOf(cup, { vx: cup.vx, vy: cup.vy });
    for (const c of g.world.cups) if (live(c) && !c.air && c !== cup && !c.gaze && inCone(C, c)) {
      c.stone = true; c.gaze = g.shots + U.gaze.shots; c.gazeKind = kind; c.sting = 0;
      out.push({ type: 'petrify', x: c.x, y: c.y, id: c.id, kind: c.kind });
    }
  }
  function gazeTick(g, out) {                                  // between shots: gazes that are over crumble into basilisks
    for (const c of g.world.cups) if (c.gaze && g.shots >= c.gaze) { c.gaze = 0; transform(c, c.gazeKind, out); }
  }
  // 🦂 Piercing Sting: the cup becomes a sting flying straight along the aim through every piece (each becomes a scorpion man)
  // until a wall or pillar stops it; there it stays as a scorpion man of its own tier
  function pierce(g, kind, cup, out) {
    if (!cup) return;
    const u = unit({ vx: cup.vx, vy: cup.vy }); transform(cup, kind, out);
    cup.air = { pierce: true, dx: u.x, dy: u.y, kind }; cup.vx = cup.vy = 0; cup.z = U.pierce.z;
  }
  // one step of a sting from (x, y): returns { x, y, stop }; stops touching a wall or a pillar
  function stingStep(g, c, x, y, dx, dy, len) {
    const W = CONFIG.world.W, Hh = CONFIG.world.H; let stop = false;
    const kx = dx < 0 ? (x - c.r) / -dx : dx > 0 ? (W - c.r - x) / dx : Infinity, ky = dy < 0 ? (y - c.r) / -dy : dy > 0 ? (Hh - c.r - y) / dy : Infinity, k = Math.max(0, Math.min(kx, ky));
    if (k <= len) { len = k; stop = true; }
    for (const p of g.world.pillars) {                         // first contact with a pillar along the step
      const fx = x - p.x, fy = y - p.y, rr = c.r + p.r, b = fx * dx + fy * dy, q = fx * fx + fy * fy - rr * rr;
      if (q < 0) { if (b < 0) { len = 0; stop = true; } continue; }
      const disc = b * b - q; if (disc < 0) continue;
      const t = -b - Math.sqrt(disc); if (t >= 0 && t <= len) { len = t; stop = true; }
    }
    return { x: x + dx * len, y: y + dy * len, stop };
  }
  function stingEnd(g, c, dx, dy) { let x = c.x, y = c.y; for (let i = 0; i < 400; i++) { const s = stingStep(g, c, x, y, dx, dy, 8); x = s.x; y = s.y; if (s.stop) break; } return { x, y }; }
  // 🦁 Three Heads: the cup splits into three chimeras fanning left / centre / right; each head that touches a piece becomes
  // that piece's creature and tier and merges with it at once; a head that touches nothing stops as a chimera of its own tier
  function threeHeads(g, kind, cup, out) {
    if (!cup) return;
    const T = U.three, a = T.spread * Math.PI / 180, sp = Math.hypot(cup.vx, cup.vy), u = unit({ vx: cup.vx, vy: cup.vy });
    transform(cup, kind, out); cup.mimic = true;
    for (const s of [-1, 1]) {
      const ca = Math.cos(a * s), sa = Math.sin(a * s), vx = (u.x * ca - u.y * sa) * sp * T.speedK, vy = (u.x * sa + u.y * ca) * sp * T.speedK;
      const h = Physics.makeCup(g.world, kind, cup.tier, cup.x, cup.y); h.vx = vx; h.vy = vy; h.mimic = true; h.pop = 1;
      g.world.cups.push(h); out.push({ type: 'split', x: h.x, y: h.y, id: h.id, kind });
    }
  }

  /* ── Carried pieces (Physics skips `air` cups): flights along an arc, stings in a straight line ── */
  function fly(c, tx, ty, T, arc, kind, roars) { c.air = { x0: c.x, y0: c.y, tx, ty, t: 0, T, arc, kind, roars }; c.vx = c.vy = 0; c.z = 0; }
  function flights(g, dt, out) {
    for (const c of g.world.cups) {
      const A = c.air; if (!A || c.dead) continue;
      if (A.pierce) { stingFly(g, c, A, dt, out); continue; }
      A.t += dt; const u = Math.min(1, A.t / A.T), e = u * u * (3 - 2 * u);
      c.x = A.x0 + (A.tx - A.x0) * e; c.y = A.y0 + (A.ty - A.y0) * e; c.z = Math.sin(Math.PI * u) * A.arc;
      if (u < 1) continue;
      c.air = null; c.z = 0; c.pop = 1;
      out.push({ type: 'ultland', kind: A.kind, ult: ultOf(A.kind), x: c.x, y: c.y, id: c.id, roar: A.roars });
      if (A.roars) roar(g, c, A.kind, out);
    }
  }

  function stingFly(g, c, A, dt, out) {
    let left = U.pierce.speed * dt, s = null;
    while (left > 0) {
      s = stingStep(g, c, c.x, c.y, A.dx, A.dy, Math.min(8, left)); c.x = s.x; c.y = s.y; left -= 8;
      for (const q of g.world.cups) if (q !== c && live(q) && !q.air && Math.hypot(q.x - c.x, q.y - c.y) < q.r + c.r) transform(q, A.kind, out);
      if (s.stop) break;
    }
    if (!s || !s.stop) return;
    c.air = null; c.z = 0; c.pop = 1; out.push({ type: 'ultland', kind: A.kind, ult: ultOf(A.kind), x: c.x, y: c.y, id: c.id, roar: false });
  }

  /* ── Hooks called by Game ── */
  // before physics each frame: cast launch-time ultimates, pull (Holy Light / roar), carry flying pieces
  function pre(g, dt, out) {
    const P = g.proj;
    if (P && P.now) { g.proj = null; const c = g.world.cups.find(q => q.id === P.id); if (c) cast(g, P.kind, { x: c.x, y: c.y }, c, null, out); }
    if (g.gather) applyGather(g, dt);
    flights(g, dt, out);
  }
  // what the aim shows while an AT_LAUNCH ultimate is armed (app draws it): { land } Fly Over, { cone } Stone Gaze, { line: end } Piercing Sting, { fan: [unit dirs] } Three Heads
  function preview(g, v) {
    const h = g.held, name = h && h.ult != null ? ultOf(h.ult) : null;
    if (name === 'flyover') return { land: flyTarget(g, h, v) };
    if (name === 'gaze') return { cone: coneOf(h, v) };
    if (name === 'pierce') { const u = unit(v); return { line: stingEnd(g, h, u.x, u.y) }; }
    if (name === 'three') { const u = unit(v), a = U.three.spread * Math.PI / 180; return { fan: [-a, 0, a].map(t => ({ x: u.x * Math.cos(t) - u.y * Math.sin(t), y: u.x * Math.sin(t) + u.y * Math.cos(t) })) }; }
    return null;
  }
  // after physics each frame: fire the enchanted cup, pools transform what touches them. Returns points gained.
  function post(g, out) {
    const gain = checkProjectile(g, out);
    if (g.pools.length) poolContact(g, out);
    for (const c of g.world.cups) if (c.mimic && !c.vx && !c.vy) c.mimic = false;   // a head that touched nothing stays a chimera
    return gain;
  }
  // between shots (spawn): pools corrode pillars, then dry up
  function between(g, out) {
    gazeTick(g, out);
    for (const q of g.pools) { H.blastPillars(g, q.x, q.y, q.r, U.venom.pillarDmg, out, null); q.shots--; }
    g.pools = g.pools.filter(q => q.shots > 0);
  }

  return { bind, ultOf, kindsIn, fullOf, ready, reset, arm, charge, launch, transform, cast, pre, post, between, preview };
})();
