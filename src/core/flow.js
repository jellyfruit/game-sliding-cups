/* Kings of Cups — src/core/flow.js
 * CORE · Flow: screen state machine; the transition table is the spec.
 * Depends on: nothing.
 * Must not touch: the DOM (the app renders screens from flow.state).
 */
'use strict';

/* ───────── FLOW (screen state machine; the transition table is the spec)───────── */
const Flow = (() => {
  const T = {
    title:   { enter: 'menu' },
    menu:    { start: 'playing', kinds: 'kinds', levels: 'levels', armory: 'armory', settings: 'settings' },
    armory:  { menu: 'menu' },
    settings: { menu: 'menu', backup: 'backup' },
    backup:  { settings: 'settings' },
    levels:  { brief: 'brief', menu: 'menu', story: 'story' },
    story:   { brief: 'brief', levels: 'levels', story: 'story' },   // chapter cards; story → story chains a closing card into the next opening
    brief:   { start: 'playing', levels: 'levels' },
    kinds:   { menu: 'menu', codex: 'codex' },
    codex:   { kinds: 'kinds' },
    playing: { pause: 'paused', gameover: 'result', clear: 'result', menu: 'menu' },
    paused:  { resume: 'playing', restart: 'playing', menu: 'menu', levels: 'levels' },
    result:  { restart: 'playing', brief: 'brief', menu: 'menu', story: 'story' },
  };
  const create = (start) => ({ state: start || 'title' });   // the app opens on the title screen
  function send(f, ev) { const n = T[f.state][ev]; if (!n) return false; f.state = n; return true; }
  return { create, send };
})();
