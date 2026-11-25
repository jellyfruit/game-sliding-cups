/* Kings of Cups — src/app/ui.js
 * APP · UI: HUD, tray (next cup, items, gear), SCREENS (menu, prep, levels, story, armory, codex, result …), showScreen / go / act.
 * Depends on: everything above (core + app).
 * Must not touch: game rules (call Game.* / Profile.* instead).
 */
'use strict';

/* ───────── UI (HUD, buttons, menu / pause / result overlays)───────── */
const flow = Flow.create();
let story = null, closeCard = null, tamed = false;               // story = { id, then: 'brief' | 'next' | 'levels' } for the card on screen; closeCard = closing card earned by this clear; tamed = this clear tamed the Chimera
let newBest = false, lastReward = 0, lastGet = null, itemSig = '', prepMode = 'classic';   // prepMode = the mode the prep screen will start
// Item and equipment icons: Gemini art (art/items/<id>.png, art/equip/<id>.png, made by art-src/icons.py); the emoji is the fallback if an image fails
const ICON_EMOJI = { undo: '⏳', wild: '🧪', upgrade: '👑' };   // Hourglass, Polymorph Potion, Coronation Oil
const EQ_EMOJI = { scale: '🐲', grail: '🏆', eye: '👁️', hammer: '🔨', scepter: '⚜️', coin: '🪙' };
const iconImg = (dir, id, emoji, cls) => `<img class="ico ${cls || ''}" src="art/${dir}/${id}.png" alt="" onerror="this.replaceWith(document.createTextNode('${emoji}'))">`;
const ICON = new Proxy({}, { get: (o, id) => iconImg('items', id, ICON_EMOJI[id]) });
const EQ_ICON = new Proxy({}, { get: (o, id) => iconImg('equip', id, EQ_EMOJI[id]) });
function bankVP() { if (Tune.blocks(game)) return; Profile.bankRun(save, game); Storage.save(save); }   // bank VP when quitting / restarting mid-run (once per run, guarded by game.banked)
const $ = (id) => document.getElementById(id);
const elScore = $('score'), elBest = $('best'), lblScore = $('lblScore'), lblBest = $('lblBest');
const bPause = $('bPause'), bAssist = $('bAssist'), bSound = $('bSound'), ov = $('ov');
function refreshButtons() {
  document.documentElement.lang = save.lang === 'zh' ? 'zh-Hant' : 'en';
  bAssist.textContent = t('aim', { v: game.mode.assistForced ? t('onPractice') : game.assist ? t('on') : t('off') });
  bSound.textContent = t('sound', { v: save.sound !== false ? t('on') : t('off') });
  bPause.textContent = t('pause');
  bPause.disabled = flow.state !== 'playing';
  lblScore.textContent = t('score');
  lblBest.textContent = game.mode.hud === 'level' ? t('level') : t('best');
}
const elItems = $('items'), elGear = $('gear');
// worn equipment strip under the tray (Classic and Proving Grounds): icon + effect at the worn level, so the player always sees what is active
const eqShort = (d, l) => d.id === 'eye' ? 'Lv' + l : d.id === 'scale' ? '+' + d.val[l - 1] + 's' : d.id === 'scepter' ? '+' + Math.round(d.val[l - 1] * 100) + '%' : '×' + d.val[l - 1];
const eqDesc = (d, l) => d.id === 'eye' ? t('eq.eye.desc' + l) : t('eq.' + d.id + '.desc', { v: d.id === 'scepter' ? Math.round(d.val[l - 1] * 100) : d.val[l - 1] });
const eqPips = (d, l) => '●'.repeat(l) + '○'.repeat(d.cost.length - l);
let gearSig = '';
function refreshGear() {
  const worn = flow.state === 'playing' && game.mode.equip ? CONFIG.equip.defs.filter(d => game.eq[d.id]) : [];
  const sig = worn.map(d => d.id + game.eq[d.id]).join() + save.lang; if (sig === gearSig) return; gearSig = sig;
  elGear.className = worn.length ? 'on' : '';
  elGear.innerHTML = worn.map(d => `<span title="${t('eq.' + d.id)}">${EQ_ICON[d.id]}<small>${t('eq.' + d.id)} ${eqShort(d, game.eq[d.id])}</small></span>`).join('');
  layout();
}
const elTray = $('tray'), nextCv = $('nextCv'), nctx = nextCv.getContext('2d');
let nextSig = '';
function refreshNext() {
  const on = flow.state === 'playing';
  elTray.className = on ? 'on' : '';
  if (!on || !game.next) return;
  const { kind, tier } = game.next, img = Sprites.get(kind, tier), dpr = window.devicePixelRatio || 1;
  const sig = [kind, tier, !!img, dpr, save.lang].join('|'); if (sig === nextSig) return; nextSig = sig;
  $('nextLbl').textContent = t('fx.next'); $('nextName').textContent = kindName(kind) + ' ' + TIERS[tier].glyph;
  const w = 72, h = 56; nextCv.width = w * dpr; nextCv.height = h * dpr;
  nctx.setTransform(dpr, 0, 0, dpr, 0, 0); nctx.clearRect(0, 0, w, h);
  if (img) { const R = 21, sc = R / 128; nctx.imageSmoothingEnabled = true; nctx.imageSmoothingQuality = 'high'; nctx.drawImage(img, w / 2 - 384 * sc, h - 2 - 690 * sc, 768 * sc, 768 * sc); }
  else { nctx.fillStyle = KINDS[kind].body; nctx.beginPath(); nctx.arc(w / 2, h / 2, 22, 0, Math.PI * 2); nctx.fill(); nctx.fillStyle = '#fff'; nctx.font = '24px sans-serif'; nctx.textAlign = 'center'; nctx.textBaseline = 'middle'; nctx.fillText(TIERS[tier].glyph, w / 2, h / 2 + 1); }
}
function refreshItems() {
  const mode = game.mode.items, slots = Game.itemSlots(game);
  const itemsOn = mode === 'fixed' ? slots.length > 0 : (mode === 'earn' || mode === 'free') && game.features.items;   // locked until unlocked (Profile.features)
  const show = flow.state === 'playing' && (itemsOn || Game.ultKinds(game).length > 0);
  const pct = mode === 'earn' ? Math.min(100, Math.floor(game.energy / CONFIG.items.energyCost * 100)) : 0;
  const uk = Game.ultKinds(game), us = uk.map(k => k + ':' + Math.floor(game.ult[k]) + (game.armed === k ? 'a' : '') + (game.phase === 'ready' ? 'r' : '')).join(',');
  const sig = [show, mode, slots.join(), slots.map(id => (Game.canUse(game, id) ? 1 : 0)).join(''), pct, save.lang, lastGet, us].join('|');
  if (sig === itemSig) return; itemSig = sig;
  elItems.className = show ? 'on' : '';
  if (!show) { elItems.innerHTML = ''; return; }
  const cells = !itemsOn ? [] : mode === 'earn' ? Array.from({ length: CONFIG.items.slots }, (_, i) => slots[i] || null) : slots;
  elItems.innerHTML = (mode === 'earn' && itemsOn ? `<div class="em${pct >= 100 ? ' full' : ''}"><i style="width:${pct}%"></i></div>` : '') +
    cells.map(id => (id ? `<button class="it${id === lastGet ? ' new' : ''}" data-item="${id}" ${Game.canUse(game, id) ? '' : 'disabled'}>${ICON[id]}<small>${t('item.' + id)}</small></button>` : '<span class="slot"></span>')).join('') +
    (uk.length ? '<div class="ults">' + uk.map(k => {                 // creature ultimates: portrait + charge ring
      const pc = Math.round(Math.min(1, game.ult[k] / CONFIG.ults.full) * 100), full = pc >= 100, col = ULT_COL[Game.ultOf(k)];
      const nm = t('ult.' + Game.ultOf(k)), st = game.armed === k ? t('ult.armed') : full ? t('ult.tap') : pc + '%';
      return `<div class="ulw${full ? ' full' : ''}" data-ult="${k}"><button class="ul${full ? ' full' : ''}${game.armed === k ? ' armed' : ''}" style="--c:${col};background:conic-gradient(${col} ${pc}%, #3a2d49 0)" aria-label="${nm}">${thumb(k, TIERS.length - 1, '')}</button><small>${nm}</small><small class="st">${st}</small></div>`;
    }).join('') + '</div>' : '');
}
elItems.addEventListener('pointerdown', e => {                // pointerdown: redrawing the item bar never swallows a tap
  const u = e.target.closest('[data-ult]');
  if (u && flow.state === 'playing') { const ev = Game.armUlt(game, +u.dataset.ult); if (ev) handleEvents(ev); itemSig = ''; refreshItems(); return; }
  const el = e.target.closest('[data-item]'); if (!el || el.disabled || flow.state !== 'playing') return;
  const ev = Game.useItem(game, el.dataset.item); if (ev) handleEvents(ev);
  itemSig = ''; refreshItems();
});
function refreshHud() {
  elScore.textContent = game.score;
  elBest.textContent = game.mode.hud === 'level' ? game.level + 1
    : game.mode.tracksBest ? Math.max(save.best[Profile.bestKey(game)] || 0, game.score) : '—';
  if (game.mode.hud !== 'level') lblBest.textContent = game.itemsUsed > 0 && game.mode.tracksBest ? t('best.items') : t('best');
}
const ultLine = (i) => (!Game.ultOf(i) ? t('kinds.noult') : Profile.features(save).ults ? '✨ ' + t('ult.' + Game.ultOf(i)) : t('kinds.ultLocked'));   // whether a creature has an ultimate; 🔒 until ultimates unlock (after chapter 1)
const dot = (i) => `<i style="background:${KINDS[i].body}"></i>`;
// menu thumbnail (art/<kind>/<kind>_tN_thumb.png, made by art-src/menu_art.py); hidden if the file is missing
// creature without art (KINDS[i].art === false): a small procedural cup as inline SVG (class 'sil' turns it into a dark silhouette)
const procThumb = (i, tier) => { const K = KINDS[i], T = TIERS[Math.max(0, tier)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="90" rx="34" ry="7" fill="rgba(0,0,0,.25)"/><path d="M14 30 L24 86 A26 7 0 0 0 76 86 L86 30 Z" fill="${K.body}" stroke="${K.dark}" stroke-width="3"/><ellipse cx="50" cy="30" rx="36" ry="10" fill="${K.rim}"/><ellipse cx="50" cy="31" rx="29" ry="7" fill="${K.dark}"/><text x="50" y="72" font-size="38" text-anchor="middle" fill="#fff">${T.glyph}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg); };
const thumb = (i, tier, cls, h) => { if (KINDS[i].art === false) return `<img class="${cls || ''}" src="${procThumb(i, tier)}" alt="" draggable="false"${h ? ` style="height:${h}px"` : ''}>`;
  const id = KINDS[i].id; return `<img class="${cls || ''}" src="art/${id}/${id}_t${Math.max(0, tier) + 1}_thumb.png" alt="" draggable="false" onerror="this.style.visibility='hidden'"${h ? ` style="height:${h}px"` : ''}>`; };
