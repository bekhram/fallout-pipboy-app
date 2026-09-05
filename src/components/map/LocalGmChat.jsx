import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMapLanguageCode, mapUiText } from "./mapUiText.js";
import { getLocationWikiMeta } from "../../data/map/locationLore.js";
import { rollFalloutD20 } from "../../utils/dice.js";
import { playSound } from "../../utils/soundManager.js";
import { getCellHazards } from "../../utils/mapMath.js";
import { getEnvironmentSnapshot } from "../../utils/environmentSystem.js";
import "./localGmChat.css";

const CHARACTER_STORAGE_KEY = "fallout_pipboy_v4_last_character";
const CHAT_STORAGE_KEY = "fallout_pipboy_local_gm_sessions_v3";
const CHECK_TEXT = {
  en: { check: "SKILL CHECK", tap: "TAP TO ROLL", rolling: "ROLLING...", target: "TARGET", difficulty: "DIFFICULTY", successes: "successes", complications: "complications", success: "SUCCESS", failure: "FAILURE" },
  ru: { check: "ПРОВЕРКА НАВЫКА", tap: "НАЖМИТЕ, ЧТОБЫ БРОСИТЬ", rolling: "БРОСОК...", target: "ЦЕЛЬ", difficulty: "СЛОЖНОСТЬ", successes: "успехов", complications: "осложнений", success: "УСПЕХ", failure: "НЕУДАЧА" },
  uk: { check: "ПЕРЕВІРКА НАВИЧКИ", tap: "НАТИСНІТЬ, ЩОБ КИНУТИ", rolling: "КИДОК...", target: "ЦІЛЬ", difficulty: "СКЛАДНІСТЬ", successes: "успіхів", complications: "ускладнень", success: "УСПІХ", failure: "НЕВДАЧА" },
  pl: { check: "TEST UMIEJĘTNOŚCI", tap: "DOTKNIJ, ABY RZUCIĆ", rolling: "RZUT...", target: "CEL", difficulty: "TRUDNOŚĆ", successes: "sukcesy", complications: "komplikacje", success: "SUKCES", failure: "PORAŻKA" },
};

const LORE_TEXT = {
  en: {
    label: (name) => `What is known about ${name}?`,
    question: (name) => `What is known about ${name} in Fallout lore?`,
  },
  ru: {
    label: (name) => `Что известно о ${name}?`,
    question: (name) => `Что известно о ${name} по лору Fallout?`,
  },
  uk: {
    label: (name) => `Що відомо про ${name}?`,
    question: (name) => `Що відомо про ${name} за лором Fallout?`,
  },
  pl: {
    label: (name) => `Co wiadomo o ${name}?`,
    question: (name) => `Co wiadomo o ${name} w lore Fallout?`,
  },
};

const LORE_REFERENCE_CACHE = new Map();

const ENCOUNTER_RESULT_TEXT = {
  en: { event: "TRAVEL ENCOUNTER", roll: "Damage roll", raw: "raw", location: "location", dr: "DR", final: "final", hp: "HP", rad: "RAD", critical: "critical injury threshold reached" },
  ru: { event: "СЛУЧАЙНОЕ СОБЫТИЕ", roll: "Бросок урона", raw: "до DR", location: "зона", dr: "DR", final: "итого", hp: "HP", rad: "РАД", critical: "достигнут порог критической травмы" },
  uk: { event: "ВИПАДКОВА ЗУСТРІЧ", roll: "Кидок шкоди", raw: "до DR", location: "зона", dr: "DR", final: "підсумок", hp: "HP", rad: "РАД", critical: "досягнуто поріг критичної травми" },
  pl: { event: "LOSOWE ZDARZENIE", roll: "Rzut obrażeń", raw: "przed DR", location: "lokacja", dr: "DR", final: "wynik", hp: "HP", rad: "RAD", critical: "osiągnięto próg obrażeń krytycznych" },
};

