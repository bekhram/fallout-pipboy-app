import { createWorkerWorld, workerAnchor, workerPath } from './settlementWorkerRuntime.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.y || 0) - Number(b?.y || 0));
const aliveEnemy = enemy => enemy.alive && enemy.hp > 0;
const activeUnit = unit => unit.alive && !unit.retreated && unit.hp > 0;

export const DEFENDER_ARCHETYPES = Object.freeze({
  rifleman: { label:'Rifleman', hp:100, speed:2.25, range:5.2, damage:11, attackMs:560, retreatRatio:.25 },
  bruiser: { label:'Bruiser', hp:145, speed:2.55, range:.9, damage:25, attackMs:760, retreatRatio:.16 },
  heavy: { label:'Heavy', hp:185, speed:1.7, range:4.2, damage:18, attackMs:820, retreatRatio:.18 },
  medic: { label:'Medic', hp:90, speed:2.2, range:3.6, damage:7, attackMs:680, retreatRatio:.34, heal:10, healRange:3.4, healMs:1100 },
});

export const ENEMY_ARCHETYPES = Object.freeze({
  raider_melee: { label:'Raider', role:'melee', threat:'Rushes defenders', hp:58, speed:1.75, range:.82, damage:14, attackMs:760 },
  raider_rifle: { label:'Raider rifleman', role:'ranged', threat:'Keeps firing distance', hp:46, speed:1.45, range:4.6, minRange:2.4, preferredRange:3.7, damage:9, attackMs:860 },
  raider_heavy: { label:'Raider heavy', role:'siege', threat:'Pushes the HQ', hp:105, speed:1.05, range:1.1, damage:20, attackMs:1050 },
});

const WALL_TYPES = new Set(['wall_straight','wall_corner']);
const GATE_TYPES = new Set(['gate']);
const TURRET_TYPES = new Set(['turret','machine_gun_turret','heavy_machine_gun_turret','laser_turret','heavy_laser_turret','shotgun_turret']);
const destructibleDefense = type => WALL_TYPES.has(type) || GATE_TYPES.has(type) || TURRET_TYPES.has(type);
const structureKind = type => TURRET_TYPES.has(type) ? 'turret' : GATE_TYPES.has(type) ? 'gate' : 'wall';
const STRUCTURE_STATS = Object.freeze({
  wall:{hp:115},
  gate:{hp:85},
  turret:{hp:90,range:5.8,damage:10,attackMs:620},
});

function nearestAllowed(world, point) {
  return workerAnchor(world, point);
}

function edgeCells(world) {
  return world.cells.filter(cell => cell.x === 0 || cell.y === 0 || cell.x === world.size - 1 || cell.y === world.size - 1);
}

function buildingCells(building){
  const footprint=building.footprint||{width:1,height:1},cells=[];
  for(let y=building.y;y<building.y+footprint.height;y++)for(let x=building.x;x<building.x+footprint.width;x++)cells.push({x,y});
  return cells;
}

function structureFromBuilding(building){
  if(!destructibleDefense(building.type))return null;
  const kind=structureKind(building.type),stats=STRUCTURE_STATS[kind],footprint=building.footprint||{width:1,height:1};
  return {
    id:building.id,buildingId:building.id,type:building.type,kind,x:building.x,y:building.y,footprint,
    position:{x:building.x+(footprint.width-1)/2,y:building.y+(footprint.height-1)/2},
    hp:stats.hp,maxHp:stats.hp,alive:true,range:stats.range||0,damage:stats.damage||0,attackMs:stats.attackMs||0,cooldown:0,
  };
}

function navigationBuildings(baseBuildings,structures,defenders=false){
  const aliveIds=new Set(structures.filter(item=>item.alive).map(item=>item.buildingId));
  return baseBuildings.filter(building=>{
    if(!destructibleDefense(building.type))return true;
    if(!aliveIds.has(building.id))return false;
    return !(defenders&&GATE_TYPES.has(building.type));
  });
}

function buildWorlds(baseBuildings,structures,size){
  return {
    world:createWorkerWorld(navigationBuildings(baseBuildings,structures,false),size),
    defenderWorld:createWorkerWorld(navigationBuildings(baseBuildings,structures,true),size),
  };
}

