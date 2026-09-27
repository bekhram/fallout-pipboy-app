export const VEHICLE_QUALITIES = [
  "Cargo",
  "Cumbersome",
  "Enclosed",
  "Exposed",
  "High-Performance",
  "High-Quality Engine",
  "Nuclear Powered",
  "All-Terrain",
  "Rugged",
  "Single-Seater",
  "Flying",
  "Watercraft",
];

export const VEHICLE_MATERIALS = [
  "Common Scrap",
  "Special Scrap",
  "Rare Scrap",
];

const loc = (roll, name, physical, energy) => ({ roll, name, physical, energy });
const weapon = (name, damage, effects, type, fireRate, range, qualities = "") => ({
  name, damage, effects, type, fireRate, range, qualities,
});

export const STOCK_VEHICLES = [
  {
    id: "car", name: "Car", scale: 2, maxHp: 28, cover: "2", speedZones: 2, speedMph: 50,
    passengers: "5", impact: 5, cargo: 100, qualities: ["Cargo", "Exposed"],
    locations: [loc("1-8", "Chassis", 3, 3), loc("9-10", "Front Left Wheel", 1, 1), loc("11-12", "Front Right Wheel", 1, 1), loc("13-16", "Engine", 3, 2), loc("17-18", "Rear Left Wheel", 1, 1), loc("19-20", "Rear Right Wheel", 1, 1)],
  },
  {
    id: "sports-car", name: "Sports Car", scale: 2, maxHp: 22, cover: "2", speedZones: 3, speedMph: 75,
    passengers: "2", impact: 6, cargo: 50, qualities: ["Cargo", "Exposed", "High-Performance"],
    locations: [loc("1-7", "Chassis", 3, 3), loc("8-9", "Front Left Wheel", 1, 1), loc("10-11", "Front Right Wheel", 1, 1), loc("12-16", "Engine", 3, 2), loc("17-18", "Rear Left Wheel", 1, 1), loc("19-20", "Rear Right Wheel", 1, 1)],
  },
  {
    id: "motorcycle", name: "Motorcycle", scale: 0, maxHp: 10, cover: "0", speedZones: 2, speedMph: 60,
    passengers: "2", impact: 4, cargo: 25, qualities: ["Cargo", "Exposed", "Single-Seater"],
    locations: [loc("1-7", "Chassis", 2, 2), loc("8-11", "Front Wheel", 1, 1), loc("12-16", "Engine", 2, 1), loc("17-20", "Rear Wheel", 1, 1)],
  },
  {
    id: "pickup-truck", name: "Pick-Up Truck", scale: 2, maxHp: 32, cover: "3", speedZones: 2, speedMph: 40,
    passengers: "3", impact: 7, cargo: 200, qualities: ["Cargo", "Exposed", "Rugged"],
    locations: [loc("1-8", "Chassis", 4, 4), loc("9-10", "Front Left Wheel", 2, 1), loc("11-12", "Front Right Wheel", 2, 1), loc("13-16", "Engine", 4, 3), loc("17-18", "Rear Left Wheel", 2, 1), loc("19-20", "Rear Right Wheel", 2, 1)],
  },
  {
    id: "bus", name: "Bus", scale: 3, maxHp: 40, cover: "3", speedZones: 2, speedMph: 40,
    passengers: "30", impact: 8, cargo: 400, qualities: ["Cargo", "Exposed"],
    locations: [loc("1-8", "Chassis", 4, 3), loc("9-10", "Front Left Wheel", 1, 1), loc("11-12", "Front Right Wheel", 1, 1), loc("13-16", "Engine", 4, 3), loc("17", "Rear Left Wheel 1", 1, 1), loc("18", "Rear Left Wheel 2", 1, 1), loc("19", "Rear Right Wheel 1", 1, 1), loc("20", "Rear Right Wheel 2", 1, 1)],
  },
  {
    id: "armored-truck", name: "Armored Truck", scale: 2, maxHp: 32, cover: "Enclosed", speedZones: 2, speedMph: 40,
    passengers: "3", impact: 8, cargo: 400, qualities: ["Cargo", "Enclosed"],
    locations: [loc("1-8", "Chassis", 8, 8), loc("9-10", "Front Left Wheel", 4, 3), loc("11-12", "Front Right Wheel", 4, 3), loc("13-16", "Engine", 7, 6), loc("17-18", "Rear Left Wheel", 4, 3), loc("19-20", "Rear Right Wheel", 4, 3)],
  },
  {
    id: "apc", name: "Armored Personnel Carrier", scale: 3, maxHp: 50, cover: "Enclosed", speedZones: 2, speedMph: 40,
    passengers: "6 (+2 in Power Armor)", impact: 9, cargo: 500, qualities: ["Cargo", "Rugged"],
    locations: [loc("1-10", "Chassis", 12, 11), loc("11", "Front Left Wheel", 5, 4), loc("12", "Front Right Wheel", 5, 4), loc("13-16", "Engine", 8, 7), loc("17", "Middle Left Wheel", 5, 4), loc("18", "Middle Right Wheel", 5, 4), loc("19", "Rear Left Wheel", 5, 4), loc("20", "Rear Right Wheel", 5, 4)],
    weapons: [weapon("105mm Cannon", 11, "Breaking, Piercing 2", "Physical", 0, "L", "Accurate"), weapon("2× Minigun", 3, "Burst, Spread", "Physical", 5, "M", "Gatling, Inaccurate")],
  },
  {
    id: "vertibird", name: "Vertibird", scale: 4, maxHp: 70, cover: "Exposed", speedZones: 6, speedMph: 500,
    passengers: "8", impact: 10, cargo: 300, qualities: ["Flying", "High-Performance", "Cargo"],
    locations: [loc("1-2", "Left Engine", 6, 6), loc("3-4", "Right Engine", 6, 6), loc("5-10", "Chassis", 9, 8), loc("11-13", "Left Wing", 8, 8), loc("14-16", "Right Wing", 8, 8), loc("17-18", "Weapon (Nose Guns)", 5, 4), loc("19-20", "Weapon (Door Gun)", 5, 4)],
    weapons: [weapon("Twin .50 Machine Guns", 7, "Burst", "Physical", 6, "M"), weapon("Gatling Laser", 3, "Burst, Piercing", "Energy", 6, "M", "Gatling, Inaccurate")],
  },
];

