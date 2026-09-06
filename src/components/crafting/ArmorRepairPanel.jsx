import React, { useEffect, useMemo, useState } from "react";
import { ARMOR_PARTS } from "../../constants.js";
import { buildBaseArmorRecipes } from "../../data/baseCraftingRecipes.js";
import {
  POWER_ARMOR_SETS,
  calculatePowerArmorLocations,
} from "../../data/powerArmor.js";
import {
  calculateArmorPart,
  compatibleArmorMods,
  parseArmorDatabase,
} from "../../utils/armorDatabase.js";
import { localizeArmorName } from "../../utils/armorLocalization.js";
import {
  consumeCraftingMaterials,
  getCraftingRecipeState,
} from "../../utils/craftingEngine.js";
import { rollFalloutD20 } from "../../utils/dice.js";
import "./armorRepair.css";

const FIELDS = ["physical", "energy", "radiation", "poison", "hp"];
const CURRENT_KEYS = {
  physical: "currentPhysical",
  energy: "currentEnergy",
  radiation: "currentRadiation",
  poison: "currentPoison",
  hp: "currentHp",
};

const PART_LABELS = {
  en: { Head: "Head", "Left Arm": "Left Arm", "Right Arm": "Right Arm", Torso: "Torso", "Left Leg": "Left Leg", "Right Leg": "Right Leg" },
  ru: { Head: "Голова", "Left Arm": "Левая рука", "Right Arm": "Правая рука", Torso: "Торс", "Left Leg": "Левая нога", "Right Leg": "Правая нога" },
  uk: { Head: "Голова", "Left Arm": "Ліва рука", "Right Arm": "Права рука", Torso: "Торс", "Left Leg": "Ліва нога", "Right Leg": "Права нога" },
  pl: { Head: "Głowa", "Left Arm": "Lewa ręka", "Right Arm": "Prawa ręka", Torso: "Tułów", "Left Leg": "Lewa noga", "Right Leg": "Prawa noga" },
};

