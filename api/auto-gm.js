const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const ALLOWED_EVENT_TYPES = new Set([
  "explored",
  "npc",
  "door",
  "trap",
  "loot",
  "poi",
]);

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

function extractMapEvents(text) {
  const marker = /<map_events>([\s\S]*?)<\/map_events>/i;
  const match = String(text || "").match(marker);

  if (!match) {
    return { text: String(text || "").trim(), events: [] };
  }

  let events = [];
  try {
    events = sanitizeEvents(JSON.parse(match[1]));
  } catch {
    events = [];
  }

  return {
    text: String(text || "").replace(marker, "").trim(),
    events,
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

  const { character, world, history, message } = req.body || {};
  const userText = String(message || "").trim();

  if (!userText) {
    return res.status(400).json({ error: "Message is required" });
  }

  const sessionContext = {
    character: character || null,
    world: world || null,
  };

  const instructions = [
    "You are the Auto GM for a Fallout 2d20 tabletop role-playing session.",
    "Run a text-based exploration scene using the supplied character summary and global-map context.",
    "Treat the map context as the source of truth for where the character currently is and what they are exploring.",
    "Be concise but atmospheric. Advance the scene in small steps and end with a clear situation or choice for the player.",
    "Use Fallout 2d20-style checks, skills, AP, complications, loot, NPCs and environmental discoveries when appropriate, but do not invent changes to the character sheet unless the player confirms them.",
    "When a rules check is needed, state the suggested attribute + skill and difficulty, then wait for the player to provide the roll result unless the app already supplied it.",
    "Keep descriptions suitable for a general teen audience: no graphic injury detail, gore, sexual content, or instructions for real-world dangerous activities.",
    "Do not claim to be the Dodo custom GPT. You are this application's independent Auto GM.",
    "At the very end of every response append exactly one machine-readable <map_events>...</map_events> block containing a JSON array.",
    "The visible narrative must come before that block. The block is hidden by the app and must not be explained to the player.",
    "Only record persistent exploration facts that were actually established in the scene. Do not record hypothetical choices.",
    "Allowed event types are: explored, npc, door, trap, loot, poi.",
    "Each event must be an object with type, title, detail, status. Use status discovered by default; use resolved, opened, disarmed, collected, friendly, hostile, or cleared only when the scene clearly establishes it.",
    "If no persistent fact changed, return an empty array: <map_events>[]</map_events>.",
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
        max_output_tokens: 1000,
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

    const parsed = extractMapEvents(rawText);
    if (!parsed.text) {
      return res.status(502).json({ error: "Auto GM returned no visible narrative" });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Auto GM endpoint failed", error);
    return res.status(500).json({ error: "Could not contact Auto GM" });
  }
}