export const VEHICLE_CREW_ROLES = [
  { id:"pilot", label:"Pilot", skill:"Pilot", description:"Controls vehicle movement. Most vehicles require one Pilot." },
  { id:"gunner", label:"Gunner", skill:"Mounted weapon", description:"Operates a mounted weapon. A gunner normally fires only one mounted weapon per turn." },
  { id:"additional", label:"Additional Role", skill:"Varies", description:"Operates non-movement/non-attack equipment such as radio, bombardier station, or other systems." },
];

export const VEHICLE_MOVEMENT_ACTIONS = {
  maneuver:{id:"maneuver",label:"Maneuver",action:"minor",zones:"close",description:"Move to anywhere within Close range."},
  careful:{id:"careful",label:"Careful Piloting",action:"major",description:"Move zones equal to half Speed, rounded up. Terrain test difficulty −1."},
  hasty:{id:"hasty",label:"Hasty Piloting",action:"major",description:"Move zones equal to Speed. Crew/passenger skill tests are +1 difficulty until the start of the Pilot's next turn."},
  defensive:{id:"defensive",label:"Defensive Piloting",action:"major",description:"Move Speed −1 zones, then AGI + Pilot test with difficulty equal to Scale; success grants +1 Defense."},
  focused:{id:"focused",label:"Focused Driving",action:"major",description:"AGI + Pilot D1. Move Speed zones plus +1 zone per AP spent. Crew/passenger skill tests are +1 difficulty until the Pilot's next turn."},
};

