// i18n checks: en/zh keys match, every key used in code exists, every creature/item/bonus has text, {vars} match on both sides.
const assert = require('assert');
const { loadCore, extractObject, html } = require('./_load');
const SC = loadCore(), STR = extractObject('STR');
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };
const en = Object.keys(STR.en), zh = Object.keys(STR.zh);
const vars = (s) => (s.match(/\{[a-z]+\}/g) || []).sort().join(',');

test('en and zh have exactly the same keys', () => { assert.deepStrictEqual(en.filter(k => !(k in STR.zh)), [], 'missing in zh'); assert.deepStrictEqual(zh.filter(k => !(k in STR.en)), [], 'missing in en'); });
test('no empty strings', () => { for (const L of ['en', 'zh']) for (const k of Object.keys(STR[L])) assert.ok(String(STR[L][k]).trim(), L + '.' + k + ' is empty'); });
test('{vars} match in both languages', () => { for (const k of en) assert.strictEqual(vars(STR.en[k]), vars(STR.zh[k]), k); });
test('every key used as t(\'key\') has a translation', () => {
  const used = new Set([...html.matchAll(/\bt\('([a-zA-Z][\w.]*)'/g)].map(m => m[1]).filter(k => !k.endsWith('.')));   // keys ending in '.' are dynamic (e.g. 'kind.' + id) and have their own tests
  assert.ok(used.size > 20);
  for (const k of used) assert.ok(k in STR.en, 'missing key: ' + k);
});
test('mode banner keys have translations', () => { for (const m of Object.values(SC.Modes)) if (m.banner) assert.ok(m.banner in STR.en, m.banner); });
test('every creature has a name (kind.<id>)', () => { for (const k of SC.CONFIG.kinds) for (const L of ['en', 'zh']) assert.ok(STR[L]['kind.' + k.id], L + ' missing kind.' + k.id); });
test('every item has a name and description (item.<id>, item.<id>.desc)', () => { for (const d of SC.CONFIG.items.defs) for (const L of ['en', 'zh']) for (const k of ['item.' + d.id, 'item.' + d.id + '.desc']) assert.ok(STR[L][k], L + ' missing ' + k); });
test('bonus popups have text (bonus.<id>)', () => { for (const id of ['bank', 'long', 'double']) for (const L of ['en', 'zh']) assert.ok(STR[L]['bonus.' + id], L + ' bonus.' + id); });
test('story chapters have opening/closing cards and an Elden line per level (story.ch<N>.*, lv.<id>.elden)', () => {
  for (const c of SC.CONFIG.story.chapters) for (const L of ['en', 'zh']) {
    for (const k of ['open', 'close']) assert.ok(STR[L]['story.ch' + c + '.' + k], L + ' missing story.ch' + c + '.' + k);
    for (const lv of SC.CONFIG.levels.filter(v => v.chapter === c)) assert.ok(STR[L]['lv.' + lv.id + '.elden'], L + ' missing lv.' + lv.id + '.elden');
  }
});
test('English strings contain no Chinese; zh strings (except symbols/numbers) contain Chinese', () => {
  for (const k of en) assert.ok(!/[\u4e00-\u9fff]/.test(STR.en[k]), 'en.' + k + ' contains Chinese');
  const exempt = new Set(['vp', 'sound', 'story.quote', 'levels.progress']); // strings that are only numbers/symbols are exempt
  for (const k of zh) if (!exempt.has(k) && !/^[\d\s{}a-zA-Z·×+\uff1a:]+$/.test(STR.zh[k])) assert.ok(/[\u4e00-\u9fff]/.test(STR.zh[k]), 'zh.' + k + ' has no Chinese');
});
console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