function rebuildNavigation(state){
  const worlds=buildWorlds(state.baseBuildings,state.structures,state.size);
  state.world=worlds.world;state.defenderWorld=worlds.defenderWorld;
  for(const enemy of state.enemies)enemy.path=[];
}

function opaqueCells(state,ignoreIds=[]){
  const ignore=new Set(ignoreIds),cells=new Set();
  for(const building of state.baseBuildings){
    if(ignore.has(building.id))continue;
    if(destructibleDefense(building.type)){
      const structure=state.structures.find(item=>item.buildingId===building.id);
      if(!structure?.alive)continue;
    }
    for(const cell of buildingCells(building))cells.add(`${cell.x},${cell.y}`);
  }
  return cells;
}

function gridLine(a,b){
  let x0=Math.round(a.x),y0=Math.round(a.y),x1=Math.round(b.x),y1=Math.round(b.y);
  const points=[],dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;
  while(true){points.push({x:x0,y:y0});if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}
  return points;
}

export function hasRtsLineOfSight(state,from,to,{ignoreIds=[]}={}){
  if(!from||!to)return false;
  const blocked=opaqueCells(state,ignoreIds),line=gridLine(from,to);
  for(let i=1;i<line.length-1;i++)if(blocked.has(`${line[i].x},${line[i].y}`))return false;
  return true;
}

export function rtsCoverForTarget(state,attacker,target){
  if(!attacker||!target)return 0;
  const blocked=opaqueCells(state),tx=Math.round(target.x),ty=Math.round(target.y);
  const ax=attacker.x-target.x,ay=attacker.y-target.y,alen=Math.hypot(ax,ay)||1;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    if(!blocked.has(`${tx+dx},${ty+dy}`))continue;
    const dot=(dx*ax+dy*ay)/(Math.hypot(dx,dy)*alen);
    if(dot>.28)return .35;
  }
  return 0;
}

function structurePorts(state,structure){
  const {x,y,footprint}=structure,points=[];
  for(let px=x;px<x+footprint.width;px++)points.push({x:px,y:y-1},{x:px,y:y+footprint.height});
  for(let py=y;py<y+footprint.height;py++)points.push({x:x-1,y:py},{x:x+footprint.width,y:py});
  const seen=new Set();
  return points.filter(point=>{const id=`${point.x},${point.y}`;if(seen.has(id)||!state.world.allowed.has(id))return false;seen.add(id);return true;});
}

function structureApproach(state,enemy,structure){
  const start=workerAnchor(state.world,enemy);if(!start)return null;
  return structurePorts(state,structure).map(point=>({point,path:workerPath(state.world,start,point)}))
    .filter(item=>item.path.length).sort((a,b)=>a.path.length-b.path.length)[0]||null;
}

function chooseBreachTarget(state,enemy){
  let best=null;
  for(const structure of state.structures.filter(item=>item.alive&&item.kind!=='turret')){
    const approach=structureApproach(state,enemy);if(!approach)continue;
    const score=approach.path.length+(structure.kind==='gate'?-8:0);
    if(!best||score<best.score)best={structure,approach,score};
  }
  if(best)return {type:'structure',entity:best.structure,approach:best.approach.point};
  return null;
}

function pathToPoint(state,enemy,point){
  const start=workerAnchor(state.world,enemy),goal=workerAnchor(state.world,point);
  return start&&goal?workerPath(state.world,start,goal):[];
}

function hqPosition(buildings, world) {
  const hq = buildings.find(building => building.type === 'settlement_hq');
  if (!hq) return nearestAllowed(world, { x: world.size / 2, y: world.size / 2 });
  const footprint = hq.footprint || { width: 1, height: 1 };
  return nearestAllowed(world, { x: hq.x + footprint.width / 2, y: hq.y + footprint.height + 1 });
}

function formationGoals(world, target, count) {
  const anchor = nearestAllowed(world, target);
  if (!anchor) return [];
  const candidates = [...world.cells]
    .filter(cell => Math.abs(cell.x - anchor.x) <= 3 && Math.abs(cell.y - anchor.y) <= 3)
    .sort((a, b) => distance(a, anchor) - distance(b, anchor) || a.y - b.y || a.x - b.x);
  return candidates.slice(0, Math.max(1, count));
}

