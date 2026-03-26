import { maybeGenerateLocation } from "../../utils/encounterEngine.js";

export const KM_PER_BLOCK = 1.5;

export const FALLOUT_4_LOCATIONS = [
  {
    id: "sanctuary",
    nameKey: "locations.sanctuary",
    type: "settlement",
    worldX: 8,
    worldY: 6,
    icon: "S",
    major: true,
  },
  {
    id: "vault_111",
    nameKey: "locations.vault_111",
    type: "vault",
    worldX: 10,
    worldY: 8,
    icon: "⚙︎",
    major: true,
  },
  {
    id: "red_rocket_sanctuary",
    nameKey: "locations.red_rocket_sanctuary",
    type: "garage",
    worldX: 11,
    worldY: 7,
    icon: "R",
    major: false,
  },
  {
    id: "abernathy_farm",
    nameKey: "locations.abernathy_farm",
    type: "farm",
    worldX: 13,
    worldY: 9,
    icon: "≋",
    major: false,
  },
  {
    id: "sunshine_tidings",
    nameKey: "locations.sunshine_tidings",
    type: "settlement",
    worldX: 10,
    worldY: 15,
    icon: "⌂",
    major: false,
  },
  {
    id: "starlight_drive_in",
    nameKey: "locations.starlight_drive_in",
    type: "settlement",
    worldX: 15,
    worldY: 15,
    icon: "D",
    major: false,
  },
  {
    id: "concord",
    nameKey: "locations.concord",
    type: "town",
    worldX: 12,
    worldY: 12,
    icon: "C",
    major: true,
  },
  {
    id: "museum_of_freedom",
    nameKey: "locations.museum_of_freedom",
    type: "museum",
    worldX: 13,
    worldY: 12,
    icon: "M",
    major: false,
  },
  {
    id: "drumlin_diner",
    nameKey: "locations.drumlin_diner",
    type: "diner",
    worldX: 16,
    worldY: 14,
    icon: "D",
    major: false,
  },
  {
    id: "lexington",
    nameKey: "locations.lexington",
    type: "town",
    worldX: 20,
    worldY: 18,
    icon: "L",
    major: true,
  },
  {
    id: "corvega",
    nameKey: "locations.corvega",
    type: "factory",
    worldX: 21,
    worldY: 19,
    icon: "F",
    major: false,
  },
  {
    id: "covenant",
    nameKey: "locations.covenant",
    type: "settlement",
    worldX: 27,
    worldY: 16,
    icon: "⌂",
    major: false,
  },
  {
    id: "tenpines_bluff",
    nameKey: "locations.tenpines_bluff",
    type: "settlement",
    worldX: 18,
    worldY: 11,
    icon: "⌂",
    major: false,
  },
  {
    id: "cambridge_police_station",
    nameKey: "locations.cambridge_police_station",
    type: "police",
    worldX: 23,
    worldY: 23,
    icon: "P",
    major: false,
  },
  {
    id: "cambridge",
    nameKey: "locations.cambridge",
    type: "city",
    worldX: 24,
    worldY: 25,
    icon: "◫",
    major: true,
  },
  {
    id: "college_square",
    nameKey: "locations.college_square",
    type: "urban",
    worldX: 22,
    worldY: 26,
    icon: "◫",
    major: false,
  },
  {
    id: "greygarden",
    nameKey: "locations.greygarden",
    type: "settlement",
    worldX: 18,
    worldY: 24,
    icon: "⌂",
    major: false,
  },
  {
    id: "fort_hagen",
    nameKey: "locations.fort_hagen",
    type: "military",
    worldX: 16,
    worldY: 26,
    icon: "★",
    major: false,
  },
  {
    id: "vault_81",
    nameKey: "locations.vault_81",
    type: "vault",
    worldX: 22,
    worldY: 32,
    icon: "⚙︎",
    major: true,
  },
  {
    id: "hangmans_alley",
    nameKey: "locations.hangmans_alley",
    type: "settlement",
    worldX: 25,
    worldY: 29,
    icon: "⌂",
    major: false,
  },
  {
    id: "diamond_city",
    nameKey: "locations.diamond_city",
    type: "city",
    worldX: 26,
    worldY: 30,
    icon: "◆",
    major: true,
  },
  {
    id: "the_institute",
    nameKey: "locations.the_institute",
    type: "faction",
    worldX: 28,
    worldY: 28,
    icon: "I",
    major: true,
  },
  {
    id: "goodneighbor",
    nameKey: "locations.goodneighbor",
    type: "city",
    worldX: 29,
    worldY: 27,
    icon: "◇",
    major: true,
  },
  {
    id: "pickman_gallery",
    nameKey: "locations.pickman_gallery",
    type: "museum",
    worldX: 30,
    worldY: 24,
    icon: "◇",
    major: false,
  },
  {
    id: "old_north_church",
    nameKey: "locations.old_north_church",
    type: "church",
    worldX: 31,
    worldY: 25,
    icon: "✝",
    major: false,
  },
  {
    id: "bunker_hill",
    nameKey: "locations.bunker_hill",
    type: "settlement",
    worldX: 31,
    worldY: 22,
    icon: "▲",
    major: true,
  },
  {
    id: "mass_fusion",
    nameKey: "locations.mass_fusion",
    type: "tower",
    worldX: 31,
    worldY: 28,
    icon: "▣",
    major: false,
  },
  {
    id: "custom_house_tower",
    nameKey: "locations.custom_house_tower",
    type: "tower",
    worldX: 32,
    worldY: 24,
    icon: "▣",
    major: false,
  },
  {
    id: "boston_airport",
    nameKey: "locations.boston_airport",
    type: "airport",
    worldX: 33,
    worldY: 26,
    icon: "A",
    major: false,
  },
  {
    id: "the_castle",
    nameKey: "locations.the_castle",
    type: "fort",
    worldX: 34,
    worldY: 33,
    icon: "⬟",
    major: true,
  },
  {
    id: "saugus_ironworks",
    nameKey: "locations.saugus_ironworks",
    type: "industrial",
    worldX: 35,
    worldY: 16,
    icon: "F",
    major: false,
  },
  {
    id: "revere_beach_station",
    nameKey: "locations.revere_beach_station",
    type: "coast",
    worldX: 38,
    worldY: 19,
    icon: "M",
    major: false,
  },
  {
    id: "salem",
    nameKey: "locations.salem",
    type: "town",
    worldX: 39,
    worldY: 12,
    icon: "S",
    major: true,
  },
  {
    id: "spectacle_island",
    nameKey: "locations.spectacle_island",
    type: "island",
    worldX: 39,
    worldY: 36,
    icon: "◉",
    major: false,
  },
  {
    id: "nahant",
    nameKey: "locations.nahant",
    type: "coast",
    worldX: 41,
    worldY: 17,
    icon: "N",
    major: false,
  },
  {
    id: "parsons_state_insane_asylum",
    nameKey: "locations.parsons_state_insane_asylum",
    type: "hospital",
    worldX: 29,
    worldY: 10,
    icon: "H",
    major: false,
  },
  {
    id: "jamaica_plain",
    nameKey: "locations.jamaica_plain",
    type: "town",
    worldX: 24,
    worldY: 37,
    icon: "J",
    major: false,
  },
  {
    id: "quincy",
    nameKey: "locations.quincy",
    type: "town",
    worldX: 30,
    worldY: 40,
    icon: "Q",
    major: true,
  },
  {
    id: "murkwater",
    nameKey: "locations.murkwater",
    type: "swamp",
    worldX: 33,
    worldY: 45,
    icon: "M",
    major: false,
  },
  {
    id: "egret_tours_marina",
    nameKey: "locations.egret_tours_marina",
    type: "settlement",
    worldX: 22,
    worldY: 41,
    icon: "⌂",
    major: false,
  },
  {
    id: "glowing_sea",
    nameKey: "locations.glowing_sea",
    type: "wasteland",
    worldX: 16,
    worldY: 48,
    icon: "☢",
    major: true,
  },
  {
    id: "atom_crater",
    nameKey: "locations.atom_crater",
    type: "cult",
    worldX: 17,
    worldY: 47,
    icon: "☢",
    major: false,
  },
  {
    id: "virgil_cave",
    nameKey: "locations.virgil_cave",
    type: "cave",
    worldX: 12,
    worldY: 50,
    icon: "◖",
    major: false,
  },
];

