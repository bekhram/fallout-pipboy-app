export const TERRAIN_TYPES = {
  road: {
    id: "road",
    label: "Road",
    moveCost: 1,
    blocked: false,
    className: "pip-map-cell--road",
    baseHazards: [],
  },

  urban: {
    id: "urban",
    label: "Urban",
    moveCost: 2,
    blocked: false,
    className: "pip-map-cell--urban",
    baseHazards: [],
  },

  ruins: {
    id: "ruins",
    label: "Ruins",
    moveCost: 2,
    blocked: false,
    className: "pip-map-cell--ruins",
    baseHazards: ["difficult"],
  },

  swamp: {
    id: "swamp",
    label: "Swamp",
    moveCost: 3,
    blocked: false,
    className: "pip-map-cell--swamp",
    baseHazards: ["difficult"],
  },

  forest: {
    id: "forest",
    label: "Forest",
    moveCost: 2,
    blocked: false,
    className: "pip-map-cell--forest",
    baseHazards: [],
  },

  industrial: {
    id: "industrial",
    label: "Industrial",
    moveCost: 2,
    blocked: false,
    className: "pip-map-cell--industrial",
    baseHazards: [],
  },

  water: {
    id: "water",
    label: "Water",
    moveCost: 3,
    blocked: false,
    className: "pip-map-cell--water",
    baseHazards: ["difficult", "radiation"],
  },

  mountains: {
    id: "mountains",
    label: "Mountains",
    moveCost: 999,
    blocked: true,
    className: "pip-map-cell--mountains",
    baseHazards: [],
  },

  blocked_ruins: {
    id: "blocked_ruins",
    label: "Blocked Ruins",
    moveCost: 999,
    blocked: true,
    className: "pip-map-cell--blocked-ruins",
    baseHazards: [],
  },
};