import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import {
  enemyGroupForEntry,
  normalizeEnemyGroup,
} from "./proceduralEnemyGroups.js";
import {
  normalizeEnemyCountOverride,
  proceduralRankCounts,
} from "./proceduralEncounterBalance.js";
import { generateVaultLayout } from "./proceduralVaultGenerator.js";

const VAULT_AUTO_GROUPS = [
  "ghoul",
  "robot",
  "raider",
  "super_mutant",
  "institute",
  "vault_dweller",
  "insect",
];

function hashSeed(value) {
  const text = String(value ?? "1");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rngFor(value) {
  let state = hashSeed(value);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isNpcEntry(entry) {
  if (!entry || entry.statKind === "rule") return false;
  return !["trap", "hazard", "obstacle"].includes(String(entry.category || "").toLowerCase());
}

function difficultyTotal(spec = {}) {
  const party = Math.max(1, Math.floor(Number(spec.partySize || 4)));
  const difficulty = String(spec.encounterDifficulty || "standard");
  const factor = difficulty === "easy" ? 0.75 : difficulty === "hard" ? 1.5 : difficulty === "deadly" ? 2 : 1;
  return Math.max(1, Math.min(50, Math.round(party * factor)));
}

export function vaultRoomTiles(layout) {
  return (layout?.tiles || []).filter((tile) => tile.kind !== "corridor" && tile.tileId !== "atrium_vault_entrance");
}

export function vaultRoomMarkers(layout) {
  return vaultRoomTiles(layout).map((tile, index) => ({
    id: `vault-room-marker-${tile.id}`,
    roomId: tile.id,
    tileId: tile.tileId,
    label: tile.label || tile.tileId,
    marker: index + 1,
    x: Number(tile.cellX || 0) + Number(tile.w || 12) / 2,
    y: Number(tile.cellY || 0) + Number(tile.h || 12) / 2,
    sector: tile.sector || "",
    ruined: tile.kind === "ruined_room",
  }));
}

function chooseGroup(spec, rng) {
  const requested = normalizeEnemyGroup(spec?.enemyFaction);
  if (requested && requested !== "auto") return requested;
  return VAULT_AUTO_GROUPS[Math.floor(rng() * VAULT_AUTO_GROUPS.length)] || "ghoul";
}

function compatibleEntries(group) {
  const entries = BESTIARY_ENTRIES.filter(isNpcEntry).filter((entry) => enemyGroupForEntry(entry) === group);
  return entries.length ? entries : BESTIARY_ENTRIES.filter(isNpcEntry);
}

function shuffled(rng, values) {
  return [...values]
    .map((value) => ({ value, roll: rng() }))
    .sort((a, b) => a.roll - b.roll)
    .map((item) => item.value);
}

export function generateVaultEncounterPlan(spec = {}, suppliedLayout = null) {
  const layout = suppliedLayout || generateVaultLayout(spec);
  const rooms = vaultRoomTiles(layout);
  if (!rooms.length) return { group: "auto", total: 0, rooms: [], rankCounts: { minion: 0, standard: 0, special: 0, legendary: 0 } };

  const rng = rngFor(`vault-encounter:${spec.seed || "1"}:${spec.cols || 24}:${spec.enemyFaction || "auto"}:${spec.encounterDifficulty || "standard"}:${spec.enemyCountOverride || 0}`);
  const group = chooseGroup(spec, rng);
  const entries = compatibleEntries(group);
  const override = normalizeEnemyCountOverride(spec?.enemyCountOverride);
  const total = override || difficultyTotal(spec);
  const rankCounts = proceduralRankCounts(total);
  const ranks = [];
  ["legendary", "special", "standard", "minion"].forEach((rank) => {
    for (let i = 0; i < Number(rankCounts?.[rank] || 0); i += 1) ranks.push(rank);
  });
  while (ranks.length < total) ranks.push("standard");

  const orderedRooms = shuffled(rng, rooms);
  const result = orderedRooms.map((room) => ({ room, enemies: [] }));
  ranks.slice(0, total).forEach((rank, index) => {
    const roomBucket = result[index % result.length];
    const entry = entries[Math.floor(rng() * entries.length)] || entries[0];
    if (!entry) return;
    roomBucket.enemies.push({
      entry,
      type: entry.name || entry.id || "Enemy",
      npcId: entry.id || "",
      rank,
      count: 1,
      enemyGroup: group,
      baseXp: Number(entry.baseXp ?? entry.xp ?? 10) || 10,
      xp: Number(entry.baseXp ?? entry.xp ?? 10) || 10,
    });
  });

  return {
    group,
    total,
    rankCounts,
    rooms: result.filter((item) => item.enemies.length),
  };
}

export function vaultSpawnCells(tile) {
  if (!tile) return [];
  const x0 = Math.floor(Number(tile.cellX || 0));
  const y0 = Math.floor(Number(tile.cellY || 0));
  const w = Math.max(1, Math.floor(Number(tile.w || 12)));
  const h = Math.max(1, Math.floor(Number(tile.h || 12)));
  const cells = [];
  for (let y = y0 + 2; y <= y0 + h - 3; y += 1) {
    for (let x = x0 + 2; x <= x0 + w - 3; x += 1) {
      const dx = Math.abs(x - (x0 + (w - 1) / 2));
      const dy = Math.abs(y - (y0 + (h - 1) / 2));
      cells.push({ x, y, score: dx + dy });
    }
  }
  return cells.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
}
