import { parseAttackText } from "./npcCombat.js";

const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];
const CREATURE_KEYS = ["BODY", "MIND"];
const MAX_CHARACTER_ATTRIBUTE = 10;
const MAX_CREATURE_ATTRIBUTE = 12;
const MAX_CHARACTER_SKILL = 5;

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value, fallback = 0) {
  return Math.floor(num(value, fallback));
}

function key(value) {
  return String(value || "").trim().toUpperCase();
}

function skillKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function countOddLevelsCrossed(baseLevel, targetLevel) {
  let count = 0;
  for (let level = baseLevel + 1; level <= targetLevel; level += 1) {
    if (level % 2 === 1) count += 1;
  }
  return count;
}

function abilityText(entry = {}) {
  return String(entry?.abilities || "").toUpperCase();
}

function hasAbility(entry, name) {
  return abilityText(entry).includes(String(name || "").toUpperCase());
}

function npcKind(entry = {}) {
  return String(entry?.statKind || "").toLowerCase() === "character" ? "character" : "creature";
}

function attackProfiles(entry = {}) {
  return parseAttackText(entry?.attacks || "");
}

function attributeUse(profiles = []) {
  const result = {};
  profiles.forEach((profile) => {
    const attr = key(profile?.attribute);
    if (!attr) return;
    result[attr] = (result[attr] || 0) + 1;
  });
  return result;
}

function skillUse(profiles = []) {
  const result = {};
  profiles.forEach((profile) => {
    const skill = skillKey(profile?.skill);
    if (!skill) return;
    result[skill] = (result[skill] || 0) + 1;
  });
  return result;
}

function allocateAttributeBoosts(entry = {}, kind, boostCount, profiles = []) {
  const result = {};
  const use = attributeUse(profiles);
  const source = kind === "character"
    ? { ...(entry?.special || {}) }
    : { BODY: entry?.body, MIND: entry?.mind };
  const candidates = kind === "character" ? SPECIAL_KEYS : CREATURE_KEYS;
  const cap = kind === "character" ? MAX_CHARACTER_ATTRIBUTE : MAX_CREATURE_ATTRIBUTE;
  const working = {};
  candidates.forEach((attr) => {
    working[attr] = Math.max(0, integer(source?.[attr], 0));
    result[attr] = 0;
  });

  for (let step = 0; step < boostCount; step += 1) {
    const available = candidates
      .filter((attr) => working[attr] < cap)
      .sort((a, b) => {
        const useDiff = (use[b] || 0) - (use[a] || 0);
        if (useDiff) return useDiff;
        const valueDiff = working[b] - working[a];
        if (valueDiff) return valueDiff;
        return candidates.indexOf(a) - candidates.indexOf(b);
      });
    const selected = available[0];
    if (!selected) break;
    working[selected] += 1;
    result[selected] += 1;
  }

  return result;
}

function allocateCharacterSkillBoosts(entry = {}, boostCount, profiles = []) {
  const skills = (Array.isArray(entry?.skills) ? entry.skills : []).map((item) => ({ ...item }));
  const use = skillUse(profiles);
  const boosts = {};

  for (let step = 0; step < boostCount; step += 1) {
    const available = skills
      .map((item, index) => ({ item, index, normalized: skillKey(item?.name), rating: integer(item?.rating, 0) }))
      .filter(({ rating }) => rating < MAX_CHARACTER_SKILL)
      .sort((a, b) => {
        const useDiff = (use[b.normalized] || 0) - (use[a.normalized] || 0);
        if (useDiff) return useDiff;
        const tagDiff = Number(Boolean(b.item?.tagged)) - Number(Boolean(a.item?.tagged));
        if (tagDiff) return tagDiff;
        const ratingDiff = b.rating - a.rating;
        if (ratingDiff) return ratingDiff;
        return a.index - b.index;
      });
    const selected = available[0];
    if (!selected) break;
    skills[selected.index].rating = selected.rating + 1;
    boosts[selected.normalized] = (boosts[selected.normalized] || 0) + 1;
  }

  return { skills, boosts };
}

function meleeDamageDice(strength) {
  const value = integer(strength, 0);
  if (value >= 11) return 3;
  if (value >= 9) return 2;
  if (value >= 7) return 1;
  return 0;
}

function characterDefense(agility) {
  return integer(agility, 0) >= 9 ? 2 : 1;
}

function strongestAttackIndex(lines = []) {
  let selected = -1;
  let bestDamage = -1;
  lines.forEach((line, index) => {
    const match = String(line || "").match(/\b(\d+)\s*(?:CD|DC|КУ)\b/i);
    const damage = match ? Number(match[1]) : -1;
    if (damage > bestDamage) {
      bestDamage = damage;
      selected = index;
    }
  });
  return selected;
}

