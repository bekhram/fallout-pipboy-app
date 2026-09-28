import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultForm } from '../src/constants.js';
import { createCharacterPrintModel } from '../src/utils/characterPrint.js';

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
