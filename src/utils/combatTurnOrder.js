import { getDerivedStats } from "./characterMath.js";
import {
  BESTIARY_COMBAT_CHANGED_EVENT,
  BESTIARY_COMBAT_STORAGE_KEY,
  readCombatForSession,
} from "./bestiaryCombatContext.js";

export const COMPANION_COMBAT_STORAGE_KEY = "fallout_pipboy_companions_v2";

function clone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
}

function readCombatStore() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BESTIARY_COMBAT_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object"
      ? { bySession: parsed.bySession || {}, latestSessionKey: parsed.latestSessionKey || null }
      : { bySession: {}, latestSessionKey: null };
  } catch {
    return { bySession: {}, latestSessionKey: null };
  }
}

function writeCombatStore(store) {
  try {
    window.localStorage.setItem(BESTIARY_COMBAT_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_CHANGED_EVENT));
  } catch {
    // Optional combat persistence.
  }
}

export function readCombatCompanions() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPANION_COMBAT_STORAGE_KEY) || "null");
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function readCombatCompanion(companionId) {
  return readCombatCompanions().find((item) => item?.id === companionId) || null;
}

function safeInitiative(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function priority(kind) {
  if (kind === "player") return 0;
  if (kind === "companion") return 1;
  return 2;
}

export function buildCombatTurnOrder(character, combat) {
  if (!combat) return [];
  const derived = getDerivedStats(character || {});
  const actors = [];

  if (Number(character?.currentHp || 0) > 0) {
    actors.push({
      id: "player",
      kind: "player",
      name: character?.characterName || "Player",
      initiative: safeInitiative(derived?.initiative),
    });
  }

  for (const companion of readCombatCompanions()) {
    if (Number(companion?.currentHp || 0) <= 0) continue;
    actors.push({
      id: companion.id,
      kind: "companion",
      name: companion.name || companion.creatureType || "Companion",
      initiative: safeInitiative(companion.initiative),
    });
  }

  for (const enemy of combat?.enemies || []) {
    if (enemy?.defeated || Number(enemy?.hp?.current || 0) <= 0) continue;
    actors.push({
      id: enemy.instanceId,
      kind: "enemy",
      name: enemy.name || "Enemy",
      initiative: safeInitiative(enemy.initiative),
    });
  }

  return actors.sort((a, b) =>
    b.initiative - a.initiative ||
    priority(a.kind) - priority(b.kind) ||
    String(a.name).localeCompare(String(b.name))
  );
}

function actorAlive(actor, character, combat) {
  if (!actor) return false;
  if (actor.kind === "player") return Number(character?.currentHp || 0) > 0;
  if (actor.kind === "companion") {
    const companion = readCombatCompanion(actor.id);
    return Boolean(companion && Number(companion.currentHp || 0) > 0);
  }
  const enemy = (combat?.enemies || []).find((item) => item?.instanceId === actor.id);
  return Boolean(enemy && !enemy.defeated && Number(enemy?.hp?.current || 0) > 0);
}

function persistTurn(sessionKey, combat, turn) {
  const store = readCombatStore();
  if (!store.bySession?.[sessionKey]) return null;
  const next = {
    ...clone(store.bySession[sessionKey]),
    ...clone(combat),
    round: Math.max(1, Number(turn?.round || 1)),
    turn: clone(turn),
    updatedAt: Date.now(),
  };
  store.bySession[sessionKey] = next;
  store.latestSessionKey = sessionKey;
  writeCombatStore(store);
  return { sessionKey, ...next };
}

export function ensureCombatTurnOrder(sessionKey, character) {
  const combat = readCombatForSession(sessionKey);
  if (!combat || combat.status === "resolved") return combat;
  const existing = combat.turn;
  if (existing?.order?.length && existing.activeActorId) return { sessionKey, ...combat };

  const order = buildCombatTurnOrder(character, combat);
  const first = order[0] || null;
  const turn = {
    round: Math.max(1, Number(combat.round || 1)),
    order,
    index: first ? 0 : -1,
    activeActorId: first?.id || null,
    activeKind: first?.kind || null,
    startedAt: Date.now(),
  };
  return persistTurn(sessionKey, combat, turn);
}

export function getActiveCombatActor(combat) {
  const turn = combat?.turn;
  if (!turn?.activeActorId) return null;
  return (turn.order || []).find((actor) => actor.id === turn.activeActorId) || null;
}

export function advanceCombatTurn(sessionKey, character, reason = "action_complete") {
  let combat = readCombatForSession(sessionKey);
  if (!combat || combat.status === "resolved") return combat;
  if (!combat.turn?.order?.length) {
    const initialized = ensureCombatTurnOrder(sessionKey, character);
    combat = initialized?.sessionKey ? initialized : readCombatForSession(sessionKey);
  }
  if (!combat?.turn?.order?.length) return combat;

  const currentTurn = combat.turn;
  const currentOrder = currentTurn.order || [];
  let nextIndex = Number(currentTurn.index || 0) + 1;
  let nextActor = null;

  while (nextIndex < currentOrder.length) {
    const candidate = currentOrder[nextIndex];
    if (actorAlive(candidate, character, combat)) {
      nextActor = candidate;
      break;
    }
    nextIndex += 1;
  }

  let round = Math.max(1, Number(currentTurn.round || combat.round || 1));
  let order = currentOrder;
  if (!nextActor) {
    round += 1;
    order = buildCombatTurnOrder(character, combat);
    nextIndex = 0;
    while (nextIndex < order.length && !actorAlive(order[nextIndex], character, combat)) nextIndex += 1;
    nextActor = order[nextIndex] || null;
  }

  const turn = {
    ...currentTurn,
    round,
    order,
    index: nextActor ? nextIndex : -1,
    activeActorId: nextActor?.id || null,
    activeKind: nextActor?.kind || null,
    previousActorId: currentTurn.activeActorId || null,
    previousReason: reason,
    startedAt: Date.now(),
  };
  return persistTurn(sessionKey, combat, turn);
}

export function isCombatActorTurn(combat, kind, id = null) {
  const active = getActiveCombatActor(combat);
  if (!active || active.kind !== kind) return false;
  return id == null ? true : active.id === id;
}
