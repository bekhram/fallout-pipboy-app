import { getSelectedWeaponMods, getWeaponModGroups, applyWeaponMods } from "../data/weaponMods.js";
import { applyNpcRank, normalizeWeaponAttack, parseAttackText } from "./npcCombat.js";
import { loadNpcWeaponDatabase } from "./npcWeaponDatabase.js";
import { buildProceduralNpcLevelStats } from "./proceduralNpcLeveling.js";

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value, fallback = 0) {
  return Math.floor(num(value, fallback));
}

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/double[- ]barrelled/g, "double barrel")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalAttackWeaponName(value) {
  let name = normalizeName(value)
    .replace(/\b(improved|long|short|standard|heavy|sturdy)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/\blaser\b/.test(name) && /\b(rifle|pistol)\b/.test(name)) name = "laser gun";
  if (/\bplasma\b/.test(name) && /\b(rifle|pistol)\b/.test(name)) name = "plasma gun";
  if (/\bpipe\b/.test(name) && /\b(rifle|pistol)\b/.test(name) && !/bolt/.test(name)) name = "pipe gun";
  return name;
}

function weaponFamilyFromSkill(skill) {
  const key = normalizeName(skill);
  if (key === "small guns") return "small";
  if (key === "energy weapons") return "energy";
  if (key === "big guns") return "big";
  if (key === "melee weapons") return "melee";
  if (key === "explosives") return "explosive";
  return "";
}

function weaponFamily(weapon = {}) {
  const type = normalizeName(weapon.weaponType);
  if (type.includes("small gun")) return "small";
  if (type.includes("energy weapon")) return "energy";
  if (type.includes("big gun")) return "big";
  if (type.includes("melee weapon")) return "melee";
  if (type.includes("explosive")) return "explosive";
  return "";
}

function weaponSkillForFamily(family) {
  if (family === "small") return "Small Guns";
  if (family === "energy") return "Energy Weapons";
  if (family === "big") return "Big Guns";
  if (family === "melee") return "Melee Weapons";
  if (family === "explosive") return "Explosives";
  return "";
}

function rarityOf(weapon = {}) {
  const match = String(weapon.rarity ?? "").match(/\d+/);
  return match ? Math.max(0, Number(match[0])) : 0;
}

function nameTokens(value) {
  return new Set(canonicalAttackWeaponName(value).split(" ").filter(Boolean));
}

function matchScore(weapon, profile) {
  const wanted = canonicalAttackWeaponName(profile?.name);
  const current = canonicalAttackWeaponName(weapon?.name);
  let score = 0;
  if (wanted && current === wanted) score += 1000;
  else if (wanted && (wanted.includes(current) || current.includes(wanted))) score += 450;

  const wantedTokens = nameTokens(profile?.name);
  const weaponTokens = nameTokens(weapon?.name);
  let overlap = 0;
  wantedTokens.forEach((token) => { if (weaponTokens.has(token)) overlap += 1; });
  score += overlap * 100;
  score -= Math.abs(num(weapon?.damage, 0) - num(profile?.damageDice, 0)) * 7;
  const wantedRange = String(profile?.range || "").toUpperCase();
  if (wantedRange && wantedRange === String(weapon?.range || "").toUpperCase()) score += 15;
  return score;
}

function cloneWeapon(weapon = {}, skill = "") {
  return {
    ...weapon,
    skill: skill || weapon.skill || weaponSkillForFamily(weaponFamily(weapon)),
    damageDice: num(weapon.damageDice ?? weapon.damage, 0),
    mods: { ...(weapon.mods || {}) },
  };
}

function findBaseWeapon(profile, database = []) {
  const family = weaponFamilyFromSkill(profile?.skill);
  if (!family) return null;
  const candidates = database.filter((weapon) => weaponFamily(weapon) === family);
  if (!candidates.length) return null;
  return cloneWeapon(
    [...candidates].sort((a, b) => matchScore(b, profile) - matchScore(a, profile) || rarityOf(a) - rarityOf(b))[0],
    profile.skill,
  );
}

function weaponProfiles(attacks = "") {
  return parseAttackText(attacks)
    .filter((profile) => weaponFamilyFromSkill(profile?.skill))
    .sort((a, b) => num(b?.damageDice, 0) - num(a?.damageDice, 0));
}

function chooseBaseProfile(attacks, database) {
  for (const profile of weaponProfiles(attacks)) {
    const weapon = findBaseWeapon(profile, database);
    if (weapon) return { profile, weapon };
  }
  return null;
}

