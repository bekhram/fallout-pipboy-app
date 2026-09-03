import React from "react";
import { useTranslation } from "react-i18next";
import {
  POWER_ARMOR_FRAME,
  POWER_ARMOR_PLATING,
  POWER_ARMOR_SETS,
  POWER_ARMOR_SYSTEMS,
  availablePowerMods,
  calculatePowerPart,
} from "../../data/powerArmor.js";

const SLOT_DEFS = [
  { id: "Head", type: "head" },
  { id: "Torso", type: "torso" },
  { id: "Left Arm", type: "arm" },
  { id: "Right Arm", type: "arm" },
  { id: "Left Leg", type: "leg" },
  { id: "Right Leg", type: "leg" },
];

const UI = {
  en: { title: "POWER ARMOR", frame: "Armor Frame", preset: "Complete set", part: "Part", plating: "Plating", system: "System", none: "Not equipped", frameOnly: "Frame only", custom: "Mixed set", empty: "No armor piece", dr: "DR", hp: "HP", weight: "Weight", cost: "Cost", rarity: "Rarity", total: "TOTAL" },
  ru: { title: "СИЛОВАЯ БРОНЯ", frame: "Каркас брони", preset: "Готовый комплект", part: "Деталь", plating: "Покрытие", system: "Система", none: "Не надета", frameOnly: "Только каркас", custom: "Смешанный комплект", empty: "Нет детали", dr: "СОПР.", hp: "HP", weight: "Вес", cost: "Стоимость", rarity: "Редкость", total: "ИТОГО" },
  uk: { title: "СИЛОВА БРОНЯ", frame: "Каркас броні", preset: "Готовий комплект", part: "Деталь", plating: "Покриття", system: "Система", none: "Не вдягнена", frameOnly: "Лише каркас", custom: "Змішаний комплект", empty: "Немає деталі", dr: "ОПІР", hp: "HP", weight: "Вага", cost: "Вартість", rarity: "Рідкість", total: "РАЗОМ" },
  pl: { title: "PANCERZ WSPOMAGANY", frame: "Rama pancerza", preset: "Pełny zestaw", part: "Część", plating: "Pokrycie", system: "System", none: "Niezałożony", frameOnly: "Tylko rama", custom: "Zestaw mieszany", empty: "Brak części", dr: "ODP.", hp: "HP", weight: "Waga", cost: "Koszt", rarity: "Rzadkość", total: "SUMA" },
};

function byId(list, id) {
  return list.find((entry) => entry.id === id);
}

function legacySlots(state) {
  if (state.slots) return state.slots;
  const setId = POWER_ARMOR_SETS.some((set) => set.id === state.setId)
    ? state.setId
    : "";
  if (!setId) return {};
  return Object.fromEntries(
    SLOT_DEFS.map((slot) => [
      slot.id,
      {
        setId,
        platingId: state.mods?.[slot.type]?.platingId || "none",
        systemId: state.mods?.[slot.type]?.systemId || "none",
      },
    ])
  );
}

