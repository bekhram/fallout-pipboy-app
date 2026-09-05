import { useEffect, useMemo, useState } from "react";
import { ORIGINS, TRAITS_DICTIONARY } from "../components/data/origins.js";
import { STATUS_LIST } from "../constants.js";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { parseCSV } from "../utils/csvParser.js";
import { parseArmorDatabase } from "../utils/armorDatabase.js";
import { getDerivedStats } from "../utils/characterMath.js";
import {
  getConsumableUsePlan,
  isConsumableItem,
  PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
  PIPBOY_USE_ITEM_EVENT,
} from "../utils/consumableEffects.js";
import {
  applyStartingEquipmentGrant,
  getOriginEquipmentGrant,
  getTagSkillEquipmentGrant,
  removeStartingEquipmentGrant,
} from "../data/startingEquipment.js";

const STORAGE_KEY = "fallout_pipboy_v4_last_character";
const ORIGIN_EQUIPMENT_CHOICE_EVENT = "pipboy:set-origin-equipment-choices";
const TAG_EQUIPMENT_CHOICE_EVENT = "pipboy:set-tag-equipment-choice";
const PIPBOY_SURVIVAL_TRAVEL_EVENT = "pipboy:survival-travel-hours";
const PIPBOY_CAMP_REST_EVENT = "pipboy:survival-camp-rest";
const PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT = "pipboy:travel-encounter-effect";

function makeSafeFileName(name) {
  return (name || "Character")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Character";
}

function makeInventorySourceId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function joinList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value || "").trim();
}

