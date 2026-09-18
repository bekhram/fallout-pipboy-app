import React, {useEffect, useRef, useState} from 'react';
import {getCloudAuthSession, signInWithGoogle} from '../../cloud/googleAuth.js';
import {campaignRequest} from '../../cloud/persistentCampaigns.js';
import {campaignCopy} from './campaignCopy.js';
import './campaign.css';
import CampaignWorldMap from './CampaignWorldMap.jsx';

export default function CampaignPanel({language, session, form, onEnterSession}) {
  const c=campaignCopy(language);
  const [auth,setAuth]=useState(getCloudAuthSession), [campaigns,setCampaigns]=useState([]), [campaign,setCampaign]=useState(null);
  const [name,setName]=useState(''),[code,setCode]=useState(''),[invite,setInvite]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(null),[copied,setCopied]=useState(false);
  const lock=useRef(false), generation=useRef(0);
  const uid=auth?.firebase?.localId;
  const explain=e=>({INVITE_INVALID:c.expired,FORBIDDEN:c.forbidden,SIGN_IN_REQUIRED:c.signRequired,SERVER_NOT_CONFIGURED:c.configure,GM_OFFLINE:c.offline,SESSION_ALREADY_OPEN:c.active,SERVER_UNAVAILABLE:c.noNetwork}[e.message] || c.error);
  useEffect(()=>{const change=()=>{generation.current++;setAuth(getCloudAuthSession());setCampaign(null);setCampaigns([]);setInvite('');setRetry(null);setError('');setBusy(false);};window.addEventListener('pip2d20:cloud-auth-changed',change);return()=>{generation.current++;window.removeEventListener('pip2d20:cloud-auth-changed',change);};},[]);
  async function run(input) {
    if(lock.current)return;
    const command={requestId:crypto.randomUUID(),...input}; const gen=generation.current;
    lock.current=true;setBusy(true);setError('');
    try {
      const data=await campaignRequest(command);
      if(gen!==generation.current)return;
      if(data.campaigns)setCampaigns(data.campaigns);
      if(data.campaign){setCampaign(data.campaign);setCampaigns(list=>[...list.filter(x=>x.id!==data.campaign.id),data.campaign]);}
      if(data.invite){setInvite(data.invite);setCopied(false);}
      if(command.type==='revokeInvite')setInvite('');
      if(command.type==='create')setName('');
      if(command.type==='join')setCode('');
      setRetry(null);
    } catch(e){if(gen===generation.current){setError(explain(e));if(!e.status||e.status>=500)setRetry(command);else setRetry(null);}}
    finally {lock.current=false;if(gen===generation.current)setBusy(false);}
  }
  useEffect(()=>{
    if(!uid)return;
    let cancelled=false;setBusy(true);
    campaignRequest({type:'list'}).then(data=>{if(!cancelled)setCampaigns(data.campaigns||[]);}).catch(e=>{if(!cancelled){setError(explain(e));setRetry({type:'list'});}}).finally(()=>{if(!cancelled)setBusy(false);});
    return()=>{cancelled=true;};
  },[uid]);
  useEffect(()=>{
    if(!uid||!campaign?.id)return;
    let cancelled=false;
    const poll=async()=>{if(lock.current||document.hidden)return;try{const data=await campaignRequest({type:'worldRead',campaignId:campaign.id});if(!cancelled)setCampaign(old=>old?.id===data.campaign.id&&data.campaign.revision>=old.revision?data.campaign:old);}catch{/* Explicit refresh reports errors without clearing a pending action. */}};
    const timer=setInterval(poll,15000);return()=>{cancelled=true;clearInterval(timer);};
  },[uid,campaign?.id]);
  const gm=campaign?.ownerUid===uid;
  async function sessionAction(leave=false){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{
      if(leave){if(session.mode==='host'){const saved=await session.saveCloudCampaignNow();if(!saved?.ok){setError(c.saveFailed);return;}}session.exitSession();return;}
      const ok=gm?await session.startCampaignHost(campaign.id):await session.joinCampaignSession(campaign.id,form?.name||'Player');
      if(ok)onEnterSession?.();else setError(c.sessionFailed);
    }catch(e){setError(explain(e));}finally{lock.current=false;setBusy(false);}
  }
  const active=session?.mode && session.mode!=='lobby';
  return <section className="campaign-panel" aria-label={c.title}>
    <header className="campaign-heading"><div><h2>{c.title}</h2><p>{c.intro}</p></div>{uid&&<button className="pip-btn" disabled={busy||!!retry} onClick={()=>run(campaign?{type:'worldRead',campaignId:campaign.id}:{type:'list'})}>{c.refresh}</button>}</header>
    {error&&<div role="alert" className="session-error">{error}</div>}
    {retry&&<button className="pip-btn" disabled={busy} onClick={()=>run(retry)}>{c.retry}</button>}
    {!uid?<div className="pip-panel campaign-auth"><p>{c.auth}</p><button className="pip-btn is-primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await signInWithGoogle();}catch(e){setError(explain(e));}finally{setBusy(false);}}}>{c.signIn}</button></div>:<>
      {active&&<div className="pip-panel campaign-active"><p>{c.active}</p><div className="campaign-actions"><button className="pip-btn" onClick={onEnterSession}>{c.return}</button><button className="pip-btn" disabled={busy} onClick={()=>sessionAction(true)}>{session.mode==='host'?c.leave:c.leavePlayer}</button></div></div>}
      {!campaign?<>
        <div className="campaign-grid">
          <form className="pip-panel" onSubmit={e=>{e.preventDefault();if(name.trim())run({type:'create',name:name.trim()});}}><h3>{c.gm}</h3><label className="session-field"><span>{c.name}</span><input className="pip-input" required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="pip-btn is-primary" disabled={busy||!!retry||!name.trim()}>{busy?c.busy:c.create}</button></form>
          <form className="pip-panel" onSubmit={e=>{e.preventDefault();run({type:'join',invite:code.trim().toLowerCase()});}}><h3>{c.player}</h3><label className="session-field"><span>{c.inviteCode}</span><input className="pip-input" required pattern="[a-fA-F0-9]{48}" maxLength={48} value={code} autoCapitalize="none" autoComplete="off" spellCheck={false} onChange={e=>setCode(e.target.value.trim())}/></label><p>{c.hint}</p><button className="pip-btn is-primary" disabled={busy||!!retry||! /^[a-f0-9]{48}$/i.test(code)}>{c.join}</button></form>
        </div>
        <section className="pip-panel campaign-list"><h3>{c.list}</h3>{busy&&!campaigns.length?<p role="status">{c.loading}</p>:!campaigns.length?<p>{c.empty}</p>:campaigns.map(item=><button className="pip-btn campaign-row" key={item.id} disabled={busy||!!retry} onClick={()=>{setInvite('');run({type:'worldRead',campaignId:item.id});}}><span><strong>{item.name}</strong><small>{item.ownerUid===uid?c.gm:c.player}</small></span><span>{c.open} →</span></button>)}</section>
      </>:<section className="pip-panel campaign-detail">
        <button className="pip-btn" disabled={busy} onClick={()=>{setCampaign(null);setInvite('');setError('');}}>← {c.back}</button><h3>{campaign.name}</h3><p>{c.saved}</p>
        <button className="pip-btn is-primary" disabled={busy||!!retry||(!gm&&(!campaign.liveSession?.code||Date.now()-campaign.liveSession.updatedAt>90000))} onClick={()=>sessionAction()}>{gm?c.start:c.connect}</button>
        {!gm&&(!campaign.liveSession?.code||Date.now()-campaign.liveSession.updatedAt>90000)&&<p>{c.offline}</p>}
        <CampaignWorldMap key={campaign.id} campaignId={campaign.id} form={form} />
        <h4>{c.members} · {campaign.memberIds?.length||1}</h4><ul>{Object.entries(campaign.members||{}).filter(([,m])=>!m.revoked).map(([id,m])=><li key={id}>{m.name} <small>· {id===campaign.ownerUid?c.gm:c.player}</small></li>)}</ul>
        {gm&&<div className="campaign-invite"><div className="campaign-actions"><button className="pip-btn" disabled={busy||!!retry} onClick={()=>run({type:'invite',campaignId:campaign.id})}>{c.invite}</button>{campaign.hasInvite&&<button className="pip-btn" disabled={busy||!!retry} onClick={()=>run({type:'revokeInvite',campaignId:campaign.id})}>{c.revoke}</button>}</div><p>{c.inviteHint}</p>{invite&&<><label className="session-field"><span>{c.inviteCode}</span><input className="pip-input" readOnly value={invite} onFocus={e=>e.target.select()}/></label><button className="pip-btn" onClick={async()=>{try{await navigator.clipboard.writeText(invite);setCopied(true);}catch{setError(c.copyFailed);}}}>{copied?c.copied:c.copy}</button></>}</div>}
      </section>}
    </>}
  </section>;
}
