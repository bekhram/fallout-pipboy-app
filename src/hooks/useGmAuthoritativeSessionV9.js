import { useEffect, useMemo, useRef } from "react";
import useGmAuthoritativeSessionV8, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV8.js";
import { getDerivedStats } from "../utils/characterMath.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

const PLAYER_CARD_PREFIX = "[[PIP2D20_PLAYER_CARD_V1]]";
const CHUNK_SIZE = 760;
const MAX_CARD_JSON = 5600;

function text(value, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compactSkill(skill) {
  if (skill == null) return null;
  if (typeof skill !== "object") return { rank: numberOrNull(skill) };
  return {
    rank: numberOrNull(skill.rank ?? skill.value ?? skill.level),
    tagged: Boolean(skill.tagged),
    attribute: text(skill.attribute || skill.defaultAttribute, 4),
  };
}

function compactWeapon(weapon) {
  return {
    name: text(weapon?.name, 100),
    skill: text(weapon?.skill || weapon?.weaponType, 50),
    damage: text(weapon?.damage, 30),
    type: text(weapon?.type || weapon?.damageType, 40),
    range: text(weapon?.range, 40),
    rate: text(weapon?.rate, 20),
    effects: text(Array.isArray(weapon?.effects) ? weapon.effects.join(", ") : (weapon?.customEffect || weapon?.effects), 240),
    qualities: text(Array.isArray(weapon?.qualities) ? weapon.qualities.join(", ") : (weapon?.qualitiesCustom || weapon?.qualities), 240),
    ammo: text(weapon?.ammo, 70),
  };
}

function compactInventoryItem(item) {
  return {
    name: text(item?.canonicalName || item?.name, 100),
    quantity: Math.max(0, Number(item?.quantity ?? item?.qty ?? 0) || 0),
    category: text(item?.category, 30),
    effect: text(item?.effect, 180),
  };
}

function compactArmor(armor) {
  if (!armor || typeof armor !== "object") return null;
  const result = {};
  for (const [key, value] of Object.entries(armor).slice(0, 10)) {
    if (!value || typeof value !== "object") continue;
    result[key] = {
      name: text(value.name || value.item?.name, 90),
      physical: numberOrNull(value.physical ?? value.currentPhysical),
      energy: numberOrNull(value.energy ?? value.currentEnergy),
      radiation: numberOrNull(value.radiation ?? value.currentRadiation),
      poison: numberOrNull(value.poison ?? value.currentPoison),
    };
  }
  return result;
}

function namesOnly(value, max = 20) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map((item) => {
    if (typeof item === "string") return text(item, 100);
    return text(item?.name || item?.title || item?.id || item?.key, 100);
  }).filter(Boolean);
}

function buildDetailedCard(form) {
  if (!form || typeof form !== "object") return null;
  let derived = {};
  try { derived = getDerivedStats(form) || {}; } catch { derived = {}; }

  const special = derived.effectiveSpecial && typeof derived.effectiveSpecial === "object"
    ? derived.effectiveSpecial
    : (form.special || {});
  const skills = {};
  for (const [name, skill] of Object.entries(form.skills || {}).slice(0, 24)) {
    skills[name] = compactSkill(skill);
  }

  const activeStatuses = Array.isArray(derived.activeStatuses)
    ? derived.activeStatuses.slice(0, 20).map((item) => text(item?.name || item?.key || item, 80)).filter(Boolean)
    : Object.entries(form.statuses || {}).filter(([, active]) => Boolean(active)).map(([key]) => key).slice(0, 20);

  const inventory = (Array.isArray(form.inventoryItems) ? form.inventoryItems : [])
    .filter((item) => Number(item?.quantity ?? item?.qty ?? 0) > 0)
    .slice(0, 36)
    .map(compactInventoryItem);

  const card = {
    origin: text(form.origin, 80),
    originTraits: namesOnly(form.originTraits, 12),
    special,
    skills,
    taggedSkills: Array.isArray(form.tagged_skills) ? form.tagged_skills.slice(0, 10).map((item) => text(item, 60)) : [],
    perks: namesOnly(form.perks, 24),
    traits: namesOnly(form.traits, 16),
    weapons: (Array.isArray(form.weapons) ? form.weapons : []).slice(0, 12).map(compactWeapon),
    armor: compactArmor(form.armor),
    activeStatuses,
    injuries: form.injuries && typeof form.injuries === "object" ? form.injuries : null,
    radiationHp: Math.max(0, Number(form.radiationHp || 0)),
    luckPoints: numberOrNull(derived.luckPoints),
    meleeDamageBonus: numberOrNull(derived.md),
    resistBonuses: {
      physical: numberOrNull(derived.physicalResistBonus),
      energy: numberOrNull(derived.energyResistBonus),
      radiation: numberOrNull(derived.radiationResistBonus),
      poison: numberOrNull(derived.poisonResistBonus),
    },
    immunities: Array.isArray(derived.immunities) ? derived.immunities.slice(0, 12) : [],
    inventory,
    caps: numberOrNull(form.caps ?? form.bottleCaps ?? form.currency),
  };

  let json = JSON.stringify(card);
  if (json.length <= MAX_CARD_JSON) return card;

  const trimmed = {
    ...card,
    inventory: card.inventory.slice(0, 18),
    perks: card.perks.slice(0, 14),
    weapons: card.weapons.slice(0, 8),
  };
  json = JSON.stringify(trimmed);
  if (json.length <= MAX_CARD_JSON) return trimmed;

  return {
    origin: trimmed.origin,
    originTraits: trimmed.originTraits,
    special: trimmed.special,
    skills: trimmed.skills,
    taggedSkills: trimmed.taggedSkills,
    perks: trimmed.perks.slice(0, 8),
    weapons: trimmed.weapons.slice(0, 5),
    activeStatuses: trimmed.activeStatuses,
    radiationHp: trimmed.radiationHp,
    luckPoints: trimmed.luckPoints,
    meleeDamageBonus: trimmed.meleeDamageBonus,
    resistBonuses: trimmed.resistBonuses,
    immunities: trimmed.immunities,
  };
}

