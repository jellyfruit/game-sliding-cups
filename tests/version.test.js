// Version consistency: package.json is the single source; APP_VERSION and the service-worker cache name must follow it.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const pkg = JSON.parse(read('package.json')), html = read('index.html'), sw = read('sw.js'), log = read('CHANGELOG.md');
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };
test('package.json version is major.minor.patch', () => assert.match(pkg.version, /^\d+\.\d+\.\d+$/));
test('index.html APP_VERSION matches package.json', () => assert.strictEqual(html.match(/APP_VERSION = '([^']*)'/)[1], 'v' + pkg.version));
test('sw.js cache name matches package.json', () => assert.strictEqual(sw.match(/VERSION = '([^']*)'/)[1], 'sc-' + pkg.version));
test('sw.js precaches every game script, in index.html order (offline on first install)', () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  assert.ok(scripts.length > 10, 'script tags not found');
  assert.deepStrictEqual(eval(sw.match(/const CODE = (\[[^\]]*\]);/)[1]), scripts);
  for (const f of scripts) assert.ok(fs.existsSync(path.join(root, f)), 'missing file ' + f);
});
test('latest CHANGELOG.md entry is the current version', () => assert.strictEqual(log.match(/^## (\d+\.\d+\.\d+)/m)[1], pkg.version));
console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
