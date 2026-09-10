import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { NPC_RANK_RULES } from "./npcCombat.js";
import { SPECIAL_CREATURE_FEATURES, legendaryAbilitiesFor } from "./npcFeaturePresets.js";
import * as V2 from "./proceduralEncounterBalanceV2.js";

export * from "./proceduralEncounterBalanceV2.js";

const PROFILES = {
  easy: { shift: -2, min: -4, max: 0, ranks: ["minion", "standard"], shares: { minion: .55, standard: .45 } },
  standard: { shift: 0, min: -2, max: 1, ranks: ["minion", "standard", "special"], shares: { minion: .2, standard: .65, special: .15 } },
  hard: { shift: 1, min: -1, max: 3, ranks: ["minion", "standard", "special", "legendary"], shares: { minion: .1, standard: .42, special: .4, legendary: .08 } },
  deadly: { shift: 2, min: 0, max: 4, ranks: ["minion", "standard", "special", "legendary"], shares: { minion: .08, standard: .3, special: .47, legendary: .15 } },
};

const LOCATION_PATTERNS = {
  red_rocket: /raider|ghoul|radroach|mole rat|mongrel|dog|protectron|robot|turret|eyebot|gutsy|sentry/i,
  super_duper_mart: /ghoul|raider|radroach|protectron|robot|turret|eyebot/i,
  raider_camp: /raider/i,
  military_bunker: /protectron|robot|turret|gutsy|sentry|assaultron|eyebot|security|ghoul/i,
};

const FALLBACKS = {
  wasteland: { roomId: "camp", pool: ["Raider", "Feral Ghoul", "Mole Rat", "Radroach", "Wild Mongrel"] },
  red_rocket: { roomId: "garage", pool: ["Raider", "Protectron", "Mole Rat", "Feral Ghoul", "Radroach"] },
  super_duper_mart: { roomId: "sales", pool: ["Feral Ghoul", "Raider", "Radroach"] },
  raider_camp: { roomId: "courtyard", pool: ["Raider", "Raider Veteran", "Raider Psycho", "Raider Scavver"] },
  military_bunker: { roomId: "control", pool: ["Protectron", "Mr. Gutsy", "Security Robot", "Feral Ghoul"] },
};

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, num(value, min)));
}

