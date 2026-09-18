import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../',import.meta.url);
const read = path => readFileSync(new URL(path,root),'utf8');

test('personal map opens the existing campaign flow, not a second settlement store',()=>{
  const map=read('src/components/map/MapScreen.jsx');
  assert.match(map,/<CampaignPanel\b[^>]*\bworldOnly\b/);
  assert.doesNotMatch(map,/useSettlementStorage|createSettlement|onUpdate=|<SettlementScreen\b/);
  assert.equal(existsSync(new URL('src/hooks/useSettlementStorage.js',root)),false);
});
test('no runtime module still imports the retired local store',()=>{
  function visit(url){for(const item of readdirSync(url,{withFileTypes:true})){
    const next=new URL(item.name+(item.isDirectory()?'/':''),url);
    if(item.isDirectory())visit(next);
    else if(/\.(js|jsx|ts|tsx)$/.test(item.name))assert.doesNotMatch(readFileSync(next,'utf8'),/(?:from\s*|import\s*\()["'][^"']*useSettlementStorage/);
  }}
  for(const dir of ['src/','server/','api/'])if(existsSync(new URL(dir,root)))visit(new URL(dir,root));
});
test('shared entry retains command permissions and disables duplicate lobby polling',()=>{
  const panel=read('src/components/campaign/CampaignPanel.jsx');
  assert.match(panel,/worldOnly\s*=\s*false/);
  assert.match(panel,/if\(worldOnly\|\|!uid\|\|!campaign\?\.id\)return/);
  assert.match(panel,/!worldOnly&&gm&&<div className="campaign-delete"/);
  const world=read('src/components/campaign/CampaignWorldMap.jsx');
  assert.match(world,/canEdit=\{Boolean\(editable\)&&!disabled\}/);
  assert.match(world,/if\(disabled\|\|!editable\)return false/);
  assert.match(world,/onCommand=/);
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
test('sprite rendering cannot send campaign writes or alter storage',()=>{
  for(const path of ['src/components/settlement/SettlementWorkerActor.js','src/components/settlement/workerSpriteFrames.js']){
    assert.doesNotMatch(read(path),/campaignRequest|onCommand|localStorage|setInterval|fetch\(/);
  }
});
