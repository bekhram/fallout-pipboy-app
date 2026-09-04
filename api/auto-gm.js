const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const ALLOWED_EVENT_TYPES = new Set([
  "explored",
  "npc",
  "door",
  "trap",
  "loot",
  "poi",
]);

const ALLOWED_ATTRIBUTES = new Set(["S", "P", "E", "C", "I", "A", "L"]);
const ALLOWED_SKILLS = new Set([
  "Athletics",
  "Barter",
  "Big Guns",
  "Energy Weapons",
  "Explosives",
  "Lockpick",
  "Medicine",
  "Melee Weapons",
  "Pilot",
  "Repair",
  "Science",
  "Small Guns",
  "Sneak",
  "Speech",
  "Survival",
  "Throwing",
  "Unarmed",
]);

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

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-16)
    .filter((item) => item && (item.role === "user" || item.role === "gm"))
    .map((item) => ({
      role: item.role === "gm" ? "assistant" : "user",
      content: String(item.text || "").slice(0, 5000),
    }));
}

function sanitizeEvents(events) {
  if (!Array.isArray(events)) return [];

  return events
    .slice(0, 8)
    .filter((event) => event && ALLOWED_EVENT_TYPES.has(event.type))
    .map((event) => ({
      type: event.type,
      title: String(event.title || event.type).slice(0, 120),
      detail: String(event.detail || "").slice(0, 500),
      status: String(event.status || "discovered").slice(0, 40),
    }));
}

function sanitizeLocationState(locationState) {
  if (!locationState || typeof locationState !== "object") return null;
  const facts = Array.isArray(locationState.facts)
    ? locationState.facts
        .slice(-40)
        .filter((event) => event && ALLOWED_EVENT_TYPES.has(event.type))
        .map((event) => ({
          type: event.type,
          title: String(event.title || event.type).slice(0, 120),
          detail: String(event.detail || "").slice(0, 500),
          status: String(event.status || "discovered").slice(0, 40),
        }))
    : [];

  const byType = {};
  for (const type of ALLOWED_EVENT_TYPES) {
    byType[type] = facts.filter((event) => event.type === type);
  }

  return {
    persistent: locationState.persistent === true,
    facts,
    byType,
    summary: {
      total: facts.length,
      npcs: byType.npc.length,
      doors: byType.door.length,
      traps: byType.trap.length,
      loot: byType.loot.length,
      pois: byType.poi.length,
      explored: byType.explored.length,
    },
  };
}

function sanitizeSkillCheck(value) {
  if (!value || typeof value !== "object") return null;

  const attribute = String(value.attribute || "").toUpperCase();
  const skill = String(value.skill || "");
  if (!ALLOWED_ATTRIBUTES.has(attribute) || !ALLOWED_SKILLS.has(skill)) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    attribute,
    skill,
    difficulty: Math.max(0, Math.min(5, Number(value.difficulty) || 1)),
    diceCount: Math.max(1, Math.min(5, Number(value.diceCount) || 2)),
    reason: String(value.reason || "").slice(0, 240),
  };
}

