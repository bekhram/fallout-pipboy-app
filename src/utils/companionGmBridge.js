const COMPANION_STORAGE_KEY = "fallout_pipboy_companions_v2";

function text(value, max = 500) {
  return String(value ?? "").slice(0, max);
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function compactAttack(attack) {
  if (!attack || typeof attack !== "object") return null;
  return {
    name: text(attack.name, 120) || null,
    attribute: ["body", "mind"].includes(attack.attribute) ? attack.attribute : "body",
    skill: ["melee", "guns", "other"].includes(attack.skill) ? attack.skill : "melee",
    damageCD: numberOrNull(attack.damage),
    damageType: ["physical", "energy", "radiation", "poison"].includes(attack.damageType)
      ? attack.damageType
      : null,
    effects: text(attack.effects, 240) || null,
    difficulty: numberOrNull(attack.difficulty),
    diceCount: numberOrNull(attack.diceCount),
  };
}

export function readCompanionRosterForGm() {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(COMPANION_STORAGE_KEY) || "null");
    const items = Array.isArray(raw?.items) ? raw.items : [];
    return items.slice(0, 12).map((item) => ({
      id: text(item?.id, 120) || null,
      kind: item?.kind === "pet" ? "pet" : "companion",
      name: text(item?.name, 120) || "Unnamed",
      creatureType: text(item?.creatureType || item?.species, 160) || null,
      level: numberOrNull(item?.level),
      body: numberOrNull(item?.body),
      mind: numberOrNull(item?.mind),
      melee: numberOrNull(item?.melee),
      guns: numberOrNull(item?.guns),
      other: numberOrNull(item?.other),
      hp: {
        current: numberOrNull(item?.currentHp),
        max: numberOrNull(item?.maxHp),
      },
      initiative: numberOrNull(item?.initiative),
      defense: numberOrNull(item?.defense),
      carryWeight: numberOrNull(item?.carryWeight),
      meleeBonus: numberOrNull(item?.meleeBonus),
      resistances: {
        physical: numberOrNull(item?.physDr),
        energy: numberOrNull(item?.energyDr),
        radiation: numberOrNull(item?.radDr),
        poison: numberOrNull(item?.poisonDr),
      },
      attacks: Array.isArray(item?.attacks)
        ? item.attacks.map(compactAttack).filter(Boolean).slice(0, 12)
        : [],
      attackNotes: text(item?.attackNotes || (!Array.isArray(item?.attacks) ? item?.attacks : ""), 1500) || null,
      specialAbilities: text(item?.specialAbilities, 3000) || null,
      notes: text(item?.notes, 1500) || null,
    }));
  } catch {
    return [];
  }
}

function endpointUrl(input) {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return input.toString();
  return input?.url || "";
}

export function installCompanionGmBridge() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  if (window.__pipCompanionGmBridgeInstalled) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    try {
      const url = endpointUrl(input);
      const isGmRequest = /\/api\/(?:auto-gm|combat-gm)(?:\?|$)/.test(url);
      if (!isGmRequest || typeof init?.body !== "string") {
        return originalFetch(input, init);
      }

      const payload = JSON.parse(init.body);
      const companions = readCompanionRosterForGm();
      payload.character = {
        ...(payload.character && typeof payload.character === "object" ? payload.character : {}),
        companions,
      };
      payload.party = {
        ...(payload.party && typeof payload.party === "object" ? payload.party : {}),
        companions,
      };

      return originalFetch(input, {
        ...init,
        body: JSON.stringify(payload),
      });
    } catch {
      return originalFetch(input, init);
    }
  };

  window.__pipCompanionGmBridgeInstalled = true;
}
