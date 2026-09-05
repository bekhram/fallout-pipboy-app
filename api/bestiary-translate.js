const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const LANGUAGE_NAMES = {
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
};

const DETAIL_FIELDS = [
  "name",
  "creatureType",
  "attacks",
  "abilities",
  "tactics",
  "loot",
  "summary",
  "trigger",
  "damage",
  "effect",
  "notes",
];

function normalizeLanguage(value) {
  const code = String(value || "").toLowerCase().split("-")[0];
  return LANGUAGE_NAMES[code] ? code : null;
}

function cleanText(value, max = 6000) {
  return String(value || "").slice(0, max);
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        return content.text.trim();
      }
    }
  }

  return "";
}

function parseJsonText(text) {
  const raw = String(text || "").trim();
  const unfenced = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(unfenced);
}

function sanitizeIndex(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.slice(0, 90).map((entry) => ({
    id: cleanText(entry?.id, 100),
    name: cleanText(entry?.name, 140),
    creatureType: cleanText(entry?.creatureType, 220),
    tags: Array.isArray(entry?.tags)
      ? entry.tags.slice(0, 14).map((tag) => cleanText(tag, 60))
      : [],
  })).filter((entry) => entry.id);
}

function sanitizeDetail(entry) {
  const safe = { id: cleanText(entry?.id, 100) };
  for (const field of DETAIL_FIELDS) {
    safe[field] = cleanText(entry?.[field], field === "name" ? 140 : 7000);
  }
  return safe;
}

function buildInstructions(languageName, mode) {
  return [
    `Translate Fallout 2d20 bestiary reference data into ${languageName}.`,
    "Translate faithfully and concisely. Do not invent, remove, rebalance, correct, or reinterpret any rule.",
    "Preserve every number exactly, including TN values, Difficulty/D values, Levels, XP, damage dice, bonuses, ranges, and page numbers.",
    "Keep these rules tokens and abbreviations unchanged: TN, CD, DR, BODY, MIND, STR, PER, END, CHA, INT, AGI, LCK, HP, XP, AP, D0, D1, D2, D3, D4, D5, Range C, Range M, Range L, Range E.",
    "Keep Fallout proper names recognizable. Translate descriptive creature types, tags, attack names, ability names, damage descriptions, tactics, loot instructions, hazards and trap text naturally.",
    "Return JSON only. Do not wrap it in markdown.",
    mode === "index"
      ? "Input is an array. Return an array with the same item order and exactly these fields per item: id, name, creatureType, tags. Keep id unchanged."
      : `Input is one object. Return one object with id plus exactly these translatable fields: ${DETAIL_FIELDS.join(", ")}. Keep id unchanged.`,
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Translation service is not configured" });
  }

  const language = normalizeLanguage(req.body?.language);
  if (!language) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  const mode = req.body?.mode === "index" ? "index" : "detail";
  const inputData = mode === "index"
    ? sanitizeIndex(req.body?.entries)
    : sanitizeDetail(req.body?.entry || {});

  if (mode === "index" && !inputData.length) {
    return res.status(400).json({ error: "No entries supplied" });
  }
  if (mode === "detail" && !inputData.id) {
    return res.status(400).json({ error: "No entry supplied" });
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_BESTIARY_MODEL || process.env.OPENAI_GM_MODEL || "gpt-5.6-luna",
        instructions: buildInstructions(LANGUAGE_NAMES[language], mode),
        input: [{ role: "user", content: JSON.stringify(inputData) }],
        max_output_tokens: mode === "index" ? 5000 : 3200,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Bestiary translation error", response.status, data);
      return res.status(response.status).json({
        error: data?.error?.message || "Translation request failed",
      });
    }

    const text = extractOutputText(data);
    if (!text) return res.status(502).json({ error: "Empty translation response" });

    const translated = parseJsonText(text);
    return res.status(200).json({ translated });
  } catch (error) {
    console.error("Bestiary translation endpoint failed", error);
    return res.status(500).json({ error: "Could not translate bestiary entry" });
  }
}
