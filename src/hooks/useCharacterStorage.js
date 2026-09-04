import { useEffect, useMemo, useRef, useState } from "react";
import { ORIGINS, TRAITS_DICTIONARY } from "../components/data/origins.js";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { parseCSV } from "../utils/csvParser.js";
import { parseArmorDatabase } from "../utils/armorDatabase.js";

const STORAGE_KEY = "fallout_pipboy_v4_last_character";

function makeSafeFileName(name) {
  return (name || "Character")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Character";
}

function weaponSignature(weapon) {
  if (!weapon?.name?.trim()) return null;
  return [
    weapon.name.trim(),
    weapon.cost ?? "",
    weapon.weight ?? "",
    weapon.damage ?? "",
    weapon.ammo ?? "",
  ].join("|");
}

function createInventoryWeapon(weapon) {
  return {
    name: String(weapon?.name || "Weapon"),
    quantity: "1",
    cost: String(weapon?.cost ?? ""),
    weight: String(weapon?.weight ?? ""),
    category: "weapons",
    sourceType: "weapon",
  };
}

function createInventoryArmor(item) {
  return {
    name: String(item?.name || "Armor"),
    quantity: "1",
    cost: String(item?.cost ?? ""),
    weight: String(item?.weight ?? ""),
    category: "armor",
    sourceType: "armor",
    sourceId: item?.id || null,
  };
}

export function useCharacterStorage(initialForm) {
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      
      // Инициализируем новые поля по умолчанию, если их нет
      const baseForm = { origin: "", originTraits: [], tagged_skills: [], ...initialForm };
      
      if (!raw) return baseForm;
      
      const parsed = JSON.parse(raw);
      const loadedData = parsed?.data || {};
      
      return { ...baseForm, ...loadedData };
    } catch {
      return { origin: "", originTraits: [], tagged_skills: [], ...initialForm };
    }
  });

  const [saveStatus, setSaveStatus] = useState("");
  const [loadStatus, setLoadStatus] = useState("");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() =>
    JSON.stringify(form)
  );
  const [armorInventoryDatabase, setArmorInventoryDatabase] = useState([]);
  const previousWeaponsRef = useRef(null);
  const previousArmorSlotsRef = useRef(null);

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
    const currentWeapons = Array.isArray(form.weapons) ? form.weapons : [];
    const previousWeapons = previousWeaponsRef.current;
    previousWeaponsRef.current = currentWeapons.map((weapon) => ({ ...weapon }));

    if (!previousWeapons) return;

    const additions = [];

    if (currentWeapons.length === previousWeapons.length) {
      currentWeapons.forEach((weapon, index) => {
        const previous = previousWeapons[index];
        if (!previous?.name?.trim() && weapon?.name?.trim()) {
          additions.push(createInventoryWeapon(weapon));
        }
      });
    } else if (currentWeapons.length > previousWeapons.length) {
      const previousCounts = new Map();
      previousWeapons.forEach((weapon) => {
        const signature = weaponSignature(weapon);
        if (!signature) return;
        previousCounts.set(signature, (previousCounts.get(signature) || 0) + 1);
      });

      currentWeapons.forEach((weapon) => {
        const signature = weaponSignature(weapon);
        if (!signature) return;
        const remaining = previousCounts.get(signature) || 0;
        if (remaining > 0) {
          previousCounts.set(signature, remaining - 1);
        } else {
          additions.push(createInventoryWeapon(weapon));
        }
      });
    }

    if (!additions.length) return;
    setForm((prev) => ({
      ...prev,
      inventoryItems: [...(prev.inventoryItems || []), ...additions],
    }));
  }, [form.weapons]);

  useEffect(() => {
    if (!armorInventoryDatabase.length) return;

    const currentSlots = form.armor?._equipment?.slots || {};
    const previousSlots = previousArmorSlotsRef.current;
    previousArmorSlotsRef.current = Object.fromEntries(
      Object.entries(currentSlots).map(([part, slot]) => [part, { ...(slot || {}) }])
    );

    if (!previousSlots) return;

    const newlyEquippedIds = new Set();
    Object.entries(currentSlots).forEach(([part, slot]) => {
      const itemId = slot?.itemId;
      if (!itemId) return;
      if (previousSlots?.[part]?.itemId !== itemId) newlyEquippedIds.add(itemId);
    });

    if (!newlyEquippedIds.size) return;

    const additions = [...newlyEquippedIds]
      .map((itemId) => armorInventoryDatabase.find((item) => item.id === itemId))
      .filter(Boolean)
      .map(createInventoryArmor);

    if (!additions.length) return;
    setForm((prev) => ({
      ...prev,
      inventoryItems: [...(prev.inventoryItems || []), ...additions],
    }));
  }, [form.armor?._equipment?.slots, armorInventoryDatabase]);

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
        // Создаем или обновляем базу оружия в стейте персонажа
        equipmentDatabase: {
          ...(prev.equipmentDatabase || {}),
          weapons: parsedData,
        }
      }));
      alert(`Успешно загружено ${parsedData.length} видов оружия из CSV!`);
    };
    reader.readAsText(file);
    event.target.value = null; // Сбрасываем инпут
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

        const next = { ...fallbackFactory(), ...loaded };
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
    const fresh = factory();
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
      const next = { ...factory(), ...(parsed?.data || {}) };
      setForm(next);
      setLastSavedSnapshot(JSON.stringify(next));
      setLoadStatus("Last character loaded");
    } catch {
      setLoadStatus("Could not load last character");
    }
  };

// Принимаем третий параметр: t
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