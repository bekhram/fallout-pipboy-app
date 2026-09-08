import { buildFalloutD20Result, rollFalloutD6, rollSingleDie } from "./dice.js";

export const NPC_RANKS = ["minion", "standard", "special", "legendary"];

export const NPC_RANK_RULES = {
  minion: { hpMultiplier: 0, xpMultiplier: 1 / 3, defenseMultiplier: 1, damageMultiplier: 1, resistanceBonus: 0 },
  standard: { hpMultiplier: 1, xpMultiplier: 1, defenseMultiplier: 1, damageMultiplier: 1, resistanceBonus: 0 },
  special: { hpMultiplier: 2, xpMultiplier: 2, defenseMultiplier: 2, damageMultiplier: 2, resistanceBonus: 2 },
  legendary: { hpMultiplier: 3, xpMultiplier: 3, defenseMultiplier: 3, damageMultiplier: 3, resistanceBonus: 5 },
};

export function normalizeNpcRank(value) {
  const rank = String(value || "standard").toLowerCase();
  return NPC_RANKS.includes(rank) ? rank : "standard";
}

export function rankLabel(rank) {
  const value = normalizeNpcRank(rank);
  if (value === "minion") return "MINION";
  if (value === "special") return "SPECIAL";
  if (value === "legendary") return "LEGENDARY";
  return "STANDARD";
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeStructuredAttack(value = {}, index = 0) {
  return {
    id: String(value.id || `attack-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`),
    name: String(value.name || `Attack ${index + 1}`).trim().slice(0, 80) || `Attack ${index + 1}`,
    targetNumber: Math.max(0, Math.min(20, number(value.targetNumber ?? value.tn, 0))),
    skill: String(value.skill || "Combat").trim().slice(0, 40) || "Combat",
    attribute: String(value.attribute || "BODY").trim().slice(0, 20) || "BODY",
    damageDice: Math.max(0, Math.min(50, number(value.damageDice ?? value.damage ?? value.cd, 0))),
    damageType: String(value.damageType || "Physical").trim().slice(0, 60) || "Physical",
    effects: String(value.effects || "").trim().slice(0, 300),
    range: String(value.range || "").trim().slice(0, 20),
    source: String(value.source || "custom").slice(0, 40),
  };
}

export function parseAttackText(value = "") {
  const lines = String(value || "")
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[•\-–—]\s*/, "").trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const nameMatch = line.match(/^([^:]+):/);
    const tnMatch = line.match(/\bTN\s*(\d+)/i);
    const cdMatch = line.match(/(\d+)\s*(?:CD|КУ|DC)\b/i);
    const profileMatch = line.match(/\b(BODY|MIND|STR|PER|END|CHA|INT|AGI|LCK)\s*\+\s*([A-Za-z][A-Za-z ]*)\s*\(/i);
    const typeMatch = line.match(/\b(Physical|Energy|Radiation|Poison)(?:\s+damage)?/i);
    const effects = [];
    ["Vicious", "Piercing 1", "Piercing 2", "Breaking", "Stun", "Spread", "Burst", "Persistent", "Radioactive"].forEach((effect) => {
      if (line.toLowerCase().includes(effect.toLowerCase())) effects.push(effect);
    });
    return normalizeStructuredAttack({
      id: `parsed-${index}-${nameMatch?.[1] || "attack"}`,
      name: nameMatch?.[1]?.trim() || `Attack ${index + 1}`,
      targetNumber: number(tnMatch?.[1], 0),
      attribute: profileMatch?.[1]?.toUpperCase() || "BODY",
      skill: profileMatch?.[2]?.trim() || "Combat",
      damageDice: number(cdMatch?.[1], 0),
      damageType: typeMatch?.[1] || "Physical",
      effects: effects.join(", "),
      source: "bestiary",
    }, index);
  });
}

export function normalizeHordeHp(value, count, memberMaxHp) {
  const size = Math.max(2, Math.min(5, Math.floor(number(count, 2))));
  const maxHp = Math.max(1, Math.floor(number(memberMaxHp, 1)));
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: size }, (_, index) => Math.max(0, Math.min(maxHp, Math.floor(number(source[index], maxHp)))));
}

export function livingHordeMembers(stats = {}) {
  if (!stats.hordeEnabled) return 0;
  const hp = normalizeHordeHp(stats.hordeHp, stats.hordeSize, stats.memberMaxHp || stats.baseMaxHp || 1);
  return hp.filter((value) => value > 0).length;
}