function seededValue(x, y, ox, oy) {
  const n =
    Math.sin(
      (x + 1) * 12.9898 +
        (y + 1) * 78.233 +
        ox * 37.719 +
        oy * 19.913
    ) * 43758.5453;
  return n - Math.floor(n);
}

function randomFrom(list, value) {
  return list[Math.floor(value * list.length) % list.length];
}

function buildHazardsForTerrain(terrain, value) {
  const hazards = [];

  if (terrain === "water") {
    hazards.push("radiation");
    if (value > 0.72) hazards.push("toxic");
  }

  if (terrain === "swamp") {
    if (value > 0.45) hazards.push("toxic");
    if (value > 0.8) hazards.push("radiation");
  }

  if (terrain === "industrial") {
    if (value > 0.4) hazards.push("toxic");
    if (value > 0.72) hazards.push("anomaly");
    if (value > 0.86) hazards.push("danger");
  }

  if (terrain === "urban") {
    if (value > 0.82) hazards.push("danger");
  }

  if (terrain === "ruins") {
    if (value > 0.68) hazards.push("danger");
  }

  if (terrain === "forest") {
    if (value > 0.88) hazards.push("danger");
  }

  return hazards;
}

function fallbackPoiForTerrain(terrain) {
  switch (terrain) {
    case "urban":
      return {
        id: "metro_station",
        nameKey: "locations.metro_station",
        name: "Metro Station",
        danger: 2,
        loot: 2,
        random: true,
      };

    case "industrial":
      return {
        id: "factory",
        nameKey: "locations.factory",
        name: "Factory",
        danger: 3,
        loot: 3,
        random: true,
      };

    case "ruins":
      return {
        id: "bunker",
        nameKey: "locations.bunker",
        name: "Bunker",
        danger: 2,
        loot: 3,
        random: true,
      };

    case "forest":
      return {
        id: "cave",
        nameKey: "locations.cave",
        name: "Cave",
        danger: 2,
        loot: 2,
        random: true,
      };

    case "swamp":
      return {
        id: "junkyard",
        nameKey: "locations.junkyard",
        name: "Junkyard",
        danger: 2,
        loot: 2,
        random: true,
      };

    case "road":
      return {
        id: "settlement",
        nameKey: "locations.settlement",
        name: "Settlement",
        danger: 1,
        loot: 2,
        random: true,
      };

    case "water":
      return {
        id: "pier",
        nameKey: "locations.pier",
        name: "Pier",
        danger: 2,
        loot: 2,
        random: true,
      };

    default:
      return null;
  }
}

