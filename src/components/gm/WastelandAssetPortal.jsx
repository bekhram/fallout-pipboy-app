import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import wastelandBg from "../../assets/wasteland/backgrounds/wasteland-bg-1.png";
import swampBg from "../../assets/wasteland/backgrounds/wasteland-swamp-bg-1.png";
import urbanRuinsBg from "../../assets/wasteland/backgrounds/wasteland-urban-ruins-bg-1.png";
import car1 from "../../assets/wasteland/objects/car-1.png";
import car2 from "../../assets/wasteland/objects/car-2.png";
import car3 from "../../assets/wasteland/objects/car-3.png";
import cliff1 from "../../assets/wasteland/objects/cliff-1.png";
import cliff2 from "../../assets/wasteland/objects/cliff-2.png";
import cliff3 from "../../assets/wasteland/objects/cliff-3.png";
import crater1 from "../../assets/wasteland/objects/crater-1.png";
import crater2 from "../../assets/wasteland/objects/crater-2.png";
import crater3 from "../../assets/wasteland/objects/crater-3.png";
import deadTree1 from "../../assets/wasteland/objects/dead-tree-1.png";
import deadTree2 from "../../assets/wasteland/objects/dead-tree-2.png";
import hills1 from "../../assets/wasteland/objects/hills-1.png";
import lake1 from "../../assets/wasteland/objects/lake-1.png";
import ravine1 from "../../assets/wasteland/objects/ravine-1.png";
import rocks1 from "../../assets/wasteland/objects/rocks-1.png";
import rocks2 from "../../assets/wasteland/objects/rocks-2.png";
import rocks3 from "../../assets/wasteland/objects/rocks-3.png";
import ruins1 from "../../assets/wasteland/objects/ruins-1.png";
import swamp1 from "../../assets/wasteland/objects/swamp-1.png";
import truck1 from "../../assets/wasteland/objects/truck-1.png";
import truck2 from "../../assets/wasteland/objects/truck-2.png";
import truck3 from "../../assets/wasteland/objects/truck-3.png";
import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const GRID = 24;
const OVERLAP_PAD = 0.08;
const ASSET_VARIANTS = {
  cliff: [cliff1, cliff2, cliff3], rocks: [rocks1, rocks2, rocks3], crater: [crater1, crater2, crater3],
  dead_tree: [deadTree1, deadTree2], wreck_car: [car1, car2, car3], wreck_truck: [truck1, truck2, truck3],
  ruins: [ruins1], ravine: [ravine1], lake: [lake1], swamp: [swamp1], hills: [hills1],
};

export function wastelandBackgroundForSpec(spec) {
  const terrain = String(spec?.terrain || spec?.terrainType || spec?.backgroundType || "wasteland").toLowerCase();
  if (terrain === "swamp") return swampBg;
  if (terrain === "ruins") return urbanRuinsBg;
  return wastelandBg;
}