export function applyNpcRank(base = {}, options = {}) {
  const rank = normalizeNpcRank(options.rank ?? base.rank);
  const rule = NPC_RANK_RULES[rank];
  const baseMaxHp = Math.max(1, Math.floor(number(base.baseMaxHp ?? base.maxHp ?? base.hp, 1)));
  const baseDefense = Math.max(0, number(base.baseDefense ?? base.defense, 0));
  const baseXp = Math.max(0, number(base.baseXp ?? base.xp, 0));
  const memberMaxHp = rank === "minion" ? 1 : Math.max(1, Math.round(baseMaxHp * rule.hpMultiplier));
  const hordeEnabled = Boolean(options.hordeEnabled ?? base.hordeEnabled);
  const hordeSize = Math.max(2, Math.min(5, Math.floor(number(options.hordeSize ?? base.hordeSize, 2))));
  const hordeHp = hordeEnabled ? normalizeHordeHp(options.hordeHp ?? base.hordeHp, hordeSize, memberMaxHp) : [];
  const currentHp = hordeEnabled
    ? hordeHp.reduce((sum, value) => sum + value, 0)
    : Math.max(0, Math.min(memberMaxHp, number(options.hp ?? base.hp, memberMaxHp)));
  const maxHp = hordeEnabled ? memberMaxHp * hordeSize : memberMaxHp;
  const baseSize = Math.max(1, Math.min(3, Math.floor(number(base.baseSize ?? base.size, 1))));
  const footprint = hordeEnabled ? (baseSize >= 2 ? 3 : 2) : baseSize;

  return {
    ...base,
    rank,
    baseMaxHp,
    baseDefense,
    baseXp,
    baseSize,
    memberMaxHp,
    hp: currentHp,
    maxHp,
    xp: Math.max(0, Math.round(baseXp * rule.xpMultiplier)),
    defense: Math.max(0, Math.round(baseDefense * rule.defenseMultiplier)),
    resistanceBonus: rule.resistanceBonus,
    damageMultiplier: rule.damageMultiplier,
    hordeEnabled,
    hordeSize,
    hordeHp,
    hordeLiving: hordeEnabled ? hordeHp.filter((value) => value > 0).length : 0,
    footprint,
    specialFeature: String(options.specialFeature ?? base.specialFeature ?? "").slice(0, 1200),
    legendaryAbility: String(options.legendaryAbility ?? base.legendaryAbility ?? "").slice(0, 1600),
    legendaryReward: String(options.legendaryReward ?? base.legendaryReward ?? "").slice(0, 1200),
  };
}

export function effectiveAttackProfile(attack, stats = {}) {
  const normalized = normalizeStructuredAttack(attack);
  const rank = normalizeNpcRank(stats.rank);
  const rule = NPC_RANK_RULES[rank];
  const living = livingHordeMembers(stats);
  return {
    ...normalized,
    d20Count: Math.max(1, 2 + (stats.hordeEnabled ? living : 0)),
    damageDice: Math.max(0, Math.round(normalized.damageDice * rule.damageMultiplier) + (stats.hordeEnabled ? living : 0)),
    hordeBonusD20: stats.hordeEnabled ? living : 0,
    hordeBonusDamage: stats.hordeEnabled ? living : 0,
    rankDamageMultiplier: rule.damageMultiplier,
  };
}

export function rollNpcAttack(attack, stats = {}, actorName = "NPC") {
  const profile = effectiveAttackProfile(attack, stats);
  const values = Array.from({ length: profile.d20Count }, () => rollSingleDie(20));
  const check = buildFalloutD20Result(values, {
    targetNumber: profile.targetNumber || null,
    criticalRange: 1,
    label: `${actorName} · ${profile.name}`,
  });
  const effects = profile.effects.split(",").map((item) => item.trim()).filter(Boolean);
  const damage = profile.damageDice > 0 ? rollFalloutD6({ diceCount: profile.damageDice, effects }) : null;

  return {
    check: {
      diceType: "d20_pool",
      source: "npc_attack",
      title: `${actorName}: ${profile.name}`,
      label: `${profile.attribute} + ${profile.skill}`,
      targetNumber: profile.targetNumber || null,
      digits: check.rolls.map((die) => die.value),
      rolls: check.rolls,
      successes: check.totalSuccesses,
      complications: check.complications,
      diceCount: profile.d20Count,
      info: `${rankLabel(stats.rank)}${stats.hordeEnabled ? ` · HORDE ${livingHordeMembers(stats)}/${stats.hordeSize}` : ""}`,
    },
    damage: damage ? {
      diceType: "combat",
      source: "npc_damage",
      title: `${actorName}: ${profile.name} DAMAGE`,
      label: `${profile.damageDice} CD ${profile.damageType}${profile.effects ? ` · ${profile.effects}` : ""}`,
      digits: damage.rolls.map((die) => die.value),
      rolls: damage.rolls,
      total: damage.totalDamage,
      effects: damage.totalEffects,
      diceCount: profile.damageDice,
      info: profile.hordeBonusDamage ? `HORDE +${profile.hordeBonusDamage} CD` : "",
    } : null,
    profile,
  };
}

export function extractAbilityNames(entries = []) {
  const names = new Set();
  for (const entry of entries) {
    const lines = String(entry?.abilities || "").split(/\n+/);
    for (const line of lines) {
      const match = line.match(/^\s*[•\-–—]?\s*([A-Z][A-Z0-9 '\-]{2,40})\s*[—-]/);
      if (match?.[1]) names.add(match[1].trim());
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
