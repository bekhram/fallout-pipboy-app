import fs from 'node:fs';

const armorPath = 'src/components/armor/ArmorScreen.jsx';
let armor = fs.readFileSync(armorPath, 'utf8');
const oldSetResistance = `  const setResistance = (part, field, rawValue) => {
    if (powerArmorStats) return;
    const value = Math.max(0, Number.parseInt(rawValue, 10) || 0);
    const current = { ...(condition[part]?.current || {}), [field]: value };
    onArmorChange("_condition", "parts", {
      ...condition,
      [part]: { current },
    });
  };`;
const newSetResistance = `  const setResistance = (part, field, rawValue) => {
    const value = Math.max(0, Number.parseInt(rawValue, 10) || 0);

    if (powerArmorStats) {
      const loadout = armor?._power?.loadout || {};
      const slots = { ...(loadout.slots || {}) };
      const selected = { ...(slots[part] || {}) };
      const currentKey = field === "hp"
        ? "currentHp"
        : "current" + field.charAt(0).toUpperCase() + field.slice(1);
      slots[part] = { ...selected, [currentKey]: value };
      onArmorChange("_power", "loadout", { ...loadout, slots });
      return;
    }

    const current = { ...(condition[part]?.current || {}), [field]: value };
    onArmorChange("_condition", "parts", {
      ...condition,
      [part]: { current },
    });
  };

  const hasPowerArmorPart = (part) => {
    if (!powerArmorStats) return false;
    const loadout = armor?._power?.loadout || {};
    if (loadout?.slots?.[part]?.setId) return true;
    return Boolean(loadout.setId && loadout.setId !== "none");
  };`;
if (!armor.includes(oldSetResistance)) throw new Error('ArmorScreen setResistance block not found');
armor = armor.replace(oldSetResistance, newSetResistance);
const oldCanAdjust = '                      const canAdjust = !powerArmorStats;';
const newCanAdjust = '                      const canAdjust = !powerArmorStats || hasPowerArmorPart(part);';
if (!armor.includes(oldCanAdjust)) throw new Error('ArmorScreen canAdjust line not found');
armor = armor.replace(oldCanAdjust, newCanAdjust);
fs.writeFileSync(armorPath, armor);

const paPath = 'src/data/powerArmor.js';
let pa = fs.readFileSync(paPath, 'utf8');
const oldPowerStats = `      const currentHp =
        selected.currentHp === null || selected.currentHp === undefined
          ? stats.hp
          : Math.max(0, Math.min(Number(selected.currentHp || 0), stats.hp));
      const broken = currentHp <= 0;

      return [
        part,
        {
          physical: broken ? 0 : stats.physical,
          energy: broken ? 0 : stats.energy,
          radiation: broken ? 0 : stats.radiation,
          poison: 0,
          hp: currentHp,
        },
      ];`;
const newPowerStats = `      const currentHp =
        selected.currentHp === null || selected.currentHp === undefined
          ? stats.hp
          : Math.max(0, Number(selected.currentHp || 0));
      const currentPhysical =
        selected.currentPhysical === null || selected.currentPhysical === undefined
          ? stats.physical
          : Math.max(0, Number(selected.currentPhysical || 0));
      const currentEnergy =
        selected.currentEnergy === null || selected.currentEnergy === undefined
          ? stats.energy
          : Math.max(0, Number(selected.currentEnergy || 0));
      const currentRadiation =
        selected.currentRadiation === null || selected.currentRadiation === undefined
          ? stats.radiation
          : Math.max(0, Number(selected.currentRadiation || 0));
      const currentPoison =
        selected.currentPoison === null || selected.currentPoison === undefined
          ? 0
          : Math.max(0, Number(selected.currentPoison || 0));
      const broken = currentHp <= 0;

      return [
        part,
        {
          physical: broken ? 0 : currentPhysical,
          energy: broken ? 0 : currentEnergy,
          radiation: broken ? 0 : currentRadiation,
          poison: broken ? 0 : currentPoison,
          hp: currentHp,
        },
      ];`;
if (!pa.includes(oldPowerStats)) throw new Error('Power armor stat block not found');
pa = pa.replace(oldPowerStats, newPowerStats);
fs.writeFileSync(paPath, pa);
