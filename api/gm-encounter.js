const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const LANGUAGE_NAMES = {
  en: "English",
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
};

function normalizeLanguage(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return LANGUAGE_NAMES[code] ? code : "en";
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content?.text === "string") return content.text.trim();
    }
  }
  return "";
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).filter(Boolean).map((item) => ({
    role: item.role === "gm" ? "assistant" : "user",
    content: String(item.text || "").slice(0, 5000),
  }));
}

function sanitizeContext(context) {
  if (!context || typeof context !== "object") return {};
  try {
    const json = JSON.stringify(context);
    if (json.length <= 42000) return JSON.parse(json);
    return JSON.parse(json.slice(0, 41900).replace(/[,][^,{}\[\]]*$/, "") + "}");
  } catch {
    return {};
  }
}

function parseStructured(text) {
  const clean = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(clean);
    return {
      narration: String(parsed?.narration || "").trim().slice(0, 9000),
      gmNotes: String(parsed?.gmNotes || "").trim().slice(0, 7000),
      rewards: String(parsed?.rewards || "").trim().slice(0, 5000),
      nextBeats: Array.isArray(parsed?.nextBeats)
        ? parsed.nextBeats.slice(0, 6).map((item) => String(item || "").trim().slice(0, 800)).filter(Boolean)
        : [],
    };
  } catch {
    return { narration: clean.slice(0, 9000), gmNotes: "", rewards: "", nextBeats: [] };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Auto GM is not configured." });

  const { message, language, history, gmContext } = req.body || {};
  const userText = String(message || "").trim().slice(0, 8000);
  if (!userText) return res.status(400).json({ error: "Encounter brief is required" });

  const languageCode = normalizeLanguage(language);
  const languageName = LANGUAGE_NAMES[languageCode];
  const context = sanitizeContext(gmContext);

  const instructions = [
    "You are the GM-side Auto GM encounter narrator for a Fallout 2d20 tabletop session.",
    `Write all visible output in ${languageName}.`,
    "Use GM_CONTEXT as authoritative game state. Never contradict supplied character stats, scene state, enemies, weather, terrain, time, hazards, round or turn order.",
    "The party arrived here because they are pursuing a mission. Their broad goals are to complete the objective, survive, discover useful resources, find loot, and earn or recover caps. Keep those motives relevant without deciding actions for the players.",
    "The wasteland is generally hostile to the party: scarcity, distrust, environmental danger and hostile creatures or factions are common. This should create tension, but not every encounter must immediately become combat.",
    "ACTIVE ENEMIES may be acknowledged naturally when they are already visible. HIDDEN ENEMIES are GM-only secrets. Never reveal a hidden enemy in narration unless the GM brief explicitly says it has already been discovered or it becomes logically revealed during the described beat.",
    "Use player character cards selectively: mention capabilities, equipment, injuries or conditions only when they materially affect the scene. Do not dump stats into prose.",
    "Blend weather, terrain, location type, time of day and active environmental effects into sensory description rather than listing settings mechanically.",
    "If combat is already underway, respect the current round and active turn. Do not invent completed attacks, damage, rolls, HP changes or player choices.",
    "Offer plausible opportunities for salvage, resources, loot or caps. They are opportunities, not guaranteed rewards, unless GM_CONTEXT already establishes them.",
    "Keep descriptions atmospheric and cinematic but non-graphic. Focus on tension, exploration, tactical choices and consequences.",
    "Return ONLY valid JSON with exactly these keys: narration, gmNotes, rewards, nextBeats.",
    "narration: 2-5 paragraphs the GM can read aloud to players. Do not reveal GM-only secrets.",
    "gmNotes: concise private notes for the GM: threats, hidden information, likely reactions, useful checks or complications. Do not force a check when none is needed.",
    "rewards: concise search/loot/resource/caps opportunities grounded in the scene.",
    "nextBeats: array of 2-5 short possible developments that react to player choices without deciding those choices.",
  ].join("\n");

  const input = [
    ...sanitizeHistory(history),
    {
      role: "user",
      content: `GM ENCOUNTER BRIEF:\n${userText}\n\nGM_CONTEXT:\n${JSON.stringify(context)}`,
    },
  ];

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_GM_MODEL || "gpt-5.6-luna",
        instructions,
        input,
        max_output_tokens: 1800,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: payload?.error?.message || "Auto GM request failed" });

    const text = extractOutputText(payload);
    if (!text) return res.status(502).json({ error: "Auto GM returned an empty response" });
    return res.status(200).json(parseStructured(text));
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Auto GM request failed" });
  }
}
