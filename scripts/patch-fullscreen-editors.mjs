import fs from "node:fs";

const replaceOnce = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`Patch anchor not found: ${label}`);
  return source.replace(before, after);
};

// Weapons editor -> fullscreen overlay
{
  const path = "src/components/weapons/WeaponsScreen.jsx";
  let src = fs.readFileSync(path, "utf8");
  src = replaceOnce(
    src,
`      {editingIndex !== null && (\n        <WeaponEditor\n          draft={weaponDraft}\n          setDraft={setWeaponDraft}\n          onSave={() => onSaveEdit(editingIndex)}\n          onCancel={onCancelEdit}\n          globalWeapons={globalWeapons} // <-- 2. Передаємо базу в твій редактор\n        />\n      )}`,
`      {editingIndex !== null && (\n        <div className="pip-editor-fullscreen" role="dialog" aria-modal="true" aria-label={t("weapons.editorTitle")}>\n          <div className="pip-editor-fullscreen__body">\n            <button\n              type="button"\n              className="pip-btn pip-editor-fullscreen__close"\n              onClick={onCancelEdit}\n              aria-label={t("common.cancel")}\n              title={t("common.cancel")}\n            >\n              ×\n            </button>\n            <WeaponEditor\n              draft={weaponDraft}\n              setDraft={setWeaponDraft}\n              onSave={() => onSaveEdit(editingIndex)}\n              onCancel={onCancelEdit}\n              globalWeapons={globalWeapons}\n            />\n          </div>\n        </div>\n      )}`,
    "weapon fullscreen editor"
  );
  fs.writeFileSync(path, src);
}

// Inventory editor -> fullscreen overlay
{
  const path = "src/components/inventory/InventoryScreen.jsx";
  let src = fs.readFileSync(path, "utf8");
  src = replaceOnce(
    src,
`      {editingIndex !== null && (\n        <InventoryEditor\n          draft={itemDraft}\n          setDraft={setItemDraft}\n          onSave={() => onSaveEdit(editingIndex)}\n          onCancel={onCancelEdit}\n          globalAmmo={globalAmmo}\n        />\n      )}`,
`      {editingIndex !== null && (\n        <div className="pip-editor-fullscreen" role="dialog" aria-modal="true" aria-label={t("inventory.itemEditor")}>\n          <div className="pip-editor-fullscreen__body">\n            <button\n              type="button"\n              className="pip-btn pip-editor-fullscreen__close"\n              onClick={onCancelEdit}\n              aria-label={t("common.cancel")}\n              title={t("common.cancel")}\n            >\n              ×\n            </button>\n            <InventoryEditor\n              draft={itemDraft}\n              setDraft={setItemDraft}\n              onSave={() => onSaveEdit(editingIndex)}\n              onCancel={onCancelEdit}\n              globalAmmo={globalAmmo}\n            />\n          </div>\n        </div>\n      )}`,
    "inventory fullscreen editor"
  );
  fs.writeFileSync(path, src);
}

// Companion: allow newly added preset to open directly in editor.
{
  const path = "src/components/companion/CompanionTab.jsx";
  let src = fs.readFileSync(path, "utf8");
  src = replaceOnce(
    src,
    `import React, { useEffect, useMemo, useState } from "react";`,
    `import React, { useEffect, useMemo, useRef, useState } from "react";`,
    "companion useRef import"
  );
  src = replaceOnce(
    src,
    `export default function CompanionTab({ onRoll = null }) {`,
    `export default function CompanionTab({ onRoll = null, startInEditMode = false }) {`,
    "companion start edit prop"
  );
  src = replaceOnce(
    src,
`  const [editingAttackId, setEditingAttackId] = useState(null);\n  const [isEditingCard, setIsEditingCard] = useState(false);`,
`  const [editingAttackId, setEditingAttackId] = useState(null);\n  const [isEditingCard, setIsEditingCard] = useState(false);\n  const initialEditorOpenedRef = useRef(false);`,
    "companion editor ref"
  );
  src = replaceOnce(
    src,
`  useEffect(() => {\n    setEditingAttackId(null);\n    setIsEditingCard(false);\n  }, [active?.id]);`,
`  useEffect(() => {\n    setEditingAttackId(null);\n    setIsEditingCard(false);\n  }, [active?.id]);\n\n  useEffect(() => {\n    if (initialEditorOpenedRef.current || !ready || !startInEditMode || !active?.id) return;\n    initialEditorOpenedRef.current = true;\n    setIsEditingCard(true);\n  }, [ready, startInEditMode, active?.id]);`,
    "companion initial fullscreen edit"
  );
  fs.writeFileSync(path, src);
}