function scaleAttackLines(entry, kind, attributeBoosts, skillBoosts, creatureDamageBonus, strengthBefore, strengthAfter) {
  const lines = String(entry?.attacks || "").split(/\n/);
  const creatureDamageLine = kind === "creature" && creatureDamageBonus > 0 ? strongestAttackIndex(lines) : -1;
  const meleeDerivedBonus = Math.max(0, meleeDamageDice(strengthAfter) - meleeDamageDice(strengthBefore));

  return lines.map((line, index) => {
    let next = String(line || "");
    const profile = next.match(/\b(BODY|MIND|STR|PER|END|CHA|INT|AGI|LCK)\s*\+\s*([^()]+?)\s*\(TN\s*(\d+)\)/i);
    const attr = key(profile?.[1]);
    const skill = skillKey(profile?.[2]);
    const tnBonus = Math.max(0, integer(attributeBoosts?.[attr], 0))
      + (kind === "character" ? Math.max(0, integer(skillBoosts?.[skill], 0)) : 0);

    if (profile && tnBonus) {
      next = next.replace(/\bTN\s*(\d+)\b/i, (_, raw) => `TN ${Math.min(20, Number(raw) + tnBonus)}`);
    }

    let damageBonus = 0;
    if (kind === "creature" && index === creatureDamageLine) damageBonus += creatureDamageBonus;
    if (kind === "character" && meleeDerivedBonus > 0 && ["melee weapons", "unarmed"].includes(skill)) damageBonus += meleeDerivedBonus;
    if (damageBonus) {
      next = next.replace(/\b(\d+)\s*(CD|DC|КУ)\b/i, (_, raw, unit) => `${Number(raw) + damageBonus} ${unit}`);
    }
    return next;
  }).join("\n");
}

function resistanceType(entry = {}) {
  const dr = String(entry?.drBlock || "");
  const candidates = ["Physical", "Energy", "Poison", "Radiation"];
  const lower = dr.toLowerCase();
  return candidates.find((type) => lower.includes(type.toLowerCase()) && !lower.includes(`${type.toLowerCase()} immune`)) || "Physical";
}

function scaledResistanceText(entry, kind, bonus, type) {
  const source = String(entry?.drBlock || "");
  if (kind !== "creature" || bonus <= 0) return source;
  const suffix = `Level scaling: +${bonus} ${type} DR (all locations)`;
  return source ? `${source}\n${suffix}` : suffix;
}

function scaledWealthText(entry, kind, wealthBonus) {
  const source = String(entry?.loot || "");
  if (kind !== "character" || wealthBonus <= 0) return source;
  if (/\bWealth\s+\d+\b/i.test(source)) {
    return source.replace(/\bWealth\s+(\d+)\b/i, (_, raw) => `Wealth ${Number(raw) + wealthBonus}`);
  }
  return source;
}

export function proceduralNpcProgression(baseLevel, targetLevel) {
  const originalLevel = Math.max(1, integer(baseLevel, 1));
  const level = Math.max(originalLevel, integer(targetLevel, originalLevel));
  const levelDifference = Math.max(0, level - originalLevel);
  return {
    originalLevel,
    targetLevel: level,
    levelDifference,
    oddLevelAttributeGains: countOddLevelsCrossed(originalLevel, level),
    twoLevelGains: Math.floor(levelDifference / 2),
    threeLevelGains: Math.floor(levelDifference / 3),
    scaled: levelDifference > 0,
  };
}

