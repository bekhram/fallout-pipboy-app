const LEVELABLE_TYPES=new Set([
  'scrap_yard','caravan_post','warehouse','crop_field','greenhouse',
  'water_pump','water_purifier','water_tower','windmill'
]);
const SCALE_KEYS=new Set(['water','power','storageLbs','cropSlots','brahminCapacity']);
export function buildingLevel(building){return Math.max(1,Math.min(3,Number(building?.level||1)));}
export function isLevelableBuilding(building){return Boolean(building&&LEVELABLE_TYPES.has(building.type)&&buildingLevel(building)<3);}
export function effectiveBuildingEffects(building,effects={}){
  const level=buildingLevel(building),mult=1+0.25*(level-1),next={...effects};
  for(const key of SCALE_KEYS)if(Number(effects?.[key]||0)>0)next[key]=Math.max(1,Math.round(Number(effects[key])*mult));
  return next;
}
export function levelUpgradeRule(building,baseRule){
  if(!isLevelableBuilding(building)||!baseRule)return null;
  const level=buildingLevel(building),factor=level===1?0.5:0.75;
  return {
    ...baseRule,
    caps:Math.max(0,Math.ceil((Number(baseRule.caps||0)+100*level)*factor)),
    constructionDays:Math.max(1,Math.ceil(Number(baseRule.constructionDays||1)*factor)),
    materials:Object.fromEntries(['common','uncommon','rare'].map(key=>[key,Math.ceil(Number(baseRule.materials?.[key]||0)*factor)])),
    levelOnly:true,
    targetLevel:level+1,
  };
}
export function levelActionBonus(building){return Math.max(0,buildingLevel(building)-1);}
