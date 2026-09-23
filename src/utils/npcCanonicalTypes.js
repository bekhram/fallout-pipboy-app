const TYPES = ["normal", "mighty", "notable", "legendary", "major"];

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ceilHalf(value) {
  return Math.ceil(Math.max(0, num(value, 0)) / 2);
}

function normalizeKind(value) {
  const raw = String(value || "").toLowerCase();
  return raw === "character" || raw === "npc" ? "character" : "creature";
}

function readSpecial(base = {}) {
  const source = base.special || base.SPECIAL || {};
  return {
    S: num(source.S ?? source.STR),
    P: num(source.P ?? source.PER),
    E: num(source.E ?? source.END),
    C: num(source.C ?? source.CHA),
    I: num(source.I ?? source.INT),
    A: num(source.A ?? source.AGI),
    L: num(source.L ?? source.LCK),
  };
}

export const CANONICAL_NPC_TYPES = {
  normal: {
    id: "normal",
    label: "Normal",
    kind: "any",
    xpMultiplier: 1,
  },
  mighty: {
    id: "mighty",
    label: "Mighty",
    kind: "creature",
    xpMultiplier: 2,
    hpMultiplier: 2,
    attributeBoost: { amount: 2, chooseOneOf: ["body", "mind"] },
  },
  notable: {
    id: "notable",
    label: "Notable",
    kind: "character",
    xpMultiplier: 2,
    hpLuckMultiplier: 1,
    initiativeBonus: 2,
    luckPointMode: "half",
    tagSkillCount: 3,
    tagSkillRank: 2,
  },
  legendary: {
    id: "legendary",
    label: "Legendary",
    kind: "creature",
    xpMultiplier: 3,
    hpMultiplier: 3,
    attributeBoost: { amount: 2, both: ["body", "mind"] },
  },
  major: {
    id: "major",
    label: "Major",
    kind: "character",
    xpMultiplier: 3,
    hpLuckMultiplier: 2,
    initiativeBonus: 4,
    luckPointMode: "full",
    tagSkillCount: 4,
    tagSkillRank: 2,
  },
};

export function normalizeCanonicalNpcType(value) {
  const type = String(value || "normal").toLowerCase();
  return TYPES.includes(type) ? type : "normal";
}

export function canonicalNpcTypeLabel(value) {
  const type = normalizeCanonicalNpcType(value);
  return CANONICAL_NPC_TYPES[type]?.label || "Normal";
}

export function getCanonicalNpcTypeRequirements(base = {}, typeValue = "normal") {
  const type = normalizeCanonicalNpcType(typeValue);
  const rule = CANONICAL_NPC_TYPES[type] || CANONICAL_NPC_TYPES.normal;
  const kind = normalizeKind(base.statKind || base.cardKind || base.kind);
  const level = Math.max(1, Math.floor(num(base.level, 1)));
  const special = readSpecial(base);

  const compatible = rule.kind === "any" || rule.kind === kind;
  const requirements = {
    type,
    label: rule.label,
    kind,
    compatible,
    xpMultiplier: rule.xpMultiplier || 1,
  };

  if (kind === "creature") {
    requirements.attributeBoost = rule.attributeBoost || null;
    requirements.hpMultiplier = rule.hpMultiplier || 1;
    requirements.initiativeFormula = "Body + Mind";
  }

  if (kind === "character") {
    const targetTotal = type === "major"
      ? 49 + ceilHalf(level)
      : type === "notable"
      ? 42 + ceilHalf(level)
      : null;

    requirements.specialTargetTotal = targetTotal;
    requirements.tagSkillCount = rule.tagSkillCount || 0;
    requirements.tagSkillRank = rule.tagSkillRank || 0;
    requirements.skillPointBudget = (type === "notable" || type === "major")
      ? special.I + level
      : 0;
    requirements.hpLuckMultiplier = rule.hpLuckMultiplier || 0;
    requirements.initiativeBonus = rule.initiativeBonus || 0;
    requirements.luckPointMode = rule.luckPointMode || "none";
  }

  return requirements;
}

export function applyCanonicalNpcType(base = {}, options = {}) {
  const type = normalizeCanonicalNpcType(options.canonicalType ?? base.canonicalType);
  const rule = CANONICAL_NPC_TYPES[type] || CANONICAL_NPC_TYPES.normal;
  const requirements = getCanonicalNpcTypeRequirements(base, type);
  if (!requirements.compatible || type === "normal") {
    return {
      ...base,
      canonicalType: type,
      canonicalTypeLabel: rule.label,
      canonicalTypeRequirements: requirements,
    };
  }

  const kind = requirements.kind;
  const level = Math.max(1, Math.floor(num(base.level, 1)));
  const baseXp = Math.max(0, num(base.canonicalBaseXp ?? base.baseXp ?? base.xp, 0));
  const baseHp = Math.max(1, Math.floor(num(base.canonicalBaseMaxHp ?? base.baseMaxHp ?? base.maxHp ?? base.hp, 1)));

  let next = {
    ...base,
    canonicalType: type,
    canonicalTypeLabel: rule.label,
    canonicalBaseXp: baseXp,
    canonicalBaseMaxHp: baseHp,
    xp: Math.round(baseXp * (rule.xpMultiplier || 1)),
    canonicalTypeRequirements: requirements,
  };

  if (kind === "creature") {
    const body = num(base.body ?? base.BODY, 0);
    const mind = num(base.mind ?? base.MIND, 0);
    const boostChoice = String(options.attributeBoost || base.canonicalAttributeBoost || "").toLowerCase();

    let nextBody = body;
    let nextMind = mind;
    if (type === "mighty") {
      if (boostChoice === "mind") nextMind += 2;
      else if (boostChoice === "body") nextBody += 2;
    } else if (type === "legendary") {
      nextBody += 2;
      nextMind += 2;
    }

    const maxHp = Math.max(1, Math.round(baseHp * (rule.hpMultiplier || 1)));
    const sourceHp = Math.max(0, num(base.hp, baseHp));
    const sourceMax = Math.max(1, num(base.maxHp ?? baseHp, baseHp));
    const wasFull = sourceHp >= sourceMax;

    next = {
      ...next,
      body: nextBody,
      mind: nextMind,
      canonicalAttributeBoost: type === "mighty" ? boostChoice : "both",
      maxHp,
      hp: wasFull ? maxHp : Math.min(maxHp, sourceHp),
      initiative: nextBody + nextMind,
    };
  } else {
    const special = readSpecial(base);
    const luck = special.L;
    const hpBonus = luck * (rule.hpLuckMultiplier || 0);
    const maxHp = baseHp + hpBonus;
    const sourceHp = Math.max(0, num(base.hp, baseHp));
    const sourceMax = Math.max(1, num(base.maxHp ?? baseHp, baseHp));
    const wasFull = sourceHp >= sourceMax;
    const luckPoints = rule.luckPointMode === "full"
      ? luck
      : rule.luckPointMode === "half"
      ? Math.ceil(luck / 2)
      : num(base.luckPoints, 0);

    next = {
      ...next,
      maxHp,
      hp: wasFull ? maxHp : Math.min(maxHp, sourceHp),
      luckPoints,
      initiative: special.P + special.A + (rule.initiativeBonus || 0),
      specialTargetTotal: requirements.specialTargetTotal,
      tagSkillCount: requirements.tagSkillCount,
      tagSkillRank: requirements.tagSkillRank,
      skillPointBudget: requirements.skillPointBudget,
    };
  }

  return next;
}
