import {
  consumeCloudDeviceCode,
  saveCloudDeviceCode,
} from "../server/cloudDeviceLinkStore.js";

function text(value) {
  return String(value ?? "").trim();
}

function safeSession(value) {
  if (!value || typeof value !== "object") return null;
  const accessToken = text(value?.google?.accessToken);
  const email = text(value?.user?.email);
  const expiresAt = Number(value?.google?.expiresAt || 0);
  if (!accessToken || !email || expiresAt <= Date.now()) return null;
  return {
    user: {
      id: text(value?.user?.id),
      googleSub: text(value?.user?.googleSub),
      name: text(value?.user?.name),
      email,
      picture: text(value?.user?.picture),
    },
    google: {
      accessToken,
      scope: text(value?.google?.scope),
      expiresAt,
    },
    firebase: value?.firebase && typeof value.firebase === "object" ? {
      idToken: text(value.firebase.idToken),
      refreshToken: text(value.firebase.refreshToken),
      localId: text(value.firebase.localId),
      expiresAt: Number(value.firebase.expiresAt || 0),
    } : null,
    signedInAt: text(value?.signedInAt) || new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    if (body.type === "create") {
      const session = safeSession(body.session);
      if (!session) return res.status(400).json({ ok: false, error: "INVALID_SESSION" });
      const result = await saveCloudDeviceCode(session);
      return res.json({ ok: true, ...result });
    }

    if (body.type === "consume") {
      const code = text(body.code).toUpperCase();
      if (!/^GOOG-[A-Z0-9]{6}$/.test(code)) {
        return res.status(400).json({ ok: false, error: "INVALID_CODE" });
      }
      const result = await consumeCloudDeviceCode(code);
      if (!result.ok) {
        const status = result.reason === "CODE_NOT_FOUND" || result.reason === "CODE_EXPIRED" ? 404 : 400;
        return res.status(status).json({ ok: false, error: result.reason });
      }
      return res.json(result);
    }

    return res.status(400).json({ ok: false, error: "INVALID_OPERATION" });
  } catch (error) {
    console.error("cloud_device_link_failure", { code: String(error?.message || "SERVER_ERROR") });
    return res.status(500).json({ ok: false, error: String(error?.message || "SERVER_ERROR") });
  }
}
