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
