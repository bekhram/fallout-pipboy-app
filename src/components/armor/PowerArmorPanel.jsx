import React from "react";
import { useTranslation } from "react-i18next";
import {
  POWER_ARMOR_FRAME,
  POWER_ARMOR_PLATING,
  POWER_ARMOR_SETS,
  POWER_ARMOR_SYSTEMS,
  availablePowerMods,
  availablePowerUpgrades,
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
  en: { title: "POWER ARMOR", frame: "Armor Frame", preset: "Complete set", part: "Part", upgrade: "Upgrade", plating: "Plating", system: "System", none: "Not equipped", frameOnly: "Frame only", custom: "Mixed set", empty: "No armor piece", dr: "DR", hp: "HP", weight: "Weight", cost: "Cost", rarity: "Rarity", total: "TOTAL", currentHp: "Condition", repair: "Repair", intact: "Intact", damaged: "Damaged", broken: "Broken" },
  ru: { title: "СИЛОВАЯ БРОНЯ", frame: "Каркас брони", preset: "Готовый комплект", part: "Деталь", upgrade: "Улучшение", plating: "Покрытие", system: "Система", none: "Не надета", frameOnly: "Только каркас", custom: "Смешанный комплект", empty: "Нет детали", dr: "СОПР.", hp: "HP", weight: "Вес", cost: "Стоимость", rarity: "Редкость", total: "ИТОГО", currentHp: "Состояние", repair: "Ремонт", intact: "Исправна", damaged: "Повреждена", broken: "Сломана" },
  uk: { title: "СИЛОВА БРОНЯ", frame: "Каркас броні", preset: "Готовий комплект", part: "Деталь", upgrade: "Покращення", plating: "Покриття", system: "Система", none: "Не вдягнена", frameOnly: "Лише каркас", custom: "Змішаний комплект", empty: "Немає деталі", dr: "ОПІР", hp: "HP", weight: "Вага", cost: "Вартість", rarity: "Рідкість", total: "РАЗОМ", currentHp: "Стан", repair: "Ремонт", intact: "Справна", damaged: "Пошкоджена", broken: "Зламана" },
  pl: { title: "PANCERZ WSPOMAGANY", frame: "Rama pancerza", preset: "Pełny zestaw", part: "Część", upgrade: "Ulepszenie", plating: "Pokrycie", system: "System", none: "Niezałożony", frameOnly: "Tylko rama", custom: "Zestaw mieszany", empty: "Brak części", dr: "ODP.", hp: "HP", weight: "Waga", cost: "Koszt", rarity: "Rzadkość", total: "SUMA", currentHp: "Stan", repair: "Napraw", intact: "Sprawna", damaged: "Uszkodzona", broken: "Zniszczona" },
};

