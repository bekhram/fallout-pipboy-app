// Shared combat-dice notation for bestiary text, procedural generation and NPC rolls.
// Some published NPC attacks omit the "CD" unit ("(TN 11), 5 Physical").
// We only accept that short form immediately after an attack's "(TN N)" to
// avoid mistaking fire rate, armor ratings and Piercing 1 for damage dice.

const EXPLICIT_DICE_RE = /(\d+(?:\.\d+)?)\s*(CD|DC|КУ)(?![A-Za-zА-Яа-яІіЇїЄєҐґ])/i;
const BARE_ATTACK_DICE_RE = /(\(\s*TN\s*\d+\s*\)\s*,?\s*)(\d+(?:\.\d+)?)\s+(?=(?:Physical|Energy|Radiation|Poison|Piercing|Vicious|Breaking|Stun|Spread|Burst|Persistent|Radioactive|Damage)\b)/i;

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseCombatDiceValue(value, fallback = 0) {
  if (typeof value === "number") return safeNumber(value, fallback);
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  const prefixed = raw.match(/^(\d+(?:\.\d+)?)\s*(?:CD|DC|КУ)(?![A-Za-zА-Яа-яІіЇїЄєҐґ])/i);
  return prefixed ? Number(prefixed[1]) : fallback;
}

export function extractAttackDamageDice(line) {
  const source = String(line ?? "");
  const explicit = source.match(EXPLICIT_DICE_RE);
  if (explicit) return safeNumber(explicit[1], 0);
  const bare = source.match(BARE_ATTACK_DICE_RE);
  return bare ? safeNumber(bare[2], 0) : null;
}

export function rewriteAttackDamageDice(line, transform) {
  const source = String(line ?? "");
  let explicitFound = false;
  const explicitlyScaled = source.replace(
    new RegExp(EXPLICIT_DICE_RE.source, "gi"),
    (match, raw, unit) => {
      explicitFound = true;
      return `${Math.max(0, Math.floor(safeNumber(transform(safeNumber(raw, 0)), 0)))} ${unit}`;
    },
  );
  if (explicitFound) return { text: explicitlyScaled, found: true };
  let found = false;
  const next = source.replace(BARE_ATTACK_DICE_RE, (match, prefix, raw) => {
    found = true;
    return `${prefix}${Math.max(0, Math.floor(safeNumber(transform(safeNumber(raw, 0)), 0)))} CD `;
  });
  return { text: next, found };
}

/** Preselect the actual weapon damage dice when the user opens the D6 tab. */
export function initialWeaponD6Count(weapon, fallback = 4) {
  const amount = parseCombatDiceValue(weapon?.damage, 0);
  return amount > 0 ? Math.max(1, Math.min(50, Math.floor(amount))) : fallback;
}
