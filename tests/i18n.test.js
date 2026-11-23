// 多語言檢查：英文與繁中的 key 必須一致、程式裡用到的 key 都要有、每種生物都有名稱、{變數} 兩邊一致。
const assert = require('assert');
const { loadCore, extractObject, html } = require('./_load');
const SC = loadCore(), STR = extractObject('STR');
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };
const en = Object.keys(STR.en), zh = Object.keys(STR.zh);
const vars = (s) => (s.match(/\{[a-z]+\}/g) || []).sort().join(',');

test('英文與繁中的 key 完全一致', () => { assert.deepStrictEqual(en.filter(k => !(k in STR.zh)), [], '繁中缺少'); assert.deepStrictEqual(zh.filter(k => !(k in STR.en)), [], '英文缺少'); });
test('沒有空字串', () => { for (const L of ['en', 'zh']) for (const k of Object.keys(STR[L])) assert.ok(String(STR[L][k]).trim(), L + '.' + k + ' 是空的'); });
test('兩種語言的 {變數} 一致', () => { for (const k of en) assert.strictEqual(vars(STR.en[k]), vars(STR.zh[k]), k); });
test('程式裡用 t(\'key\') 的每個 key 都有翻譯', () => {
  const used = new Set([...html.matchAll(/\bt\('([a-zA-Z][\w.]*)'/g)].map(m => m[1]).filter(k => !k.endsWith('.')))   // 以「.」結尾的是動態 key（如 'kind.' + id），另有專門的測試; assert.ok(used.size > 20);
  for (const k of used) assert.ok(k in STR.en, '缺少 key：' + k);
});
test('模式標示（banner）的 key 有翻譯', () => { for (const m of Object.values(SC.Modes)) if (m.banner) assert.ok(m.banner in STR.en, m.banner); });
test('每種生物都有名稱（kind.<id>）', () => { for (const k of SC.CONFIG.kinds) for (const L of ['en', 'zh']) assert.ok(STR[L]['kind.' + k.id], L + ' 缺 kind.' + k.id); });
test('每種道具都有名稱與說明（item.<id>、item.<id>.desc）', () => { for (const d of SC.CONFIG.items.defs) for (const L of ['en', 'zh']) for (const k of ['item.' + d.id, 'item.' + d.id + '.desc']) assert.ok(STR[L][k], L + ' 缺 ' + k); });
test('bonus popups have text (bonus.<id>)', () => { for (const id of ['bank', 'long', 'double']) for (const L of ['en', 'zh']) assert.ok(STR[L]['bonus.' + id], L + ' bonus.' + id); });
test('英文字串不含中文字；繁中字串（除專有名詞外）含中文字', () => {
  for (const k of en) assert.ok(!/[一-鿿]/.test(STR.en[k]), 'en.' + k + ' 含中文');
  const exempt = new Set(['vp', 'sound']); // 純數字 / 符號的句子可例外
  for (const k of zh) if (!exempt.has(k) && !/^[\d\s{}a-zA-Z·×+：:]+$/.test(STR.zh[k])) assert.ok(/[一-鿿]/.test(STR.zh[k]), 'zh.' + k + ' 沒有中文');
});
console.log('\n' + passed + ' 項通過' + (process.exitCode ? '，有失敗' : ''));