const btn = (act, label, cls, sub) => `<button data-act="${act}" class="${cls || ''}">${label}${sub ? '<small>' + sub + '</small>' : ''}</button>`;
// level goal text, e.g. "Make a Knight 0/1"
function goalText(lv) {
  const G = lv.goal;
  if (G.type === 'make') return G.kind != null ? t('goal.makeK', { kind: kindName(G.kind), tier: t('tier.' + G.tier) }) : t('goal.make', { tier: t('tier.' + G.tier) });
  if (G.type === 'chain' && G.combo > 2) return t('goal.chainN', { c: G.combo });
  if (G.type === 'kings' && G.kinds) return t('goal.kingsOf', { names: G.kinds.map(kindName).join(save.lang === 'zh' ? '、' : ', ') });
  return t('goal.' + G.type);
}
const goalTimes = (lv) => (lv.goal.n > 1 && lv.goal.type !== 'guardians' && lv.goal.type !== 'chimera' ? ' ×' + lv.goal.n : '');   // heads: "Burn the hydra heads ×3"   // guardians: the goal text already says "both"
const storyTitle = (id) => (id === 'ch' + CONFIG.story.chapters.slice(-1)[0] + '.close' ? t('story.end') : t('story.' + id.split('.')[1]));   // the last chapter's closing card is the ending
const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const SCREENS = {                                                  // one function per screen returning HTML; new screen = entry here + Flow transition
  title() {                                                    // cover art (art/cover/cover.jpg; until it exists: the seven kings) + Enter
    const kings = KINDS.map((K, i) => (K.finale ? '' : thumb(i, TIERS.length - 1, ''))).join('');   // the finale creature stays a secret
    return `<div class="titlescr"><div class="cover"><div class="kings">${kings}</div><img class="art" src="art/cover/cover.jpg" alt="" onerror="this.remove()"></div>
    <div class="logo"><h1>${t('title')}</h1><p>${t('subtitle')}</p></div>
    ${btn('enter', t('enter'), 'enter')}</div>`;
  },
  menu() {                                                     // order (David, 16.3.0): Story (big), Classic (經典模式, 18.1.1) + Training Hall, Creatures + Forge; Backup + language in Settings
    const firstOpen = CONFIG.levels.findIndex((l, i) => !save.cleared.includes(i)), chNow = CONFIG.levels[firstOpen < 0 ? CONFIG.levels.length - 1 : firstOpen].chapter, stars = save.stars.reduce((a, b) => a + b, 0);
    const best = t('bestClassic', { n: save.best.classic || 0 }) + (save.best.classicItems ? '<br>' + t('bestItems', { n: save.best.classicItems }) : '');
    const hero = save.unlocked.reduce((m, k) => (save.seen[k] > save.seen[m] ? k : m), 0);
    return `<div class="card menu"><button class="gear" data-act="settings" aria-label="${t('settings')}">⚙️</button><h1>${t('title')}</h1>
    ${btn('levels', '📜 ' + t('mode.level'), 'main big', t('levels.progress', { ch: t('chapter.' + chNow), s: stars, m: CONFIG.levels.length * 3 }))}
    <div class="row2">${btn('prep:classic', '⚔️ ' + t('mode.classic'), '', best)}${btn('prep:practice', '🛡️ ' + t('mode.practice'), '', t('mode.practice.desc'))}</div>
    <div class="tiles"><button data-act="kinds">${thumb(hero, save.seen[hero], '')}${t('creatures')}<small>${t('creaturesSub', { n: save.active.length, v: save.vp })}</small></button>
    <button data-act="armory">${iconImg('equip', 'hammer', '⚒️', 'tile')}${t('armory.menu')}<small>${Profile.features(save).equip ? t('armory.menu.sub', { w: save.worn.length, s: CONFIG.equip.slots }) : '🔒'}</small></button></div>
    ${Profile.newFeatures(save).map(f => `<p class="goalbox">${t('unlock.' + f)} <button class="mini" data-act="ack:${f}">${t('unlock.ok')}</button></p>`).join('')}</div>`;
  },
  settings() {
    return `<div class="card"><h2>${t('settings')}</h2>
    ${btn('lang', t('language') + ': ' + (save.lang === 'zh' ? '繁體中文' : 'English'), '')}
    ${btn('backup', t('backup.title'), '', t('backup.menu.sub'))}
    <p class="best">${APP_VERSION}</p>${btn('menu', t('back'), 'main')}</div>`;
  },
  backup() {
    const code = Profile.exportCode(save), p = bk.pending;
    const msg = bk.msg ? `<p class="note ${bk.msgCls || ''}">${bk.msg}</p>` : '';
    const found = p ? `<p class="note okmsg">${t('backup.found', { vp: p.vp, best: p.best.classic || 0, n: p.unlocked.length, lv: p.cleared.length })}</p><p class="note warn">${t('backup.applywarn')}</p>${btn('backup:apply', t('backup.apply'), 'main')}` : '';
    return `<div class="card"><h2>${t('backup.title')}</h2><p class="note">${t('backup.how')}</p>
    <textarea id="bkOut" readonly>${code}</textarea>
    ${btn('backup:copy', t('backup.copy'), 'main')}${navigator.share ? btn('backup:share', t('backup.share')) : ''}
    <h2>${t('backup.restore')}</h2>
    <textarea id="bkIn" placeholder="${t('backup.paste')}">${escapeHtml(bk.input)}</textarea>
    ${btn('backup:check', t('backup.check'))}${msg}${found}
    ${btn('settings', t('back'))}</div>`;
  },
  kinds() {
    const nextIdx = Profile.nextLockedKind(save);
    const rows = KINDS.map((K, i) => {
      const cost = CONFIG.vp.unlockCost[i], open = save.unlocked.includes(i);
      const pic = open ? thumb(i, save.seen[i], 'pt') : thumb(i, TIERS.length - 1, 'pt sil');   // portrait: the highest form reached; locked = king silhouette
      const name = `${pic}<div><span>${dot(i)}${kindName(i)}</span>`;
      const ult = `<small>${ultLine(i)}</small>`, short = save.vp < cost ? t('kinds.short', { n: cost - save.vp }) : '';
      if (open) return `<div class="row pic tamed">${name}<small>${t('kinds.tamed')}</small>${ult}</div></div>`;   // list only: the team is chosen on the prep screen
      if (K.finale) return `<button class="row pic" disabled>${pic}<div><span>${dot(i)}???</span><small>${t('kinds.finale')}</small></div></button>`;   // never for sale: no name until unlocked
      if (i === nextIdx) return `<button data-act="buy:${i}" class="row pic" ${save.vp < cost ? 'disabled' : ''}>${name}<small>${t('kinds.buy', { n: cost })}${short}</small>${ult}</div></button>`;
      return `<button class="row pic" disabled>${name}<small>${t('kinds.locked', { n: cost })}${short}</small>${ult}</div></button>`;
    }).join('');
    const m = KINDS.length * TIERS.length;
    return `<div class="card"><h2>${t('kinds.title')}</h2><p class="best">${t('kinds.sub', { n: save.vp })}</p>${rows}${btn('codex', t('codex.open', { n: Profile.discovered(save), m }))}${btn('menu', t('back'), 'main')}</div>`;
  },
  codex() {
    const m = KINDS.length * TIERS.length, H = 54, r0 = TIERS[0].r, r1 = TIERS[TIERS.length - 1].r;
    const rows = KINDS.map((K, i) => {
      const open = save.unlocked.includes(i);
      const tiers = TIERS.map((T, k) => { const h = Math.round(H * (0.5 + 0.5 * (T.r - r0) / (r1 - r0))); const seen = k <= save.seen[i];
        return `<span>${thumb(i, k, seen ? '' : 'sil', h)}${seen ? T.glyph : '?'}</span>`; }).join('');
      return `<div class="ck"><b>${dot(i)}${open ? kindName(i) : '???'}</b>${open ? '' : ' <small>' + t(K.finale ? 'kinds.finale' : 'codex.locked') + '</small>'}<div class="tiers">${tiers}</div></div>`;
    }).join('');
    return `<div class="card"><h2>${t('codex.title')}</h2><p class="best">${t('codex.sub', { n: Profile.discovered(save), m })}</p><div class="codex">${rows}</div>${btn('kinds', t('back'), 'main')}</div>`;
  },
  armory() {
    const F = Profile.features(save), E = CONFIG.equip;
    if (!F.equip) return `<div class="card"><h2>${t('armory.title')}</h2><p class="best">${t('armory.locked', { n: E.unlockVP, have: save.vpEarned })}</p>${btn('menu', t('back'), 'main')}</div>`;
    const rows = E.defs.map(d => {
      const lv = save.equip[d.id] || 0, cost = Profile.eqNextCost(save, d.id);   // list only: gear is chosen on the prep screen
      const now = lv ? eqDesc(d, lv) : t('armory.notyet', { s: eqDesc(d, 1) }), next = lv && cost != null ? ' → ' + (d.id === 'eye' ? eqDesc(d, lv + 1) : eqShort(d, lv + 1)) : '';
      const buy = cost == null ? `<small>${t('armory.max')}</small>` : btn('eqbuy:' + d.id, t(lv ? 'armory.up' : 'armory.buy', { n: cost }), 'mini' + (save.vp < cost ? ' dim' : '')) + (save.vp < cost ? `<small class="short">${t('armory.short', { n: cost - save.vp })}</small>` : '');
      return `<div class="eqrow"><div><b>${EQ_ICON[d.id]} ${t('eq.' + d.id)}</b> <span class="pips">${eqPips(d, lv)}</span><br><small>${now}${next}</small></div><div class="eqbtns">${buy}</div></div>`;
    }).join('');
    return `<div class="card"><h2>${t('armory.title')}</h2><p class="best">${t('armory.sub', { s: E.slots, n: save.vp })}</p><div class="codex">${rows}</div>${btn('menu', t('back'), 'main')}</div>`;
  },
  prep() {                                                     // before a Classic / Proving Grounds run: team (1..team.max) + gear (≤ equip.slots); last choice preselected
    const TM = CONFIG.team.max, E = CONFIG.equip, F = Profile.features(save), full = save.active.length >= TM;
    const kinds = save.unlocked.map(i => { const on = save.active.includes(i);
      return `<button data-act="kind:${i}" class="pk${on ? ' on' : ''}" aria-pressed="${on}"${!on && full ? ' disabled' : ''}>${thumb(i, save.seen[i], '')}<b>${kindName(i)}</b><small>${ultLine(i)}</small></button>`; }).join('');
    const owned = E.defs.filter(d => save.equip[d.id]), wfull = save.worn.length >= E.slots;
    const gear = !F.equip ? `<p class="note">${t('prep.equipLocked', { n: E.unlockVP, have: save.vpEarned })}</p>`
      : !owned.length ? `<p class="note">${t('prep.noEquip')}</p>`
      : `<div class="pgrid eq">${owned.map(d => { const on = save.worn.includes(d.id), l = save.equip[d.id];
          return `<button data-act="eqwear:${d.id}" class="pk${on ? ' on' : ''}" aria-pressed="${on}"${!on && wfull ? ' disabled' : ''}>${EQ_ICON[d.id]}<b>${t('eq.' + d.id)}</b><span class="pips">${eqPips(d, l)}</span><small>${eqDesc(d, l)}</small></button>`; }).join('')}</div>`;
    return `<div class="card prep"><h2>${t('prep.title')}</h2><p class="best">${t(prepMode === 'practice' ? 'mode.practice' : 'mode.classic')}</p>
    <h3>${t('prep.creatures', { m: TM })} <small>${save.active.length}/${TM}</small></h3><div class="pgrid">${kinds}</div>
    <h3>${t('prep.equip', { s: E.slots })}${F.equip ? ` <small>${save.worn.length}/${E.slots}</small>` : ''}</h3>${gear}
    ${btn('start', t('prep.start'), 'main big')}${btn('menu', t('back'))}</div>`;
  },
  levels() {
    let ch = 0;
    const rows = CONFIG.levels.map((lv, i) => {
      const cleared = save.cleared.includes(i), open = Profile.levelOpen(save, i);
      const reread = (c) => CONFIG.story.chapters.includes(c) ? ['open', 'close'].filter(k => save.story.includes('ch' + c + '.' + k)).map(k => btn('story:ch' + c + '.' + k, '📜 ' + storyTitle('ch' + c + '.' + k), 'mini')).join('') : '';
      const head = lv.chapter !== ch ? `<div class="best chead"><b>${t('chapter.' + (ch = lv.chapter))}</b>${reread(ch)}</div>` : '';
      const sub = open ? goalText(lv) + goalTimes(lv) + '<br>' + (cleared ? starStr(save.stars[i] || 1) : t('level.reward', { n: lv.reward })) : t('level.locked');
      return head + `<button data-act="level:${i}" class="row ${open && !cleared ? 'on' : ''}" ${open ? '' : 'disabled'}><span>${i + 1}. ${t('lv.' + lv.id + '.name')}</span><small>${sub}</small></button>`;
    }).join('');
    return `<div class="card"><h2>${t('levels.title')}</h2><div class="codex">${rows}</div>${btn('menu', t('back'), 'main')}</div>`;
  },
  brief() {                                                    // level briefing: tip, goal, star targets, rules
    const lv = Game.levelOf(game), i = game.level;
    const elden = CONFIG.story.chapters.includes(lv.chapter) ? `<p class="elden">${t('story.quote', { s: t('lv.' + lv.id + '.elden') })}<small>— ${t('story.elden')}</small></p>` : '';   // Elden's line above the goal
    return `<div class="card"><p class="best">${t('chapter.' + lv.chapter)} · ${t('level.n', { n: i + 1 })}</p><h2>${t('lv.' + lv.id + '.name')}</h2>
    ${elden}<p class="note">${t('lv.' + lv.id + '.tip')}</p>
    <p class="goalbox">🎯 ${t('brief.goal')}：<b>${goalText(lv)}${goalTimes(lv)}</b></p>
    <p class="note">${t('brief.stars', { a: lv.stars[0], b: lv.stars[1] })}${lv.shotLimit ? '<br>' + t('brief.limit', { n: lv.shotLimit }) : ''}<br>${t(lv.danger === 'fade' ? 'brief.safe' : 'brief.lose')}${lv.sand ? '<br>' + t('brief.sand') : ''}${lv.sting ? '<br>' + t('brief.sting', { n: lv.sting.every, m: CONFIG.sting.life }) : ''}${lv.current ? '<br>' + t('brief.current') : ''}${lv.heads ? '<br>' + t('brief.heads', { n: CONFIG.hydra.regrow }) : ''}${lv.rise ? '<br>' + t('brief.rise', { n: CONFIG.rise.every }) : ''}${lv.roar ? '<br>' + t('brief.roar', { n: lv.roar.every }) : ''}${lv.curse ? '<br>' + t('brief.curse', { n: lv.curse.every }) : ''}${lv.chimera ? '<br>' + t('brief.chimera') + '<br>' + t('brief.poison', { n: CONFIG.poison.life }) : ''}</p>
    ${btn('start', t('brief.go'), 'main')}${btn('levels', t('back'))}</div>`;
  },
  story() {                                                    // chapter opening / closing card (text; art/story/ch<N>.jpg on top when present)
    const c = story.id.split('.')[0].slice(2), kind = story.id.split('.')[1];
    return `<div class="card story"><img class="art" src="art/story/ch${c}.jpg" alt="" onerror="this.remove()"><p class="best">${t('chapter.' + c)}</p><h2>${storyTitle(story.id)}</h2>
    <p class="tale">${t('story.' + story.id)}</p>${btn('storygo', t('story.continue'), 'main')}</div>`;
  },
  paused() {
    const lv = Game.levelOf(game);
    const goal = lv ? `<p class="goalbox">🎯 <b>${goalText(lv)}</b> ${Game.goalProgress(game).have}/${Game.goalProgress(game).need}</p><p class="note">${t('lv.' + lv.id + '.tip')}</p>` : '';
    return `<div class="card"><h2>${t('paused')}</h2>${goal}
    ${btn('resume', t('resume'), 'main')}${btn('restart', t('restart'))}${lv ? btn('levels', t('levels.title')) : ''}${btn('menu', t('menu'))}</div>`;
  },
  result() {
    const won = game.phase === 'won', v = Game.vp(game);
    let extra = '';
    if (won) extra = `<p class="stars">${starStr(game.stars)}</p><p class="best">${t('result.shots', { n: game.shots })}</p>` + (lastReward ? `<p class="best">${t('level.stars', { n: lastReward })}　${t('vpTotal', { n: save.vp })}</p>` : '');
    else if (game.endReason === 'shots') extra = `<p class="best">${t('result.outOfShots')}</p>`;
    else if (game.mode.tracksBest) extra = `<p class="best">${newBest ? t('newBest') : t('bestIs', { n: save.best[Profile.bestKey(game)] || 0 })}</p>${game.itemsUsed ? `<p class="best">${t('result.items')}</p>` : ''}`;
    if (game.mode.equip && Object.keys(game.eq).length) extra += `<p class="best">${t('result.equip', { list: Object.keys(game.eq).map(id => EQ_ICON[id] + ' ' + t('eq.' + id)).join(' · ') })}</p>`;
    if (Tune.blocks(game)) extra += `<p class="warn">${t('tune.nosave')}</p>`;   // tuning overrides: nothing was recorded
    else if (v.total) extra += `<p class="best">${t('vpGain', { n: v.total, a: v.fromScore, k: v.fromKings ? t('vpKings', { n: v.fromKings }) : '' })}　${t('vpTotal', { n: save.vp })}</p>`;
    const hasNext = won && game.level + 1 < CONFIG.levels.length;   // 'next' opens the next level's briefing (after the chapter's closing card on its first clear)
    const lvR = Game.levelOf(game);
    if (won && tamed) extra = `<p class="goalbox">${t('result.chimera')}</p>` + extra;   // the finale: "The Chimera joins you"
    if (won && lvR && lvR.chapter === 1) extra = `<p class="goalbox">${t('result.learned', { s: t('lv.' + lvR.id + '.learn') })}</p>` + extra + (hasNext ? `<p class="note">${t('result.nextUp', { name: t('lv.' + CONFIG.levels[game.level + 1].id + '.name') })}</p>` : '');   // chapter 1 recap
    return `<div class="card"><h2>${won ? t('level.clear') : t('gameOver')}</h2>${game.level == null ? `<p class="big">${game.score}</p>` : ''}${extra}
      ${won && closeCard ? btn('storyclose', t('story.continue'), 'main') : hasNext ? btn('next', t('level.next'), 'main') : ''}
      ${btn('restart', won ? t('level.replay') : t('retry'), hasNext || (won && closeCard) ? '' : 'main')}${btn('menu', t('menu'))}</div>`;
  },
};
function showScreen() {
  const s = flow.state;
  ov.className = s === 'playing' ? '' : 'on ' + s;
  ov.innerHTML = SCREENS[s] ? SCREENS[s]() : '';
  refreshButtons();
}
function go(ev) { if (!Flow.send(flow, ev)) return; if (ev === 'start' || ev === 'restart') { Fx.reset(); Tutor.reset(); startCameo(); } showScreen(); }   // clear leftover effects on a new run
function applyProfile() { Game.setFeatures(game, Profile.features(save)); Game.setEquip(game, Profile.features(save).equip ? Profile.wornLevels(save) : {}); }   // unlocks + worn equipment → game
/* ── Backup screen state (code to restore is validated first, then applied on a second tap) ── */
const bk = { input: '', pending: null, msg: '', msgCls: '' };
const escapeHtml = (v) => String(v).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
ov.addEventListener('input', e => { if (e.target.id === 'bkIn') { bk.input = e.target.value; bk.pending = null; } });
function backupAct(cmd) {
  const say = (msg, cls) => { bk.msg = msg; bk.msgCls = cls || ''; showScreen(); };
  const code = Profile.exportCode(save);
  if (cmd === 'copy') {
    const fallback = () => { const el = document.getElementById('bkOut'); el.focus(); el.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} say(t(ok ? 'backup.copied' : 'backup.copyfail'), ok ? 'okmsg' : 'warn'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => say(t('backup.copied'), 'okmsg'), fallback); else fallback();
  } else if (cmd === 'share') {
    navigator.share({ title: 'Kings of Cups backup', text: code }).catch(() => {});
  } else if (cmd === 'check') {
    const r = Profile.importCode(bk.input);
    bk.pending = r.ok ? r.profile : null;
    say(r.ok ? '' : t('backup.err.' + r.error), 'warn');
  } else if (cmd === 'apply' && bk.pending) {
    for (const k of Object.keys(save)) delete save[k];
    Object.assign(save, bk.pending); Storage.save(save);
    bk.pending = null; bk.input = '';
    Game.setKinds(game, activeKinds()); refreshButtons();
    say(t('backup.done'), 'okmsg');
  }
}
function openLevel() {                                        // a chapter's opening card first (once), then the briefing
  const id = Profile.storyBefore(save, game.level);
  if (id) { story = { id, then: 'brief' }; go('story'); } else go('brief');
}
function act(a) {
  Sprites.preload(a.startsWith('level:') ? CONFIG.levels[+a.slice(6)].kinds : activeKinds());
  if (a.startsWith('prep:')) { prepMode = a.slice(5) === 'practice' ? 'practice' : 'classic'; go('prep'); }                     // Classic / Proving Grounds → prep screen
  else if (a === 'start' && flow.state === 'prep') { Game.setKinds(game, activeKinds()); applyProfile(); Game.setMode(game, prepMode); go('start'); }
  else if (a.startsWith('level:')) { Game.startLevel(game, +a.slice(6)); openLevel(); }
  else if (a === 'next') { Game.startLevel(game, game.level + 1); openLevel(); }
  else if (a.startsWith('story:')) { story = { id: a.slice(6), then: 'levels' }; go('story'); }                 // re-read from the chapter list
  else if (a === 'storyclose') { story = { id: closeCard, then: game.level + 1 < CONFIG.levels.length ? 'next' : 'levels' }; closeCard = null; go('story'); }
  else if (a === 'storygo') {                                   // continue after a card: mark it read, then on to what comes next
    if (Profile.readStory(save, story.id)) Storage.save(save);
    if (story.then === 'next') { Sprites.preload(CONFIG.levels[game.level + 1].kinds); Game.startLevel(game, game.level + 1); openLevel(); } else go(story.then);
  }
  else if (a === 'start' && flow.state === 'brief') { Game.startLevel(game, game.level); go('start'); }
  else if (a === 'restart') { closeCard = null; tamed = false; bankVP(); applyProfile(); Game.rematch(game, activeKinds()); go('restart'); }
  else if (a === 'menu') { closeCard = null; tamed = false; bankVP(); go('menu'); }
  else if (a === 'lang') { Profile.setLang(save, save.lang === 'zh' ? 'en' : 'zh'); Storage.save(save); showScreen(); }
  else if (a.startsWith('kind:')) { if (Profile.toggleKind(save, +a.slice(5))) Storage.save(save); showScreen(); }
  else if (a.startsWith('eqbuy:')) { if (Profile.buyEquip(save, a.slice(6))) Storage.save(save); showScreen(); }
  else if (a.startsWith('eqwear:')) { if (Profile.toggleWear(save, a.slice(7))) Storage.save(save); showScreen(); }
  else if (a.startsWith('ack:')) { Profile.ackFeature(save, a.slice(4)); Storage.save(save); showScreen(); }
  else if (a.startsWith('backup:')) backupAct(a.slice(7));
  else if (a === 'backup') { bk.msg = ''; bk.pending = null; go('backup'); }
  else if (a.startsWith('buy:')) { if (Profile.buy(save, +a.slice(4))) Storage.save(save); showScreen(); }
  else go(a);
}
ov.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && !el.disabled) act(el.dataset.act); });
bPause.onclick = () => { if (game.drag) Game.endDrag(game, game.drag.id); go('pause'); };
bAssist.onclick = () => { game.assist = !game.assist; refreshButtons(); };
bSound.onclick = () => { Profile.toggleSound(save); Storage.save(save); refreshButtons(); };
document.addEventListener('pointerdown', () => Sfx.unlock());                       // iOS must start audio inside a user gesture
document.addEventListener('click', e => { if (e.target.closest('button')) Sfx.play('click'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { Sfx.suspend(); if (flow.state === 'playing') bPause.onclick(); } });
