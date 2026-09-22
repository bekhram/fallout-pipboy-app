import { ORIGINS } from "../components/data/origins.js";
import { skillBaseRankCap } from "../utils/characterCreationRules.js";

function clampNumberString(value, min, max, fallback = "0") {
  const raw = String(value ?? "").trim();
  if (raw === "") return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return fallback;
  return String(Math.max(min, Math.min(max, parsed)));
}

function getSkillBaseRankCap(character, skill) {
  const currentOrigin = character?.origin && ORIGINS[character.origin]
    ? ORIGINS[character.origin]
    : null;
  return skillBaseRankCap({
    level: character?.level,
    originSkillRankLimit: currentOrigin?.skillRankLimit,
    tagged: Boolean(skill?.tagged),
  });
}

export function useCharacterRulesController({ setForm }) {
  const updateTopLevel = (key, value) =>
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key !== "level") return next;

      const skills = Object.fromEntries(
        Object.entries(prev.skills || {}).map(([skillName, skill]) => {
          const maxBaseRank = getSkillBaseRankCap(next, skill);
          return [
            skillName,
            {
              ...skill,
              rank: clampNumberString(skill?.rank, 0, maxBaseRank),
            },
          ];
        })
      );

      return { ...next, skills };
    });

  const updateDerivedOverride = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateSpecial = (key, value) =>
    setForm((prev) => {
      const currentOrigin = prev.origin && ORIGINS[prev.origin] ? ORIGINS[prev.origin] : null;
      const limits = currentOrigin?.specialLimits || { min: 1, max: 10 };
      const originMin = Number(limits.min !== undefined ? limits.min : 1);
      const minAllowed = key === "L" ? Math.max(4, originMin) : originMin;
      const maxAllowed = Number(
        limits[key] !== undefined
          ? limits[key]
          : (limits.max !== undefined ? limits.max : 10)
      );
      const raw = String(value ?? "").trim();
      const special = prev.special || {};
      const otherTotal = Object.entries(special).reduce(
        (sum, [entryKey, entryValue]) =>
          entryKey === key ? sum : sum + (Number(entryValue) || 0),
        0
      );
      const specialPointBudget = currentOrigin?.id === "survivor" ? 42 : 40;
      const budgetMax = Math.max(minAllowed, specialPointBudget - otherTotal);
      const effectiveMax = Math.min(maxAllowed, budgetMax);

      return {
        ...prev,
        special: {
          ...special,
          [key]: raw === "" ? "" : clampNumberString(raw, minAllowed, effectiveMax),
        },
      };
    });

  const updateSkill = (skillName, field, value) =>
    setForm((prev) => {
      const currentSkill = prev.skills?.[skillName] || {
        rank: "0",
        attribute: "A",
        tagged: false,
        bonus: "0",
      };
      const nextTagged = field === "tagged" ? Boolean(value) : Boolean(currentSkill.tagged);
      const skillWithNextTag = { ...currentSkill, tagged: nextTagged };
      const maxBaseRank = getSkillBaseRankCap(prev, skillWithNextTag);

      const nextSkill = {
        ...currentSkill,
        [field]: value,
      };

      if (field === "rank") {
        nextSkill.rank = clampNumberString(value, 0, maxBaseRank);
      } else if (field === "tagged") {
        nextSkill.tagged = nextTagged;
        nextSkill.rank = clampNumberString(currentSkill.rank, 0, maxBaseRank);
      }

      return {
        ...prev,
        skills: {
          ...prev.skills,
          [skillName]: nextSkill,
        },
      };
    });

  return {
    updateTopLevel,
    updateDerivedOverride,
    updateSpecial,
    updateSkill,
  };
}

export default useCharacterRulesController;
