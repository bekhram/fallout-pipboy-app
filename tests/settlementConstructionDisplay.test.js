import test from 'node:test';
import assert from 'node:assert/strict';
import { SettlementBuildingVisuals } from '../src/components/settlement/SettlementBuildingVisuals.js';
import { SettlementBuildingBadges } from '../src/components/settlement/SettlementBuildingBadges.js';
import { SETTLEMENT_BUILDINGS } from '../src/data/settlement/buildings.js';

// Display-object doubles verify lifecycle and state; not actual Phaser rendering.
function sceneDouble(textures = true) {
  const objects=[], listeners=[];
  const scene={objects, cameras:{main:{zoom:1,scrollX:0,scrollY:0}},scale:{width:800,height:600},textures:{exists:()=>textures},events:{once:(_name,fn)=>listeners.push(fn)}};
  function node(kind,...args) {
    const n={kind,x:args[0]||0,y:args[1]||0,width:100,height:100,displayHeight:100,visible:true,alpha:1,text:kind==='text'?args[2]:'',children:[],handlers:{},scaleX:1,scaleY:1,
      setDepth(v){this.depth=v;return this;},setOrigin(){return this;},setVisible(v){this.visible=v;return this;},setAlpha(v){this.alpha=v;return this;},setStrokeStyle(){return this;},setFillStyle(v){this.fill=v;return this;},
      setScale(x,y=x){this.scaleX=x;this.scaleY=y;this.displayHeight=this.height*y;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},setCrop(...v){this.crop=v;return this;},
      setText(v){this.text=v;return this;},setInteractive(){return this;},on(event,fn){this.handlers[event]=fn;return this;},
      add(items){this.children.push(...(Array.isArray(items)?items:[items]));return this;},addAt(item,index){this.children.splice(index,0,item);return this;},remove(item){this.children=this.children.filter(c=>c!==item);return this;},
      lineStyle(){return this;},lineBetween(){return this;},destroy(){this.destroyed=true;this.children.forEach(c=>c.destroy());},
    };objects.push(n);return n;
  }
  scene.add=Object.fromEntries(['container','image','rectangle','circle','text','graphics'].map(kind=>[kind,(...a)=>node(kind,...a)]));
  scene.shutdown=()=>listeners.forEach(fn=>fn());return scene;
}
const save=(state='construction')=>({id:'s',buildings:[{id:'a',type:'water_pump',x:3,y:3,state,condition:100,rooms:[]}],settlers:[]});
const view=(stage='site',ratio=.1,state='building',workers=2)=>({byBuilding:{a:{stage,ratio,percent:Math.floor(ratio*100),state,workers,tasks:[{etaMs:state==='building'?60000:null}]}},byKey:{}});
function visuals(textures=true){const scene=sceneDouble(textures),layer=scene.add.container(0,0);return{scene,renderer:new SettlementBuildingVisuals(scene,layer)};}

