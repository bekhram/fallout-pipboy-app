import { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import { getDerivedStats, getTotalResistanceForPart } from "../utils/characterMath.js";

export const SESSION_CODE_LENGTH = 6;

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const HOST_PREFIX = "pip2d20-session-";
const MAX_FEED = 120;
const DEFAULT_AP_MAX = 6;
const PORTRAIT_STORAGE_KEY = "fallout_pipboy_v4_portrait_preview";

const EMPTY_COMBAT = {
  active: false,
  round: 0,
  index: -1,
  activeActorId: null,
  order: [],
  npcs: [],
  ap: 0,
  apMax: DEFAULT_AP_MAX,
  startedAt: null,
};

export function normalizeSessionCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, SESSION_CODE_LENGTH);
}

function makeSessionCode() {
  const values = new Uint32Array(SESSION_CODE_LENGTH);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i += 1) values[i] = Math.floor(Math.random() * 0xffffffff);
  }
  return Array.from(values, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}

function getHostPeerId(code) {
  return `${HOST_PREFIX}${String(code || "").toLowerCase()}`;
}

function getCharacterName(form) {
  return String(form?.characterName || form?.name || form?.playerName || "").trim();
}

function readPortraitSnapshot() {
  try {
    const value = localStorage.getItem(PORTRAIT_STORAGE_KEY) || "";
    if (!value.startsWith("data:image/")) return "";
    return value.length <= 220000 ? value : "";
  } catch {
    return "";
  }
}

function createCharacterSnapshot(form) {
  if (!form) return null;
  const derived = getDerivedStats(form);
  const characterName = getCharacterName(form);
  const hasCharacter = Boolean(characterName || form?.origin || form?.level);
  if (!hasCharacter) return null;

  const statuses = Object.entries(form?.statuses || {})
    .filter(([, active]) => Boolean(active))
    .map(([key]) => key)
    .slice(0, 12);

  const torsoArmor = Object.fromEntries(
    ["physical", "energy", "radiation", "poison"].map((damageType) => [
      damageType,
      Math.max(0, getTotalResistanceForPart({
        armor: form?.armor || {},
        part: "Torso",
        damageType,
        derived,
      })),
    ])
  );

  const weapons = (Array.isArray(form?.weapons) ? form.weapons : [])
    .filter((weapon) => String(weapon?.name || "").trim())
    .slice(0, 12)
    .map((weapon) => ({
      name: String(weapon?.name || "").slice(0, 80),
      skill: String(weapon?.skill || "").slice(0, 40),
      damage: weapon?.damage ?? "",
      damageType: String(weapon?.type || weapon?.damageType || "").slice(0, 40),
      rate: weapon?.rate ?? "",
      range: String(weapon?.range || "").slice(0, 40),
      effects: (Array.isArray(weapon?.effects) ? weapon.effects.join(", ") : String(weapon?.effects || weapon?.customEffect || "")).slice(0, 240),
      qualities: (Array.isArray(weapon?.qualities) ? weapon.qualities.join(", ") : String(weapon?.qualities || weapon?.qualitiesCustom || "")).slice(0, 240),
    }));

  const perks = (Array.isArray(form?.perksAndTraits) ? form.perksAndTraits : [])
    .filter((perk) => String(perk?.name || "").trim())
    .slice(0, 24)
    .map((perk) => ({
      name: String(perk?.name || "").slice(0, 80),
      rank: Math.max(1, Number(perk?.rank || 1)),
    }));

  return {
    name: characterName || "Unnamed",
    origin: String(form?.origin || ""),
    level: Math.max(1, Number(form?.level || 1)),
    currentHp: Math.max(0, Number(form?.currentHp || 0)),
    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),
    defense: Math.max(0, Number(derived?.defense || 0)),
    armor: torsoArmor,
    resistances: torsoArmor,
    initiative: Math.max(0, Number(derived?.initiative || 0)),
    luck: Math.max(0, Number(derived?.luckPoints || 0)),
    special: { ...(derived?.effectiveSpecial || {}) },
    weapons,
    perks,
    avatar: readPortraitSnapshot(),
    statuses,
    updatedAt: new Date().toISOString(),
  };
}

