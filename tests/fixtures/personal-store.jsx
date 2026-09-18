import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { campaignLocalStore as store, localCharacterStore as characters } from '../../src/cloud/campaignLocalStore.js';
import { useDurableCharacterState } from '../../src/hooks/useDurableCharacterState.js';
import * as protocol from '../../src/cloud/settlementOfflineProtocol.js';
import { applyOfflineCommand as apply } from '../../src/utils/settlementOfflineApply.js';
import { playerResources } from '../../src/utils/settlementDevelopment.js';
import { debitPersonalResources } from '../../src/utils/personalResources.js';
import { campaignCommand, publicCampaign } from '../../server/campaignState.js';
import { personalFixture, personalBuild, personalUid as uid, personalCampaignId as cid, sourceId, deviceId } from './personalFixture.js';
const seed = personalFixture();
await characters.load(seed.form);
if (!await store.get(uid,cid)) {
  await store.change(uid,cid,() => ({...seed.record,sourceCharacterId:null}));
  await store.linkSource(uid,cid,sourceId);
}
const queue = (id, x=0,y=0) => store.change(uid,cid,r => protocol.enqueue(r,personalBuild(seed.s,'small_house',x,y),id,Date.now(),apply));
async function acknowledgeAll(state) {
  await store.change(uid,cid,r=>protocol.prepareBatch(r,crypto.randomUUID()));
  const r=await store.get(uid,cid), b=r.inflight;
  // An explicit fake server; no credentials or live Firestore data used.
  let c={...r.snapshot,accounts:{[uid]:r.snapshot.character},proposals:{}};delete c.character;
  if(state==='accepted')for(const op of b.entries)c=campaignCommand(c,uid,{...op.command,requestId:op.requestId,deviceId},Date.now());
  const response={protocol:1,requestId:b.requestId,deviceId,through:b.entries.at(-1).sequence,campaign:publicCampaign(c,uid),results:b.entries.map(op=>({sequence:op.sequence,requestId:op.requestId,state,...(state==='rejected'?{error:'COMMAND_CONFLICT'}:{})}))};
  return store.change(uid,cid,latest=>protocol.acknowledge(latest,response,Date.now()));
}
function App() {
  const [form,setForm,status]=useDurableCharacterState(()=>seed.form);
  useEffect(()=>{window.testPersonal={store,characters,protocol,apply,uid,cid,sourceId,deviceId,form,setForm,status,queue,acknowledgeAll,playerResources,debitPersonalResources,seed};},[form,setForm,status]);
  return <main><h1>Personal construction test</h1><output id="balance">{playerResources(form).common}</output><output id="revision">{form._localRevision}</output><output id="save-status">{status.state}</output><output id="save-error">{status.error}</output></main>;
}
createRoot(document.getElementById('fixture-root')).render(<React.StrictMode><App/></React.StrictMode>);
