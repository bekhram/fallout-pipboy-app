import React from "react";
import { useTranslation } from "react-i18next";
import WeaponCard from "./WeaponCard.jsx";
import WeaponEditor from "./WeaponEditor.jsx";
import { createWeaponRoll } from "../../utils/dice";

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
}) {
  const { t } = useTranslation();
  
  

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
            + {t("common.add")}
          </button>
        </div>

        <div className="pip-stack">
          {weapons.map((weapon, index) => (
            <WeaponCard
              key={`${weapon.name}-${index}`}
              weapon={weapon}
              index={index}
              onEdit={onEdit}
              onCopy={onCopy}
              onRemove={onRemove}
              onRoll={onRoll}
            />
          ))}
        </div>
      </section>

      {editingIndex !== null && (
        <WeaponEditor
          draft={weaponDraft}
          setDraft={setWeaponDraft}
          onSave={() => onSaveEdit(editingIndex)}
          onCancel={onCancelEdit}
        />
      )}
    </div>
  );
}