function assignPath(entity, world, goal) {
  const start = workerAnchor(world, entity), end = nearestAllowed(world, goal);
  if (!start || !end) { entity.path = []; return false; }
  const path = workerPath(world, start, end);
  if (!path.length) { entity.path = []; return false; }
  entity.path = path.slice(1);
  entity.goal = { x: end.x, y: end.y };
  return true;
}

function moveEntity(entity, world, deltaMs, speed) {
  if (!entity.path?.length) return false;
  const dt = Math.min(100, Math.max(0, Number(deltaMs) || 0));
  const next = entity.path[0];
  const dx = next.x - entity.x, dy = next.y - entity.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt / 1000;
  if (d <= step) {
    entity.x = next.x; entity.y = next.y; entity.path.shift();
  } else if (d > 0) {
    entity.x += dx / d * step; entity.y += dy / d * step;
  }
  return true;
}

function defenderProfile(worker, index) {
  const type = DEFENDER_ARCHETYPES[worker.archetype] ? worker.archetype : ['rifleman','bruiser','heavy','medic'][index % 4];
  return { type, ...DEFENDER_ARCHETYPES[type] };
}

function enemyProfile(type, wave) {
  const profile = ENEMY_ARCHETYPES[type] || ENEMY_ARCHETYPES.raider_melee;
  const hpScale = 1 + Math.max(0, wave - 1) * .12;
  const damageScale = 1 + Math.max(0, wave - 1) * .07;
  return {
    type, ...profile,
    hp: Math.round(profile.hp * hpScale),
    damage: Math.max(1, Math.round(profile.damage * damageScale)),
    speed: profile.speed + Math.min(.28, Math.max(0, wave - 1) * .025),
  };
}

function enemyTypeFor(index, wave) {
  const pattern = wave < 2
    ? ['raider_melee','raider_rifle','raider_melee','raider_heavy','raider_rifle','raider_melee']
    : ['raider_melee','raider_rifle','raider_heavy','raider_rifle','raider_melee','raider_heavy'];
  return pattern[index % pattern.length];
}

function nearestActiveUnit(state, enemy, maxDistance = Infinity) {
  return state.units.filter(activeUnit)
    .filter(unit => distance(unit, enemy) <= maxDistance)
    .sort((a, b) => distance(a, enemy) - distance(b, enemy))[0] || null;
}

function chooseEnemyTarget(state, enemy) {
  if (enemy.role === 'siege') {
    const blocker=nearestActiveUnit(state,enemy,1.7);
    if(blocker)return {type:'unit',entity:blocker};
    if(pathToPoint(state,enemy,state.hq.position).length)return {type:'hq',entity:state.hq};
    return chooseBreachTarget(state,enemy)||{type:'hq',entity:state.hq};
  }
  const radius=enemy.role==='ranged'?8:7;
  const nearby=nearestActiveUnit(state,enemy,radius);
  if(nearby&&(enemy.role!=='ranged'||hasRtsLineOfSight(state,enemy,nearby)))return {type:'unit',entity:nearby};
  const turret=state.structures.filter(item=>item.alive&&item.kind==='turret'&&distance(enemy,item.position)<=7)
    .filter(item=>hasRtsLineOfSight(state,enemy,item.position,{ignoreIds:[item.buildingId]}))
    .sort((a,b)=>distance(enemy,a.position)-distance(enemy,b.position))[0];
  if(enemy.role==='ranged'&&turret)return {type:'structure',entity:turret};
  if(pathToPoint(state,enemy,state.hq.position).length)return {type:'hq',entity:state.hq};
  return chooseBreachTarget(state,enemy)||{type:'hq',entity:state.hq};
}

function targetPoint(state,target){
  return target.type==='unit'?target.entity:target.type==='structure'?target.entity.position:state.hq.position;
}

function targetId(target){return target.type==='unit'?target.entity.id:target.type==='structure'?target.entity.id:'hq';}

