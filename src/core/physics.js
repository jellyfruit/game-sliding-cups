/* Kings of Cups — src/core/physics.js
 * CORE · Physics: fixed-step motion, friction, walls, collisions, pillars, merges/clusters, sand, currents; emits events only.
 * Cups flagged `air` (carried by an ultimate) are skipped by motion, collisions and pillars but count as moving.
 * Depends on: CONFIG, TOP. Knows nothing of score, rules or the screen.
 * Must not touch: the DOM; Game state. Feel is guarded by tests/golden/physics.json.
 */
'use strict';

/* ───────── PHYSICS (pure functions; only touches the world, knows nothing about score or rules)───────── */
const Physics = (() => {
  const P = CONFIG.phys, Wd = CONFIG.world;
  function createWorld() { return { cups: [], pillars: [], sand: [], current: [], events: [], nextId: 0, acc: 0 }; }
  // level sand patches [x, y, rx, ry] (ellipses): friction factor at (x, y); 1 outside (and always 1 in Classic: no sand)
  const inSand = (sand, x, y) => sand.some(([sx, sy, rx, ry]) => ((x - sx) / rx) ** 2 + ((y - sy) / ry) ** 2 < 1);
  const sandK = (sand, x, y) => (sand && sand.length && inSand(sand, x, y) ? CONFIG.sand.fric : 1);
  // level water bands [y, h, k]: sideways push (px/s²) on a moving cup at height y; 0 outside (and always 0 in Classic: no currents)
  const currentK = (bands, y) => { if (bands) for (const [by, h, k] of bands) if (Math.abs(y - by) < h) return k; return 0; };
  const currentAt = (bands, y) => currentK(bands, y) * CONFIG.current.accel;
  const driftAt = (bands, y) => currentK(bands, y) * CONFIG.current.drift;        // px/s added to x while moving (velocity unchanged)
  function makeCup(world, kind, tier, x, y) {
    const T = CONFIG.tiers[tier], r = T.r;
    return { id: ++world.nextId, kind, tier, x, y, vx: 0, vy: 0, r, m: r * r * T.massK,
             fric: T.fric, bounce: T.bounce, held: false, pop: 0, dead: false };
  }
  const wallHit = (world, c, v) => { if (v > 60) world.events.push({ type: 'wall', v, x: c.x, y: c.y, id: c.id }); };
  function integrate(world, dt) {
    const W = Wd.W, H = Wd.H;
    for (const c of world.cups) {
      if (c.held || c.dead || c.air) continue;                 // air: an ultimate is carrying it (moved by Ults, not by physics)
      const sp = Math.hypot(c.vx, c.vy);
      if (sp > 0) {
        const fr = world.sand.length ? c.fric * sandK(world.sand, c.x, c.y) : c.fric;   // sand: levels only
        const sp2 = Math.max(0, sp - (P.A + P.K * sp) * fr * dt);
        if (sp2 < P.STOP) { c.vx = c.vy = 0; }
        else { const f = sp2 / sp; c.vx *= f; c.vy *= f; if (world.current.length) c.vx += currentAt(world.current, c.y) * dt; }   // currents: levels only
      }
      if (world.current.length && (c.vx || c.vy)) c.x += driftAt(world.current, c.y) * dt;   // currents: levels only; moving cups only
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x < c.r)     { c.x = c.r;     if (c.vx < 0) { wallHit(world, c, -c.vx); c.vx = -c.vx * P.EW * c.bounce; } }
      if (c.x > W - c.r) { c.x = W - c.r; if (c.vx > 0) { wallHit(world, c, c.vx); c.vx = -c.vx * P.EW * c.bounce; } }
      if (c.y < c.r)     { c.y = c.r;     if (c.vy < 0) { wallHit(world, c, -c.vy); c.vy = -c.vy * P.EW * c.bounce; } }
      if (c.y > H - c.r) { c.y = H - c.r; if (c.vy > 0) { wallHit(world, c, c.vy); c.vy = -c.vy * P.EW * c.bounce; } }
    }
  }
  // the pair a+b plus every matching cup touching the group (chained); wild cups match any creature
  // (two wilds take the creature of the first real cup that joins them)
  function clusterOf(world, a, b) {
    const group = [a, b], T = CONFIG.cluster.touch;
    let kind = a.wild && !b.wild ? b.kind : a.kind, open = a.wild && b.wild;
    const fits = (c) => !c.dead && !c.held && !c.stone && !group.includes(c) && c.tier === a.tier && (c.wild || open || c.kind === kind);
    for (let i = 0; i < group.length; i++) {
      const g = group[i];
      for (const c of world.cups) if (fits(c) && Math.hypot(c.x - g.x, c.y - g.y) < g.r + c.r + T) { group.push(c); if (open && !c.wild) { kind = c.kind; open = false; } }
    }
    return { group, kind };
  }
  function merge(world, a, b) {
    const { group, kind } = clusterOf(world, a, b);         // a wild cup becomes the other cup's creature
    let m = 0, x = 0, y = 0, vx = 0, vy = 0;
    for (const c of group) { c.dead = true; m += c.m; x += c.x * c.m; y += c.y * c.m; vx += c.vx * c.m; vy += c.vy * c.m; }
    x /= m; y /= m;
    const n = group.length, ids = group.map(c => c.id), from = group.map(c => ({ x: c.x, y: c.y }));
    if (a.tier === TOP) { world.events.push({ type: 'checkmate', kind, x, y, a: a.id, b: b.id, n, ids, from }); return; }
    const nc = makeCup(world, kind, a.tier + 1, x, y);
    nc.vx = vx / m; nc.vy = vy / m;
    nc.pop = 1;
    world.cups.push(nc);
    world.events.push({ type: 'merge', kind, tier: nc.tier, x, y, a: a.id, b: b.id, id: nc.id, n, ids, from });
  }
  function collide(world) {
    const cups = world.cups;
    for (let i = 0; i < cups.length; i++) {
      const a = cups[i];
      if (a.dead || a.held || a.air) continue;
      for (let j = i + 1; j < cups.length; j++) {
        const b = cups[j];
        if (b.dead || b.held || b.air) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        if (a.tier === b.tier && !a.stone && !b.stone && (a.kind === b.kind || a.wild || b.wild)) { merge(world, a, b); break; }   // petrified cups never merge
        const d = Math.sqrt(d2) || 0.0001;
        const nx = dx / d, ny = dy / d;
        const ia = 1 / a.m, ib = 1 / b.m;
        const corr = (rr - d) / (ia + ib) * 0.8;
        a.x -= nx * corr * ia; a.y -= ny * corr * ia;
        b.x += nx * corr * ib; b.y += ny * corr * ib;
        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn < 0) {
          if (-rvn > 40) world.events.push({ type: 'hit', v: -rvn, tier: Math.max(a.tier, b.tier), ta: a.tier, tb: b.tier, a: a.id, b: b.id, x: a.x + nx * a.r, y: a.y + ny * a.r });
          const e = P.E * (a.bounce + b.bounce) / 2;
          const j2 = -(1 + e) * rvn / (ia + ib);
          a.vx -= j2 * nx * ia; a.vy -= j2 * ny * ia;
          b.vx += j2 * nx * ib; b.vy += j2 * ny * ib;
        }
      }
    }
  }
  // cups bounce off pillars like off a wall (counts as a wall hit, so bank-shot bonuses work)
  function hitPillars(world) {
    for (const p of world.pillars) for (const c of world.cups) {
      if (c.dead || c.held || c.air) continue;
      const dx = c.x - p.x, dy = c.y - p.y, rr = c.r + p.r, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.0001, nx = dx / d, ny = dy / d;
      c.x = p.x + nx * rr; c.y = p.y + ny * rr;
      const vn = c.vx * nx + c.vy * ny;
      if (vn < 0) { if (-vn > 60) world.events.push({ type: 'wall', v: -vn, x: c.x, y: c.y, id: c.id, pillar: true }); const k = (1 + P.EW * c.bounce) * vn; c.vx -= k * nx; c.vy -= k * ny; }
    }
  }
  function substep(world, dt) { integrate(world, dt); collide(world); if (world.pillars.length) hitPillars(world); }
  // advance in fixed steps; remove dead cups before returning
  function advance(world, dt) {
    world.acc += dt;
    while (world.acc >= P.STEP) { substep(world, P.STEP); world.acc -= P.STEP; }
    world.cups = world.cups.filter(c => !c.dead);
  }
  const isMoving = (world) => world.cups.some(c => !c.held && (c.vx || c.vy || c.air));
  const isSettled = (c) => !c.held && !c.air && !c.vx && !c.vy;
  // predicted path (friction and walls only, ignores other cups)
  function predictPath(c, v, pillars, sand, current) {
    const W = Wd.W, H = Wd.H, pts = [], pos = { x: c.x, y: c.y }, vel = { x: v.vx, y: v.vy }, dt = 1 / 60;
    pts.bounces = [];                                          // wall-hit points (for the aim line's bounce markers)
    for (let i = 0; i < 480; i++) {
      const sp = Math.hypot(vel.x, vel.y);
      const sp2 = Math.max(0, sp - (P.A + P.K * sp) * c.fric * sandK(sand, pos.x, pos.y) * dt);
      if (sp2 < P.STOP) break;
      const f = sp2 / sp; vel.x *= f; vel.y *= f; vel.x += currentAt(current, pos.y) * dt;
      pos.x += (vel.x + driftAt(current, pos.y)) * dt; pos.y += vel.y * dt;
      if (pos.x < c.r)     { pos.x = c.r;     vel.x = Math.abs(vel.x) * P.EW * c.bounce; }
      if (pos.x > W - c.r) { pos.x = W - c.r; vel.x = -Math.abs(vel.x) * P.EW * c.bounce; }
      if (pos.y < c.r)     { pos.y = c.r;     vel.y = Math.abs(vel.y) * P.EW * c.bounce; }
      if (pos.y > H - c.r) { pos.y = H - c.r; vel.y = -Math.abs(vel.y) * P.EW * c.bounce; }
      let hitP = false;
      if (pillars) for (const p of pillars) {
        const dx = pos.x - p.x, dy = pos.y - p.y, rr = c.r + p.r, d = Math.hypot(dx, dy);
        if (d < rr) { const nx = dx / (d || 1e-4), ny = dy / (d || 1e-4); pos.x = p.x + nx * rr; pos.y = p.y + ny * rr; const vn = vel.x * nx + vel.y * ny; if (vn < 0) { const k = (1 + P.EW * c.bounce) * vn; vel.x -= k * nx; vel.y -= k * ny; hitP = true; } }
      }
      if (hitP || pos.x === c.r || pos.x === W - c.r || pos.y === c.r || pos.y === H - c.r) { const lb = pts.bounces[pts.bounces.length - 1]; if (!lb || lb.i < i - 2) pts.bounces.push({ x: pos.x, y: pos.y, i }); }
      if (i % 3 === 0) pts.push({ x: pos.x, y: pos.y });
    }
    pts.push({ x: pos.x, y: pos.y });
    return pts;
  }
  return { createWorld, makeCup, advance, substep, isMoving, isSettled, predictPath, inSand, currentAt };
})();
