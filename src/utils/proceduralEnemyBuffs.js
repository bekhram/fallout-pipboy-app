export const ENCOUNTER_BUFF_TIERS = ["light", "medium", "strong"];
export const RANDOM_ENCOUNTER_BUFF_CHANCE = 0;

export function normalizeEncounterBuffTier(value) {
  const tier = String(value || "light").toLowerCase();
  return ENCOUNTER_BUFF_TIERS.includes(tier) ? tier : "light";
}

// Kept as a compatibility no-op for any older callers. Random encounter buffs
// are intentionally disabled; manually assigned combat buffs are handled by the
// normal combat-buff system instead.
export function applyRandomEncounterEnemyBuff(stats = {}) {
  return { ...stats };
}
