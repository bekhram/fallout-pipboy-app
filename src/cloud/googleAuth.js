import { CLOUD_CONFIG, isFirebaseCloudConfigured, isGoogleCloudConfigured } from "./cloudConfig.js";

const STORAGE_KEY = "pip2d20.cloud.auth.v1";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

let gisPromise = null;

function nowMs() {
  return Date.now();
}

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (gisPromise) return gisPromise;

  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Could not load Google Identity Services."));
    document.head.appendChild(script);
  });

  return gisPromise;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Google profile request failed (${response.status}).`);
  return response.json();
}

async function exchangeGoogleForFirebase(accessToken) {
  if (!isFirebaseCloudConfigured()) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(CLOUD_CONFIG.firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `access_token=${encodeURIComponent(accessToken)}&providerId=google.com`,
        requestUri: window.location.origin,
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Firebase sign-in failed.");
  }

  return {
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    localId: payload.localId,
    expiresAt: nowMs() + Number(payload.expiresIn || 3600) * 1000,
  };
}

export function getCloudAuthSession() {
  return readStoredSession();
}

export function isCloudSignedIn() {
  const session = readStoredSession();
  return Boolean(session?.google?.accessToken && session?.user?.email);
}

export async function signInWithGoogle() {
  if (!isGoogleCloudConfigured()) {
    throw new Error("Google Cloud is not configured. Add VITE_GOOGLE_CLIENT_ID.");
  }

  await loadGoogleIdentityScript();

  const googleToken = await new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLOUD_CONFIG.googleClientId,
      scope: GOOGLE_SCOPES,
      prompt: "consent",
      callback: (response) => {
        if (response?.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(response);
      },
      error_callback: (error) => reject(new Error(error?.message || "Google sign-in failed.")),
    });
    client.requestAccessToken();
  });

  const profile = await fetchGoogleProfile(googleToken.access_token);
  const firebase = await exchangeGoogleForFirebase(googleToken.access_token);

  const session = {
    user: {
      id: firebase?.localId || profile.sub,
      googleSub: profile.sub,
      name: profile.name || profile.email,
      email: profile.email,
      picture: profile.picture || "",
    },
    google: {
      accessToken: googleToken.access_token,
      scope: googleToken.scope || GOOGLE_SCOPES,
      expiresAt: nowMs() + Number(googleToken.expires_in || 3600) * 1000,
    },
    firebase,
    signedInAt: new Date().toISOString(),
  };

  writeStoredSession(session);
  window.dispatchEvent(new CustomEvent("pip2d20:cloud-auth-changed", { detail: session }));
  return session;
}

export async function refreshFirebaseSession() {
  const session = readStoredSession();
  if (!session?.firebase?.refreshToken || !isFirebaseCloudConfigured()) return session;
  if (Number(session.firebase.expiresAt || 0) > nowMs() + 60_000) return session;

  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(CLOUD_CONFIG.firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: session.firebase.refreshToken,
      }),
    }
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "Could not refresh cloud session.");

  const next = {
    ...session,
    firebase: {
      ...session.firebase,
      idToken: payload.id_token,
      refreshToken: payload.refresh_token || session.firebase.refreshToken,
      localId: payload.user_id || session.firebase.localId,
      expiresAt: nowMs() + Number(payload.expires_in || 3600) * 1000,
    },
  };
  writeStoredSession(next);
  return next;
}

export function signOutCloud() {
  const session = readStoredSession();
  const token = session?.google?.accessToken;
  writeStoredSession(null);
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try { window.google.accounts.oauth2.revoke(token, () => {}); } catch { /* no-op */ }
  }
  window.dispatchEvent(new CustomEvent("pip2d20:cloud-auth-changed", { detail: null }));
}
