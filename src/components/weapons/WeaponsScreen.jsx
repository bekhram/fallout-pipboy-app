import React from "react";
import { useTranslation } from "react-i18next";
import WeaponCard from "./WeaponCard.jsx";
import WeaponEditor from "./WeaponEditor.jsx";
import LegendaryPropertyEditor, { LegendaryBadge } from "../shared/LegendaryPropertyEditor.jsx";

export default function WeaponsScreen({
  weapons,
  editingIndex,
  weaponDraft,
  setWeaponDraft,
  onAdd,
  onEdit,
  onCopy,
  onRemove,
  onSaveEdit,
  onCancelEdit,
  onRoll,
  form,
  globalWeapons,
  combatState,
  onSpendCombatAp,
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {t("tabs.weapons")} ]</h2>
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={onAdd}
          >
             {t("common.add")}
          </button>
        </div>

        <div className="pip-stack">
          {weapons.map((weapon, index) => (
            <div key={`${weapon.name}-${index}`}>
              <LegendaryBadge kind="weapon" item={weapon} language={i18n.resolvedLanguage} />
              <WeaponCard
                weapon={weapon}
                index={index}
                onEdit={onEdit}
                onCopy={onCopy}
                onRemove={onRemove}
                onRoll={onRoll}
                form={form}
                globalWeapons={globalWeapons}
                combatState={combatState}
                onSpendCombatAp={onSpendCombatAp}
              />
            </div>
          ))}
        </div>
      </section>

      {editingIndex !== null && (
        <div className="pip-editor-fullscreen" role="dialog" aria-modal="true" aria-label={t("weapons.editorTitle")}>
          <div className="pip-editor-fullscreen__body">
            <button
              type="button"
              className="pip-btn pip-editor-fullscreen__close"
              onClick={onCancelEdit}
              aria-label={t("common.cancel")}
              title={t("common.cancel")}
            >
              ×
            </button>
            <LegendaryPropertyEditor
              kind="weapon"
              draft={weaponDraft}
              setDraft={setWeaponDraft}
              language={i18n.resolvedLanguage}
            />
            <WeaponEditor
              draft={weaponDraft}
              setDraft={setWeaponDraft}
              onSave={() => onSaveEdit(editingIndex)}
              onCancel={onCancelEdit}
              globalWeapons={globalWeapons}
            />
          </div>
        </div>
      )}
    </div>
  );
}