test('initial stage shows the site, not a completed building',()=>{
  const {renderer}=visuals();renderer.sync(save(),view());const unit=renderer.units.get('a');
  assert.equal(unit.site.visible,true);assert.equal(unit.ready.visible,false);assert.equal(unit.scaffold.visible,false);
});
test('middle and final stages reveal different fractions of the existing building texture',()=>{
  const {renderer}=visuals();renderer.sync(save(),view('frame',.5));const unit=renderer.units.get('a');
  assert.equal(unit.ready.visible,true);assert.equal(unit.ready.crop[3]/unit.ready.height,.5);assert.equal(unit.scaffold.visible,true);
  renderer.sync(save(),view('finishing',.8));assert.equal(unit.ready.crop[3]/unit.ready.height,.9);
});
test('progress updates reuse objects and preserve the map anchor',()=>{
  const {renderer,scene}=visuals();const s=save();renderer.sync(s,view());const old=renderer.units.get('a'),count=scene.objects.length,top=renderer.bounds.get('a').top;
  for(let i=0;i<20;i++)renderer.sync(s,view('frame',.34+i/100));
  assert.equal(renderer.units.get('a'),old);assert.equal(scene.objects.length,count);assert.equal(renderer.bounds.get('a').top,top);
});
test('predicted 100 percent still keeps construction scaffolding',()=>{
  const {renderer}=visuals();renderer.sync(save(),view('finishing',1,'confirming',0));
  assert.equal(renderer.units.get('a').mode,'new');assert.equal(renderer.units.get('a').scaffold.visible,true);
});
test('saved completion swaps to a full, un-cropped building and destroys the site',()=>{
  const {renderer}=visuals();renderer.sync(save(),view('frame',.5));const previous=renderer.units.get('a');
  renderer.sync(save('active'),{byBuilding:{},byKey:{}});const current=renderer.units.get('a');
  assert.equal(previous.root.destroyed,true);assert.equal(current.mode,'ready');assert.equal(current.site,null);assert.deepEqual(current.ready.crop,[]);assert.equal(current.scaffold.visible,false);
});
test('room/upgrade work keeps the existing active building visible',()=>{
  const {renderer}=visuals();renderer.sync(save('active'),view('frame',.5));const unit=renderer.units.get('a');
  assert.equal(unit.mode,'interior');assert.equal(unit.ready.visible,true);assert.deepEqual(unit.ready.crop,[]);
});
test('moving a building refreshes its objects and badge bounds',()=>{
  const {renderer}=visuals();renderer.sync(save(),view());const old=renderer.units.get('a'),s=save();s.buildings[0].y+=3;
  renderer.sync(s,view());assert.equal(old.root.destroyed,true);assert.ok(renderer.bounds.get('a').top>0);
});
test('missing assets have a safe fallback',()=>{
  const {renderer}=visuals(false);assert.doesNotThrow(()=>renderer.sync(save(),view('frame',.5)));assert.equal(renderer.units.get('a').ready,null);
});
test('removed buildings and shutdown clean up all visual objects',()=>{
  const {renderer,scene}=visuals();renderer.sync(save(),view());const old=renderer.units.get('a');renderer.sync({...save(),buildings:[]},{byBuilding:{}});
  assert.equal(old.root.destroyed,true);assert.equal(renderer.bounds.size,0);renderer.sync(save(),view());scene.shutdown();assert.equal(renderer.units.size,0);
});
test('construction badge displays percent, crew and an ETA tooltip',()=>{
  const scene=sceneDouble(),badges=new SettlementBuildingBadges(scene,()=>{});badges.sync(save(),'ru');badges.updateConstruction(view('frame',.42),'ru');const unit=badges.units.get('a');
  assert.equal(unit.caption.text,'42% · 2 ⚒');assert.equal(unit.construction.visible,true);assert.equal(unit.fill.scaleX,.42);assert.ok(unit.tooltip.text.includes('Осталось: 1 мин'));
});
test('zero-crew badge shows waiting rather than a running timer',()=>{
  const scene=sceneDouble(),badges=new SettlementBuildingBadges(scene,()=>{});badges.sync(save(),'ru');badges.updateConstruction(view('site',.1,'waiting',0),'ru');const unit=badges.units.get('a');
  assert.ok(unit.tooltip.text.includes('Ожидает рабочих'));assert.equal(unit.tooltip.text.includes('Осталось:'),false);assert.equal(unit.status.text,'!');
});
test('badge and progress plate keep screen size at different zoom values',()=>{
  const scene=sceneDouble(),badges=new SettlementBuildingBadges(scene,()=>{});badges.sync(save(),'en');badges.updateConstruction(view(),'en');
  for(const zoom of [.5,1,2]){scene.cameras.main.zoom=zoom;badges.resize();assert.equal(badges.units.get('a').root.scaleX*zoom,1);}
});
test('construction strip taps open the card but drags do not',()=>{
  const scene=sceneDouble(),calls=[],badges=new SettlementBuildingBadges(scene,id=>calls.push(id));badges.sync(save(),'en');badges.updateConstruction(view(),'en');const plate=badges.units.get('a').construction.children[0];
  plate.handlers.pointerdown({x:10,y:10});plate.handlers.pointerup({x:12,y:12});assert.deepEqual(calls,['a']);
  plate.handlers.pointerdown({x:10,y:10});plate.handlers.pointerup({x:50,y:50});assert.equal(calls.length,1);
});
test('a confirmed finished building returns to its resource badge without a progress strip',()=>{
  const scene=sceneDouble(),badges=new SettlementBuildingBadges(scene,()=>{});badges.sync(save(),'en');badges.updateConstruction(view(),'en');
  badges.sync(save('active'),'en');badges.updateConstruction({byBuilding:{}},'en');const unit=badges.units.get('a');
  assert.equal(unit.construction.visible,false);assert.equal(unit.hasConstruction,false);assert.equal(unit.status.text,'');
});
