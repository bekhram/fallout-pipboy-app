import { useState } from "react";
import {
  createEmptyItem,
  createEmptyPerk,
  createEmptyWeapon,
} from "../constants.js";
import {
  normalizeNonNegative,
  normalizeWeightValue,
} from "../utils/characterMath.js";
import { hydrateWeaponMetadata } from "../utils/weaponDatabase.js";

export function useCharacterCollectionsController({ form, setForm, globalWeapons }) {
  const [editingWeaponIndex, setEditingWeaponIndex] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editingPerkIndex, setEditingPerkIndex] = useState(null);
  const [weaponDraft, setWeaponDraft] = useState(createEmptyWeapon());
  const [itemDraft, setItemDraft] = useState(createEmptyItem());
  const [perkDraft, setPerkDraft] = useState(createEmptyPerk());

  const addWeapon = () => {
    setForm((prev) => ({
      ...prev,
      weapons: [...prev.weapons, createEmptyWeapon()],
    }));
    setEditingWeaponIndex(form.weapons.length);
    setWeaponDraft(createEmptyWeapon());
  };

  const startEditWeapon = (index) => {
    setEditingWeaponIndex(index);
    setWeaponDraft(hydrateWeaponMetadata(form.weapons[index], globalWeapons));
  };

  const saveEditWeapon = (index) => {
    setForm((prev) => {
      const next = [...prev.weapons];
      next[index] = {
        ...weaponDraft,
        damage: normalizeNonNegative(weaponDraft.damage) || "",
        rate: normalizeNonNegative(weaponDraft.rate) || "",
        cost: normalizeNonNegative(weaponDraft.cost) || "",
        weight: normalizeWeightValue(weaponDraft.weight) || "",
        rarity: normalizeNonNegative(weaponDraft.rarity) || "",
      };
      return { ...prev, weapons: next };
    });
    setEditingWeaponIndex(null);
    setWeaponDraft(createEmptyWeapon());
  };

  const copyWeapon = (index) =>
    setForm((prev) => {
      const next = [...prev.weapons];
      const sourceWeapon = hydrateWeaponMetadata(prev.weapons[index], globalWeapons);
      next.splice(index + 1, 0, {
        ...sourceWeapon,
        name: `${sourceWeapon.name || "Weapon"} Copy`,
      });
      return { ...prev, weapons: next };
    });

  const removeWeapon = (index) =>
    setForm((prev) => ({
      ...prev,
      weapons: prev.weapons.filter((_, i) => i !== index),
    }));

  const addItem = (category) => {
    setForm((prev) => ({
      ...prev,
      inventoryItems: [...prev.inventoryItems, createEmptyItem(category)],
    }));
    setEditingItemIndex(form.inventoryItems.length);
    setItemDraft(createEmptyItem(category));
  };

  const startEditItem = (index) => {
    setEditingItemIndex(index);
    setItemDraft({ ...form.inventoryItems[index] });
  };

  const saveEditItem = (index) => {
    setForm((prev) => {
      const next = [...prev.inventoryItems];
      next[index] = {
        ...itemDraft,
        quantity: normalizeNonNegative(itemDraft.quantity) || "0",
        cost: normalizeNonNegative(itemDraft.cost) || "",
        weight: normalizeWeightValue(itemDraft.weight) || "",
      };
      return { ...prev, inventoryItems: next };
    });
    setEditingItemIndex(null);
    setItemDraft(createEmptyItem());
  };

  const copyItem = (index) =>
    setForm((prev) => {
      const next = [...prev.inventoryItems];
      next.splice(index + 1, 0, {
        ...prev.inventoryItems[index],
        name: `${prev.inventoryItems[index].name || "Item"} Copy`,
      });
      return { ...prev, inventoryItems: next };
    });

  const removeItem = (index) =>
    setForm((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.filter((_, i) => i !== index),
    }));

  const addPerk = () => {
    setForm((prev) => ({
      ...prev,
      perksAndTraits: [...prev.perksAndTraits, createEmptyPerk()],
    }));
    setEditingPerkIndex(form.perksAndTraits.length);
    setPerkDraft(createEmptyPerk());
  };

  const startEditPerk = (index) => {
    setEditingPerkIndex(index);
    setPerkDraft({ ...form.perksAndTraits[index] });
  };

  const saveEditPerk = (index) => {
    setForm((prev) => {
      const next = [...prev.perksAndTraits];
      next[index] = {
        ...perkDraft,
        rank: normalizeNonNegative(perkDraft.rank) || "1",
      };
      return { ...prev, perksAndTraits: next };
    });
    setEditingPerkIndex(null);
    setPerkDraft(createEmptyPerk());
  };

  const copyPerk = (index) =>
    setForm((prev) => {
      const next = [...prev.perksAndTraits];
      next.splice(index + 1, 0, {
        ...prev.perksAndTraits[index],
        name: `${prev.perksAndTraits[index].name || "Perk"} Copy`,
      });
      return { ...prev, perksAndTraits: next };
    });

  const removePerk = (index) =>
    setForm((prev) => ({
      ...prev,
      perksAndTraits: prev.perksAndTraits.filter((_, i) => i !== index),
    }));

  return {
    editingWeaponIndex,
    setEditingWeaponIndex,
    weaponDraft,
    setWeaponDraft,
    addWeapon,
    startEditWeapon,
    saveEditWeapon,
    copyWeapon,
    removeWeapon,
    editingItemIndex,
    setEditingItemIndex,
    itemDraft,
    setItemDraft,
    addItem,
    startEditItem,
    saveEditItem,
    copyItem,
    removeItem,
    editingPerkIndex,
    setEditingPerkIndex,
    perkDraft,
    setPerkDraft,
    addPerk,
    startEditPerk,
    saveEditPerk,
    copyPerk,
    removePerk,
  };
}

export default useCharacterCollectionsController;