export const VEHICLE_OUT_OF_CONTROL = [
  {id:"jarring_stop",label:"Jarring Stop",effect:"Vehicle stops immediately. Each character aboard suffers 3 CD Stun Physical damage."},
  {id:"skid",label:"Skid",effect:"Move one zone in a random direction; if colliding, inflict 1 CD Piercing 1 Physical damage to the vehicle plus +1 CD per zone moved."},
  {id:"spin",label:"Spin",effect:"Lose remaining movement and turn to face a different direction. Next movement action difficulty +1, or rest if stationary."},
  {id:"stuck",label:"Stuck",effect:"Lose remaining movement. Vehicle cannot move until obstruction is removed or Pilot succeeds on difficulty 2 AGL + Pilot."},
  {id:"plummet",label:"Plummet",effect:"Flying only: descend uncontrolled by one zone forward and three zones down. Crash for 4 CD Piercing 2 Physical damage, +2 CD per extra zone before impact."},
];

export const VEHICLE_FUEL_USAGE = {
  0:{standard:40,highQuality:48},
  1:{standard:35,highQuality:42},
  2:{standard:30,highQuality:36},
  3:{standard:25,highQuality:30},
  4:{standard:20,highQuality:24},
  5:{standard:15,highQuality:18},
};

export const VEHICLE_INJURIES = [
  {id:"chassis",label:"Chassis Injury",effect:"Attacks against the vehicle deal +2 CD additional damage."},
  {id:"engine",label:"Engine Injury",effect:"At start of each turn reduce Fuel Track by 1. If vehicle reaches 0 HP with an Engine Injury, it may explode."},
  {id:"weapon",label:"Weapon Injury",effect:"The associated weapon system is disabled until repaired."},
  {id:"mobility",label:"Wheel / Wing / Rudder Injury",effect:"Pilot tests +1 difficulty and Speed is reduced by 1 until repaired."},
];

export function vehicleFuelMilesPerPoint(vehicle = {}) {
  const scale=Math.max(0,Math.min(5,Math.floor(Number(vehicle?.scale)||0)));
  const highQuality=(vehicle?.qualities||[]).includes("High-Quality Engine");
  const base=VEHICLE_FUEL_USAGE[scale]||VEHICLE_FUEL_USAGE[5];
  const allTerrain=(vehicle?.qualities||[]).includes("All-Terrain");
  return {miles:highQuality?base.highQuality:base.standard,allTerrain,scale};
}

export function consumeVehicleFuel(vehicle = {}, miles = 0, { difficultTerrain=false } = {}) {
  const info=vehicleFuelMilesPerPoint(vehicle);
  const effectiveMiles=Math.max(0,Number(miles)||0)*(difficultTerrain&&!info.allTerrain?1.25:1);
  const points=effectiveMiles<=0?0:Math.ceil(effectiveMiles/Math.max(1,info.miles));
  const current=Math.max(0,Number(vehicle?.fuelCurrent??vehicle?.fuelMax??0));
  const next=Math.max(0,current-points);
  return {...vehicle,fuelCurrent:next,speedZones:next<=0?0:Number(vehicle?.speedZones||0),lastFuelUse:{miles:effectiveMiles,points}};
}

export function vehicleMovementPlan(vehicle = {}, actionId = "maneuver", apSpent = 0) {
  const injuries=Array.isArray(vehicle?.injuries)?vehicle.injuries:[];
  const hasMobility=injuries.some((entry)=>entry?.id==="mobility");
  const speed=Math.max(0,Number(vehicle?.speedZones||0)-(hasMobility?1:0));
  const scale=Math.max(0,Number(vehicle?.scale||0));
  const pilotPenalty=hasMobility?1:0;
  const action=VEHICLE_MOVEMENT_ACTIONS[actionId]||VEHICLE_MOVEMENT_ACTIONS.maneuver;
  if(actionId==="maneuver") return {action,zones:1,test:null,crewDifficultyModifier:0,defenseBonus:0,effectiveSpeed:speed,pilotPenalty};
  if(actionId==="careful") return {action,zones:Math.ceil(speed/2),test:{attribute:"AGI",skill:"Pilot",difficultyModifier:-1+pilotPenalty},crewDifficultyModifier:0,defenseBonus:0,effectiveSpeed:speed,pilotPenalty};
  if(actionId==="hasty") return {action,zones:speed,test:null,crewDifficultyModifier:1,defenseBonus:0,effectiveSpeed:speed,pilotPenalty};
  if(actionId==="defensive") return {action,zones:Math.max(0,speed-1),test:{attribute:"AGI",skill:"Pilot",difficulty:Math.max(0,scale+pilotPenalty)},crewDifficultyModifier:0,defenseBonus:1,effectiveSpeed:speed,pilotPenalty};
  return {action,zones:speed+Math.max(0,Math.floor(Number(apSpent)||0)),test:{attribute:"AGI",skill:"Pilot",difficulty:1+pilotPenalty},crewDifficultyModifier:1,defenseBonus:0,effectiveSpeed:speed,pilotPenalty};
}

