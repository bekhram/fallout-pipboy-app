import React from "react";
import {
  canWeaponBeLegendary,
  getLegendaryArmorProperties,
  getLegendaryPropertyById,
  getLegendaryWeaponProperties,
  normalizeArmorLocation,
} from "../../data/legendaryProperties.js";

const COPY = {
  en: { title: "LEGENDARY PROPERTY", none: "Not legendary", unavailable: "This item type cannot be Legendary.", bonus: "Legendary armor: +1 Physical DR and +1 Energy DR." },
  ru: { title: "ЛЕГЕНДАРНОЕ СВОЙСТВО", none: "Не легендарный", unavailable: "Этот тип предмета не может быть легендарным.", bonus: "Легендарная броня: +1 к физическому и энергетическому сопротивлению." },
  uk: { title: "ЛЕГЕНДАРНА ВЛАСТИВІСТЬ", none: "Не легендарний", unavailable: "Цей тип предмета не може бути легендарним.", bonus: "Легендарна броня: +1 до фізичного та енергетичного опору." },
  pl: { title: "WŁAŚCIWOŚĆ LEGENDARNA", none: "Nielegendarny", unavailable: "Ten typ przedmiotu nie może być legendarny.", bonus: "Legendarny pancerz: +1 odporności fizycznej i energetycznej." },
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
  embedded = false,
}) {
  const copy = COPY[languageCode(language)];
  const isArmor = kind === "armor";
  const normalizedLocation = normalizeArmorLocation(armorLocation || draft?.armorLocations || draft?.location);
  const allowed = isArmor ? Boolean(normalizedLocation) : canWeaponBeLegendary(draft);
  const options = isArmor
    ? getLegendaryArmorProperties(normalizedLocation)
    : getLegendaryWeaponProperties(draft);
  const selected = getLegendaryPropertyById(kind, draft?.legendaryProperty);

  const selectProperty = (propertyId) => {
    setDraft((prev) => ({
      ...prev,
      legendary: Boolean(propertyId),
      legendaryProperty: propertyId,
    }));
  };

  return (
    <div
      className={`pip-legendary-editor${compact ? " is-compact" : ""}${embedded ? " is-embedded" : ""}`}
      style={{ marginTop: embedded ? 12 : compact ? 8 : 14, width: "100%", minWidth: 0 }}
    >
      {!embedded && <div className="pip-armor-section-title">[ ★ {copy.title} ]</div>}
      {!allowed ? (
        <p className="pip-mod-empty" style={{ margin: "6px 0" }}>{copy.unavailable}</p>
      ) : (
        <label className="pip-mod-field" style={{ display: "block", width: "100%", minWidth: 0 }}>
<span className="pip-mod-field__label">★ {copy.title}</span>
<select
  className="pip-input"
  style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
  value={draft?.legendaryProperty || ""}
  onChange={(event) => selectProperty(event.target.value)}
>
  <option value="">— {copy.none} —</option>
  {options.map((property) => (
    <option key={property.id} value={property.id}>{property.name}</option>
  ))}
</select>
{selected?.description ? (
  <span className="pip-mod-field__details" style={{ display: "block", maxWidth: "100%", overflowWrap: "anywhere" }}>
    {selected.description}
    {isArmor ? <small style={{ display: "block", marginTop: 6 }}>{copy.bonus}</small> : null}
  </span>
) : null}
        </label>
      )}
    </div>
  );
}

export function LegendaryBadge({ kind, item }) {
  if (!item?.legendary) return null;
  const property = getLegendaryPropertyById(kind, item.legendaryProperty);
  return (
    <div className="pip-legendary-badge" title={property?.description || ""} style={{ margin: "6px 0", fontSize: 12, fontWeight: 700 }}>
      ★ LEGENDARY{property ? ` · ${property.name}` : ""}
    </div>
  );
}
