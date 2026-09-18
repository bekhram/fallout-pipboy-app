"""Real React setter + native IndexedDB. Synthetic campaign; never production."""
import json
import os
import pathlib
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright

root=pathlib.Path(__file__).resolve().parents[1]
with socket.socket() as s:
    s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}'
checks=[]
with tempfile.TemporaryDirectory() as profile, tempfile.TemporaryFile(mode='w+') as output:
    server=subprocess.Popen(['npm','run','dev','--','--host','127.0.0.1','--port',str(port),'--strictPort'],cwd=root,stdout=output,stderr=subprocess.STDOUT)
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(base,timeout=1);break
            except Exception:
                if server.poll() is not None: raise RuntimeError('Vite exited')
                time.sleep(.2)
        else: raise RuntimeError('Vite did not start')
        with sync_playwright() as p:
            options={'headless':True,'args':['--no-sandbox']}
            executable=os.environ.get('CHROME_BIN') or shutil.which('chromium')
            if executable:options['executable_path']=executable
            context=p.chromium.launch_persistent_context(profile,**options)
            page=context.new_page()
            def visit(tab):
                tab.goto(base+'/tests/fixtures/personal-store.html')
                tab.wait_for_function('window.testPersonal?.status.state === "saved"')
            def balance(value):
                page.wait_for_function('(n)=>Number(document.querySelector("#balance").textContent)===n',arg=value)
            visit(page);balance(100)
            page.evaluate('()=>{window.oldForm=structuredClone(testPersonal.form);window.oldSetter=testPersonal.setForm}')
            context.set_offline(True)
            page.evaluate('()=>testPersonal.queue("request_browser_first")');balance(60)
            r=page.evaluate('async()=>{const t=testPersonal,r=await t.store.get(t.uid,t.cid),c=await t.characters.get(t.sourceId);return {n:r.entries.length,held:r.sourceReserved.common,available:t.playerResources(c.form).common}}')
            assert r=={'n':1,'held':40,'available':60}
            checks.append('offline construction atomically reserves personal materials and persists the command')
            assert page.evaluate('()=>window.oldSetter(prev=>({...prev,inventoryItems:oldForm.inventoryItems}))') is None
            balance(60)
            checks.append('stale functional crafting closure cannot restore the reserved stack')
            assert page.evaluate('()=>testPersonal.setForm(prev=>testPersonal.debitPersonalResources(prev,{common:70}).character)') is None
            balance(60)
            checks.append('crafting cannot spend reserved resources')
            assert page.evaluate('()=>testPersonal.setForm(prev=>testPersonal.debitPersonalResources(prev,{common:10}).character)') is not None
            balance(50)
            checks.append('crafting can still use the available remainder')
            context.set_offline(False);page.reload();page.wait_for_function('window.testPersonal?.status.state === "saved"');balance(50)
            checks.append('reload restores both the spendable form and the pending payment')
            second=context.new_page();visit(second)
            page.evaluate('()=>{window.purchase=testPersonal.queue("request_browser_second",5,0).then(()=>true,e=>e.message)}')
            second.evaluate('()=>{window.purchase=testPersonal.queue("request_browser_third",0,5).then(()=>true,e=>e.message)}')
            outcomes=[page.evaluate('()=>window.purchase'),second.evaluate('()=>window.purchase')]
            assert outcomes.count(True)==1 and outcomes.count('PERSONAL_RESOURCES_INSUFFICIENT')==1
            balance(10)
            checks.append('two tabs cannot jointly overspend the remaining personal balance')
            n=page.evaluate('async()=>{const t=testPersonal;try{await t.store.change(t.uid,t.cid,r=>{r.entries=[];throw new Error("LOCAL_STORAGE_FULL")})}catch(e){}return (await t.store.get(t.uid,t.cid)).entries.length}')
            assert n==2
            balance(10)
            checks.append('aborted local transaction leaves both money and outbox intact')
            page.evaluate('()=>testPersonal.acknowledgeAll("rejected")');balance(90)
            page.evaluate('()=>testPersonal.store.change(testPersonal.uid,testPersonal.cid,r=>r)');balance(90)
            checks.append('authoritative rejection releases holds exactly once without undoing crafting')
            page.evaluate('()=>testPersonal.queue("request_browser_fourth",0,0)');balance(50)
            page.evaluate('()=>testPersonal.acknowledgeAll("accepted")');balance(50)
            r=page.evaluate('async()=>{const t=testPersonal,r=await t.store.get(t.uid,t.cid);return {n:r.entries.length,held:r.sourceReserved.common,buildings:r.snapshot.settlements[0].buildings.length}}')
            assert r=={'n':0,'held':0,'buildings':2}
            checks.append('accepted payment releases its hold without debiting the form twice')
            page.evaluate('()=>testPersonal.queue("request_browser_fifth",5,0)');balance(10)
            page.evaluate('()=>testPersonal.store.change(testPersonal.uid,testPersonal.cid,r=>testPersonal.protocol.prepareBatch(r,"batch_browser_saved"))')
            context.close()
            context=p.chromium.launch_persistent_context(profile,**options)
            page=context.new_page();visit(page);balance(10)
            r=page.evaluate('async()=>{const t=testPersonal,r=await t.store.get(t.uid,t.cid);return {held:r.sourceReserved.common,batch:r.inflight.requestId,n:r.entries.length}}')
            assert r=={'held':40,'batch':'batch_browser_saved','n':1}
            checks.append('full browser restart preserves the exact in-flight request and its reservation')
            assert page.evaluate('async()=>{const t=testPersonal;try{await t.store.linkSource("other_account",t.cid,t.sourceId);return false}catch(e){return e.message}}')=='PERSONAL_SOURCE_ALREADY_LINKED'
            balance(10)
            checks.append('another account cannot bind or consume this reserved character source')
            backup=json.loads(page.evaluate('()=>testPersonal.store.export(testPersonal.uid,testPersonal.cid)'))
            assert backup['character']['holds'] and backup['data']['inflight']['requestId']=='batch_browser_saved'
            assert 'idToken' not in json.dumps(backup)
            checks.append('backup includes available inventory, holds and immutable batch without credentials')
            # Exercise the real root hook's persistent event subscription AFTER
            # several reservation revisions; an initial-render setter is stale.
            page.evaluate('()=>testPersonal.setForm(prev=>({...prev,inventoryItems:[...prev.inventoryItems,{name:"Fixture food",category:"food",quantity:"2",sourceType:"other"}]}))')
            page.wait_for_function('testPersonal.form.inventoryItems.some(i=>i.name==="Fixture food") && testPersonal.status.state==="saved"')
            page.evaluate('()=>window.dispatchEvent(new CustomEvent(testPersonal.PIPBOY_USE_ITEM_EVENT,{detail:{index:testPersonal.form.inventoryItems.findIndex(i=>i.name==="Fixture food")}}))')
            page.wait_for_function('testPersonal.form.inventoryItems.find(i=>i.name==="Fixture food")?.quantity==="1"')
            balance(10)
            assert page.evaluate('async()=> (await testPersonal.store.get(testPersonal.uid,testPersonal.cid)).sourceReserved.common')==40
            checks.append('real character hook item-use listener stays current after reservation revisions')
            context.close()
    finally:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill()
        output.seek(0)
        if len(checks)<13:print(output.read())
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
