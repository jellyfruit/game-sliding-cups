// Shared test helper: extracts the core (/*#core-start*/ … /*#core-end*/) from index.html, runs it and returns SC.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function loadCore() {
  const code = html.slice(html.indexOf('/*#core-start*/'), html.indexOf('/*#core-end*/'));
  return new Function(code + '\nreturn SC;')();
}
// Extracts an object literal from index.html that starts with `const NAME = {` and ends at the first line that is just `};`, and evaluates it (used by the i18n test)
function extractObject(name) {
  const a = html.indexOf('const ' + name + ' = {'), b = html.indexOf('\n};', a);
  if (a < 0 || b < 0) throw new Error('Not found: ' + name);
  return new Function(html.slice(a, b + 3) + '\nreturn ' + name + ';')();
}
module.exports = { loadCore, extractObject, html, ROOT };
