import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettlement } from '../src/utils/settlementState.js';
import { applySettlementCommand } from '../src/utils/settlementCommands.js';
import { placeStoredBuilding } from '../src/utils/personalConstruction.js';
import { editorHistoryCommand, editorMoveEntry, editorStoreEntry } from '../src/utils/settlementEditorHistory.js';
import { localCommand } from '../src/cloud/settlementOfflineProtocol.js';

function settlementWithHouse() {
  const s=createSettlement({name:'Editor',regionId:'commonwealth',worldX:1,worldY:1,ownerCharacterId:'owner'});
  const house={id:'house-1',type:'small_house',x:1,y:1,state:'active',condition:100,rooms:[{id:'room-1',type:'private_room',state:'active'}],startedAt:1,completedAt:1};
  return {
    ...s,
    buildings:[...(s.buildings||[]),house],
    settlers:(s.settlers||[]).map((worker,index)=>index===0?{...worker,assignedBuildingId:house.id,settlementAction:{type:'build',targetBuildingId:house.id},status:'working'}:worker),
  };
}

test('layout editor can store a completed building without refunding or losing its rooms',()=>{
  const source=settlementWithHouse();
  const result=applySettlementCommand(source,null,{id:'owner'},{type:'store',buildingId:'house-1'},1000).settlement;
  assert.equal(result.buildings.some(b=>b.id==='house-1'),false);
  const stored=result.storedBuildings.find(b=>b.id==='house-1');
  assert.ok(stored);
  assert.equal(stored.x,null);assert.equal(stored.y,null);
  assert.equal(stored.storedReason,'MANUAL_EDITOR');
  assert.equal(stored.rooms[0].id,'room-1');
  const worker=result.settlers.find(w=>w.id===source.settlers[0].id);
  assert.equal(worker.assignedBuildingId,null);
  assert.equal(worker.settlementAction,null);
});

test('manually stored editor buildings can be placed back on the grid',()=>{
  const stored=applySettlementCommand(settlementWithHouse(),null,{id:'owner'},{type:'store',buildingId:'house-1'},1000).settlement;
  const placed=placeStoredBuilding(stored,{id:'owner'},{buildingId:'house-1',x:6,y:6},2000);
  const house=placed.buildings.find(b=>b.id==='house-1');
  assert.equal(house.x,6);assert.equal(house.y,6);
  assert.equal(house.rooms[0].id,'room-1');
  assert.equal(placed.storedBuildings.some(b=>b.id==='house-1'),false);
});

test('editor move and store history generate reversible server commands',()=>{
  const building={id:'b',x:2,y:3};
  const move=editorMoveEntry(building,{x:8,y:9});
  assert.deepEqual(editorHistoryCommand(move,'forward'),{type:'move',buildingId:'b',x:8,y:9});
  assert.deepEqual(editorHistoryCommand(move,'undo'),{type:'move',buildingId:'b',x:2,y:3});
  const store=editorStoreEntry(building);
  assert.deepEqual(editorHistoryCommand(store,'forward'),{type:'store',buildingId:'b'});
  assert.deepEqual(editorHistoryCommand(store,'undo'),{type:'placeStored',buildingId:'b',x:2,y:3});
});

test('store is a valid offline editor command with no extra fields',()=>{
  const result=localCommand({type:'settlement',settlementId:'settlement_demo',command:{type:'store',buildingId:'house-1'}});
  assert.deepEqual(result.command,{type:'store',buildingId:'house-1'});
  assert.throws(()=>localCommand({type:'settlement',settlementId:'settlement_demo',command:{type:'store'}}),/INVALID_COMMAND/);
});
