/* Kings of Cups — src/app/main.js
 * APP · startup: debug panel, frame() loop, resize hooks, service-worker registration, window.__* test hooks. Loaded last.
 * Depends on: everything above.
 * Must not touch: game rules.
 */
'use strict';

/* ───────── Debug panel (tap the version label bottom right): for diagnosing the iPhone home-screen app ───────── */
const dbg = { frames: 0, doc: '-', ptr: '-', touches: 0, begin: '-' };
document.addEventListener('pointerdown', e => { dbg.doc = e.pointerType + '@' + Math.round(e.clientX) + ',' + Math.round(e.clientY); }, true);
document.addEventListener('touchstart', () => { dbg.touches++; }, { capture: true, passive: true });
function dbgText() {
  const r = canvas.getBoundingClientRect(), vv = window.visualViewport, h = game.held;
  const standalone = !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
  return [APP_VERSION + '  standalone=' + standalone + '  sw=' + !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    'inner=' + innerWidth + 'x' + innerHeight + '  vv=' + (vv ? Math.round(vv.width) + 'x' + Math.round(vv.height) + '@' + Math.round(vv.offsetTop) : '-') + '  dpr=' + devicePixelRatio,
    'canvas=' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + '  L.ok=' + L.ok + ' f=' + L.f.toFixed(3) + ' k=' + L.k.toFixed(3) + ' top=' + Math.round(L.top),
    'frames=' + dbg.frames + '  flow=' + flow.state + '  phase=' + game.phase + '  drag=' + !!game.drag + '  held=' + (h ? Math.round(h.x) + ',' + Math.round(h.y) : '-'),
    'touchstart=' + dbg.touches + '  doc-pointerdown=' + dbg.doc,
    'canvas-pointerdown=' + dbg.ptr + '  beginDrag=' + dbg.begin,
    'sprite-fails=' + Sprites.stats.fails + (Sprites.stats.last ? ' (' + Sprites.stats.last + ')' : '') + '  cache=' + Sprites.cache.size,
    'external-errors=' + window.__ext.length + (window.__ext.length ? ' (' + window.__ext[window.__ext.length - 1] + ')' : '')].join('\n');
}
{ const v = document.createElement('div'); v.id = 'ver'; v.textContent = APP_VERSION; document.body.appendChild(v);
  const panel = document.getElementById('dbg'); let timer = 0;
  v.addEventListener('click', () => { const on = panel.style.display !== 'block'; panel.style.display = on ? 'block' : 'none';
    clearInterval(timer); if (on) { panel.textContent = dbgText(); timer = setInterval(() => { panel.textContent = dbgText(); }, 300); } }); }

/* ───────── Main loop ───────── */
let last = performance.now();
function frame(now) {
  try {
    dbg.frames++;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const gdt = Fx.slow > 0 ? dt * CONFIG.ults.slowmo.k : dt; Fx.slow = Math.max(0, Fx.slow - dt);   // ultimate: brief slow motion
    if (flow.state === 'playing') { if (Fx.hitstop > 0) Fx.hitstop -= dt; else handleEvents(Game.update(game, gdt)); }   // hit-stop: physics pauses briefly on heavy hits
    Fx.update(dt); Tutor.update(dt);
    refreshHud(); refreshNext(); refreshItems(); refreshGear();
    render();
  } catch (e) { reportError(e); }
  finally { requestAnimationFrame(frame); }          // whatever goes wrong, the loop must keep running
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 100));
window.addEventListener('pageshow', layout);
if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);
if (window.ResizeObserver) new ResizeObserver(layout).observe(document.getElementById('stage'));   // re-layout whenever the stage resizes (most reliable for the iOS home-screen app)
layout(); showScreen();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {   // PWA: playable offline (not registered on file://)
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

window.SC = SC; window.__game = game; window.__flow = flow; window.__act = act; window.__sfx = Sfx; window.__sprites = Sprites; window.__project = project; window.__render = render; window.__tutor = Tutor; window.__fx = Fx;   // for debugging and automated tests