function formatTravelEncounterResolution(encounter, language) {
  const resolution = encounter?.resolution;
  if (!resolution) return "";
  const text = ENCOUNTER_RESULT_TEXT[language] || ENCOUNTER_RESULT_TEXT.en;
  const title = `${text.event}: ${encounter.text || encounter.id || "-"}`;

  if (resolution.kind === "damage") {
    const dice = Array.isArray(resolution.dice) ? resolution.dice.join(", ") : "-";
    const location = resolution.hitLocationLabel || resolution.hitLocation || "-";
    const resource = resolution.damageType === "radiation" ? text.rad : text.hp;
    return `${title}
${text.roll}: ${resolution.diceCount} CD [${dice}] = ${resolution.rawDamage} ${resolution.damageType} (${text.raw}); ${text.location}: ${location}; ${text.dr}: ${resolution.resistance}; ${text.final}: ${resolution.finalDamage} ${resource}${resolution.criticalInjury ? `; ${text.critical}` : ""}.`;
  }

  return `${title}
${resolution.summary || ""}`.trim();
}

const LEGACY_CHAT_STORAGE_KEYS = [
  "fallout_pipboy_local_gm_sessions_v2",
  "fallout_pipboy_local_gm_chat_v1",
];

function readCharacter() {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.data || null : null;
  } catch {
    return null;
  }
}

function readStore() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    }

    const previous = localStorage.getItem(LEGACY_CHAT_STORAGE_KEYS[0]);
    if (previous) {
      const parsed = JSON.parse(previous);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch {
    // Ignore corrupted or unavailable storage.
  }
  return {};
}

function writeStore(store) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage is optional for the active session.
  }
}

function normalizeItemName(value) {
  return String(value || "").trim().toLowerCase();
}

function findWeaponProfile(item, weaponDatabase) {
  const names = [item?.name, item?.baseName, item?.sourceName, item?.catalogName]
    .map(normalizeItemName)
    .filter(Boolean);
  return (weaponDatabase || []).find((entry) => names.includes(normalizeItemName(entry?.name))) || null;
}

function compactCharacter(character, weaponDatabase = []) {
  if (!character) return null;

  const weapons = (character.weapons || []).slice(0, 20).map((weapon) => {
    const profile = findWeaponProfile(weapon, weaponDatabase);
    return {
      name: weapon?.name || profile?.name || null,
      skill: weapon?.skill || weapon?.skillName || profile?.["Weapon type"] || null,
      damage: weapon?.damage ?? profile?.["Damage Rating"] ?? null,
      damageType: weapon?.damageType || weapon?.type || profile?.["Damage type"] || null,
      rate: weapon?.rate ?? profile?.["Rate of Fire"] ?? null,
      range: weapon?.range || profile?.Range || null,
      ammo: weapon?.ammo || null,
      effects: weapon?.effects || weapon?.damageEffects || profile?.Effects || null,
      qualities: weapon?.qualities || profile?.Qualities || null,
      mods: weapon?.mods || weapon?.modifications || null,
      databaseMatched: Boolean(profile),
    };
  });

  const armor = Object.fromEntries(
    Object.entries(character.armor || {}).map(([part, values]) => [
      part,
      {
        name: values?.name || values?.armorName || null,
        physical: values?.physical ?? values?.physicalResistance ?? null,
        energy: values?.energy ?? values?.energyResistance ?? null,
        radiation: values?.radiation ?? values?.radiationResistance ?? null,
        status: values?.status || null,
        mods: values?.mods || values?.modifications || null,
      },
    ])
  );

  return {
    name: character.characterName || character.name || "Unknown wanderer",
    level: character.level ?? null,
    origin: character.origin || null,
    special: character.special || character.SPECIAL || null,
    skills: character.skills || null,
    hp: {
      current: character.currentHp ?? character.hpCurrent ?? null,
      max: character.maxHp ?? character.hpMax ?? character.maxHpOverride ?? null,
      radiation: character.radiationHp ?? null,
    },
    defense: character.defenseOverride || character.defense || null,
    resistances: {
      physical: character.physicalResistance ?? character.physicalDR ?? null,
      energy: character.energyResistance ?? character.energyDR ?? null,
      radiation: character.radiationResistance ?? character.radiationDR ?? null,
    },
    armor,
    weapons,
    statuses: character.statuses || null,
    injuries: character.injuries || null,
    perks: (character.perksAndTraits || []).slice(0, 30).map((perk) => ({
      name: perk?.name,
      rank: perk?.rank,
      description: perk?.description || null,
    })),
    inventory: (character.inventoryItems || []).slice(0, 50).map((item) => {
      const profile = findWeaponProfile(item, weaponDatabase);
      return {
        name: item?.name,
        category: item?.category || profile?.["Weapon type"] || null,
        quantity: item?.quantity,
        effect: item?.effect || item?.description || null,
        weaponProfile: profile
          ? {
              damage: Number(profile["Damage Rating"]) || 0,
              damageType: profile["Damage type"] || null,
              effects: profile.Effects || null,
              qualities: profile.Qualities || null,
              rate: Number(profile["Rate of Fire"]) || 0,
              range: profile.Range || null,
              rarity: profile.Rarity || null,
            }
          : null,
      };
    }),
  };
}