function assetForItem(item) { const variants = ASSET_VARIANTS[item.type]; if (!variants?.length) return null; const index = Math.abs(Number(item.sprite || 0)) % variants.length; return { src: variants[index], index }; }
function renderBoxForItem(item) { return { x: Number(item.x || 0), y: Number(item.y || 0), w: Number(item.w || 0), h: Number(item.h || 0) }; }
function resizeAroundCenter(item, nextW, nextH) { const currentW=Number(item.w||0), currentH=Number(item.h||0); return { ...item, x:Number(item.x||0)-(nextW-currentW)/2, y:Number(item.y||0)-(nextH-currentH)/2, w:nextW, h:nextH }; }
function normalizeVisualSize(item) { const currentW=Number(item.w||0), currentH=Number(item.h||0); if(item.type==="cliff")return resizeAroundCenter(item,currentW*2,currentH*2); if(item.type==="dead_tree")return resizeAroundCenter(item,Math.max(3,currentW*1.4),Math.max(3,currentH*1.4)); if(item.type==="crater")return resizeAroundCenter(item,Math.max(3.4,currentW),Math.max(3.4,currentH)); return item; }
function visualBounds(item) { const box=renderBoxForItem(item); const scaleX=item.type==="wreck_car"?1.5:item.type==="wreck_truck"?1.25:1; const scaleY=item.type==="wreck_car"?2:item.type==="wreck_truck"?1.5:1; const finalW=box.w*scaleX, finalH=box.h*scaleY, cx=box.x+box.w/2, cy=box.y+box.h/2; return {x:cx-finalW/2,y:cy-finalH/2,w:finalW,h:finalH}; }
function fitVisualItemToGrid(item) { const bounds=visualBounds(item); let dx=0,dy=0; if(bounds.x<0)dx=-bounds.x; else if(bounds.x+bounds.w>GRID)dx=GRID-(bounds.x+bounds.w); if(bounds.y<0)dy=-bounds.y; else if(bounds.y+bounds.h>GRID)dy=GRID-(bounds.y+bounds.h); return dx||dy?{...item,x:item.x+dx,y:item.y+dy}:item; }
function boxesOverlap(a,b,pad=OVERLAP_PAD){return !(a.x+a.w+pad<=b.x||b.x+b.w+pad<=a.x||a.y+a.h+pad<=b.y||b.y+b.h+pad<=a.y);}
function removeVisualOverlaps(items){const accepted=[],occupied=[];for(const item of items){const bounds=visualBounds(item);const isGroundDecal=item.type==="crater";const collides=!isGroundDecal&&occupied.some((box)=>boxesOverlap(bounds,box));if(collides)continue;accepted.push(item);if(!isGroundDecal)occupied.push(bounds);}return accepted;}
function roadStyle(road,surface){const horizontal=road.w>=road.h;const common={position:"absolute",left:`${road.x/GRID*100}%`,top:`${road.y/GRID*100}%`,width:`${road.w/GRID*100}%`,height:`${road.h/GRID*100}%`,boxSizing:"border-box",pointerEvents:"none",opacity:.94};if(surface==="dirt")return{...common,background:"rgba(118, 91, 58, .9)",border:"1px solid rgba(62, 45, 31, .75)",boxShadow:"inset 0 0 18px rgba(43, 31, 21, .35)"};if(surface==="cobblestone")return{...common,backgroundColor:"rgba(89, 86, 79, .94)",backgroundImage:"linear-gradient(rgba(120,115,104,.38) 1px, transparent 1px), linear-gradient(90deg, rgba(55,52,48,.35) 1px, transparent 1px)",backgroundSize:"18px 14px",border:"1px solid rgba(54, 52, 47, .8)"};return{...common,background:"rgba(62, 63, 60, .94)",border:"1px solid rgba(35, 36, 34, .9)",boxShadow:"inset 0 0 14px rgba(0,0,0,.28)",backgroundImage:horizontal?"linear-gradient(to bottom, transparent 47%, rgba(174,160,111,.85) 47%, rgba(174,160,111,.85) 53%, transparent 53%)":"linear-gradient(to right, transparent 47%, rgba(174,160,111,.85) 47%, rgba(174,160,111,.85) 53%, transparent 53%)"};}
function SpriteImage({item,preview=false}){const asset=assetForItem(item);if(!asset)return null;const box=renderBoxForItem(item),isGroundTerrain=["lake","swamp","ravine"].includes(item.type),depth=isGroundTerrain?2:10+Math.round((Number(item.y||0)+Number(item.h||0)/2)*10),scaleX=item.type==="wreck_car"?1.5:item.type==="wreck_truck"?1.25:1,scaleY=item.type==="wreck_car"?2:item.type==="wreck_truck"?1.5:1;return <img src={asset.src} alt="" draggable={false} data-wasteland-asset={item.type} data-wasteland-sprite={asset.index} style={{position:"absolute",left:`${box.x/GRID*100}%`,top:`${box.y/GRID*100}%`,width:`${box.w/GRID*100}%`,height:`${box.h/GRID*100}%`,transform:`scale(${scaleX}, ${scaleY})`,transformOrigin:"50% 50%",pointerEvents:"none",userSelect:"none",zIndex:depth,objectFit:"contain",overflow:"visible",filter:preview?"none":"drop-shadow(0 3px 4px rgba(0,0,0,.5))"}}/>;}

export function WastelandAssetLayer({ spec, preview = false, showBackground = true }) {
  const site=useMemo(()=>buildOpenWastelandSite({...spec,cols:GRID,rows:GRID}),[spec?.seed,spec?.terrain,spec?.backgroundType,spec?.terrainType]);
  const background=useMemo(()=>wastelandBackgroundForSpec(spec),[spec?.terrain,spec?.backgroundType,spec?.terrainType]);
  const items=useMemo(()=>removeVisualOverlaps([...(site.terrain||[]).map(normalizeVisualSize),...site.obstacles.map(normalizeVisualSize),...site.vehicles,...site.trees.map(normalizeVisualSize)].map(fitVisualItemToGrid)),[site]);
  return <div className={preview?"gm-wasteland-assets is-preview":"gm-wasteland-assets"} aria-hidden="true" style={{position:"absolute",inset:0,width:preview?"100%":"var(--battlemap-world-width, 100%)",height:preview?"100%":"var(--battlemap-world-height, 100%)",pointerEvents:"none",zIndex:preview?2:0,overflow:"hidden",gridColumn:"1 / -1",gridRow:"1 / -1"}}>
    {showBackground?<img src={background} alt="" draggable={false} data-wasteland-background="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"fill",pointerEvents:"none",userSelect:"none",zIndex:0}}/>:null}
    <div style={{position:"absolute",inset:0,zIndex:1,pointerEvents:"none"}}>{site.roads.map((road,index)=><div key={`${road.x}-${road.y}-${road.w}-${road.h}-${index}`} data-wasteland-road={site.profile.surface} style={roadStyle(road,site.profile.surface)}/>)}</div>
    <div style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none"}}>{items.map((item,index)=><SpriteImage key={`${item.type}-${item.sprite??"x"}-${item.x}-${item.y}-${index}`} item={item} preview={preview}/>)}</div>
  </div>;
}

export default function WastelandAssetPortal({session}){const scene=session?.tacticalScene||null,spec=scene?.environment?.proceduralMapSpec||null;const[target,setTarget]=useState(null);useEffect(()=>{let cancelled=false,tries=0;const findTarget=()=>{if(cancelled)return;const node=document.querySelector(".gm-tactical-map-core .gm-session-map__grid");if(node){setTarget(node);return;}tries+=1;if(tries<30)window.setTimeout(findTarget,50);};findTarget();return()=>{cancelled=true;setTarget(null);};},[scene?.sceneId,scene?.backgroundName,spec?.seed,spec?.type,spec?.terrain]);if(!target||!spec||String(spec.type||"")!=="wasteland")return null;return createPortal(<WastelandAssetLayer spec={spec}/>,target);}
