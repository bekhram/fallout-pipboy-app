export function skillFinalRankCap(level = 1, originSkillRankLimit = 6) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  const configured = Number(originSkillRankLimit);
  const originCap = Number.isFinite(configured) ? configured : 6;
  return Math.max(0, Math.min(6, normalizedLevel + 2, originCap));
}

export function skillBaseRankCap({ level = 1, originSkillRankLimit = 6, tagged = false } = {}) {
  return Math.max(0, skillFinalRankCap(level, originSkillRankLimit) - (tagged ? 2 : 0));
}

export function skillEffectiveRank(skill = {}) {
  return Math.max(0, Number(skill.rank || 0)) + (skill.tagged ? 2 : 0);
}

export function skillWithinLevelCap(skill = {}, { level = 1, originSkillRankLimit = 6 } = {}) {
  return skillEffectiveRank(skill) <= skillFinalRankCap(level, originSkillRankLimit);
}
