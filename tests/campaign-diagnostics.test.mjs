import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignDiagnostic } from '../server/campaignDiagnostics.js';
import { createCampaignHandler } from '../api/campaigns.js';
test('diagnostics classify failure without logging request contents or SDK secrets',()=>{
 const error=new Error('Cannot use undefined as a Firestore value. secret-character-value');error.code=3;
 const d=campaignDiagnostic(error,'tick','database-or-command');
 assert.equal(d.category,'firestore-undefined');assert.equal(d.errorCode,3);
 assert.ok(!JSON.stringify(d).includes('secret-character-value'));
 assert.equal(campaignDiagnostic(new Error('quota exhausted'),'secret-operation','services').operation,'unknown');
});
test('unexpected service errors return a trace header and sanitized server diagnostic',async()=>{
 const lines=[],headers={};let status,body;const old=console.error;
 console.error=(...args)=>lines.push(args);
 try{
  const handler=createCampaignHandler(()=>{const e=new Error('Credential private key SECRET');e.code='app/invalid-credential';throw e;});
  await handler({method:'POST',headers:{authorization:'Bearer SECRET_TOKEN'},body:{type:'list'}},{setHeader:(k,v)=>headers[k]=v,status:n=>{status=n;return{json:v=>body=v}},json:v=>body=v});
 }finally{console.error=old;}
 assert.equal(status,500);assert.equal(body.error,'SERVER_ERROR');assert.ok(headers['X-Campaign-Trace']);
 assert.equal(lines[0][1].category,'credentials');assert.equal(lines[0][1].stage,'services');
 assert.ok(!JSON.stringify(lines).includes('SECRET'));
});
