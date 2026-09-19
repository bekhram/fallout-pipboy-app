import {
  disconnectTelegramLink,
  getTelegramLink,
  hashToken,
  makeConnectCode,
  makeManageToken,
  saveConnectCode,
  validCampaignId,
  webhookSecret,
} from "../server/telegramCampaignStore.js";

function text(value) {
  return String(value ?? "").trim();
}

async function telegramCall(method, payload) {
  const token = text(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) throw new Error("TELEGRAM_NOT_CONFIGURED");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    console.error("telegram_api_failure", { method, status: response.status, description: data?.description || "" });
    throw new Error("TELEGRAM_API_FAILED");
  }
  return data.result;
}

async function ensureWebhook() {
  const token = text(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) throw new Error("TELEGRAM_NOT_CONFIGURED");
  const url = text(process.env.TELEGRAM_WEBHOOK_URL) || "https://www.pip-2d20.fun/api/telegram-webhook";
  await telegramCall("setWebhook", {
    url,
    secret_token: webhookSecret(token),
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  return telegramCall("getMe", {});
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const campaignId = text(body.campaignId);
    if (!validCampaignId(campaignId)) return res.status(400).json({ ok: false, error: "INVALID_CAMPAIGN" });

    if (body.type === "status") {
      const link = await getTelegramLink(campaignId);
      return res.json({
        ok: true,
        connected: Boolean(link?.chatId),
        chatTitle: link?.chatTitle || "",
        chatType: link?.chatType || "",
        connectedAt: link?.connectedAt || null,
      });
    }

    if (body.type === "create") {
      const current = await getTelegramLink(campaignId);
      if (current?.chatId && hashToken(text(body.manageToken)) !== current.manageTokenHash) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      }
      const bot = await ensureWebhook();
      const code = makeConnectCode();
      const manageToken = makeManageToken();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await saveConnectCode({ campaignId, code, manageToken, expiresAt });
      return res.json({
        ok: true,
        code,
        manageToken,
        expiresAt,
        connected: Boolean(current?.chatId),
        chatTitle: current?.chatTitle || "",
        botUsername: bot?.username ? `@${bot.username}` : "",
      });
    }

    if (body.type === "disconnect") {
      const result = await disconnectTelegramLink(campaignId, text(body.manageToken));
      if (!result.ok) return res.status(403).json({ ok: false, error: result.reason });
      return res.json(result);
    }

    if (body.type === "test") {
      const link = await getTelegramLink(campaignId);
      if (!link?.chatId) return res.status(404).json({ ok: false, error: "NOT_CONNECTED" });
      if (!body.manageToken) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      // Validate token without mutating by comparing through disconnect helper semantics is avoided here.
      if (hashToken(body.manageToken) !== link.manageTokenHash) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      await telegramCall("sendMessage", {
        chat_id: link.chatId,
        text: "✅ Pip2D20 connected. Dice rolls, GM loot and merchant offers can now appear here.",
      });
      return res.json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "INVALID_OPERATION" });
  } catch (error) {
    const code = String(error?.message || "SERVER_ERROR");
    console.error("telegram_connect_failure", { code });
    const status = code === "TELEGRAM_NOT_CONFIGURED" ? 503 : code === "TELEGRAM_API_FAILED" ? 502 : 500;
    return res.status(status).json({ ok: false, error: code });
  }
}
