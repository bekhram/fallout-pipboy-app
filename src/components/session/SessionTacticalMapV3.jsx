import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TacticalEnvironmentSummary } from "../gm/TacticalEnvironmentPanel.jsx";
import "../gm/gmSessionMap.css";
import "../gm/sceneLibrary.css";
import "../gm/gmTokenStatusLayer.css";

function tokenSize(token){return Number(token?.size)===2?2:1;}
function dismissedKey(campaignId,sceneId){return `pip2d20-tactical-dismissed-${String(campaignId||"campaign")}-${String(sceneId||"scene")}`;}
function playerFor(token,players){const id=String(token?.ownerClientId||"");return (players||[]).find((p)=>String(p?.clientId||p?.peerId||"")===id)||null;}
function hpFor(token,players){if(token?.kind==="player"){const p=playerFor(token,players);return{hp:Math.max(0,Number(p?.character?.currentHp??token?.stats?.hp??0)),maxHp:Math.max(0,Number(p?.character?.maxHp??token?.stats?.maxHp??0))};}return{hp:Math.max(0,Number(token?.stats?.hp??0)),maxHp:Math.max(0,Number(token?.stats?.maxHp??0))};}

export default function SessionTacticalMapV3({session}){
  const scene=session?.tacticalScene||null;
  const [open,setOpen]=useState(false);
  const [selectedTokenId,setSelectedTokenId]=useState("");
  const [dragState,setDragState]=useState(null);
  const [error,setError]=useState("");
  const gridRef=useRef(null);
  const dragRef=useRef(null);
  const lastSceneIdRef=useRef("");

  const tokens=Array.isArray(scene?.tokens)?scene.tokens:[];
  const ownedTokens=useMemo(()=>tokens.filter((token)=>String(token?.ownerClientId||"")===String(session?.clientId||"")),[tokens,session?.clientId]);
  const selectedToken=ownedTokens.find((token)=>token.id===selectedTokenId)||ownedTokens[0]||null;

  useEffect(()=>{
    if(!ownedTokens.length){setSelectedTokenId("");return;}
    if(!ownedTokens.some((token)=>token.id===selectedTokenId)) setSelectedTokenId(ownedTokens[0].id);
  },[ownedTokens,selectedTokenId]);

  useEffect(()=>{
    if(!scene?.active){setOpen(false);setDragState(null);dragRef.current=null;lastSceneIdRef.current="";return;}
    const id=String(scene.sceneId||"scene");
    if(lastSceneIdRef.current===id)return;
    lastSceneIdRef.current=id;
    let dismissed="";try{dismissed=sessionStorage.getItem(dismissedKey(session?.campaignId,id))||"";}catch{/*noop*/}
    if(dismissed!=="1")setOpen(true);
  },[scene?.active,scene?.sceneId,session?.campaignId]);

  if(!session?.isActive||session?.mode!=="player"||!scene?.active)return null;

  const cols=Number(scene.cols||12),rows=Number(scene.rows||12);
  const canMove=Boolean(selectedToken&&session.status==="online");
  const showError=(response)=>{if(response?.ok===false)setError(response.error||"MOVE_FAILED");else setError("");};

  const close=()=>{setOpen(false);try{sessionStorage.setItem(dismissedKey(session?.campaignId,scene.sceneId),"1");}catch{/*noop*/}};
  const moveTo=async(x,y)=>{if(!canMove||!selectedToken)return;showError(await session.moveToken?.(selectedToken.id,x,y));};

  const beginDrag=(event,token)=>{
    if(!ownedTokens.some((item)=>item.id===token.id)||(event.pointerType==="mouse"&&event.button!==0))return;
    setSelectedTokenId(token.id);
    const rect=event.currentTarget.getBoundingClientRect(),size=tokenSize(token);
    const anchorX=Math.max(0,Math.min(size-1,Math.floor(((event.clientX-rect.left)/Math.max(1,rect.width))*size)));
    const anchorY=Math.max(0,Math.min(size-1,Math.floor(((event.clientY-rect.top)/Math.max(1,rect.height))*size)));
    dragRef.current={tokenId:token.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,anchorX,anchorY,moved:false};
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({tokenId:token.id,x:event.clientX,y:event.clientY,avatar:token.avatar||"",name:token.name||"",size,moved:false});
    event.stopPropagation();
  };
  const moveDrag=(event)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;drag.moved=drag.moved||Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5;if(drag.moved)event.preventDefault();setDragState((v)=>v?{...v,x:event.clientX,y:event.clientY,moved:drag.moved}:v);};
  const finishDrag=async(event)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;dragRef.current=null;setDragState(null);event.stopPropagation();if(!drag.moved){setSelectedTokenId(drag.tokenId);return;}const rect=gridRef.current?.getBoundingClientRect();const token=ownedTokens.find((item)=>item.id===drag.tokenId);if(!rect||!token)return;const x=Math.floor(((event.clientX-rect.left)/Math.max(1,rect.width))*cols)-drag.anchorX;const y=Math.floor(((event.clientY-rect.top)/Math.max(1,rect.height))*rows)-drag.anchorY;showError(await session.moveToken?.(token.id,x,y));};

  const startSet=new Set((scene.startZone||[]).map((cell)=>`${cell.x}:${cell.y}`));
  const cells=[];
  for(let y=0;y<rows;y+=1){for(let x=0;x<cols;x+=1){const anchored=tokens.filter((token)=>Number(token.x)===x&&Number(token.y)===y);cells.push(<button type="button" key={`${x}:${y}`} className={`gm-session-map__cell tactical-cell${startSet.has(`${x}:${y}`)?" is-start-zone":""}`} onClick={()=>moveTo(x,y)}>{anchored.length?<span className="gm-session-map__tokens">{anchored.map((token)=>{const owned=ownedTokens.some((item)=>item.id===token.id),selected=selectedToken?.id===token.id,size=tokenSize(token),hp=hpFor(token,session.players||[]),down=hp.maxHp>0&&hp.hp<=0,percent=hp.maxHp>0?Math.max(0,Math.min(100,hp.hp/hp.maxHp*100)):0;return <span key={token.id} className={`gm-session-token ${token.kind==="player"?"is-player":"is-npc is-enemy"} is-size-${size}${owned?" is-own":""}${selected?" is-selected":""}${dragState?.tokenId===token.id?" is-dragging":""}`} onPointerDown={owned?(event)=>beginDrag(event,token):undefined} onPointerMove={owned?moveDrag:undefined} onPointerUp={owned?finishDrag:undefined} onPointerCancel={owned?finishDrag:undefined} onClick={(event)=>{if(owned){event.stopPropagation();setSelectedTokenId(token.id);}}}>{token.kind==="player"&&hp.maxHp>0?<span className="gm-token-status-hp"><span style={{width:`${percent}%`}}/><b>{Math.round(hp.hp)}/{Math.round(hp.maxHp)}</b></span>:null}{down?<span className="gm-token-zero-marker"/>:null}{token.avatar?<img src={token.avatar} alt=""/>:<b>{String(token.name||"T").slice(0,1).toUpperCase()}</b>}<small>{token.name}</small></span>;})}</span>:null}</button>);}}

  const overlay=open?<div className="session-tactical-overlay"><section className="pip-panel session-tactical-player"><header className="session-tactical-player__head"><div><div className="pip-bootline">PIP 2D20 // {scene.name||"TACTICAL"}</div><h2>[ TACTICAL MAP ]</h2></div><div className="session-tactical-player__actions"><span className="tactical-live">{session.status==="online"?"LIVE":"CONNECTING"}</span><button type="button" className="pip-btn" onClick={close}>BACK TO PLAYER</button></div></header>
    <TacticalEnvironmentSummary scene={scene}/>
    <div className="tactical-player-token-setup tactical-player-token-setup-v2">
      <div className="tactical-owned-token-picker">{ownedTokens.map((token)=><button type="button" key={token.id} className={`pip-btn${selectedToken?.id===token.id?" is-primary":""}`} onClick={()=>setSelectedTokenId(token.id)}>{token.avatar?<img src={token.avatar} alt=""/>:null}<span>{token.name}</span></button>)}</div>
    </div>
    <div className="gm-session-map__hint">{selectedToken?`CONTROL: ${selectedToken.name} · drag token or select destination cell`:"WAITING FOR GM TOKEN CONTROL"}</div>{error?<div className="session-error">{error}</div>:null}
    <div ref={gridRef} className={`gm-session-map__grid tactical-grid${scene.backgroundUrl?" has-background":""}${dragState?.moved?" is-drag-active":""}`} style={{gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`,gridTemplateRows:`repeat(${rows}, minmax(0,1fr))`,backgroundImage:scene.backgroundUrl?`url(${JSON.stringify(scene.backgroundUrl)})`:undefined}}>{cells}</div>
  </section>{dragState?.moved?<div className={`tactical-drag-ghost${dragState.size===2?" is-size-2":""}`} style={{left:dragState.x,top:dragState.y}}>{dragState.avatar?<img src={dragState.avatar} alt=""/>:<b>{String(dragState.name||"T").slice(0,1)}</b>}</div>:null}</div>:null;

  return <><button type="button" className="session-tactical-toggle is-live" onClick={()=>setOpen(true)}><span className="session-status-dot is-online"/><strong>BATTLEMAP</strong></button>{overlay&&typeof document!=="undefined"?createPortal(overlay,document.body):overlay}</>;
}
