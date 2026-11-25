/* Kings of Cups — src/app/stage.js
 * APP · startup parameters (?kinds, ?seed), the running `game`, the canvas, layout / project / toWorld, rr().
 * Depends on: the core, save. Everything drawn uses project() from here.
 * Must not touch: the save, Flow.
 */
'use strict';

/* ───────── Startup parameters ───────── */
const params = new URLSearchParams(location.search);
const urlKinds = parseInt(params.get('kinds')) > 0 ? Math.min(Profile.NB, parseInt(params.get('kinds'))) : 0;   // ?kinds=N for testing: force the first N creatures
const activeKinds = () => urlKinds ? Array.from({ length: urlKinds }, (_, i) => i) : save.active;
const seedParam = params.get('seed');
const game = Game.create({ kinds: activeKinds(), mode: 'classic', seed: seedParam != null ? parseInt(seedParam) : undefined });

/* ───────── Renderer (2.5D view from above at an angle)───────── */
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let L = { cw: 0, ch: 0, dpr: 1, cx: 0, top: 0, f: 1, k: 1, ok: false };
let tilt = TILT;
function layout() {
  const r = canvas.getBoundingClientRect();
  if (!(r.width >= 50 && r.height >= 50)) { L.ok = false; return; }   // size not ready (can be 0 when launched from the iOS home screen) → skip until ResizeObserver fires
  L.ok = true;
  L.cw = r.width; L.ch = r.height; L.dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(L.cw * L.dpr);
  canvas.height = Math.round(L.ch * L.dpr);
  // leave room above the table: the tallest piece (king, ~ART_TOP world units) must stay on screen at the far edge
  const pad = 8, ART_TOP = 174, R6 = TIERS[TIERS.length - 1].r, sAvg = (S_FAR + 1) / 2, sTop = S_FAR + (1 - S_FAR) * (R6 / H);
  let f, k, headroom = 58;
  for (let i = 0; i < 4; i++) {                       // headroom depends on scale and scale on headroom → iterate a few times to converge
    f = (L.cw - pad * 2) / W;
    const avail = L.ch - pad - headroom;
    tilt = Math.max(0.7, Math.min(0.88, avail / (f * sAvg * H)));
    k = tilt * f * sAvg;
    if (k * H > avail) { k = avail / H; f = k / (tilt * sAvg); }
    headroom = Math.max(58, ART_TOP * f * sTop - R6 * k + 6);
  }
  L.f = f; L.k = k; L.cx = L.cw / 2; L.top = L.ch - pad - k * H;
}
function project(x, y) {
  const s = S_FAR + (1 - S_FAR) * (y / H);
  return { sx: L.cx + (x - W / 2) * L.f * s, sy: L.top + y * L.k, s: L.f * s };
}
function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  const y = (sy - L.top) / L.k;
  const s = S_FAR + (1 - S_FAR) * (y / H);
  return { x: W / 2 + (sx - L.cx) / (L.f * s), y };
}
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