function isPlayerCardText(value) {
  return String(value || "").startsWith(PLAYER_CARD_PREFIX);
}

function reconstructPlayerCards(chat) {
  const batches = new Map();
  for (const message of Array.isArray(chat) ? chat : []) {
    const raw = String(message?.text || "");
    if (!raw.startsWith(PLAYER_CARD_PREFIX)) continue;
    try {
      const packet = JSON.parse(raw.slice(PLAYER_CARD_PREFIX.length));
      const clientId = String(message?.authorClientId || packet?.clientId || "");
      const batchId = String(packet?.batchId || "");
      const total = Math.max(1, Math.min(12, Number(packet?.total || 1)));
      const index = Math.max(0, Math.min(total - 1, Number(packet?.index || 0)));
      if (!clientId || !batchId) continue;
      const key = `${clientId}:${batchId}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { clientId, batchId, total, chunks: new Array(total).fill(null), at: Number(message?.at || 0) };
        batches.set(key, batch);
      }
      batch.at = Math.max(batch.at, Number(message?.at || 0));
      batch.chunks[index] = String(packet?.chunk || "");
    } catch {
      // Ignore malformed hidden sync messages.
    }
  }

  const latest = new Map();
  for (const batch of batches.values()) {
    if (batch.chunks.some((chunk) => chunk == null)) continue;
    try {
      const card = JSON.parse(batch.chunks.join(""));
      const previous = latest.get(batch.clientId);
      if (!previous || batch.at >= previous.at) latest.set(batch.clientId, { card, at: batch.at });
    } catch {
      // Ignore incomplete JSON payloads.
    }
  }
  return latest;
}

export default function useGmAuthoritativeSessionV9(form) {
  const base = useGmAuthoritativeSessionV8(form);
  const rawChat = Array.isArray(base.roomState?.chat) ? base.roomState.chat : [];
  const detailCard = useMemo(() => buildDetailedCard(form), [form]);
  const detailJson = useMemo(() => JSON.stringify(detailCard || {}), [detailCard]);
  const lastSentRef = useRef("");
  const previousStatusRef = useRef(base.status);

  useEffect(() => {
    if (previousStatusRef.current !== "online" && base.status === "online") lastSentRef.current = "";
    previousStatusRef.current = base.status;
  }, [base.status]);

  useEffect(() => {
    if (base.mode !== "player" || base.status !== "online" || !detailJson || lastSentRef.current === detailJson) return undefined;
    const timer = window.setTimeout(() => {
      const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const chunks = [];
      for (let index = 0; index < detailJson.length; index += CHUNK_SIZE) chunks.push(detailJson.slice(index, index + CHUNK_SIZE));
      const total = Math.min(12, chunks.length);
      for (let index = 0; index < total; index += 1) {
        base.sendChat?.(`${PLAYER_CARD_PREFIX}${JSON.stringify({
          clientId: base.clientId,
          batchId,
          index,
          total,
          chunk: chunks[index],
        })}`);
      }
      lastSentRef.current = detailJson;
    }, 900);
    return () => window.clearTimeout(timer);
  }, [base.mode, base.status, base.clientId, detailJson]);

  const playerCards = useMemo(() => reconstructPlayerCards(rawChat), [rawChat]);
  const players = useMemo(() => (Array.isArray(base.players) ? base.players : []).map((player) => {
    const clientId = String(player?.clientId || player?.peerId || "");
    const synced = playerCards.get(clientId)?.card || null;
    return {
      ...player,
      character: {
        ...(player.character || {}),
        detailedCard: synced,
      },
    };
  }), [base.players, playerCards]);

  const visibleChat = useMemo(() => rawChat.filter((message) => !isPlayerCardText(message?.text)), [rawChat]);
  const visibleFeed = useMemo(
    () => (Array.isArray(base.feed) ? base.feed : []).filter((item) => !isPlayerCardText(item?.text)),
    [base.feed]
  );

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v9-player-card-sync",
    players,
    roomState: base.roomState ? { ...base.roomState, chat: visibleChat } : base.roomState,
    feed: visibleFeed,
    playerCards,
  };
}
