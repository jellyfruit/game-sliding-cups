/* Kings of Cups — src/app/tutor.js
 * APP · Tutor: chapter 1 coach hints and the ghost-shot demo (drawDemo, drawHint). Visual only.
 * Depends on: game, CONFIG.tutor, ctx / project.
 * Must not touch: game state.
 */
'use strict';

/* ── Tutor (chapter 1 coaching): one-line hints in play + a ghost-shot demonstration. Visual only, never game state ── */
const Tutor = {
  hint: null, shown: new Set(), shots: 0, idle: 0, demoT: 0, demoOn: false,
  reset() { this.hint = null; this.shown = new Set(); this.shots = 0; this.idle = 0; this.demoT = 0; this.demoOn = false; this.fire('start'); this.demoOn = !!this.lv()?.demo; },
  lv() { return flow.state === 'playing' || flow.state === 'paused' ? Game.levelOf(game) : null; },
  fire(tag) {
    const lv = this.lv(); if (!lv || !lv.hints) return;
    const h = lv.hints.find(([on, key]) => on === tag && !this.shown.has(key));
    if (h) { this.shown.add(h[1]); this.hint = { key: h[1], t: 0 }; }
  },
  event(ev) {
    if (ev.type === 'merge') { this.fire('merge'); if (ev.combo >= 2) this.fire('combo'); if (ev.n >= CONFIG.cluster.min) this.fire('cluster'); if (ev.tier === TIERS.length - 1) this.fire('king'); }
    else if (ev.type === 'bonus') this.fire('bonus:' + ev.id);
    else this.fire(ev.type);
  },
  update(dt) {
    if (this.hint && (this.hint.t += dt) > CONFIG.tutor.hintT) this.hint = null;
    const lv = this.lv(); if (!lv || flow.state !== 'playing') return;
    if (game.shots > this.shots) { this.shots = game.shots; this.fire('shot'); this.demoOn = false; this.idle = 0; }
    const ready = game.phase === 'ready' && game.held && !game.drag;
    if (game.drag) { this.demoOn = false; this.idle = 0; }
    const gp = Game.goalProgress(game);
    if (lv.demo && ready && !this.demoOn && gp.have < gp.need && (this.idle += dt) > CONFIG.tutor.idleT) { this.demoOn = true; this.demoT = 0; }
    if (this.demoOn) this.demoT += dt;
  },
  // the demo path in world coords: held cup → (wall) → nearest matching cup; null if nothing to aim at
  path() {
    const lv = this.lv(), h = game.held; if (!lv || !lv.demo || !h) return null;
    const m = game.world.cups.filter(c => !c.held && !c.stone && c.kind === h.kind && c.tier === h.tier).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
    if (!m) return null;
    if (lv.demo === 'bank') {                                       // mirror the target across the nearer side wall
      const left = m.x <= h.x, wx = left ? h.r : CONFIG.world.W - h.r, mx = 2 * wx - m.x, k = (wx - h.x) / (mx - h.x);
      return [{ x: h.x, y: h.y }, { x: wx, y: h.y + (m.y - h.y) * k }, { x: m.x, y: m.y }];
    }
    return [{ x: h.x, y: h.y }, { x: m.x, y: m.y }];
  },
};
// demo: a finger presses the held cup and swipes, then a ghost cup slides along the path to the target, which flashes. Loops until the player touches.
function drawDemo() {
  if (!Tutor.demoOn || game.phase !== 'ready' || !game.held || game.drag) return;
  const P = Tutor.path(); if (!P) return;
  const D = CONFIG.tutor, T = D.press + D.swipe + D.travel + D.rest, t = Tutor.demoT % T, pts = P.map(q => project(q.x, q.y));
  const seg = []; let total = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].sx - pts[i - 1].sx, pts[i].sy - pts[i - 1].sy); seg.push(l); total += l; }
  const at = (d) => { for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = Math.min(1, d / seg[i]); return { sx: pts[i].sx + (pts[i + 1].sx - pts[i].sx) * k, sy: pts[i].sy + (pts[i + 1].sy - pts[i].sy) * k }; } d -= seg[i]; } };
  const h = game.held, hp = pts[0], tgt = pts[pts.length - 1], pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
  ctx.save(); ctx.setLineDash([3, 9]); ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.5)';   // faint path
  ctx.beginPath(); ctx.moveTo(pts[0].sx, pts[0].sy - 8); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy - 8); ctx.stroke(); ctx.setLineDash([]);
  const tr = CONFIG.tiers[h.tier].r * tgt.s * (1.5 + 0.15 * pulse);  // target ring
  ctx.strokeStyle = 'rgba(255,230,120,' + (0.6 + 0.4 * pulse).toFixed(2) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(tgt.sx, tgt.sy, tr, tr * tilt, 0, 0, Math.PI * 2); ctx.stroke();
  if (t > D.press + D.swipe && t < D.press + D.swipe + D.travel) {    // ghost cup travelling
    const k = (t - D.press - D.swipe) / D.travel, e = 1 - (1 - k) * (1 - k), q = at(e * total);
    ctx.globalAlpha = 0.55; drawPiece(q.sx, q.sy, h.r * project(h.x, h.y).s, h.kind, h.tier, { noShadow: true }); ctx.globalAlpha = 1;
  }
  if (t < D.press + D.swipe + 0.25) {                                   // finger: press, then swipe forward along the first segment
    const sw = Math.max(0, Math.min(1, (t - D.press) / D.swipe)), ux = (pts[1].sx - hp.sx) / seg[0], uy = (pts[1].sy - hp.sy) / seg[0];
    const fx = hp.sx + ux * 110 * sw, fy = hp.sy - 10 + uy * 110 * sw, a = t > D.press + D.swipe ? 1 - (t - D.press - D.swipe) / 0.25 : Math.min(1, t / 0.15);
    const press = t < D.press ? 0.9 : 1;
    ctx.globalAlpha = a; ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10;    // touch dot (drawn, so it looks the same on every device)
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(fx, fy, 17 * press, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(70,40,90,.7)'; ctx.lineWidth = 2.5; ctx.stroke();
    if (sw > 0) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(hp.sx, hp.sy - 10); ctx.lineTo(fx, fy); ctx.stroke(); }   // swipe trail
    if (t < D.press) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; const r = 18 + 10 * (t / D.press); ctx.beginPath(); ctx.ellipse(hp.sx, hp.sy - 10, r, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}
// hint bar: one short line at the top of the table, fades out after CONFIG.tutor.hintT seconds
function drawHint() {
  const h = Tutor.hint; if (!h || flow.state !== 'playing') return;
  const a = Math.min(1, h.t / 0.25, (CONFIG.tutor.hintT - h.t) / 0.5), txt = t('tut.' + h.key);
  ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.font = 'bold 17px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const maxW = Math.min(L.cw - 40, 520), words = save.lang === 'zh' ? [...txt] : txt.split(' '), sep = save.lang === 'zh' ? '' : ' ', lines = [''];
  for (const w of words) { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + sep + w : w; if (ctx.measureText(tryL).width > maxW - 28 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryL; }
  const bw = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)) + 34), bh = 16 + lines.length * 22, x = L.cw / 2 - bw / 2, y = 60 + (1 - Math.min(1, h.t / 0.25)) * -10;
  ctx.fillStyle = 'rgba(45,28,62,.88)'; rr(x, y, bw, bh, 14); ctx.fill(); ctx.strokeStyle = 'rgba(255,214,107,.8)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; lines.forEach((l, i) => ctx.fillText(l, L.cw / 2, y + 19 + i * 22));
  ctx.restore();
}
