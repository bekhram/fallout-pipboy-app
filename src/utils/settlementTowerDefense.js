import { SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE } from "../data/settlement/buildings.js";
import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";

const WALL_TYPES = new Set(["wall_straight", "wall_corner", "wall_corner_reverse", "gate"]);
const TURRET_TYPES = new Set(["turret","machine_gun_turret","heavy_machine_gun_turret","laser_turret","heavy_laser_turret","shotgun_turret","spotlight_turret"]);
const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
const key=(x,y)=>`${x},${y}`;
const manhattan=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);

function cellsFor(building){
  const f=SETTLEMENT_BUILDINGS[building?.type]?.footprint || {width:1,height:1};
  const out=[];
  for(let y=building.y;y<building.y+f.height;y++)for(let x=building.x;x<building.x+f.width;x++)out.push({x,y});
  return out;
}

function hqGoalCells(settlement){
  const hq=(settlement.buildings||[]).find(b=>b.type==="settlement_hq");
  if(!hq)return [{x:Math.floor(SETTLEMENT_GRID_SIZE/2),y:Math.floor(SETTLEMENT_GRID_SIZE/2)}];
  const occupied=new Set(cellsFor(hq).map(c=>key(c.x,c.y))), goals=[];
  for(const c of cellsFor(hq))for(const [dx,dy] of DIRS){
    const x=c.x+dx,y=c.y+dy,k=key(x,y);
    if(x>=0&&y>=0&&x<SETTLEMENT_GRID_SIZE&&y<SETTLEMENT_GRID_SIZE&&!occupied.has(k)&&!goals.some(g=>g.x===x&&g.y===y))goals.push({x,y});
  }
  return goals;
}

function barrierMap(settlement){
  const map=new Map();
  for(const b of settlement.buildings||[]){
    if(!WALL_TYPES.has(b.type)||Number(b.condition??100)<=0||b.state==="destroyed")continue;
    for(const c of cellsFor(b))map.set(key(c.x,c.y),b.id);
  }
  return map;
}

function pathToGoals(start,goals,barriers){
  const goalKeys=new Set(goals.map(g=>key(g.x,g.y)));
  const q=[start], prev=new Map([[key(start.x,start.y),null]]);
  for(let i=0;i<q.length;i++){
    const p=q[i],pk=key(p.x,p.y);
    if(goalKeys.has(pk)){
      const path=[];let cur=p;
      while(cur){path.push(cur);cur=prev.get(key(cur.x,cur.y));}
      return path.reverse();
    }
    for(const [dx,dy] of DIRS){
      const x=p.x+dx,y=p.y+dy,k=key(x,y);
      if(x<0||y<0||x>=SETTLEMENT_GRID_SIZE||y>=SETTLEMENT_GRID_SIZE||barriers.has(k)||prev.has(k))continue;
      const n={x,y};prev.set(k,p);q.push(n);
    }
  }
  return [];
}

function spawnPoints(count){
  const result=[];
  const edges=[];
  for(let i=0;i<SETTLEMENT_GRID_SIZE;i++){edges.push({x:i,y:0},{x:i,y:SETTLEMENT_GRID_SIZE-1},{x:0,y:i},{x:SETTLEMENT_GRID_SIZE-1,y:i});}
  for(let i=0;i<count;i++)result.push(edges[Math.floor((i+.5)*edges.length/count)%edges.length]);
  return result;
}

function turretProfile(building){
  const defense=Math.max(0,Number(getRulebookBuilding(building.type)?.effects?.defense||0));
  if(building.type==="spotlight_turret")return {range:5,damage:1};
  if(building.type==="shotgun_turret")return {range:3,damage:5};
  if(building.type==="heavy_laser_turret")return {range:6,damage:7};
  if(building.type==="laser_turret")return {range:5,damage:5};
  if(building.type==="heavy_machine_gun_turret")return {range:5,damage:5};
  return {range:4,damage:Math.max(3,defense)};
}

