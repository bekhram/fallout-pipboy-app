import { SettlementResidents } from './SettlementResidents.js';
import { SettlementBuildingBadges } from './SettlementBuildingBadges.js';
import { SettlementBuildingVisuals } from './SettlementBuildingVisuals.js';
import { settlementConstructionView } from '../../utils/settlementConstructionView.js';
import ConstructionNotices from './ConstructionNotices.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE } from '../../data/settlement/buildings.js';
import { SETTLEMENT_ASSETS, CONSTRUCTION_ASSETS } from './settlementAssets.js';
import background from '../../assets/wasteland/backgrounds/settlement-bg-1.png';

const CELL = 40;
const WORLD = SETTLEMENT_GRID_SIZE * CELL;

// React owns game data. Phaser only renders it and reports user intentions.
export default function SettlementPhaserMap(props) {
  const container = useRef(null);
  const sceneRef = useRef(null);
  const latest = useRef(props);
  const cursor = useRef({x:12,y:12});
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  latest.current = props;
  useEffect(()=>{sceneRef.current?.sync();},[props]);
  useEffect(()=>{
    let cancelled = false;
    let game;
    let observer;
    import('phaser').then(({default:Phaser})=>{
      if(cancelled) return;
      class SettlementScene extends Phaser.Scene {
        preload() {
          this.load.image('terrain',background);
          Object.entries(SETTLEMENT_ASSETS).forEach(([key,url])=>this.load.image(key,url));
          Object.entries(CONSTRUCTION_ASSETS).forEach(([key,url])=>this.load.image(`construction-${key}`,url));
        }
        create() {
          this.add.image(0,0,'terrain').setOrigin(0).setDisplaySize(WORLD,WORLD);
          this.grid=this.add.graphics();
          this.grid.lineStyle(1,0xc0dda4,0.12);
          for(let i=0;i<=24;i++){this.grid.lineBetween(i*CELL,0,i*CELL,WORLD);this.grid.lineBetween(0,i*CELL,WORLD,i*CELL);}
          this.buildingLayer=this.add.container(0,0);
          this.visuals=new SettlementBuildingVisuals(this,this.buildingLayer);
          this.residents=new SettlementResidents(this);
          this.badges=new SettlementBuildingBadges(this,id=>{this.down=null;if(!latest.current.placementDef)latest.current.onSelect(id);});
          this.highlight=this.add.graphics();
          this.preview=this.add.graphics();
          this.cameras.main.setBounds(0,0,WORLD,WORLD);
          this.input.on('pointerdown',pointer=>{this.down={x:pointer.x,y:pointer.y,scrollX:this.cameras.main.scrollX,scrollY:this.cameras.main.scrollY};this.dragged=false;});
          this.input.on('pointermove',pointer=>{
            if(pointer.isDown && this.down){
              const dx=pointer.x-this.down.x,dy=pointer.y-this.down.y;
              if(Math.hypot(dx,dy)>8) this.dragged=true;
              if(this.dragged){this.cameras.main.setScroll(this.down.scrollX-dx/this.cameras.main.zoom,this.down.scrollY-dy/this.cameras.main.zoom);this.badges.resize();return;}
            }
            const cell=this.cellAt(pointer);if(cell)latest.current.onHover(cell);
          });
          this.input.on('pointerup',pointer=>{
            if(!this.down || this.dragged){this.down=null;return;}this.down=null;
            const cell=this.cellAt(pointer);if(!cell)return;
            const p=latest.current;
            if(p.placementDef){p.onCell(cell.x,cell.y);return;}
            const building=[...(p.settlement.buildings || [])].reverse().find(b=>{const d=SETTLEMENT_BUILDINGS[b.type];return d && cell.x>=b.x && cell.y>=b.y && cell.x<b.x+d.footprint.width && cell.y<b.y+d.footprint.height;});
            if(building)p.onSelect(building.id);
          });
          this.input.on('gameout',()=>{this.down=null;latest.current.onHover(null);});
          this.input.on('wheel',(_pointer,_objects,_dx,dy)=>latest.current.onZoom(Math.max(100,Math.min(200,latest.current.zoom+(dy>0?-25:25)))));
          sceneRef.current=this;
          this.sync();this.resize();setReady(true);
          this.scale.on('resize',this.resize,this);
        }
        update(time,delta) {
          this.residents?.update(time,delta);
          if (!document.hidden && time >= (this.nextConstructionFrame || 0)) {
            this.nextConstructionFrame=time+1000;
            this.syncConstruction();
          }
        }
        cellAt(pointer) {
          const pt=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
          const x=Math.floor(pt.x/CELL),y=Math.floor(pt.y/CELL);
          return x>=0 && y>=0 && x<24 && y<24 ? {x,y} : null;
        }
        resize() {
          const camera=this.cameras.main;
          // Fill the viewport; users pan to reach areas outside the camera.
          this.fit=Math.max(this.scale.width/WORLD,this.scale.height/WORLD);
          camera.setZoom(this.fit*latest.current.zoom/100);
          const extraX=Math.max(0,this.scale.width/camera.zoom-WORLD),extraY=Math.max(0,this.scale.height/camera.zoom-WORLD);
          camera.setBounds(-extraX/2,-extraY/2,WORLD+extraX,WORLD+extraY);
          camera.centerOn(WORLD/2,WORLD/2);
          this.badges?.resize();
        }
        syncConstruction() {
          if(!this.visuals || !this.badges)return;
          const p=latest.current, now=Date.now();
          if(this.constructionSettlement===p.settlement && now-this.constructionSample<1000)return;
          this.constructionSettlement=p.settlement;this.constructionSample=now;
          const view=settlementConstructionView(p.settlement,now);
          this.buildingBounds=this.visuals.sync(p.settlement,view);
          this.badges.sync(p.settlement,p.language,this.buildingBounds);
          this.badges.updateConstruction(view,p.language);
        }
        sync() {
          if(!this.buildingLayer)return;
          const p=latest.current;
          this.residents.sync(p.settlement,p.language);
          // Language changes invalidate labels without resetting actor paths.
          if(this.constructionLanguage!==p.language){this.constructionLanguage=p.language;this.constructionSample=0;}
          this.syncConstruction();
          this.highlight.clear();
          const b=(p.settlement.buildings || []).find(b=>b.id===p.selectedBuildingId);
          if(b){const d=SETTLEMENT_BUILDINGS[b.type];if(d){this.highlight.lineStyle(3,0xa9ffad,1).strokeRect(b.x*CELL,b.y*CELL,d.footprint.width*CELL,d.footprint.height*CELL);}}
          this.preview.clear();
          if(p.hoverCell && p.placementDef){const color=p.placementValid ? 0x9fffaa:0xff7b72;const {x,y}=p.hoverCell;const {width,height}=p.placementDef.footprint;this.preview.fillStyle(color,.25).fillRect(x*CELL,y*CELL,width*CELL,height*CELL).lineStyle(2,color).strokeRect(x*CELL,y*CELL,width*CELL,height*CELL);}
          if(this.previousZoom!==p.zoom){this.previousZoom=p.zoom;this.resize();}
        }
      }
      game=new Phaser.Game({type:Phaser.AUTO,parent:container.current,width:Math.max(1,container.current.clientWidth),height:Math.max(1,container.current.clientHeight),backgroundColor:'#192719',scene:SettlementScene,audio:{noAudio:true},render:{antialias:true},input:{activePointers:2},fps:{target:30},scale:{mode:Phaser.Scale.NONE}});
      observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;if(width>0 && height>0)game.scale.resize(Math.floor(width),Math.floor(height));});observer.observe(container.current);
    }).catch(()=>{if(!cancelled)setFailed(true);});
    return()=>{cancelled=true;observer?.disconnect();sceneRef.current=null;game?.destroy(true);};
  },[]);
  const onKeyDown=event=>{
    if(event.target!==event.currentTarget)return;
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(delta){event.preventDefault();cursor.current={x:Math.max(0,Math.min(23,cursor.current.x+delta[0])),y:Math.max(0,Math.min(23,cursor.current.y+delta[1]))};props.onHover(cursor.current);}
    if(event.key==='Enter' && props.placementDef){event.preventDefault();props.onCell(cursor.current.x,cursor.current.y);}
  };
  return <div className="settlement-phaser-map" ref={container} tabIndex={0} role="group" aria-label={props.label} onKeyDown={onKeyDown}>
    <ConstructionNotices settlement={props.settlement} language={props.language} onSelect={props.onSelect}/>
    {(!ready || failed) && <span className="settlement-map-loading" role="status">{failed?'⚠':'…'} {props.label}</span>}
  </div>;
}
