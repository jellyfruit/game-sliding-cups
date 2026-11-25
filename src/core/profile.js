/* Kings of Cups — src/core/profile.js
 * CORE · Profile: save format (VERSION) + migrations, VP, unlocks, levels/stars, story cards, equipment, backup codes.
 * Also defines SC = the core's public surface. Depends on: CONFIG, Game (bestKey / bankRun read a game).
 * Must not touch: localStorage (src/app/storage.js does that), the DOM.
 */
'use strict';

/* ───────── PROFILE (player progress: best scores, VP, unlocks, levels, settings; pure data and rules, tested in Node)───────── */
const Profile = (() => {
  const VERSION = 9, NK = CONFIG.kinds.length, NL = CONFIG.levels.length;
  const NB = CONFIG.kinds.filter(k => !k.finale).length, CHIMERA = CONFIG.kinds.findIndex(k => k.finale);   // creatures 0..NB-1 are bought with VP in order; the finale creature only by clearing the finale
  const fresh = (best) => ({ v: VERSION, best: { classic: best || 0, classicItems: 0 }, vp: 0, unlocked: [0, 1], active: [0], cleared: [], stars: Array(NL).fill(0), equip: {}, worn: [], vpEarned: 0, ack: [], story: [], finaleCleared: false, lang: 'en', sound: true, seen: [0, 0, ...Array(NK - 2).fill(-1)] });   // seen[k] = highest tier reached (-1 = none), for the codex
  const nat = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  const uniq = (arr, ok) => [...new Set((Array.isArray(arr) ? arr : []).filter(i => Number.isInteger(i) && i >= 0 && ok(i)))].sort((a, b) => a - b);
  // turn any input (old, broken, edited) into a valid current save; unknown fields are dropped
  function migrate(raw, legacyBest) {
    if (!raw || typeof raw !== 'object') return fresh(legacyBest);
    const p = fresh(0);
    p.best.classic = nat(raw.best && raw.best.classic); p.best.classicItems = nat(raw.best && raw.best.classicItems);
    p.vp = nat(raw.vp);
    const LEGACY_CARRY = { sweep: 20, upgrade: 10, wild: 10, magnet: 10, undo: 6 };   // v≤6 packed item → refunded (equipment replaced it)
    if (!(raw.v >= 7) && LEGACY_CARRY[raw.carry]) p.vp += LEGACY_CARRY[raw.carry];
    const n = Math.max(2, Math.min(NB, uniq(raw.unlocked, i => i < NB).length));   // VP unlocks are sequential: always [0..n-1], at least 2
    p.finaleCleared = raw.v >= 9 && raw.finaleCleared === true;                      // v9: the finale creature joins only after the finale
    p.unlocked = Array.from({ length: n }, (_, i) => i).concat(p.finaleCleared && CHIMERA >= 0 ? [CHIMERA] : []);
    const act = uniq(raw.active, i => p.unlocked.includes(i)); p.active = act.length ? act : [0];
    if (!(raw.v >= 6)) {                                        // v≤5 had 3 levels: old 1 → new 1; old 2 or 3 → the whole tutorial chapter
      const old = Array.isArray(raw.cleared) ? raw.cleared : [];
      p.cleared = old.includes(1) || old.includes(2) ? CONFIG.levels.map((L, i) => i).filter(i => CONFIG.levels[i].chapter === 1) : old.includes(0) ? [0] : [];
      p.stars = CONFIG.levels.map((L, i) => (p.cleared.includes(i) ? 1 : 0));
    } else {
      p.cleared = uniq(raw.cleared, i => i < NL);
      const st = Array.isArray(raw.stars) ? raw.stars : [];
      p.stars = CONFIG.levels.map((L, i) => (p.cleared.includes(i) ? Math.max(1, Math.min(3, Number.isInteger(st[i]) ? st[i] : 1)) : 0));
    }
    p.lang = raw.lang === 'zh' ? 'zh' : 'en';
    p.sound = raw.sound !== false;
    const eq = raw.equip && typeof raw.equip === 'object' ? raw.equip : {};    // v7: equipment levels, worn list, lifetime VP, seen unlock notices
    for (const d of CONFIG.equip.defs) { const l = nat(eq[d.id]); if (l) p.equip[d.id] = Math.min(l, d.cost.length); }
    p.worn = [...new Set(Array.isArray(raw.worn) ? raw.worn : [])].filter(id => p.equip[id]).slice(0, CONFIG.equip.slots);
    p.vpEarned = raw.v >= 7 ? nat(raw.vpEarned) : p.vp + p.unlocked.reduce((a, i) => a + (CONFIG.vp.unlockCost[i] || 0), 0);   // older saves: estimate from VP held + spent
    p.ack = [...new Set(Array.isArray(raw.ack) ? raw.ack : [])].filter(f => ['items', 'ults', 'equip'].includes(f));
    const ids = storyIds(); p.story = [...new Set(Array.isArray(raw.story) ? raw.story : [])].filter(id => ids.includes(id));   // v8: story cards already read
    const seen = Array.isArray(raw.seen) ? raw.seen : [];       // v5; older saves start with every unlocked creature's pawn
    p.seen = Array.from({ length: NK }, (_, i) => { const v = Number.isInteger(seen[i]) ? Math.min(Math.max(seen[i], -1), CONFIG.tiers.length - 1) : -1; return p.unlocked.includes(i) ? Math.max(v, 0) : i === CHIMERA ? -1 : v; });   // a locked finale creature cannot have been seen
    return p;
  }
  const bought = (p) => p.unlocked.filter(i => i < NB).length;
  const nextLockedKind = (p) => (bought(p) < NB ? bought(p) : -1);   // never the finale creature
  function buy(p, i) {                                    // unlock the next creature; returns success
    const cost = CONFIG.vp.unlockCost[i];
    if (i !== bought(p) || i >= NB || !(cost >= 0) || p.vp < cost) return false;
    p.vp -= cost; p.unlocked.push(i); p.unlocked.sort((a, b) => a - b); p.seen[i] = Math.max(p.seen[i], 0); return true;
  }
  // clearing the finale: the finale creature joins (not reachable in play until the finale exists); returns true the first time
  function unlockChimera(p) {
    if (CHIMERA < 0 || p.finaleCleared) return false;
    p.finaleCleared = true; p.unlocked.push(CHIMERA); p.unlocked.sort((a, b) => a - b); p.seen[CHIMERA] = Math.max(p.seen[CHIMERA], 0); return true;
  }
  function toggleKind(p, i) {                             // add/remove a creature for the next run (keep at least 1)
    if (!p.unlocked.includes(i)) return false;
    const at = p.active.indexOf(i);
    if (at >= 0) { if (p.active.length === 1) return false; p.active.splice(at, 1); }
    else { p.active.push(i); p.active.sort((a, b) => a - b); }
    return true;
  }
  const levelOpen = (p, i) => i === 0 || p.cleared.includes(i - 1);
  /* story cards: ids 'ch<N>.open' / 'ch<N>.close' */
  function storyIds() { return CONFIG.story.chapters.flatMap(c => ['ch' + c + '.open'].concat((CONFIG.story.unfinished || []).includes(c) ? [] : ['ch' + c + '.close'])); }
  const chapterLevels = (c) => CONFIG.levels.map((L, i) => i).filter(i => CONFIG.levels[i].chapter === c);
  function storyBefore(p, idx) {                          // opening card to show before level idx's briefing (first level of a chapter, not read yet), or null
    const L = CONFIG.levels[idx]; if (!L || !CONFIG.story.chapters.includes(L.chapter) || chapterLevels(L.chapter)[0] !== idx) return null;
    const id = 'ch' + L.chapter + '.open'; return p.story.includes(id) ? null : id;
  }
  function storyAfter(p, idx) {                           // closing card after level idx is cleared (last level of a chapter, not read yet), or null
    const L = CONFIG.levels[idx]; if (!L || !CONFIG.story.chapters.includes(L.chapter) || chapterLevels(L.chapter).slice(-1)[0] !== idx || !p.cleared.includes(idx)) return null;
    const id = 'ch' + L.chapter + '.close'; return p.story.includes(id) || !storyIds().includes(id) ? null : id;
  }
  function readStory(p, id) { if (!storyIds().includes(id) || p.story.includes(id)) return false; p.story.push(id); return true; }
  // level cleared with `stars` (1–3); returns VP gained: reward on first clear + starBonus per newly earned star
  function clearLevel(p, idx, stars) {
    stars = Math.max(1, Math.min(3, stars || 1));
    let r = 0;
    if (!p.cleared.includes(idx)) { p.cleared.push(idx); p.cleared.sort((a, b) => a - b); r += CONFIG.levels[idx].reward; }
    const prev = p.stars[idx] || 0;
    if (stars > prev) { r += (stars - Math.max(prev, 1)) * CONFIG.vp.starBonus; p.stars[idx] = stars; }
    p.vp += r; p.vpEarned += r; return r;
  }
  const bestKey = (g) => (g.mode.id === 'classic' && g.itemsUsed > 0 ? 'classicItems' : g.mode.id);   // runs that used items keep a separate best
  function recordBest(p, g) {                             // returns whether it's a new best
    const k = bestKey(g);
    if (!g.mode.tracksBest || g.score <= (p.best[k] || 0)) return false;
    p.best[k] = g.score; return true;
  }
  /* equipment */
  const eqDef = (id) => CONFIG.equip.defs.find(d => d.id === id);
  const eqNextCost = (p, id) => { const d = eqDef(id), l = p.equip[id] || 0; return d && l < d.cost.length ? d.cost[l] : null; };
  function buyEquip(p, id) {                              // buy level 1 or upgrade; returns success
    const c = eqNextCost(p, id); if (c == null || p.vp < c) return false;
    p.vp -= c; p.equip[id] = (p.equip[id] || 0) + 1; return true;
  }
  function toggleWear(p, id) {                            // wear / take off (owned only, up to equip.slots)
    if (!p.equip[id]) return false;
    const at = p.worn.indexOf(id);
    if (at >= 0) { p.worn.splice(at, 1); return true; }
    if (p.worn.length >= CONFIG.equip.slots) return false;
    p.worn.push(id); return true;
  }
  const wornLevels = (p) => Object.fromEntries(p.worn.map(id => [id, p.equip[id]]));
  /* progressive unlocks */
  function features(p) {
    const U = CONFIG.unlocks;
    return { items: p.cleared.includes(U.itemsLevel), ults: p.cleared.includes(U.ultsLevel), equip: p.vpEarned >= CONFIG.equip.unlockVP };
  }
  const newFeatures = (p) => Object.entries(features(p)).filter(([f, on]) => on && !p.ack.includes(f)).map(([f]) => f);
  function ackFeature(p, f) { if (!p.ack.includes(f)) p.ack.push(f); }
  function bankRun(p, g) {                                // bank this run's VP (once per run; 0 in Levels)
    if (g.banked) return { fromScore: 0, fromKings: 0, total: 0 };
    g.banked = true; const v = Game.vp(g); p.vp += v.total; p.vpEarned += v.total; return v;
  }
  const finishRun = (p, g) => ({ newBest: recordBest(p, g), vp: bankRun(p, g) });
  const setLang = (p, lang) => { p.lang = lang === 'zh' ? 'zh' : 'en'; };
  const toggleSound = (p) => { p.sound = p.sound === false; };
  function see(p, kind, tier) { if (!(kind >= 0 && kind < NK) || tier <= p.seen[kind] || (kind === CHIMERA && !p.finaleCleared)) return false; p.seen[kind] = tier; return true; }   // returns true for a new codex entry
  const discovered = (p) => p.seen.reduce((n, v) => n + v + 1, 0);

  /* ── Backup codes: "SC1.<base64url JSON>.<checksum>" — copy anywhere, paste back to restore ── */
  const CODE = 'SC1';
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
  const b64 = (str) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (str) => { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; return atob(str); };
  function exportCode(p) { const json = JSON.stringify(migrate(JSON.parse(JSON.stringify(p)))); return CODE + '.' + b64(json) + '.' + hash(json); }
  // returns { ok: true, profile } or { ok: false, error: 'empty' | 'format' | 'checksum' }
  function importCode(code) {
    const c = String(code || '').replace(/\s+/g, '');
    if (!c) return { ok: false, error: 'empty' };
    const parts = c.split('.');
    if (parts.length !== 3 || parts[0] !== CODE) return { ok: false, error: 'format' };
    let json; try { json = unb64(parts[1]); } catch (e) { return { ok: false, error: 'format' }; }
    if (hash(json) !== parts[2]) return { ok: false, error: 'checksum' };
    let raw; try { raw = JSON.parse(json); } catch (e) { return { ok: false, error: 'format' }; }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'format' };
    return { ok: true, profile: migrate(raw) };
  }
  return { VERSION, NB, CHIMERA, fresh, migrate, nextLockedKind, buy, unlockChimera, toggleKind, levelOpen, storyIds, storyBefore, storyAfter, readStory, clearLevel, bestKey, recordBest, eqNextCost, buyEquip, toggleWear, wornLevels, features, newFeatures, ackFeature, bankRun, finishRun, setLang, toggleSound, see, discovered, exportCode, importCode };
})();

/* ───────── SC: the core's public surface (tests/_load.js returns it in Node; window.SC in the browser) ───────── */
const SC = { CONFIG, makeRng, Physics, Modes, Game, Flow, Profile };
