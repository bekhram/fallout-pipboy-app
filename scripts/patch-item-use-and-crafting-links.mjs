import fs from 'node:fs';

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Anchor not found: ${label}`);
  return text.replace(from, to);
}

// 1) Make the three utility items use the existing InventoryCard USE action.
{
  const path = 'src/utils/consumableEffects.js';
  let text = fs.readFileSync(path, 'utf8');
  text = replaceOnce(
    text,
    'const CONSUMABLE_CATEGORIES = new Set(["aid", "food", "beverages"]);\n',
    'const CONSUMABLE_CATEGORIES = new Set(["aid", "food", "beverages"]);\nconst UTILITY_CONSUMABLE_NAMES = new Set([\n  "stealth boy",\n  "robot repair kit",\n  "power armor repair kit",\n]);\n',
    'utility consumable names'
  );
  text = replaceOnce(
    text,
    'export function isConsumableItem(item) {\n  return CONSUMABLE_CATEGORIES.has(item?.category);\n}\n',
    'export function isConsumableItem(item) {\n  return CONSUMABLE_CATEGORIES.has(item?.category)\n    || UTILITY_CONSUMABLE_NAMES.has(normalizeName(getCanonicalName(item)));\n}\n',
    'isConsumableItem'
  );
  fs.writeFileSync(path, text);
}

// 2) Persist active consumable effects on new characters.
{
  const path = 'src/constants.js';
  let text = fs.readFileSync(path, 'utf8');
  text = replaceOnce(
    text,
    '    inventoryItems: [],\n    perksAndTraits: [],\n',
    '    inventoryItems: [],\n    activeConsumableEffects: [],\n    perksAndTraits: [],\n',
    'default active consumable effects'
  );
  fs.writeFileSync(path, text);
}

// 3) Make invisibility visible on the main Status screen.
{
  const path = 'src/components/status/StatusScreen.jsx';
  let text = fs.readFileSync(path, 'utf8');
  text = replaceOnce(
    text,
    '  const effectBadges = [];\n\nif (derived?.immunities?.includes("radiation")) {\n',
    '  const effectBadges = [];\n\n  if (form.statuses?.invisible) {\n    effectBadges.push({\n      key: "invisible",\n      tone: "positive",\n      label: "◉ INVISIBLE",\n    });\n  }\n\nif (derived?.immunities?.includes("radiation")) {\n',
    'invisible status badge'
  );
  fs.writeFileSync(path, text);
}

// 4) Link successful base-weapon crafting to the functional Weapons tab.
{
  const path = 'src/components/crafting/CraftingScreen.jsx';
  let text = fs.readFileSync(path, 'utf8');
  const from = `    if (setCharacter) {\n      setCharacter((prev) => ({\n        ...prev,\n        inventoryItems: result.inventory,\n        craftingHistory: [\n          ...(prev?.craftingHistory || []),\n          {\n            id: \`\${recipe.id}-\${Date.now()}\`,\n            recipeId: recipe.id,\n            name: recipe.name,\n            success: result.success,\n            difficulty: result.state.difficulty,\n            targetNumber: result.state.skill.targetNumber,\n            rolls: recipe.ammoCrafting ? [] : (result.roll?.rolls || []).map((die) => die.value),\n            complications: result.complications,\n            durationMinutes: result.durationMinutes,\n            timestamp: new Date().toISOString(),\n          },\n        ].slice(-50),\n      }));\n    }\n`;
  const to = `    if (setCharacter) {\n      setCharacter((prev) => {\n        let weapons = prev?.weapons || [];\n        if (result.success && recipe?.outputTemplate?.sourceType === "crafted_weapon" && result.output) {\n          const {\n            category: _category,\n            quantity: _quantity,\n            canonicalName: _canonicalName,\n            crafted: _crafted,\n            craftingRecipeId: _craftingRecipeId,\n            craftingWorkbench: _craftingWorkbench,\n            ...weaponData\n          } = result.output;\n          weapons = [...weapons, { ...weaponData, sourceType: "crafted_weapon" }];\n        }\n\n        return {\n          ...prev,\n          weapons,\n          inventoryItems: result.inventory,\n          craftingHistory: [\n            ...(prev?.craftingHistory || []),\n            {\n              id: \`\${recipe.id}-\${Date.now()}\`,\n              recipeId: recipe.id,\n              name: recipe.name,\n              success: result.success,\n              difficulty: result.state.difficulty,\n              targetNumber: result.state.skill.targetNumber,\n              rolls: recipe.ammoCrafting ? [] : (result.roll?.rolls || []).map((die) => die.value),\n              complications: result.complications,\n              durationMinutes: result.durationMinutes,\n              timestamp: new Date().toISOString(),\n            },\n          ].slice(-50),\n        };\n      });\n    }\n`;
  text = replaceOnce(text, from, to, 'craft weapon link');
  fs.writeFileSync(path, text);
}

// 5) Add the global USE handler in App: regular consumables, Stealth Boy and repair kits.
{
  const path = 'src/App.jsx';
  let text = fs.readFileSync(path, 'utf8');

  text = replaceOnce(
    text,
    '  buildDefaultForm,\n  buildDefaultMapState,\n',
    '  ARMOR_PARTS,\n  buildDefaultForm,\n  buildDefaultMapState,\n',
    'ARMOR_PARTS import'
  );

  text = replaceOnce(
    text,
    'import { parseCSV } from "./utils/csvParser.js"; \n',
    'import { parseCSV } from "./utils/csvParser.js"; \nimport { calculatePowerArmorLocations } from "./data/powerArmor.js";\nimport { readCompanionState, writeCompanionState } from "./utils/companionStorage.js";\nimport { getConsumableUsePlan, PIPBOY_USE_ITEM_EVENT } from "./utils/consumableEffects.js";\n',
    'utility imports'
  );

  text = replaceOnce(
    text,
    'export default function App() {\n',
    `const ITEM_USE_COPY = {\n  en: { noPowerArmor: "No damaged power armor parts found.", noRobot: "No damaged robot companions found.", choosePowerArmor: "Choose a power armor part to repair", chooseRobot: "Choose a robot to repair", invalid: "Invalid selection." },\n  ru: { noPowerArmor: "Нет поврежденных частей силовой брони.", noRobot: "Нет поврежденных роботов-компаньонов.", choosePowerArmor: "Выберите часть силовой брони для ремонта", chooseRobot: "Выберите робота для ремонта", invalid: "Неверный выбор." },\n  uk: { noPowerArmor: "Немає пошкоджених частин силової броні.", noRobot: "Немає пошкоджених роботів-компаньйонів.", choosePowerArmor: "Оберіть частину силової броні для ремонту", chooseRobot: "Оберіть робота для ремонту", invalid: "Невірний вибір." },\n  pl: { noPowerArmor: "Brak uszkodzonych części pancerza wspomaganego.", noRobot: "Brak uszkodzonych robotów-towarzyszy.", choosePowerArmor: "Wybierz część pancerza do naprawy", chooseRobot: "Wybierz robota do naprawy", invalid: "Nieprawidłowy wybór." },\n};\n\nfunction normalizeUtilityName(value) {\n  return String(value || "").trim().toLowerCase().replace(/\\s+/g, " ");\n}\n\nfunction consumeInventoryItemAt(inventory = [], index) {\n  return inventory\n    .map((item, itemIndex) => {\n      if (itemIndex !== index) return item;\n      const quantity = Math.max(0, Number(item?.quantity ?? item?.qty ?? 0));\n      return { ...item, quantity: String(Math.max(0, quantity - 1)) };\n    })\n    .filter((item) => Number(item?.quantity ?? item?.qty ?? 0) > 0);\n}\n\nfunction stripPowerArmorCurrentOverrides(loadout) {\n  return {\n    ...(loadout || {}),\n    slots: Object.fromEntries(\n      Object.entries(loadout?.slots || {}).map(([part, slot]) => {\n        const clean = { ...(slot || {}) };\n        delete clean.currentHp;\n        delete clean.currentPhysical;\n        delete clean.currentEnergy;\n        delete clean.currentRadiation;\n        delete clean.currentPoison;\n        return [part, clean];\n      })\n    ),\n  };\n}\n\nfunction getDamagedPowerArmorParts(character) {\n  const loadout = character?.armor?._power?.loadout;\n  if (!loadout) return [];\n  const current = calculatePowerArmorLocations(loadout);\n  const maximum = calculatePowerArmorLocations(stripPowerArmorCurrentOverrides(loadout));\n  if (!current || !maximum) return [];\n  return ARMOR_PARTS.filter((part) => {\n    const now = current?.[part];\n    const max = maximum?.[part];\n    if (!now || !max || Number(max.hp || 0) <= 0) return false;\n    return ["hp", "physical", "energy", "radiation", "poison"].some(\n      (field) => Number(now[field] || 0) < Number(max[field] || 0)\n    );\n  }).map((part) => ({ part, current: current[part], maximum: maximum[part] }));\n}\n\nfunction isRobotCompanion(item) {\n  const text = [item?.creatureType, item?.name, item?.specialAbilities]\n    .filter(Boolean)\n    .join(" ")\n    .toLowerCase();\n  return /(robot|robotic|machine|automatron|mister handy|mr\\.? handy|protectron|assaultron|eyebot|sentry bot|robobrain)/i.test(text);\n}\n\nfunction chooseNumberedTarget(title, targets, lineForTarget) {\n  const promptText = [title, ...targets.map((target, index) => \`\${index + 1}. \${lineForTarget(target)}\`)].join("\\n");\n  const raw = window.prompt(promptText, "1");\n  if (raw === null) return null;\n  const index = Number.parseInt(raw, 10) - 1;\n  return Number.isInteger(index) && targets[index] ? targets[index] : undefined;\n}\n\nexport default function App() {\n`,
    'App utility helpers'
  );

  text = replaceOnce(
    text,
    '  const { t } = useTranslation();\n',
    '  const { t, i18n } = useTranslation();\n',
    'i18n access'
  );

  const hookAnchor = `  useEffect(() => {\n    setForm((prev) => {\n      let changed = false;\n      const inventoryItems = (prev.inventoryItems || []).map((item) => {\n        if (item?.sourceType !== "crafting_material" || item?.category === "junk") return item;\n        changed = true;\n        return { ...item, category: "junk" };\n      });\n      return changed ? { ...prev, inventoryItems } : prev;\n    });\n  }, [setForm]);\n\n`;

  const useHook = `  useEffect(() => {\n    const handleInventoryUse = (event) => {\n      const index = Number(event?.detail?.index);\n      const item = form.inventoryItems?.[index];\n      if (!Number.isInteger(index) || !item || Number(item?.quantity ?? item?.qty ?? 0) <= 0) return;\n\n      const name = normalizeUtilityName(item.canonicalName || item.name);\n      const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];\n      const copy = ITEM_USE_COPY[language] || ITEM_USE_COPY.en;\n\n      if (name === "stealth boy") {\n        setForm((prev) => ({\n          ...prev,\n          inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),\n          statuses: { ...(prev.statuses || {}), invisible: true },\n          stealthBoyState: { active: true, activatedAt: new Date().toISOString(), duration: "manual" },\n        }));\n        return;\n      }\n\n      if (name === "power armor repair kit") {\n        const targets = getDamagedPowerArmorParts(form);\n        if (!targets.length) {\n          window.alert(copy.noPowerArmor);\n          return;\n        }\n        const selected = chooseNumberedTarget(\n          copy.choosePowerArmor,\n          targets,\n          (target) => \`\${target.part}: \${target.current.hp}/\${target.maximum.hp} HP\`\n        );\n        if (selected === null) return;\n        if (!selected) {\n          window.alert(copy.invalid);\n          return;\n        }\n\n        setForm((prev) => {\n          const loadout = prev?.armor?._power?.loadout || {};\n          const slots = { ...(loadout.slots || {}) };\n          const repaired = { ...(slots[selected.part] || {}) };\n          delete repaired.currentHp;\n          delete repaired.currentPhysical;\n          delete repaired.currentEnergy;\n          delete repaired.currentRadiation;\n          delete repaired.currentPoison;\n          slots[selected.part] = repaired;\n          return {\n            ...prev,\n            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),\n            armor: {\n              ...(prev.armor || {}),\n              _power: {\n                ...(prev.armor?._power || {}),\n                loadout: { ...loadout, slots },\n              },\n            },\n          };\n        });\n        return;\n      }\n\n      if (name === "robot repair kit") {\n        const companionState = readCompanionState();\n        const targets = (companionState.items || []).filter((companion) => {\n          const currentHp = Math.max(0, Number(companion?.currentHp || 0));\n          const maxHp = Math.max(0, Number(companion?.maxHp || 0));\n          return isRobotCompanion(companion) && maxHp > 0 && currentHp < maxHp;\n        });\n        if (!targets.length) {\n          window.alert(copy.noRobot);\n          return;\n        }\n        const selected = chooseNumberedTarget(\n          copy.chooseRobot,\n          targets,\n          (target) => \`\${target.name || target.creatureType || "Robot"}: \${target.currentHp}/\${target.maxHp} HP\`\n        );\n        if (selected === null) return;\n        if (!selected) {\n          window.alert(copy.invalid);\n          return;\n        }\n        writeCompanionState({\n          ...companionState,\n          items: companionState.items.map((companion) =>\n            companion.id === selected.id\n              ? { ...companion, currentHp: String(Math.max(0, Number(companion.maxHp || 0))) }\n              : companion\n          ),\n        });\n        setForm((prev) => ({\n          ...prev,\n          inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),\n        }));\n        return;\n      }\n\n      const plan = getConsumableUsePlan(item);\n      setForm((prev) => {\n        const statuses = { ...(prev.statuses || {}) };\n        if (plan.statusKey) statuses[plan.statusKey] = true;\n        if (plan.cureAddictions) {\n          Object.keys(statuses).forEach((key) => {\n            if (key.toLowerCase().endsWith("addiction")) statuses[key] = false;\n          });\n        }\n\n        let activeConsumableEffects = Array.isArray(prev.activeConsumableEffects)\n          ? [...prev.activeConsumableEffects]\n          : [];\n        if (plan.activeEffect) {\n          activeConsumableEffects = activeConsumableEffects\n            .filter((effect) => effect?.id !== plan.activeEffect.id)\n            .concat(plan.activeEffect);\n        }\n\n        const nextRadiation = Math.max(0, Number(prev.radiationHp || 0) - Number(plan.healingRadiation || 0));\n        const preview = {\n          ...prev,\n          statuses,\n          activeConsumableEffects,\n          radiationHp: String(nextRadiation),\n        };\n        const maxHp = Math.max(0, Number(getDerivedStats(preview).effectiveMaxHp || 0));\n        const nextHp = Math.min(maxHp, Math.max(0, Number(prev.currentHp || 0) + Number(plan.healingHp || 0)));\n\n        return {\n          ...preview,\n          currentHp: String(nextHp),\n          inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),\n        };\n      });\n    };\n\n    window.addEventListener(PIPBOY_USE_ITEM_EVENT, handleInventoryUse);\n    return () => window.removeEventListener(PIPBOY_USE_ITEM_EVENT, handleInventoryUse);\n  }, [form, i18n.language, i18n.resolvedLanguage, setForm]);\n\n`;

  text = replaceOnce(text, hookAnchor, hookAnchor + useHook, 'inventory use effect hook');
  fs.writeFileSync(path, text);
}

console.log('Applied item use + repair kits + Stealth Boy + crafted weapon integration patch.');
