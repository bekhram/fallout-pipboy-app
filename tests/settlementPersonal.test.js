import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignCommand, publicCampaign } from '../server/campaignState.js';
import { applyOfflineCommand } from '../src/utils/settlementOfflineApply.js';
import { personalQuote, placeStoredBuilding } from '../src/utils/personalConstruction.js';
import { playerResources, balance } from '../src/utils/settlementDevelopment.js';
import { debitPersonalResources, creditPersonalResources } from '../src/utils/personalResources.js';
import { reconcilePersonalHolds, updateLocalCharacter, totalHolds } from '../src/cloud/characterReservationState.js';
import { enqueue, prepareBatch, acknowledge, projectRecord, validateBatch } from '../src/cloud/settlementOfflineProtocol.js';
import { personalFixture, personalBuild, personalUid as uid, deviceId, sourceId } from './fixtures/personalFixture.js';

const issue=(c,input,id,now=Date.now())=>campaignCommand(c,uid,{...input,requestId:id,deviceId},now);
function queued(f,id='request_personal_001',type='small_house',x=0,y=0) {
  const old=structuredClone(f.record);
  enqueue(f.record,personalBuild(f.s,type,x,y),id,f.now,applyOfflineCommand);
  reconcilePersonalHolds(old,f.record,f.character);
}
function ack(f,c,state='accepted',id='request_personal_001') {
  prepareBatch(f.record,'batch_personal_001');
  const before=structuredClone(f.record);
  acknowledge(f.record,{protocol:1,requestId:f.record.inflight.requestId,deviceId,through:1,campaign:publicCampaign(c,uid),results:[{sequence:1,requestId:id,state,...(state==='rejected'?{error:'PERSONAL_RESOURCES_INSUFFICIENT'}:{})}]},Date.now());
  reconcilePersonalHolds(before,f.record,f.character);
}
test('personal construction debits approved character, not the communal stockpile',()=>{
  const f=personalFixture(), before=structuredClone(f.c), after=issue(f.c,personalBuild(f.s),'request_personal_001',f.now);
  assert.deepEqual(f.c,before);
  assert.equal(playerResources(after.accounts[uid]).common,60);
  assert.deepEqual(balance(after.settlements[0]),balance(f.s));
  const b=after.settlements[0].buildings.at(-1);
  assert.equal(b.id,'building_request_personal_001');assert.equal(b.paidCost.common,40);assert.equal(b.funding.payerUid,uid);
});
test('offline preview makes the same building ID without changing confirmed resources',()=>{
  const f=personalFixture();queued(f);
  const view=projectRecord(f.record,applyOfflineCommand);
  assert.equal(view.conflicts.length,0);assert.equal(view.campaign.settlements[0].buildings.at(-1).id,'building_request_personal_001');
  assert.equal(playerResources(f.record.snapshot.character).common,100);
  assert.equal(playerResources(f.character.form).common,60);assert.equal(totalHolds(f.character).common,40);
});
test('accepted payment consumes the existing reservation, never a second debit',()=>{
  const f=personalFixture();queued(f);
  const c=issue(f.c,personalBuild(f.s),'request_personal_001',f.now);ack(f,c);
  assert.equal(playerResources(f.character.form).common,60);assert.equal(totalHolds(f.character).common,0);assert.equal(f.record.entries.length,0);
  reconcilePersonalHolds(f.record,f.record,f.character);assert.equal(playerResources(f.character.form).common,60);
});
test('rejection releases exact reserved stacks including custom metadata',()=>{
  const f=personalFixture();queued(f);ack(f,f.c,'rejected');
  assert.equal(playerResources(f.character.form).common,100);
  assert.ok(f.character.form.inventoryItems.some(i=>i.customNote==='retain metadata'));
  assert.equal(totalHolds(f.character).common,0);
});
test('sheet crafting spends only the unreserved inventory; a stale editor cannot restore held materials',()=>{
  const f=personalFixture(), stale=structuredClone(f.character.form);queued(f);
  assert.throws(()=>updateLocalCharacter(f.character,{...stale,name:'Stale editor'}),/STALE_CHARACTER_UPDATE/);
  assert.throws(()=>updateLocalCharacter(f.character,form=>debitPersonalResources(form,{common:70}).character),/PERSONAL_RESOURCES_INSUFFICIENT/);
  updateLocalCharacter(f.character,form=>debitPersonalResources(form,{common:20}).character);
  assert.equal(playerResources(f.character.form).common,40);assert.equal(totalHolds(f.character).common,40);
  ack(f,f.c,'rejected');assert.equal(playerResources(f.character.form).common,80);
});
test('two offline payments cannot share the same local materials',()=>{
  const f=personalFixture();queued(f);queued(f,'request_personal_002','small_house',5,0);
  assert.equal(playerResources(f.character.form).common,20);
  const copy=structuredClone(f.record), character=structuredClone(f.character);
  assert.throws(()=>{enqueue(copy,personalBuild(f.s,'small_house',0,5),'request_personal_003',f.now,applyOfflineCommand);reconcilePersonalHolds(f.record,copy,character);},/PERSONAL_RESOURCES_INSUFFICIENT/);
  assert.equal(f.record.entries.length,2);assert.equal(playerResources(f.character.form).common,20);
});
test('an unknown outcome cannot release a reservation',()=>{
  const f=personalFixture();queued(f);const copy=structuredClone(f.record);copy.entries=[];
  assert.throws(()=>reconcilePersonalHolds(f.record,copy,structuredClone(f.character)),/RESERVATION_ACK_REQUIRED/);
});
test('price changes, missing skill and wrong spending device are checked by the server',()=>{
  const f=personalFixture(), input=personalBuild(f.s);
  const changed=structuredClone(input);changed.command.quote.common=0;
  assert.throws(()=>issue(f.c,changed,'request_changed_001'),/CONSTRUCTION_COST_CHANGED/);
  assert.throws(()=>campaignCommand(f.c,uid,{...input,requestId:'request_wrong_device',deviceId:'other_device_123'},f.now),/PERSONAL_DEVICE_REQUIRED/);
  f.c.accounts[uid].skills.Repair.rank=0;assert.throws(()=>issue(f.c,input,'request_skill_001'),/REQUIREMENTS/);
});
test('paid placement collision stores only the incoming building; placement later is free',()=>{
  const f=personalFixture(), first=issue(f.c,personalBuild(f.s),'request_existing_001',f.now);
  const second=issue(first,personalBuild(f.s),'request_incoming_002',f.now);
  assert.equal(second.settlements[0].buildings.length,first.settlements[0].buildings.length);
  const stored=second.settlements[0].storedBuildings[0];assert.equal(stored.id,'building_request_incoming_002');
  assert.equal(playerResources(second.accounts[uid]).common,20);
  const placed=issue(second,{type:'settlement',settlementId:f.s.id,command:{type:'placeStored',buildingId:stored.id,x:5,y:0}},'request_place_003',f.now);
  assert.equal(placed.settlements[0].storedBuildings.length,0);assert.equal(placed.settlements[0].buildings.at(-1).funding.requestId,'request_incoming_002');
  assert.equal(playerResources(placed.accounts[uid]).common,20);
  assert.throws(()=>issue(placed,{type:'settlement',settlementId:f.s.id,command:{type:'placeStored',buildingId:stored.id,x:5,y:5}},'request_duplicate_place'),/NOT_FOUND/);
});
test('out-of-bounds or unpaid new building never enters storage',()=>{
  const f=personalFixture();
  assert.throws(()=>issue(f.c,personalBuild(f.s,'small_house',23,23),'request_bad_plot_001'),/PLACEMENT/);
  f.c.accounts[uid].inventoryItems=[];
  assert.throws(()=>issue(f.c,personalBuild(f.s),'request_unpaid_001'),/PERSONAL_RESOURCES_INSUFFICIENT/);
});
test('cancelling a personal project refunds the original payer, not the settlement',()=>{
  const f=personalFixture();queued(f);
  let c=issue(f.c,personalBuild(f.s),'request_personal_001',f.now);ack(f,c);
  c=issue(c,{type:'settlement',settlementId:f.s.id,command:{type:'cancel',key:'building:building_request_personal_001'}},'request_cancel_001',f.now);
  assert.equal(playerResources(c.accounts[uid]).common,100);assert.deepEqual(balance(c.settlements[0]),balance(f.s));
  f.record.snapshot=publicCampaign(c,uid);reconcilePersonalHolds(f.record,f.record,f.character);
  assert.equal(playerResources(f.character.form).common,100);
  reconcilePersonalHolds(f.record,f.record,f.character);assert.equal(playerResources(f.character.form).common,100);
});
test('an authorized GM cancelling someone else’s paid building refunds that payer only',()=>{
  const f=personalFixture();let c=issue(f.c,personalBuild(f.s),'request_personal_001',f.now);
  c.members.other_gm={name:'GM'};c.memberIds.push('other_gm');c.ownerUid='other_gm';
  c=campaignCommand(c,'other_gm',{type:'settlement',settlementId:f.s.id,requestId:'request_gm_cancel',command:{type:'cancel',key:'building:building_request_personal_001'}},f.now);
  assert.equal(playerResources(c.accounts[uid]).common,100);assert.equal(c.accounts.other_gm,undefined);
});
test('old stockpile-funded projects retain their old refund destination',()=>{
  const f=personalFixture();delete f.c.accounts[uid].constructionSource;f.c.settlements[0].stockpile.materials.common=100;
  const old=campaignCommand(f.c,uid,{type:'settlement',settlementId:f.s.id,requestId:'legacy_funded_001',command:{type:'build',buildingType:'small_house',x:0,y:0}},f.now);
  const undone=campaignCommand(old,uid,{type:'settlement',settlementId:f.s.id,requestId:'legacy_cancel_001',command:{type:'cancel',key:'building:building_legacy_funded_001'}},f.now);
  assert.equal(balance(undone.settlements[0]).common,100);assert.equal(playerResources(undone.accounts[uid]).common,100);
});
test('linked account rejects the legacy stockpile payment path; source cannot be replaced silently',()=>{
  const f=personalFixture();
  assert.throws(()=>issue(f.c,{type:'settlement',settlementId:f.s.id,command:{type:'build',buildingType:'small_house',x:0,y:0}},'request_old_path'),/PERSONAL_PAYMENT_REQUIRED/);
  assert.throws(()=>campaignCommand(f.c,uid,{type:'linkPersonalSource',sourceId:'new_source_123',deviceId:'other_device_123'},f.now),/PERSONAL_DEVICE_REQUIRED/);
});
test('room personal payment has deterministic room identity and unchanged communal resources',()=>{
  const f=personalFixture();f.s.buildings.push({id:'existing_house',type:'small_house',state:'active',x:0,y:0,rooms:[],condition:100});
  const command={type:'roomPersonal',buildingId:'existing_house',roomType:'storage',sourceId};command.quote=personalQuote(f.s,command).amounts;
  const after=issue(f.c,{type:'settlement',settlementId:f.s.id,command},'request_room_001',f.now);
  assert.equal(after.settlements[0].buildings.at(-1).rooms[0].id,'room_request_room_001');assert.deepEqual(balance(after.settlements[0]),balance(f.s));
});
test('malformed stack quantities are never silently normalized into spendable money',()=>{
  const f=personalFixture();f.form.inventoryItems[0].quantity='-30';
  assert.throws(()=>debitPersonalResources(f.form,{common:1}),/INVALID_RESOURCE_AMOUNT/);
  assert.throws(()=>creditPersonalResources(f.character.form,{common:2.5}),/INVALID_RESOURCE_AMOUNT/);
});

test('a functional crafting closure based on a stale render cannot restore reserved resources',()=>{
  const f=personalFixture(), stale=structuredClone(f.character.form);queued(f);
  const before=structuredClone(f.character);
  assert.throws(()=>updateLocalCharacter(f.character,prev=>({...prev,inventoryItems:stale.inventoryItems}),stale._localRevision),/STALE_CHARACTER_UPDATE/);
  assert.deepEqual(f.character,before);
  updateLocalCharacter(f.character,prev=>({...prev,name:'Rename is safe'}),stale._localRevision);
  assert.equal(f.character.form.name,'Rename is safe');assert.equal(playerResources(f.character.form).common,60);
});
test('direct API placement also rejects fractional and NaN coordinates',()=>{
  const f=personalFixture();let c=issue(f.c,personalBuild(f.s),'request_place_first',f.now);
  c=issue(c,personalBuild(f.s),'request_place_stored',f.now);const b=c.settlements[0].storedBuildings[0];
  for(const x of [1.5,NaN,Infinity,-1])assert.throws(()=>issue(c,{type:'settlement',settlementId:f.s.id,command:{type:'placeStored',buildingId:b.id,x,y:0}},'request_bad_placement',f.now),/PLACEMENT/);
});
