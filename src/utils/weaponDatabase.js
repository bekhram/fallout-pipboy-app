const METADATA_FIELDS = ["cost", "weight", "rarity"];

export function normalizeWeaponName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function findWeaponInDatabase(name, database = []) {
  const normalizedName = normalizeWeaponName(name);
  if (!normalizedName || !Array.isArray(database)) return null;

  return database.find(
    (entry) => normalizeWeaponName(entry?.name) === normalizedName
  ) || null;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function getWeaponMetadata(weapon, database = []) {
  const databaseWeapon = findWeaponInDatabase(weapon?.name, database);

  return {
    cost: hasValue(weapon?.cost) ? weapon.cost : databaseWeapon?.Cost || "",
    weight: hasValue(weapon?.weight) ? weapon.weight : databaseWeapon?.Weight || "",
    rarity: hasValue(weapon?.rarity) ? weapon.rarity : databaseWeapon?.Rarity || "",
  };
}

export function hydrateWeaponMetadata(weapon, database = []) {
  if (!weapon) return weapon;
  return { ...weapon, ...getWeaponMetadata(weapon, database) };
}

export function needsWeaponMetadataHydration(weapon, database = []) {
  const hydrated = getWeaponMetadata(weapon, database);
  return METADATA_FIELDS.some((field) => hydrated[field] !== weapon?.[field]);
}
