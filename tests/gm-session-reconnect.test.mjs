import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/hooks/useGmAuthoritativeSessionV15.js', import.meta.url), 'utf8');
const resumeCode = source.slice(source.indexOf('  const resumeCurrentRole ='), source.indexOf('  const ensureSocket ='));
function fixture({role = 'host', error = 'ROOM_NOT_FOUND'} = {}) {
  const calls = [], saved = [], state = { scenes: [{ sceneId: 'existing-map' }] };
  const context = {
    socketRef: {current: {connected: true}}, leavingRef: {current: false},
    sessionEpochRef: {current: 0},
    resumeInFlightRef: {current: null}, modeRef: {current: role},
    codeRef: {current: 'OLD123'}, clientIdRef: {current: 'client'},
    nameRef: {current: 'GM'}, gmSecretRef: {current: 'old-secret'},
    campaignIdRef: {current: 'campaign-original'}, gmStateRef: {current: state},
    knownPresenceRef: {current: new Set(['old-player'])},
    setStatus() {}, setError() {}, setSessionCode() {}, applyPresence() {},
    socketError: error => error, normalizeSessionCode: code => code,
    rememberSession: value => saved.push(value), publishManifest: async () => calls.push('manifest'),
    emitAck: async (event, payload) => {
      calls.push({event, payload});
      return event === 'room:create'
        ? {ok: true, roomCode: 'NEW123', gmSecret: 'new-secret'}
        : {ok: false, error};
    },
  };
  const resume = vm.runInNewContext(`${resumeCode}\nresumeCurrentRole;`, context);
  return {context, calls, saved, resume, state};
}
test('GM recreates expired relay room while retaining campaign and new resume credentials', async () => {
  const f = fixture();
  assert.equal(await f.resume(), true);
  assert.deepEqual(f.calls.filter(c => c.event).map(c => c.event), ['room:resume-gm', 'room:create']);
  assert.equal(f.calls[1].payload.campaignId, 'campaign-original');
  assert.equal(f.context.gmStateRef.current, f.state);
  assert.equal(f.saved[0].code, 'NEW123');
  assert.equal(f.saved[0].gmSecret, 'new-secret');
  assert.equal(f.calls.at(-1), 'manifest');
});
test('simultaneous automatic and manual reconnect share one recovery', async () => {
  const f = fixture();
  const first = f.resume(), second = f.resume();
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(f.calls.filter(c => c.event === 'room:create').length, 1);
});
for (const error of ['INVALID_GM_SECRET', 'FORBIDDEN', 'NETWORK_ERROR', 'ACK_TIMEOUT']) {
  test(`GM recovery does not replace a room on ${error}`, async () => {
    const f = fixture({error});
    assert.equal(await f.resume(), false);
    assert.equal(f.calls.length, 1);
    assert.equal(f.saved.length, 0);
  });
}
test('player cannot recreate a missing GM room', async () => {
  const f = fixture({role: 'player'});
  assert.equal(await f.resume(), false);
  assert.equal(f.calls[0].event, 'room:join');
  assert.equal(f.calls.length, 1);
});

test('late resume acknowledgement after leaving cannot reopen or recreate a room', async () => {
  const f = fixture();
  let finish;
  f.context.emitAck = () => new Promise(resolve => { finish = resolve; });
  const pending = f.resume();
  f.context.sessionEpochRef.current++;
  f.context.leavingRef.current = true;
  finish({ok: false, error: 'ROOM_NOT_FOUND'});
  assert.equal(await pending, false);
  assert.equal(f.saved.length, 0);
  assert.equal(f.calls.length, 0);
});

test('explicit exit persists opt-out, blocks automatic restore, and allows manual return', async () => {
  const memory = new Map();
  let disconnected = false, connects = 0;
  const context = {
    LAST_SESSION_RESUME_KEY: 'last', SESSION_CODE_LENGTH: 6,
    normalizeSessionCode: value => String(value || '').toUpperCase(),
    localStorage: {getItem: key => memory.get(key), setItem: (key,value) => memory.set(key,value)},
    lastSession: {code:'ABC123',role:'player',name:'Player'},
    sessionEpochRef:{current:0},resumeInFlightRef:{current:null},leavingRef:{current:false},
    socketRef:{current:{connected:true,emit(){},disconnect(){disconnected=true;}}},
    modeRef:{current:'player'},codeRef:{current:'ABC123'},gmSecretRef:{current:''},
    campaignIdRef:{current:'campaign-original'},gmStateRef:{current:{}},knownPresenceRef:{current:new Set()},nameRef:{current:''},
    setMode(){},setStatus(){},setError(){},setSessionCode(){},setPresenceState(){},setMirroredState(){},setCampaignId(){},setSyncState(){},
    waitForConnection: async()=>{connects++;return true;}, resumeCurrentRole: async()=>true,
  };
  const storage = source.slice(source.indexOf('function readLastSession()'),source.indexOf('function getClientId()'));
  const restore = source.slice(source.indexOf('  const resumeLastSession ='),source.indexOf('  const forgetCampaign ='));
  const api = vm.runInNewContext(`${storage}\nconst rememberSession = value => { lastSession = writeLastSession(value); };\n${restore}\n({exitSession,resumeLastSession,readLastSession});`, context);
  api.exitSession();
  assert.equal(disconnected,true);
  assert.equal(context.modeRef.current,'lobby');
  assert.equal(context.campaignIdRef.current,'');
  assert.equal(api.readLastSession().autoResume,false);
  assert.equal(await api.resumeLastSession({automatic:true}),false);
  assert.equal(connects,0);
  assert.equal(await api.resumeLastSession(),true);
  assert.equal(connects,1);
  assert.equal(api.readLastSession().autoResume,true);
});
