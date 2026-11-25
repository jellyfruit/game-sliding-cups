/* Kings of Cups — src/app/sfx.js
 * APP · Sfx: Web Audio synthesis (no audio files) and the sound subscriber for game events.
 * Depends on: save (sound toggle), CONFIG.
 * Must not touch: game state, the DOM beyond the AudioContext.
 */
'use strict';

/* ───────── Sfx (Web Audio synthesis, no audio files; iOS needs a first tap before sound)───────── */
const Sfx = (() => {
  let ac = null, master = null, noiseBuf = null;
  const lastAt = {}, stats = {};
  const enabled = () => save.sound !== false;
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}   // iOS: play even with the mute switch on
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.55;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
      master.connect(comp); comp.connect(ac.destination);       // compressor: many simultaneous hits don't clip
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  }
  const suspend = () => { if (ac && ac.state === 'running') ac.suspend(); };
  // one tone: pitch glides f0 → f1, fast attack, exponential decay
  function tone(f0, f1, dur, type, vol, delay) {
    const t0 = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, f0, f1, delay) {
    const t0 = ac.currentTime + (delay || 0), src = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; flt.type = 'bandpass'; flt.Q.value = 1.2;
    flt.frequency.setValueAtTime(f0, t0); flt.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt); flt.connect(g); g.connect(master); src.start(t0); src.stop(t0 + dur + 0.02);
  }
  // stone impact: a low 'thunk' body (fast decay, no long ringing highs — that's glass/metal)
  // + a burst of low-passed noise for grit + a tiny click. Bigger size (bigger cup) = lower, duller, longer.
  function stone(f, vol, size, delay) {
    const d = delay || 0, len = 0.07 + size * 0.025, det = 1 + (Math.random() - 0.5) * 0.08;
    tone(f * det * 1.25, f * det * 0.6, len, 'sine', vol, d);                 // body: dull thud with a fast pitch drop
    tone(f * det * 2.1, f * det * 1.3, len * 0.55, 'triangle', vol * 0.4, d); // overtone: decays quickly, makes it feel solid
    noise(0.045 + size * 0.01, vol * 0.7, 1300, 450, d);                      // grit: low-mid noise
    noise(0.01, vol * 0.18, 3200, 2200, d);                                   // surface click (very quiet)
  }
  const note = (semi) => 523.25 * Math.pow(2, semi / 12);            // based on C5
  const SCALE = [0, 2, 4, 7, 9, 12];                                  // pentatonic: higher from pawn to king
  const sounds = {
    hit(ev) {                                                       // stone on stone: one sound per cup (bigger = deeper), volume by impact speed
      const k = Math.min(1, ev.v / 1400), vol = 0.5 * (0.3 + 0.7 * k);
      stone(210 * Math.pow(0.84, ev.ta), vol, ev.ta);
      stone(210 * Math.pow(0.84, ev.tb) * 0.97, vol, ev.tb, 0.003);
      tone(70, 40, 0.12, 'sine', 0.45 * k);                                   // heavy low-frequency hit
    },
    wall(v) { const k = Math.min(1, v / 1500); stone(130, 0.4 * (0.35 + 0.65 * k), 3); tone(60, 38, 0.1, 'sine', 0.35 * k); },
    launch(v) { noise(0.28, 0.12 + Math.min(1, v / 3000) * 0.3, 500, 1800); },
    merge(tier, combo) {
      const f = note(SCALE[Math.min(tier, 5)] + Math.min(combo - 1, 5) * 2);
      tone(f, f, 0.28, 'triangle', 0.32); tone(f * 1.5, f * 1.5, 0.22, 'sine', 0.16, 0.06);
      stone(150 * Math.pow(0.86, tier), 0.4, tier);                                                          // stone thunk at the moment of merging
    },
    checkmate() { stone(90, 0.7, 5); stone(120, 0.5, 5, 0.04); [0, 4, 7, 12, 16].forEach((n, i) => tone(note(n), note(n), 0.3, 'triangle', 0.3, i * 0.09)); },
    spawn() { tone(500, 720, 0.06, 'sine', 0.1); },
    fade() { tone(420, 200, 0.12, 'sine', 0.08); },
    gameover() { [392, 330, 262].forEach((f, i) => tone(f, f * 0.97, 0.35, 'triangle', 0.25, i * 0.18)); },
    levelclear() { [-5, 0, 4, 7, 12].forEach((n, i) => tone(note(n), note(n), 0.32, 'triangle', 0.3, i * 0.1)); },
    click() { tone(900, 700, 0.03, 'square', 0.05); },
    bonus() { [7, 12].forEach((n, i) => tone(note(n + 12), note(n + 12), 0.16, 'triangle', 0.22, i * 0.06)); },
    rampup() { [0, 6].forEach((n, i) => tone(note(n - 5), note(n - 5), 0.3, 'sawtooth', 0.12, i * 0.16)); },
    shockwave() { stone(60, 0.8, 5); tone(55, 30, 0.6, 'sine', 0.5); noise(0.6, 0.3, 900, 120); },
    shatter() { noise(0.12, 0.2, 2600, 900); },
    itemget() { [0, 7, 12].forEach((n, i) => tone(note(n + 12), note(n + 12), 0.22, 'sine', 0.2, i * 0.07)); },
    fire() {                                                   // roar + crackles (Dragonfire)
      noise(1.0, 0.34, 650, 110); noise(0.55, 0.22, 2300, 380, 0.05); tone(70, 42, 0.7, 'sine', 0.32);
      for (let i = 0; i < 7; i++) noise(0.035, 0.18, 3200, 1500, 0.12 + i * 0.085 + Math.random() * 0.04);
    },
    upgrade() { tone(300, 900, 0.28, 'triangle', 0.26); tone(450, 1350, 0.26, 'sine', 0.13, 0.05); },
    wild() { [0, 4, 7, 11, 14, 19].forEach((n, i) => tone(note(n + 12), note(n + 12), 0.16, 'sine', 0.13, i * 0.05)); },
    undo() { tone(720, 160, 0.32, 'triangle', 0.22); noise(0.26, 0.14, 1900, 280); },
  };
  const gaps = { hit: 0.04, wall: 0.06, spawn: 0, fade: 0.05 };
  function play(name, a, b) {
    if (!ac || !enabled()) return;
    const now = ac.currentTime, gap = gaps[name] || 0;
    if (gap && lastAt[name] && now - lastAt[name] < gap) return;
    lastAt[name] = now; stats[name] = (stats[name] || 0) + 1;
    try { sounds[name](a, b); } catch (e) {}
  }
  function event(ev) {                                                 // game events → sounds
    switch (ev.type) {
      case 'hit': play('hit', ev); break;
      case 'wall': play('wall', ev.v); break;
      case 'merge': play('merge', ev.tier, ev.combo + (ev.n >= CONFIG.cluster.min ? ev.n : 0)); if (ev.n >= CONFIG.cluster.min) play('checkmate'); break;
      case 'checkmate': play('checkmate'); break;
      case 'spawn': play('spawn'); break;
      case 'fade': play('fade'); break;
      case 'gameover': play('gameover'); break;
      case 'levelclear': play('levelclear'); break;
      case 'item': play(ev.id); break;
      case 'itemget': play('itemget'); break;
      case 'bonus': play('bonus'); break;
      case 'rampup': play('rampup'); break;
      case 'shockwave': play('shockwave'); break;
      case 'shatter': case 'pillarbreak': case 'unstone': play('shatter'); break;
      case 'ultimate': play('checkmate'); play('shockwave'); if (ev.ult === 'fireball') play('fire'); break;
      case 'ultready': case 'ultarm': play('itemget'); break;
      case 'convert': play('spawn'); break;
      case 'pillarhit': play('wall', 900); break;
      case 'pillar': play('spawn'); break;
      case 'sting': play('wall', 1400); break;
      case 'stingdrop': play('fade'); break;
      case 'headcut': play('shatter'); break;
      case 'headburn': play('fire'); play('shatter'); break;
      case 'headgrow': play('spawn'); break;
      case 'rise': play('fade'); break;
      case 'roar': play('shockwave'); play('rampup'); break;
      case 'curse': play('shatter'); break;
      case 'poisondrop': play('fade'); break;
      case 'chimeraphase': play('shockwave'); play('rampup'); break;
      case 'chimeradown': play('checkmate'); play('shockwave'); break;
    }
  }
  return { unlock, suspend, play, event, stats };
})();
