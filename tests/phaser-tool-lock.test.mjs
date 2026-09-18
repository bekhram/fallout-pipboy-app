import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/components/phaser/PhaserMapViewport.jsx',import.meta.url),'utf8');
test('pencil/ruler pointer is not captured or registered as a camera pinch',()=>{
 const start=source.indexOf('          const down = (e) => {'),end=source.indexOf('          const move = (e) => {');
 const context={toolActive:()=>true,pointers:new Map([[1,{}]]),drag:{},pinch:{}};
 const down=vm.runInNewContext(source.slice(start,end)+'\ndown;',context);
 down({}); assert.equal(context.pointers.size,0);assert.equal(context.drag,null);assert.equal(context.pinch,null);
});
test('resize keeps tactical zoom unchanged, including mobile height changes',()=>{
 const start=source.indexOf('observer = new ResizeObserver(() => {')+'observer = new ResizeObserver(() => {'.length;
 const end=source.indexOf('\n          });',start);
 let fits=0,syncs=0;
 const cam={scrollX:100,scrollY:120,width:390,height:600,zoom:.6,setScroll(x,y){this.scrollX=x;this.scrollY=y;}};
 const context={root:{clientWidth:390,clientHeight:520},cancelled:false,children:true,toolActive:()=>false,game:{scale:{resize(w,h){cam.width=w;cam.height=h;}}}};
 const resize=vm.runInNewContext('(function(){'+source.slice(start,end)+'})',context);
 resize.call({cameras:{main:cam},framing:'fill',fit(){fits++;},sync(){syncs++;}});
 assert.equal(cam.zoom,.6);assert.equal(fits,0);assert.equal(syncs,1);
});
