from pathlib import Path

APP_PATH = Path("src/App.jsx")
text = APP_PATH.read_text(encoding="utf-8")

old_helpers = '''  const updateTopLevel = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateDerivedOverride = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clampNumberString = (value, min, max, fallback = "0") => {
    const raw = String(value ?? "").trim();
    if (raw === "") return fallback;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return fallback;
    return String(Math.max(min, Math.min(max, parsed)));
  };
'''

new_helpers = '''  const clampNumberString = (value, min, max, fallback = "0") => {
    const raw = String(value ?? "").trim();
    if (raw === "") return fallback;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return fallback;
    return String(Math.max(min, Math.min(max, parsed)));
  };

  const getSkillRankCapForLevel = (level) => {
    const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
    return Math.min(6, normalizedLevel + 2);
  };

  const getSkillBaseRankCap = (character, skill) => {
    const currentOrigin = character?.origin && ORIGINS[character.origin]
      ? ORIGINS[character.origin]
      : null;
    const configuredOriginCap = Number(currentOrigin?.skillRankLimit);
    const originCap = Number.isFinite(configuredOriginCap) ? configuredOriginCap : 6;
    const finalRankCap = Math.min(
      6,
      getSkillRankCapForLevel(character?.level),
      originCap
    );
    return Math.max(0, finalRankCap - (skill?.tagged ? 2 : 0));
  };

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
'''

old_update_skill = '''const updateSkill = (skillName, field, value) =>
    setForm((prev) => {
      const currentOrigin = prev.origin && ORIGINS[prev.origin] ? ORIGINS[prev.origin] : null;
      const maxRank = currentOrigin?.skillRankLimit !== undefined ? currentOrigin.skillRankLimit : 6;

      return {
        ...prev,
        skills: {
          ...prev.skills,
          [skillName]: {
            ...prev.skills[skillName],
            [field]: field === "rank" ? clampNumberString(value, 0, maxRank) : value,
          },
        },
      };
    });
'''

new_update_skill = '''const updateSkill = (skillName, field, value) =>
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
'''

if new_helpers not in text:
    if old_helpers not in text:
        raise SystemExit("Could not find App.jsx helper block to patch")
    text = text.replace(old_helpers, new_helpers, 1)

if new_update_skill not in text:
    if old_update_skill not in text:
        raise SystemExit("Could not find App.jsx updateSkill block to patch")
    text = text.replace(old_update_skill, new_update_skill, 1)

APP_PATH.write_text(text, encoding="utf-8")
print("Applied level-based skill rank caps: L1=3, L2=4, L3=5, L4+=6, including Tag +2.")
