/* Kings of Cups — src/app/input.js
 * APP · Input: turns canvas pointer events into Game.beginDrag / dragTo / endDrag.
 * Depends on: game, toWorld, Sfx.
 * Must not touch: rendering, the save.
 */
'use strict';

/* ───────── Input (only turns pointer events into Game calls)───────── */
canvas.addEventListener('pointerdown', e => {
  if (flow.state !== 'playing') return;
  const w = toWorld(e);
  const began = Game.beginDrag(game, w.x, w.y, e.pointerId, e.timeStamp);
  dbg.ptr = Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' → world ' + Math.round(w.x) + ',' + Math.round(w.y); dbg.begin = began;
  if (began) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
});
canvas.addEventListener('pointermove', e => {
  if (!game.drag) return;
  const w = toWorld(e);
  if (Game.dragTo(game, w.x, w.y, e.pointerId, e.timeStamp) === 'launched') {
    const c = game.world.cups.reduce((a, b) => (a.id > b.id ? a : b));   // the cup just launched
    Sfx.play('launch', Math.hypot(c.vx, c.vy));
  }
});
const endDrag = e => Game.endDrag(game, e.pointerId);
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
