/* Kings of Cups — src/app/renderer.js
 * APP · render(): one frame — table, hazards, cups, aim, effects, overlays (gathers, cluster links, popups, mode info).
 * Depends on: draw.js, sprites.js, fx.js, tutor.js, stage.js.
 * Must not touch: game state (read only).
 */
'use strict';

// cluster merge animation: the absorbed cups flash white where they sit, then fly into the merge point (visual only; the merged cup is hidden until they arrive)
function drawGathers() {
  for (const g of Fx.gathers) {
    const u = Math.max(0, (g.t - g.flashT) / (g.max - g.flashT)), e = u * u * (3 - 2 * u), flash = g.t < g.flashT ? g.t / g.flashT : 1 - 0.4 * u;
    const c = project(g.x, g.y);
    for (const f of g.from) {
      const q = project(f.x, f.y), sx = q.sx + (c.sx - q.sx) * e, sy = q.sy + (c.sy - q.sy) * e, R = CONFIG.tiers[g.tier].r * q.s * (1 - 0.2 * e);
      drawPiece(sx, sy, R, g.kind, g.tier, { noShadow: u > 0.5 });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, flash * 0.95);
      const gr = ctx.createRadialGradient(sx, sy - R * 0.9, 0, sx, sy - R * 0.9, R * 1.5);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy - R * 0.9, R * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (u > 0.85) {                                               // arrival: bright bloom at the merge point
      const R = CONFIG.tiers[g.tier + 1].r * c.s * 1.6, a = (u - 0.85) / 0.15;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
      const gr = ctx.createRadialGradient(c.sx, c.sy - R * 0.5, 0, c.sx, c.sy - R * 0.5, R);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c.sx, c.sy - R * 0.5, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}
// cluster preview: matching cups close enough to join are linked by pulsing white lines; if the cup in hand matches, the line brightens and shows the result size
function drawClusterLinks() {
  if (flow.state !== 'playing') return;
  const T = CONFIG.cluster.touch, cs = game.world.cups.filter(c => !c.held && !c.dead && !c.stone && !c.wild);
  const seen = new Set(), pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260), held = game.held && !game.held.wild ? game.held : null;
  for (const a of cs) {
    if (seen.has(a.id)) continue;
    const comp = [a]; seen.add(a.id);
    for (let i = 0; i < comp.length; i++) for (const c of cs) if (!seen.has(c.id) && c.kind === a.kind && c.tier === a.tier && Math.hypot(c.x - comp[i].x, c.y - comp[i].y) < comp[i].r + c.r + T) { seen.add(c.id); comp.push(c); }
    if (comp.length < 2 || a.tier >= CONFIG.tiers.length - 1) continue;
    const match = held && held.kind === a.kind && held.tier === a.tier, hot = match || comp.length >= 3;
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,' + ((match ? 0.8 : 0.35) + 0.2 * pulse).toFixed(2) + ')'; ctx.lineWidth = match ? 4 : 2.5; ctx.setLineDash([2, 7]);
    let cx = 0, cy = 0;
    for (let i = 0; i < comp.length; i++) {
      const p = project(comp[i].x, comp[i].y); cx += p.sx; cy += p.sy;
      for (let j = i + 1; j < comp.length; j++) if (Math.hypot(comp[i].x - comp[j].x, comp[i].y - comp[j].y) < comp[i].r + comp[j].r + T) { const q = project(comp[j].x, comp[j].y); ctx.beginPath(); ctx.moveTo(p.sx, p.sy - 6); ctx.lineTo(q.sx, q.sy - 6); ctx.stroke(); }
    }
    ctx.restore();
    if (match) {                                                  // preview of the result: size of the merge if the held cup joins
      const n = comp.length + 1; cx /= comp.length; cy /= comp.length;
      ctx.save(); ctx.font = '800 20px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(70,40,90,.85)'; ctx.fillStyle = '#fff';
      const txt = '×' + n; ctx.strokeText(txt, cx, cy - 58); ctx.fillText(txt, cx, cy - 58); ctx.restore();
    }
  }
}
function render() {
  if (!L.ok) return;
  ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
  ctx.clearRect(0, 0, L.cw, L.ch);
  ctx.save();
  if (Fx.shake > 0) ctx.translate((Math.random() - 0.5) * 2 * Fx.shake, (Math.random() - 0.5) * 2 * Fx.shake);   // screen shake (table only, not the UI)
  drawTable();
  const list = game.world.cups.concat(game.world.pillars).sort((a, b) => (a.z ? 1e4 : 0) + a.y - (b.z ? 1e4 : 0) - b.y);   // flying pieces on top
  drawPools();
  const hideIds = new Set(Fx.gathers.map(g => g.newId));
  if (Fx.cameo && !Fx.cameo.landed) hideIds.add(Fx.cameo.id);              // griffin cameo: the cup appears when it lands
  for (const c of list) if (c.hp != null) (c.guard ? drawGuard(c) : c.head ? drawHead(c) : c.chimera ? drawChimera(c) : drawPillar(c)); else if (!hideIds.has(c.id)) drawCup(c);
  drawStings(); drawCameo();
  drawClusterLinks(); drawGathers();
  drawAssist(); drawDemo();                                               // aim on top of the cups so the sprites never hide it
  for (const r of Fx.rings) {                                    // impact rings
    const k = 1 - r.life / r.max, rad = r.r1 * (0.3 + 0.7 * k);
    ctx.strokeStyle = 'rgba(255,248,220,' + (r.str * (1 - k) * JUICE.rings).toFixed(3) + ')'; ctx.lineWidth = 5 * (1 - k) + 1.5;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * tilt, 0, 0, Math.PI * 2); ctx.stroke();
  }
  for (const f of Fx.flames) {                                    // flames: yellow → orange → red from the centre, transparent edge
    const k = f.life / f.max, r = f.r * (0.4 + 0.6 * k), gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
    gr.addColorStop(0, 'rgba(255,244,170,' + (0.95 * k).toFixed(3) + ')'); gr.addColorStop(0.45, 'rgba(255,150,40,' + (0.8 * k).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(200,40,10,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = 'round';
  for (const p of Fx.sparks) {                                   // sparks
    ctx.strokeStyle = 'rgba(236,222,196,' + Math.min(1, p.life * 4).toFixed(3) + ')'; ctx.lineWidth = p.w;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke();
  }
  ctx.restore();

  drawNextBox(); drawParticlesAndPopups(); drawModeInfo(); drawHint(); drawCutin();
}

// top-layer info (not affected by screen shake)
function drawNextBox() {                                      // the Next cup lives in the tray (refreshNext); only the pressure level stays here
  const lv = Game.rampLevel(game);
  if (lv > 0) { ctx.fillStyle = 'rgba(255,200,120,.95)'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t('fx.lv', { n: lv }), 12, 16); }
}
function drawParticlesAndPopups() {
  for (const p of Fx.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 18px sans-serif';
  for (const p of Fx.popups) {
    ctx.globalAlpha = Math.min(1, p.life * 1.5);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,30,60,.8)'; ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = '#fff'; ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}
function drawModeInfo() {                                    // mode label + level goal
  if (game.mode.banner) {
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(t(game.mode.banner), L.cw - 12, 20);
  }
  const lv = Game.levelOf(game);
  if (lv) {                                                     // level goal + progress and shot count, top right
    const gp = Game.goalProgress(game), done = gp.have >= gp.need;
    const txt = '🎯 ' + goalText(lv) + '  ' + gp.have + '/' + gp.need;
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 20;
    ctx.fillStyle = done ? 'rgba(80,170,90,.85)' : 'rgba(0,0,0,.4)'; rr(L.cw - 10 - w, 4, w, 26, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, L.cw - 20, 17);
    ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
    const sh = lv.shotLimit ? t('hud.shotsOf', { n: game.shots, m: lv.shotLimit }) : t('hud.shots', { n: game.shots });
    ctx.fillText(sh + '   ' + starStr(Game.starsFor(lv, game.shots)), L.cw - 14, 42);
    const hz = ['roar', 'curse'].map(k => [k, Game.hazardIn(game, k)]).filter(([, n]) => n != null);   // finale: shots until the next roar / curse
    if (hz.length) { ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = hz.some(([, n]) => n === 1) ? '#ffb3a0' : 'rgba(255,255,255,.85)'; ctx.fillText(hz.map(([k, n]) => t('hud.' + k, { n })).join('   '), L.cw - 14, 60); }
  }
}
