/* Kings of Cups — src/app/fx.js
 * APP · Fx (visual effect state + spawners) and the event bus: FX_ON (effects), RUN_ON (progress + screens), handleEvents.
 * Depends on: stage.js, Sfx, Profile, Storage; at call time Tutor and ui.js (RUN_ON calls go / showScreen).
 * Must not touch: game state from FX_ON (visual only).
 */
'use strict';

/* ───────── FX (effect state and spawners; visual only, never game state. Event handling is in FX_ON below)───────── */
const JUICE = { shake: 0.45, hitstop: 0.35, sparks: 0.35, squash: 0.5, rings: 0.6 };   // juice strength multipliers; 0 disables an effect
const Fx = {
  particles: [], popups: [], sparks: [], rings: [], flames: [], gathers: [], stings: [], pillarFlash: new Map(), slow: 0, cutin: null,
  cameo: null,                            // chapter 3 intro: the griffin flies over and drops the first layout cup { t, max, drop, land, id, kind, tier, x, y, landed }
  squash: new Map(),                      // cup id → hit squash amount (0..1, decays)
  shake: 0,                               // screen shake amplitude (px)
  hitstop: 0,                             // seconds left of hit-stop (physics pause on heavy hits)
  reset() {                               // clear all effects on a new run / restart
    this.particles = []; this.popups = []; this.sparks = []; this.gathers = []; this.rings = []; this.flames = []; this.stings = []; this.squash.clear(); this.pillarFlash.clear(); this.slow = 0; this.cutin = null; this.cameo = null;
    this.shake = 0; this.hitstop = 0;
  },
  kick(px) { this.shake = Math.max(this.shake, px * JUICE.shake); },
  hold(sec) { this.hitstop = Math.max(this.hitstop, sec); },
  impact(ev, sx, sy) {                    // impact point: sparks + ring
    const k = Math.min(1, ev.v / 1800);
    const n = Math.round((3 + k * 11) * JUICE.sparks);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 500 * (0.4 + k);
      this.sparks.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, life: 0.22 + Math.random() * 0.25, w: 2.2 + Math.random() * 2 });
    }
    this.rings.push({ x: sx, y: sy, life: 0.28, max: 0.28, r1: 16 + k * 34, str: 0.7 + k * 0.3 });
  },
  burst(sx, sy, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 220;
      this.particles.push({ x: sx, y: sy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.5 + Math.random() * 0.4, color, size: 2 + Math.random() * 3 });
    }
  },
  popup(text, sx, sy) { this.popups.push({ text, x: sx, y: sy, life: 1.1 }); },
  flame(sx, sy, big) {
    const life = 0.55 + Math.random() * 0.5;
    this.flames.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 50, vy: -(70 + Math.random() * 150), life, max: life, r: (big ? 22 : 13) + Math.random() * (big ? 20 : 12) });
    if (this.flames.length > 420) this.flames.shift();
  },
  update(dt) {
    if (this.cutin && (this.cutin.t -= dt) <= 0) this.cutin = null;
    for (const [id, v] of this.pillarFlash) { if (v - dt * 5 <= 0) this.pillarFlash.delete(id); else this.pillarFlash.set(id, v - dt * 5); }
    for (const f of this.flames) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; }
    this.flames = this.flames.filter(f => f.life > 0);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.popups) { p.y -= 28 * dt; p.life -= dt; }
    this.popups = this.popups.filter(p => p.life > 0);
    for (const p of this.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
    this.sparks = this.sparks.filter(p => p.life > 0);
    for (const r of this.rings) r.life -= dt;
    for (const g of this.gathers) g.t += dt;
    for (const q of this.stings) q.t += dt;
    this.stings = this.stings.filter(q => q.t < q.max);
    const C = this.cameo;
    if (C) {
      C.t += dt;
      if (!C.landed && C.t >= C.land) {                         // the dropped cup hits the sand: dust, a thump
        C.landed = true; const p = project(C.x, C.y); this.burst(p.sx, p.sy, '#d9b26a', 18); this.kick(6);
        this.rings.push({ x: p.sx, y: p.sy, life: 0.4, max: 0.4, r1: 60, str: 1 }); Sfx.play('wall', 700);
      }
      if (C.t >= C.max) this.cameo = null;
    }
    this.gathers = this.gathers.filter(g => g.t < g.max);
    this.rings = this.rings.filter(r => r.life > 0);
    for (const [id, a] of this.squash) { const n = a - dt / 0.22; if (n <= 0) this.squash.delete(id); else this.squash.set(id, n); }
    this.shake *= Math.exp(-dt * 14); if (this.shake < 0.15) this.shake = 0;
  },
};
/* ───────── Event bus: Game.update events → three subscribers (sound / effects / progress & screens). A new event only needs an entry in the right table ───────── */
const popupAt = (dy) => project(CONFIG.world.W / 2, CONFIG.world.LINE_Y - dy);   // floating-text position: centre, just above the line
// cluster merge (3+ cups): each absorbed cup streaks into the centre, extra rings, heavier shake and hit-stop, big label
function clusterFx(ev) {
  const p = project(ev.x, ev.y), k = Math.min(1, (ev.n - 2) / 3);
  if (ev.id != null) Fx.gathers.push({ from: ev.from, x: ev.x, y: ev.y, kind: ev.kind, tier: ev.tier - 1, newId: ev.id, t: 0, max: 0.4, flashT: 0.14 });   // white flash, then the cups fly together; the new cup is hidden until they arrive
  for (const f of ev.from) {
    const q = project(f.x, f.y), dx = p.sx - q.sx, dy = p.sy - q.sy;
    for (let i = 0; i < 6; i++) Fx.sparks.push({ x: q.sx, y: q.sy - 10, vx: dx * (3 + i) + (Math.random() - 0.5) * 80, vy: dy * (3 + i) + (Math.random() - 0.5) * 80, life: 0.2 + i * 0.03, w: 3 + Math.random() * 2 });
    Fx.burst(q.sx, q.sy, KINDS[ev.kind].body, 6);
  }
  for (let i = 0; i < 3; i++) Fx.rings.push({ x: p.sx, y: p.sy - 6, life: 0.35 + i * 0.12, max: 0.35 + i * 0.12, r1: 60 + i * 45 + ev.n * 10, str: 1 });
  Fx.kick(10 + 10 * k); Fx.hold((0.08 + 0.07 * k) * JUICE.hitstop);
  Fx.popup(t('fx.cluster', { n: ev.n }), p.sx, p.sy - 84);
  if (navigator.vibrate) try { navigator.vibrate(30 + 20 * ev.n); } catch (e) {}   // Android only; iOS Safari has no vibration
}
const FX_ON = {                                                // visual effects (visual only, never game state)
  hit(ev) {
    const p = project(ev.x, ev.y), k = Math.min(1, ev.v / 1800);
    Fx.impact(ev, p.sx, p.sy - 8 * p.s);
    Fx.squash.set(ev.a, Math.min(1, 0.35 + k)); Fx.squash.set(ev.b, Math.min(1, 0.35 + k));
    if (ev.v > 250) Fx.kick(1 + k * 6 + ev.tier * 0.6);
    if (ev.v > 1700) Fx.hold(0.035 * JUICE.hitstop);
  },
  wall(ev) {
    const p = project(ev.x, ev.y), k = Math.min(1, ev.v / 1800);
    if (ev.v > 500) { Fx.impact(ev, p.sx, p.sy - 8 * p.s); Fx.kick(1 + k * 4); }
    Fx.squash.set(ev.id, Math.min(1, 0.3 + k));
  },
  merge(ev) {
    if (ev.n >= CONFIG.cluster.min) clusterFx(ev);
    Fx.kick(3 + ev.tier * 2.2); if (ev.tier >= 3) Fx.hold(0.05 * JUICE.hitstop);
    const p = project(ev.x, ev.y);
    Fx.rings.push({ x: p.sx, y: p.sy - 6, life: 0.35, max: 0.35, r1: 30 + ev.tier * 14, str: 1 });
    Fx.burst(p.sx, p.sy, KINDS[ev.kind].rim, 10 + ev.tier * 3);
    Fx.popup((ev.combo > 1 ? t('fx.combo', { n: ev.combo }) + '  ' : '') + '+' + ev.gain, p.sx, p.sy - 20);
  },
  checkmate(ev) {
    if (ev.n >= CONFIG.cluster.min) clusterFx(ev);
    Fx.kick(20); Fx.hold(0.15 * JUICE.hitstop);
    const p = project(ev.x, ev.y);
    Fx.rings.push({ x: p.sx, y: p.sy - 6, life: 0.5, max: 0.5, r1: 120, str: 1 });
    Fx.burst(p.sx, p.sy, KINDS[ev.kind].body, 36);
    Fx.popup(t('fx.checkmate') + ' +' + ev.gain, p.sx, p.sy - 30);
  },
  fade(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy, '#ffffff', 8); },
  item(ev) {
    const c = popupAt(80); Fx.popup(t('item.' + ev.id), c.sx, c.sy);
    if (ev.id === 'undo') Fx.kick(4);
  },
  upgrade(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy, '#ffffff', 16); Fx.rings.push({ x: p.sx, y: p.sy - 6, life: 0.4, max: 0.4, r1: 70, str: 1 }); },
  wild(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy, '#ffd86a', 16); Fx.rings.push({ x: p.sx, y: p.sy - 6, life: 0.4, max: 0.4, r1: 70, str: 1 }); },
  ultimate(ev) {
    const p = project(ev.x, ev.y), col = ULT_COL[ev.ult];
    Fx.slow = CONFIG.ults.slowmo.t; Fx.cutin = { kind: ev.kind, ult: ev.ult, t: 1.3, max: 1.3 }; Fx.kick(16); Fx.hold(0.12 * JUICE.hitstop);
    const R = (CONFIG.ults[ev.ult].radius || 150) * p.s;
    for (let i = 0; i < 3; i++) Fx.rings.push({ x: p.sx, y: p.sy, life: 0.45 + i * 0.15, max: 0.45 + i * 0.15, r1: R * (0.6 + i * 0.3), str: 1 });
    if (ev.ult === 'fireball') for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, d = Math.random() * R; Fx.flame(p.sx + Math.cos(a) * d, p.sy + Math.sin(a) * d * tilt, i < 40); }
    if (ev.ult === 'rebirth') for (let i = 0; i < 70; i++) { const q = project(Math.random() * CONFIG.world.W, game.lineY + (Math.random() - 0.5) * 60); Fx.flame(q.sx, q.sy, i < 25); }   // a wall of fire along the line
    Fx.burst(p.sx, p.sy - 20, col, 40); Fx.burst(p.sx, p.sy - 20, '#ffffff', 16);
  },
  convert(ev) {                                                // an ultimate turned a piece into its creature: burst in the move's colour + the creature's rim, a bounce
    const p = project(ev.x, ev.y), u = Game.ultOf(ev.kind);
    Fx.burst(p.sx, p.sy - 30, ULT_COL[u] || '#fff3b0', 10); Fx.burst(p.sx, p.sy - 30, KINDS[ev.kind].rim, 6); Fx.squash.set(ev.id, 1);
    if (u === 'fireball') Fx.flame(p.sx, p.sy - 10, true);
    Fx.rings.push({ x: p.sx, y: p.sy - 6, life: 0.3, max: 0.3, r1: 40, str: 0.7 });
  },
  ultland(ev) {                                               // a carried piece lands (Rebirth, Fly Over); the griffin's landing roars
    const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy - 10, KINDS[ev.kind].rim, 10); Fx.squash.set(ev.id, 1); Fx.kick(ev.roar ? 10 : 3);
    Fx.rings.push({ x: p.sx, y: p.sy, life: 0.35, max: 0.35, r1: 50, str: 0.8 });
    if (ev.roar) for (let i = 0; i < 3; i++) Fx.rings.push({ x: p.sx, y: p.sy, life: 0.4 + i * 0.12, max: 0.4 + i * 0.12, r1: 90 + i * 60, str: 1 });
  },
  ultready(ev) { const c = popupAt(110); Fx.popup(t('fx.ultready', { name: t('ult.' + Game.ultOf(ev.kind)) }), c.sx, c.sy); },
  unstone(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy - 20, '#9aa2b0', 18); Fx.burst(p.sx, p.sy - 20, KINDS[ev.kind].body, 8); Fx.squash.set(ev.id, 1); Fx.popup(t('fx.unstone'), p.sx, p.sy - 64); },
  pillar(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy - 20, '#4a8cff', 14); Fx.rings.push({ x: p.sx, y: p.sy, life: 0.4, max: 0.4, r1: 50, str: 0.8 }); },
  pillarhit(ev) { const p = project(ev.x, ev.y); Fx.pillarFlash.set(ev.id, 1); Fx.burst(p.sx, p.sy - 30, '#7c8494', 4 + ev.dmg); if (ev.dmg) Fx.popup('-' + ev.dmg, p.sx, p.sy - 70); if (ev.mateOnly) { const c = popupAt(200); Fx.popup(t('fx.mate'), c.sx, c.sy); } },
  chimeraphase(ev) { const p = project(ev.x, ev.y); Fx.kick(14); Fx.burst(p.sx, p.sy - 40, CHIMERA_COL[ev.phase - 1], 30); Fx.burst(p.sx, p.sy - 40, CHIMERA_COL[ev.phase], 20); for (let i = 0; i < 3; i++) Fx.rings.push({ x: p.sx, y: p.sy, life: 0.5 + i * 0.15, max: 0.5 + i * 0.15, r1: 120 + 70 * i, str: 1 }); const c = popupAt(170); Fx.popup(t('fx.phase.' + ev.phase), c.sx, c.sy); },
  chimeradown(ev) { const p = project(ev.x, ev.y); Fx.kick(18); Fx.burst(p.sx, p.sy - 40, '#ffe08a', 50); Fx.burst(p.sx, p.sy - 40, '#ffffff', 24); for (let i = 0; i < 4; i++) Fx.rings.push({ x: p.sx, y: p.sy, life: 0.6 + i * 0.2, max: 0.6 + i * 0.2, r1: 140 + 90 * i, str: 1 }); const c = popupAt(170); Fx.popup(t('fx.chimeradown'), c.sx, c.sy); },
  poisondrop(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy - 20, '#7be05a', 18); if (ev.tier >= 0) Fx.squash.set(ev.id, 1); Fx.popup(t('fx.poisondrop'), p.sx, p.sy - 64); Fx.kick(4); },
  pillarbreak(ev) { const p = project(ev.x, ev.y); Fx.kick(8); Fx.burst(p.sx, p.sy - 25, '#666d7a', 26); Fx.burst(p.sx, p.sy - 25, '#4a8cff', 12); Fx.rings.push({ x: p.sx, y: p.sy, life: 0.45, max: 0.45, r1: 80, str: 1 }); },
  sting(ev) { Fx.stings.push({ from: { x: ev.from.x, y: ev.from.y }, x: ev.x, y: ev.y, t: 0, max: 0.45 }); const p = project(ev.x, ev.y); setTimeout(() => Fx.popup(t('fx.sting'), p.sx, p.sy - 70), 380); },
  headcut(ev) { const p = project(ev.x, ev.y); Fx.kick(6); Fx.burst(p.sx, p.sy - 30, '#3f8f5f', 20); Fx.popup(t('fx.headcut'), p.sx, p.sy - 80); },
  headburn(ev) { const p = project(ev.x, ev.y); Fx.kick(10); for (let i = 0; i < 40; i++) Fx.flame(p.sx + (Math.random() - 0.5) * 70, p.sy - Math.random() * 60, i < 16); Fx.burst(p.sx, p.sy - 30, '#ffb347', 24); Fx.rings.push({ x: p.sx, y: p.sy, life: 0.5, max: 0.5, r1: 90, str: 1 }); Fx.popup(t('fx.headburn'), p.sx, p.sy - 80); },
  headgrow(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy - 30, '#7be0a0', 16); Fx.pillarFlash.set(ev.id, 1); Fx.popup(t('fx.headgrow'), p.sx, p.sy - 80); },
  rise(ev) { const l = project(0, ev.y), r = project(W, ev.y); Fx.burst((l.sx + r.sx) / 2, l.sy, '#8fd0ff', 20); Fx.popup(t('fx.rise'), (l.sx + r.sx) / 2, l.sy - 30); Fx.kick(3); },
  roar(ev) {                                                  // the lion roars: shake, rings rolling down from the far edge
    const p = project(ev.x, ev.y); Fx.kick(12);
    for (let i = 0; i < 3; i++) Fx.rings.push({ x: p.sx, y: p.sy, life: 0.5 + i * 0.18, max: 0.5 + i * 0.18, r1: L.cw * (0.35 + 0.2 * i), str: 1 });
    Fx.burst(p.sx, p.sy + 10, '#ffcf7a', 26); const c = popupAt(150); Fx.popup(t('fx.roar'), c.sx, c.sy);
  },
  curse(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy - 20, '#8a8f9c', 20); Fx.burst(p.sx, p.sy - 20, '#b48cff', 8); Fx.squash.set(ev.id, 1); Fx.popup(t('fx.curse'), p.sx, p.sy - 64); Fx.kick(4); },
  stingdrop(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy - 20, '#9b4dca', 18); Fx.squash.set(ev.id, 1); Fx.popup(t('fx.stingdrop'), p.sx, p.sy - 64); Fx.kick(4); },
  bonus(ev) { const p = project(ev.x, ev.y); Fx.popup(t('bonus.' + ev.id, { n: ev.gain }), p.sx, p.sy - 46); Fx.rings.push({ x: p.sx, y: p.sy - 6, life: 0.4, max: 0.4, r1: 60, str: 0.8 }); },
  rampup(ev) { const c = popupAt(140); Fx.popup(t('fx.rampup', { n: ev.level }), c.sx, c.sy); Fx.kick(5); },
  shockwave(ev) { const p = project(ev.x, ev.y); Fx.rings.push({ x: p.sx, y: p.sy - 6, life: 0.6, max: 0.6, r1: CONFIG.shock.radius * p.s, str: 1 }); Fx.kick(14); },
  shatter(ev) { const p = project(ev.x, ev.y); Fx.burst(p.sx, p.sy, KINDS[ev.kind].body, 14); },
  itemget(ev) { const c = popupAt(40); Fx.popup(t('fx.itemget', { name: t('item.' + ev.id) }), c.sx, c.sy); },
};
const RUN_ON = {                                               // progress and screen changes (touch the save / Flow)
  merge(ev) { if (Profile.see(save, ev.kind, ev.tier)) { Storage.save(save); const p = project(ev.x, ev.y); Fx.popup(t('fx.codex'), p.sx, p.sy - 46); } },
  gameover() { if (Tune.blocks(game)) newBest = false; else { newBest = Profile.finishRun(save, game).newBest; Storage.save(save); } go('gameover'); },   // tuning overrides: nothing recorded
  levelclear(ev) {
    if (Tune.blocks(game)) { lastReward = 0; tamed = false; closeCard = null; game.banked = true; go('clear'); return; }   // tuning overrides: no stars, VP or progress
    lastReward = Profile.clearLevel(save, ev.level, ev.stars);
    tamed = CONFIG.levels[ev.level].goal.type === 'chimera' && Profile.unlockChimera(save);   // clearing the finale tames the Chimera (first time only)
    closeCard = Profile.storyAfter(save, ev.level); game.banked = true; Storage.save(save); go('clear');
  },
  itemget(ev) { lastGet = ev.id; setTimeout(() => { lastGet = null; }, 900); },   // item bar: pop animation for a new item
};
const subscribers = [
  (ev) => Sfx.event(ev),
  (ev) => { const h = FX_ON[ev.type]; if (h) h(ev); },
  (ev) => { const h = RUN_ON[ev.type]; if (h) h(ev); },
  (ev) => Tutor.event(ev),
];
function handleEvents(events) { for (const ev of events) for (const sub of subscribers) sub(ev); }
