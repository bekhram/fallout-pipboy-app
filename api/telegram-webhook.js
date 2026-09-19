import { consumeConnectCode, webhookSecret } from "../server/telegramCampaignStore.js";

function text(value) {
  return String(value ?? "").trim();
}

async function sendMessage(chatId, message) {
  const token = text(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) return false;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  return response.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const botToken = text(process.env.TELEGRAM_BOT_TOKEN);
  if (!botToken) return res.status(503).json({ ok: false });

  const suppliedSecret = text(req.headers["x-telegram-bot-api-secret-token"]);
  if (suppliedSecret !== webhookSecret(botToken)) return res.status(403).json({ ok: false });

  const update = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const message = update.message;
  if (!message?.chat?.id || !message?.text) return res.json({ ok: true });

  const match = String(message.text).trim().match(/^\/connect(?:@\w+)?\s+(PIP-[A-Z0-9]{6})$/i);
  if (!match) return res.json({ ok: true });

  const chatType = String(message.chat.type || "");
  if (!["group", "supergroup"].includes(chatType)) {
    await sendMessage(message.chat.id, "Add this bot to a Telegram group and run /connect CODE there.");
    return res.json({ ok: true });
  }

  const result = await consumeConnectCode({
    code: match[1].toUpperCase(),
    chat: message.chat,
  });

  if (!result.ok) {
    await sendMessage(message.chat.id, result.reason === "CODE_EXPIRED"
      ? "❌ This Pip2D20 connection code expired. Generate a new one in the app."
      : "❌ Connection code not found. Generate a new code in Pip2D20.");
    return res.json({ ok: true });
  }

  await sendMessage(message.chat.id, `✅ Connected to Pip2D20 campaign.\nGroup: ${result.link.chatTitle}`);
  return res.json({ ok: true });
}
