#!/usr/bin/env node
// 發佈新版本：同時更新 index.html 的 APP_VERSION 與 sw.js 的 VERSION，避免兩邊不一致。
// 用法：node tools/release.js v8
const fs = require('fs'), path = require('path');
const v = process.argv[2];
if (!/^v\d+$/.test(v || '')) { console.error('用法：node tools/release.js v8'); process.exit(1); }
const edit = (file, re, rep) => {
  const p = path.join(__dirname, '..', file), s = fs.readFileSync(p, 'utf8');
  if (!re.test(s)) { console.error('找不到版本字串：' + file); process.exit(1); }
  fs.writeFileSync(p, s.replace(re, rep));
};
edit('index.html', /APP_VERSION = '[^']*'/, `APP_VERSION = '${v}'`);
edit('sw.js', /VERSION = 'sc-[^']*'/, `VERSION = 'sc-${v}'`);
console.log('已更新為 ' + v + '（index.html + sw.js）。記得跑測試後再 commit。');