function refreshEnemyPath(state,enemy,target,force=false){
  const id=targetId(target);
  if(!force&&enemy.targetId===id&&enemy.path?.length)return;
  enemy.targetId=id;
  if(target.type==='structure'){
    const approach=target.approach||structureApproach(state,enemy,target.entity)?.point;
    if(approach)assignPath(enemy,state.world,approach);else enemy.path=[];
    return;
  }
  assignPath(enemy,state.world,targetPoint(state,target));
}

function rangedPosition(state,enemy,target,preferredRange){
  const start=workerAnchor(state.world,enemy),point=targetPoint(state,target);
  if(!start)return null;
  const ignore=target.type==='structure'?[target.entity.buildingId]:[];
  const candidates=state.world.cells
    .filter(cell=>distance(cell,enemy)<=6.5)
    .filter(cell=>hasRtsLineOfSight(state,cell,point,{ignoreIds:ignore}))
    .sort((a,b)=>{
      const aScore=Math.abs(distance(a,point)-preferredRange)+distance(a,enemy)*.08;
      const bScore=Math.abs(distance(b,point)-preferredRange)+distance(b,enemy)*.08;
      return aScore-bScore;
    });
  for(const cell of candidates.slice(0,24))if(workerPath(state.world,start,cell).length)return cell;
  return null;
}

export function createRtsCombatState({ buildings = [], workers = [], size = 24 } = {}) {
  const structures=buildings.map(structureFromBuilding).filter(Boolean);
  const worlds=buildWorlds(buildings,structures,size),world=worlds.world,defenderWorld=worlds.defenderWorld;
  const free = [...defenderWorld.cells].sort((a, b) => distance(a, { x: size / 2, y: size / 2 }) - distance(b, { x: size / 2, y: size / 2 }));
  const units = workers.map((worker, index) => {
    const spawn = nearestAllowed(defenderWorld, worker.position) || free[index % Math.max(1, free.length)] || { x: 0, y: 0 };
    const profile = defenderProfile(worker, index);
    return {
      id: worker.id || `worker-${index}`, name: worker.name || `Worker ${index + 1}`,
      archetype: profile.type, roleLabel: profile.label,
      x: spawn.x, y: spawn.y, hp: profile.hp, maxHp: profile.hp, alive: true, retreated: false,
      selected: false, command: 'hold', path: [], goal: null, patrol: null, focusTargetId: null,
      speed: profile.speed, range: profile.range, damage: profile.damage, attackMs: profile.attackMs,
      retreatRatio: profile.retreatRatio, cooldown: 0, supportCooldown: 0,
      heal: profile.heal || 0, healRange: profile.healRange || 0, healMs: profile.healMs || 0,
    };
  });
  const position = hqPosition(buildings, world) || { x: Math.floor(size / 2), y: Math.floor(size / 2) };
  return {
    world,defenderWorld,baseBuildings:buildings,buildings,structures,size,units,enemies:[],wave:0,phase:'ready',elapsed:0,
    hq:{hp:300,maxHp:300,position},
    inspectedEnemyId:null,message:'ready',lastEvents:[],
  };
}

export function selectedRtsUnits(state) {
  return state.units.filter(unit => unit.selected && unit.alive && !unit.retreated);
}

export function toggleRtsSelection(state, unitId, additive = true) {
  const target = state.units.find(unit => unit.id === unitId && unit.alive && !unit.retreated);
  if (!target) return state;
  if (!additive) state.units.forEach(unit => { unit.selected = false; });
  target.selected = !target.selected;
  return state;
}

export function selectAllRtsUnits(state) {
  state.units.forEach(unit => { unit.selected = unit.alive && !unit.retreated; });
  return state;
}

export function clearRtsSelection(state) {
  state.units.forEach(unit => { unit.selected = false; });
  return state;
}

export function inspectRtsEnemy(state, enemyId) {
  const enemy = state.enemies.find(item => item.id === enemyId && aliveEnemy(item));
  state.inspectedEnemyId = enemy?.id || null;
  return enemy || null;
}

