import { getCampaign, putCampaign } from "./sessionLocalCache.js";
import { makeId } from "./gmSessionModel.js";

const LIBRARY_ID = "pip2d20-gm-custom-creatures-v1";
export const CUSTOM_CREATURES_CHANGED_EVENT = "pip2d20:custom-creatures-changed";
const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];

function normalizeSpecial(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(SPECIAL_KEYS.map((key) => [key, String(source[key] ?? "").slice(0, 12)]));
}

function normalizeSkills(value) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("\n").slice(0, 1600);
  }
  return String(value || "").slice(0, 1600);
}

function normalizeCreature(value = {}) {
  const maxHp = Math.max(0, Number(value.maxHp ?? value.hp ?? 0) || 0);
  return {
    id: String(value.id || makeId("creature")),
    name: String(value.name || "Creature").trim().slice(0, 80) || "Creature",
    category: String(value.category || "npc").trim().slice(0, 40) || "npc",
    creatureType: String(value.creatureType || "").trim().slice(0, 100),
    size: Number(value.size) === 2 ? 2 : 1,
    level: Math.max(0, Number(value.level || 0) || 0),
    xp: Math.max(0, Number(value.xp || 0) || 0),
    hp: Math.max(0, Number(value.hp ?? maxHp) || 0),
    maxHp,
    defense: Math.max(0, Number(value.defense || 0) || 0),
    initiative: Math.max(0, Number(value.initiative || 0) || 0),
    body: String(value.body ?? "").slice(0, 20),
    mind: String(value.mind ?? "").slice(0, 20),
    melee: String(value.melee ?? "").slice(0, 20),
    guns: String(value.guns ?? "").slice(0, 20),
    other: String(value.other ?? "").slice(0, 20),
    special: normalizeSpecial(value.special),
    skills: normalizeSkills(value.skills),
    attacks: String(value.attacks || "").slice(0, 2000),
    abilities: String(value.abilities || "").slice(0, 2400),
    drBlock: String(value.drBlock || "").slice(0, 1200),
    tactics: String(value.tactics || "").slice(0, 1600),
    loot: String(value.loot || "").slice(0, 1600),
    summary: String(value.summary || "").slice(0, 1800),
    source: String(value.source || "").slice(0, 600),
    notes: String(value.notes || "").slice(0, 1800),
    avatar: String(value.avatar || "").startsWith("data:image/") ? String(value.avatar) : "",
    updatedAt: Number(value.updatedAt || Date.now()),
  };
}

export async function loadCustomCreatures() {
  const record = await getCampaign(LIBRARY_ID).catch(() => null);
  const list = Array.isArray(record?.creatures) ? record.creatures : [];
  return list.map(normalizeCreature);
}

function notifyChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CUSTOM_CREATURES_CHANGED_EVENT));
}

async function write(creatures) {
  const normalized = creatures.map(normalizeCreature);
  await putCampaign({
    campaignId: LIBRARY_ID,
    role: "gm-creature-library",
    revision: Date.now(),
    creatures: normalized,
  });
  notifyChanged();
  return normalized;
}

export async function saveCustomCreature(creature) {
  const current = await loadCustomCreatures();
  const nextCreature = normalizeCreature({ ...creature, updatedAt: Date.now() });
  const index = current.findIndex((item) => item.id === nextCreature.id);
  if (index >= 0) current[index] = nextCreature;
  else current.push(nextCreature);
  await write(current);
  return nextCreature;
}

export async function deleteCustomCreature(id) {
  const current = await loadCustomCreatures();
  const next = current.filter((item) => item.id !== id);
  await write(next);
  return next;
}

export function blankCreature() {
  return normalizeCreature({
    id: makeId("creature"),
    name: "",
    category: "npc",
    creatureType: "Human",
    hp: 10,
    maxHp: 10,
    defense: 1,
    initiative: 0,
    level: 1,
    size: 1,
    special: { STR: 5, PER: 5, END: 5, CHA: 5, INT: 5, AGI: 5, LCK: 5 },
  });
}
