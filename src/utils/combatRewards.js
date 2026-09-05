import {
  BESTIARY_COMBAT_CHANGED_EVENT,
  BESTIARY_COMBAT_STORAGE_KEY,
} from "./bestiaryCombatContext.js";

export const PIPBOY_COMBAT_XP_REWARD_EVENT = "pipboy:combat-xp-reward";

function readStore() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BESTIARY_COMBAT_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object"
      ? { bySession: parsed.bySession || {}, latestSessionKey: parsed.latestSessionKey || null }
      : { bySession: {}, latestSessionKey: null };
  } catch {
    return { bySession: {}, latestSessionKey: null };
  }
}

function writeStore(store) {
  try {
    window.localStorage.setItem(BESTIARY_COMBAT_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_CHANGED_EVENT));
  } catch {
    // Rewards are optional persistence; combat state remains authoritative.
  }
}

export function grantResolvedCombatRewards(sessionKey) {
  if (!sessionKey || typeof window === "undefined") return null;
  const store = readStore();
  const combat = store.bySession?.[sessionKey];
  if (!combat || combat.status !== "resolved") return null;
  if (combat.rewards?.granted) return combat.rewards;

  const enemies = Array.isArray(combat.enemies) ? combat.enemies : [];
  const xp = enemies.reduce((sum, enemy) => sum + Math.max(0, Number(enemy?.xp || 0)), 0);
  const loot = enemies
    .map((enemy) => ({
      instanceId: enemy?.instanceId || null,
      name: enemy?.name || "Enemy",
      bestiaryId: enemy?.bestiaryId || null,
      instruction: String(enemy?.loot || "").trim(),
    }))
    .filter((entry) => entry.instruction);

  const rewards = {
    granted: true,
    xp,
    loot,
    rule: "combined_enemy_xp_for_scene",
    at: Date.now(),
  };

  store.bySession[sessionKey] = {
    ...combat,
    rewards,
    updatedAt: Date.now(),
  };
  store.latestSessionKey = sessionKey;
  writeStore(store);

  if (xp > 0) {
    window.dispatchEvent(new CustomEvent(PIPBOY_COMBAT_XP_REWARD_EVENT, {
      detail: { sessionKey, xp, rewards },
    }));
  }

  return rewards;
}