export function issueRtsFocusFire(state, enemyId) {
  const target = state.enemies.find(enemy => enemy.id === enemyId && aliveEnemy(enemy));
  const units = selectedRtsUnits(state);
  if (!target || !units.length) return false;
  state.inspectedEnemyId = target.id;
  for (const unit of units) {
    unit.focusTargetId = target.id;
    unit.command = 'attack';
    unit.patrol = null;
    unit.path = [];
  }
  state.message = 'focus';
  return true;
}

export function issueRtsCommand(state, command, target = null) {
  const units = selectedRtsUnits(state);
  if (!units.length) return false;
  if (command === 'hold') {
    for (const unit of units) {
      unit.command = 'hold'; unit.path = []; unit.goal = null; unit.patrol = null; unit.focusTargetId = null;
    }
    state.message = 'holding';
    return true;
  }
  if (!target || !['move', 'patrol'].includes(command)) return false;
  const moveWorld=state.defenderWorld||state.world;
  const goals=formationGoals(moveWorld,target,units.length);
  let changed=false;
  units.forEach((unit,index)=>{
    const goal=goals[index%Math.max(1,goals.length)]||target;
    unit.focusTargetId=null;
    if(command==='move'){
      changed=assignPath(unit,moveWorld,goal)||changed;
      unit.command='move';unit.patrol=null;
    }else{
      const start=nearestAllowed(moveWorld,unit);
      if(!start)return;
      unit.patrol={a:{x:start.x,y:start.y},b:{x:goal.x,y:goal.y},next:'b'};
      changed=assignPath(unit,moveWorld,unit.patrol.b)||changed;
      unit.command='patrol';
    }
  });
  state.message = command;
  return changed;
}

export function spawnRtsWave(state) {
  if (state.phase === 'active') return false;
  state.wave += 1;
  state.phase = 'active';
  state.hq.hp = state.hq.maxHp;
  state.inspectedEnemyId = null;
  state.units.forEach(unit => {
    unit.hp = unit.maxHp; unit.alive = true; unit.retreated = false; unit.cooldown = 0; unit.supportCooldown = 0;
    unit.selected = false; unit.command = 'hold'; unit.path = []; unit.patrol = null; unit.focusTargetId = null;
  });
  const edges = edgeCells(state.world);
  const count = Math.min(14, 4 + state.wave * 2);
  state.enemies = Array.from({ length: count }, (_, index) => {
    const spawn = edges[Math.floor((index + .5) * edges.length / count) % Math.max(1, edges.length)] || { x: 0, y: 0 };
    const profile = enemyProfile(enemyTypeFor(index, state.wave), state.wave);
    return {
      id: `${profile.type}-${state.wave}-${index + 1}`, type:profile.type, label:profile.label, role:profile.role, threat:profile.threat,
      x: spawn.x, y: spawn.y, hp: profile.hp, maxHp: profile.hp, alive: true, path: [], goal: null, targetId: null,
      speed: profile.speed, damage: profile.damage, attackMs:profile.attackMs, cooldown: 0,
      range: profile.range, minRange: profile.minRange || 0, preferredRange: profile.preferredRange || profile.range * .8,
      tacticCooldown:0,
    };
  });
  state.message = 'wave';
  return true;
}

function processPatrol(state,unit){
  if(unit.command!=='patrol'||unit.path.length||!unit.patrol)return;
  const goal=unit.patrol.next==='b'?unit.patrol.a:unit.patrol.b;
  unit.patrol.next=unit.patrol.next==='b'?'a':'b';
  assignPath(unit,state.defenderWorld||state.world,goal);
}

function processRetreat(state, unit, events) {
  if (!unit.alive || unit.retreated || unit.command === 'retreat' || unit.hp > unit.maxHp * unit.retreatRatio) return;
  unit.command = 'retreat'; unit.patrol = null; unit.selected = false; unit.focusTargetId = null;
  if (!assignPath(unit, state.defenderWorld||state.world, state.hq.position)) {
    unit.retreated = true; unit.path = [];
  }
  events.push({ type: 'retreat', unitId: unit.id });
}

