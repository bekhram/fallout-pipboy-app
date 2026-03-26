export const ZONE_HAZARDS = {
  difficult: {
    id: "difficult",
    label: "Difficult Terrain",
    description: "Greatly slows movement.",
    extraMoveCost: 1,
  },

  radiation: {
    id: "radiation",
    label: "Radiation Zone",
    description: "Deals periodic radiation damage.",
    damageType: "radiation",
  },

  toxic: {
    id: "toxic",
    label: "Toxic Zone",
    description: "Deals periodic poison damage.",
    damageType: "poison",
  },

  danger: {
    id: "danger",
    label: "Danger Zone",
    description: "Deals periodic physical damage from hidden fire or hazards.",
    damageType: "physical",
  },

  anomaly: {
    id: "anomaly",
    label: "Anomalous Zone",
    description: "Deals periodic energy damage.",
    damageType: "energy",
  },
};