function normalizePoi(rawPoi) {
  if (!rawPoi) return null;

  const safeId = rawPoi.id || "unknown_location";

  const fallbackName = safeId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    ...rawPoi,
    id: safeId,
    nameKey: rawPoi.nameKey || `locations.${safeId}`,
    name: rawPoi.name || fallbackName,
    danger: rawPoi.danger ?? 1,
    loot: rawPoi.loot ?? 1,
    random: rawPoi.random ?? true,
  };
}

function getPoiChance(terrain) {
  switch (terrain) {
    case "urban":
    case "industrial":
      return 0.1;
    case "ruins":
    case "forest":
      return 0.07;
    case "road":
      return 0.04;
    case "swamp":
    case "water":
      return 0.02;
    default:
      return 0.02;
  }
}

function getTerrainForCell(x, y, start, rows, cols, worldOffset) {
  const wx = x + worldOffset.x * cols;
  const wy = y + worldOffset.y * rows;

  const dx = Math.abs(x - start.x);
  const dy = Math.abs(y - start.y);
  const dist = Math.max(dx, dy);

  const nearEdge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
  const edgeBand = x <= 1 || y <= 1 || x >= cols - 2 || y >= rows - 2;

  const roll = seededValue(wx, wy, worldOffset.x, worldOffset.y);
  const biomeRoll = seededValue(wx + 17, wy + 31, worldOffset.x, worldOffset.y);

  if (x === start.x && y === start.y) return "road";

  if (dist <= 1) {
    if (roll < 0.65) return "road";
    return "urban";
  }

  if (dist <= 2) {
    if (roll < 0.28) return "road";
    if (roll < 0.5) return "urban";
    if (roll < 0.68) return "ruins";
    if (roll < 0.82) return "forest";
    return "industrial";
  }

  if (dist <= 4) {
    if (roll < 0.1) return "road";
    if (roll < 0.26) return "urban";
    if (roll < 0.46) return "ruins";
    if (roll < 0.62) return "forest";
    if (roll < 0.77) return "industrial";
    if (roll < 0.9) return "swamp";
    return "water";
  }

  if (edgeBand && biomeRoll > 0.9) {
    return nearEdge && roll > 0.5 ? "mountains" : "blocked_ruins";
  }

  if (roll < 0.06) return "road";
  if (roll < 0.18) return "urban";
  if (roll < 0.36) return "ruins";
  if (roll < 0.54) return "forest";
  if (roll < 0.7) return "industrial";
  if (roll < 0.84) return "swamp";
  if (roll < 0.93) return "water";

  return randomFrom(["mountains", "blocked_ruins"], roll);
}

function hasStaticLocationAt(worldX, worldY) {
  return FALLOUT_4_LOCATIONS.some(
    (location) => location.worldX === worldX && location.worldY === worldY
  );
}

export function createRandomMap(
  rows = 14,
  cols = 14,
  worldOffset = { x: 0, y: 0 }
) {
  const start = {
    x: Math.floor(cols / 2),
    y: Math.floor(rows / 2),
  };

  const cells = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const wx = x + worldOffset.x * cols;
      const wy = y + worldOffset.y * rows;

      const terrain = getTerrainForCell(
        x,
        y,
        start,
        rows,
        cols,
        worldOffset
      );

      const isStart = x === start.x && y === start.y;
      const blocked = terrain === "mountains" || terrain === "blocked_ruins";
      const roll = seededValue(wx + 99, wy + 51, worldOffset.x, worldOffset.y);

      const poiChance = getPoiChance(terrain);
      const hasStaticLocation = hasStaticLocationAt(wx, wy);

      const rawPoi =
        !isStart && !blocked && !hasStaticLocation && roll > 1 - poiChance
          ? maybeGenerateLocation(terrain) || fallbackPoiForTerrain(terrain)
          : null;

      const generatedPoi = normalizePoi(rawPoi);

      cells.push({
        x,
        y,
        terrain: isStart ? "road" : terrain,
        hazards: isStart ? [] : buildHazardsForTerrain(terrain, roll),
        poi: generatedPoi,
      });
    }
  }

  return {
    id: `random-${rows}x${cols}-${worldOffset.x}-${worldOffset.y}`,
    title: `Sector ${worldOffset.x}, ${worldOffset.y}`,
    rows,
    cols,
    start,
    worldOffset,
    cells,
  };
}