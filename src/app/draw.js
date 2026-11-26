/* Kings of Cups — src/app/draw.js
 * APP · world drawing: pillars, hazards (sand, currents, stingers, guardians, hydra heads, Chimera, venom), cups, table, aim.
 * Depends on: stage.js (ctx, project, game), sprites.js, Fx (reads effects; startCameo sets Fx.cameo).
 * Must not touch: game state (read only), the save.
 */
'use strict';

// rune pillar: dark stone column with a glowing rune; cracks show lost hp, brief flash when hit
// Gemini pillar sprites (art-src/pillars_and_cover.py prints these numbers): 1 intact, 2 cracked, 3 crumbling
const PILLAR_ART = { w: 320, h: 376, ax: 160.6, ay: 338.8, hw: 113.4, scale: 1.05 };   // scale: base half-width = scale × radius
const pillarImgs = [1, 2, 3].map(n => { const im = new Image(); im.src = 'art/pillar/pillar_' + n + '.png'; return im; });
const PILLAR_GLOW = '74,140,255';                                // sapphire #4A8CFF — no creature uses blue
function drawPillar(pl) {
  const p = project(pl.x, pl.y), R = pl.r * p.s, ry = R * tilt, hgt = R * 1.7, top = p.sy - hgt, fl = Fx.pillarFlash.get(pl.id) || 0, unbreakable = !isFinite(pl.hp), k = unbreakable ? 1 : pl.hp / (pl.max || CONFIG.pillars.hp);
  const img = pillarImgs[k > 0.6 ? 0 : k > 0.3 ? 1 : 2];
  if (img.complete && img.naturalWidth) {                                             // sprite (falls back to the drawing below)
    const A = PILLAR_ART, sc = R * A.scale / A.hw, x = p.sx - A.ax * sc, y = p.sy - A.ay * sc;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.sx + R * 0.08, p.sy + ry * 0.15, R * 1.2, ry * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, x, y, A.w * sc, A.h * sc);
    if (fl > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 * fl; ctx.drawImage(img, x, y, A.w * sc, A.h * sc); ctx.restore(); }
    if (unbreakable) return;
    const bw = R * 1.6, bx = p.sx - bw / 2, by = y - 4;
    ctx.fillStyle = 'rgba(20,12,28,.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5); ctx.fillStyle = k > 0.5 ? '#5b9cff' : k > 0.25 ? '#ffb347' : '#ff5c5c'; ctx.fillRect(bx, by, bw * k, 3);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.sx + R * 0.08, p.sy + ry * 0.15, R * 1.1, ry * 1.05, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(p.sx - R, 0, p.sx + R, 0); g.addColorStop(0, '#666d7a'); g.addColorStop(0.45, '#7c8494'); g.addColorStop(1, '#3b404c');
  ctx.fillStyle = g; ctx.strokeStyle = '#231b2b'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(p.sx - R, top); ctx.lineTo(p.sx - R, p.sy); ctx.ellipse(p.sx, p.sy, R, ry, 0, Math.PI, 0, true); ctx.lineTo(p.sx + R, top); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9aa2b0'; ctx.beginPath(); ctx.ellipse(p.sx, top, R, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const glow = 0.55 + 0.25 * Math.sin(performance.now() / 400 + pl.x);                // sapphire glow (a colour no creature uses): small sigil band, no letters
  const blue = 'rgba(' + PILLAR_GLOW + ',' + (glow * (0.4 + 0.6 * k)).toFixed(2) + ')', cy = top + hgt * 0.5, u = R * 0.16;
  ctx.strokeStyle = blue; ctx.fillStyle = blue; ctx.lineWidth = Math.max(1.5, R * 0.08); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(p.sx, cy, u * 1.4, 0, Math.PI * 2); ctx.stroke();                          // centre ring
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(p.sx + s * R * 0.55, cy, u * 0.45, 0, Math.PI * 2); ctx.fill(); }   // side dots
  ctx.beginPath(); ctx.moveTo(p.sx - R * 0.78, cy + u * 2.4); ctx.lineTo(p.sx + R * 0.78, cy + u * 2.4); ctx.stroke();   // band line
  ctx.strokeStyle = '#1b1422'; ctx.lineWidth = 1.6;                                    // cracks grow as hp drops
  const cracks = Math.ceil((1 - k) * 4);
  for (let i = 0; i < cracks; i++) { const x0 = p.sx + (i % 2 ? 0.45 : -0.55) * R, y0 = top + hgt * (0.15 + 0.2 * i); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + R * 0.2, y0 + hgt * 0.12); ctx.lineTo(x0 + R * 0.05, y0 + hgt * 0.22); ctx.stroke(); }
  if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * fl).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(p.sx, top, R, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  if (unbreakable) return;
  const bw = R * 1.6, bx = p.sx - bw / 2, by = top - ry - 9;                          // hp bar
  ctx.fillStyle = 'rgba(20,12,28,.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5); ctx.fillStyle = k > 0.5 ? '#5b9cff' : k > 0.25 ? '#ffb347' : '#ff5c5c'; ctx.fillRect(bx, by, bw * k, 3);
}
const ULT_COL = { fireball: '#ff7a2a', holy: '#fff0a0', venom: '#7be05a', rebirth: '#ffb13d', flyover: '#f0d9b0', gaze: '#7fe0dc', pierce: '#ffd27a', three: '#f08aa8' };
function drawPools() {                                          // hydra venom pools: green puddles with bubbles
  for (const q of game.pools || []) {
    const p = project(q.x, q.y), R = q.r * p.s, a = 0.22 + 0.08 * q.shots;
    ctx.fillStyle = 'rgba(90,200,70,' + a.toFixed(2) + ')'; ctx.strokeStyle = 'rgba(40,110,30,.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, R, R * tilt, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const now = performance.now() / 1000;
    for (let i = 0; i < 6; i++) { const ang = i * 1.7 + q.x, k = (now * 0.6 + i * 0.17) % 1; ctx.fillStyle = 'rgba(170,255,120,' + (0.7 * (1 - k)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(p.sx + Math.cos(ang) * R * 0.6, p.sy + Math.sin(ang) * R * 0.6 * tilt - k * 10, 2 + 3 * k, 0, Math.PI * 2); ctx.fill(); }
  }
}
function drawCutin() {                                          // ultimate cut-in: creature king slides in with the move's name
  const C = Fx.cutin; if (!C) return;
  const k = 1 - C.t / C.max, inT = Math.min(1, k / 0.18), outT = Math.max(0, (k - 0.8) / 0.2), a = Math.min(inT, 1 - outT);
  const y = L.ch * 0.36, h = Math.min(150, L.ch * 0.2), col = ULT_COL[C.ult];
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(15,8,22,.78)'; ctx.fillRect(0, y - h / 2, L.cw, h);
  ctx.fillStyle = col; ctx.fillRect(0, y - h / 2, L.cw, 4); ctx.fillRect(0, y + h / 2 - 4, L.cw, 4);
  const img = Sprites.get(C.kind, TIERS.length - 1), slide = (1 - inT) * -L.cw * 0.5;
  if (img) { const R = h * 0.36, sc = R / 128; ctx.drawImage(img, L.cw * 0.22 + slide - 384 * sc, y + h * 0.46 - 690 * sc, 768 * sc, 768 * sc); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + Math.round(h * 0.26) + 'px sans-serif';
  ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.fillStyle = col; const tx = L.cw * 0.64 - slide;
  ctx.strokeText(t('ult.' + C.ult), tx, y); ctx.fillText(t('ult.' + C.ult), tx, y);
  ctx.restore();
}
/* ── Chapter 3 drawing: sand patches, stung cups, stinger darts, twin guardians, griffin cameo ── */
function drawSand() {                                             // level sand patches: sandy ellipses (in perspective) with dune ripples
  for (const [x, y, rx, ry] of game.world.sand || []) {
    const ring = (k) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, q = project(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k); if (i) ctx.lineTo(q.sx, q.sy); else ctx.moveTo(q.sx, q.sy); } ctx.closePath(); };
    ring(1); ctx.fillStyle = 'rgba(214,166,86,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(150,104,40,.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
    ring(0.72); ctx.fillStyle = 'rgba(196,146,66,.35)'; ctx.fill();
    ctx.save(); ring(1); ctx.clip(); ctx.strokeStyle = 'rgba(255,236,190,.5)'; ctx.lineWidth = 1.5;
    for (let j = -2; j <= 2; j++) { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const u = -1 + i / 6, q = project(x + u * rx, y + j * ry * 0.35 + Math.sin(u * 4 + j) * ry * 0.08); if (i) ctx.lineTo(q.sx, q.sy); else ctx.moveTo(q.sx, q.sy); } ctx.stroke(); }
    ctx.restore();
  }
}
function drawStingBadge(c, p, R) {                                // stung cup: purple badge with the shots left; pulses on the last one
  const k = c.sting === 1 ? 0.5 + 0.5 * Math.sin(performance.now() / 110) : 0, x = p.sx + R * 0.85, y = p.sy - R * 1.9, r = 10 + 3 * k;
  ctx.fillStyle = '#7b2fa8'; ctx.strokeStyle = c.sting === 1 ? '#ff4d6d' : '#f3d7ff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.sting, x, y + 1);
  ctx.strokeStyle = '#7b2fa8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r * 0.7, y + r * 0.7); ctx.lineTo(x - r * 1.5, y + r * 1.6); ctx.stroke();   // the stinger stuck in the cup
}
function drawStings() {                                           // stinger darts flying from a guardian (or the far edge) to the stung cup
  for (const q of Fx.stings) {
    const k = Math.min(1, q.t / (q.max * 0.85)), a = project(q.from.x, q.from.y), b = project(q.x, q.y), ax = a.sx, ay = a.sy - 60 * a.s, bx = b.sx, by = b.sy - 30 * b.s;
    const x = ax + (bx - ax) * k, y = ay + (by - ay) * k - Math.sin(k * Math.PI) * 60, x0 = ax + (bx - ax) * Math.max(0, k - 0.15), y0 = ay + (by - ay) * Math.max(0, k - 0.15) - Math.sin(Math.max(0, k - 0.15) * Math.PI) * 60;
    ctx.strokeStyle = 'rgba(155,77,202,.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = '#e8c6ff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
}
function drawGuard(gd) {                                          // twin guardian: a stone scorpion-man king on a plinth, with its own health bar
  const p = project(gd.x, gd.y), R = gd.r * p.s * 1.15, ry = R * tilt, fl = Fx.pillarFlash.get(gd.id) || 0, k = gd.hp / gd.max;
  ctx.fillStyle = '#6d6455'; ctx.strokeStyle = '#3b342b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(p.sx, p.sy + ry * 0.2, R * 1.12, ry * 1.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // plinth
  drawPiece(p.sx, p.sy, R, CONFIG.guard.kind, TIERS.length - 1, { stone: true, noShadow: true });
  if (fl > 0) { ctx.fillStyle = 'rgba(255,240,200,' + (0.5 * fl).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - R * 1.2, R * 0.9, R * 1.3, 0, 0, Math.PI * 2); ctx.fill(); }
  const bw = R * 1.9, bx = p.sx - bw / 2, by = p.sy - R * 2.75;
  ctx.fillStyle = 'rgba(20,12,28,.75)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 9); ctx.fillStyle = k > 0.5 ? '#e8b86a' : k > 0.25 ? '#ffb347' : '#ff5c5c'; ctx.fillRect(bx, by, bw * k, 5);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(gd.hp + ' / ' + gd.max, p.sx, by - 3);
}
function drawCameo() {                                            // griffin intro: flies across, drops the cup, which falls onto its spot
  const C = Fx.cameo; if (!C) return;
  if (C.light) { drawLightCameo(C); return; }
  const p = project(C.x, C.y), s = p.s, u = C.t / C.max, ud = C.drop / C.max, hy = Math.max(L.top + 60, p.sy - 170 * s);
  const gx = u < ud ? -90 + (p.sx + 90) * (u / ud) : p.sx + (L.cw + 120 - p.sx) * ((u - ud) / (1 - ud)), gy = hy - Math.sin(u * Math.PI) * 30 + Math.sin(C.t * 18) * 4;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(gx, p.sy, 34 * s, 34 * s * tilt, 0, 0, Math.PI * 2); ctx.fill();   // its shadow on the table
  if (!C.landed) {                                                  // the cup: carried, then falling (shadow grows under its spot)
    const f = C.t < C.drop ? 0 : Math.min(1, (C.t - C.drop) / (C.land - C.drop)), cx = C.t < C.drop ? gx : p.sx, cy = C.t < C.drop ? gy + 34 * s : hy + 34 * s + (p.sy - hy - 34 * s) * f * f;
    if (C.t >= C.drop) { ctx.fillStyle = 'rgba(0,0,0,' + (0.1 + 0.15 * f).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, TIERS[C.tier].r * s * (0.5 + 0.5 * f), TIERS[C.tier].r * s * tilt * (0.5 + 0.5 * f), 0, 0, Math.PI * 2); ctx.fill(); }
    drawPiece(cx, cy, TIERS[C.tier].r * s, C.kind, C.tier, { noShadow: true });
  }
  ctx.save(); ctx.translate(gx, gy); ctx.rotate(0.12 * Math.sin(C.t * 6)); drawPiece(0, 0, 56 * s, 5, TIERS.length - 1, { noShadow: true, fast: true }); ctx.restore();
}
function startCameo() {                                           // chapter 3 level 17: the griffin brings the first cup of the layout; chapter 4 level 25: the phoenix lights the table
  const lv = Game.levelOf(game); if (lv && lv.intro === 'phoenix') { Fx.cameo = { t: 0, max: 2.6, light: true, landed: true, kind: 3 }; return; }
  if (!lv || lv.intro !== 'griffin' || !lv.cups || !lv.cups.length) return;
  const c = game.world.cups.find(q => !q.held && q.x === lv.cups[0][2] && q.y === lv.cups[0][3]); if (!c) return;
  Fx.cameo = { t: 0, max: 2.2, drop: 0.95, land: 1.35, id: c.id, kind: c.kind, tier: c.tier, x: c.x, y: c.y, landed: false };
}
/* ── Chapter 4 drawing: water bands, phoenix cameo ── */
function drawCurrent() {                                          // level water bands: blue strips with streaks drifting in the push direction
  const now = performance.now() / 1000;
  for (const [y, h, k] of game.world.current || []) {
    const a = project(0, y - h), b = project(W, y - h), c = project(W, y + h), d = project(0, y + h);
    ctx.fillStyle = 'rgba(40,120,190,' + (0.2 + 0.08 * Math.min(1.5, Math.abs(k))).toFixed(2) + ')';
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(c.sx, c.sy); ctx.lineTo(d.sx, d.sy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,235,255,.45)'; ctx.lineWidth = 1.5;
    for (const yy of [y - h, y + h]) { const l = project(0, yy), r = project(W, yy); ctx.beginPath(); ctx.moveTo(l.sx, l.sy); ctx.lineTo(r.sx, r.sy); ctx.stroke(); }
    const rows = Math.max(1, Math.round(h / 35)), gap = 120, dir = Math.sign(k) || 1, off = ((now * 70 * Math.abs(k)) % gap) * dir;
    ctx.strokeStyle = 'rgba(225,245,255,.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let j = 0; j < rows; j++) {
      const ry = y - h + (2 * h) * (j + 0.5) / rows;
      for (let x0 = -gap; x0 < W + gap; x0 += gap) {
        const x = x0 + off + (j % 2) * gap / 2; if (x < 10 || x > W - 10) continue;
        const p1 = project(x - 18 * dir, ry), p2 = project(x + 18 * dir, ry), hd = 7 * p2.s;   // a streak with an arrow tip
        ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.moveTo(p2.sx - hd * dir, p2.sy - hd * 0.6); ctx.lineTo(p2.sx, p2.sy); ctx.lineTo(p2.sx - hd * dir, p2.sy + hd * 0.6); ctx.stroke();
      }
    }
  }
}
function drawHead(hd) {                                           // hydra head: a stone hydra statue rising from dark coils, with health; cut = a stump counting down to regrowth
  const p = project(hd.x, hd.y), R = hd.r * p.s * 1.1, ry = R * tilt, fl = Fx.pillarFlash.get(hd.id) || 0;
  ctx.fillStyle = '#1f3a34'; ctx.strokeStyle = '#0e1f1b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(p.sx, p.sy + ry * 0.2, R * 1.15, ry * 1.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // coils in the water
  ctx.strokeStyle = 'rgba(150,220,200,.35)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy + ry * 0.2, R * 1.35, ry * 1.35, 0, 0, Math.PI * 2); ctx.stroke();
  if (hd.cut > 0) {                                                // stump: glowing cut, regrowth countdown
    ctx.fillStyle = '#3f6b4f'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - R * 0.25, R * 0.55, R * 0.55 * tilt, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff7a5c'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - R * 0.3, R * 0.35, R * 0.35 * tilt, 0, 0, Math.PI * 2); ctx.fill();
    const k = hd.cut === 1 ? 0.5 + 0.5 * Math.sin(performance.now() / 110) : 0, bx = p.sx + R * 0.9, by = p.sy - R * 1.2, r = 11 + 3 * k;
    ctx.fillStyle = '#2f7a55'; ctx.strokeStyle = hd.cut === 1 ? '#ff4d6d' : '#d8ffe9'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hd.cut, bx, by + 1);
    return;
  }
  drawPiece(p.sx, p.sy, R, CONFIG.hydra.kind, 3, { stone: true, noShadow: true });   // stone statue (David): never mistaken for a playable hydra piece
  if (fl > 0) { ctx.fillStyle = 'rgba(255,240,200,' + (0.5 * fl).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - R * 1.1, R * 0.9, R * 1.2, 0, 0, Math.PI * 2); ctx.fill(); }
  const k = hd.hp / hd.max, bw = R * 1.9, bx = p.sx - bw / 2, by = p.sy - R * 2.6;
  ctx.fillStyle = 'rgba(20,12,28,.75)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 9); ctx.fillStyle = k > 0.5 ? '#7be0a0' : k > 0.25 ? '#ffb347' : '#ff5c5c'; ctx.fillRect(bx, by, bw * k, 5);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(hd.hp + ' / ' + hd.max, p.sx, by - 3);
}
/* ── Finale drawing: the Chimera on its dais, venom pools, poisoned pieces ── */
const CHIMERA_COL = ['#ffb347', '#b9a6d9', '#7be05a'], CHIMERA_ICON = ['🦁', '🐐', '🐍'];   // per phase: lion gold, goat grey-violet, serpent green
function drawChimera(ch) {                                        // the boss: the Chimera king piece (Gemini sprite; procedural cup if art is missing), phase aura, three phase pips, health bar
  const p = project(ch.x, ch.y), R = ch.r * p.s * 1.05, ry = R * tilt, fl = Fx.pillarFlash.get(ch.id) || 0, col = CHIMERA_COL[ch.phase], k = 0.5 + 0.5 * Math.sin(performance.now() / 260);
  ctx.fillStyle = '#2b2433'; ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(p.sx, p.sy + ry * 0.25, R * 1.25, ry * 1.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // dark dais, gold trim
  if (!ch.down) { ctx.save(); ctx.globalAlpha = 0.35 + 0.3 * k; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(p.sx, p.sy + ry * 0.25, R * (1.4 + 0.06 * k), ry * (1.4 + 0.06 * k), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  ctx.save(); if (ch.down) ctx.globalAlpha = 0.55;
  const sprite = drawPiece(p.sx, p.sy, R, CONFIG.chimera.kind, TIERS.length - 1, { noShadow: true, happy: !!ch.down });
  ctx.restore();
  if (fl > 0) { ctx.fillStyle = 'rgba(255,240,200,' + (0.5 * fl).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - R * (sprite ? 1.2 : 0.6), R * 0.95, R * (sprite ? 1.3 : 0.7), 0, 0, Math.PI * 2); ctx.fill(); }
  const top = Math.max(58, p.sy - R * (sprite ? 2.6 : 1.8)), n = CHIMERA_ICON.length;   // above the king sprite (or the procedural cup's rim), clamped so pips and bar stay on screen
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {                                    // phase pips: beaten heads dim, the current one large
    const x = p.sx + (i - (n - 1) / 2) * 30, cur = i === ch.phase && !ch.down, done = i < ch.phase || ch.down;
    ctx.globalAlpha = done ? 0.35 : 1; ctx.fillStyle = cur ? 'rgba(20,12,28,.85)' : 'rgba(20,12,28,.55)'; ctx.strokeStyle = cur ? CHIMERA_COL[i] : 'rgba(255,255,255,.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, top - 40, cur ? 13 : 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = (cur ? 16 : 12) + 'px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(CHIMERA_ICON[i], x, top - 39);
    if (done) { ctx.strokeStyle = '#ff5c5c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 9, top - 49); ctx.lineTo(x + 9, top - 31); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (ch.down) return;
  const hk = ch.hp / ch.max, bw = R * 2, bx = p.sx - bw / 2, by = top - 6;
  ctx.fillStyle = 'rgba(20,12,28,.8)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 10); ctx.fillStyle = col; ctx.fillRect(bx, by, bw * hk, 6);
  const last = ch.phase === CHIMERA_ICON.length - 1;               // last head: a crown marks that only a checkmate finishes it
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillText((last ? '♚ ' : '') + ch.hp + ' / ' + ch.max, p.sx, by - 4);
}
function drawPoison() {                                           // the serpent's venom pools (boss phase 3): sickly green puddles, bubbles rising
  const P = Game.poisonOf(game); if (!P.length) return;
  const now = performance.now() / 1000;
  for (const [x, y, r] of P) {
    const ring = (k) => { ctx.beginPath(); for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2, wob = 1 + 0.05 * Math.sin(a * 5 + now * 1.5 + x), q = project(x + Math.cos(a) * r * k * wob, y + Math.sin(a) * r * k * wob); if (i) ctx.lineTo(q.sx, q.sy); else ctx.moveTo(q.sx, q.sy); } ctx.closePath(); };
    ring(1); ctx.fillStyle = 'rgba(110,190,60,.42)'; ctx.fill(); ctx.strokeStyle = 'rgba(40,90,20,.85)'; ctx.lineWidth = 3; ctx.stroke();
    ring(0.6); ctx.fillStyle = 'rgba(70,140,40,.35)'; ctx.fill();
    const c = project(x, y);
    for (let i = 0; i < 7; i++) { const ang = i * 1.9 + x, kk = (now * 0.5 + i * 0.15) % 1; ctx.fillStyle = 'rgba(190,255,130,' + (0.75 * (1 - kk)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(c.sx + Math.cos(ang) * r * 0.6 * c.s, c.sy + Math.sin(ang) * r * 0.6 * c.s * tilt - kk * 12, 2 + 3 * kk, 0, Math.PI * 2); ctx.fill(); }
  }
}
function drawPoisonBadge(c, p, R) {                               // piece resting in venom: green badge with the shots left before it drops a tier
  const left = CONFIG.poison.life - c.poison, k = left === 1 ? 0.5 + 0.5 * Math.sin(performance.now() / 110) : 0, x = p.sx - R * 0.85, y = p.sy - R * 1.9, r = 10 + 3 * k;
  ctx.fillStyle = '#2f7a2a'; ctx.strokeStyle = left === 1 ? '#ff4d6d' : '#d8ffc8'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(left, x, y + 1);
}
function drawGazeBadge(c, p, R) {                                 // Stone Gaze: teal eye badge with the shots left before the stone falls away
  const left = Math.max(1, c.gaze - game.shots), x = p.sx + R * 0.85, y = p.sy - R * 1.9, r = 11;
  ctx.fillStyle = '#1d8f8b'; ctx.strokeStyle = '#bff0ee'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(left, x, y + 1);
}
function drawRisenWater(ly) {                                     // rising water: the band between the risen danger line and the launch line, with a wavy top
  if (ly >= LINE_Y) return;
  const now = performance.now() / 1000, top = [];
  for (let i = 0; i <= 24; i++) { const x = W * i / 24, q = project(x, ly + Math.sin(x / 40 + now * 2) * 4); top.push(q); }
  const r = project(W, LINE_Y), l = project(0, LINE_Y);
  ctx.fillStyle = 'rgba(40,110,170,.32)'; ctx.beginPath(); top.forEach((q, i) => (i ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy))); ctx.lineTo(r.sx, r.sy); ctx.lineTo(l.sx, l.sy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(210,240,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); top.forEach((q, i) => (i ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy))); ctx.stroke();
}
function drawLightCameo(C) {                                      // phoenix intro: the table starts dark; she flies across trailing fire and lights it
  const u = Math.min(1, C.t / C.max), y = project(W / 2, 300), x = -80 + (L.cw + 160) * Math.min(1, u / 0.8), gy = y.sy - 120 * y.s - Math.sin(u * Math.PI) * 40 + Math.sin(C.t * 14) * 5;
  ctx.fillStyle = 'rgba(8,12,28,' + (0.62 * (1 - Math.min(1, Math.max(0, (u - 0.15) / 0.7)))).toFixed(3) + ')'; ctx.fillRect(0, 0, L.cw, L.ch);
  if (u < 0.85 && Math.random() < 0.8) Fx.flame(x - 30 * y.s + (Math.random() - 0.5) * 20, gy + 20 * y.s, Math.random() < 0.4);
  ctx.save(); ctx.translate(x, gy); ctx.rotate(0.1 * Math.sin(C.t * 6)); drawPiece(0, 0, 56 * y.s, C.kind, TIERS.length - 1, { noShadow: true, fast: true }); ctx.restore();
}
function drawCup(c) {                                            // a piece carried by an ultimate (c.z > 0) flies: shadow on the table, piece raised, trail
  if (!c.z) return drawPieceOf(c);
  const p = project(c.x, c.y), lift = c.z * p.s, R = c.r * p.s, k = Math.min(1, c.z / 120);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.28 - 0.14 * k).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, R * (1 - 0.3 * k), R * (1 - 0.3 * k) * tilt, 0, 0, Math.PI * 2); ctx.fill();
  const u = c.air && Game.ultOf(c.air.kind);
  if (u === 'rebirth') { if (Math.random() < 0.7) Fx.flame(p.sx + (Math.random() - 0.5) * R, p.sy - lift + R * 0.3, Math.random() < 0.3); }
  else if (u === 'pierce') { const d = c.air; Fx.sparks.push({ x: p.sx, y: p.sy - lift, vx: -d.dx * 900, vy: -d.dy * 900 * tilt, life: 0.25, w: 4 }); Fx.burst(p.sx, p.sy - lift, ULT_COL.pierce, 1); }
  else if (Math.random() < 0.35) Fx.burst(p.sx + (Math.random() - 0.5) * R, p.sy - lift, KINDS[c.kind].rim, 1);
  ctx.save(); ctx.translate(0, -lift); drawPieceOf(c); ctx.restore();
}
function drawPieceOf(c) {
  const p = project(c.x, c.y);
  const scale = 1 + 0.3 * Math.sin((1 - c.pop) * Math.PI) * (c.pop > 0 ? 1 : 0);
  const sq = Fx.squash.get(c.id) || 0;                       // hit: brief squash wide / stretch tall
  if (sq > 0) { ctx.save(); ctx.translate(p.sx, p.sy); ctx.scale(1 + 0.16 * sq * JUICE.squash, 1 - 0.13 * sq * JUICE.squash); ctx.translate(-p.sx, -p.sy); }
  if (c.ult != null) {                                     // enchanted cup: pulsing aura in the move's colour
    const R = c.r * p.s * scale, k = 0.5 + 0.5 * Math.sin(performance.now() / 120), col = ULT_COL[Game.ultOf(c.ult)];
    ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * k; ctx.strokeStyle = col; ctx.lineWidth = 4 + 3 * k; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, R * (1.25 + 0.1 * k), R * (1.25 + 0.1 * k) * tilt, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (Math.random() < 0.4) Fx.burst(p.sx + (Math.random() - 0.5) * R, p.sy - R * Math.random() * 2, col, 1);
  }
  const usedSprite = drawPiece(p.sx, p.sy, c.r * p.s * scale, c.kind, c.tier, { happy: c.pop > 0, fast: Math.hypot(c.vx, c.vy) > 300 || !!c.air || Fx.face.has(c.id), blink: (performance.now() + c.id * 977) % 4200 < 150, glow: c.held, stone: c.stone });   // blink: staggered per cup, about every 4 s
  if (c.wild) {                                           // wild cup: rainbow ring
    const R = c.r * p.s * scale; ctx.strokeStyle = 'hsl(' + ((performance.now() / 5) % 360).toFixed(0) + ',95%,65%)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, R * 1.12, R * 1.12 * tilt, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (c.sting) drawStingBadge(c, p, c.r * p.s * scale);
  if (c.gaze) drawGazeBadge(c, p, c.r * p.s * scale);
  if (c.poison) drawPoisonBadge(c, p, c.r * p.s * scale);
  if (sq > 0 && !usedSprite) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.45 * sq * JUICE.squash).toFixed(3) + ')';          // white flash on hit
    const R = c.r * p.s * scale; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - R * 0.95, R, R * tilt, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (sq > 0) ctx.restore();
}
// table looks: default warm wood; 'night' = chapter 3's moonlit desert (darker, cool, still light enough for the sprites to read)
const TABLE_THEMES = {
  day:   { top: '#e7c99a', bottom: '#f3dcb4', grid: 'rgba(160,110,60,.12)', zone: 'rgba(255,255,255,.28)', line: 'rgba(120,80,40,.6)', rim: '#8a5a34' },
  night: { top: '#6f6a86', bottom: '#a99b95', grid: 'rgba(230,220,255,.10)', zone: 'rgba(255,240,220,.16)', line: 'rgba(250,236,200,.7)', rim: '#4a3a52' },
  throne: { top: '#4f4858', bottom: '#9a8d86', grid: 'rgba(255,230,180,.10)', zone: 'rgba(255,240,215,.15)', line: 'rgba(255,226,160,.75)', rim: '#6b5222' },   // finale: the cold throne hall, gold trim
  lake:  { top: '#62808c', bottom: '#a9b8ad', grid: 'rgba(220,240,255,.10)', zone: 'rgba(240,250,255,.16)', line: 'rgba(240,250,255,.75)', rim: '#2f4652' },   // chapter 4: the drowned capital
};
const TABLE_BY_CHAPTER = { 3: 'night', 4: 'lake', 5: 'throne' };
const tableTheme = () => { const lv = Game.levelOf(game); return TABLE_THEMES[(lv && TABLE_BY_CHAPTER[lv.chapter]) || 'day']; };
function drawTable() {
  const a = project(0, 0), b = project(W, 0), c = project(W, H), d = project(0, H), th = tableTheme();
  const g = ctx.createLinearGradient(0, a.sy, 0, d.sy);
  g.addColorStop(0, th.top); g.addColorStop(1, th.bottom);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(c.sx, c.sy); ctx.lineTo(d.sx, d.sy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = th.grid; ctx.lineWidth = 1;
  for (let i = 1; i < 12; i++) {
    const y = H * i / 12, l = project(0, y), r = project(W, y);
    ctx.beginPath(); ctx.moveTo(l.sx, l.sy); ctx.lineTo(r.sx, r.sy); ctx.stroke();
  }
  drawSand(); drawCurrent(); drawPoison();
  const l0 = project(0, LINE_Y), r0 = project(W, LINE_Y), ly = game.lineY == null ? LINE_Y : game.lineY, l1 = project(0, ly), r1 = project(W, ly);   // l1–r1: the danger line (risen in the hydra boss)
  ctx.fillStyle = th.zone;
  ctx.beginPath(); ctx.moveTo(l0.sx, l0.sy); ctx.lineTo(r0.sx, r0.sy); ctx.lineTo(c.sx, c.sy); ctx.lineTo(d.sx, d.sy); ctx.closePath(); ctx.fill();
  drawRisenWater(ly);
  const danger = game.dangerT > 0 && game.danger === 'lose';
  const pulse = danger ? 0.5 + 0.5 * Math.sin(performance.now() / 90) : 0;
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = danger ? `rgba(230,40,60,${0.6 + 0.4 * pulse})` : th.line;
  ctx.lineWidth = danger ? 4 : 2.5;
  ctx.beginPath(); ctx.moveTo(l1.sx, l1.sy); ctx.lineTo(r1.sx, r1.sy); ctx.stroke();
  ctx.setLineDash([]);
  if (danger) {
    const frac = Math.min(1, game.dangerT / CONFIG.rules.DANGER_T);
    ctx.fillStyle = 'rgba(230,40,60,.9)';
    ctx.fillRect(l1.sx, l1.sy - 6, (r1.sx - l1.sx) * frac, 6);
  }
  ctx.strokeStyle = th.rim; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(d.sx, d.sy); ctx.lineTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
}
// aim: launch power 0..1 (VMIN*0.6 → VMAX) and its colour, white → orange → red
const AIM = { minLen: 34, maxLen: 130, outline: 'rgba(40,22,40,.55)' };
function aimPower(v) { const P = CONFIG.phys, lo = P.VMIN * 0.6; return Math.max(0, Math.min(1, (Math.hypot(v.vx, v.vy) - lo) / (P.VMAX - lo))); }
function aimColor(k, a) {
  const c = k < 0.5 ? [255, 255 - 230 * k, 255 - 430 * k] : [255 - 40 * (k - 0.5), 140 - 180 * (k - 0.5), 40];
  return 'rgba(' + c.map(Math.round).join(',') + ',' + (a == null ? 1 : a) + ')';
}
function drawAssist() {
  if (!game.drag || !game.held) return;
  const v = Game.launchV(game);
  if (Math.hypot(v.vx, v.vy) < CONFIG.phys.VMIN * 0.6) return;
  const k = aimPower(v), col = aimColor(k);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (drawUltPreview(v)) { drawPowerBar(k, col); ctx.restore(); return; }
  if (!Game.assistOn(game)) { drawAimArrow(v, k, col); ctx.restore(); return; }
  const pts = Physics.predictPath(game.held, v, game.world.pillars, game.world.sand, game.world.current), path = () => { ctx.beginPath(); pts.forEach((q, i) => { const p = project(q.x, q.y); if (i) ctx.lineTo(p.sx, p.sy); else ctx.moveTo(p.sx, p.sy); }); };
  path(); ctx.strokeStyle = AIM.outline; ctx.lineWidth = 5; ctx.stroke();                 // dark outline: readable on the light table and on cups
  path(); ctx.setLineDash([8, 7]); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
  for (const b of pts.bounces) {                                                            // wall bounces
    const p = project(b.x, b.y); ctx.fillStyle = col; ctx.strokeStyle = AIM.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.sx, p.sy, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  const e = pts[pts.length - 1], pe = project(e.x, e.y), R = game.held.r * pe.s;           // where it stops
  ctx.beginPath(); ctx.ellipse(pe.sx, pe.sy, R, R * tilt, 0, 0, Math.PI * 2);
  ctx.strokeStyle = AIM.outline; ctx.lineWidth = 4.5; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  drawPowerBar(k, col);
  ctx.restore();
}
// an armed launch-time ultimate shows what it will do (always, aim line or not): Fly Over arc + landing ring, Stone Gaze cone, Piercing Sting line, Three Heads fan. Returns true when drawn.
function drawUltPreview(v) {
  const P = Game.ultPreview(game, v); if (!P) return false;
  const c = game.held, col = ULT_COL[Game.ultOf(c.ult)];
  if (P.land) {
    const a = project(c.x, c.y), e = project(P.land.x, P.land.y), R = c.r * e.s, mx = (a.sx + e.sx) / 2, my = Math.min(a.sy, e.sy) - 140 * e.s;
    const arc = () => { ctx.beginPath(); ctx.moveTo(a.sx, a.sy - c.r * a.s); ctx.quadraticCurveTo(mx, my, e.sx, e.sy); };
    arc(); ctx.strokeStyle = AIM.outline; ctx.lineWidth = 5; ctx.stroke(); arc(); ctx.setLineDash([3, 9]); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
    const pulse = 1 + 0.08 * Math.sin(performance.now() / 120);
    ctx.beginPath(); ctx.ellipse(e.sx, e.sy, R * pulse, R * pulse * tilt, 0, 0, Math.PI * 2); ctx.fillStyle = col + '44'; ctx.fill();
    ctx.strokeStyle = AIM.outline; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
  }
  if (P.cone) {                                                // Stone Gaze: the cone that will turn to stone
    const C = P.cone, a = project(C.x, C.y), pts = [a];
    for (let i = 0; i <= 16; i++) { const t = -C.angle + 2 * C.angle * i / 16, dx = C.dx * Math.cos(t) - C.dy * Math.sin(t), dy = C.dx * Math.sin(t) + C.dy * Math.cos(t); pts.push(project(C.x + dx * C.range, C.y + dy * C.range)); }
    ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy))); ctx.closePath();
    ctx.fillStyle = col + '30'; ctx.fill(); ctx.setLineDash([6, 8]); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
  }
  const ray = (x0, y0, x1, y1) => { const a = project(x0, y0), e = project(x1, y1); for (const [w, s] of [[5, AIM.outline], [2.5, col]]) { ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(e.sx, e.sy); ctx.lineWidth = w; ctx.strokeStyle = s; ctx.setLineDash(w > 3 ? [] : [10, 6]); ctx.stroke(); } ctx.setLineDash([]); return e; };
  if (P.line) {                                                // Piercing Sting: straight line to where it stops
    const e = ray(c.x, c.y, P.line.x, P.line.y), R = c.r * e.s;
    ctx.beginPath(); ctx.ellipse(e.sx, e.sy, R, R * tilt, 0, 0, Math.PI * 2); ctx.strokeStyle = AIM.outline; ctx.lineWidth = 4.5; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  }
  if (P.fan) for (const d of P.fan) ray(c.x, c.y, c.x + d.x * 230, c.y + d.y * 230);   // Three Heads: the three directions
  return true;
}
// Classic without the aim line: a short arrow for direction, length and colour for power (no path, no landing point)
function drawAimArrow(v, k, col) {
  const c = game.held, p = project(c.x, c.y), q = project(c.x + v.vx * 0.01, c.y + v.vy * 0.01);
  const dx = q.sx - p.sx, dy = q.sy - p.sy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const eye = Game.eqVal(game, 'eye') || 0, R = c.r * p.s, len = (AIM.minLen + (AIM.maxLen - AIM.minLen) * k) * (eye ? 1.5 : 1), x0 = p.sx + ux * R, y0 = p.sy + uy * R * tilt, x1 = x0 + ux * len, y1 = y0 + uy * len, h = 12;
  const shape = () => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * h * 0.6, y1 - uy * h * 0.6); };
  const head = () => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * h - uy * h * 0.6, y1 - uy * h + ux * h * 0.6); ctx.lineTo(x1 - ux * h + uy * h * 0.6, y1 - uy * h - ux * h * 0.6); ctx.closePath(); };
  shape(); ctx.strokeStyle = AIM.outline; ctx.lineWidth = 6.5; ctx.stroke(); head(); ctx.lineWidth = 3; ctx.stroke();
  shape(); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.stroke(); head(); ctx.fillStyle = col; ctx.fill();
  if (eye >= 2) {                                              // Seer's Eye level 2: where it stops
    const pts = Physics.predictPath(c, v, game.world.pillars, game.world.sand, game.world.current), e = pts[pts.length - 1], pe = project(e.x, e.y), Re = c.r * pe.s;
    ctx.beginPath(); ctx.ellipse(pe.sx, pe.sy, Re, Re * tilt, 0, 0, Math.PI * 2); ctx.strokeStyle = AIM.outline; ctx.lineWidth = 4.5; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  }
}
function drawPowerBar(k, col) {                              // vertical power bar beside the held cup
  const c = game.held, p = project(c.x, c.y), R = c.r * p.s, x = p.sx - R - 24, h = 64, y = p.sy - h + 6;
  ctx.fillStyle = AIM.outline; rr(x - 2, y - 2, 12, h + 4, 6); ctx.fill();
  ctx.fillStyle = col; rr(x, y + h * (1 - k), 8, Math.max(4, h * k), 4); ctx.fill();
}