function makePlayerPacket(name, form) {
  return {
    name: String(name || "Player").trim().slice(0, 40) || "Player",
    character: createCharacterSnapshot(form),
  };
}

function safeClose(connection) {
  try { connection?.close?.(); } catch { /* Ignore cleanup errors. */ }
}

function makeId(prefix = "evt") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanText(value, maxLength = 600) {
  return String(value || "").trim().slice(0, maxLength);
}

function clampNumber(value, min, max) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : min;
  return Math.max(min, Math.min(max, safe));
}

function sanitizeRollPayload(roll) {
  if (!roll || typeof roll !== "object") return null;
  return {
    diceType: roll.diceType === "d6" ? "d6" : "d20",
    rollType: cleanText(roll.rollType, 30),
    label: cleanText(roll.label, 100),
    diceValues: Array.isArray(roll.diceValues) ? roll.diceValues.slice(0, 50) : [],
    successes: Number.isFinite(Number(roll.successes)) ? Number(roll.successes) : null,
    complications: Number.isFinite(Number(roll.complications)) ? Number(roll.complications) : 0,
    difficulty: Number.isFinite(Number(roll.difficulty)) ? Number(roll.difficulty) : null,
    targetNumber: Number.isFinite(Number(roll.targetNumber)) ? Number(roll.targetNumber) : null,
    outcome: roll.outcome === "success" || roll.outcome === "failure" ? roll.outcome : "",
    hitLocation: roll.hitLocation && typeof roll.hitLocation === "object"
      ? { label: cleanText(roll.hitLocation.label, 30), value: Number(roll.hitLocation.value || 0) }
      : null,
    totalDamage: Number.isFinite(Number(roll.totalDamage)) ? Number(roll.totalDamage) : null,
    totalEffects: Number.isFinite(Number(roll.totalEffects)) ? Number(roll.totalEffects) : null,
    effects: Array.isArray(roll.effects) ? roll.effects.map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 12) : [],
    reroll: Boolean(roll.reroll),
    source: cleanText(roll.source, 30),
    timestamp: roll.timestamp || new Date().toISOString(),
  };
}

function makeFeedItem({ type, sender = "", text = "", event = "", roll = null }) {
  return {
    id: makeId(type || "evt"),
    type,
    sender: cleanText(sender, 40),
    text: cleanText(text, 600),
    event: cleanText(event, 30),
    roll: roll ? sanitizeRollPayload(roll) : null,
    timestamp: new Date().toISOString(),
  };
}

function sanitizeNpc(npc) {
  if (!npc || typeof npc !== "object") return null;
  const name = cleanText(npc.name, 60);
  if (!name) return null;
  const maxHp = clampNumber(npc.maxHp ?? npc.currentHp ?? 10, 0, 9999);
  return {
    id: cleanText(npc.id, 100) || makeId("npc"),
    name,
    initiative: clampNumber(npc.initiative, 0, 99),
    defense: clampNumber(npc.defense, 0, 99),
    maxHp,
    currentHp: clampNumber(npc.currentHp ?? maxHp, 0, maxHp || 9999),
    armorPhysical: clampNumber(npc.armorPhysical, 0, 99),
    armorEnergy: clampNumber(npc.armorEnergy, 0, 99),
  };
}