function extractMachineBlocks(text) {
  let visibleText = String(text || "");
  let events = [];
  let check = null;

  const mapMarker = /<map_events>([\s\S]*?)<\/map_events>/i;
  const mapMatch = visibleText.match(mapMarker);
  if (mapMatch) {
    try {
      events = sanitizeEvents(JSON.parse(mapMatch[1]));
    } catch {
      events = [];
    }
    visibleText = visibleText.replace(mapMarker, "");
  }

  const checkMarker = /<skill_check>([\s\S]*?)<\/skill_check>/i;
  const checkMatch = visibleText.match(checkMarker);
  if (checkMatch) {
    try {
      const parsed = JSON.parse(checkMatch[1]);
      check = parsed === null ? null : sanitizeSkillCheck(parsed);
    } catch {
      check = null;
    }
    visibleText = visibleText.replace(checkMarker, "");
  }

  return {
    text: visibleText.trim(),
    events,
    check,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Auto GM is not configured. Add OPENAI_API_KEY to the Vercel project environment variables.",
    });
  }

  const { character, world, history, message, language, locationState } = req.body || {};
  const userText = String(message || "").trim();
  const languageCode = normalizeLanguage(language);
  const languageName = LANGUAGE_NAMES[languageCode];
  const structuredLocationState = sanitizeLocationState(locationState);

  if (!userText) {
    return res.status(400).json({ error: "Message is required" });
  }

  const sessionContext = {
    character: character || null,
    world: world || null,
    language: languageCode,
    locationState: structuredLocationState,
  };

  const instructions = [
    "You are the Auto GM for a Fallout 2d20 tabletop role-playing session.",
    `IMPORTANT LANGUAGE RULE: The application's selected language is ${languageName} (${languageCode}). Write ALL visible narrative, questions, check descriptions, NPC dialogue, and map-event title/detail/status text in ${languageName}. Do not switch to English unless the player explicitly asks you to.`,
    "Run a text-based exploration scene using the supplied character summary and global-map context.",
    "Treat the map context as the source of truth for where the character currently is and what they are exploring.",
    "If SESSION CONTEXT contains locationState, treat every fact in locationState.facts as established canonical state for this location. Preserve NPC identities and attitudes, door states, traps, loot status, discovered POIs, cleared/resolved areas and other consequences. Do not silently reset, duplicate, contradict, resurrect or re-hide established facts.",
    "When an established fact changes, update the same fact through a map event using the same type and preferably the same title, with the new status/detail. Only create a new event for a genuinely new discovery.",
    "For static persistent locations, continue the existing location state across visits. For procedural temporary locations, use supplied facts only for the current visit and never imply they survive after the player leaves.",
    "Be concise but atmospheric. Advance the scene in small steps and end with a clear situation or choice for the player.",
    "Use Fallout 2d20-style skill checks, AP, complications, loot, NPCs and environmental discoveries when appropriate, but do not invent changes to the character sheet unless the player confirms them.",
    "When a skill check is actually required before the scene can continue, ask for exactly one check and do not narrate its outcome yet.",
    "For machine-readable checks, attribute must be one of S,P,E,C,I,A,L and skill must be one exact English machine value from: Athletics, Barter, Big Guns, Energy Weapons, Explosives, Lockpick, Medicine, Melee Weapons, Pilot, Repair, Science, Small Guns, Sneak, Speech, Survival, Throwing, Unarmed.",
    "Prefer non-combat exploration/social skill checks when appropriate. Do not request a check when ordinary roleplay can simply continue.",
    "If the player's latest message clearly contains a roll result, resolve that result first and do not repeat the same check. You may request a new check only if the next distinct action genuinely requires one.",
    "Keep descriptions suitable for a general teen audience: no graphic injury detail, gore, sexual content, or instructions for real-world dangerous activities.",
    "Do not claim to be the Dodo custom GPT. You are this application's independent Auto GM.",
    "At the very end of every response append exactly one <skill_check>...</skill_check> block and exactly one <map_events>...</map_events> block.",
    "The visible narrative must come before both blocks. The app hides the blocks, so never explain them to the player.",
    `If a roll is required, <skill_check> must contain JSON like {\"attribute\":\"P\",\"skill\":\"Survival\",\"difficulty\":1,\"diceCount\":2,\"reason\":\"${languageName} text\"}. If no roll is required, output <skill_check>null</skill_check>.`,
    "Only record exploration facts that were actually established in the scene. Do not record hypothetical choices.",
    "Allowed map event types are: explored, npc, door, trap, loot, poi.",
    `Each map event must contain type, title, detail, status. The type stays one of the allowed English machine values, but title/detail/status must be written in ${languageName}.`,
    "If no exploration fact changed, return <map_events>[]</map_events>.",
    `SESSION CONTEXT: ${JSON.stringify(sessionContext)}`,
  ].join("\n");

  const input = [
    ...sanitizeHistory(history),
    { role: "user", content: userText.slice(0, 5000) },
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
        max_output_tokens: 1100,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenAI Auto GM error", response.status, data);
      return res.status(response.status).json({
        error: data?.error?.message || "Auto GM request failed",
      });
    }

    const rawText = extractOutputText(data);
    if (!rawText) {
      return res.status(502).json({ error: "Auto GM returned an empty response" });
    }

    const parsed = extractMachineBlocks(rawText);
    if (!parsed.text) {
      return res.status(502).json({ error: "Auto GM returned no visible narrative" });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Auto GM endpoint failed", error);
    return res.status(500).json({ error: "Could not contact Auto GM" });
  }
}
