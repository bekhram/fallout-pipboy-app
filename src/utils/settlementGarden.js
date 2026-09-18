import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
export const CROPS = ['carrot','corn','gourd','melon','mutfruit','razorgrain','tato'];
const aliases = {
 carrot:['морковь','морква','marchew'],corn:['кукуруза','кукурудза','kukurydza'],gourd:['тыква','гарбуз','tykwa'],melon:['дыня','диня','melon'],mutfruit:['мутафрукт','мутфрукт'],razorgrain:['бритвозлак','гострозлак'],tato:['тошка','тато'],fertilizer:['удобрение','удобрения','добриво','добрива','nawóz'],
};
export function gardenItemKind(item) {
 const names=[item.canonicalName,item.sourceName,item.name,item.cropType].map(n=>String(n||'').trim().toLowerCase());
 return [...CROPS,'fertilizer'].find(k=>names.some(n=>n===k||(aliases[k]||[]).includes(n)));
}
export function plantedCrops(building) {
 const capacity=Math.max(0,Number(getRulebookBuilding(building.type)?.effects?.cropSlots||0));
 // Legacy gardens already produced crops: preserve their output during migration.
 return Array.isArray(building.crops)?building.crops.slice(0,capacity):Array.from({length:capacity},()=>({kind:'tato',fertilized:false}));
}
export function gardenCommand(s,c) {
 const building=(s.buildings||[]).find(b=>b.id===c.buildingId);
 if(!building||building.state!=='active'||Number(building.condition??100)<=0)throw new Error('INVALID_GARDEN');
 const capacity=Number(getRulebookBuilding(building.type)?.effects?.cropSlots||0);
 if(!capacity)throw new Error('INVALID_GARDEN');
 let crops=plantedCrops(building);
 let items=[...(s.stockpile?.items||[])];
 if(c.type==='uproot') {
  if(!Number.isInteger(c.index)||!crops[c.index])throw new Error('INVALID_CROP');
  crops=crops.filter((_,i)=>i!==c.index);
 } else {
  const index=items.findIndex(i=>i.id===c.itemId);
  const item=items[index],kind=item&&gardenItemKind(item),quantity=Number(item?.quantity??item?.qty??0);
  if(!Number.isSafeInteger(quantity)||quantity<1)throw new Error('insufficient');
  if(c.type==='plant') {
   if(!CROPS.includes(kind)||crops.length>=capacity)throw new Error('GARDEN_FULL');
   crops=[...crops,{kind,fertilized:false,plantedDay:s.settlementDay||1}];
  } else if(c.type==='fertilize') {
   if(kind!=='fertilizer'||!crops.some(p=>!p.fertilized))throw new Error('INVALID_FERTILIZER');
   let left=6;crops=crops.map(p=>!p.fertilized&&left-->0?{...p,fertilized:true}:p);
  } else throw new Error('INVALID_COMMAND');
  items=items.flatMap((p,i)=>i!==index?[p]:quantity>1?[{...p,quantity:quantity-1,...(Object.hasOwn(p,'qty')?{qty:quantity-1}:{})}]:[]);
 }
 return {...s,stockpile:{...s.stockpile,items},buildings:s.buildings.map(b=>b.id===building.id?{...b,crops}:b)};
}
// Donation consumes the actual approved character inventory item; no free seeds.
export function donateGardenItem(s,character,c) {
 const inventory=character?.inventoryItems||[],item=inventory.find(i=>i.id===c.itemId);
 const quantity=Number(item?.quantity??item?.qty??0),n=c.quantity;
 if(!item||!gardenItemKind(item)||!Number.isSafeInteger(n)||n<1||n>quantity||n>100)throw new Error('INVALID_DONATION');
 const weight=Math.max(0,Number(item.weight)||0);
 const used=(s.stockpile?.items||[]).reduce((sum,i)=>sum+Math.max(0,Number(i.weight)||0)*Number(i.quantity??i.qty??0),0)+Object.values(s.stockpile?.materials||{}).reduce((a,b)=>a+Number(b||0),0);
 if(used+weight*n>Number(s.stockpile?.capacityLbs||300))throw new Error('STORAGE_FULL');
 const items=[...(s.stockpile?.items||[])],id=`garden_${gardenItemKind(item)}`;
 const index=items.findIndex(i=>i.id===id);
 if(index<0)items.push({id,name:gardenItemKind(item),canonicalName:gardenItemKind(item),quantity:n,weight});
 else items[index]={...items[index],quantity:Number(items[index].quantity||0)+n,weight:Math.max(Number(items[index].weight||0),weight)};
 return {settlement:{...s,stockpile:{...s.stockpile,items}},character:{...character,inventoryItems:inventory.flatMap(i=>i.id!==item.id?[i]:quantity>n?[{...i,quantity:String(quantity-n),...(Object.hasOwn(i,'qty')?{qty:quantity-n}:{})}]:[])}};
}
