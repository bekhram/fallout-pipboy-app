function parseCsvLine(line) {
  const result = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(value.trim());
      value = "";
    } else value += char;
  }
  result.push(value.trim());
  return result;
}

export function parseNpcWeaponCsv(csv = "") {
  const lines = String(csv || "").replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
    const effects = String(row.Effects || "").trim();
    const qualities = String(row.Qualities || "").trim();
    return {
      id: `weapon-db-${index}-${String(row.name || "weapon").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: String(row.name || "Weapon"),
      weaponType: String(row["Weapon type"] || ""),
      damage: Math.max(0, Number(row["Damage Rating"] || 0)),
      creatureDamage: Math.max(0, Number(row["Creatures Damage Rating"] || row["Damage Rating"] || 0)),
      effects,
      effect: [effects, qualities ? `Qualities: ${qualities}` : ""].filter(Boolean).join(" • "),
      damageType: String(row["Damage type"] || "Physical"),
      rate: Math.max(0, Number(row["Rate of Fire"] || 0)),
      range: String(row.Range || "C"),
      qualities,
      rarity: String(row.Rarity || ""),
      ammo: String(row.Ammo || ""),
      cost: String(row.Cost ?? ""),
      weight: String(row.Weight ?? "").replace(",", "."),
    };
  }).filter((weapon) => weapon.name);
}

let cached = null;
export async function loadNpcWeaponDatabase() {
  if (cached) return cached;
  const response = await fetch("/weapons.csv", { cache: "force-cache" });
  if (!response.ok) throw new Error(`WEAPON_DB_${response.status}`);
  cached = parseNpcWeaponCsv(await response.text());
  return cached;
}
