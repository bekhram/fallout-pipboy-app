export const COMBAT_BUFF_TIERS = ["light", "medium", "strong"];

const EMPTY_RESISTANCE = Object.freeze({ physical: 0, energy: 0, radiation: 0, poison: 0 });

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(value, fallback = 0) {
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

function normalizeTier(value) {
  const tier = String(value || "light").toLowerCase();
  return COMBAT_BUFF_TIERS.includes(tier) ? tier : "light";
}

function resistance(value = {}) {
  return {
    physical: Math.max(0, int(value.physical, 0)),
    energy: Math.max(0, int(value.energy, 0)),
    radiation: Math.max(0, int(value.radiation, 0)),
    poison: Math.max(0, int(value.poison, 0)),
  };
}

function buff(id, name, tier, sourceType, bonuses = {}, extra = {}) {
  return Object.freeze({
    id,
    name,
    tier: normalizeTier(tier),
    sourceType,
    duration: extra.duration || "lasting",
    durationTurns: Math.max(0, int(extra.durationTurns, 0)),
    bonuses: Object.freeze({
      damageDiceBonus: Math.max(0, int(bonuses.damageDiceBonus, 0)),
      meleeDamageDiceBonus: Math.max(0, int(bonuses.meleeDamageDiceBonus, 0)),
      defenseBonus: Math.max(0, int(bonuses.defenseBonus, 0)),
      maxHpBonus: Math.max(0, int(bonuses.maxHpBonus, 0)),
      immediateAp: Math.max(0, int(bonuses.immediateAp, 0)),
      apPerTurn: Math.max(0, int(bonuses.apPerTurn, 0)),
      groupApPoolBonus: Math.max(0, int(bonuses.groupApPoolBonus, 0)),
      extraActionApReduction: Math.max(0, int(bonuses.extraActionApReduction, 0)),
      damageRerolls: Math.max(0, int(bonuses.damageRerolls, 0)),
      hpRegenPerTurn: Math.max(0, int(bonuses.hpRegenPerTurn, 0)),
      spottingDifficultyBonus: Math.max(0, int(bonuses.spottingDifficultyBonus, 0)),
      resistance: Object.freeze(resistance(bonuses.resistance)),
      attackEffects: Object.freeze((Array.isArray(bonuses.attackEffects) ? bonuses.attackEffects : [])
        .map((effect) => String(effect || "").trim())
        .filter(Boolean)),
      duplicateEffectDamageDiceBonus: Math.max(0, int(bonuses.duplicateEffectDamageDiceBonus, 0)),
    }),
  });
}

// Structured gameplay versions of effects already present in the PIP-2D20 inventory data.
// Values are game stats only; the source item remains responsible for its normal duration/use rules.
export const COMBAT_BUFF_PRESETS = Object.freeze([
  buff("baked-bloatfly", "Baked Bloatfly", "light", "food", { resistance: { radiation: 2 } }),
  buff("bloodbug-steak", "Bloodbug Steak", "light", "food", { maxHpBonus: 3 }),
  buff("radscorpion-steak", "Radscorpion Steak", "light", "food", { resistance: { energy: 2 } }),
  buff("yao-guai-ribs", "Yao Guai Ribs", "light", "food", { resistance: { physical: 2 } }),
  buff("nuka-cola", "Nuka-Cola", "light", "beverage", { immediateAp: 1 }),
  buff("moonshine", "Moonshine", "light", "beverage", { maxHpBonus: 2 }),

  buff("med-x", "Med-X", "medium", "aid", { resistance: { physical: 3 } }),
  buff("psycho", "Psycho", "medium", "aid", { damageDiceBonus: 2, resistance: { physical: 3 } }),
  buff("jet", "Jet", "medium", "aid", { extraActionApReduction: 1 }, { duration: "brief" }),
  buff("jet-fuel", "Jet Fuel", "medium", "aid", { apPerTurn: 1 }),
  buff("buffout", "Buffout", "medium", "aid", { maxHpBonus: 3 }),
  buff("radstag-stew", "Radstag Stew", "medium", "food", { resistance: { energy: 3 } }),
  buff("yao-guai-roast", "Yao Guai Roast", "medium", "food", { meleeDamageDiceBonus: 2 }),
  buff("glowing-blood-pack", "Glowing Blood Pack", "medium", "beverage", { resistance: { radiation: 5 } }),
  buff("nuka-cherry", "Nuka-Cherry", "medium", "beverage", { immediateAp: 2 }),

  buff("fury", "Fury", "strong", "aid", { meleeDamageDiceBonus: 3, resistance: { physical: 3 } }),
  buff("overdrive", "Overdrive", "strong", "aid", { damageDiceBonus: 3, damageRerolls: 3 }),
  buff("psycho-jet", "Psycho Jet", "strong", "aid", { damageDiceBonus: 2, resistance: { physical: 4 }, immediateAp: 4 }, { duration: "brief" }),
  buff("psychobuff", "Psychobuff", "strong", "aid", { damageDiceBonus: 2, maxHpBonus: 4 }),
  buff("psychotats", "Psychotats", "strong", "aid", { damageDiceBonus: 2, resistance: { physical: 2 } }),
  buff("ultra-jet", "Ultra Jet", "strong", "aid", { immediateAp: 6, extraActionApReduction: 1 }, { duration: "brief" }),
  buff("nuka-quantum", "Nuka-Cola Quantum", "strong", "beverage", { immediateAp: 5 }),
  buff("tarberry-juice", "Tarberry Juice", "strong", "beverage", { immediateAp: 6 }),
  buff("deathclaw-omelette", "Deathclaw Omelette", "strong", "food", { hpRegenPerTurn: 1 }),
  buff("stealth-boy", "Stealth Boy", "strong", "device", {
    defenseBonus: 2,
    spottingDifficultyBonus: 2,
    attackEffects: ["Vicious"],
    duplicateEffectDamageDiceBonus: 2,
  }, { duration: "turns", durationTurns: 3 }),
]);

const BY_ID = new Map(COMBAT_BUFF_PRESETS.map((item) => [item.id, item]));

export function combatBuffById(id) {
  return BY_ID.get(String(id || "")) || null;
}

export function combatBuffsByTier(tier) {
  const normalized = normalizeTier(tier);
  return COMBAT_BUFF_PRESETS.filter((item) => item.tier === normalized);
}

export function resolveCombatBuffs(values = []) {
  const result = [];
  const used = new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const item = typeof value === "string" ? combatBuffById(value) : value;
    if (!item?.id || used.has(item.id)) return;
    used.add(item.id);
    result.push(item);
  });
  return result;
}

