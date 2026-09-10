const SUPPORT_RULES = {
  institute: ["turret"],
  brotherhood: ["turret"],
  raider: ["turret"],
};

function norm(value) {
  return String(value || "").toLowerCase().trim();
}

export function proceduralSupportTypeForEntry(entry = {}) {
  const tags = Array.isArray(entry?.tags) ? entry.tags.map(norm) : [];
  const source = `${entry?.id || ""} ${entry?.name || ""} ${entry?.creatureType || ""}`.toLowerCase();
  if (tags.includes("turret") || /\bturret\b/.test(source)) return "turret";
  return null;
}

export function proceduralFactionAllowsSupport(group, supportType) {
  const allowed = SUPPORT_RULES[norm(group)] || [];
  return allowed.includes(norm(supportType));
}

export function isProceduralSupportForGroup(entry, group) {
  const type = proceduralSupportTypeForEntry(entry);
  return Boolean(type && proceduralFactionAllowsSupport(group, type));
}

export function proceduralFactionSupportTypes(group) {
  return [...(SUPPORT_RULES[norm(group)] || [])];
}

export const PROCEDURAL_FACTION_SUPPORT_RULES = SUPPORT_RULES;