function processMedicSupport(state, unit, events) {
  if (!unit.heal || unit.supportCooldown > 0 || !activeUnit(unit)) return;
  const patient = state.units.filter(activeUnit)
    .filter(ally => ally.id !== unit.id && ally.hp < ally.maxHp && distance(unit, ally) <= unit.healRange)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
  if (!patient) return;
  const before = patient.hp;
  patient.hp = clamp(patient.hp + unit.heal, 0, patient.maxHp);
  unit.supportCooldown = unit.healMs;
  events.push({ type:'heal', from:unit.id, to:patient.id, amount:patient.hp - before });
}

function focusedEnemy(state, unit) {
  return unit.focusTargetId ? state.enemies.find(enemy => enemy.id === unit.focusTargetId && aliveEnemy(enemy)) || null : null;
}

function firingPosition(state,unit,target){
  const world=state.defenderWorld||state.world,start=workerAnchor(world,unit);
  if(!start)return null;
  const candidates=world.cells.filter(cell=>distance(cell,target)<=unit.range*.92)
    .filter(cell=>hasRtsLineOfSight(state,cell,target))
    .sort((a,b)=>distance(a,unit)-distance(b,unit));
  for(const cell of candidates.slice(0,30))if(workerPath(world,start,cell).length)return cell;
  return null;
}

function processAttackMovement(state,unit,deltaMs){
  if(unit.command!=='attack')return;
  const target=focusedEnemy(state,unit);
  if(!target){unit.command='hold';unit.focusTargetId=null;unit.path=[];return;}
  const d=distance(unit,target),los=hasRtsLineOfSight(state,unit,target),world=state.defenderWorld||state.world;
  if(d<=unit.range*.92&&los){unit.path=[];return;}
  const goal=firingPosition(state,unit,target);
  if(goal&&(!unit.path.length||!unit.goal||distance(unit.goal,goal)>.5))assignPath(unit,world,goal);
  if(unit.path.length)moveEntity(unit,world,deltaMs,unit.speed);
}

function processUnitCombat(state, unit, events) {
  if (!activeUnit(unit)) return;
  let target = focusedEnemy(state, unit);
  if (!target) {
    target = state.enemies.filter(aliveEnemy)
      .filter(enemy => distance(unit, enemy) <= unit.range)
      .sort((a, b) => distance(unit, a) - distance(unit, b))[0];
  }
  if(!target||distance(unit,target)>unit.range||unit.cooldown>0||!hasRtsLineOfSight(state,unit,target))return;
  const cover=unit.archetype==='bruiser'?0:rtsCoverForTarget(state,unit,target);
  const dealt=Math.max(1,Math.round(unit.damage*(1-cover)));
  target.hp-=dealt;
  unit.cooldown=unit.attackMs;
  if (target.hp <= 0) {
    target.hp = 0; target.alive = false; target.path = [];
    if (state.inspectedEnemyId === target.id) state.inspectedEnemyId = null;
    for (const defender of state.units) if (defender.focusTargetId === target.id) {
      defender.focusTargetId = null;
      if (defender.command === 'attack') defender.command = 'hold';
    }
  }
  events.push({type:unit.archetype==='bruiser'?'melee':'shot',from:unit.id,to:target.id,damage:dealt,covered:Boolean(cover),killed:!target.alive});
}

function enemyAttack(state,enemy,target,events){
  if(enemy.cooldown>0)return;
  enemy.cooldown=enemy.attackMs;
  if(target.type==='unit'){
    const cover=enemy.role==='ranged'?rtsCoverForTarget(state,enemy,target.entity):0;
    const dealt=Math.max(1,Math.round(enemy.damage*(1-cover)));
    target.entity.hp=clamp(target.entity.hp-dealt,0,target.entity.maxHp);
    if(target.entity.hp<=0){
      target.entity.alive=false;target.entity.selected=false;target.entity.path=[];target.entity.focusTargetId=null;
      events.push({type:'unit_down',unitId:target.entity.id,enemyId:enemy.id});
    }else events.push({type:'enemy_hit',enemyId:enemy.id,unitId:target.entity.id,ranged:enemy.role==='ranged',covered:Boolean(cover),damage:dealt});
  }else if(target.type==='structure'){
    const structure=target.entity;
    structure.hp=clamp(structure.hp-enemy.damage,0,structure.maxHp);
    events.push({type:'structure_hit',enemyId:enemy.id,structureId:structure.id,damage:enemy.damage});
    if(structure.hp<=0&&structure.alive){
      structure.alive=false;structure.cooldown=0;rebuildNavigation(state);
      events.push({type:'structure_down',enemyId:enemy.id,structureId:structure.id,kind:structure.kind});
    }
  }else{
    state.hq.hp=clamp(state.hq.hp-enemy.damage,0,state.hq.maxHp);
    events.push({type:'hq_hit',enemyId:enemy.id,ranged:enemy.role==='ranged'});
  }
}

