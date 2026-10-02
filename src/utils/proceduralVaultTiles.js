export const VAULT_MODULE_SIZE = 6;
export const VAULT_DOOR_WIDTH = 2;
export const VAULT_SUPPORTED_GRID_SIZES = [24, 36, 48];

export const VAULT_GRID_PRESETS = {
  24: { modules: 4, targetRooms: 6, roomVariance: 1, minCorridors: 4, maxCorridors: 7 },
  36: { modules: 6, targetRooms: 11, roomVariance: 2, minCorridors: 10, maxCorridors: 16 },
  48: { modules: 8, targetRooms: 19, roomVariance: 3, minCorridors: 18, maxCorridors: 28 },
};

export const VAULT_DOOR_CELLS = Object.freeze({
  n: [{ x: 2, y: 0 }, { x: 3, y: 0 }],
  e: [{ x: 5, y: 2 }, { x: 5, y: 3 }],
  s: [{ x: 2, y: 5 }, { x: 3, y: 5 }],
  w: [{ x: 0, y: 2 }, { x: 0, y: 3 }],
});

const FOUR_WAY = Object.freeze({ n: true, e: true, s: true, w: true });

function room(id, label, tags = [], options = {}) {
  return {
    id,
    label,
    kind: options.kind || "room",
    size: VAULT_MODULE_SIZE,
    doors: { ...FOUR_WAY, ...(options.doors || {}) },
    tags,
    unique: options.unique ?? true,
    weight: Number(options.weight ?? 1),
    ruinedOf: options.ruinedOf || null,
    assetKey: options.assetKey || `vault_${id}`,
    assetPath: options.assetPath || `/assets/battlemap/vault/${options.kind === "ruined_room" ? "ruined" : "rooms"}/${id}.webp`,
  };
}

function corridor(id, label, doors, options = {}) {
  return {
    id,
    label,
    kind: "corridor",
    size: VAULT_MODULE_SIZE,
    doors: { n: false, e: false, s: false, w: false, ...doors },
    tags: ["corridor", ...(options.tags || [])],
    unique: false,
    weight: Number(options.weight ?? 1),
    rotatable: options.rotatable ?? true,
    assetKey: options.assetKey || `vault_${id}`,
    assetPath: options.assetPath || `/assets/battlemap/vault/corridors/${id}.webp`,
  };
}

export const VAULT_START_TILE = room(
  "atrium_vault_entrance",
  "Atrium / Vault Entrance",
  ["start", "atrium", "vault_hatch"],
  {
    kind: "start",
    doors: { n: false, e: true, s: true, w: true },
    assetPath: "/assets/battlemap/vault/rooms/atrium_vault_entrance.webp",
  },
);

export const VAULT_ROOM_TILES = [
  room("entrance_airlock", "Entrance Airlock", ["entrance", "security"]),
  room("security_checkpoint", "Security Checkpoint", ["security"]),
  room("command_room", "Command Room", ["administration", "terminal"]),
  room("living_quarters", "Living Quarters", ["residential"]),
  room("cafeteria", "Cafeteria", ["residential", "food"]),
  room("medbay", "Medbay", ["medical"]),
  room("armory", "Armory", ["security", "loot"]),
  room("workshop", "Workshop", ["engineering", "crafting"]),
  room("power_reactor", "Power Reactor", ["engineering", "power"]),
  room("water_treatment", "Water Treatment", ["engineering", "water"]),
  room("storage", "Storage", ["storage", "loot"], { unique: false, weight: 1.4 }),
  room("hydroponics", "Hydroponics", ["food", "agriculture"]),
];

export const VAULT_RUINED_ROOM_TILES = VAULT_ROOM_TILES.map((tile) =>
  room(
    `ruined_${tile.id}`,
    `Ruined ${tile.label}`,
    [...tile.tags, "ruined"],
    {
      kind: "ruined_room",
      unique: tile.unique,
      weight: 0.65,
      ruinedOf: tile.id,
    },
  ),
);

export const VAULT_CORRIDOR_TILES = [
  corridor("corridor_straight", "Straight Corridor", { n: true, s: true }, { weight: 3 }),
  corridor("corridor_corner", "Corner Corridor", { n: true, e: true }, { weight: 2 }),
  corridor("corridor_t", "T-Junction", { n: true, e: true, s: true }, { weight: 1.5 }),
  corridor("corridor_cross", "Four-Way Junction", FOUR_WAY, { rotatable: false, weight: 0.7 }),
  corridor("corridor_dead_end", "Dead End / Terminal", { n: true }, { weight: 0.8 }),
];

export const VAULT_TILE_MANIFEST = [
  VAULT_START_TILE,
  ...VAULT_ROOM_TILES,
  ...VAULT_RUINED_ROOM_TILES,
  ...VAULT_CORRIDOR_TILES,
];

export function vaultPresetForGrid(size) {
  const numeric = Number(size);
  return VAULT_GRID_PRESETS[numeric] || VAULT_GRID_PRESETS[24];
}

export function normalizeVaultGridSize(value) {
  const numeric = Number(value);
  return VAULT_SUPPORTED_GRID_SIZES.includes(numeric) ? numeric : 24;
}

export function getVaultTile(id) {
  return VAULT_TILE_MANIFEST.find((tile) => tile.id === id) || null;
}

export function vaultDoorCells(side) {
  return (VAULT_DOOR_CELLS[side] || []).map((cell) => ({ ...cell }));
}
