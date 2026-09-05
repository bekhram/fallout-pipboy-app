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
    null;
}

function authoritativePrefix(combat) {
  if (!combat || combat.status === "resolved") return "";
  const roster = (combat.enemies || []).map((enemy) => ({
    name: enemy.name,
    hp: enemy.hp,
    defense: enemy.defense,
    initiative: enemy.initiative,
    drBlock: enemy.drBlock,
    attacks: enemy.attacks,
    abilities: enemy.abilities,
    defeated: enemy.defeated,
  }));
  return `[APPLICATION COMBAT STATE — AUTHORITATIVE]
The supplied world.activeCombat is the authoritative encounter state from the app's Core Rulebook bestiary. Exact enemy HP, Defense, Initiative, DR, attacks and abilities must not be invented, replaced or silently reset. Do not declare an enemy defeated unless its stored current HP is 0. Do not silently reduce or restore enemy HP. If the player describes an attack but no application-generated attack/damage result is present, request/resolve the required roll before narrating damage. Current roster: ${JSON.stringify(roster)}
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
        saveCombatForSession(sessionKey, incomingCombat);
      }

      const activeCombat = sessionKey
        ? (incomingCombat || readCombatForSession(sessionKey))
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