export function vehicleHasInjury(vehicle = {}, injuryId = "") {
  return (Array.isArray(vehicle?.injuries)?vehicle.injuries:[]).some((entry)=>entry?.id===injuryId);
}

export function beginVehicleTurn(vehicle = {}) {
  if(!vehicleHasInjury(vehicle,"engine")) return vehicle;
  return {
    ...vehicle,
    fuelCurrent:Math.max(0,Number(vehicle?.fuelCurrent??vehicle?.fuelMax??0)-1),
    lastEngineLeakAt:Date.now(),
  };
}

export function vehicleRamDamage(vehicle = {}) {
  return Math.max(0,Number(vehicle?.impact||0));
}

export function vehicleCriticalThreshold(vehicle = {}) {
  return Math.max(1,5+Math.max(0,Number(vehicle?.scale||0)));
}

export function applyVehicleInjury(vehicle = {}, injuryId = "chassis", meta = {}) {
  const injury=VEHICLE_INJURIES.find(item=>item.id===injuryId)||VEHICLE_INJURIES[0];
  const injuries=Array.isArray(vehicle?.injuries)?vehicle.injuries:[];
  if(injuries.some((entry)=>entry?.id===injury.id)) return vehicle;
  return {
    ...vehicle,
    injuries:[...injuries,{
      ...injury,
      location:meta?.location||"",
      roll:Number(meta?.roll||0)||null,
      at:Date.now(),
    }],
  };
}

export function removeVehicleInjury(vehicle = {}, injuryId = "") {
  return {
    ...vehicle,
    injuries:(Array.isArray(vehicle?.injuries)?vehicle.injuries:[]).filter((entry)=>entry?.id!==injuryId),
  };
}

export function vehicleLocationForRoll(vehicle = {}, roll = 1) {
  const value=Math.max(1,Math.min(20,Math.floor(Number(roll)||1)));
  const parseRange=(raw)=>{
    const text=String(raw||"").trim();
    const match=text.match(/^(\d+)\s*-\s*(\d+)$/);
    if(match)return [Number(match[1]),Number(match[2])];
    const single=Number(text);
    return Number.isFinite(single)?[single,single]:null;
  };
  for(const location of vehicle?.locations||[]){
    const range=parseRange(location?.roll);
    if(range&&value>=range[0]&&value<=range[1]) return {...location,rollValue:value};
  }
  return {name:"Chassis",physical:0,energy:0,rollValue:value};
}

export function vehicleInjuryIdForLocation(locationName = "") {
  const name=String(locationName||"").toLowerCase();
  if(name.includes("engine")) return "engine";
  if(name.includes("weapon")) return "weapon";
  if(name.includes("wheel")||name.includes("wing")||name.includes("rudder")) return "mobility";
  return "chassis";
}

