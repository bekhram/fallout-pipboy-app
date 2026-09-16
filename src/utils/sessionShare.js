export function getSessionCodeFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return String(params.get("session") || params.get("join") || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function buildSessionShareUrl(code) {
  if (typeof window === "undefined") return "";
  const normalized = String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  if (!normalized) return "";
  const url = new URL(window.location.origin);
  url.searchParams.set("session", normalized);
  return url.toString();
}
