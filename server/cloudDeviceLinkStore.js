import { createHash, randomBytes } from "node:crypto";
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COLLECTION = "cloudDeviceLinkCodes";

function db() {
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

function hash(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

export function makeCloudDeviceCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let value = "GOOG-";
  for (let index = 0; index < 6; index += 1) value += alphabet[bytes[index] % alphabet.length];
  return value;
}

export async function saveCloudDeviceCode(session) {
  const code = makeCloudDeviceCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  await db().collection(COLLECTION).doc(hash(code)).set({
    session,
    expiresAt,
    createdAt: Date.now(),
  });
  return { code, expiresAt };
}

export async function consumeCloudDeviceCode(code) {
  const ref = db().collection(COLLECTION).doc(hash(String(code || "").toUpperCase()));
  return db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return { ok: false, reason: "CODE_NOT_FOUND" };
    const data = doc.data();
    if (Number(data?.expiresAt || 0) < Date.now()) {
      tx.delete(ref);
      return { ok: false, reason: "CODE_EXPIRED" };
    }
    const session = data?.session;
    if (!session?.google?.accessToken || !session?.user?.email) {
      tx.delete(ref);
      return { ok: false, reason: "INVALID_SESSION" };
    }
    tx.delete(ref);
    return { ok: true, session };
  });
}