// Companion preset picker -> fullscreen; new preset opens editor immediately.
{
  const path = "src/components/companion/CompanionPresetHub.jsx";
  let src = fs.readFileSync(path, "utf8");
  src = replaceOnce(
    src,
`  const [pickerKind, setPickerKind] = useState(null);\n  const [revision, setRevision] = useState(0);`,
`  const [pickerKind, setPickerKind] = useState(null);\n  const [revision, setRevision] = useState(0);\n  const [startEditorOnMount, setStartEditorOnMount] = useState(false);`,
    "preset start editor state"
  );
  src = replaceOnce(
    src,
`    setPickerKind(null);\n    setRevision((value) => value + 1);`,
`    setPickerKind(null);\n    setStartEditorOnMount(true);\n    setRevision((value) => value + 1);`,
    "preset open new editor"
  );
  src = replaceOnce(
    src,
`        {pickerKind ? (\n          <div className="pip-logbox companion-preset-picker">\n            <div className="companion-preset-picker-head">\n              <strong>[ {copy.choose} ]</strong>\n              <button type="button" className="pip-btn" onClick={() => setPickerKind(null)}>\n                {copy.cancel}\n              </button>\n            </div>\n            <div className="companion-preset-options">\n              {presets.map((preset) => (\n                <button\n                  key={preset.id}\n                  type="button"\n                  className="pip-btn companion-preset-option"\n                  onClick={() => addPreset(preset.id)}\n                >\n                  <strong>{preset.title}</strong>\n                  {preset.description ? <span>{preset.description}</span> : null}\n                </button>\n              ))}\n            </div>\n          </div>\n        ) : null}`,
`        {pickerKind ? (\n          <div className="pip-editor-fullscreen" role="dialog" aria-modal="true" aria-label={copy.choose}>\n            <div className="pip-editor-fullscreen__body companion-preset-fullscreen">\n              <button\n                type="button"\n                className="pip-btn pip-editor-fullscreen__close"\n                onClick={() => setPickerKind(null)}\n                aria-label={copy.cancel}\n                title={copy.cancel}\n              >\n                ×\n              </button>\n              <div className="pip-logbox companion-preset-picker">\n                <div className="companion-preset-picker-head">\n                  <strong>[ {copy.choose} ]</strong>\n                </div>\n                <div className="companion-preset-options">\n                  {presets.map((preset) => (\n                    <button\n                      key={preset.id}\n                      type="button"\n                      className="pip-btn companion-preset-option"\n                      onClick={() => addPreset(preset.id)}\n                    >\n                      <strong>{preset.title}</strong>\n                      {preset.description ? <span>{preset.description}</span> : null}\n                    </button>\n                  ))}\n                </div>\n              </div>\n            </div>\n          </div>\n        ) : null}`,
    "fullscreen companion preset picker"
  );
  src = replaceOnce(
    src,
    `<CompanionTab key={revision} onRoll={onRoll} />`,
    `<CompanionTab key={revision} onRoll={onRoll} startInEditMode={startEditorOnMount} />`,
    "pass companion start edit"
  );
  fs.writeFileSync(path, src);
}

