import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCampaignHandler} from '../api/campaigns.js';

function fixture(){
 const rows=new Map();
 const doc=(collection,id)=>({id,path:`${collection}/${id}`});
 const snapshot=ref=>({id:ref.id,exists:rows.has(ref.path),data:()=>structuredClone(rows.get(ref.path))});
 const db={
  collection(name){return {
   doc:id=>({...doc(name,id),get:async()=>snapshot(doc(name,id))}),
   where(_field,_op,uid){return {limit(){return {async get(){return {docs:[...rows].filter(([key,c])=>key.startsWith(`${name}/`)&&c.memberIds.includes(uid)).map(([key])=>snapshot(doc(name,key.split('/')[1])))};}};}};}
  };},
  async runTransaction(work){
   const writes=[];let hasWritten=false;
   const result=await work({get:async ref=>{assert.equal(hasWritten,false,'Firestore reads must precede writes');return snapshot(ref);},set:(ref,value)=>{hasWritten=true;writes.push(()=>rows.set(ref.path,structuredClone(value)));},delete:ref=>{hasWritten=true;writes.push(()=>rows.delete(ref.path));}});
   writes.forEach(write=>write());return result;
  }
 };
 const handler=createCampaignHandler(()=>({db,auth:{verifyIdToken:async token=>{if(token==='invalid')throw Error();return{uid:token,name:token};}}}));
 async function request(uid,body){let status=200,data;await handler({method:'POST',headers:uid?{authorization:`Bearer ${uid}`}:{},body:{requestId:randomUUID(),...body}},{setHeader(){},status(value){status=value;return this;},json(value){data=value;return this;}});return{status,...data};}
 return {request,rows};
}
test('permanent campaign survives listing; one-use invitation and idempotent retry',async()=>{
 const {request,rows}=fixture(),requestId=randomUUID();
 const created=await request('gm',{type:'create',name:'Vault group',requestId});assert.equal(created.status,200);
 const id=created.campaign.id;assert.match(id,/^campaign_[a-f0-9]{24}$/);
 assert.equal((await request('gm',{type:'create',name:'Vault group',requestId})).campaign.id,id);
 assert.equal((await request('gm',{type:'list'})).campaigns.length,1);
 assert.equal((await request('player',{type:'list'})).campaigns.length,0);
 const invite=await request('gm',{type:'invite',campaignId:id});assert.equal(invite.invite.length,48);assert.equal(invite.campaign.inviteHash,undefined);
 const joinId=randomUUID();const joined=await request('player',{type:'join',invite:invite.invite,requestId:joinId});assert.equal(joined.status,200);assert.equal(joined.campaign.members.player.role,'player');
 assert.equal((await request('player',{type:'list'})).campaigns[0].id,id);
 assert.equal((await request('player',{type:'join',invite:invite.invite,requestId:joinId})).duplicate,true);
 assert.equal((await request('other',{type:'join',invite:invite.invite})).error,'INVITE_INVALID');
 assert.equal(rows.get(`persistentCampaigns/${id}`).memberIds.length,2);
});
test('authentication, owner privileges, invitation expiry/revocation and private GM saves',async()=>{
 const {request,rows}=fixture();
 assert.equal((await request(null,{type:'list'})).status,401);assert.equal((await request('invalid',{type:'list'})).status,401);
 const id=(await request('gm',{type:'create',name:'Private'})).campaign.id;
 assert.equal((await request('stranger',{type:'tick',campaignId:id})).status,403);
 let invite=(await request('gm',{type:'invite',campaignId:id})).invite;
 await request('gm',{type:'revokeInvite',campaignId:id});assert.equal((await request('player',{type:'join',invite})).error,'INVITE_INVALID');
 invite=(await request('gm',{type:'invite',campaignId:id})).invite;
 for(const [key,value] of rows)if(key.startsWith('campaignInvites/'))value.expiresAt=0;
 assert.equal((await request('player',{type:'join',invite})).error,'INVITE_INVALID');
 invite=(await request('gm',{type:'invite',campaignId:id})).invite;await request('player',{type:'join',invite});
 assert.equal((await request('player',{type:'invite',campaignId:id})).status,403);
 assert.equal((await request('player',{type:'sessionPresence',campaignId:id,code:'ABC234'})).status,403);
 assert.equal((await request('gm',{type:'sessionPresence',campaignId:id,code:'ABC234'})).campaign.liveSession.code,'ABC234');
 assert.equal((await request('player',{type:'loadGmSession',campaignId:id})).status,403);
 const saved={state:{campaignId:id,revision:4},savedAt:new Date().toISOString()};
 assert.equal((await request('gm',{type:'saveGmSession',campaignId:id,snapshot:saved})).saved,true);
 assert.deepEqual((await request('gm',{type:'loadGmSession',campaignId:id})).snapshot,saved);
 assert.equal((await request('gm',{type:'saveGmSession',campaignId:id,snapshot:{state:{campaignId:id,revision:3}}})).error,'STALE_SESSION');
 await request('gm',{type:'revoke',campaignId:id,memberId:'player'});
 assert.equal((await request('player',{type:'list'})).campaigns.length,0);
 assert.equal((await request('player',{type:'tick',campaignId:id})).status,403);
});

