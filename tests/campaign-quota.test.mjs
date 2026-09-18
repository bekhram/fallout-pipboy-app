import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignHandler } from '../api/campaigns.js';
import { createCampaignTransport } from '../src/cloud/campaignTransport.js';
test('Firestore code 8 becomes a sanitized retryable 503', async () => {
  const headers = {}; let status, body;
  const handler = createCampaignHandler(() => ({auth:{verifyIdToken:async()=>({uid:'u'})},db:{collection:()=>{throw Object.assign(new Error('backend detail'),{code:8});}}}));
  const log = console.error; console.error = () => {};
  try {
    await handler({method:'POST',headers:{authorization:'Bearer token'},body:{type:'list'}},{setHeader:(k,v)=>headers[k]=v,status:n=>{status=n;return{json:v=>body=v};}});
  } finally { console.error=log; }
  assert.equal(status,503); assert.equal(headers['Retry-After'],'300');
  assert.deepEqual(body,{error:'DATABASE_QUOTA_EXCEEDED',retryAfter:300});
  assert.ok(headers['X-Campaign-Trace']);
});
test('quota pauses all requests before auth and preserves mutation ID on manual retry', async () => {
  let time=1000, requests=0, sessions=0; const sent=[];
  const request = createCampaignTransport(async()=>{sessions++;return{firebase:{idToken:'token'}};},async(url,init)=>{
    requests++; sent.push(JSON.parse(init.body));
    return requests===1 ? new Response(JSON.stringify({error:'DATABASE_QUOTA_EXCEEDED'}),{status:503,headers:{'Retry-After':'300'}}) : new Response(JSON.stringify({ok:true}));
  },()=>time);
  const command={type:'settlement',requestId:'stable-id',campaignId:'c'};
  await assert.rejects(request(command),e=>e.status===503 && e.retryAfter===300);
  time+=299000;
  await assert.rejects(request({type:'tick'}),e=>e.status===503);
  assert.equal(requests,1); assert.equal(sessions,1);
  time+=1000;
  assert.deepEqual(await request(command),{ok:true});
  assert.equal(sent[0].requestId,sent[1].requestId);
});
