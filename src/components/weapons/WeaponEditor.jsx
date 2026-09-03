import React from "react";
import { useTranslation } from "react-i18next";
import {
  SPECIAL_KEYS,
  WEAPON_DAMAGE_TYPES,
  WEAPON_RANGE_OPTIONS,
  WEAPON_SKILLS,
  WEAPON_EFFECT_OPTIONS,
  WEAPON_QUALITY_OPTIONS,
  SKILL_LABEL_KEYS,
  WEAPON_AMMO_OPTIONS, // Наш список набоїв
} from "../../constants.js";
import { getWeaponModGroups, MOD_SLOT_LABELS } from "../../data/weaponMods.js";

export default function WeaponEditor({ draft, setDraft, onSave, onCancel, globalWeapons }) {
  const { t } = useTranslation();
  const availableModGroups = getWeaponModGroups(draft);
  const availableModSlots = Object.entries(availableModGroups);

  const toggleQuality = (value) => {
    const current = Array.isArray(draft.qualities) ? draft.qualities : [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    setDraft({ ...draft, qualities: next });
  };

  const toggleEffect = (value) => {
    const current = Array.isArray(draft.effects) ? draft.effects : [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    setDraft({ ...draft, effects: next });
  };

  const renderSkillLabel = (skill) => {
    const key = SKILL_LABEL_KEYS?.[skill];
    return key ? t(key) : skill;
  };

  // Оновлення конкретного слота модифікації
  const handleModChange = (slot, value) => {
    setDraft((prev) => ({
      ...prev,
      mods: {
        ...(prev.mods || {}),
        [slot]: value,
      },
    }));
  };

  // --- ФУНКЦІЇ АВТОЗАПОВНЕННЯ З CSV ---
  const normalizeKey = (str) => {
    if (!str) return "";
    return String(str).toLowerCase().trim().replace(/[\s-]/g, '_');
  };

  const parseTags = (str) => {
    if (!str || typeof str !== 'string') return [];
    return str.split(',').map(s => normalizeKey(s)).filter(Boolean);
  };

  const mapSkill = (csvSkill) => {
    const s = normalizeKey(csvSkill);
    if (s.includes('small')) return 'small_guns';
    if (s.includes('energy')) return 'energy_weapons';
    if (s.includes('big')) return 'big_guns';
    if (s.includes('melee')) return 'melee';
    if (s.includes('unarmed')) return 'unarmed';
    if (s.includes('explosive')) return 'explosives';
    if (s.includes('throw')) return 'throw';
    return s || "small_guns";
  };

  const handleLoadFromDb = (indexStr) => {
    const idx = parseInt(indexStr, 10);
    const w = globalWeapons[idx];
    if (!w) return;

    setDraft((prev) => ({
      ...prev,
      name: w.name || "",
      damage: w['Damage Rating'] || "",
      rate: w['Rate of Fire'] || "",
      ammo: w['Ammo'] || "", 
      cost: w.Cost || "",
      weight: w.Weight || "",
      rarity: w.Rarity || "",
      skill: mapSkill(w['Weapon type']),
      type: normalizeKey(w['Damage type']) || "physical",
      range: String(w['Range'] || "").trim().toUpperCase(),
      effects: parseTags(w.Effects),
      qualities: parseTags(w.Qualities),
      customEffect: w.Effects || "", 
      qualitiesCustom: w.Qualities || "",
      mods: {},
    }));
  };
  // ------------------------------------

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("weapons.editorTitle")} ]</h2>
        <span>{t("weapons.configMode")}</span>
      </div>

      {/* === ЗАВАНТАЖЕННЯ З CSV === */}
      {globalWeapons && globalWeapons.length > 0 && (
        <div style={{ marginBottom: "15px", padding: "0 10px" }}>
          <label style={{ opacity: 0.8, display: "block", marginBottom: "5px" }}>
             [ TERMINAL ARCHIVE: WEAPONS ]
          </label>
          <select
            className="pip-input"
            onChange={(e) => handleLoadFromDb(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>-- Select to autoload --</option>
            {globalWeapons.map((gw, idx) => (
              <option key={idx} value={idx}>
                {gw.name} (DMG: {gw['Damage Rating']} CD, FR: {gw['Rate of Fire']})
              </option>
            ))}
          </select>
        </div>
      )}
      {/* ========================== */}

      <div className="pip-form-grid">
        <input
          className="pip-input"
          placeholder={t("weapons.weaponName")}
          value={draft.name || ""}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />

        <select
          className="pip-input"
          value={draft.skill || ""}
          onChange={(e) => setDraft({ ...draft, skill: e.target.value })}
        >
          {WEAPON_SKILLS.map((item) => (
            <option key={item} value={item}>
              {renderSkillLabel(item)}
            </option>
          ))}
        </select>

        <select
          className="pip-input"
          value={draft.specialKey || ""}
          onChange={(e) => setDraft({ ...draft, specialKey: e.target.value })}
        >
          {SPECIAL_KEYS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          className="pip-input"
          placeholder={t("weapons.damage")}
          value={draft.damage || ""}
          onChange={(e) => setDraft({ ...draft, damage: e.target.value })}
        />

        <select
          className="pip-input"
          value={draft.type || ""}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        >
          {WEAPON_DAMAGE_TYPES.map((item) => (
            <option key={item} value={item}>
              {t(`weaponDamageTypes.${item}`, item)}
            </option>
          ))}
        </select>

        <select
          className="pip-input"
          value={draft.range || ""}
          onChange={(e) => setDraft({ ...draft, range: e.target.value })}
        >
          {WEAPON_RANGE_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {t(`weaponRanges.${item}`, item)}
            </option>
          ))}
        </select>

        <input
          className="pip-input"
          placeholder={t("weapons.rate")}
          value={draft.rate || ""}
          onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
        />

        <select
          className="pip-input"
          value={draft.ammo || ""}
          onChange={(e) => setDraft({ ...draft, ammo: e.target.value })}
        >
          <option value="" disabled>-- {t("weapons.ammo")} --</option>
          {WEAPON_AMMO_OPTIONS.map((ammoType) => (
            <option key={ammoType} value={ammoType}>
              {ammoType}
            </option>
          ))}
        </select>

        <input
          className="pip-input"
          inputMode="decimal"
          placeholder={t("weapons.cost")}
          value={draft.cost || ""}
          onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
        />

        <input
          className="pip-input"
          inputMode="decimal"
          placeholder={t("weapons.weight")}
          value={draft.weight || ""}
          onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
        />

        <input
          className="pip-input"
          inputMode="numeric"
          placeholder={t("weapons.rarity")}
          value={draft.rarity || ""}
          onChange={(e) => setDraft({ ...draft, rarity: e.target.value })}
        />
      </div>

      {/* === БЛОК МОДИФІКАЦІЙ (WORKBENCH) === */}
      <div className="push-top">
        <details className="pip-collapsible pip-collapsible--field" open>
          <summary className="pip-collapsible__summary">
            [ WORKBENCH: MODS ]
          </summary>
          <div className="pip-collapsible__body">
            {availableModSlots.length > 0 ? (
              <div className="pip-form-grid">
                {availableModSlots.map(([slot, options]) => {
                  const selectedName = draft.mods?.[slot] || "";
                  const selected = options.find((item) => item.name === selectedName);

                  return (
                    <label key={slot} className="pip-mod-field">
                      <span className="pip-mod-field__label">
                        {MOD_SLOT_LABELS[slot] || slot}
                      </span>
                      <select
                        className="pip-input"
                        value={selectedName}
                        onChange={(event) => handleModChange(slot, event.target.value)}
                      >
                        <option value="">— No modification —</option>
                        {selectedName && !selected && (
                          <option value={selectedName}>{selectedName} (custom)</option>
                        )}
                        {options.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      {selected && (
                        <span className="pip-mod-field__details">
                          {selected.effect}
                          <small>
                            Δ Weight: {selected.weight >= 0 ? "+" : ""}{selected.weight}
                            {" · "}Δ Cost: {selected.cost >= 0 ? "+" : ""}{selected.cost}
                            {selected.perks ? ` · ${selected.perks}` : ""}
                          </small>
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="pip-mod-empty">
                No modification table is available for this weapon.
              </p>
            )}
          </div>
        </details>
      </div>
      {/* ==================================== */}

      <div className="push-top">
        <details className="pip-collapsible pip-collapsible--field">
          <summary className="pip-collapsible__summary">
            {t("weapons.customQualities")}
          </summary>
          <div className="pip-collapsible__body">
            <textarea
              className="pip-textarea"
              placeholder={t("weapons.customQualities")}
              value={draft.qualitiesCustom || ""}
              onChange={(e) =>
                setDraft({ ...draft, qualitiesCustom: e.target.value })
              }
            />
          </div>
        </details>
      </div>

      <div className="push-top">
        <details className="pip-collapsible pip-collapsible--field">
          <summary className="pip-collapsible__summary">
            {t("weapons.customEffect")}
          </summary>
          <div className="pip-collapsible__body">
            <textarea
              className="pip-textarea"
              placeholder={t("weapons.customEffect")}
              value={draft.customEffect || ""}
              onChange={(e) =>
                setDraft({ ...draft, customEffect: e.target.value })
              }
            />
          </div>
        </details>
      </div>

      <div className="push-top">
        <details className="pip-collapsible" open>
          <summary className="pip-collapsible__summary">
            [ {t("weapons.qualities")} ]
          </summary>
          <div className="pip-collapsible__body">
            <div className="pip-tagrow">
              {WEAPON_QUALITY_OPTIONS.map((item) => {
                const active = (draft.qualities || []).includes(item.key);

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`pip-tag ${active ? "is-selected" : ""}`}
                    onClick={() => toggleQuality(item.key)}
                    title={t(item.descriptionKey || item.description)}
                  >
                    {t(item.nameKey || item.name)}
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      </div>

      <div className="push-top">
        <details className="pip-collapsible" open>
          <summary className="pip-collapsible__summary">
            [ {t("weapons.effects")} ]
          </summary>
          <div className="pip-collapsible__body">
            <div className="pip-tagrow">
              {WEAPON_EFFECT_OPTIONS.map((item) => {
                const active = (draft.effects || []).includes(item.key);

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`pip-tag ${active ? "is-selected" : ""}`}
                    onClick={() => toggleEffect(item.key)}
                    title={t(item.descriptionKey || item.description)}
                  >
                    {t(item.nameKey || item.name)}
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      </div>

      <div className="pip-actions-inline push-top">
        <button
          type="button"
          className="pip-btn is-primary"
          onClick={onSave}
        >
          {t("common.save")}
        </button>

        <button
          type="button"
          className="pip-btn"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </button>
      </div>
    </section>
  );
}