const POWER_NAMES = {
  ru: { raider: "Рейдерская силовая броня", t45: "Силовая броня T-45", t51: "Силовая броня T-51", t60: "Силовая броня T-60", x01: "Силовая броня X-01", titanium: "Титановое покрытие", lead: "Свинцовое покрытие", photovoltaic: "Фотовольтаическое покрытие", winterized: "Зимнее покрытие", prism: "Призматическая защита", explosive: "Взрывозащитное покрытие", emp: "ЭМИ-защита", "rad-scrubber": "Очиститель радиации", "sensor-array": "Сенсорный комплекс", "targeting-hud": "Система наведения", "internal-database": "Внутренняя база данных", "welded-rebar": "Приваренная арматура", "core-assembly": "Узел ядра", "blood-cleanser": "Очиститель крови", "emergency-protocols": "Аварийные протоколы", "motion-assist": "Сервоприводы движения", "kinetic-dynamo": "Кинетическая динамо-машина", "medic-pump": "Медицинский насос", "reactive-plates": "Реактивные пластины", "tesla-coils": "Катушки Тесла", "stealth-boy": "Стелс-бой", jetpack: "Реактивный ранец", "rusty-knuckles": "Ржавые кастеты", "hydraulic-bracers": "Гидравлические наручи", "optimized-bracers": "Оптимизированные наручи", "tesla-bracers": "Наручи Тесла", "calibrated-shocks": "Калиброванные амортизаторы", "explosive-vent": "Взрывной клапан", "overdrive-servos": "Форсированные сервоприводы" },
  uk: { raider: "Рейдерська силова броня", t45: "Силова броня T-45", t51: "Силова броня T-51", t60: "Силова броня T-60", x01: "Силова броня X-01", titanium: "Титанове покриття", lead: "Свинцеве покриття", photovoltaic: "Фотоелектричне покриття", winterized: "Зимове покриття", prism: "Призматичний захист", explosive: "Вибухозахисне покриття", emp: "ЕМІ-захист", "rad-scrubber": "Очищувач радіації", "sensor-array": "Сенсорний комплекс", "targeting-hud": "Система наведення", "internal-database": "Внутрішня база даних", "welded-rebar": "Приварена арматура", "core-assembly": "Вузол ядра", "blood-cleanser": "Очищувач крові", "emergency-protocols": "Аварійні протоколи", "motion-assist": "Сервоприводи руху", "kinetic-dynamo": "Кінетична динамо-машина", "medic-pump": "Медичний насос", "reactive-plates": "Реактивні пластини", "tesla-coils": "Котушки Тесли", "stealth-boy": "Стелс-бой", jetpack: "Реактивний ранець", "rusty-knuckles": "Іржаві кастети", "hydraulic-bracers": "Гідравлічні наручі", "optimized-bracers": "Оптимізовані наручі", "tesla-bracers": "Наручі Тесли", "calibrated-shocks": "Калібровані амортизатори", "explosive-vent": "Вибуховий клапан", "overdrive-servos": "Форсовані сервоприводи" },
  pl: { raider: "Pancerz wspomagany bandytów", t45: "Pancerz wspomagany T-45", t51: "Pancerz wspomagany T-51", t60: "Pancerz wspomagany T-60", x01: "Pancerz wspomagany X-01", titanium: "Powłoka tytanowa", lead: "Powłoka ołowiana", photovoltaic: "Powłoka fotowoltaiczna", winterized: "Powłoka zimowa", prism: "Osłona pryzmatyczna", explosive: "Osłona przeciwwybuchowa", emp: "Osłona EMP", "rad-scrubber": "Oczyszczacz radiacyjny", "sensor-array": "Zespół czujników", "targeting-hud": "System celowniczy HUD", "internal-database": "Wewnętrzna baza danych", "welded-rebar": "Spawane pręty", "core-assembly": "Zespół rdzenia", "blood-cleanser": "Oczyszczacz krwi", "emergency-protocols": "Protokoły awaryjne", "motion-assist": "Serwomechanizmy ruchu", "kinetic-dynamo": "Dynamo kinetyczne", "medic-pump": "Pompa medyczna", "reactive-plates": "Płyty reaktywne", "tesla-coils": "Cewki Tesli", "stealth-boy": "Stealth Boy", jetpack: "Plecak odrzutowy", "rusty-knuckles": "Rdzawe kastety", "hydraulic-bracers": "Hydrauliczne karwasze", "optimized-bracers": "Zoptymalizowane karwasze", "tesla-bracers": "Karwasze Tesli", "calibrated-shocks": "Kalibrowane amortyzatory", "explosive-vent": "Zawór wybuchowy", "overdrive-servos": "Serwomechanizmy nadbiegu" },
};

