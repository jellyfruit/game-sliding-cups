// 測試共用：從 index.html 取出「核心層」（/*#core-start*/ … /*#core-end*/）並執行，回傳 SC。
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function loadCore() {
  const code = html.slice(html.indexOf('/*#core-start*/'), html.indexOf('/*#core-end*/'));
  return new Function(code + '\nreturn SC;')();
}
// 從 index.html 取出一段以 `const NAME = {` 開頭、到第一個單獨成行的 `};` 結束的物件字面量並求值（i18n 測試用）
function extractObject(name) {
  const a = html.indexOf('const ' + name + ' = {'), b = html.indexOf('\n};', a);
  if (a < 0 || b < 0) throw new Error('找不到 ' + name);
  return new Function(html.slice(a, b + 3) + '\nreturn ' + name + ';')();
}
module.exports = { loadCore, extractObject, html, ROOT };