export function aggregateCombatBuffs(values = []) {
  const buffs = resolveCombatBuffs(values);
  const summary = {
    damageDiceBonus: 0,
    meleeDamageDiceBonus: 0,
    defenseBonus: 0,
    maxHpBonus: 0,
    immediateAp: 0,
    apPerTurn: 0,
    groupApPoolBonus: 0,
    extraActionApReduction: 0,
    damageRerolls: 0,
    hpRegenPerTurn: 0,
    spottingDifficultyBonus: 0,
    resistance: { ...EMPTY_RESISTANCE },
    attackEffects: [],
    sources: buffs.map((item) => ({ id: item.id, name: item.name, tier: item.tier, sourceType: item.sourceType })),
  };

  buffs.forEach((item) => {
    const bonus = item.bonuses || {};
    summary.damageDiceBonus += num(bonus.damageDiceBonus, 0);
    summary.meleeDamageDiceBonus += num(bonus.meleeDamageDiceBonus, 0);
    summary.defenseBonus += num(bonus.defenseBonus, 0);
    summary.maxHpBonus += num(bonus.maxHpBonus, 0);
    summary.immediateAp += num(bonus.immediateAp, 0);
    summary.apPerTurn += num(bonus.apPerTurn, 0);
    summary.groupApPoolBonus += num(bonus.groupApPoolBonus, 0);
    summary.extraActionApReduction += num(bonus.extraActionApReduction, 0);
    summary.damageRerolls += num(bonus.damageRerolls, 0);
    summary.hpRegenPerTurn += num(bonus.hpRegenPerTurn, 0);
    summary.spottingDifficultyBonus += num(bonus.spottingDifficultyBonus, 0);
    const res = resistance(bonus.resistance);
    Object.keys(summary.resistance).forEach((key) => { summary.resistance[key] += res[key]; });
    (bonus.attackEffects || []).forEach((effect) => {
      if (!summary.attackEffects.some((existing) => existing.toLowerCase() === String(effect).toLowerCase())) {
        summary.attackEffects.push(String(effect));
      }
    });
  });

  return summary;
}