export function cloneVehicle(template, overrides = {}) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    ...template,
    ...overrides,
    id: overrides.id || `vehicle-${stamp}`,
    sourceId: template?.id || "custom",
    currentHp: Number(overrides.currentHp ?? template?.maxHp ?? 1),
    fuelMax: Math.max(0, Number(overrides.fuelMax ?? template?.fuelMax ?? 3)),
    fuelCurrent: Math.max(0, Number(overrides.fuelCurrent ?? overrides.fuelMax ?? template?.fuelCurrent ?? template?.fuelMax ?? 3)),
    crewRoles: { ...(overrides.crewRoles ?? template?.crewRoles ?? { pilot:"", gunners:[], additional:[] }) },
    injuries: (overrides.injuries ?? template?.injuries ?? []).map((entry)=>({ ...entry })),
    maxHp: Number(overrides.maxHp ?? template?.maxHp ?? 1),
    qualities: [...(overrides.qualities ?? template?.qualities ?? [])],
    locations: (overrides.locations ?? template?.locations ?? []).map((entry) => ({ ...entry })),
    weapons: (overrides.weapons ?? template?.weapons ?? []).map((entry) => ({ ...entry })),
    custom: Boolean(overrides.custom),
  };
}

export function getVehicleCraftCost(vehicle) {
  const scale = Math.max(0, Number(vehicle?.scale || 0));
  const hp = Math.max(1, Number(vehicle?.maxHp || 1));
  const impact = Math.max(0, Number(vehicle?.impact || 0));
  const speed = Math.max(0, Number(vehicle?.speedZones || 0));
  const qualities = vehicle?.qualities || [];
  const armored = String(vehicle?.cover || "").toLowerCase() === "enclosed" || qualities.includes("Enclosed");
  const flying = qualities.includes("Flying");
  const highPerformance = qualities.includes("High-Performance");
  const rugged = qualities.includes("Rugged");
  const weaponCount = (vehicle?.weapons || []).length;

  const common = Math.max(2, Math.ceil(hp / 6) + scale * 2 + Math.ceil(impact / 3));
  const special = Math.max(0, scale + Math.max(0, speed - 2) + weaponCount * 2 + (armored ? 2 : 0) + (highPerformance ? 2 : 0) + (rugged ? 1 : 0));
  const rare = Math.max(0, (flying ? 3 : 0) + (weaponCount > 0 ? 1 : 0) + (armored && scale >= 3 ? 1 : 0) + (highPerformance && scale >= 3 ? 1 : 0));

  return Object.fromEntries([
    ["Common Scrap", common],
    ["Special Scrap", special],
    ["Rare Scrap", rare],
  ].filter(([, qty]) => qty > 0));
}

export function getVehicleRepairPlan(vehicle, locationName = "Chassis") {
  const maxHp = Math.max(1, Number(vehicle?.maxHp || 1));
  const currentHp = Math.max(0, Math.min(maxHp, Number(vehicle?.currentHp ?? maxHp)));
  const missing = maxHp - currentHp;
  const restore = Math.min(5, missing);
  const ratio = missing / maxHp;
  const lower = String(locationName || "").toLowerCase();
  const qualities = vehicle?.qualities || [];
  const complexPart = lower.includes("engine") || lower.includes("wing") || lower.includes("weapon");
  const armored = String(vehicle?.cover || "").toLowerCase() === "enclosed" || qualities.includes("Enclosed");
  const flying = qualities.includes("Flying");
  const highPerformance = qualities.includes("High-Performance");

  const cost = {
    "Common Scrap": restore > 0 ? Math.max(1, Math.ceil(Number(vehicle?.scale || 0) / 2) + 1) : 0,
  };
  if (restore > 0 && (complexPart || armored || highPerformance || ratio >= 0.5)) cost["Special Scrap"] = 1;
  if (restore > 0 && (currentHp <= 0 || flying || (lower.includes("weapon") && ratio >= 0.5))) cost["Rare Scrap"] = 1;

  let difficulty = ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : 3;
  if (currentHp <= 0) difficulty = 4;
  if (qualities.includes("Rugged")) difficulty -= 1;
  if (highPerformance) difficulty += 1;

  return {
    missing,
    restore,
    difficulty: Math.max(0, Math.min(5, difficulty)),
    cost: Object.fromEntries(Object.entries(cost).filter(([, qty]) => qty > 0)),
  };
}
