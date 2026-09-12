const TERRAIN_VALUES = new Set(["wasteland", "forest", "swamp", "ruins"]);
const TERRAIN_SUFFIX_RE = /(?::terrain:(?:wasteland|forest|swamp|ruins))+$/i;

function normalizeTerrainKey(value) {
  const terrain = String(value || "wasteland").toLowerCase();
  return TERRAIN_VALUES.has(terrain) ? terrain : "wasteland";
}

/**
 * Seed stored in proceduralMapSpec must stay canonical and terrain-agnostic.
 * Older builds could persist one or more ":terrain:<type>" suffixes; strip
 * those at the boundary so preview, tactical rendering and room generation
 * all start from exactly the same seed value.
 */
export function canonicalProceduralSeed(value = "1") {
  const raw = String(value ?? "1").trim() || "1";
  const canonical = raw.replace(TERRAIN_SUFFIX_RE, "");
  return canonical || "1";
}

/**
 * Terrain is allowed to influence deterministic PRNG streams, but only as a
 * derived input. Never persist this value back into proceduralMapSpec.seed.
 */
export function proceduralTerrainSeed(seed, terrain = "wasteland") {
  return `${canonicalProceduralSeed(seed)}:terrain:${normalizeTerrainKey(terrain)}`;
}
