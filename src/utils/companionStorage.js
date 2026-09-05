export const COMPANION_STORAGE_KEY = "fallout_pipboy_companions_v2";

export function readCompanionState() {
  if (typeof window === "undefined") {
    return { items: [], activeId: null };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPANION_STORAGE_KEY) || "null");
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const activeId = items.some((item) => item?.id === parsed?.activeId)
      ? parsed.activeId
      : items[0]?.id || null;

    return { items, activeId };
  } catch {
    return { items: [], activeId: null };
  }
}

export function writeCompanionState(state) {
  if (typeof window === "undefined") return;

  const items = Array.isArray(state?.items) ? state.items : [];
  const activeId = items.some((item) => item?.id === state?.activeId)
    ? state.activeId
    : items[0]?.id || null;

  window.localStorage.setItem(
    COMPANION_STORAGE_KEY,
    JSON.stringify({ items, activeId })
  );
}

export function getCompanionCarryWeight() {
  const state = readCompanionState();
  const total = state.items.reduce((sum, item) => {
    const value = Number(item?.carryWeight || 0);
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);

  return Number(total.toFixed(2));
}
