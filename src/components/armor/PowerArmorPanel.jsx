import React from "react";
import { useTranslation } from "react-i18next";
import {
  POWER_ARMOR_FRAME,
  POWER_ARMOR_PLATING,
  POWER_ARMOR_SETS,
  POWER_ARMOR_SYSTEMS,
  POWER_PARTS,
  availablePowerMods,
  calculatePowerPart,
} from "../../data/powerArmor.js";

const UI = {
  en: { title: "POWER ARMOR", frame: "Armor Frame", model: "Model", plating: "Plating", system: "System", none: "None", dr: "DR", hp: "HP", weight: "Weight", cost: "Cost", rarity: "Rarity", total: "TOTAL" },
  ru: { title: "СИЛОВАЯ БРОНЯ", frame: "Каркас брони", model: "Модель", plating: "Покрытие", system: "Система", none: "Нет", dr: "СОПР.", hp: "HP", weight: "Вес", cost: "Стоимость", rarity: "Редкость", total: "ИТОГО" },
  uk: { title: "СИЛОВА БРОНЯ", frame: "Каркас броні", model: "Модель", plating: "Покриття", system: "Система", none: "Немає", dr: "ОПІР", hp: "HP", weight: "Вага", cost: "Вартість", rarity: "Рідкість", total: "РАЗОМ" },
  pl: { title: "PANCERZ WSPOMAGANY", frame: "Rama pancerza", model: "Model", plating: "Pokrycie", system: "System", none: "Brak", dr: "ODP.", hp: "HP", weight: "Waga", cost: "Koszt", rarity: "Rzadkość", total: "SUMA" },
};

function find(list, id) {
  return list.find((entry) => entry.id === id) || list[0];
}

export default function PowerArmorPanel({ armor, onArmorChange }) {
  const { i18n } = useTranslation();
  const labels = UI[i18n.resolvedLanguage?.split("-")[0]] || UI.en;
  const state = armor?._power?.loadout || {
    setId: "t45",
    mods: {},
  };
  const selectedSet = find(POWER_ARMOR_SETS, state.setId);

  const update = (patch) => {
    onArmorChange("_power", "loadout", { ...state, ...patch });
  };

  const updatePart = (partId, patch) => {
    update({
      mods: {
        ...(state.mods || {}),
        [partId]: {
          platingId: "none",
          systemId: "none",
          ...(state.mods?.[partId] || {}),
          ...patch,
        },
      },
    });
  };

  const rows = POWER_PARTS.map((partInfo) => {
    const base = selectedSet.parts[partInfo.id];
    const selectedMods = state.mods?.[partInfo.id] || {};
    const platingOptions =
      selectedSet.id === "raider"
        ? POWER_ARMOR_PLATING.filter((mod) => mod.id === "none")
        : availablePowerMods(POWER_ARMOR_PLATING, selectedSet.id, partInfo.id);
    const systemOptions = availablePowerMods(
      POWER_ARMOR_SYSTEMS,
      selectedSet.id,
      partInfo.id
    );
    const plating = find(platingOptions, selectedMods.platingId || "none");
    const system = find(systemOptions, selectedMods.systemId || "none");
    const stats = calculatePowerPart(base, plating, system, partInfo.id);
    return { partInfo, platingOptions, systemOptions, plating, system, stats };
  });

  const totals = rows.reduce(
    (sum, row) => ({
      weight: sum.weight + row.stats.weight * row.partInfo.count,
      cost: sum.cost + row.stats.cost * row.partInfo.count,
    }),
    { weight: POWER_ARMOR_FRAME.weight, cost: POWER_ARMOR_FRAME.cost }
  );

  return (
    <div className="pip-power-armor">
      <div className="pip-armor-section-title">[ {labels.title} ]</div>

      <div className="pip-power-frame">
        <strong>{labels.frame}</strong>
        <span>{labels.weight}: {POWER_ARMOR_FRAME.weight}</span>
        <span>{labels.cost}: {POWER_ARMOR_FRAME.cost}</span>
        <span>{labels.rarity}: {POWER_ARMOR_FRAME.rarity}</span>
      </div>

      <label className="pip-power-model">
        <span>{labels.model}</span>
        <select
          className="pip-input"
          value={selectedSet.id}
          onChange={(event) => update({ setId: event.target.value, mods: {} })}
        >
          {POWER_ARMOR_SETS.map((set) => (
            <option key={set.id} value={set.id}>{set.name}</option>
          ))}
        </select>
      </label>

      <div className="pip-power-parts">
        {rows.map(({ partInfo, platingOptions, systemOptions, plating, system, stats }) => (
          <article className="pip-power-part" key={partInfo.id}>
            <div className="pip-power-part-head">
              <strong>{partInfo.label}{partInfo.count > 1 ? ` ×${partInfo.count}` : ""}</strong>
              <span>{labels.dr}: {stats.physical}/{stats.energy}/{stats.radiation}</span>
              <span>{labels.hp}: {stats.hp}</span>
            </div>

            <label>
              <span>{labels.plating}</span>
              <select
                className="pip-input"
                value={plating.id}
                disabled={selectedSet.id === "raider"}
                onChange={(event) => updatePart(partInfo.id, { platingId: event.target.value })}
              >
                {platingOptions.map((mod) => (
                  <option key={mod.id} value={mod.id}>{mod.id === "none" ? labels.none : mod.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>{labels.system}</span>
              <select
                className="pip-input"
                value={system.id}
                onChange={(event) => updatePart(partInfo.id, { systemId: event.target.value })}
              >
                {systemOptions.map((mod) => (
                  <option key={mod.id} value={mod.id}>{mod.id === "none" ? labels.none : mod.name}</option>
                ))}
              </select>
            </label>

            {(plating.effect || system.effect) && (
              <p className="pip-armor-effect">{[plating.effect, system.effect].filter(Boolean).join(" ")}</p>
            )}

            <div className="pip-power-part-meta">
              <span>{labels.weight}: {stats.weight}</span>
              <span>{labels.cost}: {stats.cost}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="pip-armor-totals">
        <strong>[ {labels.total} ]</strong>
        <span>{labels.weight}: {totals.weight}</span>
        <span>{labels.cost}: {totals.cost}</span>
        <span>{labels.rarity}: {selectedSet.rarity}</span>
      </div>
    </div>
  );
}
