import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// The adapter shares the app's weapon helpers, which import browser i18n and
// JSON dictionaries. Exercise that real module graph through the same Vite
// transforms as the app instead of relying on Node's incompatible JSON loader.
// Node runs test files in separate processes; restore storage after this file.
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const stored = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable:true,
  value:{
    getItem:key => stored.get(String(key)) ?? null,
    setItem:(key,value) => stored.set(String(key),String(value)),
    removeItem:key => stored.delete(String(key)),
    clear:() => stored.clear(),
  },
});
const restoreStorage = () => {
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
  else delete globalThis.localStorage;
};
after(restoreStorage);
let buildDefaultForm, createCharacterPrintModel;
const vite = await createServer({
  root:fileURLToPath(new URL('../',import.meta.url)),
  configFile:false,
  logLevel:'error',
  appType:'custom',
  server:{ middlewareMode:true, hmr:false },
});
try {
  ({ buildDefaultForm } = await vite.ssrLoadModule('/src/constants.js'));
  ({ createCharacterPrintModel } = await vite.ssrLoadModule('/src/utils/characterPrint.js'));
} finally {
  await vite.close();
}

test('print snapshot preserves zero HP/luck and derived overrides without mutations', () => {
  const form = { ...buildDefaultForm(), characterName:'Їжак / Łucja', currentHp:'0', currentLuckPoints:'0', maxHpOverride:'20', radiationHp:'3', defenseOverride:'4', initiativeOverride:'15', mdOverride:'2', carryWeightOverride:'190', caps:'0' };
  const before = JSON.stringify(form);
  const model = createCharacterPrintModel(form, {language:'ru'});
  assert.equal(model.health, '0 / 17 / 20');
  assert.equal(model.luck, '0 / 5');
  assert.equal(model.defense, 4);
  assert.equal(model.initiative, 15);
  assert.equal(model.melee, '+2 CD');
  assert.equal(model.carry, '0 / 190');
  assert.equal(model.skills.length, 17);
  assert.equal(JSON.stringify(form), before);
});
test('robot sheet uses the provided robot locations and spells out immunities', () => {
  const form = { ...buildDefaultForm(), origin:'mister_handy' };
  const model = createCharacterPrintModel(form, {language:'ru'});
  assert.equal(model.armor[0][0], 'Оптика (1–2)');
  assert.equal(model.armor[5][0], 'Двигатель (18–20)');
  assert.equal(model.armor[0][3], 'Иммунитет');
});
test('ammo is separate from gear and custom descriptions are preserved', () => {
  const form = buildDefaultForm();
  form.inventoryItems = [{name:'10mm',quantity:'0',weight:'0',category:'ammo'}, {name:'Custom',quantity:'1',weight:'2',category:'misc',effect:'Їжак <b>text</b>'}];
  form.perksAndTraits = [{name:'Custom perk',rank:'0',description:'Не обрезать'}];
  const model = createCharacterPrintModel(form);
  assert.equal(model.ammo.length,1);
  assert.equal(model.ammo[0][1],'0');
  assert.equal(model.gear.length,1);
  assert.equal(model.gear[0][3],'Їжак <b>text</b>');
  assert.deepEqual(model.perks[0], ['Custom perk','0','Не обрезать']);
});