function compactLocation(location) {
  if (!location) return null;
  return {
    id: location.id || null,
    name: location.name || null,
    nameKey: location.nameKey || null,
    type: location.type || null,
    worldX: location.worldX ?? null,
    worldY: location.worldY ?? null,
    major: location.major ?? null,
  };
}

function buildWorldContext(mapData, playerPosition, selectedCell, savedMapData, locations = [], region = null, character = null) {
  const currentCell = mapData?.cells?.find(
    (cell) => cell.x === playerPosition?.x && cell.y === playerPosition?.y
  );
  const worldOffset = mapData?.worldOffset || savedMapData?.worldOffset || { x: 0, y: 0 };
  const cols = mapData?.cols || 8;
  const rows = mapData?.rows || 8;
  const worldX = worldOffset.x * cols + (playerPosition?.x || 0);
  const worldY = worldOffset.y * rows + (playerPosition?.y || 0);

  const staticLocation = locations.find(
    (location) => location.worldX === worldX && location.worldY === worldY
  );
  const trackedLocation = locations.find(
    (location) => location.id === savedMapData?.trackedLocationId
  );

  const selectedWorldX = selectedCell ? worldOffset.x * cols + selectedCell.x : null;
  const selectedWorldY = selectedCell ? worldOffset.y * rows + selectedCell.y : null;
  const selectedStaticLocation = selectedCell
    ? locations.find(
        (location) => location.worldX === selectedWorldX && location.worldY === selectedWorldY
      )
    : null;
  const currentHazards = getCellHazards(currentCell);
  const environment = getEnvironmentSnapshot({
    totalHours: Number(savedMapData?.worldTotalHours || 0),
    regionId: region?.id || "commonwealth",
    hazards: currentHazards,
    character,
  });

  return {
    region: region ? { id: region.id || null, name: region.name || null, game: region.game || null } : null,
    knownStaticLocations: locations.map(compactLocation),
    sector: mapData?.title || mapData?.id || null,
    sectorOffset: worldOffset,
    localPosition: playerPosition || null,
    worldPosition: { x: worldX, y: worldY },
    currentTerrain: currentCell?.terrain || null,
    currentHazards,
    environment,
    currentLocation: compactLocation(staticLocation) || currentCell?.poi || null,
    isStaticLocation: Boolean(staticLocation),
    trackedObjective: compactLocation(trackedLocation),
    selectedDestination: selectedCell
      ? {
          localX: selectedCell.x,
          localY: selectedCell.y,
          worldX: selectedWorldX,
          worldY: selectedWorldY,
          terrain: selectedCell.terrain,
          location: compactLocation(selectedStaticLocation) || selectedCell.poi || null,
        }
      : null,
    travelHistory: {
      totalHours: Number(savedMapData?.worldTotalHours || 0),
      recentLog: Array.isArray(savedMapData?.travelLog)
        ? savedMapData.travelLog.slice(0, 30)
        : [],
    },
  };
}

function getSessionKey(world) {
  const regionId = world?.region?.id || "commonwealth";
  if (world?.isStaticLocation && world?.currentLocation?.id) {
    return `location:${regionId}:${world.currentLocation.id}`;
  }
  if (world?.worldPosition) return `procedural:${regionId}:${world.worldPosition.x}:${world.worldPosition.y}`;
  return `procedural-sector:${world?.sector || "unknown"}`;
}

function getSectorKey(world) {
  const offset = world?.sectorOffset;
  if (offset && Number.isFinite(Number(offset.x)) && Number.isFinite(Number(offset.y))) {
    return `sector:${world?.region?.id || "commonwealth"}:${Number(offset.x)}:${Number(offset.y)}`;
  }
  return `sector:${world?.sector || "unknown"}`;
}

