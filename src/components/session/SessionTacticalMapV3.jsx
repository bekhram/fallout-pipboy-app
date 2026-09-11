import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TacticalEnvironmentSummary } from "../gm/TacticalEnvironmentPanel.jsx";
import { WastelandAssetLayer } from "../gm/WastelandAssetPortal.jsx";
import TacticalSessionHud from "./TacticalSessionHud.jsx";
import "../gm/gmSessionMap.css";
import "../gm/sceneLibrary.css";
import "../gm/gmTokenStatusLayer.css";

function tokenSize(token){const n=Number(token?.stats?.footprint||token?.size);return n===3?3:n===2?2:1;}
function playerFor(token,players){const id=String(token?.ownerClientId||"");return (players||[]).find((p)=>String(p?.clientId||p?.peerId||"")===id)||null;}
function hpFor(token,players){if(token?.kind==="player"){const p=playerFor(token,players);return{hp:Math.max(0,Number(p?.character?.currentHp??token?.stats?.hp??0)),maxHp:Math.max(0,Number(p?.character?.maxHp??token?.stats?.maxHp??0))};}return{hp:Math.max(0,Number(token?.stats?.hp??0)),maxHp:Math.max(0,Number(token?.stats?.maxHp??0))};}
function hiddenForPlayers(token){return token?.kind!=="player"&&token?.stats?.visibleToPlayers===false;}
function positiveGridSize(value,fallback){const n=Math.floor(Number(value));return Number.isFinite(n)&&n>0?n:fallback;}