// Shared fullscreen modal styles.
{
  const path = "src/styles/components/modal.css";
  let src = fs.readFileSync(path, "utf8");
  const marker = "/* ===== FULLSCREEN ITEM EDITORS ===== */";
  if (!src.includes(marker)) {
    src += `\n\n${marker}\n.pip-editor-fullscreen {\n  position: fixed;\n  inset: 0;\n  z-index: 10000;\n  width: 100vw;\n  height: 100dvh;\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  box-sizing: border-box;\n  padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));\n  background:\n    linear-gradient(rgba(20, 255, 0, 0.025) 1px, transparent 1px),\n    #020a04;\n  background-size: 14px 14px;\n}\n\n.pip-editor-fullscreen__body {\n  position: relative;\n  width: 100%;\n  min-height: calc(100dvh - 16px);\n  margin: 0 auto;\n  box-sizing: border-box;\n  padding-top: 48px;\n}\n\n.pip-editor-fullscreen__body > .pip-panel {\n  width: 100%;\n  min-height: calc(100dvh - 64px);\n  box-sizing: border-box;\n  margin: 0;\n}\n\n.pip-editor-fullscreen__close {\n  position: fixed;\n  top: max(10px, env(safe-area-inset-top));\n  right: max(10px, env(safe-area-inset-right));\n  z-index: 10003;\n  width: 40px;\n  min-width: 40px;\n  height: 40px;\n  padding: 0;\n  display: grid;\n  place-items: center;\n  font-size: 1.55rem;\n  line-height: 1;\n  background: #020a04;\n}\n\n.companion-preset-fullscreen {\n  display: grid;\n  align-content: start;\n}\n\n.companion-preset-fullscreen .companion-preset-picker {\n  width: min(900px, 100%);\n  margin: 0 auto;\n  box-sizing: border-box;\n}\n\n@media (max-width: 640px) {\n  .pip-editor-fullscreen {\n    padding: max(4px, env(safe-area-inset-top)) max(4px, env(safe-area-inset-right)) max(4px, env(safe-area-inset-bottom)) max(4px, env(safe-area-inset-left));\n  }\n\n  .pip-editor-fullscreen__body {\n    min-height: calc(100dvh - 8px);\n    padding-top: 44px;\n  }\n\n  .pip-editor-fullscreen__body > .pip-panel {\n    min-height: calc(100dvh - 52px);\n    border-radius: 0;\n  }\n}\n`;
    fs.writeFileSync(path, src);
  }
}

// Companion editing card itself becomes fullscreen.
{
  const path = "src/components/companion/companion.css";
  let src = fs.readFileSync(path, "utf8");
  const marker = "/* ===== FULLSCREEN COMPANION EDITOR ===== */";
  if (!src.includes(marker)) {
    src += `\n\n${marker}\n.companion-content.is-editing {\n  position: fixed !important;\n  inset: 0;\n  z-index: 10000;\n  width: 100vw;\n  height: 100dvh;\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  box-sizing: border-box;\n  padding: max(58px, calc(env(safe-area-inset-top) + 50px)) max(10px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));\n  background:\n    linear-gradient(rgba(20, 255, 0, 0.025) 1px, transparent 1px),\n    #020a04;\n  background-size: 14px 14px;\n}\n\n.companion-content.is-editing .companion-card-actions {\n  position: fixed !important;\n  top: max(10px, env(safe-area-inset-top)) !important;\n  right: max(10px, env(safe-area-inset-right)) !important;\n  z-index: 10003;\n}\n\n.companion-content.is-editing .companion-icon-btn:first-child {\n  width: 40px;\n  min-width: 40px;\n  height: 40px;\n}\n\n@media (max-width: 520px) {\n  .companion-content.is-editing {\n    padding-left: max(6px, env(safe-area-inset-left));\n    padding-right: max(6px, env(safe-area-inset-right));\n  }\n}\n`;
    fs.writeFileSync(path, src);
  }
}

console.log("Fullscreen editors patch applied.");