export function getSettlementTurretFirepower(settlement){
  const power=resolveSettlementPower(settlement);
  const turrets=(settlement.buildings||[]).filter(b=>{
    if(!TURRET_TYPES.has(b.type) || b.state!=="active" || Number(b.condition??100)<=0 || b.autoDisabled)return false;
    const effects=getRulebookBuilding(b.type)?.effects||{};
    const required=Math.max(0,Number(effects.requiresPower||0));
    return !required || power.poweredBuildingIds.has(b.id);
  }).map(b=>({id:b.id,type:b.type,...turretProfile(b)}));
  return {
    count:turrets.length,
    firepower:turrets.reduce((sum,t)=>sum+Number(t.damage||0),0),
    turrets,
  };
}

function enemyHp(faction,strength){
  const base=faction==="super_mutants"?16:faction==="feral_ghouls"?9:11;
  return base+Math.floor(Math.max(0,Number(strength||0))/6)*2;
}

function nearestBarrier(enemy,settlement,goals){
  const candidates=(settlement.buildings||[]).filter(b=>WALL_TYPES.has(b.type)&&Number(b.condition??100)>0&&b.state!=="destroyed");
  if(!candidates.length)return null;
  return candidates.map(b=>{
    const cells=cellsFor(b);
    const dist=Math.min(...cells.map(c=>manhattan(enemy,c)));
    const goalDist=Math.min(...cells.map(c=>Math.min(...goals.map(g=>manhattan(c,g)))));
    return {building:b,dist,score:dist+goalDist*.25};
  }).sort((a,b)=>a.score-b.score)[0]?.building||null;
}

export function stealSettlementResources(settlement, percent){
  const p=Math.max(10,Math.min(50,Math.floor(Number(percent)||10)));
  const ratio=p/100;
  const source=settlement.stockpile||{}, mats=source.materials||{}, provisions=source.provisions||{};
  const claimable=settlement.profit?.claimable||{};
  const stolen={
    percent:p,
    caps:Math.floor(Number(settlement.resources?.caps||0)*ratio),
    common:Math.floor(Number(mats.common||0)*ratio),
    uncommon:Math.floor(Number(mats.uncommon||0)*ratio),
    rare:Math.floor(Number(mats.rare||0)*ratio),
    food:Math.floor(Number(provisions.food||0)*ratio),
    water:Math.floor(Number(provisions.water||0)*ratio),
    foragingItems:Math.floor(Number(source.foragingItems||0)*ratio),
    claimableCaps:Math.floor(Number(claimable.caps||0)*ratio),
    claimableFood:Math.floor(Number(claimable.food||0)*ratio),
    claimableWater:Math.floor(Number(claimable.water||0)*ratio),
  };
  const items=(source.items||[]).map(item=>{
    const quantity=Math.max(0,Number(item.quantity??item.qty??1));
    const lost=Math.floor(quantity*ratio);
    return {...item,quantity:Math.max(0,quantity-lost)};
  }).filter(item=>Number(item.quantity||0)>0);
  return {
    settlement:{
      ...settlement,
      resources:{...(settlement.resources||{}),caps:Math.max(0,Number(settlement.resources?.caps||0)-stolen.caps),materials:Math.max(0,Number(mats.common||0)-stolen.common)},
      stockpile:{...source,materials:{
        common:Math.max(0,Number(mats.common||0)-stolen.common),
        uncommon:Math.max(0,Number(mats.uncommon||0)-stolen.uncommon),
        rare:Math.max(0,Number(mats.rare||0)-stolen.rare),
      },provisions:{
        food:Math.max(0,Number(provisions.food||0)-stolen.food),
        water:Math.max(0,Number(provisions.water||0)-stolen.water),
      },foragingItems:Math.max(0,Number(source.foragingItems||0)-stolen.foragingItems),items},
      profit:{...(settlement.profit||{}),claimable:{
        caps:Math.max(0,Number(claimable.caps||0)-stolen.claimableCaps),
        food:Math.max(0,Number(claimable.food||0)-stolen.claimableFood),
        water:Math.max(0,Number(claimable.water||0)-stolen.claimableWater),
      }},
    },
    stolen,
  };
}

