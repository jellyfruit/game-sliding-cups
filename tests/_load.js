// Shared test helper. The game is plain <script src="src/..."> files listed in index.html (one shared global scope, no build step).
// loadCore(): concatenates the core files (src/core/*, src/data/*) in index.html's order, runs them in one function and returns SC.
// scripts / source: every script path in load order, and all game code (inline + files) as one string (for source scans, e.g. t('key')).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const coreFiles = scripts.filter(f => /^src\/(core|data)\//.test(f));
const source = html + '\n' + scripts.map(read).join('\n');
function loadCore() {
  return new Function(coreFiles.map(read).join('\n') + '\nreturn SC;')();
}
// Extracts an object literal from the game source that starts with `const NAME = {` and ends at the first line that is just `};`, and evaluates it (used by the i18n test)
function extractObject(name) {
  const a = source.indexOf('const ' + name + ' = {'), b = source.indexOf('\n};', a);
  if (a < 0 || b < 0) throw new Error('Not found: ' + name);
  return new Function(source.slice(a, b + 3) + '\nreturn ' + name + ';')();
}
module.exports = { loadCore, extractObject, html, source, scripts, coreFiles, ROOT };
