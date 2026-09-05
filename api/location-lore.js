const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const WIKI_API_URL = "https://fallout.fandom.com/api.php";

const LANGUAGE_NAMES = {
  en: "English",
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
};

function normalizeLanguage(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
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

function wikiSourceUrl(title) {
  return `https://fallout.fandom.com/wiki/${encodeURIComponent(String(title).replaceAll(" ", "_"))}`;
}

async function fetchWikiIntro(title) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    redirects: "1",
    titles: title,
    origin: "*",
  });
  const response = await fetch(`${WIKI_API_URL}?${params.toString()}`, {
    headers: { "User-Agent": "PIP-2D20-Lore/1.0" },
  });
  if (!response.ok) throw new Error(`Wiki request failed (${response.status})`);
  const data = await response.json();
  const page = Object.values(data?.query?.pages || {})[0];
  if (!page || page.missing !== undefined || !String(page.extract || "").trim()) {
    throw new Error("Wiki article not found");
  }
  return {
    title: page.title || title,
    extract: String(page.extract || "").slice(0, 7000),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const title = String(req.body?.title || "").trim().slice(0, 160);
  const locationName = String(req.body?.locationName || title).trim().slice(0, 160);
  const coreLore = String(req.body?.coreLore || "").trim().slice(0, 1200);
  const language = normalizeLanguage(req.body?.language);
  const languageName = LANGUAGE_NAMES[language];

  if (!title) return res.status(400).json({ error: "Wiki title is required" });

  try {
    const wiki = await fetchWikiIntro(title);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        title: locationName || wiki.title,
        summary: coreLore || `Fallout Wiki reference available for ${locationName || wiki.title}.`,
        details: [],
        sourceUrl: wikiSourceUrl(wiki.title),
        sourceLabel: "Fallout Wiki",
        generated: false,
      });
    }

    const instructions = [
      "You create a compact location reference for a Fallout tabletop companion app.",
      `Write in ${languageName}.`,
      "Use only the supplied Fallout Wiki introduction as factual grounding.",
      "Paraphrase; do not reproduce sentences from the article.",
      "Keep it suitable for a general teen audience and non-graphic.",
      "Do not give walkthrough instructions, exploit advice, real-world dangerous guidance, or lists of weapons/loot.",
      "Return ONLY valid JSON with keys summary and details.",
      "summary: 2-3 concise sentences explaining the place, its role/history, and why it matters.",
      "details: an array of 2-4 short strings about factions/inhabitants, layout/identity, or notable context. Avoid spoilers where possible.",
    ].join("\n");

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_GM_MODEL || "gpt-5.6-luna",
        instructions,
        input: [{
          role: "user",
          content: `LOCATION: ${locationName || wiki.title}\nWIKI TITLE: ${wiki.title}\nWIKI INTRO:\n${wiki.extract}`,
        }],
        max_output_tokens: 600,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || "Lore summarization failed");

    const raw = extractOutputText(data).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }

    const summary = String(parsed?.summary || coreLore || "").trim().slice(0, 1200);
    const details = Array.isArray(parsed?.details)
      ? parsed.details.map((item) => String(item || "").trim().slice(0, 300)).filter(Boolean).slice(0, 4)
      : [];

    res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=2592000");
    return res.status(200).json({
      title: locationName || wiki.title,
      summary,
      details,
      sourceUrl: wikiSourceUrl(wiki.title),
      sourceLabel: "Fallout Wiki",
      generated: true,
    });
  } catch (error) {
    console.error("Location lore endpoint failed", error);
    if (coreLore) {
      return res.status(200).json({
        title: locationName || title,
        summary: coreLore,
        details: [],
        sourceUrl: wikiSourceUrl(title),
        sourceLabel: "Fallout Wiki",
        generated: false,
        fallback: true,
      });
    }
    return res.status(502).json({ error: error?.message || "Location lore unavailable" });
  }
}
