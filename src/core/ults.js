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
  const ready = (g, k) => kindsIn(g).includes(k) && g.ult[k] >= U.full;
  function reset(g) { g.ult = CONFIG.kinds.map(() => (g.mode.ults === 'free' ? U.full : 0)); g.armed = null; g.proj = null; g.pools = []; g.gather = null; }
  // tap a portrait: arm (enchant the held cup) or disarm; returns events or null
  function arm(g, k) {
    if (g.phase !== 'ready' || !g.held || g.drag) return null;
    if (g.armed === k) { g.armed = null; g.held.ult = null; return [{ type: 'ultarm', kind: k, on: false }]; }
    if (!ready(g, k)) return null;
    g.armed = k; g.held.ult = k; return [{ type: 'ultarm', kind: k, on: true }];
  }
  function charge(g, kind, amount, out) {
    if (g.mode.ults !== 'charge' || !g.features.ults || !ultOf(kind)) return;
    const before = g.ult[kind]; g.ult[kind] = Math.min(U.full, before + amount * (H.eqVal(g, 'grail') || 1));
    if (before < U.full && g.ult[kind] >= U.full) out.push({ type: 'ultready', kind });
  }
  // the enchanted cup leaves the hand: the gauge is spent. Most fire on the cup's first piece/pillar hit, merge or stop;
  // AT_LAUNCH ones fire as it leaves the hand (next frame, before physics)
  const AT_LAUNCH = { rebirth: 1, flyover: 1, gaze: 1, pierce: 1, three: 1 };
  function launch(g, h) {
    if (h.ult == null) return;
    g.proj = { id: h.id, kind: h.ult, now: !!AT_LAUNCH[ultOf(h.ult)] }; g.ult[h.ult] = g.mode.ults === 'free' ? U.full : 0; g.armed = null;
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

  /* ── Carried pieces (Physics skips `air` cups): flights along an arc ── */
  function fly(c, tx, ty, T, arc, kind, roars) { c.air = { x0: c.x, y0: c.y, tx, ty, t: 0, T, arc, kind, roars }; c.vx = c.vy = 0; c.z = 0; }
  function flights(g, dt, out) {
    for (const c of g.world.cups) {
      const A = c.air; if (!A || c.dead) continue;
      A.t += dt; const u = Math.min(1, A.t / A.T), e = u * u * (3 - 2 * u);
      c.x = A.x0 + (A.tx - A.x0) * e; c.y = A.y0 + (A.ty - A.y0) * e; c.z = Math.sin(Math.PI * u) * A.arc;
      if (u < 1) continue;
      c.air = null; c.z = 0; c.pop = 1;
      out.push({ type: 'ultland', kind: A.kind, ult: ultOf(A.kind), x: c.x, y: c.y, id: c.id, roar: A.roars });
      if (A.roars) roar(g, c, A.kind, out);
    }
  }

  /* ── Hooks called by Game ── */
  // before physics each frame: cast launch-time ultimates, pull (Holy Light / roar), carry flying pieces
  function pre(g, dt, out) {
    const P = g.proj;
    if (P && P.now) { g.proj = null; const c = g.world.cups.find(q => q.id === P.id); if (c) cast(g, P.kind, { x: c.x, y: c.y }, c, null, out); }
    if (g.gather) applyGather(g, dt);
    flights(g, dt, out);
  }
  // what the aim shows while an AT_LAUNCH ultimate is armed (app draws it): { land: {x, y} } for Fly Over
  function preview(g, v) {
    const h = g.held, name = h && h.ult != null ? ultOf(h.ult) : null;
    if (name === 'flyover') return { land: flyTarget(g, h, v) };
    return null;
  }
  // after physics each frame: fire the enchanted cup, pools transform what touches them. Returns points gained.
  function post(g, out) {
    const gain = checkProjectile(g, out);
    if (g.pools.length) poolContact(g, out);
    return gain;
  }
  // between shots (spawn): pools corrode pillars, then dry up
  function between(g, out) {
    for (const q of g.pools) { H.blastPillars(g, q.x, q.y, q.r, U.venom.pillarDmg, out, null); q.shots--; }
    g.pools = g.pools.filter(q => q.shots > 0);
  }

  return { bind, ultOf, kindsIn, ready, reset, arm, charge, launch, transform, cast, pre, post, between, preview };
})();