export default function SessionTacticalMapV3({session,openRequest=0}){
  const scene=session?.tacticalScene||null;
  const [open,setOpen]=useState(false);
  const [selectedTokenId,setSelectedTokenId]=useState("");
  const [dragState,setDragState]=useState(null);
  const [error,setError]=useState("");
  const gridRef=useRef(null);
  const dragRef=useRef(null);
  const lastOpenRequestRef=useRef(openRequest);
  const previousSceneActiveRef=useRef(Boolean(scene?.active));

  const rawTokens=Array.isArray(scene?.tokens)?scene.tokens:[];
  const tokens=useMemo(()=>rawTokens.filter((token)=>!hiddenForPlayers(token)),[rawTokens]);
  const ownedTokens=useMemo(()=>tokens.filter((token)=>String(token?.ownerClientId||"")===String(session?.clientId||"")),[tokens,session?.clientId]);
  const selectedToken=ownedTokens.find((token)=>token.id===selectedTokenId)||ownedTokens[0]||null;
  const proceduralSpec=scene?.environment?.proceduralMapSpec||null;
  const showWastelandAssets=Boolean(proceduralSpec&&String(proceduralSpec.type||"")==="wasteland");
  const cols=showWastelandAssets?positiveGridSize(proceduralSpec?.cols,24):positiveGridSize(scene?.cols,12);
  const rows=showWastelandAssets?positiveGridSize(proceduralSpec?.rows,24):positiveGridSize(scene?.rows,12);

  useEffect(()=>{
    if(!ownedTokens.length){setSelectedTokenId("");return;}
    if(!ownedTokens.some((token)=>token.id===selectedTokenId)) setSelectedTokenId(ownedTokens[0].id);
  },[ownedTokens,selectedTokenId]);

  useEffect(()=>{
    const wasActive=previousSceneActiveRef.current;
    const isActive=Boolean(scene?.active);
    previousSceneActiveRef.current=isActive;
    if(!isActive){setOpen(false);setDragState(null);dragRef.current=null;return;}
    if(!wasActive)setOpen(true);
  },[scene?.active,scene?.sceneId]);

  useEffect(()=>{
    if(openRequest===lastOpenRequestRef.current)return;
    lastOpenRequestRef.current=openRequest;
    if(scene?.active)setOpen(true);
  },[openRequest,scene?.active]);

  useEffect(()=>{
    if(typeof document==="undefined")return undefined;
    const openFromShortcut=()=>{if(scene?.active)setOpen(true);};
    document.addEventListener("pip2d20:open-battlemap",openFromShortcut);
    return()=>document.removeEventListener("pip2d20:open-battlemap",openFromShortcut);
  },[scene?.active]);

  const showError=useCallback((response)=>{if(response?.ok===false)setError(response.error||"MOVE_FAILED");else setError("");},[]);

  const finishDragAt=useCallback(async(clientX,clientY,pointerId,cancelled=false)=>{
    const drag=dragRef.current;
    if(!drag||Number(drag.pointerId)!==Number(pointerId))return;
    dragRef.current=null;
    setDragState(null);
    try{drag.captureTarget?.releasePointerCapture?.(drag.pointerId);}catch{/* already released */}
    if(cancelled||!drag.moved)return;
    const rect=gridRef.current?.getBoundingClientRect();
    const token=ownedTokens.find((item)=>item.id===drag.tokenId);
    if(!rect||!token)return;
    const px=Number.isFinite(clientX)?clientX:drag.lastX;
    const py=Number.isFinite(clientY)?clientY:drag.lastY;
    const x=Math.floor(((px-rect.left)/Math.max(1,rect.width))*cols)-drag.anchorX;
    const y=Math.floor(((py-rect.top)/Math.max(1,rect.height))*rows)-drag.anchorY;
    showError(await session.moveToken?.(token.id,x,y));
  },[cols,rows,ownedTokens,session,showError]);

  useEffect(()=>{
    if(!dragState?.tokenId||typeof window==="undefined")return undefined;
    const onPointerUp=(event)=>{void finishDragAt(event.clientX,event.clientY,event.pointerId,false);};
    const onPointerCancel=(event)=>{void finishDragAt(event.clientX,event.clientY,event.pointerId,true);};
    window.addEventListener("pointerup",onPointerUp,true);
    window.addEventListener("pointercancel",onPointerCancel,true);
    return()=>{
      window.removeEventListener("pointerup",onPointerUp,true);
      window.removeEventListener("pointercancel",onPointerCancel,true);
    };
  },[dragState?.tokenId,finishDragAt]);

  if(!session?.isActive||session?.mode!=="player"||!scene?.active)return null;

  const canMove=Boolean(selectedToken&&session.status==="online");
  const close=()=>{setOpen(false);setDragState(null);dragRef.current=null;};
  const moveTo=async(x,y)=>{if(!canMove||!selectedToken)return;showError(await session.moveToken?.(selectedToken.id,x,y));};

  const beginDrag=(event,token)=>{
    if(!ownedTokens.some((item)=>item.id===token.id)||(event.pointerType==="mouse"&&event.button!==0))return;
    event.preventDefault();
    setSelectedTokenId(token.id);
    const rect=event.currentTarget.getBoundingClientRect(),size=tokenSize(token);
    const anchorX=Math.max(0,Math.min(size-1,Math.floor(((event.clientX-rect.left)/Math.max(1,rect.width))*size)));
    const anchorY=Math.max(0,Math.min(size-1,Math.floor(((event.clientY-rect.top)/Math.max(1,rect.height))*size)));
    dragRef.current={tokenId:token.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,anchorX,anchorY,moved:false,captureTarget:event.currentTarget};
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({tokenId:token.id,x:event.clientX,y:event.clientY,avatar:token.avatar||"",name:token.name||"",size,moved:false});
    event.stopPropagation();
  };
  const moveDrag=(event)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;drag.lastX=event.clientX;drag.lastY=event.clientY;drag.moved=drag.moved||Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5;if(drag.moved)event.preventDefault();setDragState((v)=>v?{...v,x:event.clientX,y:event.clientY,moved:drag.moved}:v);};
  const finishDrag=(event)=>{event.preventDefault();event.stopPropagation();void finishDragAt(event.clientX,event.clientY,event.pointerId,false);};
  const cancelDrag=(event)=>{event.stopPropagation();void finishDragAt(event.clientX,event.clientY,event.pointerId,true);};
  const lostCapture=(event)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;void finishDragAt(drag.lastX,drag.lastY,event.pointerId,!drag.moved);};

  const startSet=new Set((scene.startZone||[]).map((cell)=>`${cell.x}:${cell.y}`));
  const cells=[];
  for(let y=0;y<rows;y+=1){for(let x=0;x<cols;x+=1){const anchored=tokens.filter((token)=>Number(token.x)===x&&Number(token.y)===y);cells.push(<button type="button" key={`${x}:${y}`} className={`gm-session-map__cell tactical-cell${startSet.has(`${x}:${y}`)?" is-start-zone":""}`} style={{position:"relative",zIndex:4}} onClick={()=>moveTo(x,y)}>{anchored.length?<span className="gm-session-map__tokens">{anchored.map((token)=>{const owned=ownedTokens.some((item)=>item.id===token.id),selected=selectedToken?.id===token.id,size=tokenSize(token),hp=hpFor(token,session.players||[]),down=hp.maxHp>0&&hp.hp<=0,percent=hp.maxHp>0?Math.max(0,Math.min(100,hp.hp/hp.maxHp*100)):0;return <span key={token.id} className={`gm-session-token ${token.kind==="player"?"is-player":"is-npc is-enemy"} is-size-${size}${owned?" is-own":""}${selected?" is-selected":""}${dragState?.tokenId===token.id?" is-dragging":""}`} onPointerDown={owned?(event)=>beginDrag(event,token):undefined} onPointerMove={owned?moveDrag:undefined} onPointerUp={owned?finishDrag:undefined} onPointerCancel={owned?cancelDrag:undefined} onLostPointerCapture={owned?lostCapture:undefined} onClick={(event)=>{if(owned){event.stopPropagation();setSelectedTokenId(token.id);}}}>{token.kind==="player"&&hp.maxHp>0?<span className="gm-token-status-hp"><span style={{width:`${percent}%`}}/><b>{Math.round(hp.hp)}/{Math.round(hp.maxHp)}</b></span>:null}{down?<span className="gm-token-zero-marker"/>:null}{token.avatar?<img src={token.avatar} alt="" draggable={false}/>:<b>{String(token.name||"T").slice(0,1).toUpperCase()}</b>}<small>{token.name}</small></span>;})}</span>:null}</button>);}}

  const overlay=open?<div className="session-tactical-overlay"><section className="pip-panel session-tactical-player"><header className="session-tactical-player__head"><div><div className="pip-bootline">PIP 2D20 // {scene.name||"TACTICAL"}</div><h2>[ TACTICAL MAP ]</h2></div><div className="session-tactical-player__actions"><span className="tactical-live">{session.status==="online"?"LIVE":"CONNECTING"}</span><button type="button" className="pip-btn" onClick={close}>BACK TO PLAYER</button></div></header>
    <div className="tactical-player-briefing-row"><TacticalEnvironmentSummary scene={scene} effectsOnly/><div className="tactical-player-token-setup tactical-player-token-setup-v2">{ownedTokens.length>1?<div className="tactical-owned-token-picker">{ownedTokens.map((token)=><button type="button" key={token.id} className={`pip-btn${selectedToken?.id===token.id?" is-primary":""}`} onClick={()=>setSelectedTokenId(token.id)}>{token.avatar?<img src={token.avatar} alt=""/>:null}<span>{token.name}</span></button>)}</div>:null}</div></div>
    {error?<div className="session-error">{error}</div>:null}
    <div ref={gridRef} data-player-grid={`${cols}x${rows}`} className={`gm-session-map__grid tactical-grid${scene.backgroundUrl?" has-background":""}${dragState?.moved?" is-drag-active":""}`} style={{position:"relative",gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`,gridTemplateRows:`repeat(${rows}, minmax(0,1fr))`,backgroundImage:showWastelandAssets?undefined:(scene.backgroundUrl?`url(${JSON.stringify(scene.backgroundUrl)})`:undefined)}}>{showWastelandAssets?<WastelandAssetLayer spec={{...proceduralSpec,cols,rows}} preview/>:null}{cells}</div>
  </section><TacticalSessionHud session={session}/>{dragState?.moved?<div className={`tactical-drag-ghost is-size-${dragState.size}`} style={{left:dragState.x,top:dragState.y}}>{dragState.avatar?<img src={dragState.avatar} alt=""/>:<b>{String(dragState.name||"T").slice(0,1)}</b>}</div>:null}</div>:null;

  return overlay&&typeof document!=="undefined"?createPortal(overlay,document.body):overlay;
}