function sanitizeActor(actor) {
  if (!actor || typeof actor !== "object") return null;
  const id = cleanText(actor.id, 140);
  const name = cleanText(actor.name, 60);
  if (!id || !name) return null;
  const maxHp = clampNumber(actor.maxHp, 0, 9999);
  return {
    id,
    kind: actor.kind === "npc" ? "npc" : "player",
    name,
    initiative: clampNumber(actor.initiative, 0, 99),
    peerId: actor.kind === "npc" ? null : cleanText(actor.peerId, 140),
    maxHp,
    currentHp: clampNumber(actor.currentHp, 0, maxHp || 9999),
    defense: clampNumber(actor.defense, 0, 99),
    armorPhysical: clampNumber(actor.armorPhysical, 0, 99),
    armorEnergy: clampNumber(actor.armorEnergy, 0, 99),
  };
}

function sanitizeCombatState(value) {
  if (!value || typeof value !== "object") return { ...EMPTY_COMBAT };
  const apMax = clampNumber(value.apMax ?? DEFAULT_AP_MAX, 1, 12);
  return {
    active: Boolean(value.active),
    round: Math.max(0, Math.floor(Number(value.round || 0))),
    index: Number.isFinite(Number(value.index)) ? Math.floor(Number(value.index)) : -1,
    activeActorId: value.activeActorId ? cleanText(value.activeActorId, 140) : null,
    order: Array.isArray(value.order) ? value.order.map(sanitizeActor).filter(Boolean).slice(0, 60) : [],
    npcs: Array.isArray(value.npcs) ? value.npcs.map(sanitizeNpc).filter(Boolean).slice(0, 40) : [],
    ap: clampNumber(value.ap, 0, apMax),
    apMax,
    startedAt: value.startedAt || null,
  };
}

function sortActors(actors) {
  return [...actors].sort((a, b) =>
    Number(b.initiative || 0) - Number(a.initiative || 0)
    || (a.kind === b.kind ? 0 : a.kind === "player" ? -1 : 1)
    || String(a.name).localeCompare(String(b.name))
  );
}