test('shared world founding, construction and permissions survive member refresh and retries', async () => {
 const {request}=fixture();
 const id=(await request('gm',{type:'create',name:'Shared world'})).campaign.id;
 const invite=(await request('gm',{type:'invite',campaignId:id})).invite;
 await request('player',{type:'join',invite});
 assert.equal((await request('player',{type:'worldRegion',campaignId:id,regionId:'mojave'})).status,403);
 await request('gm',{type:'worldRegion',campaignId:id,regionId:'mojave'});
 await request('player',{type:'worldMove',campaignId:id,regionId:'mojave',x:12,y:20});
 assert.equal((await request('gm',{type:'worldRead',campaignId:id})).campaign.worldMap.positions.player.x,12);
 const requestId=randomUUID();
 const found={type:'found',campaignId:id,name:'New outpost',regionId:'mojave',worldX:12,worldY:20,requestId};
 const settlementId=(await request('gm',found)).campaign.settlements[0].id;
 assert.equal((await request('gm',found)).campaign.settlements.length,1);
 assert.equal((await request('player',{type:'worldRead',campaignId:id})).campaign.settlements[0].id,settlementId);
 const command={type:'build',buildingType:'small_house',x:0,y:0};
 assert.equal((await request('gm',{type:'settlement',campaignId:id,settlementId,command})).error,'CHARACTER_NOT_APPROVED');
 await request('gm',{type:'submitCharacter',campaignId:id,character:{name:'Builder',skills:{Repair:{rank:2}}}});
 await request('gm',{type:'approveCharacter',campaignId:id,memberId:'gm'});
 const build={type:'settlement',campaignId:id,settlementId,command,requestId:randomUUID()};
 const built=await request('gm',build);assert.equal(built.status,200,JSON.stringify(built));
 const resources=built.campaign.settlements[0].resources;
 const repeated=await request('gm',build);assert.equal(repeated.duplicate,true);
 assert.deepEqual(repeated.campaign.settlements[0].resources,resources);
 const refreshed=(await request('player',{type:'worldRead',campaignId:id})).campaign.settlements[0];
 assert.equal(refreshed.buildings.filter(b=>b.type==='small_house').length,1);
 const buildingId=refreshed.buildings.find(b=>b.type==='small_house').id;
 const move={type:'settlement',campaignId:id,settlementId,command:{type:'move',buildingId,x:4,y:0}};
 assert.equal((await request('player',move)).status,403);
 await request('gm',{type:'settlement',campaignId:id,settlementId,command:{type:'spender',memberId:'player',allowed:true}});
 assert.equal((await request('player',move)).status,200);
 assert.equal((await request('gm',{type:'worldRead',campaignId:id})).campaign.settlements[0].buildings.find(b=>b.id===buildingId).x,4);
 assert.equal((await request('stranger',{type:'worldRead',campaignId:id})).status,403);
});

test('only the owner can delete a campaign; deletion removes its save and invitation', async () => {
 const {request,rows}=fixture();
 const id=(await request('gm',{type:'create',name:'Delete me'})).campaign.id;
 const other=(await request('gm',{type:'create',name:'Keep me'})).campaign.id;
 const invite=(await request('gm',{type:'invite',campaignId:id})).invite;
 await request('player',{type:'join',invite});
 const remainingInvite=(await request('gm',{type:'invite',campaignId:id})).invite;
 await request('gm',{type:'saveGmSession',campaignId:id,snapshot:{state:{campaignId:id,revision:1}}});
 for(const uid of ['player','stranger']) {
  assert.equal((await request(uid,{type:'delete',campaignId:id})).status,403);
  assert.equal(rows.has(`persistentCampaigns/${id}`),true);
 }
 const command={type:'delete',campaignId:id,requestId:randomUUID()};
 const deleted=await request('gm',command);
 assert.equal(deleted.status,200);assert.equal(deleted.deleted,true);assert.equal(deleted.campaignId,id);
 assert.equal(rows.has(`persistentCampaigns/${id}`),false);
 assert.equal(rows.has(`campaignGmSaves/${id}`),false);
 assert.equal([...rows].some(([key,value])=>key.startsWith('campaignInvites/')&&value.campaignId===id),false);
 assert.equal(rows.has(`persistentCampaigns/${other}`),true);
 assert.equal((await request('gm',command)).duplicate,true);
 assert.equal((await request('player',{...command})).status,403);
 assert.equal((await request('gm',{...command,campaignId:other})).error,'REQUEST_ID_REUSED');
 assert.equal((await request('player',{type:'list'})).campaigns.length,0);
 assert.equal((await request('gm',{type:'list'})).campaigns[0].id,other);
 assert.equal((await request('new-player',{type:'join',invite:remainingInvite})).error,'INVITE_INVALID');
 for(const type of ['tick','worldRead','sessionPresence','saveGmSession']) {
  assert.equal((await request('gm',{type,campaignId:id,code:'ABC123',snapshot:{state:{campaignId:id,revision:2}}})).status,403);
 }
 assert.equal(rows.has(`persistentCampaigns/${id}`),false);
});
