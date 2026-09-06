import React from "react";
import { useTranslation } from "react-i18next";
import WeaponCard from "./WeaponCard.jsx";
import WeaponEditor from "./WeaponEditor.jsx";

const COMBAT_COPY = {
  en: { combat: "COMBAT", start: "START", end: "END", turn: "TURN", nextTurn: "NEXT TURN", ap: "AP", luck: "LUCK" },
  ru: { combat: "БОЙ", start: "НАЧАТЬ", end: "ЗАВЕРШИТЬ", turn: "ХОД", nextTurn: "СЛЕД. ХОД", ap: "ОД", luck: "УДАЧА" },
  uk: { combat: "БІЙ", start: "ПОЧАТИ", end: "ЗАВЕРШИТИ", turn: "ХІД", nextTurn: "НАСТ. ХІД", ap: "ОД", luck: "УДАЧА" },
  pl: { combat: "WALKA", start: "START", end: "KONIEC", turn: "TURA", nextTurn: "NAST. TURA", ap: "PA", luck: "SZCZĘŚCIE" },
};

function getCombatLanguage(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COMBAT_COPY[code] ? code : "en";
}

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
  combatApMax,
  currentLuckPoints,
  luckMax,
  onSetCombatAp,
  onStartCombat,
  onEndCombat,
  onNextCombatTurn,
  onSpendCombatAp,
}) {
  const { t, i18n } = useTranslation();
  const combatCopy = COMBAT_COPY[getCombatLanguage(i18n.resolvedLanguage || i18n.language)];

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

        <div className="pip-panel" style={{ marginBottom: 10, padding: 8, display: "grid", gap: 7 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <strong>[ {combatCopy.combat} ]</strong>
            {!combatState?.active ? (
              <button type="button" className="pip-btn is-primary" onClick={onStartCombat}>
                {combatCopy.start}
              </button>
            ) : (
              <>
                <span className="stat-sub">{combatCopy.turn}: {combatState.turn}</span>
                <button type="button" className="pip-btn" onClick={onNextCombatTurn}>
                  {combatCopy.nextTurn}
                </button>
                <button type="button" className="pip-btn is-danger" onClick={onEndCombat}>
                  {combatCopy.end}
                </button>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{combatCopy.ap}</strong>
            <button type="button" className="pip-btn" disabled={!combatState?.active || Number(combatState?.ap || 0) <= 0} onClick={() => onSetCombatAp?.(Number(combatState?.ap || 0) - 1)}>−</button>
            <input
              className="pip-inline-input"
              style={{ width: 54 }}
              type="number"
              min="0"
              max={combatApMax}
              disabled={!combatState?.active}
              value={combatState?.ap || 0}
              onChange={(event) => onSetCombatAp?.(event.target.value)}
            />
            <button type="button" className="pip-btn" disabled={!combatState?.active || Number(combatState?.ap || 0) >= Number(combatApMax || 0)} onClick={() => onSetCombatAp?.(Number(combatState?.ap || 0) + 1)}>+</button>
            <span className="stat-sub">/ {combatApMax}</span>
            <strong style={{ marginLeft: 6 }}>{combatCopy.luck}: {currentLuckPoints} / {luckMax}</strong>
          </div>
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
              form={form}
              globalWeapons={globalWeapons}
              combatState={combatState}
              onSpendCombatAp={onSpendCombatAp}
            />
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
