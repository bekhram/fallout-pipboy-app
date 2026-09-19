import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('personal map opens standalone offline settlements instead of campaign settlement flow',()=>{
  const map=read('src/components/map/MapScreen.jsx');
  assert.match(map,/<OfflineSettlementHub\b/);
  assert.doesNotMatch(map,/<CampaignPanel\b|worldOnly|signInWithGoogle|campaignRequest|Firestore/i);
  const hub=read('src/components/settlement/OfflineSettlementHub.jsx');
  assert.match(hub,/offlineSettlementStore/);
  assert.match(hub,/<SettlementScreen\b/);
  assert.doesNotMatch(hub,/from ['"][^'"]*(?:persistentCampaigns|googleAuth|campaignOffline|firebase|firestore)|campaignRequest\(|signInWithGoogle\(|fetch\(/i);
  const store=read('src/utils/offlineSettlementStore.js');
  assert.match(store,/indexedDB\.open\(DB_NAME,1\)/);
  assert.doesNotMatch(store,/fetch\(|campaignRequest|firebase|firestore/i);
});

test('persistent campaign world no longer creates or opens gameplay settlements',()=>{
  const world=read('src/components/campaign/CampaignWorldMap.jsx');
  assert.doesNotMatch(world,/type:'found'|type:"found"|type:'settlement'|type:"settlement"|<SettlementScreen\b|settlementCommand|PersonalConstructionPanel/);
  assert.doesNotMatch(world,/campaign-world-settlements|campaign-world-found/);
  assert.match(world,/<PhaserMapViewport\b/);
});

test('standalone settlement rendering cannot send cloud writes',()=>{
  for(const path of [
    'src/components/settlement/OfflineSettlementHub.jsx',
    'src/utils/offlineSettlementStore.js',
    'src/components/settlement/SettlementWorkerActor.js',
    'src/components/settlement/workerSpriteFrames.js',
  ]){
    assert.doesNotMatch(read(path),/from ['"][^'"]*(?:persistentCampaigns|googleAuth|campaignOffline|firebase|firestore)|campaignRequest\(|signInWithGoogle\(|\/api\/settlement-sync|fetch\(/i);
  }
});

test('bundled sprite is the pinned transparent legacy sheet and loads before actors',()=>{
  const png=readFileSync(new URL('src/assets/settlement/workers/pawn-blue.png',root));
  const hash=createHash('sha1').update(`blob ${png.length}\0`).update(png).digest('hex');
  assert.equal(hash,'da43dbc7b15cc9777800eaae7188584753cdb88a');
  assert.equal(png.readUInt32BE(16),1152);assert.equal(png.readUInt32BE(20),1152);assert.equal(png[25],6);
  const map=read('src/components/settlement/SettlementPhaserMap.jsx');
  assert.match(map,/load\.spritesheet\(WORKER_TEXTURE,pawnBlue/);
  assert.ok(map.indexOf('load.spritesheet')<map.indexOf('new SettlementResidents'));
});

test('retired campaign settlement sync remains isolated from the standalone local store',()=>{
  assert.equal(existsSync(new URL('src/utils/offlineSettlementStore.js',root)),true);
  function visit(url){
    for(const item of readdirSync(url,{withFileTypes:true})){
      const next=new URL(item.name+(item.isDirectory()?'/':''),url);
      if(item.isDirectory())visit(next);
      else if(/\.(js|jsx)$/.test(item.name)&&!next.pathname.endsWith('/offlineSettlementStore.js')){
        const source=readFileSync(next,'utf8');
        if(/persistentCampaigns|campaignOfflineController/.test(source)) assert.doesNotMatch(source,/from ['"][^'"]*offlineSettlementStore/);
      }
    }
  }
  visit(new URL('src/',root));
});
