import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./gmTokenStatusLayer.css";

function tokenOrder(a,b){const ay=Number(a.token?.y||0),by=Number(b.token?.y||0);if(ay!==by)return ay-by;const ax=Number(a.token?.x||0),bx=Number(b.token?.x||0);if(ax!==bx)return ax-bx;return a.index-b.index;}
function playerFor(token,players){const owner=String(token?.ownerClientId||"");return (players||[]).find((p)=>String(p?.clientId||p?.peerId||"")===owner)||null;}
function hpFor(token,players){if(token?.kind==="player"){const p=playerFor(token,players);return{hp:Math.max(0,Number(p?.character?.currentHp??token?.stats?.hp??0)),maxHp:Math.max(0,Number(p?.character?.maxHp??token?.stats?.maxHp??0))};}return{hp:Math.max(0,Number(token?.stats?.hp??0)),maxHp:Math.max(0,Number(token?.stats?.maxHp??0))};}

function Status({token,session}){
  const state=hpFor(token,session?.players||[]);
  const showPlayerHp=token?.kind==="player"&&state.maxHp>0;
  const down=state.maxHp>0&&state.hp<=0;
  const percent=state.maxHp>0?Math.max(0,Math.min(100,state.hp/state.maxHp*100)):0;
  return <>
    {showPlayerHp?<span className="gm-token-status-hp" title={`HP ${state.hp}/${state.maxHp}`}><span style={{width:`${percent}%`}}/><b>{Math.round(state.hp)}/{Math.round(state.maxHp)}</b></span>:null}
    {down?<span className="gm-token-zero-marker" aria-label="0 HP"/>:null}
  </>;
}

export default function GmTokenStatusLayer({session}){
  const scene=session?.tacticalScene||null;
  const [targets,setTargets]=useState([]);
  const tokens=useMemo(()=>(Array.isArray(scene?.tokens)?scene.tokens:[]).map((token,index)=>({token,index})).sort(tokenOrder).map(({token})=>token),[scene?.tokens]);
  useEffect(()=>{if(typeof document==="undefined")return undefined;const sync=()=>{const next=[...document.querySelectorAll(".gm-session-map.tactical-map .gm-session-map__grid.tactical-grid .gm-session-token")];setTargets((cur)=>cur.length===next.length&&cur.every((n,i)=>n===next[i])?cur:next);};sync();const obs=new MutationObserver(sync);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect();},[scene?.sceneId]);
  if(!session?.isActive||session?.mode!=="host")return null;
  return tokens.map((token,index)=>targets[index]?createPortal(<Status token={token} session={session}/>,targets[index],`status-${token.id}`):null);
}
