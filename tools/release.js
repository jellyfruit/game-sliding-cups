#!/usr/bin/env node
// 發佈新版本（語意化版本 major.minor.patch）。版本號只有一個來源：package.json 的 version。
//   node tools/release.js patch -m "修正…"   修 bug、調數值、文字 / 版面微調
//   node tools/release.js minor -m "新增…"   在既有機制上增加內容（生物、美術、道具、造型、關卡、語言、音效）
//   node tools/release.js major -m "新增…"   新模式、新核心機制、物理手感大改
//   node tools/release.js --set 9.0.0        直接指定版本（只在起點或更正時用）
// 會同步更新：package.json、index.html 的 APP_VERSION（畫面右下角）、sw.js 的 VERSION（快取名稱），並在 CHANGELOG.md 加一條。
// 不會自動 commit；跑完測試後：git commit，再 git tag v<版本> 並 push --tags。
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
if (!ok(next)) { console.error('用法：node tools/release.js patch|minor|major [-m "說明"]   或   --set x.y.z'); process.exit(1); }
const edit = (f, re, rep) => { const s = fs.readFileSync(file(f), 'utf8'); if (!re.test(s)) { console.error('找不到版本字串：' + f); process.exit(1); } fs.writeFileSync(file(f), s.replace(re, rep)); };
const old = pkg.version; pkg.version = next;
fs.writeFileSync(file('package.json'), JSON.stringify(pkg, null, 2) + '\n');
edit('index.html', /APP_VERSION = '[^']*'/, `APP_VERSION = 'v${next}'`);
edit('sw.js', /VERSION = 'sc-[^']*'/, `VERSION = 'sc-${next}'`);
if (msg && fs.existsSync(file('CHANGELOG.md'))) {
  const kind = si >= 0 ? '' : ` （${args[0]}）`, d = new Date().toISOString().slice(0, 10);
  const s = fs.readFileSync(file('CHANGELOG.md'), 'utf8'), at = s.indexOf('\n## ');
  fs.writeFileSync(file('CHANGELOG.md'), s.slice(0, at + 1) + `## ${next} — ${d}${kind}\n- ${msg}\n\n` + s.slice(at + 1));
}
console.log(`${old} → ${next}（package.json、index.html、sw.js${msg ? '、CHANGELOG.md' : ''}）。跑完測試後 commit，再 git tag v${next}。`);
