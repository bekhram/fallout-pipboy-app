import fs from 'node:fs';

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Anchor not found: ${label}`);
  return text.replace(from, to);
}

{
  const path = 'src/App.jsx';
  let text = fs.readFileSync(path, 'utf8');

  text = replaceOnce(
    text,
    '  SKILL_LABEL_KEYS,\n} from "./constants.js";\n',
    '  SKILL_LABEL_KEYS,\n  STATUS_LIST,\n} from "./constants.js";\n',
    'STATUS_LIST import'
  );

  text = replaceOnce(
    text,
    '        if (plan.cureAddictions) {\n          Object.keys(statuses).forEach((key) => {\n            if (key.toLowerCase().endsWith("addiction")) statuses[key] = false;\n          });\n        }\n\n        let activeConsumableEffects',
    '        if (plan.cureAddictions) {\n          Object.keys(statuses).forEach((key) => {\n            if (key.toLowerCase().endsWith("addiction")) statuses[key] = false;\n          });\n        }\n        if (plan.cureDiseases) {\n          STATUS_LIST.filter((status) => status.group === "disease").forEach((status) => {\n            statuses[status.key] = false;\n          });\n        }\n\n        let activeConsumableEffects',
    'disease curing'
  );

  text = replaceOnce(
    text,
    '          <ArmorScreen\n            armor={form.armor}\n            onArmorChange={updateArmor}\n            derived={derived}\n          />',
    '          <ArmorScreen\n            armor={form.armor}\n            inventoryItems={form.inventoryItems}\n            onArmorChange={updateArmor}\n            derived={derived}\n          />',
    'ArmorScreen inventory prop'
  );

  fs.writeFileSync(path, text);
}

{
  const path = 'src/components/armor/ArmorScreen.jsx';
  let text = fs.readFileSync(path, 'utf8');

  text = replaceOnce(
    text,
    'function findById(list, id) {\n',
    'const OWNED_LABELS = {\n  en: { title: "CRAFTED / OWNED ARMOR", equip: "EQUIP" },\n  ru: { title: "СКРАФЧЕННАЯ / МОЯ БРОНЯ", equip: "НАДЕТЬ" },\n  uk: { title: "СКРАФЧЕНА / МОЯ БРОНЯ", equip: "ОДЯГТИ" },\n  pl: { title: "WYTWORZONY / POSIADANY PANCERZ", equip: "ZAŁÓŻ" },\n};\n\nfunction findById(list, id) {\n',
    'owned armor labels'
  );

  text = replaceOnce(
    text,
    'export default function ArmorScreen({ armor, onArmorChange }) {\n',
    'export default function ArmorScreen({ armor, inventoryItems = [], onArmorChange }) {\n',
    'ArmorScreen props'
  );

  text = replaceOnce(
    text,
    '  const language = i18n.resolvedLanguage?.split("-")[0] || "en";\n',
    '  const language = i18n.resolvedLanguage?.split("-")[0] || "en";\n  const ownedLabels = OWNED_LABELS[language] || OWNED_LABELS.en;\n',
    'owned labels language'
  );

  text = replaceOnce(
    text,
    '  const slots = armor?._equipment?.slots || {};\n  const condition = armor?._condition?.parts || {};\n',
    '  const slots = armor?._equipment?.slots || {};\n  const condition = armor?._condition?.parts || {};\n  const ownedCraftedArmor = useMemo(() => {\n    const ids = new Set(\n      (inventoryItems || [])\n        .filter((item) => item?.sourceType === "crafted_armor" && Number(item?.quantity || 0) > 0 && item?.armorItemId)\n        .map((item) => item.armorItemId)\n    );\n    return database.items.filter((item) => ids.has(item.id));\n  }, [database.items, inventoryItems]);\n',
    'owned crafted armor memo'
  );

  const oldEquip = `  const equipCatalogItem = () => {\n    const item = findById(database.items, catalogItemId);\n    if (!item) return;\n    const next = { ...slots };\n    ARMOR_PARTS.forEach((part) => {\n      const coversPart = isBodyGarment(item)\n        ? garmentCoversPart(item, part)\n        : item.locations[PART_LOCATION[part]];\n      if (coversPart) {\n        next[part] = { itemId: item.id, materialId: "", upgradeId: "" };\n      }\n    });\n    setSlots(next);\n    resetConditionParts(ARMOR_PARTS.filter((part) => next[part]?.itemId === item.id));\n  };\n`;
  const newEquip = `  const equipArmorItem = (item) => {\n    if (!item) return;\n    const next = { ...slots };\n    ARMOR_PARTS.forEach((part) => {\n      const coversPart = isBodyGarment(item)\n        ? garmentCoversPart(item, part)\n        : item.locations[PART_LOCATION[part]];\n      if (coversPart) {\n        next[part] = { itemId: item.id, materialId: "", upgradeId: "" };\n      }\n    });\n    setSlots(next);\n    resetConditionParts(ARMOR_PARTS.filter((part) => next[part]?.itemId === item.id));\n  };\n\n  const equipCatalogItem = () => {\n    equipArmorItem(findById(database.items, catalogItemId));\n  };\n`;
  text = replaceOnce(text, oldEquip, newEquip, 'equip armor helper');

  text = replaceOnce(
    text,
    '          <div className="pip-armor-section-title push-top">[ {labels.normalArmor} ]</div>\n          <div className="pip-armor-catalog">',
    '          <div className="pip-armor-section-title push-top">[ {labels.normalArmor} ]</div>\n          {ownedCraftedArmor.length > 0 && (\n            <div className="pip-armor-catalog">\n              <div className="pip-armor-section-title">[ {ownedLabels.title} ]</div>\n              <div className="pip-stack">\n                {ownedCraftedArmor.map((item) => (\n                  <div key={`owned-${item.id}`} className="pip-armor-equip-row">\n                    <strong>{armorName(item)}</strong>\n                    <button type="button" className="pip-btn is-primary" onClick={() => equipArmorItem(item)}>\n                      {ownedLabels.equip}\n                    </button>\n                  </div>\n                ))}\n              </div>\n            </div>\n          )}\n          <div className="pip-armor-catalog">',
    'owned armor UI'
  );

  fs.writeFileSync(path, text);
}

console.log('Applied owned crafted armor integration and disease consumable completion.');
