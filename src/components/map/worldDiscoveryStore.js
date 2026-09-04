const STORAGE_KEY = "fallout_pipboy_world_discoveries_v1";
const CHANGE_EVENT = "pip-world-discoveries-changed";

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readWorldDiscoveries() {
  if (typeof window === "undefined") return {};
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function writeWorldDiscoveries(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: store }));
  } catch {
    // Discovery persistence is optional if storage is unavailable.
  }
}

function normalizeEvent(event) {
  return {
    type: String(event?.type || "poi"),
    title: String(event?.title || "Discovery"),
    detail: String(event?.detail || ""),
    status: String(event?.status || "discovered"),
    at: Number(event?.at || Date.now()),
  };
}

function mergeEvents(previous = [], incoming = []) {
  const next = [...previous];
  for (const raw of incoming || []) {
    const event = normalizeEvent(raw);
    const key = `${event.type}:${event.title}`.toLowerCase();
    const index = next.findIndex((item) => `${item.type}:${item.title}`.toLowerCase() === key);
    if (index >= 0) next[index] = { ...next[index], ...event };
    else next.push(event);
  }
  return next.slice(-80);
}

export function getWorldDiscoveryStatus(entry) {
  if (!entry) return "unknown";
  const events = Array.isArray(entry.events) ? entry.events : [];
  if (events.some((event) => ["cleared", "resolved"].includes(event.status))) return "cleared";
  if (events.length > 0) return "explored";
  return "visited";
}

export function updateWorldDiscovery(locationId, events = [], meta = {}) {
  if (!locationId) return null;
  const store = readWorldDiscoveries();
  const previous = store[locationId] || {};
  const mergedEvents = mergeEvents(previous.events || [], events);
  const next = {
    ...previous,
    locationId,
    locationName: meta.locationName || previous.locationName || null,
    worldPosition: meta.worldPosition || previous.worldPosition || null,
    firstVisitedAt: previous.firstVisitedAt || Date.now(),
    lastVisitedAt: Date.now(),
    events: mergedEvents,
  };
  next.status = getWorldDiscoveryStatus(next);
  store[locationId] = next;
  writeWorldDiscoveries(store);
  return next;
}

export function subscribeWorldDiscoveries(listener) {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener(readWorldDiscoveries());
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
