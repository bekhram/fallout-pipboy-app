import React from "react";
import {
  canWeaponBeLegendary,
  getLegendaryArmorProperties,
  getLegendaryPropertyById,
  getLegendaryWeaponProperties,
  normalizeArmorLocation,
} from "../../data/legendaryProperties.js";

const COPY = {
  en: { title: "LEGENDARY", enabled: "Legendary item", property: "Legendary property", none: "Select property", unavailable: "This item type cannot be Legendary.", bonus: "Legendary armor: +1 Physical DR and +1 Energy DR." },
  ru: { title: "ЛЕГЕНДАРНОЕ", enabled: "Легендарный предмет", property: "Легендарное свойство", none: "Выберите свойство", unavailable: "Этот тип предмета не может быть легендарным.", bonus: "Легендарная броня: +1 к физическому и энергетическому сопротивлению." },
  uk: { title: "ЛЕГЕНДАРНЕ", enabled: "Легендарний предмет", property: "Легендарна властивість", none: "Оберіть властивість", unavailable: "Цей тип предмета не може бути легендарним.", bonus: "Легендарна броня: +1 до фізичного та енергетичного опору." },
  pl: { title: "LEGENDARNE", enabled: "Legendarny przedmiot", property: "Właściwość legendarna", none: "Wybierz właściwość", unavailable: "Ten typ przedmiotu nie może być legendarny.", bonus: "Legendarny pancerz: +1 odporności fizycznej i energetycznej." },
};

function languageCode(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

export default function LegendaryPropertyEditor({
  kind,
  draft,
  setDraft,
  language = "en",
  armorLocation = "",
  compact = false,
}) {
  const copy = COPY[languageCode(language)];
  const isArmor = kind === "armor";
  const normalizedLocation = normalizeArmorLocation(armorLocation || draft?.armorLocations || draft?.location);
  const allowed = isArmor ? Boolean(normalizedLocation) : canWeaponBeLegendary(draft);
  const options = isArmor
    ? getLegendaryArmorProperties(normalizedLocation)
    : getLegendaryWeaponProperties(draft);
  const enabled = Boolean(draft?.legendary);
  const selected = getLegendaryPropertyById(kind, draft?.legendaryProperty);

  const setEnabled = (checked) => {
    setDraft((prev) => ({
      ...prev,
      legendary: checked,
      legendaryProperty: checked ? (prev.legendaryProperty || "") : "",
    }));
  };

  return (
    <div className={compact ? "pip-legendary-editor is-compact" : "pip-legendary-editor"} style={{ marginTop: compact ? 8 : 14 }}>
      <div className="pip-armor-section-title">[ ★ {copy.title} ]</div>
      {!allowed ? (
        <p className="pip-mod-empty" style={{ margin: "6px 0" }}>{copy.unavailable}</p>
      ) : (
        <>
          <label className="pip-checkbox" style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            <span className="pip-checkbox-box" />
            <span>{copy.enabled}</span>
          </label>
          {enabled && (
            <label style={{ display: "block" }}>
              <span style={{ display: "block", opacity: 0.75, marginBottom: 4 }}>{copy.property}</span>
              <select
                className="pip-input"
                value={draft?.legendaryProperty || ""}
                onChange={(event) => setDraft((prev) => ({ ...prev, legendaryProperty: event.target.value }))}
              >
                <option value="">— {copy.none} —</option>
                {options.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
              {selected?.description ? (
                <p className="pip-armor-effect" style={{ marginTop: 8 }}>{selected.description}</p>
              ) : null}
              {isArmor ? <small style={{ display: "block", opacity: 0.7, marginTop: 6 }}>{copy.bonus}</small> : null}
            </label>
          )}
        </>
      )}
    </div>
  );
}

export function LegendaryBadge({ kind, item, language = "en" }) {
  if (!item?.legendary) return null;
  const property = getLegendaryPropertyById(kind, item.legendaryProperty);
  return (
    <div className="pip-legendary-badge" title={property?.description || ""} style={{ margin: "6px 0", fontSize: 12, fontWeight: 700 }}>
      ★ LEGENDARY{property ? ` · ${property.name}` : ""}
    </div>
  );
}
