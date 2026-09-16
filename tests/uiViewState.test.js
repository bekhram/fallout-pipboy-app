import test from "node:test";
import assert from "node:assert/strict";
import {
  readLastUiState,
  rememberBattlemapClosed,
  rememberBattlemapOpen,
  writeLastUiState,
} from "../src/utils/uiViewState.js";

function installLocalStorage() {
  const values = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  return values;
}

test("persists and restores the battlemap view", () => {
  installLocalStorage();

  assert.equal(readLastUiState().view, "menu");
  rememberBattlemapOpen();
  assert.deepEqual(
    { screen: readLastUiState().screen, view: readLastUiState().view },
    { screen: "sheet", view: "battlemap" }
  );

  rememberBattlemapClosed();
  assert.equal(readLastUiState().view, "sheet");
});

test("rejects invalid saved navigation values", () => {
  installLocalStorage();

  writeLastUiState({ screen: "unknown", view: "broken", activeTab: "" });
  assert.deepEqual(
    {
      screen: readLastUiState().screen,
      view: readLastUiState().view,
      activeTab: readLastUiState().activeTab,
    },
    { screen: "menu", view: "menu", activeTab: "status" }
  );
});
