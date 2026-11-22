// 版本號一致性：package.json 是唯一來源，畫面（APP_VERSION）與 service worker 快取名稱必須跟著它。
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const pkg = JSON.parse(read('package.json')), html = read('index.html'), sw = read('sw.js'), log = read('CHANGELOG.md');
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };
test('package.json 的版本是 major.minor.patch', () => assert.match(pkg.version, /^\d+\.\d+\.\d+$/));
test('index.html 的 APP_VERSION 與 package.json 一致', () => assert.strictEqual(html.match(/APP_VERSION = '([^']*)'/)[1], 'v' + pkg.version));
test('sw.js 的快取名稱與 package.json 一致', () => assert.strictEqual(sw.match(/VERSION = '([^']*)'/)[1], 'sc-' + pkg.version));
test('CHANGELOG.md 最新一條就是目前版本', () => assert.strictEqual(log.match(/^## (\d+\.\d+\.\d+)/m)[1], pkg.version));
console.log('\n' + passed + ' 項通過' + (process.exitCode ? '，有失敗' : ''));
