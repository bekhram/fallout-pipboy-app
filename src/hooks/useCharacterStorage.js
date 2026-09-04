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

const STORAGE_KEY = "fallout_pipboy_v4_last_character";

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

    return () => {
      active = false;
    };
  }, []);

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
        inventoryItems[index] = {
          ...item,
          quantity: String(Math.max(0, quantity - 1)),
        };

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

        const nextBase = {
          ...prev,
          inventoryItems,
          statuses,
          activeConsumableEffects,
          radiationHp: String(radiationHp),
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
        if (activeConsumableEffects.length === (prev.activeConsumableEffects || []).length) {
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

    window.addEventListener(PIPBOY_USE_ITEM_EVENT, handleUseItem);
    window.addEventListener(
      PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
      handleEndConsumableEffect
    );

    return () => {
      window.removeEventListener(PIPBOY_USE_ITEM_EVENT, handleUseItem);
      window.removeEventListener(
        PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
        handleEndConsumableEffect
      );
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
        }
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
    const fresh = { activeConsumableEffects: [], ...factory() };
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

  const changeOrigin = (newOriginId, traits = [], t) => {
    setForm((prev) => {
      const filteredPerks = (prev.perksAndTraits || []).filter((p) => !p.isOriginTrait);
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

      return {
        ...prev,
        origin: newOriginId,
        originTraits: traits,
        tagged_skills: [],
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