function modScore(mod = {}) {
  const effect = String(mod.effect || "").toLowerCase();
  let score = 0;
  const damage = effect.match(/\+(\d+)\s*damage/);
  const rate = effect.match(/\+(\d+)\s*fire rate/);
  if (damage) score += Number(damage[1]) * 12;
  if (rate) score += Number(rate[1]) * 6;
  if (/gain (vicious|accurate|piercing|reliable|stun|persistent|burst|spread|recon|night vision)/.test(effect)) score += 7;
  if (/remove (inaccurate|unreliable|close quarters)/.test(effect)) score += 6;
  if (/increase range/.test(effect)) score += 4;
  if (/-\d+\s*damage/.test(effect)) score -= 8;
  if (/gain (inaccurate|unreliable)/.test(effect)) score -= 5;
  return score;
}

function applyOneMod(weapon, salt) {
  const groups = getWeaponModGroups(weapon) || {};
  const selected = weapon.mods || {};
  const candidates = [];
  Object.entries(groups).forEach(([slot, mods]) => {
    if (selected[slot]) return;
    (mods || []).forEach((mod) => candidates.push({ slot, mod, score: modScore(mod) }));
  });
  if (!candidates.length) return null;

  const bestScore = Math.max(...candidates.map((item) => item.score));
  const best = candidates.filter((item) => item.score === bestScore);
  const picked = best[hashSeed(`${salt}:mod`) % best.length];
  const next = applyWeaponMods({
    ...weapon,
    mods: { ...selected, [picked.slot]: picked.mod.name },
  });
  return {
    weapon: cloneWeapon(next, weapon.skill),
    event: {
      type: "mod",
      slot: picked.slot,
      mod: picked.mod.name,
      effect: picked.mod.effect,
    },
  };
}

function upgradeRarity(weapon, database, salt) {
  const family = weaponFamily(weapon);
  const currentRarity = rarityOf(weapon);
  const higher = database.filter((candidate) => weaponFamily(candidate) === family && rarityOf(candidate) > currentRarity);
  if (!higher.length) return null;
  const nextRarity = Math.min(...higher.map(rarityOf));
  const tier = higher.filter((candidate) => rarityOf(candidate) === nextRarity);
  const maxDamage = Math.max(...tier.map((candidate) => num(candidate.damage, 0)));
  const strongest = tier.filter((candidate) => num(candidate.damage, 0) === maxDamage);
  const picked = strongest[hashSeed(`${salt}:rarity`) % strongest.length];
  return {
    weapon: cloneWeapon(picked, weapon.skill || weaponSkillForFamily(family)),
    event: {
      type: "replace",
      from: weapon.name,
      fromRarity: currentRarity,
      to: picked.name,
      toRarity: nextRarity,
    },
  };
}

function displayWeaponName(weapon) {
  const prefixes = getSelectedWeaponMods(weapon)
    .map((mod) => String(mod?.prefix || "").trim())
    .filter(Boolean);
  return [...prefixes, weapon.name].join(" ").replace(/\s+/g, " ").trim() || weapon.name || "Weapon";
}

function cleanDamageType(value) {
  const text = String(value || "Physical");
  const match = text.match(/Physical|Energy|Radiation|Poison/i);
  return match ? match[0] : "Physical";
}

function uniqueCsv(...values) {
  const result = [];
  values.flatMap((value) => String(value || "").split(/[,•;]/)).map((item) => item.trim()).filter(Boolean).forEach((item) => {
    if (!result.some((existing) => normalizeName(existing) === normalizeName(item))) result.push(item);
  });
  return result;
}

function buildGeneratedAttack(weapon, profile, id) {
  const name = displayWeaponName(weapon);
  const effects = uniqueCsv(weapon.effects, weapon.effect);
  const qualities = uniqueCsv(weapon.qualities);
  const structured = normalizeWeaponAttack({
    ...weapon,
    id,
    weaponId: weapon.id || id,
    name,
    targetNumber: num(profile?.targetNumber, 0),
    attribute: profile?.attribute || "AGI",
    skill: profile?.skill || weapon.skill || "Combat",
    damageDice: num(weapon.damage ?? weapon.damageDice, profile?.damageDice || 0),
    damageType: cleanDamageType(weapon.damageType || profile?.damageType),
    effects: effects.join(", "),
    qualities: qualities.join(", "),
    source: "level-up",
  });

  const parts = [
    `${structured.attribute} + ${structured.skill} (TN ${structured.targetNumber})`,
    `${structured.damageDice} CD ${structured.effects ? `${structured.effects} ` : ""}${structured.damageType} damage`,
  ];
  if (structured.range) parts.push(`Range ${structured.range}`);
  if (num(weapon.rate, 0) > 0) parts.push(`FR ${integer(weapon.rate, 0)}`);
  if (structured.qualities) parts.push(structured.qualities);

  return {
    structured,
    line: `• ${name.toUpperCase()} — ${parts.join(", ")}`,
  };
}

