const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const LANGUAGE_NAMES = {
  en: "English",
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
};

const ALLOWED_ACTIONS = new Set(["attack", "aim", "move", "defend", "pass"]);
const ALLOWED_RANGES = new Set(["close", "medium", "long", "extreme"]);
const ALLOWED_SKILLS = new Set([
  "Athletics", "Big Guns", "Energy Weapons", "Explosives", "Melee Weapons",
  "Small Guns", "Throwing", "Unarmed", "Survival",
]);

function normalizeLanguage(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return LANGUAGE_NAMES[code] ? code : "en";
}

function clamp(value, min, max, fallback = min) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text.trim();
    }
  }
  return "";
}

function safeWeapon(value = {}) {
  const skill = ALLOWED_SKILLS.has(String(value.skill || "")) ? String(value.skill) : "Small Guns";
  return {
    name: String(value.name || "Improvised weapon").slice(0, 80),
    skill,
    attackType: skill,
    damage: clamp(value.damage, 1, 12, 3),
    damageType: ["physical", "energy", "radiation", "poison"].includes(String(value.damageType || "").toLowerCase())
      ? String(value.damageType).toLowerCase()
      : "physical",
    rate: clamp(value.rate, 0, 6, 0),
    range: ALLOWED_RANGES.has(String(value.range || "").toLowerCase()) ? String(value.range).toLowerCase() : "close",
    effects: Array.isArray(value.effects) ? value.effects.slice(0, 6).map((item) => String(item).slice(0, 40)) : [],
  };
}

function safeEnemy(value = {}, index = 0) {
  const special = value.special && typeof value.special === "object" ? value.special : {};
  const rawSkills = value.skills && typeof value.skills === "object" ? value.skills : {};
  const skills = {};
  for (const [name, entry] of Object.entries(rawSkills)) {
    if (!ALLOWED_SKILLS.has(name)) continue;
    skills[name] = {
      rank: clamp(entry?.rank, 0, 6, 1),
      bonus: clamp(entry?.bonus, 0, 5, 0),
      tagged: Boolean(entry?.tagged),
    };
  }
  return {
    id: String(value.id || `enemy-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60),
    name: String(value.name || `Enemy ${index + 1}`).slice(0, 80),
    hp: { current: clamp(value.hp, 1, 60, 10), max: clamp(value.hp, 1, 60, 10) },
    defense: clamp(value.defense, 0, 5, 1),
    initiative: clamp(value.initiative, 0, 30, 10),
    range: ALLOWED_RANGES.has(String(value.range || "").toLowerCase()) ? String(value.range).toLowerCase() : "close",
    special: {
      S: clamp(special.S, 1, 12, 5), P: clamp(special.P, 1, 12, 5), E: clamp(special.E, 1, 12, 5),
      C: clamp(special.C, 1, 12, 5), I: clamp(special.I, 1, 12, 5), A: clamp(special.A, 1, 12, 5), L: clamp(special.L, 1, 12, 5),
    },
    skills,
    resistances: {
      physical: clamp(value.resistances?.physical, 0, 10, 0),
      energy: clamp(value.resistances?.energy, 0, 10, 0),
      radiation: clamp(value.resistances?.radiation, 0, 10, 0),
      poison: clamp(value.resistances?.poison, 0, 10, 0),
    },
    weapons: Array.isArray(value.weapons) && value.weapons.length
      ? value.weapons.slice(0, 3).map(safeWeapon)
      : [safeWeapon({})],
  };
}

function safeDirective(value = {}) {
  const action = ALLOWED_ACTIONS.has(String(value.action || "")) ? String(value.action) : "pass";
  return {
    actorId: String(value.actorId || "").slice(0, 80),
    action,
    targetId: String(value.targetId || "player").slice(0, 80),
    targetRange: ALLOWED_RANGES.has(String(value.targetRange || "").toLowerCase()) ? String(value.targetRange).toLowerCase() : "close",
    chosenLocation: ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"].includes(value.chosenLocation) ? value.chosenLocation : "",
    weaponIndex: clamp(value.weaponIndex, 0, 2, 0),
    moveToRange: ALLOWED_RANGES.has(String(value.moveToRange || "").toLowerCase()) ? String(value.moveToRange).toLowerCase() : null,
    narration: String(value.narration || "").slice(0, 600),
  };
}

function parseJson(text) {
  const cleaned = String(text || "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Combat GM is not configured" });

  const { mode, character, combat, language, location, event } = req.body || {};
  const lang = normalizeLanguage(language);
  const languageName = LANGUAGE_NAMES[lang];

  let task = "";
  if (mode === "create_encounter") {
    task = `Create a small Fallout 2d20 combat encounter appropriate to this location. Return JSON only with shape {"narration":"...","enemies":[...]}. Use 1-4 opponents. Each enemy must include id,name,hp,defense,initiative,range,special,skills,resistances,weapons. Keep stats conservative and playable; do not copy published stat blocks verbatim. Machine skill names must be English.`;
  } else if (mode === "npc_turn") {
    task = `Choose exactly one legal action for the active enemy combatant. Return JSON only with shape {"actorId":"...","action":"attack|aim|move|defend|pass","targetId":"player","targetRange":"close|medium|long|extreme","chosenLocation":"","weaponIndex":0,"moveToRange":"close|medium|long|extreme|null","narration":"..."}. Prefer sensible tactics, but never calculate attack rolls or damage; the app does all math.`;
  } else if (mode === "narrate_result") {
    task = `Narrate the supplied resolved combat-engine event in 1-3 concise sentences. Return JSON only with shape {"narration":"..."}. Do not alter, reroll, or contradict the supplied result.`;
  } else {
    return res.status(400).json({ error: "Unknown combat GM mode" });
  }

  const instructions = [
    "You are the combat decision layer for a Fallout 2d20 companion app.",
    `Write all visible narration in ${languageName}.`,
    "The application combat engine is authoritative for initiative, checks, hit locations, Combat Dice, DR, HP and injuries.",
    "Never calculate or invent a resolved roll. You choose NPC intent; the application resolves it.",
    "Keep combat descriptions non-graphic and suitable for a general teen audience.",
    task,
    `LOCATION: ${JSON.stringify(location || null)}`,
    `CHARACTER: ${JSON.stringify(character || null)}`,
    `COMBAT STATE: ${JSON.stringify(combat || null)}`,
    `RESOLVED EVENT: ${JSON.stringify(event || null)}`,
  ].join("\n");

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_GM_MODEL || "gpt-5.6-luna",
        instructions,
        input: [{ role: "user", content: "Return the requested combat JSON now." }],
        max_output_tokens: mode === "create_encounter" ? 1200 : 500,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Combat GM request failed" });

    const parsed = parseJson(extractOutputText(data));
    if (mode === "create_encounter") {
      return res.status(200).json({
        narration: String(parsed?.narration || "").slice(0, 600),
        enemies: Array.isArray(parsed?.enemies) ? parsed.enemies.slice(0, 4).map(safeEnemy) : [],
      });
    }
    if (mode === "npc_turn") return res.status(200).json(safeDirective(parsed));
    return res.status(200).json({ narration: String(parsed?.narration || "").slice(0, 600) });
  } catch (error) {
    console.error("Combat GM endpoint failed", error);
    return res.status(500).json({ error: "Could not contact Combat GM" });
  }
}
