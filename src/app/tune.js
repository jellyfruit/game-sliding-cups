/* Kings of Cups — src/app/tune.js
 * APP · Tune: David's on-device tuning panel (Tuning tab of the debug panel) — sliders for a curated list of CONFIG / JUICE values,
 *   overrides kept in localStorage under their own key, live apply, export of the changed values as JSON, and the "TUNING ON" badge.
 * Lock: hidden on every device until it opens the game once with ?tune=elden (flag key FLAG); ?tune=off removes the flag and all overrides.
 *   Without the flag nothing is read or applied. Core is never touched: Node tests, bots and the golden baseline never load this file.
 * While overrides are active (or were during this run) the app skips best scores, VP and level rewards (Tune.blocks, used in fx.js / ui.js).
 * Depends on: CONFIG, JUICE (fx.js), t() (i18n.js), game (stage.js). Loaded after ui.js, before main.js (main.js opens the tab).
 * Must not touch: the save file, core files, game rules.
 */
'use strict';

const Tune = (() => {
  const FLAG = 'slidingcups.tune.on', KEY = 'slidingcups.tune';
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  // Curated sliders: [key, min, max, step, restart?]. Keys: CONFIG path, 'JUICE.<name>', or 'level.<level id>.<path>' (level data).
  // Labels: STR 'tune.g.<group>' and 'tune.k.<key>'. restart = only read when a run starts (UI says "next run").
  const GROUPS = [
    ['launch', [['phys.KNEE', 300, 1200, 25], ['phys.GAIN', 0.5, 1.5, 0.05], ['phys.GAIN_HI', 0.8, 3, 0.05], ['phys.VMAX', 2000, 5000, 100]]],
    ['friction', [['phys.A', 300, 900, 10], ['phys.K', 0, 1.5, 0.05]]],
    ['bounce', [['phys.E', 0.2, 0.95, 0.05], ['phys.EW', 0.1, 0.9, 0.05]]],
    ['juice', [['JUICE.shake', 0, 1.5, 0.05], ['JUICE.hitstop', 0, 1.5, 0.05], ['JUICE.sparks', 0, 1.5, 0.05], ['JUICE.squash', 0, 1.5, 0.05], ['JUICE.rings', 0, 1.5, 0.05]]],
    ['rules', [['rules.DANGER_T', 1, 6, 0.25], ['cluster.touch', 0, 80, 2]]],
    ['chapters', [['sand.fric', 1, 10, 0.2], ['current.accel', 0, 390, 10], ['current.drift', 0, 300, 10]]],
    ['finale', [['roar.push', 0, 700, 10], ['poison.life', 1, 6, 1], ['level.chimera.chimera.hp.0', 3, 30, 1, true], ['level.chimera.chimera.hp.1', 3, 30, 1, true], ['level.chimera.chimera.hp.2', 3, 30, 1, true]]],
  ];
  const SLIDERS = GROUPS.flatMap(([, list]) => list.map(([key, min, max, step, restart]) => ({ key, min, max, step, restart: !!restart })));
  function ref(key) {                                   // → { o, k } so that o[k] is the value
    const p = key.split('.'); let o;
    if (p[0] === 'JUICE') { o = JUICE; p.shift(); }
    else if (p[0] === 'level') { p.shift(); const id = p.shift(); o = CONFIG.levels.find(l => l.id === id); }
    else o = CONFIG;
    while (o && p.length > 1) o = o[p.shift()];
    return o && typeof o[p[0]] === 'number' ? { o, k: p[0] } : null;
  }
  const get = (key) => { const r = ref(key); return r ? r.o[r.k] : null; };
  const put = (key, v) => { const r = ref(key); if (r) r.o[r.k] = v; };
  const DEF = {}; for (const s of SLIDERS) DEF[s.key] = get(s.key);   // defaults = the shipped values (before any override)
  const dec = (step) => (String(step).split('.')[1] || '').length;
  const snap = (s, v) => +Math.min(s.max, Math.max(s.min, Math.round(v / s.step) * s.step)).toFixed(dec(s.step));

  // The lock: ?tune=elden turns this device on, ?tune=off turns it off and forgets every override
  const q = new URLSearchParams(location.search).get('tune');
  if (q === 'elden') ls.set(FLAG, '1');
  else if (q === 'off') { ls.del(FLAG); ls.del(KEY); }
  const enabled = ls.get(FLAG) === '1';

  let over = {};                                        // key → value, only values that differ from the default
  if (enabled) {
    try { over = JSON.parse(ls.get(KEY)) || {}; } catch (e) { over = {}; }
    for (const k of Object.keys(over)) { const s = SLIDERS.find(x => x.key === k); if (!s || typeof over[k] !== 'number' || !ref(k)) delete over[k]; else put(k, snap(s, over[k])); }
  }
  let taintWorld = null;                                // the run (world object) that had overrides active at some point
  const active = () => enabled && Object.keys(over).length > 0;
  const store = () => { if (Object.keys(over).length) ls.set(KEY, JSON.stringify(over)); else ls.del(KEY); };
  function set(key, v) {
    const s = SLIDERS.find(x => x.key === key); if (!s || !enabled) return;
    v = snap(s, v); put(key, v);
    if (v === DEF[key]) delete over[key]; else over[key] = v;
    store(); refreshBadge(); paintRow(key);
  }
  function resetAll() { for (const k of Object.keys(over)) put(k, DEF[k]); over = {}; store(); refreshBadge(); if (panel) build(); }
  const exportJSON = () => JSON.stringify(over);

  /* ───────── UI: tab bar (Debug | Tuning), the panel, the badge ───────── */
  let panel = null, tabs = null, badge = null;
  const fmt = (s, v) => (v == null ? '—' : Number(v).toFixed(dec(s.step)));
  function paintRow(key) {
    if (!panel) return; const row = panel.querySelector('[data-key="' + key + '"]'); if (!row) return;
    const s = SLIDERS.find(x => x.key === key), v = get(key);
    row.querySelector('input').value = v; row.querySelector('.tv').textContent = fmt(s, v);
    row.classList.toggle('chg', key in over);
  }
  function build() {
    let h = `<div class="th">${t('tune.hint')}</div>`;
    for (const [g, list] of GROUPS) {
      h += `<h4>${t('tune.g.' + g)}</h4>`;
      for (const [key, min, max, step, restart] of list) {
        h += `<div class="tr" data-key="${key}"><div class="tl"><span>${t('tune.k.' + key)}</span><b class="tv"></b></div>
          <div class="ts"><button data-tstep="-1">−</button><input type="range" min="${min}" max="${max}" step="${step}"><button data-tstep="1">+</button></div>
          <div class="td"><code>${key}</code> · <button class="tdef" data-tdef="1">${t('tune.def', { v: fmt({ step }, DEF[key]) })}</button>${restart ? ' · ' + t('tune.restart') : ''}</div></div>`;
      }
    }
    h += `<div class="tb"><button data-tact="export">${t('tune.export')}</button><button data-tact="reset">${t('tune.reset')}</button></div>
      <p class="tmsg"></p><textarea class="tjson" readonly rows="3"></textarea>`;
    panel.innerHTML = h;
    for (const s of SLIDERS) paintRow(s.key);
    panel.querySelector('.tjson').value = exportJSON();
  }
  function onInput(e) {
    const row = e.target.closest('.tr'); if (!row) return;
    set(row.dataset.key, +e.target.value); panel.querySelector('.tjson').value = exportJSON();
  }
  function onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const row = b.closest('.tr'), msg = panel.querySelector('.tmsg'), ta = panel.querySelector('.tjson');
    if (row) {
      const key = row.dataset.key, s = SLIDERS.find(x => x.key === key);
      if (b.dataset.tstep) set(key, get(key) + s.step * +b.dataset.tstep);
      else if (b.dataset.tdef) set(key, DEF[key]);
      ta.value = exportJSON(); return;
    }
    if (b.dataset.tact === 'reset') { resetAll(); panel.querySelector('.tmsg').textContent = t('tune.wasReset'); return; }
    if (b.dataset.tact === 'export') {
      const txt = exportJSON(); ta.value = txt;
      const fallback = () => { ta.focus(); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) {} msg.textContent = ok ? t('tune.copied') : t('tune.copyFail'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => { msg.textContent = t('tune.copied'); }, fallback);
      else fallback();
    }
  }
  function refreshBadge() { if (badge) { badge.textContent = t('tune.badge'); badge.style.display = active() ? 'block' : 'none'; } }
  // show(on): called by main.js when the version label toggles the debug panel; dbgEl = the existing text panel (Debug tab)
  let tab = 'debug';
  function show(on, dbgEl) {
    if (!enabled) return false;
    tabs.style.display = on ? 'flex' : 'none';
    const tuneOn = on && tab === 'tune';
    panel.style.display = tuneOn ? 'block' : 'none'; dbgEl.style.display = on && !tuneOn ? 'block' : 'none';
    dbgEl.style.top = 'calc(env(safe-area-inset-top) + 60px)';   // below the tab bar
    if (tuneOn) build();
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.tab === tab);
    return true;
  }
  if (enabled) {
    tabs = document.createElement('div'); tabs.id = 'tuneTabs';
    tabs.innerHTML = `<button data-tab="debug">${t('tune.tab.debug')}</button><button data-tab="tune">${t('tune.tab.tune')}</button>`;
    tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.tab; show(true, document.getElementById('dbg')); } });
    panel = document.createElement('div'); panel.id = 'tune';
    panel.addEventListener('input', onInput); panel.addEventListener('click', onClick);
    document.body.append(tabs, panel);
  }
  badge = document.createElement('div'); badge.id = 'tuneBadge'; document.body.appendChild(badge); refreshBadge();

  return {
    enabled, SLIDERS, DEF, get, set, resetAll, exportJSON, active, show, refreshBadge,
    overrides: () => ({ ...over }),
    // frame hook: remember the run that saw overrides, so resetting mid-run still keeps that run unsaved
    tick(g) { if (active()) taintWorld = g.world; },
    blocks: (g) => active() || (taintWorld != null && taintWorld === g.world),   // true → skip best score / VP / level rewards
  };
})();