export function buildProceduralNpcLevelStats(entry = {}, enemy = {}) {
  const baseLevel = Math.max(1, integer(enemy?.baseLevel ?? enemy?.originalLevel ?? entry?.level, 1));
  const targetLevel = Math.max(baseLevel, integer(enemy?.level, baseLevel));
  const progression = proceduralNpcProgression(baseLevel, targetLevel);
  const kind = npcKind(entry);
  const profiles = attackProfiles(entry);
  const attributeBoosts = allocateAttributeBoosts(entry, kind, progression.oddLevelAttributeGains, profiles);
  const skillResult = kind === "character"
    ? allocateCharacterSkillBoosts(entry, progression.levelDifference, profiles)
    : { skills: Array.isArray(entry?.skills) ? entry.skills.map((item) => ({ ...item })) : [], boosts: {} };

  const big = hasAbility(entry, "BIG");
  const little = hasAbility(entry, "LITTLE");
  let hpLevelBonus = progression.levelDifference;
  if (big) hpLevelBonus = progression.levelDifference * 2;
  if (little) hpLevelBonus = Math.max(0, Math.ceil(targetLevel / 2) - Math.ceil(baseLevel / 2));

  const baseHp = Math.max(1, num(entry?.baseMaxHp ?? entry?.maxHp ?? entry?.hp, 6));
  const baseDefense = Math.max(0, num(entry?.baseDefense ?? entry?.defense, 1));
  const baseInitiative = num(entry?.initiative, 0);
  const special = { ...(entry?.special || {}) };
  let body = num(entry?.body, 0);
  let mind = num(entry?.mind, 0);
  let derivedHpBonus = 0;
  let initiativeBonus = 0;
  let defenseBonus = 0;

  if (kind === "creature") {
    body += attributeBoosts.BODY || 0;
    mind += attributeBoosts.MIND || 0;
    derivedHpBonus += attributeBoosts.BODY || 0;
    initiativeBonus += (attributeBoosts.BODY || 0) + (attributeBoosts.MIND || 0);
  } else {
    SPECIAL_KEYS.forEach((attr) => {
      const before = num(special?.[attr], 0);
      special[attr] = before + (attributeBoosts[attr] || 0);
    });
    derivedHpBonus += attributeBoosts.END || 0;
    initiativeBonus += (attributeBoosts.PER || 0) + (attributeBoosts.AGI || 0);
    defenseBonus += characterDefense(special.AGI) - characterDefense(num(entry?.special?.AGI, 0));
    const type = String(entry?.creatureType || "").toLowerCase();
    if (type.includes("notable character")) derivedHpBonus += attributeBoosts.LCK || 0;
    if (type.includes("major character")) derivedHpBonus += (attributeBoosts.LCK || 0) * 2;
  }

  const creatureDamageBonus = kind === "creature" ? progression.twoLevelGains : 0;
  const resistanceBonus = kind === "creature" ? progression.twoLevelGains : 0;
  const resistance = resistanceType(entry);
  const strengthBefore = num(entry?.special?.STR, 0);
  const strengthAfter = num(special?.STR, strengthBefore);
  const attacks = scaleAttackLines(
    entry,
    kind,
    attributeBoosts,
    skillResult.boosts,
    creatureDamageBonus,
    strengthBefore,
    strengthAfter,
  );

  return {
    level: targetLevel,
    baseLevel,
    originalLevel: baseLevel,
    levelScaleDifference: progression.levelDifference,
    levelScaled: progression.scaled,
    levelProgressionRule: "fallout-2d20-npc-leveling",
    levelOddAttributeGains: progression.oddLevelAttributeGains,
    levelTwoStepGains: progression.twoLevelGains,
    levelThreeStepGains: progression.threeLevelGains,
    levelAttributeBoosts: attributeBoosts,
    levelSkillBoosts: skillResult.boosts,
    levelHpBonus: hpLevelBonus + derivedHpBonus,
    levelCreatureDamageBonus: creatureDamageBonus,
    levelResistanceType: resistance,
    levelResistanceBonus: resistanceBonus,
    levelEquipmentUpgradeSteps: kind === "character" ? progression.twoLevelGains : 0,
    levelWealthBonus: kind === "character" ? progression.threeLevelGains : 0,
    hp: Math.max(1, Math.round(baseHp + hpLevelBonus + derivedHpBonus)),
    maxHp: Math.max(1, Math.round(baseHp + hpLevelBonus + derivedHpBonus)),
    baseMaxHp: Math.max(1, Math.round(baseHp + hpLevelBonus + derivedHpBonus)),
    defense: Math.max(0, baseDefense + defenseBonus),
    baseDefense: Math.max(0, baseDefense + defenseBonus),
    initiative: baseInitiative ? baseInitiative + initiativeBonus : entry?.initiative || "",
    body: kind === "creature" ? body : entry?.body || "",
    mind: kind === "creature" ? mind : entry?.mind || "",
    special,
    skills: skillResult.skills,
    meleeBonus: kind === "character" ? meleeDamageDice(strengthAfter) : entry?.meleeBonus || "",
    attacks,
    originalAttacks: entry?.attacks || "",
    drBlock: scaledResistanceText(entry, kind, resistanceBonus, resistance),
    loot: scaledWealthText(entry, kind, progression.threeLevelGains),
    // Retire the old blanket +1 attack/+1 damage per two levels. The rules-based
    // bonuses above are applied to the relevant attribute/skill/attack instead.
    levelAttackBonus: 0,
    levelDamageBonus: 0,
  };
}
