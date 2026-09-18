import test from 'node:test';
import assert from 'node:assert/strict';
import { readLegacySettlementArchive, LEGACY_SETTLEMENT_KEY } from '../src/utils/legacySettlementArchive.js';
function storage(raw) { return { getItem(key) { assert.equal(key,LEGACY_SETTLEMENT_KEY);return raw; }, setItem(){throw Error('must never write');}, removeItem(){throw Error('must never delete');} }; }
test('old progress is preserved byte-for-byte, with no automatic resource import',()=>{
  const raw=' [ {"id":"old","resources":{"caps":1234}} ]\n';
  assert.deepEqual(readLegacySettlementArchive(storage(raw)),{raw,count:1});
});
test('damaged legacy records remain exportable without modification',()=>{
  assert.deepEqual(readLegacySettlementArchive(storage('{broken')),{raw:'{broken',count:null});
});
test('empty and unavailable storage do not block the shared game',()=>{
  assert.equal(readLegacySettlementArchive(storage(null)),null);
  assert.equal(readLegacySettlementArchive(storage('[]')),null);
  assert.equal(readLegacySettlementArchive({getItem(){throw Error('blocked');}}),null);
  assert.equal(readLegacySettlementArchive(),null);
});