export function simulateSettlementTowerDefense(settlement,attack,{random=Math.random,maxRounds=40}={}){
  const power=resolveSettlementPower(settlement), goals=hqGoalCells(settlement);
  const turretBuildings=(settlement.buildings||[]).filter(b=>TURRET_TYPES.has(b.type)&&b.state==="active"&&Number(b.condition??100)>0&&!b.autoDisabled&&power.poweredBuildingIds.has(b.id));
  const turrets=turretBuildings.map(b=>({id:b.id,type:b.type,pos:cellsFor(b)[0],...turretProfile(b),shots:0,kills:0,damageDone:0}));
  const count=Math.max(2,Math.min(12,Math.ceil(Math.max(1,Number(attack?.strength||1))/2)));
  const spawns=spawnPoints(count);
  const hp=enemyHp(attack?.faction,attack?.strength);
  const enemies=spawns.map((pos,i)=>({id:`enemy-${i}`,x:pos.x,y:pos.y,hp,maxHp:hp,alive:true,reached:false}));
  const enemyStarts=enemies.map(({id,x,y,hp:maxEnemyHp,maxHp})=>({id,x,y,hp:maxEnemyHp,maxHp}));
  let working={...settlement,buildings:(settlement.buildings||[]).map(b=>({...b}))};
  const destroyedWalls=[], rounds=[];
  let breached=0;

  for(let round=1;round<=maxRounds;round++){
    const alive=enemies.filter(e=>e.alive&&!e.reached);
    if(!alive.length)break;
    const shotLog=[];
    for(const turret of turrets){
      const targets=alive.filter(e=>e.alive&&!e.reached&&manhattan(turret.pos,e)<=turret.range).sort((a,b)=>manhattan(turret.pos,a)-manhattan(turret.pos,b));
      const target=targets[0];if(!target)continue;
      target.hp-=turret.damage;turret.shots++;turret.damageDone+=turret.damage;
      if(target.hp<=0){target.alive=false;turret.kills++;}
      shotLog.push({turretId:turret.id,targetId:target.id,damage:turret.damage,killed:!target.alive});
    }

    const moveLog=[];
    for(const enemy of enemies.filter(e=>e.alive&&!e.reached)){
      const barriers=barrierMap(working);
      const path=pathToGoals({x:enemy.x,y:enemy.y},goals,barriers);
      if(path.length>1){
        enemy.x=path[1].x;enemy.y=path[1].y;
        if(goals.some(g=>g.x===enemy.x&&g.y===enemy.y)){enemy.reached=true;breached++;moveLog.push({enemyId:enemy.id,reached:true});}
        else moveLog.push({enemyId:enemy.id,x:enemy.x,y:enemy.y});
        continue;
      }
      if(path.length===1){enemy.reached=true;breached++;moveLog.push({enemyId:enemy.id,reached:true});continue;}
      const wall=nearestBarrier(enemy,working,goals);
      if(wall){
        const damage=attack?.faction==="super_mutants"?40:attack?.faction==="feral_ghouls"?25:30;
        working={...working,buildings:working.buildings.map(b=>{
          if(b.id!==wall.id)return b;
          const condition=Math.max(0,Number(b.condition??100)-damage);
          if(condition<=0&&!destroyedWalls.includes(b.id))destroyedWalls.push(b.id);
          return {...b,condition,state:condition<=0?"destroyed":b.state};
        })};
        moveLog.push({enemyId:enemy.id,attackedWall:wall.id,damage});
      }
    }
    rounds.push({round,shots:shotLog,moves:moveLog,alive:enemies.filter(e=>e.alive&&!e.reached).length,breached});
    if(breached>0)break;
  }

  const defeated=enemies.filter(e=>!e.alive).length;
  const victory=breached===0&&defeated===enemies.length;
  let stolen=null;
  if(breached>0){
    const percent=10+Math.floor(random()*41);
    const theft=stealSettlementResources(working,percent);working=theft.settlement;stolen=theft.stolen;
  }
  return {
    settlement:working,
    result:victory?"victory":"defeat",
    report:{
      mode:"tower_defense",rounds:rounds.length,enemyCount:count,enemiesDefeated:defeated,enemiesBreached:breached,
      turretCount:turrets.length,turretShots:turrets.reduce((s,t)=>s+t.shots,0),turretKills:turrets.reduce((s,t)=>s+t.kills,0),
      turretDamage:turrets.reduce((s,t)=>s+t.damageDone,0),destroyedWalls,stolen,
      visualReplay:{
        enemyStarts,
        turrets:turrets.map(({id,type,pos,range,damage})=>({id,type,x:pos.x,y:pos.y,range,damage})),
        rounds,
        goals,
      },
      roundLog:rounds.slice(-10),
    },
  };
}
