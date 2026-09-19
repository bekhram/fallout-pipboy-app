const MAX_SCREENSHOT_BYTES = 2_500_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function text(value, max = 4000) {
  return String(value ?? "").trim().slice(0, max);
}

function allowedOrigin(origin) {
  const normalized = text(origin, 300).replace(/\/$/, "");
  const allowed = new Set([
    "https://pip-2d20.fun",
    "https://www.pip-2d20.fun",
    "http://localhost:5173",
    "capacitor://localhost",
    "http://localhost",
  ]);
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
  text(process.env.BUG_REPORT_ALLOWED_ORIGINS, 2000)
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .forEach((item) => allowed.add(item));
  return Boolean(normalized && allowed.has(normalized));
}

function decodeScreenshot(body) {
  const mime = text(body?.screenshotType, 80).toLowerCase();
  const name = text(body?.screenshotName, 160) || "screenshot";
  const raw = String(body?.screenshotData || "");
  if (!raw) return null;
  if (!ALLOWED_IMAGE_TYPES.has(mime)) throw new Error("INVALID_SCREENSHOT_TYPE");
  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || match[1].toLowerCase() !== mime) throw new Error("INVALID_SCREENSHOT");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_SCREENSHOT_BYTES) throw new Error("SCREENSHOT_TOO_LARGE");
  return { filename: name, content: buffer.toString("base64") };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const origin = text(req.headers?.origin, 300).replace(/\/$/, "");
  if (allowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    return allowedOrigin(origin)
      ? res.status(204).end()
      : res.status(403).end();
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  if (!allowedOrigin(origin)) return res.status(403).json({ ok: false, error: "ORIGIN_NOT_ALLOWED" });

  const apiKey = text(process.env.RESEND_API_KEY, 500);
  const recipient = text(process.env.BUG_REPORT_EMAIL, 500);
  const from = text(process.env.BUG_REPORT_FROM_EMAIL, 500)
    || "Pip2D20 Bug Reports <onboarding@resend.dev>";
  if (!apiKey || !recipient) {
    console.error("bug_report_not_configured", {
      hasApiKey: Boolean(apiKey),
      hasRecipient: Boolean(recipient),
    });
    return res.status(503).json({ ok: false, error: "BUG_REPORT_NOT_CONFIGURED" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const title = text(body.title, 140);
    const description = text(body.description, 6000);
    const contact = text(body.contact, 240);
    const language = text(body.language, 30);
    const pageUrl = text(body.pageUrl, 700);
    const userAgent = text(body.userAgent, 700);
    const viewport = text(body.viewport, 100);

    if (title.length < 3 || description.length < 8) {
      return res.status(400).json({ ok: false, error: "INVALID_REPORT" });
    }

    const screenshot = decodeScreenshot(body);
    const subject = `[Pip2D20 Bug] ${title}`;
    const html = `
      <h2>Pip2D20 bug report</h2>
      <p><strong>Title:</strong> ${escapeHtml(title)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(contact || "not provided")}</p>
      <p><strong>Language:</strong> ${escapeHtml(language || "unknown")}</p>
      <p><strong>Page:</strong> ${escapeHtml(pageUrl || "unknown")}</p>
      <p><strong>Viewport:</strong> ${escapeHtml(viewport || "unknown")}</p>
      <p><strong>User agent:</strong> ${escapeHtml(userAgent || "unknown")}</p>
      <hr/>
      <p style="white-space:pre-wrap">${escapeHtml(description)}</p>
    `;

    const payload = {
      from,
      to: [recipient],
      subject,
      html,
      reply_to: contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? contact : undefined,
      attachments: screenshot ? [screenshot] : undefined,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("bug_report_email_failed", {
        status: response.status,
        message: data?.message || data?.name || "",
      });
      return res.status(502).json({ ok: false, error: "EMAIL_SEND_FAILED" });
    }

    return res.status(200).json({ ok: true, id: data?.id || null });
  } catch (error) {
    const code = String(error?.message || "SERVER_ERROR");
    const status = code === "SCREENSHOT_TOO_LARGE" || code.startsWith("INVALID_") ? 400 : 500;
    console.error("bug_report_failure", { code });
    return res.status(status).json({ ok: false, error: code });
  }
}
