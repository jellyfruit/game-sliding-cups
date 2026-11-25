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
  // the enchanted cup leaves the hand: the gauge is spent; it fires on its first piece/pillar hit, merge or stop
  function launch(g, h) {
    if (h.ult == null) return;
    g.proj = { id: h.id, kind: h.ult }; g.ult[h.ult] = g.mode.ults === 'free' ? U.full : 0; g.armed = null;
  }

  /* ── Transform: the shared core of every ultimate ── */
  const live = (c) => !c.held && !c.dead;
  // piece c becomes creature `kind` (own tier); stone falls away. Returns true when it changed.
  function transform(c, kind, out) {
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
  function applyGather(g, dt) {                                // holy light: converted cups are drawn to the centre
    const G = g.gather, Hc = U.holy;
    for (const c of g.world.cups) {
      if (!live(c) || c.kind !== G.kind) continue;
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

  /* ── Hooks called by Game ── */
  // before physics each frame
  function pre(g, dt) { if (g.gather) applyGather(g, dt); }
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

  return { bind, ultOf, kindsIn, ready, reset, arm, charge, launch, transform, cast, pre, post, between };
})();
