import test from "node:test";
import assert from "node:assert/strict";
import { getSettlementOperatingCosts, applySettlementOperatingCosts } from "../src/utils/settlementOperatingCosts.js";

const building=(id,type,extra={})=>({id,type,state:"active",condition:100,rooms:[],...extra});
const worker=(id,type,targetBuildingId)=>({id,name:id,health:100,status:"working",settlementAction:{type,...(targetBuildingId?{targetBuildingId}:{})}});

test("operating costs include building upkeep and active worker wages",()=>{
  const s={
    resources:{caps:100},
    buildings:[building("store","trading_post"),building("scrap","scrap_yard")],
    settlers:[worker("merchant","business","store"),worker("scav","scavenging","scrap")],
  };
  const costs=getSettlementOperatingCosts(s);
  assert.equal(costs.workerCount,2);
  assert.equal(costs.wages,4);
  assert.ok(costs.buildingUpkeep>0);
  assert.equal(costs.daily,costs.wages+costs.buildingUpkeep);
});

test("operating costs create maintenance debt instead of negative caps",()=>{
  const s={
    resources:{caps:1},
    maintenanceDebt:3,
    buildings:[building("store","trading_post")],
    settlers:[worker("merchant","business","store")],
    events:[],
  };
  const costs=getSettlementOperatingCosts(s);
  const next=applySettlementOperatingCosts(s,1234);
  assert.equal(next.resources.caps,0);
  assert.equal(next.maintenanceDebt,costs.due-1);
  assert.equal(next.events[0].type,"operating_cost");
  assert.equal(next.events[0].paid,1);
});

test("maintenance debt is repaid from later treasury before it disappears",()=>{
  const s={
    resources:{caps:100},
    maintenanceDebt:7,
    buildings:[],
    settlers:[],
    events:[],
  };
  const next=applySettlementOperatingCosts(s,1234);
  assert.equal(next.maintenanceDebt,0);
  assert.equal(next.resources.caps,93);
});
