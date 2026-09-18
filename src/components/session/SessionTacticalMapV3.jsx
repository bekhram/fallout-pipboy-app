import { useTranslation } from "react-i18next";
import CampaignWorldMap from "../campaign/CampaignWorldMap.jsx";
import "./playerWorkspace.css";
import { PhaserToken } from "../phaser/PhaserAsset.jsx";
import PhaserMapViewport from "../phaser/PhaserMapViewport.jsx";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TacticalEnvironmentSummary } from "../gm/TacticalEnvironmentPanel.jsx";
import { WastelandAssetLayer, wastelandBackgroundForSpec } from "../gm/WastelandAssetPortal.jsx";
import { SettlementAssetLayer, settlementBackgroundForSpec } from "../gm/SettlementAssetPortal.jsx";
import { RedRocketAssetLayer, redRocketBackgroundForSpec } from "../gm/RedRocketAssetPortal.jsx";
import { SuperDuperMartAssetLayer, superDuperMartBackgroundForSpec } from "../gm/SuperDuperMartAssetPortal.jsx";
import TacticalSessionHud from "./TacticalSessionHud.jsx";
import GmBattlemapTools from "../gm/GmBattlemapTools.jsx";
import { readLastUiState, rememberBattlemapClosed, rememberBattlemapOpen } from "../../utils/uiViewState.js";
import "../gm/gmSessionMap.css";
import "../gm/sceneLibrary.css";
import "../gm/gmTokenStatusLayer.css";

function tokenSize(token){const n=Number(token?.stats?.footprint||token?.size);return n===3?3:n===2?2:1;}
function playerFor(token,players){const id=String(token?.ownerClientId||"");return (players||[]).find((p)=>String(p?.clientId||p?.peerId||"")===id)||null;}
function hpFor(token,players){if(token?.kind==="player"){const p=playerFor(token,players);return{hp:Math.max(0,Number(p?.character?.currentHp??token?.stats?.hp??0)),maxHp:Math.max(0,Number(p?.character?.maxHp??token?.stats?.maxHp??0))};}return{hp:Math.max(0,Number(token?.stats?.hp??0)),maxHp:Math.max(0,Number(token?.stats?.maxHp??0))};}
function hiddenForPlayers(token){return token?.kind!=="player"&&token?.stats?.visibleToPlayers===false;}
function positiveGridSize(value,fallback){const n=Math.floor(Number(value));return Number.isFinite(n)&&n>0?n:fallback;}