function processRangedEnemy(state,enemy,target,deltaMs,events){
  const point=targetPoint(state,target),d=distance(enemy,point),ignore=target.type==='structure'?[target.entity.buildingId]:[];
  if(d>=enemy.minRange&&d<=enemy.range&&hasRtsLineOfSight(state,enemy,point,{ignoreIds:ignore})){
    enemy.path=[];enemyAttack(state,enemy,target,events);return;
  }
  enemy.tacticCooldown-=deltaMs;
  if(enemy.tacticCooldown<=0||!enemy.path.length){
    enemy.tacticCooldown=550;
    const goal=rangedPosition(state,enemy,target,enemy.preferredRange);
    if(goal)assignPath(enemy,state.world,goal);else refreshEnemyPath(state,enemy,target,true);
  }
  moveEntity(enemy,state.world,deltaMs,enemy.speed);
}

function processEnemy(state, enemy, deltaMs, events) {
  if (!aliveEnemy(enemy)) return;
  const target = chooseEnemyTarget(state, enemy);
  const point = targetPoint(state, target);
  if (enemy.role === 'ranged') {
    processRangedEnemy(state, enemy, target, deltaMs, events);
    return;
  }
  const meleeDistance=target.type==='structure'
    ? Math.max(.65,distance(enemy,point)-Math.max(target.entity.footprint.width,target.entity.footprint.height)*.35)
    : distance(enemy,point);
  if(meleeDistance<=enemy.range){
    enemy.path=[];enemyAttack(state,enemy,target,events);return;
  }
  enemy.tacticCooldown -= deltaMs;
  if (enemy.tacticCooldown <= 0 || !enemy.path.length) {
    enemy.tacticCooldown = enemy.role === 'siege' ? 700 : 450;
    refreshEnemyPath(state, enemy, target, true);
  }
  moveEntity(enemy, state.world, deltaMs, enemy.speed);
}

function clearKilledEnemyReferences(state,target){
  if(state.inspectedEnemyId===target.id)state.inspectedEnemyId=null;
  for(const defender of state.units)if(defender.focusTargetId===target.id){
    defender.focusTargetId=null;if(defender.command==='attack')defender.command='hold';
  }
}

function processTurrets(state,dt,events){
  for(const turret of state.structures.filter(item=>item.alive&&item.kind==='turret')){
    turret.cooldown=Math.max(0,turret.cooldown-dt);
    if(turret.cooldown>0)continue;
    const target=state.enemies.filter(aliveEnemy)
      .filter(enemy=>distance(turret.position,enemy)<=turret.range)
      .filter(enemy=>hasRtsLineOfSight(state,turret.position,enemy,{ignoreIds:[turret.buildingId]}))
      .sort((a,b)=>distance(turret.position,a)-distance(turret.position,b))[0];
    if(!target)continue;
    const cover=rtsCoverForTarget(state,turret.position,target),dealt=Math.max(1,Math.round(turret.damage*(1-cover)));
    target.hp-=dealt;turret.cooldown=turret.attackMs;
    if(target.hp<=0){target.hp=0;target.alive=false;target.path=[];clearKilledEnemyReferences(state,target);}
    events.push({type:'turret_shot',from:turret.id,to:target.id,damage:dealt,covered:Boolean(cover),killed:!target.alive});
  }
}