const POWER_PART_NAMES = {
  en: { head: "Helmet", torso: "Chest piece", arm: "Arm", leg: "Leg" },
  ru: { head: "Шлем", torso: "Нагрудник", arm: "Рука", leg: "Нога" },
  uk: { head: "Шолом", torso: "Нагрудник", arm: "Рука", leg: "Нога" },
  pl: { head: "Hełm", torso: "Napierśnik", arm: "Ramię", leg: "Noga" },
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
  const language = i18n.resolvedLanguage?.split("-")[0] || "en";
  const labels = UI[language] || UI.en;
  const localizedName = (entry) => POWER_NAMES[language]?.[entry?.id] || entry?.name || "";
  const localizedUpgrade = (entry) => {
    if (!entry || language === "en") return entry?.name || "";
    const set = POWER_ARMOR_SETS.find((item) => item.id === entry.setId);
    return `${localizedName(set)} ${entry.tier} — ${POWER_PART_NAMES[language]?.[entry.type] || entry.type}`;
  };
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
        { setId: value, upgradeId: "none", platingId: "none", systemId: "none" },
      ])
    );
    update({ setId: value, slots: nextSlots });
  };

  const updateSlot = (slotId, patch) => {
    const next = {
      ...(slots[slotId] || { setId: "", upgradeId: "none", platingId: "none", systemId: "none" }),
      ...patch,
    };
    if (Object.prototype.hasOwnProperty.call(patch, "setId")) {
      next.upgradeId = "none";
      next.platingId = "none";
      next.systemId = "none";
      next.currentHp = null;
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, "upgradeId") ||
      Object.prototype.hasOwnProperty.call(patch, "platingId")
    ) {
      next.currentHp = null;
    }
    update({
      setId: "mixed",
      slots: { ...slots, [slotId]: next },
    });
  };

  const rows = SLOT_DEFS.map((definition) => {
    const selected = slots[definition.id] || {};
    const set = byId(POWER_ARMOR_SETS, selected.setId);
    if (!set) return { definition, selected, set: null, stats: null, upgradeOptions: [], platingOptions: [], systemOptions: [] };
    const upgradeOptions = availablePowerUpgrades(set.id, definition.type);
    const selectedUpgrade = byId(upgradeOptions, selected.upgradeId);
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
      upgradeOptions,
      stats: calculatePowerPart(set.parts[definition.type], plating, system, definition.type, selectedUpgrade),
      effect: [plating?.effect, system?.effect].filter(Boolean).join(" "),
      currentHp:
        selected.currentHp === null || selected.currentHp === undefined
          ? calculatePowerPart(set.parts[definition.type], plating, system, definition.type, selectedUpgrade).hp
          : Math.max(0, Math.min(Number(selected.currentHp || 0), calculatePowerPart(set.parts[definition.type], plating, system, definition.type, selectedUpgrade).hp)),
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
          {POWER_ARMOR_SETS.map((set) => <option key={set.id} value={set.id}>{localizedName(set)}</option>)}
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
          {rows.map(({ definition, selected, set, stats, currentHp, upgradeOptions, platingOptions, systemOptions, effect }) => (
            <article className="pip-power-part" key={definition.id}>
              <div className="pip-power-part-head">
                <strong>{definition.id}</strong>
                <span>{labels.dr}: {stats && currentHp > 0 ? `${stats.physical}/${stats.energy}/${stats.radiation}` : "0/0/0"}</span>
                <span>{labels.hp}: {stats ? `${currentHp}/${stats.hp}` : "0/0"}</span>
              </div>
              <label>
                <span>{labels.part}</span>
                <select className="pip-input" value={selected.setId || ""} onChange={(event) => updateSlot(definition.id, { setId: event.target.value })}>
                  <option value="">{labels.empty}</option>
                  {POWER_ARMOR_SETS.map((option) => <option key={option.id} value={option.id}>{localizedName(option)}</option>)}
                </select>
              </label>
              {set && (
                <>
                  <label>
                    <span>{labels.upgrade}</span>
                    <select className="pip-input" value={selected.upgradeId || "none"} onChange={(event) => updateSlot(definition.id, { upgradeId: event.target.value })}>
                      <option value="none">{labels.empty}</option>
                      {upgradeOptions.map((mod) => <option key={mod.id} value={mod.id}>{localizedUpgrade(mod)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{labels.plating}</span>
                    <select className="pip-input" value={selected.platingId || "none"} disabled={set.id === "raider"} onChange={(event) => updateSlot(definition.id, { platingId: event.target.value })}>
                      {platingOptions.map((mod) => <option key={mod.id} value={mod.id}>{mod.id === "none" ? labels.empty : localizedName(mod)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{labels.system}</span>
                    <select className="pip-input" value={selected.systemId || "none"} onChange={(event) => updateSlot(definition.id, { systemId: event.target.value })}>
                      {systemOptions.map((mod) => <option key={mod.id} value={mod.id}>{mod.id === "none" ? labels.empty : localizedName(mod)}</option>)}
                    </select>
                  </label>
                </>
              )}
              {stats && (
                <div className={`pip-power-condition ${currentHp <= 0 ? "is-broken" : currentHp < stats.hp ? "is-damaged" : "is-intact"}`}>
                  <span>{labels.currentHp}: {currentHp <= 0 ? labels.broken : currentHp < stats.hp ? labels.damaged : labels.intact}</span>
                  <div className="pip-power-hp-controls">
                    <button type="button" className="pip-btn" onClick={() => updateSlot(definition.id, { currentHp: Math.max(0, currentHp - 1) })}>−</button>
                    <input className="pip-input" inputMode="numeric" value={currentHp} onChange={(event) => updateSlot(definition.id, { currentHp: Math.max(0, Math.min(stats.hp, Number(event.target.value || 0))) })} />
                    <button type="button" className="pip-btn" onClick={() => updateSlot(definition.id, { currentHp: Math.min(stats.hp, currentHp + 1) })}>+</button>
                    <button type="button" className="pip-btn" onClick={() => updateSlot(definition.id, { currentHp: stats.hp })}>{labels.repair}</button>
                  </div>
                </div>
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
