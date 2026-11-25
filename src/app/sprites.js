/* Kings of Cups — src/app/sprites.js
 * APP · Sprites: creature art (art/<kind>/…, ASSET_SPEC.md) with a cache and procedural fallback; drawPiece / drawCupAt.
 * Depends on: KINDS, TIERS, ctx, L (stage.js), activeKinds.
 * Must not touch: game state.
 */
'use strict';

/* ───────── Sprites (art/<kind>/<kind>_t<tier>.png, spec in ASSET_SPEC.md; falls back to procedural drawing)───────── */
const CONFIG_ART = { maxPop: 1.3 };                           // largest pop/merge scale-up a cup is drawn at (sizes the sprite cache)
const Sprites = (() => {
  const IMG = 768, AX = 384, AY = 690, RIM_R = 128;          // canvas size, anchor (cup bottom centre), rim radius (px)
  const enabled = params.get('art') !== '0';                 // ?art=0 forces procedural drawing (for comparison)
  const imgs = {};
  function load(key) {
    let e = imgs[key]; if (e) return e;
    e = imgs[key] = { img: new Image(), ok: false };
    // Usable as soon as it loads. decode() is only a head start (unpack the PNG off the main thread, then make the
    // pre-scaled copy early): iOS Safari's decode() can fail or never finish, so nothing waits on it — a sprite whose
    // decode hangs is still drawn (in 10.7.1 it wasn't, and those cups fell back to the plain procedural cup).
    // A failed load is retried a couple of times (flaky network / service worker) before giving up on procedural.
    const tier = +key.split('_t')[1][0] - 1, src = 'art/' + key.split('_')[0] + '/' + key + '.png';
    let tries = 0;
    e.img.onload = () => {
      e.ok = true;
      // the small cached copy is only made once the image is decoded (or after 2 s): a copy made from a not-yet-decoded
      // image can come out blank on iOS and would then be cached; until then the full image is drawn directly
      const ready = () => { if (e.img._ready) return; e.img._ready = true; try { if (L.ok) scaled(e.img, tier); } catch (err) {} };
      if (e.img.decode) { e.img.decode().then(ready, ready); setTimeout(ready, 2000); } else ready();
    };
    e.img.onerror = () => { if (++tries <= 2) setTimeout(() => { e.img.src = src + '?r=' + tries; }, 1500 * tries); };
    e.img.src = src;
    return e;
  }
  const keyOf = (kind, tier, v) => KINDS[kind].id + '_t' + (tier + 1) + (v || '');
  // get an image; variant may be '_happy' / '_fast' / '_blink' (falls back to idle). null = draw procedurally
  function get(kind, tier, variant) {
    if (!enabled || KINDS[kind].art === false) return null;
    const usable = (e) => e.ok && e.img.complete && e.img.naturalWidth > 0;
    const base = load(keyOf(kind, tier)); if (!usable(base)) return null;
    if (variant) { const v = load(keyOf(kind, tier, variant)); if (usable(v)) return v.img; }
    return base.img;
  }
  function preload(kinds) { if (enabled) for (const k of kinds.filter(k => KINDS[k].art !== false)) for (let t = 0; t < TIERS.length; t++) for (const v of ['', '_happy', '_fast', '_blink']) load(keyOf(k, t, v)); }
  // Pre-scaled cache: drawing a 768 px sprite shrunk to ~100 px every frame is slow on iPad (and keeps many big
  // textures alive). Each sprite is shrunk once (high quality, cropped to the art box) to the largest size it can
  // appear at for the current layout; frames then draw that small copy with at most a light extra shrink.
  const CROP = { x: 196, y: 340, w: 396, h: 428 };                  // union of all sprites' visible pixels + margin
  const cache = new Map(); let cacheSig = '';
  const stats = { fails: 0, last: '' };                           // shown in the debug panel
  const free = (cv) => { if (cv) { cv.width = 0; cv.height = 0; } };   // iOS counts canvas memory until GC: release old copies at once
  // returns the small copy, or null (not decoded yet / the canvas could not be made) → caller draws the full image
  function scaled(img, tier) {
    const sig = L.f.toFixed(3) + '@' + L.dpr; if (sig !== cacheSig) { for (const c of cache.values()) { free(c.cv); free(c.stone); } cache.clear(); cacheSig = sig; }
    let c = cache.get(img); if (c) return c;
    if (!img._ready) return null;
    const R = TIERS[tier].r * L.f * CONFIG_ART.maxPop * L.dpr;      // biggest on-screen radius in device pixels
    const sc = Math.min(1, R / RIM_R);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(CROP.w * sc); cv.height = Math.ceil(CROP.h * sc);
    const g = cv.width > 0 && cv.height > 0 ? cv.getContext('2d') : null;
    if (!g) { free(cv); return null; }                           // iOS returns null when canvas memory is used up
    try { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, cv.width, cv.height); }
    catch (err) { free(cv); stats.fails++; stats.last = String(err && err.message || err); return null; }
    c = { cv, sc }; cache.set(img, c); return c;
  }
  // petrified look: the same small copy turned grey-blue stone with dark cracks (made once per sprite)
  function stoneOf(img, tier) {
    const c = scaled(img, tier); if (!c) return null; if (c.stone) return c.stone;
    const cv = document.createElement('canvas'); cv.width = c.cv.width; cv.height = c.cv.height;
    const g = cv.getContext('2d'); if (!g) { free(cv); return null; } g.drawImage(c.cv, 0, 0);
    g.globalCompositeOperation = 'color'; g.fillStyle = '#8f99ab'; g.fillRect(0, 0, cv.width, cv.height);        // keep light and dark, colour → cool slate
    g.globalCompositeOperation = 'screen'; g.fillStyle = '#3c3f48'; g.fillRect(0, 0, cv.width, cv.height);       // lift the darks so it reads as stone, not shadow
    g.globalCompositeOperation = 'destination-in'; g.drawImage(c.cv, 0, 0);                                       // keep the sprite's shape
    g.globalCompositeOperation = 'source-atop'; g.strokeStyle = 'rgba(20,20,28,.75)'; g.lineWidth = Math.max(1, cv.width / 90);
    const w = cv.width, h = cv.height;
    for (const [x0, y0] of [[0.42, 0.25], [0.58, 0.45], [0.38, 0.6]]) { g.beginPath(); g.moveTo(w * x0, h * y0); g.lineTo(w * (x0 + 0.05), h * (y0 + 0.07)); g.lineTo(w * (x0 - 0.01), h * (y0 + 0.13)); g.lineTo(w * (x0 + 0.04), h * (y0 + 0.2)); g.stroke(); }
    c.stone = cv; return cv;
  }
  function draw(img, sx, sy, R, tier, stone) {
    const sc = R / RIM_R;
    ctx.imageSmoothingEnabled = true;
    if (tier == null) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sx - AX * sc, sy - AY * sc, IMG * sc, IMG * sc); return true; }
    const c = scaled(img, tier), src = c && (stone ? stoneOf(img, tier) : c.cv);
    if (!src) {                                                  // no small copy (yet): draw the full image (slower, but never invisible)
      if (stone) return false;                                   // stone look needs the copy: let the caller draw the procedural stone cup
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sx - AX * sc, sy - AY * sc, IMG * sc, IMG * sc); return true;
    }
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(src, sx + (CROP.x - AX) * sc, sy + (CROP.y - AY) * sc, CROP.w * sc, CROP.h * sc);
    return true;
  }
  return { get, preload, draw, enabled, imgs, cache, stats };
})();
Sprites.preload(activeKinds());
// draw a cup: sprite if available (we draw shadow and glow ourselves), else procedural. Returns whether a sprite was used
function drawPiece(sx, sy, R, kind, tier, st) {
  st = st || {};
  let img = Sprites.get(kind, tier, st.stone ? '' : st.happy ? '_happy' : st.fast ? '_fast' : st.blink ? '_blink' : '');   // stone: no expressions
  if (img && st.stone && !Sprites.cache.has(img)) img = null;     // stone sprite not ready yet: procedural stone cup this frame
  if (!img) { drawCupAt(sx, sy, R, kind, tier, st); if (st.stone) { ctx.fillStyle = 'rgba(120,128,140,.75)'; ctx.beginPath(); ctx.ellipse(sx, sy - R * 0.95, R, R * tilt, 0, 0, Math.PI * 2); ctx.fill(); } return false; }
  const ry = R * tilt;
  if (!st.noShadow) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sx + R * 0.06, sy + ry * 0.12, R * 1.04, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  if (st.glow) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy, R * 1.15, ry * 1.15, 0, 0, Math.PI * 2); ctx.stroke(); }
  let ok = false;
  try { ok = Sprites.draw(img, sx, sy, R, st.hud ? null : tier, st.stone); } catch (err) { Sprites.stats.fails++; Sprites.stats.last = String(err && err.message || err); }
  if (!ok) drawCupAt(sx, sy, R, kind, tier, st);                // a sprite that fails to draw falls back to the procedural cup instead of vanishing
  return ok;
}
function drawCupAt(sx, sy, R, kind, tier, st) {          // procedural fallback cup
  st = st || {};
  const K = KINDS[kind];
  const ry = R * tilt, hgt = R * 0.95, topY = sy - hgt, rb = R * 0.8, ryb = ry * 0.8;
  if (!st.noShadow) {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(sx + R * 0.06, sy + ry * 0.12, R * 1.04, ry * 1.0, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (st.glow) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx, sy, R * 1.15, ry * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(sx - R, topY); ctx.lineTo(sx - rb, sy);
  ctx.ellipse(sx, sy, rb, ryb, 0, Math.PI, 0, true);
  ctx.lineTo(sx + R, topY);
  ctx.ellipse(sx, topY, R, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  const g = ctx.createLinearGradient(sx - R, 0, sx + R, 0);
  g.addColorStop(0, K.dark); g.addColorStop(0.35, K.body); g.addColorStop(0.7, K.body); g.addColorStop(1, K.dark);
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = K.rim;
  ctx.beginPath(); ctx.ellipse(sx, topY, R, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = K.dark;
  ctx.beginPath(); ctx.ellipse(sx, topY + ry * 0.06, R * 0.82, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.font = 'bold ' + Math.max(8, R * 1.15) + 'px "Segoe UI Symbol","Apple Symbols","Noto Sans Symbols 2",serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(1, R * 0.07); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.fillStyle = '#fff';
  const gl = TIERS[tier].glyph + '︎', gy = topY + ry * 0.55;
  ctx.strokeText(gl, sx, gy); ctx.fillText(gl, sx, gy);
  ctx.restore();
  ctx.strokeStyle = K.rim; ctx.lineWidth = Math.max(1.5, R * 0.1);
  ctx.beginPath(); ctx.ellipse(sx, topY, R, ry, 0, 0, Math.PI); ctx.stroke();
  const fy = topY + hgt * 0.62, ex = R * 0.34, er = Math.max(1.4, R * 0.085);
  ctx.fillStyle = '#3a2a2a'; ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = Math.max(1.2, R * 0.06);
  if (st.happy) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(sx + s * ex, fy, er * 1.5, Math.PI, 0); ctx.stroke(); } }
  else { for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(sx + s * ex, fy, er, 0, Math.PI * 2); ctx.fill(); } }
  ctx.fillStyle = 'rgba(255,120,150,.45)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx + s * ex * 1.55, fy + er * 2.2, er * 1.6, er, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#3a2a2a'; ctx.fillStyle = '#3a2a2a';
  if (st.fast) { ctx.beginPath(); ctx.ellipse(sx, fy + er * 3.2, er * 1.1, er * 1.4, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(sx, fy + er * 1.8, er * 1.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
}