function norm(value) {
  return String(value || "").toLowerCase().replace(/[’'`]/g, "").replace(/[^a-z0-9а-яёіїєґ]+/gi, " ").replace(/\s+/g, " ").trim();
}

function text(entry = {}) {
  return norm([entry.name, entry.creatureType, entry.category, ...(Array.isArray(entry.tags) ? entry.tags : [])].filter(Boolean).join(" "));
}

function hashSeed(value) {
  const source = String(value ?? "0");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
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

function pick(rng, list) { return list?.length ? list[Math.floor(rng() * list.length)] : null; }

function combatEntries() {
  return BESTIARY_ENTRIES.filter((entry) => {
    const category = String(entry?.category || "").toLowerCase();
    return num(entry?.level) > 0 && !["trap", "hazard", "obstacle", "ally"].includes(category);
  });
}

const ENTRIES = combatEntries();

function family(value) {
  const source = typeof value === "string" ? norm(value) : text(value);
  if (/raider/.test(source)) return "raider";
  if (/ghoul|feral/.test(source)) return "ghoul";
  if (/robot|protectron|turret|gutsy|sentry|assaultron|eyebot|security/.test(source)) return "robot";
  if (/super mutant|nightkin|mutant hound/.test(source)) return "mutant";
  if (/radroach|bloodbug|bloatfly|stingwing|insect/.test(source)) return "insect";
  if (/mirelurk|crustacean/.test(source)) return "mirelurk";
  if (/mole rat/.test(source)) return "mole_rat";
  if (/mongrel|dog|canine/.test(source)) return "canine";
  if (/deathclaw|reptile/.test(source)) return "reptile";
  if (/human|person|people|gunner|npc/.test(source)) return "human";
  return "creature";
}

function sourceGroups(spec, rooms) {
  const existing = rooms.flatMap((room) => (room.enemies || []).map((enemy) => ({ room, enemy })));
  if (existing.length) return existing;
  const fallback = FALLBACKS[spec.type] || FALLBACKS.wasteland;
  const room = rooms.find((item) => item.id === fallback.roomId) || rooms[0];
  if (!room) return [];
  const enemy = { type: fallback.pool[0], count: 1, candidates: fallback.pool };
  room.enemies.push(enemy);
  if (!room.markers.includes("ENEMY")) room.markers.push("ENEMY");
  return [{ room, enemy }];
}

function buildPool(spec, groups, avgLevel, difficulty) {
  const profile = PROFILES[difficulty] || PROFILES.standard;
  const preferred = clamp(avgLevel + profile.shift, 1, 50);
  const minLevel = clamp(avgLevel + profile.min, 1, 50);
  const maxLevel = clamp(avgLevel + profile.max, 1, 50);
  const wantedFamilies = new Set();
  groups.forEach(({ enemy }) => [...(enemy.candidates || []), enemy.type].filter(Boolean).forEach((name) => wantedFamilies.add(family(name))));

  const pattern = LOCATION_PATTERNS[spec.type];
  const location = pattern ? ENTRIES.filter((entry) => pattern.test(text(entry))) : ENTRIES;
  const source = location.length ? location : ENTRIES;

  let pool = source.filter((entry) => {
    const level = num(entry.level, 1);
    return level >= minLevel && level <= maxLevel && (wantedFamilies.has(family(entry)) || wantedFamilies.has("creature"));
  });
  if (pool.length < 3) pool = source.filter((entry) => num(entry.level, 1) >= minLevel && num(entry.level, 1) <= maxLevel);
  if (!pool.length) pool = [...source].sort((a, b) => Math.abs(num(a.level) - preferred) - Math.abs(num(b.level) - preferred)).slice(0, 12);

  const exact = groups.flatMap(({ enemy }) => (enemy.candidates || [enemy.type]).map((name) => V2.findBestiaryCombatEntry(name)).filter(Boolean));
  const unique = new Map();
  [...pool, ...exact].forEach((entry) => unique.set(String(entry.id || entry.name), entry));
  return [...unique.values()].map((entry) => ({ entry, level: num(entry.level, 1), baseXp: V2.normalNpcXpForLevel(entry.level), preferred }));
}

function decorate(enemy, entry, rank, rng) {
  const baseXp = V2.normalNpcXpForLevel(enemy.level || entry?.level || 1);
  const result = {
    ...enemy, rank, baseXp, xp: V2.rankXp(baseXp, rank), xpMultiplier: NPC_RANK_RULES[rank]?.xpMultiplier ?? 1,
    specialFeatureId: "", specialFeature: "", legendaryAbilityId: "", legendaryAbility: "", legendaryRewardType: "", legendaryReward: "",
  };
  if (rank === "special") {
    const feature = pick(rng, SPECIAL_CREATURE_FEATURES);
    if (feature) { result.specialFeatureId = feature.id; result.specialFeature = `${feature.name} — ${feature.summary}`; }
  }
  if (rank === "legendary") {
    const kind = String(entry?.cardKind || "creature").toLowerCase() === "npc" ? "npc" : "creature";
    const ability = pick(rng, legendaryAbilitiesFor(kind));
    if (ability) { result.legendaryAbilityId = ability.id; result.legendaryAbility = `${ability.name} — ${ability.summary}`; }
    result.legendaryRewardType = rng() < .5 ? "weapon" : "armor";
    result.legendaryReward = "Legendary encounter reward";
  }
  return result;
}

function roomCap(room) { return ["wc", "office"].includes(String(room?.id || "").toLowerCase()) ? 1 : 4; }
function roomCount(plan, id) { return plan.filter((item) => item.room.id === id).length; }

function chooseRoom(rooms, groups, plan, rng) {
  const preferredIds = new Set(groups.map(({ room }) => room.id));
  let available = rooms.filter((room) => preferredIds.has(room.id) && roomCount(plan, room.id) < roomCap(room));
  if (!available.length) available = rooms.filter((room) => String(room.id || "").toLowerCase() !== "wc" && roomCount(plan, room.id) < roomCap(room));
  if (!available.length) return null;
  const minUsed = Math.min(...available.map((room) => roomCount(plan, room.id)));
  return pick(rng, available.filter((room) => roomCount(plan, room.id) === minUsed));
}

function counts(plan) {
  const result = { minion: 0, standard: 0, special: 0, legendary: 0 };
  plan.forEach(({ enemy }) => { result[enemy.rank] = (result[enemy.rank] || 0) + 1; });
  return result;
}

function repeatCount(plan, entry) {
  const id = String(entry?.id || entry?.name || "");
  return plan.filter((item) => String(item.entry?.id || item.entry?.name || "") === id).length;
}

function bestMandatory(pool, rank, xpShare, preferred) {
  return [...pool].map((candidate) => {
    const cost = V2.rankXp(candidate.baseXp, rank);
    return { ...candidate, rank, cost, score: Math.abs(cost - xpShare) / Math.max(1, xpShare) + Math.abs(candidate.level - preferred) * .05 };
  }).sort((a, b) => a.score - b.score)[0] || null;
}

function bestNext(pool, ranks, plan, profile, currentXp, targetXp, rng) {
  const currentCounts = counts(plan);
  let best = null;
  for (const candidate of pool) {
    for (const rank of ranks) {
      if (rank === "legendary" && currentCounts.legendary >= 1) continue;
      const cost = V2.rankXp(candidate.baseXp, rank);
      const projected = currentXp + cost;
      const budgetError = Math.abs(projected - targetXp) / Math.max(1, targetXp);
      const overshoot = projected > targetXp * 1.12 ? ((projected - targetXp * 1.12) / Math.max(1, targetXp)) * 3 : 0;
      const levelPenalty = Math.abs(candidate.level - candidate.preferred) * .045;
      const repeatPenalty = Math.max(0, repeatCount(plan, candidate.entry) - 1) * .08;
      const projectedShare = (currentCounts[rank] + 1) / (plan.length + 1);
      const rankPenalty = Math.abs(projectedShare - (profile.shares[rank] || 0)) * .18;
      const score = budgetError + overshoot + levelPenalty + repeatPenalty + rankPenalty + rng() * .015;
      if (!best || score < best.score) best = { ...candidate, rank, cost, score };
    }
  }
  return best;
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const rooms = inputRooms.map((room) => ({
    ...room,
    enemies: (room.enemies || []).map((enemy) => ({ ...enemy, candidates: [...(enemy.candidates || [enemy.type])] })),
    markers: [...(room.markers || [])],
  }));
  const groups = sourceGroups(spec, rooms);
  if (!groups.length) return rooms;

  const { avgPartyLevel, partySize } = V2.normalizedPartyConfig(spec);
  const difficulty = V2.normalizeEncounterDifficulty(spec.encounterDifficulty ?? spec.difficulty);
  const profile = PROFILES[difficulty] || PROFILES.standard;
  const targetXp = V2.targetEncounterXp({ ...spec, encounterDifficulty: difficulty });
  const rng = rngFrom(`${spec.type}:${spec.seed}:${avgPartyLevel}:${partySize}:${difficulty}:encounter-v3`);
  const pool = buildPool(spec, groups, avgPartyLevel, difficulty);
  if (!pool.length) return rooms;
  rooms.forEach((room) => { room.enemies = []; });

  const maxEnemies = Math.min(14, Math.max(2, partySize * 2 + 3));
  const plan = [];
  let totalXp = 0;

  const add = (option) => {
    if (!option || plan.length >= maxEnemies) return false;
    const room = chooseRoom(rooms, groups, plan, rng);
    if (!room) return false;
    const entry = option.entry;
    const enemy = decorate({
      type: String(entry?.name || "NPC"), count: 1, candidates: [String(entry?.name || "NPC")], level: option.level, npcId: String(entry?.id || ""),
    }, entry, option.rank, rng);
    plan.push({ room, enemy, entry });
    totalXp += enemy.xp;
    return true;
  };

  if (difficulty === "deadly") {
    add(bestMandatory(pool, "legendary", targetXp * .42, clamp(avgPartyLevel + 2, 1, 50)));
    add(bestMandatory(pool, "special", targetXp * .25, clamp(avgPartyLevel + 1, 1, 50)));
  } else if (difficulty === "hard") {
    add(bestMandatory(pool, "special", targetXp * .32, clamp(avgPartyLevel + 1, 1, 50)));
    const legendary = bestMandatory(pool, "legendary", targetXp * .34, clamp(avgPartyLevel + 1, 1, 50));
    if (partySize >= 4 && legendary && totalXp + legendary.cost <= targetXp * 1.08 && rng() < .35) add(legendary);
  } else if (difficulty === "standard") {
    add(bestMandatory(pool, "standard", targetXp * .3, avgPartyLevel));
    const special = bestMandatory(pool, "special", targetXp * .24, avgPartyLevel);
    if (partySize >= 3 && special && totalXp + special.cost <= targetXp * 1.05) add(special);
  } else {
    add(bestMandatory(pool, partySize >= 2 ? "minion" : "standard", targetXp * .35, clamp(avgPartyLevel - 2, 1, 50)));
  }

  let guard = 0;
  while (totalXp < targetXp * .94 && plan.length < maxEnemies && guard < 100) {
    guard += 1;
    const allowed = profile.ranks.filter((rank) => rank !== "legendary" || counts(plan).legendary === 0);
    const option = bestNext(pool, allowed, plan, profile, totalXp, targetXp, rng);
    if (!option) break;
    const projected = totalXp + option.cost;
    if (totalXp >= targetXp * .82 && projected > targetXp * 1.15) break;
    if (!add(option)) break;
  }

  if (!plan.length) add({ ...pool[0], rank: difficulty === "easy" ? "minion" : "standard" });

  const grouped = new Map();
  plan.forEach(({ room, enemy }) => {
    const key = `${room.id}|${enemy.npcId || enemy.type}|${enemy.rank}|${enemy.specialFeatureId}|${enemy.legendaryAbilityId}`;
    if (!grouped.has(key)) grouped.set(key, { room, enemy: { ...enemy, count: 0 } });
    grouped.get(key).enemy.count += 1;
  });
  grouped.forEach(({ room, enemy }) => {
    room.enemies.push(enemy);
    if (!room.markers.includes("ENEMY")) room.markers.push("ENEMY");
  });
  return rooms;
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const standardTargetXp = V2.baseEncounterXp(spec);
  const targetDifficulty = V2.normalizeEncounterDifficulty(spec.encounterDifficulty ?? spec.difficulty);
  const targetXp = V2.targetEncounterXp({ ...spec, encounterDifficulty: targetDifficulty });
  const { avgPartyLevel, partySize } = V2.normalizedPartyConfig(spec);
  const enemies = rooms.flatMap((room) => (room.enemies || []).map((enemy) => ({ ...enemy, roomId: room.id })));
  const totalEnemies = enemies.reduce((sum, enemy) => sum + num(enemy.count), 0);
  const actualXp = enemies.reduce((sum, enemy) => {
    const baseXp = num(enemy.baseXp, V2.normalNpcXpForLevel(enemy.level || avgPartyLevel));
    return sum + Math.max(1, num(enemy.xp, V2.rankXp(baseXp, enemy.rank))) * num(enemy.count);
  }, 0);
  const actual = V2.encounterDifficulty(actualXp, standardTargetXp);
  const rankCounts = { minion: 0, standard: 0, special: 0, legendary: 0 };
  enemies.forEach((enemy) => {
    const rank = ["minion", "standard", "special", "legendary"].includes(enemy.rank) ? enemy.rank : "standard";
    rankCounts[rank] += num(enemy.count);
  });
  return {
    avgPartyLevel, partySize, baselineXp: V2.normalNpcXpForLevel(avgPartyLevel), standardTargetXp, targetXp, targetDifficulty,
    actualXp, xpPerPlayer: actualXp, totalEnemies, rankCounts,
    difficulty: targetDifficulty,
    actualDifficulty: actual.key,
    ratio: targetXp > 0 ? actualXp / targetXp : 0,
    standardRatio: actual.ratio,
    difficultyOrder: ["easy", "standard", "hard", "deadly"].indexOf(targetDifficulty),
  };
}