export async function buildProceduralNpcEquipment(entry = {}, enemy = {}, levelStats = {}, context = {}) {
  const steps = Math.max(0, integer(levelStats?.levelEquipmentUpgradeSteps, 0));
  if (String(entry?.statKind || "").toLowerCase() !== "character" || steps <= 0) {
    return { attacks: levelStats?.attacks || entry?.attacks || "", weapons: [], customAttacks: [], upgrades: [] };
  }

  let database = [];
  try {
    database = await loadNpcWeaponDatabase();
  } catch {
    return { attacks: levelStats?.attacks || entry?.attacks || "", weapons: [], customAttacks: [], upgrades: [] };
  }

  const base = chooseBaseProfile(levelStats?.attacks || entry?.attacks || "", database);
  if (!base) return { attacks: levelStats?.attacks || entry?.attacks || "", weapons: [], customAttacks: [], upgrades: [] };

  const salt = [context.stamp || "", context.locationId || "", entry?.id || entry?.name || "npc", levelStats?.level || enemy?.level || 1].join(":");
  let weapon = base.weapon;
  const upgrades = [];

  for (let step = 0; step < steps; step += 1) {
    const stepSalt = `${salt}:equipment:${step}`;
    const preferMod = (hashSeed(stepSalt) & 1) === 0;
    const first = preferMod ? applyOneMod(weapon, stepSalt) : upgradeRarity(weapon, database, stepSalt);
    const second = first || (preferMod ? upgradeRarity(weapon, database, stepSalt) : applyOneMod(weapon, stepSalt));
    if (!second) break;
    weapon = second.weapon;
    upgrades.push({ step: step + 1, ...second.event });
  }

  if (!upgrades.length) return { attacks: levelStats?.attacks || entry?.attacks || "", weapons: [], customAttacks: [], upgrades: [] };

  const attackId = `level-weapon-${String(entry?.id || "npc")}-${levelStats?.level || enemy?.level || 1}`;
  const generated = buildGeneratedAttack(weapon, base.profile, attackId);
  const attacks = [levelStats?.attacks || entry?.attacks || "", generated.line].filter(Boolean).join("\n");

  return {
    attacks,
    weapons: [{ ...weapon, name: displayWeaponName(weapon), source: "level-up" }],
    customAttacks: [generated.structured],
    upgrades,
    generatedAttack: generated.structured,
  };
}

export async function buildProceduralNpcTokenStats(entry = {}, enemy = {}, context = {}) {
  const leveled = buildProceduralNpcLevelStats(entry, enemy);
  const equipment = await buildProceduralNpcEquipment(entry, enemy, leveled, context);
  const baseXp = Math.max(1, num(enemy?.baseXp ?? entry?.baseXp ?? entry?.xp, enemy?.xp || 10));
  const base = {
    ...leveled,
    xp: baseXp,
    baseXp,
    creatureType: entry?.creatureType || enemy?.type || "",
    melee: entry?.melee || "",
    guns: entry?.guns || "",
    other: entry?.other || "",
    abilities: entry?.abilities || "",
    tactics: entry?.tactics || "",
    attacks: equipment.attacks,
    weapons: equipment.weapons,
    customAttacks: equipment.customAttacks,
    levelEquipmentUpgrades: equipment.upgrades,
    levelGeneratedWeaponAttack: equipment.generatedAttack || null,
    footprint: 1,
    size: 1,
    baseSize: 1,
  };

  return {
    ...applyNpcRank(base, {
      rank: enemy?.rank || "standard",
      specialFeatureId: enemy?.specialFeatureId || "",
      specialFeature: enemy?.specialFeature || "",
      legendaryAbilityId: enemy?.legendaryAbilityId || "",
      legendaryAbility: enemy?.legendaryAbility || "",
      legendaryRewardType: enemy?.legendaryRewardType || "",
      legendaryReward: enemy?.legendaryReward || "",
    }),
    generatedEncounterSeed: context.stamp || "",
    ...(context.roomId ? { generatedRoomId: context.roomId } : {}),
    ...(context.poiId ? { generatedPoiId: context.poiId } : {}),
    generatedEncounterRank: enemy?.rank || "standard",
    generatedEnemyGroup: enemy?.enemyGroup || "",
  };
}
