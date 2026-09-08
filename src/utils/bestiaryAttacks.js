function numberFrom(value, fallback = 0) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

export function normalizeBestiaryAttacks(entry) {
  if (Array.isArray(entry?.attackProfiles) && entry.attackProfiles.length) {
    return entry.attackProfiles.filter((attack) => String(attack?.name || "").trim()).map((attack) => ({
      id: attack.id || `${attack.name}-${Math.random()}`,
      name: String(attack.name),
      targetNumber: Math.max(1, Math.min(20, Number(attack.targetNumber) || 10)),
      criticalRange: Math.max(1, Math.min(20, Number(attack.criticalRange) || 1)),
      difficulty: Math.max(0, Math.min(5, Number(attack.difficulty) || 1)),
      diceCount: Math.max(1, Math.min(10, Number(attack.diceCount) || 2)),
      damage: Math.max(0, Number(attack.damage) || 0),
      effects: String(attack.effects || ""),
      range: String(attack.range || ""),
    }));
  }

  return String(entry?.attacks || "").split(/\n|;/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const name = line.split(/:|\(|—|–/)[0].replace(/^[-•*]\s*/, "").trim() || `Attack ${index + 1}`;
    const writtenTarget = line.match(/\bTN\s*(\d+)/i);
    const targetNumber = Math.max(1, Math.min(20, writtenTarget ? Number(writtenTarget[1]) : Number(entry?.body || 0) + Number(entry?.melee || 0) || Number(entry?.mind || 0) + Number(entry?.guns || 0) || 10));
    const damageMatch = line.match(/(?:damage|урон|шкода|obrażenia|DC|CD)\D{0,8}(\d+)/i);
    const cdMatch = line.match(/(\d+)\s*(?:CD|DC)\b/i);
    const rangeMatch = line.match(/\bRange\s+([A-Za-z]+)/i);
    return { id: `legacy-${index}`, name, targetNumber, criticalRange: 1, difficulty: 1, diceCount: 2, damage: cdMatch ? Number(cdMatch[1]) : damageMatch ? Number(damageMatch[1]) : numberFrom(line, 0), effects: line, range: rangeMatch?.[1] || "" };
  });
}

export function attackRollConfig(entry, attack, groupSize = 1) {
  const crowdBonus = Number(groupSize || 1) > 1 ? Math.max(2, Number(groupSize)) : 0;
  const rank = entry?.modifier === "legendary" ? 3 : entry?.modifier === "special" ? 2 : 1;
  return {
    id: Date.now(), type: "weapon", title: `${entry?.name || "NPC"}: ${attack.name}`,
    targetNumber: attack.targetNumber, criticalRange: attack.criticalRange, difficulty: attack.difficulty,
    diceCount: Math.min(10, Number(attack.diceCount || 2) * rank + crowdBonus),
    weapon: { name: attack.name, damage: Math.max(0, Number(attack.damage || 0) * rank + crowdBonus), effects: String(attack.effects || "").split(",").map((x) => x.trim()).filter(Boolean), range: attack.range || "", skill: "" },
  };
}

export function applyCreatureModifier(entry, modifier = "standard", groupSize = 1) {
  const crowd = Math.max(1, Math.min(5, Number(groupSize) || 1));
  const baseHp = Math.max(0, Number(entry?.maxHp ?? entry?.hp ?? 0) || 0);
  const multiplier = modifier === "legendary" ? 3 : modifier === "special" ? 2 : 1;
  const hp = modifier === "minion" ? 1 : baseHp * multiplier;
  const xp = Math.max(0, Number(entry?.xp || 0) || 0);
  return {
    ...entry, modifier, groupSize: crowd,
    hp, maxHp: hp,
    xp: modifier === "minion" ? Math.max(1, Math.round(xp / 3)) : xp * multiplier,
    defense: Math.max(0, Number(entry?.defense || 0) || 0) * multiplier,
    resistanceBonus: modifier === "legendary" ? 5 : modifier === "special" ? 2 : 0,
    attackProfiles: normalizeBestiaryAttacks(entry),
  };
}