export function stepRtsCombat(state, deltaMs) {
  const dt = Math.min(100, Math.max(0, Number(deltaMs) || 0));
  const events = [];
  if (!dt || state.phase !== 'active') { state.lastEvents = events; return events; }
  state.elapsed += dt;
  for (const unit of state.units) {
    unit.cooldown = Math.max(0, unit.cooldown - dt);
    unit.supportCooldown = Math.max(0, unit.supportCooldown - dt);
    processRetreat(state, unit, events);
    if (!unit.alive || unit.retreated) continue;
    if (unit.command === 'retreat') {
      if(unit.path.length)moveEntity(unit,state.defenderWorld||state.world,dt,unit.speed*1.2);
      if (!unit.path.length) { unit.retreated = true; events.push({ type:'retreated', unitId:unit.id }); }
      continue;
    }
    if (unit.command === 'attack') processAttackMovement(state, unit, dt);
    else if(unit.path.length)moveEntity(unit,state.defenderWorld||state.world,dt,unit.speed);
    else if (unit.command === 'move') unit.command = 'hold';
    processPatrol(state, unit);
    processMedicSupport(state, unit, events);
    processUnitCombat(state, unit, events);
  }
  processTurrets(state,dt,events);
  for(const enemy of state.enemies){
    enemy.cooldown=Math.max(0,enemy.cooldown-dt);
    processEnemy(state,enemy,dt,events);
  }

  const enemiesAlive = state.enemies.filter(aliveEnemy).length;
  const defendersAvailable = state.units.filter(activeUnit).length;
  if (state.hq.hp <= 0) {
    state.phase = 'defeat'; state.message = 'hq_lost';
  } else if (state.enemies.length && enemiesAlive === 0) {
    state.phase = 'victory'; state.message = 'victory';
  } else if (!defendersAvailable && state.enemies.length && enemiesAlive > 0) {
    state.message = 'defenders_down';
  }
  state.lastEvents = events;
  return events;
}

export function rtsCombatSummary(state) {
  const inspected = state.enemies.find(enemy => enemy.id === state.inspectedEnemyId && aliveEnemy(enemy)) || null;
  return {
    phase: state.phase, wave: state.wave,
    selected: selectedRtsUnits(state).length,
    defendersAlive: state.units.filter(unit => unit.alive && !unit.retreated).length,
    defendersRetreated: state.units.filter(unit => unit.retreated).length,
    enemiesAlive: state.enemies.filter(aliveEnemy).length,
    enemiesTotal: state.enemies.length,
    hqHp: state.hq.hp, hqMaxHp: state.hq.maxHp,
    message:state.message,
    turretsAlive:state.structures.filter(item=>item.kind==='turret'&&item.alive).length,
    turretsTotal:state.structures.filter(item=>item.kind==='turret').length,
    fortificationsAlive:state.structures.filter(item=>item.kind!=='turret'&&item.alive).length,
    fortificationsTotal:state.structures.filter(item=>item.kind!=='turret').length,
    inspectedEnemy: inspected ? {
      id:inspected.id, type:inspected.type, label:inspected.label, role:inspected.role, threat:inspected.threat,
      hp:inspected.hp, maxHp:inspected.maxHp,
      focusedBy:state.units.filter(unit => unit.focusTargetId === inspected.id && activeUnit(unit)).length,
    } : null,
    units: state.units.map(unit => ({
      id:unit.id, name:unit.name, archetype:unit.archetype, roleLabel:unit.roleLabel,
      hp:unit.hp, maxHp:unit.maxHp, alive:unit.alive, retreated:unit.retreated,
      selected:unit.selected, command:unit.command, focusTargetId:unit.focusTargetId,
      range:unit.range, damage:unit.damage,
    })),
    enemies:state.enemies.map(enemy=>({
      id:enemy.id,type:enemy.type,label:enemy.label,role:enemy.role,threat:enemy.threat,
      hp:enemy.hp,maxHp:enemy.maxHp,alive:enemy.alive,x:enemy.x,y:enemy.y,
      focusedBy:state.units.filter(unit=>unit.focusTargetId===enemy.id&&activeUnit(unit)).length,
    })),
    structures:state.structures.map(structure=>({
      id:structure.id,buildingId:structure.buildingId,type:structure.type,kind:structure.kind,
      hp:structure.hp,maxHp:structure.maxHp,alive:structure.alive,position:structure.position,
    })),
  };
}