function isMeleeAttack(attack = {}) {
  const text = [attack.skill, attack.weaponType, attack.attackType, attack.range, attack.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /melee|unarmed|close combat|close-range|close range/.test(text);
}

function effectNames(value) {
  return String(value || "")
    .split(/[,;•]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function applyCombatBuffsToAttack(attack = {}, values = []) {
  const buffs = resolveCombatBuffs(values);
  const effects = effectNames(attack.effects ?? attack.effect);
  let damageBonus = 0;
  let damageRerolls = 0;

  buffs.forEach((item) => {
    const bonus = item.bonuses || {};
    damageBonus += num(bonus.damageDiceBonus, 0);
    if (isMeleeAttack(attack)) damageBonus += num(bonus.meleeDamageDiceBonus, 0);
    damageRerolls += num(bonus.damageRerolls, 0);

    (bonus.attackEffects || []).forEach((effect) => {
      const existing = effects.some((value) => value.toLowerCase() === String(effect).toLowerCase());
      if (existing) damageBonus += num(bonus.duplicateEffectDamageDiceBonus, 0);
      else effects.push(String(effect));
    });
  });

  const damageDice = Math.max(0, num(attack.damageDice ?? attack.damage ?? attack.cd, 0) + damageBonus);
  return {
    ...attack,
    damageDice,
    effects: effects.join(", "),
    effect: effects.join(", "),
    combatBuffDamageBonus: damageBonus,
    damageRerolls,
    combatBuffSources: buffs.map((item) => item.name),
  };
}

export function applyCombatBuffsToStats(stats = {}, values = []) {
  const buffs = resolveCombatBuffs(values);
  if (!buffs.length) return { ...stats, activeCombatBuffs: [], combatBuffSummary: aggregateCombatBuffs([]) };

  const summary = aggregateCombatBuffs(buffs);
  const originalMaxHp = Math.max(1, num(stats.maxHp ?? stats.hp, 1));
  const originalHp = Math.max(0, num(stats.hp, originalMaxHp));
  const wasFull = originalHp >= originalMaxHp;
  const memberMaxHp = Math.max(1, num(stats.memberMaxHp ?? originalMaxHp, originalMaxHp) + summary.maxHpBonus);
  const hordeSize = Math.max(1, int(stats.hordeSize, 1));
  const nextMaxHp = stats.hordeEnabled ? memberMaxHp * hordeSize : originalMaxHp + summary.maxHpBonus;
  const nextHp = wasFull ? nextMaxHp : Math.min(nextMaxHp, originalHp + summary.maxHpBonus);

  return {
    ...stats,
    hp: nextHp,
    maxHp: nextMaxHp,
    memberMaxHp,
    defense: Math.max(0, num(stats.defense, 0) + summary.defenseBonus),
    activeCombatBuffs: buffs.map((item) => item.id),
    combatBuffSummary: summary,
    combatBuffResistance: { ...summary.resistance },
    combatBuffImmediateAp: summary.immediateAp,
    combatBuffApPerTurn: summary.apPerTurn,
    combatBuffExtraActionApReduction: summary.extraActionApReduction,
    combatBuffMaxHpBonus: summary.maxHpBonus,
    combatBuffDefenseBonus: summary.defenseBonus,
  };
}

function pickUnique(pool, count, salt, used = new Set()) {
  const available = pool.filter((item) => !used.has(item.id));
  const picked = [];
  for (let index = 0; index < count && available.length; index += 1) {
    const slot = hashSeed(`${salt}:${index}`) % available.length;
    const [item] = available.splice(slot, 1);
    if (!item) break;
    used.add(item.id);
    picked.push(item);
  }
  return picked;
}

export function generateNpcCombatBuffs(rank, seed = "1", options = {}) {
  const normalizedRank = String(rank || "standard").toLowerCase();
  const used = new Set();
  const result = [];
  const explicit = resolveCombatBuffs(options.ids || []);
  explicit.forEach((item) => { used.add(item.id); result.push(item); });
  if (explicit.length) return result;

  if (normalizedRank === "special") {
    result.push(...pickUnique(combatBuffsByTier("medium"), 1, `${seed}:special:medium`, used));
  } else if (normalizedRank === "legendary") {
    result.push(...pickUnique(combatBuffsByTier("strong"), 1, `${seed}:legendary:strong`, used));
    result.push(...pickUnique(combatBuffsByTier("medium"), 1, `${seed}:legendary:medium`, used));
  }
  return result;
}

export function combatBuffTierLabel(tier, language = "en") {
  const code = String(language || "en").toLowerCase().split("-")[0];
  const labels = {
    en: { light: "LIGHT", medium: "MEDIUM", strong: "STRONG" },
    ru: { light: "ЛЁГКИЙ", medium: "СРЕДНИЙ", strong: "СИЛЬНЫЙ" },
    uk: { light: "ЛЕГКИЙ", medium: "СЕРЕДНІЙ", strong: "СИЛЬНИЙ" },
    pl: { light: "LEKKI", medium: "ŚREDNI", strong: "SILNY" },
  };
  return labels[code]?.[normalizeTier(tier)] || labels.en[normalizeTier(tier)];
}
