const TELEGRAM_ENDPOINT = "/api/telegram";

export async function sendTelegramEvent(payload) {
  if (!payload || typeof payload !== "object") return false;

  try {
    const response = await fetch(TELEGRAM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!response.ok) {
      console.warn("Telegram bridge rejected event", response.status);
      return false;
    }

    const result = await response.json().catch(() => ({}));
    return Boolean(result?.ok);
  } catch (error) {
    console.warn("Telegram bridge unavailable", error);
    return false;
  }
}
