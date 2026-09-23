const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];

export const CANONICAL_NPC_TYPES = {
  normal: {
    id: "normal",
    label: "Normal",
    kinds: ["npc", "creature"],
    xpMultiplier: 1,
  },
  mighty: {
    id: "mighty",
    label: "Mighty",
    kinds: ["creature"],
    xpMultiplier: 2,
    hpMultiplier: 2,
    bodyOrMindBonus: 2,
  },
  notable: {
    id: "notable",
    label: "Notable",
    kinds: ["npc"],
    xpMultiplier: 2,
    hpLuckMultiplier: 1,
    luckPointMode: "half",
    initiativeBonus: 2,
    tagSkillCount: 3,
    tagSkillMinimumRank: 2,
    specialBase: 42,
  },
  legendary: {
    id: "legendary",
    label: "Legendary",
    kinds: ["creature"],
    xpMultiplier: 3,
    hpMultiplier: 3,
    bodyBonus: 2,
    mindBonus: 2,
  },
  major: {
    id: "major",
    label: "Major",
    kinds: ["npc"],
    xpMultiplier: 3,
    hpLuckMultiplier: 2,
    luckPointMode: "full",
    initiativeBonus: 4,
    tagSkillCount: 4,
    tagSkillMinimumRank: 2,
    specialBase: 49,
  },
};

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function kindOf(value) {
  return String(value || "").toLowerCase() === "creature" ? "creature" : "npc";
}

export function normalizeCanonicalNpcType(value, kind = "npc") {
  const wanted = String(value || "normal").toLowerCase();
  const rule = CANONICAL_NPC_TYPES[wanted];
  const resolvedKind = kindOf(kind);
  return rule?.kinds?.includes(resolvedKind) ? wanted : "normal";
}

export function canonicalNpcTypesForKind(kind = "npc") {
  const resolvedKind = kindOf(kind);
  return Object.values(CANONICAL_NPC_TYPES).filter((rule) => rule.kinds.includes(resolvedKind));
}

function specialTotal(special = {}) {
  return SPECIAL_KEYS.reduce((sum, key) => sum + Math.max(0, number(special?.[key], 0)), 0);
}

function parseSkillLines(skills) {
  return String(skills || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function taggedSkillCount(skills) {
  return parseSkillLines(skills).filter((line) => /\b(tag|tagged)\b/i.test(line)).length;
}

export function canonicalNpcTypeRequirements(stats = {}, requestedType = "normal") {
  const kind = kindOf(stats.cardKind || stats.kind || stats.category);
  const type = normalizeCanonicalNpcType(requestedType, kind);
  const rule = CANONICAL_NPC_TYPES[type];
  const level = Math.max(1, Math.floor(number(stats.level, 1)));
  const intelligence = Math.max(0, number(stats.special?.INT, 0));
  const targetSpecial = rule.specialBase
    ? rule.specialBase + Math.ceil(level / 2)
    : null;
  const targetSkillPoints = rule.tagSkillCount
    ? intelligence + level
    : null;

  return {
    type,
    kind,
    targetSpecial,
    currentSpecial: kind === "npc" ? specialTotal(stats.special) : null,
    specialValid: targetSpecial == null ? true : specialTotal(stats.special) === targetSpecial,
    tagSkillCount: rule.tagSkillCount || 0,
    tagSkillMinimumRank: rule.tagSkillMinimumRank || 0,
    detectedTaggedSkills: rule.tagSkillCount ? taggedSkillCount(stats.skills) : 0,
    targetSkillPoints,
    attributeInstruction:
      type === "mighty"
        ? "Add +2 to either Body or Mind."
        : type === "legendary"
        ? "Add +2 to both Body and Mind."
        : "",
  };
}

export function applyCanonicalNpcType(stats = {}, requestedType = stats.canonicalType) {
  const kind = kindOf(stats.cardKind || stats.kind || stats.category);
  const type = normalizeCanonicalNpcType(requestedType, kind);
  const rule = CANONICAL_NPC_TYPES[type];
  if (!rule || type === "normal") {
    return {
      ...stats,
      canonicalType: "normal",
      canonicalTypeLabel: "Normal",
      canonicalTypeRequirements: canonicalNpcTypeRequirements(stats, "normal"),
    };
  }

  const baseHp = Math.max(1, number(stats.maxHp ?? stats.hp ?? stats.baseMaxHp, 1));
  const baseXp = Math.max(0, number(stats.xp ?? stats.baseXp, 0));
  const luck = Math.max(0, number(stats.special?.LCK, 0));
  const per = Math.max(0, number(stats.special?.PER, 0));
  const agi = Math.max(0, number(stats.special?.AGI, 0));
  const body = Math.max(0, number(stats.body, 0));
  const mind = Math.max(0, number(stats.mind, 0));

  let maxHp = baseHp;
  let hp = Math.max(0, number(stats.hp, baseHp));
  let initiative = Math.max(0, number(stats.initiative, 0));
  let luckPoints = Math.max(0, number(stats.luckPoints, 0));

  if (kind === "creature") {
    maxHp = Math.max(1, Math.round(baseHp * (rule.hpMultiplier || 1)));
    const wasFull = hp >= baseHp;
    hp = wasFull ? maxHp : Math.min(maxHp, hp);
    initiative = body + mind;
  } else {
    maxHp = Math.max(1, baseHp + luck * (rule.hpLuckMultiplier || 0));
    const wasFull = hp >= baseHp;
    hp = wasFull ? maxHp : Math.min(maxHp, hp);
    initiative = per + agi + Number(rule.initiativeBonus || 0);
    luckPoints = rule.luckPointMode === "full"
      ? luck
      : rule.luckPointMode === "half"
      ? Math.ceil(luck / 2)
      : luckPoints;
  }

  const result = {
    ...stats,
    canonicalType: type,
    canonicalTypeLabel: rule.label,
    hp,
    maxHp,
    xp: Math.max(0, Math.round(baseXp * (rule.xpMultiplier || 1))),
    initiative,
    luckPoints,
    canonicalTypeRequirements: canonicalNpcTypeRequirements(stats, type),
  };

  if (type === "mighty") {
    result.canonicalAttributeBonus = { chooseOne: ["body", "mind"], amount: 2 };
  } else if (type === "legendary") {
    result.body = body + 2;
    result.mind = mind + 2;
    result.canonicalAttributeBonus = { body: 2, mind: 2 };
    result.initiative = result.body + result.mind;
  }

  return result;
}
