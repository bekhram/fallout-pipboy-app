import {
  readCombatForSession,
  saveCombatForSession,
} from "./bestiaryCombatContext.js";

function endpointUrl(input) {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return input.toString();
  return input?.url || "";
}

function getIncomingCombat(payload) {
  return payload?.world?.travelEncounter?.resolution?.combat ||
    payload?.world?.travelEncounter?.combat ||
    payload?.world?.activeCombat ||
    payload?.combat?.activeCombat ||
    null;
}

function authoritativePrefix(combat) {
  if (!combat) return "";
  const roster = (combat.enemies || []).map((enemy) => ({
    name: enemy.name,
    hp: enemy.hp,
    defense: enemy.defense,
    initiative: enemy.initiative,
    drBlock: enemy.drBlock,
    attacks: enemy.attacks,
    abilities: enemy.abilities,
    combatStatuses: enemy.combatStatuses || null,
    defeated: enemy.defeated,
  }));
  const latestAction = combat.lastAction || null;
  return `[APPLICATION COMBAT STATE — AUTHORITATIVE]
The supplied world.activeCombat is the authoritative encounter state from the app's Core Rulebook bestiary. Exact enemy HP, Defense, Initiative, DR, attacks and abilities must not be invented, replaced or silently reset. Do not declare an enemy defeated unless its stored current HP is 0. Do not silently reduce or restore enemy HP. If the player describes an attack but no application-generated attack/damage result is present, request/resolve the required roll before narrating damage. If latestAction exists, its dice, hit/miss result, hit location, DR, final damage and HP transition have already been resolved by the app and must not be rerolled or changed. Combat status: ${combat.status || "active"}. Current roster: ${JSON.stringify(roster)}. Latest action: ${JSON.stringify(latestAction)}
[/APPLICATION COMBAT STATE]`;
}

export function installBestiaryCombatGmBridge() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  if (window.__pipBestiaryCombatGmBridgeInstalled) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    try {
      const url = endpointUrl(input);
      const isGmRequest = /\/api\/(?:auto-gm|combat-gm)(?:\?|$)/.test(url);
      if (!isGmRequest || typeof init?.body !== "string") {
        return originalFetch(input, init);
      }

      const payload = JSON.parse(init.body);
      const sessionKey = String(payload?.sessionKey || "").trim();
      const incomingCombat = getIncomingCombat(payload);

      if (sessionKey && incomingCombat) {
        const stored = readCombatForSession(sessionKey);
        const shouldReplaceStored = !stored ||
          incomingCombat.lastAction ||
          Number(incomingCombat.updatedAt || 0) >= Number(stored.updatedAt || 0);
        if (shouldReplaceStored) saveCombatForSession(sessionKey, incomingCombat);
      }

      const activeCombat = sessionKey
        ? (readCombatForSession(sessionKey) || incomingCombat)
        : incomingCombat;

      if (activeCombat) {
        payload.world = {
          ...(payload.world && typeof payload.world === "object" ? payload.world : {}),
          activeCombat,
        };
        payload.combat = {
          ...(payload.combat && typeof payload.combat === "object" ? payload.combat : {}),
          activeCombat,
        };

        const prefix = authoritativePrefix(activeCombat);
        if (prefix) {
          payload.message = `${prefix}\n\n${String(payload.message || "")}`;
        }
      }

      return originalFetch(input, {
        ...init,
        body: JSON.stringify(payload),
      });
    } catch {
      return originalFetch(input, init);
    }
  };

  window.__pipBestiaryCombatGmBridgeInstalled = true;
}
