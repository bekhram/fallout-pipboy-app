import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { NPC_RANK_RULES } from "./npcCombat.js";
import { SPECIAL_CREATURE_FEATURES, legendaryAbilitiesFor } from "./npcFeaturePresets.js";
import {
  autoEnemyGroupsForLocation,
  enemyGroupForEntry,
  normalizeEnemyGroup,
} from "./proceduralEnemyGroups.js";
import * as V3 from "./proceduralEncounterBalanceV3.js";

export * from "./proceduralEncounterBalanceV3.js";

const PROFILES = {
  easy: { shift: -2, min: -4, max: 0, ranks: ["minion", "standard"], shares: { minion: .55, standard: .45 } },
  standard: { shift: 0, min: -2, max: 1, ranks: ["minion", "standard", "special"], shares: { minion: .2, standard: .65, special: .15 } },
  hard: { shift: 1, min: -1, max: 3, ranks: ["minion", "standard", "special", "legendary"], shares: { minion: .1, standard: .42, special: .4, legendary: .08 } },
  deadly: { shift: 2, min: 0, max: 4, ranks: ["minion", "standard", "special", "legendary"], shares: { minion: .08, standard: .3, special: .47, legendary: .15 } },
};

const FALLBACK_ROOM = {
  wasteland: "camp",
  red_rocket: "garage",
  super_duper_mart: "sales",
  raider_camp: "courtyard",
  military_bunker: "control",
};

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, num(value, min)));
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9а-яёіїєґ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashSeed(value) {
  const source = String(value ?? "0");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rngFrom(value) {
  let state = hashSeed(value);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list = []) {
  return list.length ? list[Math.floor(rng() * list.length)] : null;
}

function combatEntries() {
  return BESTIARY_ENTRIES.filter((entry) => {
    const category = String(entry?.category || "").toLowerCase();
    return num(entry?.level) > 0 && !["trap", "hazard", "obstacle"].includes(category);
  });
}

const ENTRIES = combatEntries();

function findAnyEntry(value) {
  const needle = norm(value);
  if (!needle) return null;
  const exact = ENTRIES.find((entry) => norm(entry?.name) === needle || norm(entry?.id) === needle);
  if (exact) return exact;
  return ENTRIES.find((entry) => {
    const haystack = norm(`${entry?.name || ""} ${entry?.id || ""} ${entry?.creatureType || ""} ${(entry?.tags || []).join(" ")}`);
    return haystack.includes(needle) || needle.includes(norm(entry?.name));
  }) || null;
}

function groupEntries(group) {
  return ENTRIES.filter((entry) => enemyGroupForEntry(entry) === group);
}

function groupHasEntries(group) {
  return groupEntries(group).length > 0;
}

function hintedGroups(room) {
  const result = [];
  (room?.enemies || []).forEach((enemy) => {
    [...(enemy?.candidates || []), enemy?.type]
      .filter(Boolean)
      .forEach((name) => {
        const entry = findAnyEntry(name);
        const group = entry ? enemyGroupForEntry(entry) : enemyGroupForEntry(String(name));
        if (group && group !== "other" && !result.includes(group)) result.push(group);
      });
  });
  return result;
}

function levelProfile(avgLevel, difficulty) {
  const profile = PROFILES[difficulty] || PROFILES.standard;
  return {
    profile,
    preferred: clamp(avgLevel + profile.shift, 1, 50),
    min: clamp(avgLevel + profile.min, 1, 50),
    max: clamp(avgLevel + profile.max, 1, 50),
  };
}

function poolForGroup(group, avgLevel, difficulty) {
  const { preferred, min, max } = levelProfile(avgLevel, difficulty);
  const all = groupEntries(group);
  if (!all.length) return [];

  let source = all.filter((entry) => {
    const level = num(entry?.level, 1);
    return level >= min && level <= max;
  });

  // Explicit/specialized groups such as Deathclaws may have only one bestiary profile.
  // If nothing falls inside the level band, keep the species/faction and choose the nearest profiles
  // rather than mixing in an unrelated enemy just to hit the XP target.
  if (!source.length) {
    source = [...all]
      .sort((a, b) => Math.abs(num(a?.level, 1) - preferred) - Math.abs(num(b?.level, 1) - preferred))
      .slice(0, 6);
  }

  return source.map((entry) => ({
    entry,
    group,
    level: num(entry?.level, 1),
    baseXp: V3.normalNpcXpForLevel(entry?.level),
    preferred,
  }));
}

function chooseAutoGroupForRoom(spec, room, avgLevel, difficulty, rng, primaryGroup = null) {
  const hinted = hintedGroups(room).filter(groupHasEntries);
  if (hinted.length) {
    const { preferred } = levelProfile(avgLevel, difficulty);
    const scored = hinted.map((group) => {
      const pool = poolForGroup(group, avgLevel, difficulty);
      const distance = pool.length
        ? Math.min(...pool.map((item) => Math.abs(item.level - preferred)))
        : 99;
      return { group, score: distance + rng() * .25 };
    }).sort((a, b) => a.score - b.score);
    if (scored[0]?.group) return scored[0].group;
  }

  const locationGroups = autoEnemyGroupsForLocation(spec?.type).filter(groupHasEntries);
  if (primaryGroup && locationGroups.includes(primaryGroup) && rng() < .72) return primaryGroup;

  const viable = locationGroups.filter((group) => poolForGroup(group, avgLevel, difficulty).length);
  return pick(rng, viable.length ? viable : locationGroups) || primaryGroup || "raider";
}

function assignRoomGroups(spec, rooms, avgLevel, difficulty, rng) {
  const requested = normalizeEnemyGroup(spec?.enemyFaction || spec?.enemyGroup || "auto");
  const usableRooms = rooms.filter((room) => String(room?.id || "").toLowerCase() !== "wc");
  if (!usableRooms.length) return { requested, primaryGroup: "raider", byRoom: new Map() };

  const byRoom = new Map();
  if (requested !== "auto" && groupHasEntries(requested)) {
    usableRooms.forEach((room) => byRoom.set(room.id, requested));
    return { requested, primaryGroup: requested, byRoom };
  }

  const preferredRoom = usableRooms.find((room) => (room?.enemies || []).length)
    || usableRooms.find((room) => room.id === FALLBACK_ROOM[spec?.type])
    || usableRooms[0];
  const primaryGroup = chooseAutoGroupForRoom(spec, preferredRoom, avgLevel, difficulty, rng, null);

  usableRooms.forEach((room) => {
    const roomRng = rngFrom(`${spec?.type}:${spec?.seed}:${room.id}:${difficulty}:enemy-room-group-v1`);
    const group = room.id === preferredRoom.id
      ? primaryGroup
      : chooseAutoGroupForRoom(spec, room, avgLevel, difficulty, roomRng, primaryGroup);
    byRoom.set(room.id, group || primaryGroup);
  });

  return { requested: "auto", primaryGroup, byRoom };
}

function decorate(enemy, entry, rank, rng) {
  const baseXp = V3.normalNpcXpForLevel(enemy?.level || entry?.level || 1);
  const result = {
    ...enemy,
    rank,
    baseXp,
    xp: V3.rankXp(baseXp, rank),
    xpMultiplier: NPC_RANK_RULES[rank]?.xpMultiplier ?? 1,
    specialFeatureId: "",
    specialFeature: "",
    legendaryAbilityId: "",
    legendaryAbility: "",
    legendaryRewardType: "",
    legendaryReward: "",
  };

  if (rank === "special") {
    const feature = pick(rng, SPECIAL_CREATURE_FEATURES);
    if (feature) {
      result.specialFeatureId = feature.id;
      result.specialFeature = `${feature.name} — ${feature.summary}`;
    }
  }

  if (rank === "legendary") {
    const kind = String(entry?.cardKind || entry?.statKind || "creature").toLowerCase() === "character" ? "npc" : "creature";
    const ability = pick(rng, legendaryAbilitiesFor(kind));
    if (ability) {
      result.legendaryAbilityId = ability.id;
      result.legendaryAbility = `${ability.name} — ${ability.summary}`;
    }
    result.legendaryRewardType = rng() < .5 ? "weapon" : "armor";
    result.legendaryReward = "Legendary encounter reward";
  }

  return result;
}

function roomCap(room) {
  return ["wc", "office"].includes(String(room?.id || "").toLowerCase()) ? 1 : 4;
}

function roomCount(plan, roomId) {
  return plan.filter((item) => item.room.id === roomId).length;
}

function rankCounts(plan) {
  const result = { minion: 0, standard: 0, special: 0, legendary: 0 };
  plan.forEach(({ enemy }) => { result[enemy.rank] = (result[enemy.rank] || 0) + 1; });
  return result;
}

function repeatCount(plan, entry) {
  const id = String(entry?.id || entry?.name || "");
  return plan.filter((item) => String(item.entry?.id || item.entry?.name || "") === id).length;
}

function candidateOptions(rooms, roomGroups, avgLevel, difficulty, plan, rank) {
  const options = [];
  rooms.forEach((room) => {
    if (String(room?.id || "").toLowerCase() === "wc") return;
    if (roomCount(plan, room.id) >= roomCap(room)) return;
    const group = roomGroups.get(room.id);
    if (!group) return;
    poolForGroup(group, avgLevel, difficulty).forEach((candidate) => {
      options.push({ ...candidate, room, rank, cost: V3.rankXp(candidate.baseXp, rank) });
    });
  });
  return options;
}

function bestMandatory(rooms, roomGroups, avgLevel, difficulty, plan, rank, desiredXp, preferredLevel, rng) {
  const options = candidateOptions(rooms, roomGroups, avgLevel, difficulty, plan, rank);
  return options.map((option) => ({
    ...option,
    score:
      Math.abs(option.cost - desiredXp) / Math.max(1, desiredXp)
      + Math.abs(option.level - preferredLevel) * .055
      + repeatCount(plan, option.entry) * .07
      + rng() * .015,
  })).sort((a, b) => a.score - b.score)[0] || null;
}

function bestNext(rooms, roomGroups, avgLevel, difficulty, plan, currentXp, targetXp, rng) {
  const profile = PROFILES[difficulty] || PROFILES.standard;
  const currentRanks = rankCounts(plan);
  let best = null;

  profile.ranks.forEach((rank) => {
    if (rank === "legendary" && currentRanks.legendary >= 1) return;
    candidateOptions(rooms, roomGroups, avgLevel, difficulty, plan, rank).forEach((option) => {
      const projected = currentXp + option.cost;
      const budgetError = Math.abs(projected - targetXp) / Math.max(1, targetXp);
      const overshoot = projected > targetXp * 1.12
        ? ((projected - targetXp * 1.12) / Math.max(1, targetXp)) * 3
        : 0;
      const levelPenalty = Math.abs(option.level - option.preferred) * .045;
      const repeatPenalty = Math.max(0, repeatCount(plan, option.entry) - 1) * .08;
      const projectedShare = (currentRanks[rank] + 1) / (plan.length + 1);
      const rankPenalty = Math.abs(projectedShare - (profile.shares[rank] || 0)) * .18;
      const score = budgetError + overshoot + levelPenalty + repeatPenalty + rankPenalty + rng() * .015;
      if (!best || score < best.score) best = { ...option, score };
    });
  });

  return best;
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const rooms = inputRooms.map((room) => ({
    ...room,
    enemies: (room?.enemies || []).map((enemy) => ({
      ...enemy,
      candidates: [...(enemy?.candidates || [enemy?.type]).filter(Boolean)],
    })),
    markers: [...(room?.markers || [])],
  }));
  if (!rooms.length) return rooms;

  const { avgPartyLevel, partySize } = V3.normalizedPartyConfig(spec);
  const difficulty = V3.normalizeEncounterDifficulty(spec?.encounterDifficulty ?? spec?.difficulty);
  const profile = PROFILES[difficulty] || PROFILES.standard;
  const targetXp = V3.targetEncounterXp({ ...spec, encounterDifficulty: difficulty });
  const rng = rngFrom(`${spec?.type}:${spec?.seed}:${avgPartyLevel}:${partySize}:${difficulty}:${spec?.enemyFaction || "auto"}:encounter-v4-groups`);
  const assignment = assignRoomGroups(spec, rooms, avgPartyLevel, difficulty, rng);

  rooms.forEach((room) => {
    room.enemies = [];
    room.enemyGroup = assignment.byRoom.get(room.id) || null;
  });

  const maxEnemies = Math.min(14, Math.max(2, partySize * 2 + 3));
  const plan = [];
  let totalXp = 0;

  const add = (option) => {
    if (!option || plan.length >= maxEnemies) return false;
    if (roomCount(plan, option.room.id) >= roomCap(option.room)) return false;
    const entry = option.entry;
    const group = option.group || assignment.byRoom.get(option.room.id) || enemyGroupForEntry(entry);
    const enemy = decorate({
      type: String(entry?.name || "NPC"),
      count: 1,
      candidates: [String(entry?.name || "NPC")],
      level: option.level,
      npcId: String(entry?.id || ""),
      enemyGroup: group,
    }, entry, option.rank, rng);
    plan.push({ room: option.room, enemy, entry, group });
    totalXp += enemy.xp;
    return true;
  };

  if (difficulty === "deadly") {
    add(bestMandatory(rooms, assignment.byRoom, avgPartyLevel, difficulty, plan, "legendary", targetXp * .42, clamp(avgPartyLevel + 2, 1, 50), rng));
    add(bestMandatory(rooms, assignment.byRoom, avgPartyLevel, difficulty, plan, "special", targetXp * .25, clamp(avgPartyLevel + 1, 1, 50), rng));
  } else if (difficulty === "hard") {
    add(bestMandatory(rooms, assignment.byRoom, avgPartyLevel, difficulty, plan, "special", targetXp * .32, clamp(avgPartyLevel + 1, 1, 50), rng));
    const legendary = bestMandatory(rooms, assignment.byRoom, avgPartyLevel, difficulty, plan, "legendary", targetXp * .34, clamp(avgPartyLevel + 1, 1, 50), rng);
    if (partySize >= 4 && legendary && totalXp + legendary.cost <= targetXp * 1.08 && rng() < .35) add(legendary);
  } else if (difficulty === "standard") {
    add(bestMandatory(rooms, assignment.byRoom, avgPartyLevel, difficulty, plan, "standard", targetXp * .3, avgPartyLevel, rng));
    const special = bestMandatory(rooms, assignment.byRoom, avgPartyLevel, difficulty, plan, "special", targetXp * .24, avgPartyLevel, rng);
    if (partySize >= 3 && special && totalXp + special.cost <= targetXp * 1.05) add(special);
  } else {
    const starterRank = partySize >= 2 ? "minion" : "standard";
    add(bestMandatory(rooms, assignment.byRoom, avgPartyLevel, difficulty, plan, starterRank, targetXp * .35, clamp(avgPartyLevel - 2, 1, 50), rng));
  }

  let guard = 0;
  while (totalXp < targetXp * .94 && plan.length < maxEnemies && guard < 120) {
    guard += 1;
    const option = bestNext(rooms, assignment.byRoom, avgPartyLevel, difficulty, plan, totalXp, targetXp, rng);
    if (!option) break;
    const projected = totalXp + option.cost;
    if (totalXp >= targetXp * .82 && projected > targetXp * 1.15) break;
    if (!add(option)) break;
  }

  if (!plan.length) {
    const fallback = bestMandatory(
      rooms,
      assignment.byRoom,
      avgPartyLevel,
      difficulty,
      plan,
      difficulty === "easy" ? "minion" : "standard",
      targetXp,
      avgPartyLevel,
      rng,
    );
    add(fallback);
  }

  const grouped = new Map();
  plan.forEach(({ room, enemy, group }) => {
    const key = `${room.id}|${enemy.npcId || enemy.type}|${enemy.rank}|${enemy.specialFeatureId}|${enemy.legendaryAbilityId}|${group}`;
    if (!grouped.has(key)) grouped.set(key, { room, enemy: { ...enemy, count: 0 }, group });
    grouped.get(key).enemy.count += 1;
  });

  grouped.forEach(({ room, enemy, group }) => {
    room.enemyGroup = group;
    room.enemies.push(enemy);
    if (!room.markers.includes("ENEMY")) room.markers.push("ENEMY");
  });

  return rooms;
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const base = V3.summarizeEncounter(spec, rooms);
  const enemyGroups = {};
  const roomEnemyGroups = {};

  rooms.forEach((room) => {
    const groups = new Set();
    (room?.enemies || []).forEach((enemy) => {
      const group = enemy?.enemyGroup || room?.enemyGroup || enemyGroupForEntry(findAnyEntry(enemy?.npcId || enemy?.type) || enemy?.type);
      const count = Math.max(0, num(enemy?.count, 0));
      enemyGroups[group] = (enemyGroups[group] || 0) + count;
      groups.add(group);
    });
    if (groups.size) roomEnemyGroups[room.id] = [...groups];
  });

  return {
    ...base,
    selectedEnemyGroup: normalizeEnemyGroup(spec?.enemyFaction || spec?.enemyGroup || "auto"),
    enemyGroups,
    roomEnemyGroups,
  };
}
