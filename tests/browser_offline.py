"""Native IndexedDB checks in Chromium. Does not authenticate against production.
Without --base-url serves the repository with a local static HTTP server.
"""
import argparse
import functools
import http.server
import json
import os
import pathlib
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
server = None
if args.base_url:
    base = args.base_url.rstrip('/')
else:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
url = base + '/tests/fixtures/offline-store.html'
checks = []
with tempfile.TemporaryDirectory() as profile, sync_playwright() as p:
    launch = {'headless': True, 'args': ['--no-sandbox']}
    executable = os.environ.get('CHROME_BIN') or shutil.which('chromium')
    if executable:
        launch['executable_path'] = executable
    context = p.chromium.launch_persistent_context(profile, **launch)
    page = context.new_page()
    page.goto(url)
    page.wait_for_function('!!window.testOffline')
    page.evaluate('''async () => {
      const {store, uid, campaignId, campaign, protocol, action, apply} = testOffline;
      await store.remember(uid, campaign());
      await store.change(uid, campaignId, r => protocol.enqueue(r, action(), crypto.randomUUID(), Date.now(), apply));
    }''')
    page.reload(); page.wait_for_function('!!window.testOffline')
    assert page.evaluate('async()=> (await testOffline.store.get(testOffline.uid,testOffline.campaignId)).entries.length') == 1
    checks.append('native IndexedDB survives page reload')
    second = context.new_page(); second.goto(url); second.wait_for_function('!!window.testOffline')
    # Start concurrent loops in separate tabs; all appends must be serialized by IDB.
    script = '''async (prefix) => {
      const {store,uid,campaignId,protocol,action,apply} = testOffline;
      window.appending = (async()=> {for(let i=0;i<30;i++) await store.change(uid,campaignId,r=>protocol.enqueue(r,action('worker_2',i%2?'guard':'build'),crypto.randomUUID(),Date.now(),apply));})();
      return true;
    }'''
    page.evaluate(script, 'first'); second.evaluate(script, 'second')
    page.evaluate('async()=>await window.appending'); second.evaluate('async()=>await window.appending')
    result = page.evaluate('''async()=>{const r=await testOffline.store.get(testOffline.uid,testOffline.campaignId);return {n:r.entries.length,next:r.nextSequence,sequences:r.entries.map(x=>x.sequence)}}''')
    assert result['n'] == 61 and result['next'] == 62 and result['sequences'] == list(range(1,62))
    checks.append('two tabs preserve all 60 concurrent appends with contiguous sequences')
    page.evaluate('''async()=>{const t=testOffline;await t.store.change(t.uid,t.campaignId,r=>t.protocol.prepareBatch(r,crypto.randomUUID()));}''')
    # Append after the immutable first batch has been frozen, then acknowledge it.
    second.evaluate('''async()=>{const t=testOffline;await t.store.change(t.uid,t.campaignId,r=>t.protocol.enqueue(r,t.action('worker_1','build'),crypto.randomUUID(),Date.now(),t.apply));}''')
    page.evaluate('''async()=>{const t=testOffline;const r=await t.store.get(t.uid,t.campaignId),b=r.inflight;
      let c=structuredClone(r.snapshot);for(const op of b.entries)c=t.apply(c,t.uid,op.command);c.revision++;
      const response={protocol:1,requestId:b.requestId,deviceId:b.deviceId,campaign:c,through:b.entries.at(-1).sequence,results:b.entries.map(o=>({requestId:o.requestId,sequence:o.sequence,state:'accepted'}))};
      await t.store.change(t.uid,t.campaignId,latest=>t.protocol.acknowledge(latest,response,Date.now()));}''')
    assert page.evaluate('async()=> (await testOffline.store.get(testOffline.uid,testOffline.campaignId)).entries.length') == 30
    checks.append('atomic acknowledgement retains commands appended while a batch was in flight')
    result = page.evaluate('''async()=>{const t=testOffline;try{await t.store.change(t.uid,t.campaignId,r=>{r.entries=[];throw new Error('LOCAL_STORAGE_FULL');});return false;}catch(e){return e.message;}}''')
    assert result == 'LOCAL_STORAGE_FULL'
    assert page.evaluate('async()=> (await testOffline.store.get(testOffline.uid,testOffline.campaignId)).entries.length') == 30
    checks.append('transaction abort never persists a partial queue mutation')
    assert page.evaluate('async()=> await testOffline.store.get("other_account",testOffline.campaignId)') is None
    assert page.evaluate('async()=> await testOffline.store.list("other_account")') is None
    checks.append('account/campaign keys isolate cached snapshots and lists')
    context.set_offline(True)
    page.evaluate('''async()=>{const t=testOffline;await t.store.change(t.uid,t.campaignId,r=>t.protocol.enqueue(r,t.action('worker_2','guard'),crypto.randomUUID(),Date.now(),t.apply));}''')
    assert page.evaluate('async()=> (await testOffline.store.get(testOffline.uid,testOffline.campaignId)).entries.length') == 31
    checks.append('new orders are durable with network disabled')
    context.set_offline(False)
    backup = json.loads(page.evaluate('async()=> await testOffline.store.export(testOffline.uid,testOffline.campaignId)'))
    assert backup['data']['entries'] and 'lease' not in backup['data'] and 'idToken' not in json.dumps(backup)
    checks.append('backup preserves pending work without credentials or transient leases')
    context.close()
    context = p.chromium.launch_persistent_context(profile, **launch)
    page = context.new_page(); page.goto(url); page.wait_for_function('!!window.testOffline')
    assert page.evaluate('async()=> (await testOffline.store.get(testOffline.uid,testOffline.campaignId)).entries.length') == 31
    checks.append('queue survives full browser shutdown and restart in persistent profile')
    page.evaluate('''async()=>{const t=testOffline;await t.store.block(t.uid,t.campaignId);}''')
    result = page.evaluate('''async()=>{const t=testOffline,r=await t.store.get(t.uid,t.campaignId);return {blocked:r.blocked,snapshot:r.snapshot,pending:r.entries.length,visible:t.protocol.projectRecord(r,t.apply).campaign};}''')
    assert result == {'blocked': True, 'snapshot': None, 'pending':31, 'visible':None}
    checks.append('confirmed access denial hides snapshot while preserving pending journal')
    context.close()
if server:
    server.shutdown()
print(json.dumps({'passed':len(checks),'checks':checks}, ensure_ascii=False, indent=2))