export default function SessionTacticalMapV3({session,openRequest=0,embedded=false,form=null}){
  const { i18n } = useTranslation();
  const copy = ({ru:{battle:'Бой',world:'Мир',settlement:'Поселение',back:'Персонаж',effects:'Эффекты',map:'Тактическая карта'},uk:{battle:'Бій',world:'Світ',settlement:'Поселення',back:'Персонаж',effects:'Ефекти',map:'Тактична мапа'},pl:{battle:'Walka',world:'Świat',settlement:'Osada',back:'Postać',effects:'Efekty',map:'Mapa taktyczna'},en:{battle:'Battle',world:'World',settlement:'Settlement',back:'Character',effects:'Effects',map:'Tactical map'}})[String(i18n.resolvedLanguage||i18n.language).slice(0,2)] || {battle:'Battle',world:'World',settlement:'Settlement',back:'Character',effects:'Effects',map:'Tactical map'};
  const [workspaceTab,setWorkspaceTab]=useState('battle');
  const scene=session?.tacticalScene||null;
  const [open,setOpen]=useState(false);
  const [selectedTokenId,setSelectedTokenId]=useState("");
  const [dragState,setDragState]=useState(null);
  const [error,setError]=useState("");
  const gridRef=useRef(null);
  const dragRef=useRef(null);
  const lastOpenRequestRef=useRef(openRequest);
  const previousSceneActiveRef=useRef(Boolean(scene?.active));
  const restoreBattlemapRef=useRef(readLastUiState().view==="battlemap");

  const openBattlemap=useCallback(()=>{
    if(!scene?.active)return;
    restoreBattlemapRef.current=true;
    rememberBattlemapOpen();
    setOpen(true);
  },[scene?.active]);

  const rawTokens=Array.isArray(scene?.tokens)?scene.tokens:[];
  const tokens=useMemo(()=>rawTokens.filter((token)=>!hiddenForPlayers(token)),[rawTokens]);
  const ownedTokens=useMemo(()=>tokens.filter((token)=>String(token?.ownerClientId||"")===String(session?.clientId||"")),[tokens,session?.clientId]);
  const selectedToken=ownedTokens.find((token)=>token.id===selectedTokenId)||ownedTokens[0]||null;
  const proceduralSpec=scene?.environment?.proceduralMapSpec||null;
  const showWastelandAssets=Boolean(proceduralSpec&&String(proceduralSpec.type||"")==="wasteland");
  const showSettlementAssets=Boolean(proceduralSpec&&String(proceduralSpec.type||"")==="settlement");
  const showRedRocketAssets=Boolean(proceduralSpec&&String(proceduralSpec.type||"")==="red_rocket");
  const showSuperDuperMartAssets=Boolean(proceduralSpec&&String(proceduralSpec.type||"")==="super_duper_mart");
  const isProceduralOverlay=showWastelandAssets||showSettlementAssets||showRedRocketAssets||showSuperDuperMartAssets;
  const cols=isProceduralOverlay?positiveGridSize(proceduralSpec?.cols,24):positiveGridSize(scene?.cols,12);
  const rows=isProceduralOverlay?positiveGridSize(proceduralSpec?.rows,24):positiveGridSize(scene?.rows,12);
  const playerBackground=showWastelandAssets
    ? wastelandBackgroundForSpec(proceduralSpec)
    : showSettlementAssets
      ? `${scene?.backgroundUrl ? `url(${JSON.stringify(scene.backgroundUrl)}), ` : ""}url(${JSON.stringify(settlementBackgroundForSpec())})`
      : showRedRocketAssets
        ? redRocketBackgroundForSpec(proceduralSpec)
        : showSuperDuperMartAssets
          ? superDuperMartBackgroundForSpec(proceduralSpec)
          : scene?.backgroundUrl||"";

  useEffect(()=>{
    if(!ownedTokens.length){setSelectedTokenId("");return;}
    if(!ownedTokens.some((token)=>token.id===selectedTokenId)) setSelectedTokenId(ownedTokens[0].id);
  },[ownedTokens,selectedTokenId]);

  useEffect(()=>{
    const wasActive=previousSceneActiveRef.current;
    const isActive=Boolean(scene?.active);
    previousSceneActiveRef.current=isActive;
    if(!isActive){
      setOpen(false);setDragState(null);dragRef.current=null;
      if(session?.isActive&&session?.mode==="player"&&session?.status==="online"){
        restoreBattlemapRef.current=false;
        rememberBattlemapClosed();
      }
      return;
    }
    if(restoreBattlemapRef.current||!wasActive)openBattlemap();
  },[scene?.active,scene?.sceneId,session?.isActive,session?.mode,session?.status,openBattlemap]);

  useEffect(()=>{
    if(openRequest===lastOpenRequestRef.current)return;
    lastOpenRequestRef.current=openRequest;
    openBattlemap();
  },[openRequest,openBattlemap]);

  useEffect(()=>{
    if(typeof document==="undefined")return undefined;
    const openFromShortcut=()=>openBattlemap();
    document.addEventListener("pip2d20:open-battlemap",openFromShortcut);
    return()=>document.removeEventListener("pip2d20:open-battlemap",openFromShortcut);
  },[openBattlemap]);

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
  const close=()=>{restoreBattlemapRef.current=false;rememberBattlemapClosed();setOpen(false);setDragState(null);dragRef.current=null;};

  const beginDrag=(event,token)=>{
    if(!canMove||!ownedTokens.some((item)=>item.id===token.id)||(event.pointerType==="mouse"&&event.button!==0))return;
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
  for(let y=0;y<rows;y+=1){for(let x=0;x<cols;x+=1){const anchored=tokens.filter((token)=>Number(token.x)===x&&Number(token.y)===y);cells.push(<button type="button" key={`${x}:${y}`} className={`gm-session-map__cell tactical-cell${startSet.has(`${x}:${y}`)?" is-start-zone":""}`} style={{position:"relative",zIndex:4}} tabIndex={-1} aria-label={`Map cell ${x + 1}, ${y + 1}`}>{anchored.length?<span className="gm-session-map__tokens">{anchored.map((token)=>{const owned=ownedTokens.some((item)=>item.id===token.id),selected=selectedToken?.id===token.id,size=tokenSize(token),hp=hpFor(token,session.players||[]),down=hp.maxHp>0&&hp.hp<=0,percent=hp.maxHp>0?Math.max(0,Math.min(100,hp.hp/hp.maxHp*100)):0;return <span key={token.id} className={`gm-session-token ${token.kind==="player"?"is-player":"is-npc is-enemy"} is-size-${size}${owned?" is-own":""}${selected?" is-selected":""}${dragState?.tokenId===token.id?" is-dragging":""}`} onPointerDown={owned?(event)=>beginDrag(event,token):undefined} onPointerMove={owned?moveDrag:undefined} onPointerUp={owned?finishDrag:undefined} onPointerCancel={owned?cancelDrag:undefined} onLostPointerCapture={owned?lostCapture:undefined} onClick={(event)=>{if(owned){event.stopPropagation();setSelectedTokenId(token.id);}}}>{token.kind==="player"&&hp.maxHp>0?<span className="gm-token-status-hp"><span style={{width:`${percent}%`}}/><b>{Math.round(hp.hp)}/{Math.round(hp.maxHp)}</b></span>:null}{down?<span className="gm-token-zero-marker"/>:null}<PhaserToken token={token} selected={selected}/><small>{token.name}</small></span>;})}</span>:null}</button>);}}

  const overlay=(open||embedded)?<div className={`session-tactical-overlay player-workspace${embedded?" player-workspace--embedded":""}`} data-workspace-tab={workspaceTab}><section className="pip-panel session-tactical-player"><header hidden={embedded} className="session-tactical-player__head"><div><div className="pip-bootline">PIP 2D20 // {scene.name||"TACTICAL"}</div><h2>{workspaceTab==='battle'?copy.map:copy[workspaceTab]}</h2></div><div className="session-tactical-player__actions"><span className="tactical-live">{session.status==="online"?"LIVE":"CONNECTING"}</span><button type="button" className="pip-btn" onClick={close}>{copy.back}</button></div></header>
    <div hidden={workspaceTab!=="battle"} className="player-workspace__battle"><div className="tactical-player-briefing-row"><details className="player-workspace__effects"><summary>{copy.effects}</summary><TacticalEnvironmentSummary scene={scene} effectsOnly/></details><div className="tactical-player-token-setup tactical-player-token-setup-v2">{ownedTokens.length>1?<div className="tactical-owned-token-picker">{ownedTokens.map((token)=><button type="button" key={token.id} className={`pip-btn${selectedToken?.id===token.id?" is-primary":""}`} onClick={()=>setSelectedTokenId(token.id)}>{token.avatar?<img src={token.avatar} alt=""/>:null}<span>{token.name}</span></button>)}</div>:null}</div></div>
    <div className="session-tactical-player__status-area">
      {error?<div className="session-error">{error}</div>:null}
      <div className="session-tactical-player__player-status" aria-label="Players online" />
    </div>
    <PhaserMapViewport cols={cols} rows={rows} sceneKey={scene.sceneId} background={showSettlementAssets ? scene.backgroundUrl : playerBackground} player={selectedToken} gridRef={gridRef} label={scene.name || "Battlemap"}>
    <div data-phaser-grid="true" ref={gridRef} data-player-grid={`${cols}x${rows}`} className={`gm-session-map__grid tactical-grid${playerBackground?" has-background":""}${dragState?.moved?" is-drag-active":""}`} style={{"--battlemap-cell":"64px","--battlemap-world-width":`${cols*64}px`,"--battlemap-world-height":`${rows*64}px`,position:"relative",gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`,gridTemplateRows:`repeat(${rows}, minmax(0,1fr))`,backgroundSize:"100% 100%",backgroundPosition:"0 0",backgroundRepeat:"no-repeat"}}>{showWastelandAssets?<WastelandAssetLayer spec={{...proceduralSpec,cols,rows}} preview showBackground={false}/>:null}{showSettlementAssets?<SettlementAssetLayer spec={{...proceduralSpec,cols,rows}} preview/>:null}{showRedRocketAssets?<RedRocketAssetLayer spec={{...proceduralSpec,cols,rows}} preview/>:null}{showSuperDuperMartAssets?<SuperDuperMartAssetLayer spec={{...proceduralSpec,cols,rows}} preview/>:null}{cells}</div>
    </PhaserMapViewport>
    <footer className="session-tactical-player__footer">
      <div className="session-tactical-player__zoom-slot" />
      <div className="session-tactical-player__tools-slot" />
      <div className="session-tactical-player__controls-slot" />
    </footer></div>
    {workspaceTab!=='battle'&&<div className={`player-workspace__campaign is-${workspaceTab}`}><CampaignWorldMap campaignId={session.campaignId} form={form} settlementsOnly={workspaceTab==='settlement'}/></div>}
    <nav hidden={embedded} className="player-workspace__nav" aria-label="Campaign"><button type="button" aria-pressed={workspaceTab==='battle'} onClick={()=>setWorkspaceTab('battle')}>◎ {copy.battle}</button><button type="button" aria-pressed={workspaceTab==='world'} onClick={()=>setWorkspaceTab('world')}>◇ {copy.world}</button><button type="button" aria-pressed={workspaceTab==='settlement'} onClick={()=>setWorkspaceTab('settlement')}>⌂ {copy.settlement}</button></nav>
  </section><GmBattlemapTools session={session} role="player"/><TacticalSessionHud session={session}/>{dragState?.moved?<div className={`tactical-drag-ghost is-size-${dragState.size}`} style={{left:dragState.x,top:dragState.y}}>{dragState.avatar?<img src={dragState.avatar} alt=""/>:<b>{String(dragState.name||"T").slice(0,1)}</b>}</div>:null}</div>:null;

  return overlay&&!embedded&&typeof document!=="undefined"?createPortal(overlay,document.body):overlay;
}
