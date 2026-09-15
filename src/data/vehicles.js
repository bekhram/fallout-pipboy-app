export const VEHICLE_QUALITIES = [
  "Cargo",
  "Cumbersome",
  "Enclosed",
  "Exposed",
  "High-Performance",
  "Rugged",
  "Single-Seater",
  "Flying",
  "Watercraft",
];

export const VEHICLE_MATERIALS = [
  "Steel",
  "Aluminum",
  "Rubber",
  "Gears",
  "Screws",
  "Springs",
  "Adhesive",
  "Oil",
  "Circuitry",
  "Nuclear Material",
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

export function cloneVehicle(template, overrides = {}) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    ...template,
    ...overrides,
    id: overrides.id || `vehicle-${stamp}`,
    sourceId: template?.id || "custom",
    currentHp: Number(overrides.currentHp ?? template?.maxHp ?? 1),
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
  const armored = String(vehicle?.cover || "").toLowerCase() === "enclosed" || (vehicle?.qualities || []).includes("Enclosed");
  const flying = (vehicle?.qualities || []).includes("Flying");
  const highPerformance = (vehicle?.qualities || []).includes("High-Performance");
  const weaponCount = (vehicle?.weapons || []).length;
  const cost = {
    Steel: Math.ceil(hp / 2) + scale * 5 + (armored ? 12 : 0),
    Aluminum: Math.max(0, scale * 2 + (flying ? 14 : 0)),
    Rubber: flying ? 0 : Math.max(2, 4 + scale * 2),
    Gears: 3 + scale + speed,
    Screws: 4 + scale * 2 + weaponCount * 2,
    Springs: 2 + Math.ceil(impact / 2),
    Adhesive: 3 + scale * 2,
    Oil: 2 + speed,
    Circuitry: 1 + weaponCount * 2 + (highPerformance ? 3 : 0) + (flying ? 4 : 0),
  };
  if (flying) cost["Nuclear Material"] = 2;
  return Object.fromEntries(Object.entries(cost).filter(([, qty]) => qty > 0));
}

export function getVehicleRepairPlan(vehicle, locationName = "Chassis") {
  const maxHp = Math.max(1, Number(vehicle?.maxHp || 1));
  const currentHp = Math.max(0, Math.min(maxHp, Number(vehicle?.currentHp ?? maxHp)));
  const missing = maxHp - currentHp;
  const chunks = Math.max(1, Math.ceil(Math.min(5, missing) / 5));
  const lower = String(locationName || "").toLowerCase();
  const cost = { Steel: 2 * chunks, Adhesive: 1 * chunks };
  if (lower.includes("wheel")) cost.Rubber = 2 * chunks;
  if (lower.includes("engine")) { cost.Gears = 1 * chunks; cost.Oil = 1 * chunks; }
  if (lower.includes("wing")) cost.Aluminum = 2 * chunks;
  if (lower.includes("weapon")) { cost.Screws = 1 * chunks; cost.Circuitry = 1 * chunks; }
  if ((vehicle?.qualities || []).includes("Flying")) cost.Aluminum = (cost.Aluminum || 0) + chunks;
  const ratio = missing / maxHp;
  let difficulty = ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : 3;
  if (currentHp <= 0) difficulty = 4;
  if ((vehicle?.qualities || []).includes("Rugged")) difficulty -= 1;
  if ((vehicle?.qualities || []).includes("High-Performance")) difficulty += 1;
  return { missing, restore: Math.min(5, missing), difficulty: Math.max(0, Math.min(5, difficulty)), cost };
}