const TEXT = {
  en: {
    title: "ARMOR REPAIR", hint: "Uses the same materials and complexity as crafting",
    normal: "NORMAL ARMOR", power: "POWER ARMOR", damaged: "DAMAGED", broken: "BROKEN",
    repair: "REPAIR", materials: "MATERIALS", perks: "PERKS", noDamage: "No damaged or broken armor.",
    loading: "Loading armor data…", loadError: "Armor data could not be loaded.", missingMaterials: "Missing materials",
    missingPerks: "Missing required perk rank", success: "REPAIRED", failure: "REPAIR FAILED", complications: "complications",
  },
  ru: {
    title: "РЕМОНТ БРОНИ", hint: "Материалы и сложность — как при крафте",
    normal: "ОБЫЧНАЯ БРОНЯ", power: "СИЛОВАЯ БРОНЯ", damaged: "ПОВРЕЖДЕНА", broken: "СЛОМАНА",
    repair: "ПОЧИНИТЬ", materials: "МАТЕРИАЛЫ", perks: "ПЕРКИ", noDamage: "Нет повреждённой или сломанной брони.",
    loading: "Загрузка данных брони…", loadError: "Не удалось загрузить данные брони.", missingMaterials: "Не хватает материалов",
    missingPerks: "Не хватает ранга перка", success: "БРОНЯ ПОЧИНЕНА", failure: "РЕМОНТ НЕ УДАЛСЯ", complications: "осложнений",
  },
  uk: {
    title: "РЕМОНТ БРОНІ", hint: "Матеріали та складність — як під час крафту",
    normal: "ЗВИЧАЙНА БРОНЯ", power: "СИЛОВА БРОНЯ", damaged: "ПОШКОДЖЕНА", broken: "ЗЛАМАНА",
    repair: "ПОЛАГОДИТИ", materials: "МАТЕРІАЛИ", perks: "ПЕРКИ", noDamage: "Немає пошкодженої або зламаної броні.",
    loading: "Завантаження даних броні…", loadError: "Не вдалося завантажити дані броні.", missingMaterials: "Не вистачає матеріалів",
    missingPerks: "Не вистачає рангу перка", success: "БРОНЮ ПОЛАГОДЖЕНО", failure: "РЕМОНТ НЕ ВДАВСЯ", complications: "ускладнень",
  },
  pl: {
    title: "NAPRAWA PANCERZA", hint: "Materiały i złożoność są takie jak przy wytwarzaniu",
    normal: "ZWYKŁY PANCERZ", power: "PANCERZ WSPOMAGANY", damaged: "USZKODZONY", broken: "ZNISZCZONY",
    repair: "NAPRAW", materials: "MATERIAŁY", perks: "ATUTY", noDamage: "Brak uszkodzonego lub zniszczonego pancerza.",
    loading: "Wczytywanie danych pancerza…", loadError: "Nie udało się wczytać danych pancerza.", missingMaterials: "Brak materiałów",
    missingPerks: "Brak wymaganego poziomu atutu", success: "PANCERZ NAPRAWIONY", failure: "NAPRAWA NIEUDANA", complications: "komplikacji",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return TEXT[code] ? code : "en";
}

function findById(list, id) {
  return list.find((entry) => entry.id === id);
}

function clampComplexity(rarity) {
  const numeric = Number.parseInt(String(rarity ?? "0"), 10);
  return Math.min(7, Math.max(1, (Number.isFinite(numeric) ? numeric : 0) + 1));
}

function getConditionStatus(current = {}, maximum = {}) {
  const hasArmor = FIELDS.some((field) => Number(maximum?.[field] || 0) > 0);
  if (!hasArmor) return null;

  const maxHp = Number(maximum?.hp || 0);
  const broken = maxHp > 0
    ? Number(current?.hp || 0) <= 0
    : ["physical", "energy", "radiation", "poison"].every((field) => Number(current?.[field] || 0) === 0);
  if (broken) return "broken";

  return FIELDS.some((field) => Number(current?.[field] || 0) < Number(maximum?.[field] || 0))
    ? "damaged"
    : null;
}

function stripPowerArmorCurrentOverrides(loadout) {
  return {
    ...(loadout || {}),
    slots: Object.fromEntries(
      Object.entries(loadout?.slots || {}).map(([part, slot]) => {
        const clean = { ...(slot || {}) };
        Object.values(CURRENT_KEYS).forEach((key) => delete clean[key]);
        return [part, clean];
      })
    ),
  };
}

function powerArmorSetForPart(loadout, part) {
  const slotSetId = loadout?.slots?.[part]?.setId;
  return POWER_ARMOR_SETS.find((set) => set.id === slotSetId)
    || POWER_ARMOR_SETS.find((set) => set.id === loadout?.setId)
    || null;
}

function createPowerArmorRepairRecipe(set, part) {
  return {
    id: `repair-power-armor-${set.id}-${part.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    category: "armor",
    workbench: "power_armor",
    group: "POWER ARMOR REPAIR",
    name: `${set.name} — ${part}`,
    complexity: clampComplexity(set.rarity),
    perks: "",
    skill: "Repair",
    rarity: "Common",
    itemRarity: String(set.rarity ?? "0"),
    materials: null,
    appGeneratedBaseRecipe: true,
    outputTemplate: {
      name: set.name,
      category: "armor",
      rarity: String(set.rarity ?? "0"),
      sourceType: "power_armor_repair",
    },
  };
}

function repairArmorState(armor, target) {
  const nextArmor = { ...(armor || {}) };

  if (target.kind === "normal") {
    const condition = { ...(nextArmor._condition || {}) };
    const parts = { ...(condition.parts || {}) };
    const existing = { ...(parts[target.part] || {}) };
    const current = { ...(existing.current || {}) };

    Object.keys(current).forEach((field) => {
      if (!FIELDS.includes(field)) return;
      if (Number(current[field] || 0) <= Number(target.maximum?.[field] || 0)) {
        delete current[field];
      }
    });

    if (Object.keys(current).length) {
      parts[target.part] = { ...existing, current };
    } else {
      delete parts[target.part];
    }

    nextArmor._condition = { ...condition, parts };
    return nextArmor;
  }

  const power = { ...(nextArmor._power || {}) };
  const loadout = { ...(power.loadout || {}) };
  const slots = { ...(loadout.slots || {}) };
  const selected = { ...(slots[target.part] || {}) };

  FIELDS.forEach((field) => {
    const key = CURRENT_KEYS[field];
    if (!Object.prototype.hasOwnProperty.call(selected, key)) return;
    if (Number(selected[key] || 0) <= Number(target.maximum?.[field] || 0)) {
      delete selected[key];
    }
  });

  slots[target.part] = selected;
  nextArmor._power = { ...power, loadout: { ...loadout, slots } };
  return nextArmor;
}

export default function ArmorRepairPanel({ character = null, setCharacter = null, language = "en" }) {
  const lang = languageCode(language);
  const copy = TEXT[lang];
  const partLabels = PART_LABELS[lang] || PART_LABELS.en;
  const [database, setDatabase] = useState({ items: [], mods: [] });
  const [baseRecipes, setBaseRecipes] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/Armor.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Armor archive unavailable");
        return response.text();
      })
      .then((text) => {
        if (!active) return;
        const parsed = parseArmorDatabase(text);
        setDatabase(parsed);
        setBaseRecipes(buildBaseArmorRecipes(parsed.items));
        setLoadState("ready");
      })
      .catch(() => {
        if (active) setLoadState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const repairTargets = useMemo(() => {
    if (loadState !== "ready") return [];
    const targets = [];
    const armor = character?.armor || {};
    const slots = armor?._equipment?.slots || {};
    const condition = armor?._condition?.parts || {};

    ARMOR_PARTS.forEach((part) => {
      const selected = slots[part] || {};
      const item = findById(database.items, selected.itemId);
      if (!item) return;

      const availableMods = compatibleArmorMods(database.mods, item, part);
      const material = findById(availableMods.materials, selected.materialId);
      const upgrade = findById(availableMods.upgrades, selected.upgradeId);
      const maximum = calculateArmorPart(item, material, upgrade, armor?.[part], part) || {};
      const current = { ...maximum, ...(condition?.[part]?.current || {}) };
      const status = getConditionStatus(current, maximum);
      if (!status) return;

      const recipe = baseRecipes.find((entry) => entry?.outputTemplate?.armorItemId === item.id);
      if (!recipe) return;

      targets.push({
        id: `normal-${part}`,
        kind: "normal",
        part,
        status,
        name: localizeArmorName(item.name, lang),
        maximum,
        current,
        recipe,
      });
    });

    const loadout = armor?._power?.loadout;
    if (loadout) {
      const currentPower = calculatePowerArmorLocations(loadout);
      const maximumPower = calculatePowerArmorLocations(stripPowerArmorCurrentOverrides(loadout));
      if (currentPower && maximumPower) {
        ARMOR_PARTS.forEach((part) => {
          const set = powerArmorSetForPart(loadout, part);
          if (!set || !currentPower[part] || !maximumPower[part]) return;
          const status = getConditionStatus(currentPower[part], maximumPower[part]);
          if (!status) return;
          targets.push({
            id: `power-${part}`,
            kind: "power",
            part,
            status,
            name: set.name,
            maximum: maximumPower[part],
            current: currentPower[part],
            recipe: createPowerArmorRepairRecipe(set, part),
          });
        });
      }
    }

    return targets;
  }, [baseRecipes, character?.armor, database.items, database.mods, lang, loadState]);

  const handleRepair = (target) => {
    if (!setCharacter) return;
    const state = getCraftingRecipeState(character, target.recipe);
    if (!state.hasMaterials) {
      setLastResult({ targetId: target.id, success: false, error: "materials" });
      return;
    }
    if (!state.hasPerks) {
      setLastResult({ targetId: target.id, success: false, error: "perks" });
      return;
    }

    let roll = null;
    let success = true;
    if (state.difficulty > 0) {
      roll = rollFalloutD20({
        diceCount: 2,
        targetNumber: state.skill.targetNumber,
        criticalRange: state.skill.criticalRange,
        label: `${target.name} repair`,
      });
      success = Number(roll?.totalSuccesses || 0) >= state.difficulty;
    }

    const complications = Number(roll?.complications || 0);
    if (success) {
      setCharacter((prev) => ({
        ...prev,
        armor: repairArmorState(prev?.armor, target),
        inventoryItems: consumeCraftingMaterials(prev?.inventoryItems || [], state.materials),
        craftingHistory: [
          ...(prev?.craftingHistory || []),
          {
            id: `${target.recipe.id}-repair-${Date.now()}`,
            recipeId: target.recipe.id,
            name: target.name,
            action: "repair_armor",
            armorKind: target.kind,
            armorPart: target.part,
            success: true,
            difficulty: state.difficulty,
            targetNumber: state.skill.targetNumber,
            rolls: (roll?.rolls || []).map((die) => die.value),
            complications,
            timestamp: new Date().toISOString(),
          },
        ].slice(-50),
      }));
    }

    setLastResult({
      targetId: target.id,
      success,
      state,
      roll,
      complications,
    });
  };

  const resultFor = (target) => {
    if (!lastResult || lastResult.targetId !== target.id) return null;
    if (lastResult.error) {
      const message = lastResult.error === "materials" ? copy.missingMaterials : copy.missingPerks;
      return <div className="armor-repair-result is-failure">[ {message} ]</div>;
    }
    return (
      <div className={`armor-repair-result ${lastResult.success ? "is-success" : "is-failure"}`}>
        [ {lastResult.success ? copy.success : copy.failure} ]
        {lastResult.roll ? ` // ${lastResult.roll.totalSuccesses || 0} / D${lastResult.state?.difficulty || 0} // ${lastResult.complications || 0} ${copy.complications}` : " // D0"}
      </div>
    );
  };

  return (
    <section className="pip-panel armor-repair-panel">
      <div className="armor-repair-panel__head">
        <h3>[ {copy.title} ]</h3>
        <span>{copy.hint}</span>
      </div>

      {loadState === "loading" ? <div className="armor-repair-panel__empty">{copy.loading}</div> : null}
      {loadState === "error" ? <div className="armor-repair-panel__empty">{copy.loadError}</div> : null}
      {loadState === "ready" && repairTargets.length === 0 ? <div className="armor-repair-panel__empty">{copy.noDamage}</div> : null}

      {loadState === "ready" && repairTargets.length > 0 ? (
        <div className="armor-repair-panel__list">
          {repairTargets.map((target) => {
            const state = getCraftingRecipeState(character, target.recipe);
            const canRepair = Boolean(setCharacter && state.hasMaterials && state.hasPerks);
            return (
              <article key={target.id} className={`armor-repair-card is-${target.status}`}>
                <div className="armor-repair-card__head">
                  <div className="armor-repair-card__title">
                    <small>{target.kind === "power" ? copy.power : copy.normal} // {partLabels[target.part] || target.part}</small>
                    <strong>{target.name}</strong>
                  </div>
                  <span className="armor-repair-card__status">{copy[target.status]}</span>
                </div>

                <div className="armor-repair-card__meta">
                  <span>Repair {state.skill.effectiveRank}</span>
                  <span>TN {state.skill.targetNumber}</span>
                  <span>D{state.difficulty}</span>
                  <span>C{target.recipe.complexity}</span>
                </div>

                <div className="armor-repair-card__materials">
                  {state.materialState.map((entry) => (
                    <span key={entry.name} className={entry.enough ? "is-ok" : "is-missing"}>
                      {entry.name}: {entry.available}/{entry.required}
                    </span>
                  ))}
                </div>

                {state.perkState.length ? (
                  <div className="armor-repair-card__perks">
                    {state.perkState.map((perk) => (
                      <span key={`${perk.id}-${perk.rank}`} className={perk.met ? "is-ok" : "is-missing"}>
                        {perk.label} {perk.rank}: {perk.currentRank}/{perk.rank}
                      </span>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="pip-btn is-primary armor-repair-card__button"
                  onClick={() => handleRepair(target)}
                  disabled={!canRepair}
                >
                  {copy.repair} // TN {state.skill.targetNumber} // D{state.difficulty}
                </button>

                {!state.hasMaterials ? <div className="craft-warning">{copy.missingMaterials}</div> : null}
                {!state.hasPerks ? <div className="craft-warning">{copy.missingPerks}</div> : null}
                {resultFor(target)}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
