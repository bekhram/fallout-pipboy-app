import { createHash, randomBytes } from "node:crypto";
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const LINK_COLLECTION = "telegramCampaignLinks";
const CODE_COLLECTION = "telegramConnectCodes";
const DEVICE_CODE_COLLECTION = "telegramDeviceCodes";
const LINK_CACHE_TTL = 5 * 60 * 1000;
const linkCache = new Map();

export function telegramDb() {
  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
      throw new Error("SERVER_NOT_CONFIGURED");
    }
    initializeApp({
      credential: json ? cert(JSON.parse(json)) : applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    });
  }
  return getFirestore();
}

export function validCampaignId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(value);
}

export function hashToken(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

export function makeConnectCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let value = "PIP-";
  for (let index = 0; index < 6; index += 1) value += alphabet[bytes[index] % alphabet.length];
  return value;
}

export function makeManageToken() {
  return randomBytes(24).toString("hex");
}

export function telegramTokenMatches(link, manageToken) {
  const hashed = hashToken(manageToken);
  const hashes = Array.isArray(link?.manageTokenHashes) ? link.manageTokenHashes : [];
  return Boolean(
    manageToken
    && (hashed === link?.manageTokenHash || hashes.includes(hashed))
  );
}

export function makeDeviceCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let value = "APP-";
  for (let index = 0; index < 6; index += 1) value += alphabet[bytes[index] % alphabet.length];
  return value;
}

export function webhookSecret(botToken) {
  return createHash("sha256").update(`pip2d20:${String(botToken || "")}`).digest("hex").slice(0, 48);
}

export async function saveConnectCode({ campaignId, code, manageToken, expiresAt }) {
  const db = telegramDb();
  await db.collection(CODE_COLLECTION).doc(hashToken(code)).set({
    campaignId,
    manageTokenHash: hashToken(manageToken),
    expiresAt,
    createdAt: Date.now(),
  });
}

export async function consumeConnectCode({ code, chat }) {
  const db = telegramDb();
  const codeRef = db.collection(CODE_COLLECTION).doc(hashToken(code));
  return db.runTransaction(async (tx) => {
    const codeDoc = await tx.get(codeRef);
    if (!codeDoc.exists) return { ok: false, reason: "CODE_NOT_FOUND" };
    const data = codeDoc.data();
    if (!validCampaignId(data?.campaignId) || Number(data?.expiresAt || 0) < Date.now()) {
      tx.delete(codeRef);
      return { ok: false, reason: "CODE_EXPIRED" };
    }

    const linkRef = db.collection(LINK_COLLECTION).doc(data.campaignId);
    const link = {
      campaignId: data.campaignId,
      chatId: String(chat.id),
      chatTitle: String(chat.title || chat.username || "Telegram group").slice(0, 160),
      chatType: String(chat.type || "group").slice(0, 40),
      manageTokenHash: data.manageTokenHash,
      manageTokenHashes: [data.manageTokenHash],
      connectedAt: Date.now(),
      updatedAt: Date.now(),
    };
    tx.set(linkRef, link);
    tx.delete(codeRef);
    linkCache.set(data.campaignId, { value: link, expiresAt: Date.now() + LINK_CACHE_TTL });
    return { ok: true, link };
  });
}

export async function getTelegramLink(campaignId) {
  if (!validCampaignId(campaignId)) return null;
  const cached = linkCache.get(campaignId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const doc = await telegramDb().collection(LINK_COLLECTION).doc(campaignId).get();
  const value = doc.exists ? doc.data() : null;
  // Do not cache a missing link: a Telegram webhook may connect this campaign
  // in another serverless instance a moment later.
  if (value) linkCache.set(campaignId, { value, expiresAt: Date.now() + LINK_CACHE_TTL });
  return value;
}

export async function createTelegramDeviceCode(campaignId, manageToken) {
  const link = await getTelegramLink(campaignId);
  if (!link?.chatId || !telegramTokenMatches(link, manageToken)) {
    return { ok: false, reason: "FORBIDDEN" };
  }
  const code = makeDeviceCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  await telegramDb().collection(DEVICE_CODE_COLLECTION).doc(hashToken(code)).set({
    campaignId,
    expiresAt,
    createdAt: Date.now(),
  });
  return { ok: true, code, expiresAt };
}

export async function consumeTelegramDeviceCode(code) {
  const db = telegramDb();
  const ref = db.collection(DEVICE_CODE_COLLECTION).doc(hashToken(String(code || "").toUpperCase()));
  const newToken = makeManageToken();
  return db.runTransaction(async (tx) => {
    const codeDoc = await tx.get(ref);
    if (!codeDoc.exists) return { ok: false, reason: "CODE_NOT_FOUND" };
    const data = codeDoc.data();
    if (!validCampaignId(data?.campaignId) || Number(data?.expiresAt || 0) < Date.now()) {
      tx.delete(ref);
      return { ok: false, reason: "CODE_EXPIRED" };
    }
    const linkRef = db.collection(LINK_COLLECTION).doc(data.campaignId);
    const linkDoc = await tx.get(linkRef);
    if (!linkDoc.exists) {
      tx.delete(ref);
      return { ok: false, reason: "NOT_CONNECTED" };
    }
    const link = linkDoc.data();
    const existing = Array.isArray(link?.manageTokenHashes)
      ? link.manageTokenHashes
      : (link?.manageTokenHash ? [link.manageTokenHash] : []);
    const nextHashes = [...new Set([...existing, hashToken(newToken)])].slice(-8);
    tx.update(linkRef, { manageTokenHashes: nextHashes, updatedAt: Date.now() });
    tx.delete(ref);
    const nextLink = { ...link, manageTokenHashes: nextHashes, updatedAt: Date.now() };
    linkCache.set(data.campaignId, { value: nextLink, expiresAt: Date.now() + LINK_CACHE_TTL });
    return {
      ok: true,
      campaignId: data.campaignId,
      manageToken: newToken,
      connected: true,
      chatTitle: link?.chatTitle || "",
      chatType: link?.chatType || "",
    };
  });
}

export async function disconnectTelegramLink(campaignId, manageToken) {
  const link = await getTelegramLink(campaignId);
  if (!link) return { ok: true, disconnected: false };
  if (!telegramTokenMatches(link, manageToken)) {
    return { ok: false, reason: "FORBIDDEN" };
  }
  await telegramDb().collection(LINK_COLLECTION).doc(campaignId).delete();
  linkCache.delete(campaignId);
  return { ok: true, disconnected: true };
}