function pruneTemporarySessions(activeSectorKey) {
  const store = readStore();
  let changed = false;
  for (const [key, session] of Object.entries(store)) {
    if (session?.temporary === true && session?.sectorKey !== activeSectorKey) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) writeStore(store);
}

function normalizeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events
    .filter((event) => event?.type && event?.title)
    .slice(0, 8)
    .map((event) => ({
      type: String(event.type),
      title: String(event.title),
      detail: String(event.detail || ""),
      status: String(event.status || "discovered"),
      at: Date.now(),
    }));
}

function mergeEvents(previous, incoming) {
  const next = [...(previous || [])];
  for (const event of normalizeEvents(incoming)) {
    const key = `${event.type}:${event.title}`.toLowerCase();
    const index = next.findIndex(
      (item) => `${item.type}:${item.title}`.toLowerCase() === key
    );
    if (index >= 0) next[index] = { ...next[index], ...event };
    else next.push(event);
  }
  return next.slice(-40);
}

function buildLocationState(events, persistent) {
  const facts = (Array.isArray(events) ? events : []).slice(-40).map((event) => ({
    type: String(event.type || ""),
    title: String(event.title || ""),
    detail: String(event.detail || ""),
    status: String(event.status || "discovered"),
  }));
  return { persistent: persistent === true, facts };
}

function readSession(sessionKey, persistent, sectorKey) {
  const store = readStore();
  const saved = store?.[sessionKey];
  if (!saved) return { messages: [], events: [], check: null };

  if (!persistent && !(saved.temporary === true && saved.sectorKey === sectorKey)) {
    return { messages: [], events: [], check: null };
  }

  return {
    messages: Array.isArray(saved.messages) ? saved.messages : [],
    events: Array.isArray(saved.events) ? saved.events : [],
    check: saved.check && typeof saved.check === "object" ? saved.check : null,
  };
}

