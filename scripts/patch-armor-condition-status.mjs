import fs from 'node:fs';

const path = 'src/components/armor/ArmorScreen.jsx';
let text = fs.readFileSync(path, 'utf8');

const anchor = `  const powerArmorStats = useMemo(\n    () => calculatePowerArmorLocations(armor?._power?.loadout),\n    [armor?._power?.loadout]\n  );\n`;

const replacement = `  const powerArmorStats = useMemo(\n    () => calculatePowerArmorLocations(armor?._power?.loadout),\n    [armor?._power?.loadout]\n  );\n\n  const powerArmorMaximums = useMemo(() => {\n    const loadout = armor?._power?.loadout;\n    if (!loadout || !powerArmorStats) return null;\n\n    const cleanSlots = Object.fromEntries(\n      Object.entries(loadout.slots || {}).map(([part, slot]) => {\n        const clean = { ...(slot || {}) };\n        delete clean.currentHp;\n        delete clean.currentPhysical;\n        delete clean.currentEnergy;\n        delete clean.currentRadiation;\n        delete clean.currentPoison;\n        return [part, clean];\n      })\n    );\n\n    return calculatePowerArmorLocations({ ...loadout, slots: cleanSlots });\n  }, [armor?._power?.loadout, powerArmorStats]);\n`;

if (!text.includes(anchor)) throw new Error('powerArmorStats anchor not found');
text = text.replace(anchor, replacement);

const oldStatus = `  const getConditionStatus = (part) => {\n    if (powerArmorStats) return null;\n    const maximum = normalMaximums[part] || {};\n    const current = calculated[part] || {};\n    const hasArmor = RESISTANCE_FIELDS.some((field) => Number(maximum[field.key] || 0) > 0);\n    if (!hasArmor) return null;\n    const isBroken = RESISTANCE_FIELDS.every((field) => Number(current[field.key] || 0) === 0);\n    if (isBroken) return \"broken\";\n    const isDamaged = RESISTANCE_FIELDS.some(\n      (field) => Number(current[field.key] || 0) < Number(maximum[field.key] || 0)\n    );\n    if (isDamaged) return \"damaged\";\n    const isImproved = RESISTANCE_FIELDS.some(\n      (field) => Number(current[field.key] || 0) > Number(maximum[field.key] || 0)\n    );\n    return isImproved ? \"improved\" : \"healthy\";\n  };`;

const newStatus = `  const getConditionStatus = (part) => {\n    const maximum = (powerArmorStats ? powerArmorMaximums : normalMaximums)?.[part] || {};\n    const current = calculated[part] || {};\n    const hasArmor = FIELDS.some((field) => Number(maximum[field.key] || 0) > 0);\n    if (!hasArmor) return null;\n\n    const maximumHp = Number(maximum.hp || 0);\n    const isBroken = maximumHp > 0\n      ? Number(current.hp || 0) <= 0\n      : RESISTANCE_FIELDS.every((field) => Number(current[field.key] || 0) === 0);\n    if (isBroken) return \"broken\";\n\n    const isDamaged = FIELDS.some(\n      (field) => Number(current[field.key] || 0) < Number(maximum[field.key] || 0)\n    );\n    if (isDamaged) return \"damaged\";\n\n    const isImproved = FIELDS.some(\n      (field) => Number(current[field.key] || 0) > Number(maximum[field.key] || 0)\n    );\n    return isImproved ? \"improved\" : \"healthy\";\n  };`;

if (!text.includes(oldStatus)) throw new Error('condition status block not found');
text = text.replace(oldStatus, newStatus);

fs.writeFileSync(path, text);