export default function useSharedSession(form) {
  const [mode, setMode] = useState("lobby");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [sceneMessage, setSceneMessage] = useState("");
  const [feed, setFeed] = useState([]);
  const [combat, setCombat] = useState({ ...EMPTY_COMBAT });

  const peerRef = useRef(null);
  const hostConnectionRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const playersRef = useRef([]);
  const sceneRef = useRef("");
  const feedRef = useRef([]);
  const combatRef = useRef({ ...EMPTY_COMBAT });
  const codeRef = useRef("");
  const formRef = useRef(form);
  const playerNameRef = useRef("");
  const autoSyncTimerRef = useRef(null);

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { sceneRef.current = sceneMessage; }, [sceneMessage]);
  useEffect(() => { feedRef.current = feed; }, [feed]);
  useEffect(() => { combatRef.current = combat; }, [combat]);

  const destroyNetwork = () => {
    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
    connectionsRef.current.forEach((connection) => safeClose(connection));
    connectionsRef.current.clear();
    safeClose(hostConnectionRef.current);
    hostConnectionRef.current = null;
    try { peerRef.current?.destroy?.(); } catch { /* Ignore cleanup errors. */ }
    peerRef.current = null;
  };

  useEffect(() => () => destroyNetwork(), []);

  const broadcastState = () => {
    const payload = {
      type: "session_state",
      sessionCode: codeRef.current,
      players: playersRef.current,
      sceneMessage: sceneRef.current,
      feed: feedRef.current,
      combat: combatRef.current,
      sentAt: new Date().toISOString(),
    };
    connectionsRef.current.forEach((connection) => {
      if (connection?.open) connection.send(payload);
    });
  };

  const setHostFeed = (nextFeed) => {
    const capped = nextFeed.slice(-MAX_FEED);
    feedRef.current = capped;
    setFeed(capped);
    window.setTimeout(broadcastState, 0);
  };

  const appendHostFeed = (item) => setHostFeed([...feedRef.current, item]);

  const setHostCombat = (nextCombat, feedItem = null) => {
    const safe = sanitizeCombatState(nextCombat);
    combatRef.current = safe;
    setCombat(safe);
    if (feedItem) appendHostFeed(feedItem);
    else window.setTimeout(broadcastState, 0);
    return safe;
  };

  const upsertPlayer = (peerId, packet) => {
    const nextPlayer = {
      peerId,
      name: cleanText(packet?.name || "Player", 40) || "Player",
      character: packet?.character || null,
      updatedAt: new Date().toISOString(),
    };
    const existed = playersRef.current.some((item) => item.peerId === peerId);
    const next = existed
      ? playersRef.current.map((item) => (item.peerId === peerId ? { ...item, ...nextPlayer } : item))
      : [...playersRef.current, nextPlayer];
    playersRef.current = next;
    setPlayers(next);
    if (!existed) appendHostFeed(makeFeedItem({ type: "system", sender: nextPlayer.name, event: "join" }));
    else window.setTimeout(broadcastState, 0);
  };

  const removePlayer = (peerId) => {
    const previous = playersRef.current.find((item) => item.peerId === peerId);
    const next = playersRef.current.filter((item) => item.peerId !== peerId);
    playersRef.current = next;
    setPlayers(next);
    if (previous) appendHostFeed(makeFeedItem({ type: "system", sender: previous.name, event: "leave" }));
    else window.setTimeout(broadcastState, 0);
  };

  const bindHostConnection = (connection) => {
    connectionsRef.current.set(connection.peer, connection);
    connection.on("open", () => {
      connection.send({
        type: "session_state",
        sessionCode: codeRef.current,
        players: playersRef.current,
        sceneMessage: sceneRef.current,
        feed: feedRef.current,
        combat: combatRef.current,
      });
    });
    connection.on("data", (data) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "join" || data.type === "player_update") {
        upsertPlayer(connection.peer, data.player);
        return;
      }
      const player = playersRef.current.find((item) => item.peerId === connection.peer);
      const sender = player?.name || cleanText(data?.sender, 40) || "Player";
      if (data.type === "chat_message") {
        const text = cleanText(data.text, 500);
        if (text) appendHostFeed(makeFeedItem({ type: "chat", sender, text }));
        return;
      }
      if (data.type === "roll_event") {
        const roll = sanitizeRollPayload(data.roll);
        if (roll) appendHostFeed(makeFeedItem({ type: "roll", sender, roll }));
      }
    });
    connection.on("close", () => {
      connectionsRef.current.delete(connection.peer);
      removePlayer(connection.peer);
    });
    connection.on("error", () => {
      connectionsRef.current.delete(connection.peer);
      removePlayer(connection.peer);
    });
  };

  const resetState = () => {
    const emptyCombat = { ...EMPTY_COMBAT };
    setPlayers([]);
    setSceneMessage("");
    setFeed([]);
    setCombat(emptyCombat);
    playersRef.current = [];
    sceneRef.current = "";
    feedRef.current = [];
    combatRef.current = emptyCombat;
  };

  const startHost = () => {
    destroyNetwork();
    resetState();
    setError(null);
    const code = makeSessionCode();
    codeRef.current = code;
    setSessionCode(code);
    setMode("host");
    setStatus("connecting");
    const peer = new Peer(getHostPeerId(code), { debug: 1 });
    peerRef.current = peer;
    peer.on("open", () => setStatus("online"));
    peer.on("connection", bindHostConnection);
    peer.on("disconnected", () => setStatus("disconnected"));
    peer.on("close", () => setStatus("disconnected"));
    peer.on("error", (peerError) => {
      setStatus("error");
      if (peerError?.type === "unavailable-id") setError({ key: "roomUnavailable" });
      else setError({ key: "networkError", message: peerError?.message || "Network error" });
    });
  };

  const joinSession = ({ code, name }) => {
    const normalized = normalizeSessionCode(code);
    const cleanName = cleanText(name, 40);
    destroyNetwork();
    resetState();
    setError(null);
    playerNameRef.current = cleanName || "Player";
    codeRef.current = normalized;
    setSessionCode(normalized);
    setMode("player");
    setStatus("connecting");
    const peer = new Peer(undefined, { debug: 1 });
    peerRef.current = peer;
    peer.on("open", () => {
      const connection = peer.connect(getHostPeerId(normalized), { reliable: true });
      hostConnectionRef.current = connection;
      connection.on("open", () => {
        setStatus("online");
        connection.send({ type: "join", player: makePlayerPacket(playerNameRef.current, formRef.current) });
      });
      connection.on("data", (data) => {
        if (!data || typeof data !== "object") return;
        if (data.type === "session_state") {
          setPlayers(Array.isArray(data.players) ? data.players : []);
          setSceneMessage(cleanText(data.sceneMessage, 600));
          setFeed(Array.isArray(data.feed) ? data.feed.slice(-MAX_FEED) : []);
          setCombat(sanitizeCombatState(data.combat));
        }
      });
      connection.on("close", () => setStatus("disconnected"));
      connection.on("error", () => {
        setStatus("error");
        setError({ key: "hostNotFound" });
      });
    });
    peer.on("error", (peerError) => {
      setStatus("error");
      if (peerError?.type === "peer-unavailable") setError({ key: "hostNotFound" });
      else setError({ key: "networkError", message: peerError?.message || "Network error" });
    });
  };

  const exitSession = () => {
    destroyNetwork();
    setMode("lobby");
    setStatus("waiting");
    setError(null);
    setSessionCode("");
    codeRef.current = "";
    playerNameRef.current = "";
    resetState();
  };

  const broadcastScene = (value) => {
    if (mode !== "host") return false;
    const text = cleanText(value, 600);
    sceneRef.current = text;
    setSceneMessage(text);
    if (text) appendHostFeed(makeFeedItem({ type: "scene", sender: "GM", text }));
    else broadcastState();
    return true;
  };

  const sendChat = (value) => {
    const text = cleanText(value, 500);
    if (!text || status !== "online") return false;
    if (mode === "host") {
      appendHostFeed(makeFeedItem({ type: "chat", sender: "GM", text }));
      return true;
    }
    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({ type: "chat_message", text, sender: playerNameRef.current });
    return true;
  };

  const syncCharacter = () => {
    if (mode !== "player" || status !== "online") return false;
    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({ type: "player_update", player: makePlayerPacket(playerNameRef.current, formRef.current) });
    return true;
  };

  const sendDiceResult = (payload) => {
    if (!payload || status !== "online") return false;
    const roll = sanitizeRollPayload(payload);
    if (!roll) return false;
    if (mode === "host") {
      appendHostFeed(makeFeedItem({ type: "roll", sender: "GM", roll }));
      return true;
    }
    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({ type: "roll_event", roll, sender: playerNameRef.current });
    return true;
  };

  const addCombatNpc = ({ name, initiative = 0, defense = 0, maxHp = 10, currentHp = maxHp, armorPhysical = 0, armorEnergy = 0 } = {}) => {
    if (mode !== "host" || combatRef.current.active) return false;
    const npc = sanitizeNpc({ id: makeId("npc"), name, initiative, defense, maxHp, currentHp, armorPhysical, armorEnergy });
    if (!npc) return false;
    return Boolean(setHostCombat({ ...combatRef.current, npcs: [...combatRef.current.npcs, npc] }));
  };

  const updateCombatNpc = (id, patch = {}) => {
    if (mode !== "host" || combatRef.current.active) return false;
    const npcs = combatRef.current.npcs.map((npc) => {
      if (npc.id !== id) return npc;
      return sanitizeNpc({ ...npc, ...patch }) || npc;
    });
    setHostCombat({ ...combatRef.current, npcs });
    return true;
  };

  const removeCombatNpc = (id) => {
    if (mode !== "host" || combatRef.current.active) return false;
    setHostCombat({ ...combatRef.current, npcs: combatRef.current.npcs.filter((npc) => npc.id !== id) });
    return true;
  };

  const startCombat = () => {
    if (mode !== "host" || combatRef.current.active) return false;
    const playerActors = playersRef.current
      .filter((player) => player?.character && Number(player.character.currentHp || 0) > 0)
      .map((player) => ({
        id: `player:${player.peerId}`,
        kind: "player",
        peerId: player.peerId,
        name: player.character?.name || player.name || "Player",
        initiative: clampNumber(player.character?.initiative, 0, 99),
        currentHp: clampNumber(player.character?.currentHp, 0, 9999),
        maxHp: clampNumber(player.character?.maxHp, 0, 9999),
        defense: clampNumber(player.character?.defense, 0, 99),
        armorPhysical: clampNumber(player.character?.armor?.physical, 0, 99),
        armorEnergy: clampNumber(player.character?.armor?.energy, 0, 99),
      }));
    const npcActors = combatRef.current.npcs.map((npc) => ({
      id: `npc:${npc.id}`,
      kind: "npc",
      peerId: null,
      name: npc.name,
      initiative: clampNumber(npc.initiative, 0, 99),
      defense: clampNumber(npc.defense, 0, 99),
      currentHp: clampNumber(npc.currentHp, 0, npc.maxHp || 9999),
      maxHp: clampNumber(npc.maxHp, 0, 9999),
      armorPhysical: clampNumber(npc.armorPhysical, 0, 99),
      armorEnergy: clampNumber(npc.armorEnergy, 0, 99),
    }));
    const order = sortActors([...playerActors, ...npcActors]);
    if (!order.length) return false;
    const next = {
      ...combatRef.current,
      active: true,
      round: 1,
      index: 0,
      activeActorId: order[0].id,
      order,
      ap: 0,
      startedAt: new Date().toISOString(),
    };
    setHostCombat(next, makeFeedItem({ type: "combat", sender: "GM", event: "combat_start", text: order[0].name }));
    return true;
  };

  const actorAvailable = (actor) => {
    if (!actor) return false;
    if (actor.kind === "npc") return Number(actor.currentHp || 0) > 0;
    const player = playersRef.current.find((item) => item.peerId === actor.peerId);
    return Boolean(player?.character && Number(player.character.currentHp || 0) > 0);
  };

  const nextCombatTurn = () => {
    if (mode !== "host" || !combatRef.current.active || !combatRef.current.order.length) return false;
    const current = combatRef.current;
    const order = current.order;
    let index = current.index;
    let round = Math.max(1, Number(current.round || 1));
    let nextActor = null;
    for (let step = 1; step <= order.length; step += 1) {
      const candidateIndex = (current.index + step) % order.length;
      if (candidateIndex <= current.index) round = Math.max(round, Number(current.round || 1) + 1);
      const candidate = order[candidateIndex];
      if (actorAvailable(candidate)) {
        index = candidateIndex;
        nextActor = candidate;
        break;
      }
    }
    if (!nextActor) return false;
    const next = { ...current, round, index, activeActorId: nextActor.id };
    setHostCombat(next, makeFeedItem({ type: "combat", sender: "GM", event: "combat_turn", text: nextActor.name }));
    return true;
  };

  const setCombatNpcHp = (actorId, value) => {
    if (mode !== "host" || !combatRef.current.active) return false;
    const targetId = String(actorId || "").startsWith("npc:") ? String(actorId) : `npc:${actorId}`;
    const npcId = targetId.replace(/^npc:/, "");
    const current = combatRef.current;
    const actor = current.order.find((item) => item.id === targetId && item.kind === "npc");
    if (!actor) return false;
    const nextHp = clampNumber(value, 0, actor.maxHp || 9999);
    const order = current.order.map((item) => item.id === targetId ? { ...item, currentHp: nextHp } : item);
    const npcs = current.npcs.map((npc) => npc.id === npcId ? { ...npc, currentHp: nextHp } : npc);
    setHostCombat({ ...current, order, npcs });
    return true;
  };

  const setCombatNpcMaxHp = (actorId, value) => {
    if (mode !== "host" || !combatRef.current.active) return false;
    const targetId = String(actorId || "").startsWith("npc:") ? String(actorId) : `npc:${actorId}`;
    const npcId = targetId.replace(/^npc:/, "");
    const current = combatRef.current;
    const actor = current.order.find((item) => item.id === targetId && item.kind === "npc");
    if (!actor) return false;
    const nextMaxHp = clampNumber(value, 1, 9999);
    const nextCurrentHp = clampNumber(actor.currentHp, 0, nextMaxHp);
    const order = current.order.map((item) => item.id === targetId
      ? { ...item, maxHp: nextMaxHp, currentHp: nextCurrentHp }
      : item);
    const npcs = current.npcs.map((npc) => npc.id === npcId
      ? { ...npc, maxHp: nextMaxHp, currentHp: nextCurrentHp }
      : npc);
    setHostCombat({ ...current, order, npcs });
    return true;
  };

  const updateCombatNpcStats = (actorId, patch = {}) => {
    if (mode !== "host") return false;
    const targetId = String(actorId || "").startsWith("npc:") ? String(actorId) : `npc:${actorId}`;
    const npcId = targetId.replace(/^npc:/, "");
    const current = combatRef.current;
    const sourceNpc = current.npcs.find((npc) => npc.id === npcId);
    if (!sourceNpc) return false;

    const nextNpc = sanitizeNpc({ ...sourceNpc, ...patch, id: npcId });
    if (!nextNpc) return false;

    const npcs = current.npcs.map((npc) => npc.id === npcId ? nextNpc : npc);
    const order = current.order.map((actor) => actor.id === targetId && actor.kind === "npc"
      ? {
          ...actor,
          name: nextNpc.name,
          initiative: nextNpc.initiative,
          defense: nextNpc.defense,
          currentHp: nextNpc.currentHp,
          maxHp: nextNpc.maxHp,
          armorPhysical: nextNpc.armorPhysical,
          armorEnergy: nextNpc.armorEnergy,
        }
      : actor);

    setHostCombat({ ...current, npcs, order });
    return true;
  };

  const setCombatAp = (value) => {
    if (mode !== "host") return false;
    const current = combatRef.current;
    setHostCombat({ ...current, ap: clampNumber(value, 0, current.apMax || DEFAULT_AP_MAX) });
    return true;
  };

  const endCombat = () => {
    if (mode !== "host") return false;
    const next = {
      ...EMPTY_COMBAT,
      npcs: combatRef.current.npcs,
      apMax: combatRef.current.apMax || DEFAULT_AP_MAX,
    };
    setHostCombat(next, makeFeedItem({ type: "combat", sender: "GM", event: "combat_end" }));
    return true;
  };

  const snapshotSignature = useMemo(() => JSON.stringify(createCharacterSnapshot(form)), [form]);
  useEffect(() => {
    if (mode !== "player" || status !== "online") return undefined;
    if (autoSyncTimerRef.current) window.clearTimeout(autoSyncTimerRef.current);
    autoSyncTimerRef.current = window.setTimeout(() => {
      syncCharacter();
      autoSyncTimerRef.current = null;
    }, 350);
    return () => {
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [snapshotSignature, mode, status]);

  return {
    mode,
    status,
    error,
    sessionCode,
    players,
    sceneMessage,
    feed,
    combat,
    isActive: mode === "host" || mode === "player",
    startHost,
    joinSession,
    exitSession,
    broadcastScene,
    sendChat,
    syncCharacter,
    sendDiceResult,
    addCombatNpc,
    updateCombatNpc,
    removeCombatNpc,
    startCombat,
    nextCombatTurn,
    setCombatNpcHp,
    setCombatNpcMaxHp,
    updateCombatNpcStats,
    setCombatAp,
    endCombat,
  };
}
