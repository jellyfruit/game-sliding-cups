/* Kings of Cups — src/data/kinds.js
 * CORE DATA · CONFIG.tiers (pawn … king sizes and feel) and CONFIG.kinds (creatures and colours); TOP = king tier index.
 * Depends on: CONFIG (src/core/config.js). art-src/composite.py reads the kind colours from this file.
 * Must not touch: the DOM; runtime state. Data only.
 */
'use strict';

// massK mass factor, fric friction factor, bounce restitution factor: bigger cups are heavier, stop sooner, bounce less
CONFIG.tiers = [
  { r: 22, glyph: '♟', massK: 1.0, fric: 1.00, bounce: 1.00 },
  { r: 28, glyph: '♞', massK: 1.1, fric: 1.08, bounce: 0.95 },
  { r: 36, glyph: '♝', massK: 1.2, fric: 1.16, bounce: 0.90 },
  { r: 46, glyph: '♜', massK: 1.3, fric: 1.24, bounce: 0.85 },
  { r: 58, glyph: '♛', massK: 1.4, fric: 1.32, bounce: 0.80 },
  { r: 72, glyph: '♚', massK: 1.5, fric: 1.40, bounce: 0.75 },
];

CONFIG.kinds = [
  { id: 'dragon',      body: '#ff7a59', dark: '#c9482a', rim: '#ffc9b8' },
  { id: 'unicorn',     body: '#b98cff', dark: '#7d4fd1', rim: '#e6d6ff' },
  { id: 'hydra',       body: '#5fd08a', dark: '#2f9a58', rim: '#c9f2d8' },
  { id: 'phoenix',     body: '#ffc23d', dark: '#d18f00', rim: '#ffe7a8' },
  { id: 'basilisk',    body: '#3cc7c2', dark: '#1d8f8b', rim: '#bff0ee' },
  { id: 'griffin',     body: '#c58a5a', dark: '#8a5832', rim: '#ecd0b6' },
  { id: 'aqrabuamelu', body: '#e8b86a', dark: '#b27d2c', rim: '#f8e3bd' },
  // finale: never bought with VP; joins only via Profile.unlockChimera (clearing the finale). Always last.
  // art: false on a kind = no sprites yet (procedural cup, no image requests). The chimera's Gemini art arrived in 19.0.0.
  { id: 'chimera',     body: '#a8657a', dark: '#6a3346', rim: '#e8c6d0', finale: true },
];
const TOP = CONFIG.tiers.length - 1;
