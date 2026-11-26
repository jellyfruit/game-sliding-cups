/* Kings of Cups — src/app/storage.js
 * APP · app-wide shortcuts (W, H, LINE_Y, TILT, S_FAR, TIERS, KINDS), Storage (localStorage only) and the loaded save.
 * Depends on: the core (CONFIG, Profile). Content rules of the save live in Profile, not here.
 * Must not touch: game state.
 */
'use strict';

const { W, H, LINE_Y } = CONFIG.world;
const TILT = CONFIG.view.TILT, S_FAR = CONFIG.view.S_FAR;
const TIERS = CONFIG.tiers, KINDS = CONFIG.kinds;

/* ───────── Storage (versioned save)───────── */
const Storage = {                          // only reads/writes localStorage; content rules live in core Profile
  KEY: 'slidingcups.save',
  load() {
    let raw = null, legacy = 0;
    try { raw = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    try { legacy = +localStorage.getItem('slidingcups.best') || 0; } catch (e) {}   // best score from the original prototype
    const p = Profile.migrate(raw, legacy);
    if (!raw || typeof raw !== 'object') p.lang = this.deviceLang();   // first open on this device: follow the device language (a saved choice always wins)
    return p;
  },
  deviceLang() {                           // 'zh' when the device's first language is any Chinese (shown as Traditional), else 'en'
    try { const L = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']; return /^zh/i.test(L[0] || '') ? 'zh' : 'en'; } catch (e) { return 'en'; }
  },
  save(d) { try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) {} },
};
const save = Storage.load();
