export const CLOUD_CONFIG = {
  googleClientId: String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim(),
  firebaseApiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || "").trim(),
  firebaseProjectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim(),
};

export function isGoogleCloudConfigured() {
  return Boolean(CLOUD_CONFIG.googleClientId);
}

export function isFirebaseCloudConfigured() {
  return Boolean(CLOUD_CONFIG.firebaseApiKey && CLOUD_CONFIG.firebaseProjectId);
}

export function getCloudConfigurationState() {
  return {
    google: isGoogleCloudConfigured(),
    firebase: isFirebaseCloudConfigured(),
    ready: isGoogleCloudConfigured() && isFirebaseCloudConfigured(),
  };
}
