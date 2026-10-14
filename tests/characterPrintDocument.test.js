import test from 'node:test';
import assert from 'node:assert/strict';
import { PRINT_COPY, buildCharacterPrintDocument, escapePrintText, getPrintLanguage, makePrintFileName } from '../src/utils/characterPrintDocument.js';

test('print locales have identical complete keys', () => {
  for (const lang of ['en','ru','uk','pl']) assert.deepEqual(Object.keys(PRINT_COPY[lang]).sort(), Object.keys(PRINT_COPY.en).sort());
  assert.equal(getPrintLanguage('uk-UA'), 'uk');
  assert.equal(getPrintLanguage('unknown'), 'en');
  assert.equal(getPrintLanguage('__proto__'), 'en');
});
test('all text is escaped, including names, notes, effects and document title', () => {
  const payload = '<script>alert("x")</script><img src=x onerror=alert(1)>';
  const html = buildCharacterPrintDocument({ name:payload, origin:payload, backstory:payload, perks:[[payload, 0, payload]], conditions:[payload] }, 'ru');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal(escapePrintText('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
});
test('zero values and Unicode survive rendering', () => {
  const html = buildCharacterPrintDocument({ name:'Їжак — Łucja', xp:0, caps:0, defense:0, special:[['L',0]], gear:[['Вода',0,0,'']] }, 'uk');
  assert.ok(html.includes('Їжак — Łucja'));
  assert.ok(html.includes('<td>0</td>'));
  assert.ok(html.includes('<strong>0</strong>'));
  assert.ok(html.includes('lang="uk"'));
});
test('all inventory, perk and weapon rows and long notes remain present', () => {
  const rows = Array.from({length:200}, (_,i) => [`unique-${i}`,1,'x'.repeat(800)]);
  const html = buildCharacterPrintDocument({ name:'Overflow', gear:rows, perks:rows, weapons:rows, backstory:'start\n'+'notes '.repeat(4000)+'END-NOTES' });
  assert.equal((html.match(/unique-199/g)||[]).length,3);
  assert.ok(html.includes('END-NOTES'));
  assert.ok(html.includes('class="long-row"'));
  assert.ok(html.includes('display:table-header-group'));
  assert.ok(!html.includes('overflow:hidden'));
});
test('renderer does not mutate its snapshot', () => {
  const model = { name:'Test', gear:[['Water',1,0]], special:[['S',5]] };
  const before = JSON.stringify(model);
  buildCharacterPrintDocument(model);
  assert.equal(JSON.stringify(model), before);
});
test('filename is Unicode-preserving and strips path/control characters', () => {
  assert.equal(makePrintFileName('Їжак/Łucja:*'), 'PIP-2D20_Їжак_Łucja__');
  assert.equal(makePrintFileName(''), 'PIP-2D20_Character');
  assert.ok(!makePrintFileName('a\n/b').includes('\n'));
});
test('document has a real A4 print stylesheet and hides its controls', () => {
  const html = buildCharacterPrintDocument({name:'Test'});
  assert.ok(html.includes('size: A4 portrait'));
  assert.ok(html.includes('.toolbar { display:none!important; }'));
  assert.ok(html.includes('id="print-sheet"'));
  assert.ok(html.includes('class="page-section"'));
});