function buildVisitedSessions() {
  return Object.entries(readStore())
    .filter(([key, session]) => {
      if (!Array.isArray(session?.messages) || session.messages.length === 0) return false;
      if (session?.persistent === true) return true;
      return key.startsWith("location:");
    })
    .map(([key, session]) => ({ key, ...session }))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

function sessionLabel(session, unknownLabel) {
  if (session?.location?.name) return session.location.name;
  if (session?.location?.id) return session.location.id.replaceAll("_", " ");
  return session?.key || unknownLabel;
}

function formatSessionTime(value, language) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(language || undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function LocalGmChat({ mapData, playerPosition, selectedCell, onWorldEvents, characterData, weaponDatabase = [], locations = [], region = null, travelEncounter = null, onTravelEncounterHandled }) {
  const { t, i18n } = useTranslation();
  const language = getMapLanguageCode(i18n.resolvedLanguage || i18n.language || "en");
  const tx = (key, vars) => mapUiText(language, key, vars);
  const rawCharacter = characterData || readCharacter();
  const localizedLocations = useMemo(
    () => locations.map((location) => ({
      ...location,
      name: location.nameKey ? t(location.nameKey, { defaultValue: location.name }) : location.name,
    })),
    [locations, t, language]
  );
  const character = useMemo(
    () => compactCharacter(rawCharacter, weaponDatabase),
    [rawCharacter, weaponDatabase]
  );
  const world = useMemo(
    () => ({
      ...buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData, localizedLocations, region, rawCharacter),
      travelEncounter: travelEncounter || rawCharacter?.mapData?.pendingTravelEncounter || null,
    }),
    [mapData, playerPosition, selectedCell, rawCharacter, localizedLocations, region, travelEncounter]
  );
  const isPersistentLocation = world.isStaticLocation === true;
  const loreTarget = useMemo(() => {
    if (world.currentLocation?.id) return world.currentLocation;
    if (world.trackedObjective?.id) return world.trackedObjective;
    return null;
  }, [world]);
  const currentSessionKey = useMemo(() => getSessionKey(world), [world]);
  const currentSectorKey = useMemo(() => getSectorKey(world), [world]);
  const initialSession = useMemo(
    () => readSession(currentSessionKey, isPersistentLocation, currentSectorKey),
    [currentSessionKey, isPersistentLocation, currentSectorKey]
  );

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoreLoading, setIsLoreLoading] = useState(false);
  const [isCheckRolling, setIsCheckRolling] = useState(false);
  const [error, setError] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [viewedSessionKey, setViewedSessionKey] = useState(null);
  const [messages, setMessages] = useState(() => initialSession.messages);
  const [events, setEvents] = useState(() => initialSession.events);
  const [pendingCheck, setPendingCheck] = useState(() => initialSession.check);
  const introStartedRef = useRef(new Set());
  const encounterHandledRef = useRef(new Set());

  const activeSessionKey = viewedSessionKey || currentSessionKey;
  const isArchiveView = activeSessionKey !== currentSessionKey;
  const visitedSessions = useMemo(() => buildVisitedSessions(), [version, messages, events]);
  const activeArchiveSession = useMemo(
    () => visitedSessions.find((session) => session.key === activeSessionKey) || null,
    [visitedSessions, activeSessionKey]
  );

  useEffect(() => {
    pruneTemporarySessions(currentSectorKey);
  }, [currentSectorKey]);

  useEffect(() => {
    setViewedSessionKey(null);
    const session = readSession(currentSessionKey, isPersistentLocation, currentSectorKey);
    setMessages(session.messages);
    setEvents(session.events);
    setPendingCheck(session.check);
    setDraft("");
    setError("");
  }, [currentSessionKey, isPersistentLocation, currentSectorKey]);

  useEffect(() => {
    if (!isArchiveView) return;
    const session = readSession(activeSessionKey, true, currentSectorKey);
    setMessages(session.messages);
    setEvents(session.events);
    setPendingCheck(null);
    setDraft("");
    setError("");
  }, [activeSessionKey, isArchiveView, currentSectorKey]);

  function persist(nextMessages, incomingEvents = [], nextCheck = pendingCheck) {
    const trimmedMessages = nextMessages.slice(-80);
    const nextEvents = mergeEvents(events, incomingEvents);
    setMessages(trimmedMessages);
    setEvents(nextEvents);

    const store = readStore();
    store[currentSessionKey] = {
      messages: trimmedMessages,
      events: nextEvents,
      check: nextCheck || null,
      persistent: isPersistentLocation,
      temporary: !isPersistentLocation,
      sectorKey: isPersistentLocation ? null : currentSectorKey,
      updatedAt: Date.now(),
      location: {
        id: world.currentLocation?.id || null,
        name: world.currentLocation?.name || null,
        terrain: world.currentTerrain || null,
        worldPosition: world.worldPosition || null,
      },
    };
    writeStore(store);
    if (isPersistentLocation) setVersion((value) => value + 1);

    if (
      isPersistentLocation &&
      incomingEvents.length &&
      typeof onWorldEvents === "function"
    ) {
      onWorldEvents(normalizeEvents(incomingEvents), {
        sessionKey: currentSessionKey,
        world,
      });
    }
  }

  async function requestGm(message, history = [], worldOverride = world) {
    const response = await fetch("/api/auto-gm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character,
        world: worldOverride,
        language,
        locationState: buildLocationState(events, isPersistentLocation),
        sessionKey: currentSessionKey,
        history: history.slice(-16),
        message,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `${tx("gmError")} (${response.status})`);
    return {
      text: data?.text || tx("gmEmpty"),
      events: Array.isArray(data?.events) ? data.events : [],
      check: data?.check && typeof data.check === "object" ? data.check : null,
    };
  }

  async function startScene(history = []) {
    if (isSending || isArchiveView) return;
    setError("");
    setIsSending(true);
    try {
      const persistenceInstruction = isPersistentLocation
        ? "This is a static named world location. Continue its saved discoveries and consequences exactly as established."
        : "This is a procedural location. Preserve its temporary progress while the player remains in this world sector. Once the player changes sector, that temporary location history is discarded.";
      const result = await requestGm(
        `Begin or continue the local exploration scene now. ${persistenceInstruction} Use the supplied character sheet, global-map context, and structured location state. Do not reintroduce already resolved threats or collected loot unless the saved state explicitly supports it. Briefly establish the immediate situation without deciding the character's actions. End by asking what they do, or request one skill check if the next outcome genuinely depends on it.`,
        history
      );
      setPendingCheck(result.check);
      persist(
        [...history, { role: "gm", text: result.text, at: Date.now() }],
        result.events,
        result.check
      );
    } catch (requestError) {
      setError(requestError?.message || tx("gmError"));
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    const encounter = world.travelEncounter;
    const token = String(encounter?.token || "").trim();
    if (!token || isArchiveView || encounterHandledRef.current.has(token)) return undefined;

    encounterHandledRef.current.add(token);
    let cancelled = false;

    const describeTravelEncounter = async () => {
      const mechanicalText = formatTravelEncounterResolution(encounter, language);
      const alreadyLogged = messages.some((message) => message?.travelEncounterToken === token);
      const baseMessages = mechanicalText && !alreadyLogged
        ? [...messages, { role: "gm", text: mechanicalText, at: Date.now(), travelEncounterToken: token }]
        : messages;

      if (baseMessages !== messages) {
        persist(baseMessages, [], pendingCheck);
      }

      setError("");
      setIsSending(true);
      try {
        const result = await requestGm(
          `A RANDOM TRAVEL ENCOUNTER has just interrupted global-map travel. Treat it as the immediate situation in Local mode. Encounter data: ${JSON.stringify({
            id: encounter.id || null,
            type: encounter.type || null,
            text: encounter.text || null,
            terrain: encounter.terrain || null,
            hours: encounter.hours || null,
            destinationName: encounter.destinationName || null,
            resolution: encounter.resolution || null,
          })}. The encounter resolution is authoritative: do not reroll it, do not change its damage dice, hit location, DR, final damage, or already-applied character consequence. Use SESSION CONTEXT.world.travelHistory.recentLog to understand the route and what happened immediately before this encounter. Describe the encounter as an actionable Fallout 2d20 scene in the selected app language. Do not decide the player's actions. Do not skip straight to the outcome. End by asking what the player does, or request one meaningful skill check if the situation already demands it.`,
          baseMessages,
          world
        );
        if (cancelled) return;
        setPendingCheck(result.check);
        persist(
          [...baseMessages, { role: "gm", text: result.text, at: Date.now() }],
          result.events,
          result.check
        );
      } catch (requestError) {
        if (cancelled) return;
        const fallbackText = String(encounter.text || tx("travelEncounter") || tx("gmError"));
        persist(
          [...baseMessages, { role: "gm", text: fallbackText, at: Date.now() }],
          [],
          pendingCheck
        );
        setError(requestError?.message || tx("gmError"));
      } finally {
        if (!cancelled) {
          setIsSending(false);
          if (typeof onTravelEncounterHandled === "function") {
            onTravelEncounterHandled(token);
          }
        }
      }
    };

    describeTravelEncounter();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.travelEncounter?.token, currentSessionKey, isArchiveView]);

  useEffect(() => {
    if (world.travelEncounter || isArchiveView || messages.length > 0 || introStartedRef.current.has(currentSessionKey)) return;
    introStartedRef.current.add(currentSessionKey);
    startScene([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionKey, messages.length, isArchiveView, world.travelEncounter]);

  async function sendText(text, options = {}) {
    const cleanText = String(text || "").trim();
    if (!cleanText || isSending || isArchiveView) return;

    const clearCheck = options.clearCheck === true;
    const checkForMessage = clearCheck ? null : pendingCheck;
    const userMessage = { role: "user", text: cleanText, at: Date.now() };
    const previousMessages = messages;
    const nextMessages = [...previousMessages, userMessage];

    if (clearCheck) setPendingCheck(null);
    persist(nextMessages, [], checkForMessage);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const requestText = String(options.requestText || cleanText).trim() || cleanText;
      const result = await requestGm(
        requestText,
        previousMessages,
        options.worldOverride || world
      );
      setPendingCheck(result.check);
      persist(
        [...nextMessages, { role: "gm", text: result.text, at: Date.now() }],
        result.events,
        result.check
      );
    } catch (requestError) {
      setError(requestError?.message || tx("gmError"));
    } finally {
      setIsSending(false);
    }
  }

  async function askLore() {
    if (!loreTarget || isSending || isLoreLoading || isArchiveView) return;

    const copy = LORE_TEXT[language] || LORE_TEXT.en;
    const targetName = loreTarget.name || loreTarget.id || tx("unknownLocation");
    const question = copy.question(targetName);
    const meta = getLocationWikiMeta(loreTarget);
    let reference = null;

    setIsLoreLoading(true);
    try {
      if (meta) {
        const cacheKey = `${language}:${meta.id}`;
        reference = LORE_REFERENCE_CACHE.get(cacheKey) || null;
        if (!reference) {
          try {
            const response = await fetch("/api/location-lore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: meta.wikiTitle,
                locationName: targetName,
                language,
                coreLore: meta.coreLore || "",
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (response.ok && payload && typeof payload === "object") {
              reference = payload;
              LORE_REFERENCE_CACHE.set(cacheKey, payload);
            }
          } catch {
            // Core lore injected by the GM bridge remains available as a fallback.
          }
        }
      }

      const worldOverride = {
        ...world,
        loreQuestion: {
          targetLocation: loreTarget,
          reference: reference || (meta ? {
            title: targetName,
            summary: meta.coreLore || null,
            sourceLabel: "Fallout Wiki",
          } : null),
        },
      };
      const requestText = `${question}

AUTO GM LORE MODE: The player is asking for setting/history information about the named location, not a quest walkthrough. Use SESSION CONTEXT.world.loreQuestion.reference as the primary reference when available, together with the supplied location lore. Answer conversationally in the selected app language. Share useful Fallout setting and historical context, but avoid future quest outcomes and hidden spoilers. Do not mention the external Wiki or source unless the player asks.`;
      await sendText(question, { requestText, worldOverride });
    } finally {
      setIsLoreLoading(false);
    }
  }

  async function sendMessage(event) {
    event?.preventDefault?.();
    await sendText(draft);
  }

  function rollPendingCheck() {
    if (!pendingCheck || isSending || isCheckRolling || isArchiveView) return;

    const text = CHECK_TEXT[language] || CHECK_TEXT.en;
    const skill = rawCharacter?.skills?.[pendingCheck.skill] || {};
    const attributeKey = pendingCheck.attribute || skill.attribute || "A";
    const attributeValue = Number(rawCharacter?.special?.[attributeKey] ?? rawCharacter?.SPECIAL?.[attributeKey] ?? 0);
    const rank = Number(skill.rank || 0);
    const bonus = Number(skill.bonus || 0);
    const tagBonus = skill.tagged ? 2 : 0;
    const targetNumber = Math.max(0, Math.min(20, attributeValue + rank + bonus + tagBonus));
    const criticalRange = skill.tagged ? Math.max(1, Math.min(20, rank)) : 1;
    const difficulty = Math.max(0, Math.min(10, Number(pendingCheck.difficulty) || 1));
    const diceCount = Math.max(1, Math.min(5, Number(pendingCheck.diceCount) || 2));

    playSound("diceRoll");
    setIsCheckRolling(true);

    window.setTimeout(() => {
      const result = rollFalloutD20({
        diceCount,
        targetNumber,
        criticalRange,
        label: `${attributeKey} + ${pendingCheck.skill}`,
      });
      const passed = result.totalSuccesses >= difficulty;
      const dice = result.rolls.map((die) => die.value).join(", ");
      const summary = `${text.check}: ${attributeKey} + ${pendingCheck.skill}; d20=[${dice}]; ${text.target}=${targetNumber}; ${text.successes}=${result.totalSuccesses}; ${text.complications}=${result.complications}; ${text.difficulty}=${difficulty}; ${passed ? text.success : text.failure}.`;
      setIsCheckRolling(false);
      sendText(summary, { clearCheck: true });
    }, 550);
  }

  function resetChat() {
    if (isArchiveView) return;
    const store = readStore();
    delete store[currentSessionKey];
    writeStore(store);
    if (isPersistentLocation) setVersion((value) => value + 1);
    setMessages([]);
    setEvents([]);
    setPendingCheck(null);
    setDraft("");
    setError("");
    introStartedRef.current.delete(currentSessionKey);
  }

  function openArchivedSession(key) {
    if (isSending) return;
    setViewedSessionKey(key === currentSessionKey ? null : key);
    setArchiveOpen(false);
  }

  const currentPlace =
    world.currentLocation?.name || world.currentLocation?.id || world.currentTerrain || tx("wasteland");
  const objective =
    world.selectedDestination?.location?.name ||
    world.selectedDestination?.location?.id ||
    world.trackedObjective?.name ||
    world.trackedObjective?.id ||
    tx("exploreArea");
  const displayedPlace = isArchiveView
    ? sessionLabel(activeArchiveSession, tx("unknownLocation"))
    : currentPlace;

  return (
    <section className="pip-local-gm">
      <header className="pip-local-gm__header">
        <div>
          <div className="pip-local-gm__eyebrow">{tx("local")} // {tx("autoGm")}</div>
          <h3>{isArchiveView ? tx("sessionArchive") : tx("falloutSession")}</h3>
          <div className="pip-local-gm__context">
            {displayedPlace}
            {!isArchiveView && world.worldPosition
              ? ` · ${tx("world")} ${world.worldPosition.x},${world.worldPosition.y}`
              : ""}
            {!isArchiveView
              ? ` · ${isPersistentLocation ? `${tx("static")} / ${tx("saved")}` : `${tx("procedural")} / ${tx("temp")}`}`
              : ""}
          </div>
        </div>
      </header>


      <div className="pip-local-gm__brief">
        <span>{tx("character")}: {character?.name || tx("notLoaded")}</span>
        <span>{tx("level")}: {character?.level ?? "-"}</span>
        <span>{tx("location")}: {displayedPlace}</span>
        <span>{isArchiveView ? tx("modeArchive") : `${tx("objective")}: ${objective}`}</span>
      </div>

      {events.length > 0 ? (
        <div className="pip-local-gm__discoveries">
          <div className="pip-local-gm__archive-title">{tx("discoveriesTitle")} ({events.length})</div>
          <div className="pip-local-gm__discovery-list">
            {events.slice(-8).reverse().map((event, index) => (
              <div
                className="pip-local-gm__discovery"
                key={`${event.type}-${event.title}-${index}`}
                title={event.detail || event.title}
              >
                <span>{event.type.toUpperCase()}</span>
                <strong>{event.title}</strong>
                <em>{event.status}</em>
              </div>
            ))}
          </div>
        </div>
      ) : null}


      <div className="pip-local-gm__messages" aria-live="polite">
        {messages.length === 0 && !isSending ? (
          <div className="pip-local-gm__empty">
            <strong>{tx("autoGmReady")}</strong>
            <p>{isPersistentLocation ? tx("staticHistory") : tx("proceduralTemp")}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${message.at || index}-${index}`}
              className={`pip-local-gm__message pip-local-gm__message--${message.role}`}
            >
              <div className="pip-local-gm__speaker">{message.role === "gm" ? tx("autoGm") : tx("you")}</div>
              <div>{message.text}</div>
            </article>
          ))
        )}
        {isSending ? <div className="pip-local-gm__thinking">{tx("processing")}</div> : null}
      </div>

      {error ? <div className="pip-local-gm__error">{error}</div> : null}

      {isArchiveView ? (
        <div className="pip-local-gm__archive-note">{tx("archiveNote")}</div>
      ) : (
        <>
          {pendingCheck ? (
            <button
              type="button"
              className="pip-local-gm__check"
              onClick={rollPendingCheck}
              disabled={isSending || isCheckRolling}
            >
              <span className="pip-local-gm__check-label">{(CHECK_TEXT[language] || CHECK_TEXT.en).check}</span>
              <strong>{pendingCheck.attribute || rawCharacter?.skills?.[pendingCheck.skill]?.attribute || "A"} + {pendingCheck.skill}</strong>
              {pendingCheck.reason ? <em>{pendingCheck.reason}</em> : null}
              <span>
                {(CHECK_TEXT[language] || CHECK_TEXT.en).difficulty}: {pendingCheck.difficulty || 1}
                {" · "}
                {isCheckRolling ? (CHECK_TEXT[language] || CHECK_TEXT.en).rolling : (CHECK_TEXT[language] || CHECK_TEXT.en).tap}
              </span>
            </button>
          ) : null}
          {loreTarget ? (
            <div className="pip-local-gm__lore-row">
              <button
                type="button"
                className="pip-local-gm__lore-question"
                onClick={askLore}
                disabled={isSending || isLoreLoading}
              >
                <span aria-hidden="true">?</span>
                {(LORE_TEXT[language] || LORE_TEXT.en).label(
                  loreTarget.name || loreTarget.id || tx("unknownLocation")
                )}
              </button>
            </div>
          ) : null}
          <form className="pip-local-gm__composer" onSubmit={sendMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={tx("whatDo")}
              rows={3}
              disabled={isSending}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(event);
                }
              }}
            />
            <button type="submit" className="pip-action-button" disabled={!draft.trim() || isSending}>
              {tx("send")}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
