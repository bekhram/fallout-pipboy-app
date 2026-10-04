const TELEGRAM_PAIRED_CAMPAIGN_KEY = "pip2d20:telegram-paired-campaign";

function telegramEndpoint() {
  try {
    const native = Boolean(
      window.Capacitor?.isNativePlatform?.()
      || window.location.protocol === "capacitor:"
      || window.location.protocol === "ionic:"
    );
    return native
      ? "https://www.pip-2d20.fun/api/telegram"
      : "/api/telegram";
  } catch {
    return "/api/telegram";
  }
}

function pairedCampaignId() {
  try {
    return localStorage.getItem(TELEGRAM_PAIRED_CAMPAIGN_KEY) || "";
  } catch {
    return "";
  }
}

export async function sendTelegramEvent(payload) {
  if (!payload || typeof payload !== "object") return false;

  const nextPayload = {
    ...payload,
    campaignId: String(payload.campaignId || pairedCampaignId() || ""),
  };

  try {
    const response = await fetch(telegramEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextPayload),
      keepalive: true,
    });

    if (!response.ok) {
      console.warn("Telegram bridge rejected event", response.status);
      return false;
    }

    const result = await response.json().catch(() => ({}));
    return Boolean(result?.ok && !result?.skipped);
  } catch (error) {
    console.warn("Telegram bridge unavailable", error);
    return false;
  }
}
