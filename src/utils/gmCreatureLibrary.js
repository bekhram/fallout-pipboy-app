import { getCampaign, putCampaign } from "./sessionLocalCache.js";
import { makeId } from "./gmSessionModel.js";

const LIBRARY_ID = "pip2d20-gm-custom-creatures-v1";

function normalizeCreature(value = {}) {
  const maxHp = Math.max(0, Number(value.maxHp ?? value.hp ?? 0) || 0);
  return {
    id: String(value.id || makeId("creature")),
    name: String(value.name || "Creature").trim().slice(0, 80) || "Creature",
    size: Number(value.size) === 2 ? 2 : 1,
    hp: Math.max(0, Number(value.hp ?? maxHp) || 0),
    maxHp,
    defense: Math.max(0, Number(value.defense || 0) || 0),
    initiative: Math.max(0, Number(value.initiative || 0) || 0),
    level: Math.max(0, Number(value.level || 0) || 0),
    attacks: String(value.attacks || "").slice(0, 1200),
    drBlock: String(value.drBlock || "").slice(0, 600),
    avatar: String(value.avatar || "").startsWith("data:image/") ? String(value.avatar) : "",
    updatedAt: Number(value.updatedAt || Date.now()),
  };
}

export async function loadCustomCreatures() {
  const record = await getCampaign(LIBRARY_ID).catch(() => null);
  const list = Array.isArray(record?.creatures) ? record.creatures : [];
  return list.map(normalizeCreature);
}

async function write(creatures) {
  const normalized = creatures.map(normalizeCreature);
  await putCampaign({
    campaignId: LIBRARY_ID,
    role: "gm-creature-library",
    revision: Date.now(),
    creatures: normalized,
  });
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
  return normalizeCreature({ id: makeId("creature"), name: "", hp: 10, maxHp: 10, defense: 1, initiative: 0, level: 1, size: 1 });
}
