const STORAGE_KEY = "pip2d20_last_ui_view_v1";

const VALID_SCREENS = new Set(["menu", "session", "sheet"]);
const VALID_VIEWS = new Set(["menu", "session", "sheet", "battlemap"]);

const DEFAULT_STATE = Object.freeze({
  screen: "menu",
  activeTab: "status",
  view: "menu",
  updatedAt: 0,
});

function storage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function readLastUiState() {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_STATE };

    const screen = VALID_SCREENS.has(parsed.screen) ? parsed.screen : DEFAULT_STATE.screen;
    const view = VALID_VIEWS.has(parsed.view) ? parsed.view : screen;
    const activeTab = typeof parsed.activeTab === "string" && parsed.activeTab.trim()
      ? parsed.activeTab
      : DEFAULT_STATE.activeTab;

    return {
      screen,
      activeTab,
      view,
      updatedAt: Math.max(0, Number(parsed.updatedAt) || 0),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeLastUiState(patch = {}) {
  const current = readLastUiState();
  const screen = VALID_SCREENS.has(patch.screen) ? patch.screen : current.screen;
  const view = VALID_VIEWS.has(patch.view) ? patch.view : current.view;
  const activeTab = typeof patch.activeTab === "string" && patch.activeTab.trim()
    ? patch.activeTab
    : current.activeTab;
  const next = { screen, activeTab, view, updatedAt: Date.now() };

  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // UI persistence is best effort; navigation must keep working without storage.
  }

  return next;
}

export function rememberBattlemapOpen() {
  return writeLastUiState({ screen: "sheet", view: "battlemap" });
}

export function rememberBattlemapClosed() {
  return writeLastUiState({ screen: "sheet", view: "sheet" });
}