function createInventoryWeapon(weapon) {
  const effects = String(weapon?.customEffect || joinList(weapon?.effects)).trim();
  const qualities = String(weapon?.qualitiesCustom || joinList(weapon?.qualities)).trim();
  const effect = [
    effects,
    qualities ? `Qualities: ${qualities}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    name: String(weapon?.name || "Weapon"),
    quantity: "1",
    cost: String(weapon?.cost ?? ""),
    weight: String(weapon?.weight ?? "").replace(",", "."),
    category: "weapons",
    sourceType: "weapon",
    sourceId: weapon?.inventoryId || null,
    rarity: String(weapon?.rarity ?? ""),
    effect,
    damage: String(weapon?.damage ?? ""),
    rate: String(weapon?.rate ?? ""),
    range: String(weapon?.range ?? ""),
    damageType: String(weapon?.type ?? ""),
    weaponType: String(weapon?.skill ?? ""),
    qualities,
    ammo: String(weapon?.ammo ?? ""),
  };
}

function armorLocationsText(locations = {}) {
  return [
    locations.head && "Head",
    locations.arms && "Arms",
    locations.legs && "Legs",
    locations.torso && "Torso",
  ]
    .filter(Boolean)
    .join(", ");
}

function createInventoryArmor(item, quantity = 1) {
  return {
    name: String(item?.name || "Armor"),
    quantity: String(Math.max(1, Number(quantity) || 1)),
    cost: String(item?.cost ?? ""),
    weight: String(item?.weight ?? "").replace(",", "."),
    category: "armor",
    sourceType: "armor",
    sourceId: item?.id || null,
    rarity: String(item?.rarity ?? ""),
    effect: String(item?.effects ?? ""),
    armorPhysical: String(item?.physical ?? ""),
    armorEnergy: String(item?.energy ?? ""),
    armorRadiation: String(item?.radiation ?? ""),
    armorLocations: armorLocationsText(item?.locations),
    armorGroup: String(item?.group || item?.category || ""),
  };
}

function sameWeaponInventoryIdentity(item, desired) {
  return (
    item?.sourceType === "weapon" &&
    !item?.sourceId &&
    String(item?.name || "") === String(desired?.name || "") &&
    String(item?.cost ?? "") === String(desired?.cost ?? "") &&
    String(item?.weight ?? "") === String(desired?.weight ?? "")
  );
}

function isBodyGarment(item) {
  return item?.category === "CLOTHING" || item?.category === "OUTFIT";
}

function clearStatusGroup(statuses, group) {
  const next = { ...(statuses || {}) };
  STATUS_LIST.filter((item) => item.group === group).forEach((item) => {
    next[item.key] = false;
  });
  return next;
}

export function useCharacterStorage(initialForm) {
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      const baseForm = {
        origin: "",
        originTraits: [],
        tagged_skills: [],
        activeConsumableEffects: [],
        originEquipmentPack: "",
        startingEquipmentGrants: {},
        startingEquipmentChoices: {},
        ...initialForm,
      };

      if (!raw) return baseForm;

      const parsed = JSON.parse(raw);
      const loadedData = parsed?.data || {};

      return { ...baseForm, ...loadedData };
    } catch {
      return {
        origin: "",
        originTraits: [],
        tagged_skills: [],
        activeConsumableEffects: [],
        originEquipmentPack: "",
        startingEquipmentGrants: {},
        startingEquipmentChoices: {},
        ...initialForm,
      };
    }
  });

  const [saveStatus, setSaveStatus] = useState("");
  const [loadStatus, setLoadStatus] = useState("");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() =>
    JSON.stringify(form)
  );
  const [armorInventoryDatabase, setArmorInventoryDatabase] = useState([]);
  const [weaponInventoryDatabase, setWeaponInventoryDatabase] = useState([]);
  const [ammoInventoryDatabase, setAmmoInventoryDatabase] = useState([]);

  useEffect(() => {
    let active = true;

    fetch("/Armor.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Armor database unavailable");
        return response.text();
      })
      .then((text) => {
        if (!active) return;
        setArmorInventoryDatabase(parseArmorDatabase(text).items || []);
      })
      .catch(() => {
        if (active) setArmorInventoryDatabase([]);
      });

    fetch("/weapons.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Weapon database unavailable");
        return response.text();
      })
      .then((text) => {
        if (active) setWeaponInventoryDatabase(parseCSV(text));
      })
      .catch(() => {
        if (active) setWeaponInventoryDatabase([]);
      });

    fetch("/Ammo.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Ammo database unavailable");
        return response.text();
      })
      .then((text) => {
        if (active) setAmmoInventoryDatabase(parseCSV(text));
      })
      .catch(() => {
        if (active) setAmmoInventoryDatabase([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const starterDatabasesReady =
    armorInventoryDatabase.length > 0 &&
    weaponInventoryDatabase.length > 0 &&
    ammoInventoryDatabase.length > 0;

  useEffect(() => {
    if (!starterDatabasesReady || !form.origin || !form.originEquipmentPack) return;

    const sourceKey = `origin:${form.origin}:${form.originEquipmentPack}`;
    if (form.startingEquipmentGrants?.[sourceKey]) return;

    const choices = form.startingEquipmentChoices?.[sourceKey] || {};

    setForm((prev) => {
      if (prev.startingEquipmentGrants?.[sourceKey]) return prev;
      return applyStartingEquipmentGrant(
        prev,
        sourceKey,
        getOriginEquipmentGrant(prev.originEquipmentPack),
        {
          armor: armorInventoryDatabase,
          weapons: weaponInventoryDatabase,
          ammo: ammoInventoryDatabase,
        },
        choices
      );
    });
  }, [
    starterDatabasesReady,
    form.origin,
    form.originEquipmentPack,
    form.startingEquipmentGrants,
    form.startingEquipmentChoices,
    armorInventoryDatabase,
    weaponInventoryDatabase,
    ammoInventoryDatabase,
  ]);

  useEffect(() => {
    if (!starterDatabasesReady || !form.skills) return;

    const skillEntries = Object.entries(form.skills || {});
    const needsChange = skillEntries.some(([skillName, skill]) => {
      const sourceKey = `tag:${skillName}`;
      const hasGrant = Boolean(form.startingEquipmentGrants?.[sourceKey]);
      return Boolean(skill?.tagged) !== hasGrant;
    });

    if (!needsChange) return;

    setForm((prev) => {
      let next = prev;

      Object.entries(prev.skills || {}).forEach(([skillName, skill]) => {
        const sourceKey = `tag:${skillName}`;
        const hasGrant = Boolean(next.startingEquipmentGrants?.[sourceKey]);
        const choices = next.startingEquipmentChoices?.[sourceKey] || {};

        if (skill?.tagged && !hasGrant) {
          next = applyStartingEquipmentGrant(
            next,
            sourceKey,
            getTagSkillEquipmentGrant(skillName),
            {
              armor: armorInventoryDatabase,
              weapons: weaponInventoryDatabase,
              ammo: ammoInventoryDatabase,
            },
            choices
          );
        } else if (!skill?.tagged && hasGrant) {
          next = removeStartingEquipmentGrant(next, sourceKey);
        }
      });

      return next;
    });
  }, [
    starterDatabasesReady,
    form.skills,
    form.startingEquipmentGrants,
    form.startingEquipmentChoices,
    armorInventoryDatabase,
    weaponInventoryDatabase,
    ammoInventoryDatabase,
  ]);

  useEffect(() => {
    const databases = {
      armor: armorInventoryDatabase,
      weapons: weaponInventoryDatabase,
      ammo: ammoInventoryDatabase,
    };

    const handleOriginEquipmentChoices = (event) => {
      const originId = String(event?.detail?.originId || "").trim();
      const packId = String(event?.detail?.packId || "").trim();
      const choices = { ...(event?.detail?.choices || {}) };
      if (!originId || !packId) return;

      const sourceKey = `origin:${originId}:${packId}`;

      setForm((prev) => {
        const nextWithChoices = {
          ...prev,
          startingEquipmentChoices: {
            ...(prev.startingEquipmentChoices || {}),
            [sourceKey]: choices,
          },
        };

        if (
          !starterDatabasesReady ||
          nextWithChoices.origin !== originId ||
          nextWithChoices.originEquipmentPack !== packId
        ) {
          return nextWithChoices;
        }

        return applyStartingEquipmentGrant(
          nextWithChoices,
          sourceKey,
          getOriginEquipmentGrant(packId),
          databases,
          choices
        );
      });
    };

    const handleTagEquipmentChoice = (event) => {
      const skillName = String(event?.detail?.skillName || "").trim();
      const choiceId = String(event?.detail?.choiceId || "").trim();
      const optionIndex = Number(event?.detail?.optionIndex || 0);
      if (!skillName || !choiceId) return;

      const sourceKey = `tag:${skillName}`;

      setForm((prev) => {
        const sourceChoices = {
          ...(prev.startingEquipmentChoices?.[sourceKey] || {}),
          [choiceId]: optionIndex,
        };
        const nextWithChoices = {
          ...prev,
          startingEquipmentChoices: {
            ...(prev.startingEquipmentChoices || {}),
            [sourceKey]: sourceChoices,
          },
        };

        if (!starterDatabasesReady || !nextWithChoices.skills?.[skillName]?.tagged) {
          return nextWithChoices;
        }

        return applyStartingEquipmentGrant(
          nextWithChoices,
          sourceKey,
          getTagSkillEquipmentGrant(skillName),
          databases,
          sourceChoices
        );
      });
    };

    window.addEventListener(
      ORIGIN_EQUIPMENT_CHOICE_EVENT,
      handleOriginEquipmentChoices
    );
    window.addEventListener(TAG_EQUIPMENT_CHOICE_EVENT, handleTagEquipmentChoice);

    return () => {
      window.removeEventListener(
        ORIGIN_EQUIPMENT_CHOICE_EVENT,
        handleOriginEquipmentChoices
      );
      window.removeEventListener(TAG_EQUIPMENT_CHOICE_EVENT, handleTagEquipmentChoice);
    };
  }, [
    starterDatabasesReady,
    armorInventoryDatabase,
    weaponInventoryDatabase,
    ammoInventoryDatabase,
  ]);

  useEffect(() => {
    setForm((prev) => {
      const currentWeapons = Array.isArray(prev.weapons) ? prev.weapons : [];
      if (!currentWeapons.length) {
        const hasLinkedWeapons = (prev.inventoryItems || []).some(
          (item) => item?.sourceType === "weapon" && item?.sourceId
        );
        if (!hasLinkedWeapons) return prev;

        return {
          ...prev,
          inventoryItems: (prev.inventoryItems || []).filter(
            (item) => !(item?.sourceType === "weapon" && item?.sourceId)
          ),
        };
      }

      let weaponsChanged = false;
      const seenIds = new Set();
      const weapons = currentWeapons.map((weapon) => {
        let inventoryId = String(weapon?.inventoryId || "").trim();
        if (!inventoryId || seenIds.has(inventoryId)) {
          inventoryId = makeInventorySourceId("weapon");
          weaponsChanged = true;
        }
        seenIds.add(inventoryId);
        return inventoryId === weapon?.inventoryId
          ? weapon
          : { ...weapon, inventoryId };
      });

      const activeIds = new Set(weapons.map((weapon) => weapon.inventoryId));
      const prevItems = Array.isArray(prev.inventoryItems) ? prev.inventoryItems : [];
      let inventoryItems = prevItems.filter(
        (item) =>
          !(
            item?.sourceType === "weapon" &&
            item?.sourceId &&
            !activeIds.has(item.sourceId)
          )
      );
      let inventoryChanged = inventoryItems.length !== prevItems.length;

      weapons.forEach((weapon) => {
        if (!String(weapon?.name || "").trim()) return;

        const desired = createInventoryWeapon(weapon);
        let index = inventoryItems.findIndex(
          (item) => item?.sourceType === "weapon" && item?.sourceId === weapon.inventoryId
        );

        if (index === -1) {
          index = inventoryItems.findIndex((item) => sameWeaponInventoryIdentity(item, desired));
        }

        if (index === -1) {
          inventoryItems = [...inventoryItems, desired];
          inventoryChanged = true;
          return;
        }

        const current = inventoryItems[index];
        const next = {
          ...current,
          ...desired,
          quantity: current?.quantity || "1",
        };

        if (JSON.stringify(next) !== JSON.stringify(current)) {
          inventoryItems = [...inventoryItems];
          inventoryItems[index] = next;
          inventoryChanged = true;
        }
      });

      if (!weaponsChanged && !inventoryChanged) return prev;

      return {
        ...prev,
        weapons: weaponsChanged ? weapons : prev.weapons,
        inventoryItems,
      };
    });
  }, [form.weapons]);

  useEffect(() => {
    if (!armorInventoryDatabase.length) return;

    const slots = form.armor?._equipment?.slots || {};
    const equippedCounts = new Map();

    Object.values(slots).forEach((slot) => {
      const itemId = slot?.itemId;
      if (!itemId) return;
      const item = armorInventoryDatabase.find((entry) => entry.id === itemId);
      if (!item) return;

      if (isBodyGarment(item)) {
        equippedCounts.set(itemId, 1);
      } else {
        equippedCounts.set(itemId, (equippedCounts.get(itemId) || 0) + 1);
      }
    });

    if (!equippedCounts.size) return;

    setForm((prev) => {
      let inventoryItems = Array.isArray(prev.inventoryItems)
        ? [...prev.inventoryItems]
        : [];
      let changed = false;

      equippedCounts.forEach((equippedQuantity, itemId) => {
        const item = armorInventoryDatabase.find((entry) => entry.id === itemId);
        if (!item) return;

        const desired = createInventoryArmor(item, equippedQuantity);
        const index = inventoryItems.findIndex(
          (entry) => entry?.sourceType === "armor" && entry?.sourceId === itemId
        );

        if (index === -1) {
          inventoryItems.push(desired);
          changed = true;
          return;
        }

        const current = inventoryItems[index];
        const ownedQuantity = Math.max(
          Number(current?.quantity || 0),
          equippedQuantity
        );
        const next = {
          ...current,
          ...desired,
          quantity: String(Math.max(1, ownedQuantity)),
        };

        if (JSON.stringify(next) !== JSON.stringify(current)) {
          inventoryItems[index] = next;
          changed = true;
        }
      });

      return changed ? { ...prev, inventoryItems } : prev;
    });
  }, [form.armor?._equipment?.slots, armorInventoryDatabase]);

  useEffect(() => {
    const handleUseItem = (event) => {
      const index = Number(event?.detail?.index);
      if (!Number.isInteger(index) || index < 0) return;

      setForm((prev) => {
        const inventoryItems = Array.isArray(prev.inventoryItems)
          ? [...prev.inventoryItems]
          : [];
        const item = inventoryItems[index];
        const quantity = Number(item?.quantity || 0);
        if (!item || !isConsumableItem(item) || quantity <= 0) return prev;

        const plan = getConsumableUsePlan(item);
        if (quantity <= 1) {
          inventoryItems.splice(index, 1);
        } else {
          inventoryItems[index] = {
            ...item,
            quantity: String(quantity - 1),
          };
        }

        let statuses = { ...(prev.statuses || {}) };
        if (plan.cureAddictions) statuses = clearStatusGroup(statuses, "addiction");
        if (plan.cureDiseases) statuses = clearStatusGroup(statuses, "disease");
        if (plan.statusKey) statuses[plan.statusKey] = true;

        let activeConsumableEffects = Array.isArray(prev.activeConsumableEffects)
          ? [...prev.activeConsumableEffects]
          : [];

        if (plan.activeEffect) {
          activeConsumableEffects = activeConsumableEffects.filter(
            (effect) => effect?.id !== plan.activeEffect.id
          );
          activeConsumableEffects.push(plan.activeEffect);
        }

        const radiationHp = Math.max(
          0,
          Number(prev.radiationHp || 0) - Number(plan.healingRadiation || 0)
        );

        const category = String(item?.category || "").toLowerCase();
        const satiety = category === "food"
          ? Math.min(5, Math.max(0, Number(prev.satiety || 0)) + 1)
          : Math.max(0, Math.min(5, Number(prev.satiety || 0)));
        const thirst = category === "beverages"
          ? Math.min(5, Math.max(0, Number(prev.thirst || 0)) + 1)
          : Math.max(0, Math.min(5, Number(prev.thirst || 0)));

        const nextBase = {
          ...prev,
          inventoryItems,
          statuses,
          activeConsumableEffects,
          radiationHp: String(radiationHp),
          satiety: String(satiety),
          thirst: String(thirst),
        };

        const nextDerived = getDerivedStats(nextBase);
        const currentHp = Math.min(
          Number(nextDerived.effectiveMaxHp || 0),
          Number(prev.currentHp || 0) + Number(plan.healingHp || 0)
        );

        return {
          ...nextBase,
          currentHp: String(Math.max(0, currentHp)),
        };
      });
    };

    const handleEndConsumableEffect = (event) => {
      const effectId = String(event?.detail?.effectId || "").trim();
      if (!effectId) return;

      setForm((prev) => {
        const activeConsumableEffects = (prev.activeConsumableEffects || []).filter(
          (effect) => effect?.id !== effectId
        );
        if (
          activeConsumableEffects.length ===
          (prev.activeConsumableEffects || []).length
        ) {
          return prev;
        }

        const nextBase = { ...prev, activeConsumableEffects };
        const nextDerived = getDerivedStats(nextBase);
        return {
          ...nextBase,
          currentHp: String(
            Math.min(
              Number(prev.currentHp || 0),
              Number(nextDerived.effectiveMaxHp || 0)
            )
          ),
        };
      });
    };

    const handleSurvivalTravel = (event) => {
      const hours = Math.max(0, Number(event?.detail?.hours || 0));
      if (hours <= 0) return;

      setForm((prev) => {
        const previousRemainder = Math.max(
          0,
          Number(prev.survivalTravelHoursRemainder || 0)
        );
        const accumulatedHours = previousRemainder + hours;
        const drainSteps = Math.floor(accumulatedHours / 4);
        const remainder = accumulatedHours - drainSteps * 4;
        const satiety = Math.max(
          0,
          Math.min(5, Number(prev.satiety || 0)) - drainSteps
        );
        const thirst = Math.max(
          0,
          Math.min(5, Number(prev.thirst || 0)) - drainSteps
        );
        const vigor = Math.max(
          0,
          Math.min(5, Number(prev.vigor || 0)) - drainSteps
        );

        return {
          ...prev,
          satiety: String(satiety),
          thirst: String(thirst),
          vigor: String(vigor),
          survivalTravelHoursRemainder: String(Number(remainder.toFixed(2))),
        };
      });
    };

    const handleTravelEncounterEffect = (event) => {
      const resolution = event?.detail?.resolution;
      if (!resolution || typeof resolution !== "object") return;

      setForm((prev) => {
        if (resolution.kind === "damage") {
          const finalDamage = Math.max(0, Number(resolution.finalDamage || 0));
          if (finalDamage <= 0) return prev;

          if (resolution.damageType === "radiation") {
            const derived = getDerivedStats(prev);
            const nextRadiation = Math.min(
              Number(derived.maxHp || 0),
              Math.max(0, Number(prev.radiationHp || 0)) + finalDamage
            );
            const nextEffectiveMax = Math.max(0, Number(derived.maxHp || 0) - nextRadiation);
            return {
              ...prev,
              radiationHp: String(nextRadiation),
              currentHp: String(Math.min(Math.max(0, Number(prev.currentHp || 0)), nextEffectiveMax)),
            };
          }

          return {
            ...prev,
            currentHp: String(Math.max(0, Number(prev.currentHp || 0) - finalDamage)),
          };
        }

        if (resolution.kind === "survival") {
          const next = { ...prev };
          if (resolution.satietySet !== undefined) {
            next.satiety = String(Math.max(0, Math.min(5, Number(resolution.satietySet))));
          }
          if (resolution.thirstSet !== undefined) {
            next.thirst = String(Math.max(0, Math.min(5, Number(resolution.thirstSet))));
          }
          if (resolution.vigorDelta) {
            next.vigor = String(Math.max(0, Math.min(5, Number(prev.vigor || 0) + Number(resolution.vigorDelta))));
          }
          return next;
        }

        return prev;
      });
    };

    const handleCampRest = () => {
      setForm((prev) => ({
        ...prev,
        vigor: "5",
        satiety: String(Math.max(0, Math.min(5, Number(prev.satiety || 0)) - 2)),
        thirst: String(Math.max(0, Math.min(5, Number(prev.thirst || 0)) - 2)),
      }));
    };

    window.addEventListener(PIPBOY_USE_ITEM_EVENT, handleUseItem);
    window.addEventListener(
      PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
      handleEndConsumableEffect
    );
    window.addEventListener(PIPBOY_SURVIVAL_TRAVEL_EVENT, handleSurvivalTravel);
    window.addEventListener(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, handleTravelEncounterEffect);
    window.addEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);

    return () => {
      window.removeEventListener(PIPBOY_USE_ITEM_EVENT, handleUseItem);
      window.removeEventListener(
        PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
        handleEndConsumableEffect
      );
      window.removeEventListener(PIPBOY_SURVIVAL_TRAVEL_EVENT, handleSurvivalTravel);
      window.removeEventListener(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, handleTravelEncounterEffect);
      window.removeEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        data: form,
      })
    );
  }, [form]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== lastSavedSnapshot,
    [form, lastSavedSnapshot]
  );

  const exportJson = async () => {
    try {
      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        data: form,
      };

      const json = JSON.stringify(payload, null, 2);
      const safeName = makeSafeFileName(form.characterName);
      const fileName = `${safeName}_pipboy_v4.json`;

      if (Capacitor.getPlatform() === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setLastSavedSnapshot(JSON.stringify(form));
        setSaveStatus("Character JSON exported");
        return;
      }

      const result = await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      await Share.share({
        title: "Export character",
        text: "Fallout 2d20 character export",
        url: result.uri,
        dialogTitle: "Export character JSON",
      });

      setLastSavedSnapshot(JSON.stringify(form));
      setSaveStatus(`Character JSON exported: ${fileName}`);
    } catch (error) {
      console.error("Export failed:", error);
      setSaveStatus("Could not export character JSON");
    }
  };

  const importEquipmentCsv = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsedData = parseCSV(text);

      setForm((prev) => ({
        ...prev,
        equipmentDatabase: {
          ...(prev.equipmentDatabase || {}),
          weapons: parsedData,
        },
      }));
      alert(`Успешно загружено ${parsedData.length} видов оружия из CSV!`);
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const importJson = (event, fallbackFactory) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result || "{}");
        const loaded = parsed?.data;
        if (!loaded) throw new Error("Invalid import");

        const next = {
          activeConsumableEffects: [],
          originEquipmentPack: "",
          startingEquipmentGrants: {},
          startingEquipmentChoices: {},
          ...fallbackFactory(),
          ...loaded,
        };
        setForm(next);
        setLastSavedSnapshot(JSON.stringify(next));
        setLoadStatus("Character loaded from JSON file");
      } catch (error) {
        console.error("Import failed:", error);
        setLoadStatus("Could not import character file");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const loadLastCharacterMeta = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { updatedAt: parsed?.updatedAt, ...(parsed?.data || {}) };
    } catch {
      return null;
    }
  };

  const resetToNewCharacter = (factory) => {
    const fresh = {
      activeConsumableEffects: [],
      originEquipmentPack: "",
      startingEquipmentGrants: {},
      startingEquipmentChoices: {},
      ...factory(),
    };
    setForm(fresh);
    setLastSavedSnapshot(JSON.stringify(fresh));
    setSaveStatus("");
    setLoadStatus("");
  };

  const continueLastCharacter = (factory) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const next = {
        activeConsumableEffects: [],
        originEquipmentPack: "",
        startingEquipmentGrants: {},
        startingEquipmentChoices: {},
        ...factory(),
        ...(parsed?.data || {}),
      };
      setForm(next);
      setLastSavedSnapshot(JSON.stringify(next));
      setLoadStatus("Last character loaded");
    } catch {
      setLoadStatus("Could not load last character");
    }
  };

  const changeOrigin = (newOriginId, traits = [], selectedPack = "", t) => {
    setForm((prev) => {
      let next = prev;
      Object.keys(next.startingEquipmentGrants || {})
        .filter((key) => key.startsWith("origin:") || key.startsWith("tag:"))
        .forEach((key) => {
          next = removeStartingEquipmentGrant(next, key);
        });

      const filteredPerks = (next.perksAndTraits || []).filter(
        (p) => !p.isOriginTrait
      );
      const originData = ORIGINS[newOriginId];
      const newOriginTraits = [];

      const addTrait = (traitKey) => {
        const dictKey = TRAITS_DICTIONARY[traitKey];
        if (dictKey && t) {
          newOriginTraits.push({
            name: t(`traitsInfo.${dictKey}.name`),
            rank: "1",
            description: t(`traitsInfo.${dictKey}.desc`),
            isOriginTrait: true,
          });
        }
      };

      if (originData) {
        (originData.traits || []).forEach(addTrait);
        traits.forEach(addTrait);
      }

      const skills = Object.fromEntries(
        Object.entries(next.skills || {}).map(([skillName, skill]) => [
          skillName,
          { ...skill, tagged: false },
        ])
      );

      return {
        ...next,
        origin: newOriginId,
        originTraits: traits,
        originEquipmentPack: selectedPack || "",
        startingEquipmentChoices: {},
        tagged_skills: [],
        skills,
        perksAndTraits: [...filteredPerks, ...newOriginTraits],
      };
    });
  };

  return {
    form,
    setForm,
    saveStatus,
    loadStatus,
    exportJson,
    importJson,
    hasUnsavedChanges,
    loadLastCharacterMeta,
    resetToNewCharacter,
    continueLastCharacter,
    changeOrigin,
  };
}