export default function PowerArmorPanel({ armor, onArmorChange }) {
  const { i18n } = useTranslation();
  const labels = UI[i18n.resolvedLanguage?.split("-")[0]] || UI.en;
  const stored = armor?._power?.loadout || { setId: "none", slots: {} };
  const slots = legacySlots(stored);
  const hasPieces = Object.values(slots).some((slot) => slot?.setId);
  const mode = stored.setId === "none" && !hasPieces
    ? "none"
    : stored.setId === "frame" && !hasPieces
    ? "frame"
    : POWER_ARMOR_SETS.some((set) => set.id === stored.setId)
    ? stored.setId
    : "mixed";
  const hasFrame = mode !== "none";

  const update = (patch) => {
    onArmorChange("_power", "loadout", { ...stored, slots, ...patch });
  };

  const choosePreset = (value) => {
    if (value === "none" || value === "frame") {
      update({ setId: value, slots: {} });
      return;
    }
    if (value === "mixed") {
      update({ setId: "mixed" });
      return;
    }
    const nextSlots = Object.fromEntries(
      SLOT_DEFS.map((slot) => [
        slot.id,
        { setId: value, platingId: "none", systemId: "none" },
      ])
    );
    update({ setId: value, slots: nextSlots });
  };

  const updateSlot = (slotId, patch) => {
    const next = {
      ...(slots[slotId] || { setId: "", platingId: "none", systemId: "none" }),
      ...patch,
    };
    if (Object.prototype.hasOwnProperty.call(patch, "setId")) {
      next.platingId = "none";
      next.systemId = "none";
    }
    update({
      setId: "mixed",
      slots: { ...slots, [slotId]: next },
    });
  };

  const rows = SLOT_DEFS.map((definition) => {
    const selected = slots[definition.id] || {};
    const set = byId(POWER_ARMOR_SETS, selected.setId);
    if (!set) return { definition, selected, set: null, stats: null, platingOptions: [], systemOptions: [] };
    const platingOptions = set.id === "raider"
      ? POWER_ARMOR_PLATING.filter((mod) => mod.id === "none")
      : availablePowerMods(POWER_ARMOR_PLATING, set.id, definition.type);
    const systemOptions = availablePowerMods(POWER_ARMOR_SYSTEMS, set.id, definition.type);
    const plating = byId(platingOptions, selected.platingId) || platingOptions[0];
    const system = byId(systemOptions, selected.systemId) || systemOptions[0];
    return {
      definition,
      selected,
      set,
      platingOptions,
      systemOptions,
      stats: calculatePowerPart(set.parts[definition.type], plating, system, definition.type),
      effect: [plating?.effect, system?.effect].filter(Boolean).join(" "),
    };
  });

  const totals = rows.reduce(
    (sum, row) => ({
      weight: sum.weight + Number(row.stats?.weight || 0),
      cost: sum.cost + Number(row.stats?.cost || 0),
      rarity: Math.max(sum.rarity, Number(row.set?.rarity || 0)),
    }),
    {
      weight: hasFrame ? POWER_ARMOR_FRAME.weight : 0,
      cost: hasFrame ? POWER_ARMOR_FRAME.cost : 0,
      rarity: hasFrame ? POWER_ARMOR_FRAME.rarity : 0,
    }
  );

  return (
    <div className="pip-power-armor">
      <div className="pip-armor-section-title">[ {labels.title} ]</div>
      <label className="pip-power-model">
        <span>{labels.preset}</span>
        <select className="pip-input" value={mode} onChange={(event) => choosePreset(event.target.value)}>
          <option value="none">{labels.none}</option>
          <option value="frame">{labels.frameOnly}</option>
          <option value="mixed">{labels.custom}</option>
          {POWER_ARMOR_SETS.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
        </select>
      </label>

      {hasFrame && (
        <div className="pip-power-frame">
          <strong>{labels.frame}</strong>
          <span>{labels.weight}: {POWER_ARMOR_FRAME.weight}</span>
          <span>{labels.cost}: {POWER_ARMOR_FRAME.cost}</span>
          <span>{labels.rarity}: {POWER_ARMOR_FRAME.rarity}</span>
        </div>
      )}

      {hasFrame && (
        <div className="pip-power-parts">
          {rows.map(({ definition, selected, set, stats, platingOptions, systemOptions, effect }) => (
            <article className="pip-power-part" key={definition.id}>
              <div className="pip-power-part-head">
                <strong>{definition.id}</strong>
                <span>{labels.dr}: {stats ? `${stats.physical}/${stats.energy}/${stats.radiation}` : "0/0/0"}</span>
                <span>{labels.hp}: {stats?.hp || 0}</span>
              </div>
              <label>
                <span>{labels.part}</span>
                <select className="pip-input" value={selected.setId || ""} onChange={(event) => updateSlot(definition.id, { setId: event.target.value })}>
                  <option value="">{labels.empty}</option>
                  {POWER_ARMOR_SETS.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              {set && (
                <>
                  <label>
                    <span>{labels.plating}</span>
                    <select className="pip-input" value={selected.platingId || "none"} disabled={set.id === "raider"} onChange={(event) => updateSlot(definition.id, { platingId: event.target.value })}>
                      {platingOptions.map((mod) => <option key={mod.id} value={mod.id}>{mod.id === "none" ? labels.empty : mod.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{labels.system}</span>
                    <select className="pip-input" value={selected.systemId || "none"} onChange={(event) => updateSlot(definition.id, { systemId: event.target.value })}>
                      {systemOptions.map((mod) => <option key={mod.id} value={mod.id}>{mod.id === "none" ? labels.empty : mod.name}</option>)}
                    </select>
                  </label>
                </>
              )}
              {effect && <p className="pip-armor-effect">{effect}</p>}
              {stats && <div className="pip-power-part-meta"><span>{labels.weight}: {stats.weight}</span><span>{labels.cost}: {stats.cost}</span></div>}
            </article>
          ))}
        </div>
      )}

      <div className="pip-armor-totals">
        <strong>[ {labels.total} ]</strong>
        <span>{labels.weight}: {totals.weight}</span>
        <span>{labels.cost}: {totals.cost}</span>
        <span>{labels.rarity}: {totals.rarity}</span>
      </div>
    </div>
  );
}
