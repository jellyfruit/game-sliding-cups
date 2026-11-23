#!/usr/bin/env node
// Release a new version (semver major.minor.patch). Single source of truth: package.json "version".
//   node tools/release.js patch -m "Fix …"   bug fixes, tuning, text/layout tweaks
//   node tools/release.js minor -m "Add …"   new content on existing mechanics (creatures, art, items, skins, levels, languages, sounds)
//   node tools/release.js major -m "Add …"   new mode, new core mechanic, big physics change
//   node tools/release.js --set 9.0.0        set a version directly (only for a starting point or a correction)
// Updates together: package.json, APP_VERSION in index.html (bottom-right label), VERSION in sw.js (cache name), plus a CHANGELOG.md entry.
// Does not commit; after the tests pass: git commit, git tag v<version>, push --tags.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), file = (f) => path.join(root, f);
const args = process.argv.slice(2), mi = args.indexOf('-m'), msg = mi >= 0 ? args[mi + 1] : '';
const si = args.indexOf('--set');
const pkg = JSON.parse(fs.readFileSync(file('package.json'), 'utf8'));
const ok = (v) => /^\d+\.\d+\.\d+$/.test(v || '');
let next;
if (si >= 0) next = args[si + 1];
else {
  const [M, m, p] = pkg.version.split('.').map(Number), kind = args[0];
  next = kind === 'major' ? `${M + 1}.0.0` : kind === 'minor' ? `${M}.${m + 1}.0` : kind === 'patch' ? `${M}.${m}.${p + 1}` : null;
}
if (!ok(next)) { console.error('Usage: node tools/release.js patch|minor|major [-m "message"]   or   --set x.y.z'); process.exit(1); }
const edit = (f, re, rep) => { const s = fs.readFileSync(file(f), 'utf8'); if (!re.test(s)) { console.error('Version string not found in ' + f); process.exit(1); } fs.writeFileSync(file(f), s.replace(re, rep)); };
const old = pkg.version; pkg.version = next;
fs.writeFileSync(file('package.json'), JSON.stringify(pkg, null, 2) + '\n');
edit('index.html', /APP_VERSION = '[^']*'/, `APP_VERSION = 'v${next}'`);
edit('sw.js', /VERSION = 'sc-[^']*'/, `VERSION = 'sc-${next}'`);
if (msg && fs.existsSync(file('CHANGELOG.md'))) {
  const kind = si >= 0 ? '' : ` (${args[0]})`, d = new Date().toISOString().slice(0, 10);
  const s = fs.readFileSync(file('CHANGELOG.md'), 'utf8'), at = s.indexOf('\n## ');
  fs.writeFileSync(file('CHANGELOG.md'), s.slice(0, at + 1) + `## ${next} — ${d}${kind}\n- ${msg}\n\n` + s.slice(at + 1));
}
console.log(`${old} → ${next} (package.json, index.html, sw.js${msg ? ', CHANGELOG.md' : ''}). Run the tests, commit, then git tag v${next}.`);
