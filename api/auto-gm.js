const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

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
        max_output_tokens: 900,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenAI Auto GM error", response.status, data);
      return res.status(response.status).json({
        error: data?.error?.message || "Auto GM request failed",
      });
    }

    const text = extractOutputText(data);
    if (!text) {
      return res.status(502).json({ error: "Auto GM returned an empty response" });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Auto GM endpoint failed", error);
    return res.status(500).json({ error: "Could not contact Auto GM" });
  }
}
