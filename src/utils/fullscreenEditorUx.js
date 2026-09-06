import { SPECIAL_KEYS } from "../constants.js";

const EDITOR_CLASS = "pip-fullscreen-editor-target";
const BODY_CLASS = "pip-editor-open";

function optionValues(select) {
  return new Set(Array.from(select?.options || []).map((option) => option.value));
}

function isInventoryEditor(panel) {
  if (!panel) return false;

  return Array.from(panel.querySelectorAll("select")).some((select) => {
    const values = optionValues(select);
    return ["weapons", "armor", "ammo", "aid", "misc"].every((value) =>
      values.has(value)
    );
  });
}

function isWeaponEditor(panel) {
  if (!panel || !Array.isArray(SPECIAL_KEYS) || !SPECIAL_KEYS.length) return false;

  return Array.from(panel.querySelectorAll("select")).some((select) => {
    const values = optionValues(select);
    return SPECIAL_KEYS.every((value) => values.has(value));
  });
}

function findInlineEditors() {
  const targets = new Set();

  document.querySelectorAll(".pip-screen-grid").forEach((grid) => {
    const panels = Array.from(grid.children).filter((child) =>
      child.matches?.(".pip-panel.pip-block")
    );

    panels.slice(1).forEach((panel) => {
      if (isInventoryEditor(panel) || isWeaponEditor(panel)) {
        targets.add(panel);
      }
    });
  });

  document.querySelectorAll(".pip-perk-editor").forEach((editor) => {
    targets.add(editor);
  });

  return targets;
}

function applyEditorState() {
  const targets = findInlineEditors();

  document.querySelectorAll(`.${EDITOR_CLASS}`).forEach((panel) => {
    if (!targets.has(panel)) panel.classList.remove(EDITOR_CLASS);
  });

  targets.forEach((panel) => panel.classList.add(EDITOR_CLASS));

  const companionEditor = document.querySelector(
    ".companion-content.is-editing"
  );

  document.body.classList.toggle(
    BODY_CLASS,
    targets.size > 0 || Boolean(companionEditor)
  );
}

function openNewCompanionEditor(event) {
  const button = event.target.closest?.(
    ".companion-screen .companion-head > .pip-btn, .companion-screen .companion-actions > .pip-btn"
  );

  if (!button) return;

  const screen = button.closest(".companion-screen");
  if (!screen) return;

  window.setTimeout(() => {
    const content = screen.querySelector(".companion-content");
    if (!content || content.classList.contains("is-editing")) return;

    const editButton = content.querySelector(
      ".companion-card-actions .companion-icon-btn"
    );
    editButton?.click();
  }, 0);
}

function closeActiveEditor(event) {
  if (event.key !== "Escape") return;

  const companionEditor = document.querySelector(
    ".companion-content.is-editing"
  );

  if (companionEditor) {
    companionEditor
      .querySelector(".companion-card-actions .companion-icon-btn")
      ?.click();
    return;
  }

  const inlineEditor = document.querySelector(`.${EDITOR_CLASS}`);
  if (!inlineEditor) return;

  const cancelButton = inlineEditor.querySelector(
    ".pip-actions-inline .pip-btn:not(.is-primary)"
  );
  cancelButton?.click();
}

export function initFullscreenEditorUx() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }

  let frameId = 0;
  const scheduleScan = () => {
    if (frameId) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      applyEditorState();
    });
  };

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  document.addEventListener("click", openNewCompanionEditor, true);
  document.addEventListener("keydown", closeActiveEditor);
  scheduleScan();

  return () => {
    observer.disconnect();
    document.removeEventListener("click", openNewCompanionEditor, true);
    document.removeEventListener("keydown", closeActiveEditor);
    if (frameId) window.cancelAnimationFrame(frameId);
    document.body.classList.remove(BODY_CLASS);
  };
}
