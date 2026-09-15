from pathlib import Path
import json, re

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

# Fix object insertion punctuation from the first-pass patch.
p = 'src/data/startingEquipment.js'
s = read(p)
s = s.replace('  ],,\n  assaultron_military:', '  ],\n  assaultron_military:')
s = s.replace('  },,\n  assaultron_military:', '  },\n  assaultron_military:')

# Ensure random caravan ammunition is generated even when the character inventory is initially empty.
old = '''    if (entry.type === "randomWares") {
      const pools = [
        (form.inventoryItems || []).filter((candidate) => candidate.category === "ammo"),
        INVENTORY_DATABASE.filter((candidate) => candidate.category === "aid"),
        INVENTORY_DATABASE.filter((candidate) => candidate.category === "junk"),
      ];'''
new = '''    if (entry.type === "randomWares") {
      const ammoWares = [".38", "9mm", "10mm", ".308", "Shotgun Shell", "Fusion Cell", "Gamma Round", "Arrow", ".45"]
        .map((name) => item(name, "ammo"));
      const pools = [
        ammoWares,
        INVENTORY_DATABASE.filter((candidate) => candidate.category === "aid"),
        INVENTORY_DATABASE.filter((candidate) => candidate.category === "junk"),
      ];'''
if old in s:
    s = s.replace(old, new, 1)
write(p, s)

# Fix generated origins punctuation if necessary.
p = 'src/components/data/origins.js'
s = read(p)
s = s.replace('  },,\n  assaultron:', '  },\n  assaultron:')
s = s.replace('  }\n  assaultron:', '  },\n  assaultron:')
write(p, s)

# Replace the quick-create skill rank function with one that enforces INT+9 and origin skill caps cleanly.
p = 'src/components/characterCreation/QuickCharacterWizard.jsx'
s = read(p)
start = s.find('  const changeSkillRank = (skillName, delta) => {')
end = s.find('\n\n  const toggleTag = (skillName) => {', start)
if start < 0 or end < 0:
    raise SystemExit('QuickCharacterWizard changeSkillRank markers not found')
new_fn = '''  const changeSkillRank = (skillName, delta) => {
    const current = Number(skills?.[skillName]?.rank || 0);
    const isTagged = Boolean(skills?.[skillName]?.tagged);
    const effectiveLimit = Number(origin?.skillRankLimit || 6);
    const maxBaseRank = Math.max(0, Math.min(3, effectiveLimit - (isTagged ? 2 : 0)));
    const nextRank = Math.max(0, Math.min(maxBaseRank, current + delta));
    if (delta > 0 && usedSkillPoints >= skillPointBudget) return;
    setSkills((prev) => ({
      ...prev,
      [skillName]: {
        ...prev[skillName],
        rank: String(nextRank),
      },
    }));
  };'''
s = s[:start] + new_fn + s[end:]

# Quick-creation perk filtering must treat Assaultron as a robot and respect radiation immunity.
s = s.replace('  const isRobot = form?.origin === "mister_handy";', '  const isRobot = ["mister_handy", "assaultron"].includes(form?.origin);\n  const isGhoul = form?.origin === "ghoul";\n  const radiationImmune = ["ghoul", "super_mutant", "nightkin", "mister_handy", "assaultron"].includes(form?.origin);')
needle = '      if (part.toLowerCase() === "not a robot" && isRobot) warnings.push(part);'
replacement = '''      const lower = part.toLowerCase();
      if (lower === "not a robot" && isRobot) warnings.push(part);
      if (lower === "not a ghoul or robot" && (isGhoul || isRobot)) warnings.push(part);
      if (lower === "not immune to radiation" && radiationImmune) warnings.push(part);'''
if needle in s:
    s = s.replace(needle, replacement, 1)

# Tribal Nomad cannot take Science as a Tag Skill.
if 'const forbiddenTags =' not in s:
    anchor = '  const restrictedTags = origin?.restrictedTagList || [];\n  const restrictedRequired = Number(origin?.restrictedTagCount || 0);'
    repl = '''  const restrictedTags = origin?.restrictedTagList || [];
  const restrictedRequired = Number(origin?.restrictedTagCount || 0);
  const forbiddenTags = [
    ...(origin?.forbiddenTagList || []),
    ...(selectedTraits.includes("nomad") ? ["Science"] : []),
  ];'''
    s = s.replace(anchor, repl, 1)
s = s.replace('    if (!isTagged && taggedSkills.length >= tagLimit) return;', '    if (!isTagged && (taggedSkills.length >= tagLimit || forbiddenTags.includes(skillName))) return;', 1)
s = s.replace('disabled={!isTagged && taggedSkills.length >= tagLimit}', 'disabled={!isTagged && (taggedSkills.length >= tagLimit || forbiddenTags.includes(skillName))}', 1)

# Make the copy match the actual INT + 9 rule.
copy_replacements = {
  'Assign 9 starting Skill ranks.': 'Assign starting Skill ranks equal to INT + 9.',
  'Assign exactly 9 Skill ranks and all required Tag Skills.': 'Assign exactly INT + 9 Skill ranks and all required Tag Skills.',
  'Распредели 9 стартовых рангов навыков.': 'Распредели количество стартовых рангов навыков, равное INT + 9.',
  'Нужно распределить ровно 9 рангов навыков и выбрать все обязательные Tag Skills.': 'Нужно распределить ровно INT + 9 рангов навыков и выбрать все обязательные Tag Skills.',
  'Розподіли 9 стартових рангів навичок.': 'Розподіли кількість стартових рангів навичок, що дорівнює INT + 9.',
  'Потрібно розподілити рівно 9 рангів навичок і обрати всі обов\'язкові Tag Skills.': 'Потрібно розподілити рівно INT + 9 рангів навичок і обрати всі обов\'язкові Tag Skills.',
  'Rozdziel 9 początkowych rang umiejętności.': 'Rozdziel liczbę początkowych rang umiejętności równą INT + 9.',
  'Przydziel dokładnie 9 rang umiejętności i wybierz wszystkie wymagane Tag Skills.': 'Przydziel dokładnie INT + 9 rang umiejętności i wybierz wszystkie wymagane Tag Skills.',
}
for old, new in copy_replacements.items():
    s = s.replace(old, new)
write(p, s)

# Add localization for unique Wanderer starter gear so Inventory also follows the selected language.
loc_path = ROOT / 'src/data/wandererEquipmentLocalization.js'
loc_path.write_text('''const NAMES = {
  ru: {
    "Laser Gun Attachment":"Встроенный лазер", "Actuated Frame Body":"Корпус приводной рамы", "Actuated Frame Arm":"Рука приводной рамы", "Actuated Frame Leg":"Нога приводной рамы", "Standard Plating":"Стандартная обшивка", "Recon Sensors Mod":"Модуль разведсенсоров", "Skull Mask":"Маска-череп", "Serrated Plate Body":"Зубчатая бронеплита корпуса", "Serrated Plate Arm":"Зубчатая бронеплита руки", "Serrated Plate Leg":"Зубчатая бронеплита ноги", "Construction Claw":"Строительный коготь", "Factory Storage Armor":"Заводская грузовая броня", "Factory Armor Legs":"Заводская броня ног", "Behavioral Analysis Module":"Модуль анализа поведения", "Tattered Brotherhood Fatigues":"Потрёпанная форма Братства", "Military Canteen":"Военная фляга", "Tattered Brotherhood Scribe's Armor":"Потрёпанная броня писца Братства", "Walking Cane":"Трость", "Gamma Gun":"Гамма-пистолет", "Gas Mask":"Противогаз", "Bumper Sword":"Меч из бампера", "Underarmor Suit":"Подбронный костюм", "Black Powder Blunderbuss":"Чернопороховый мушкетон", "Pipe Revolver":"Самодельный револьвер", "Sturdy Clothing":"Укреплённая одежда", "Hunter's Pelt Outfit":"Охотничья меховая одежда", "Hunter's Hood":"Капюшон охотника", "Wood Armor Chest Piece":"Деревянная броня груди", "Wooden Arm":"Деревянная броня руки", "Wooden Leg":"Деревянная броня ноги", "Old World Cache Map":"Карта тайника Старого мира"
  },
  uk: {
    "Laser Gun Attachment":"Вбудований лазер", "Actuated Frame Body":"Корпус приводної рами", "Actuated Frame Arm":"Рука приводної рами", "Actuated Frame Leg":"Нога приводної рами", "Standard Plating":"Стандартна обшивка", "Recon Sensors Mod":"Модуль розвідсенсорів", "Skull Mask":"Маска-череп", "Serrated Plate Body":"Зубчаста бронеплита корпусу", "Serrated Plate Arm":"Зубчаста бронеплита руки", "Serrated Plate Leg":"Зубчаста бронеплита ноги", "Construction Claw":"Будівельний кіготь", "Factory Storage Armor":"Заводська вантажна броня", "Factory Armor Legs":"Заводська броня ніг", "Behavioral Analysis Module":"Модуль аналізу поведінки", "Tattered Brotherhood Fatigues":"Пошарпана форма Братства", "Military Canteen":"Військова фляга", "Tattered Brotherhood Scribe's Armor":"Пошарпана броня писаря Братства", "Walking Cane":"Тростина", "Gamma Gun":"Гамма-пістолет", "Gas Mask":"Протигаз", "Bumper Sword":"Меч із бампера", "Underarmor Suit":"Підбронний костюм", "Black Powder Blunderbuss":"Чорнопороховий мушкетон", "Pipe Revolver":"Саморобний револьвер", "Sturdy Clothing":"Укріплений одяг", "Hunter's Pelt Outfit":"Мисливський хутряний одяг", "Hunter's Hood":"Каптур мисливця", "Wood Armor Chest Piece":"Дерев'яна броня грудей", "Wooden Arm":"Дерев'яна броня руки", "Wooden Leg":"Дерев'яна броня ноги", "Old World Cache Map":"Мапа сховку Старого світу"
  },
  pl: {
    "Laser Gun Attachment":"Wbudowany laser", "Actuated Frame Body":"Korpus ramy siłownikowej", "Actuated Frame Arm":"Ramię ramy siłownikowej", "Actuated Frame Leg":"Noga ramy siłownikowej", "Standard Plating":"Standardowe poszycie", "Recon Sensors Mod":"Moduł czujników zwiadowczych", "Skull Mask":"Maska czaszki", "Serrated Plate Body":"Ząbkowana płyta korpusu", "Serrated Plate Arm":"Ząbkowana płyta ramienia", "Serrated Plate Leg":"Ząbkowana płyta nogi", "Construction Claw":"Pazur konstrukcyjny", "Factory Storage Armor":"Fabryczny pancerz transportowy", "Factory Armor Legs":"Fabryczny pancerz nóg", "Behavioral Analysis Module":"Moduł analizy zachowania", "Tattered Brotherhood Fatigues":"Podarte mundury Bractwa", "Military Canteen":"Manierka wojskowa", "Tattered Brotherhood Scribe's Armor":"Podarty pancerz Skryby Bractwa", "Walking Cane":"Laska", "Gamma Gun":"Pistolet gamma", "Gas Mask":"Maska przeciwgazowa", "Bumper Sword":"Miecz ze zderzaka", "Underarmor Suit":"Kombinezon pod pancerz", "Black Powder Blunderbuss":"Garłacz czarnoprochowy", "Pipe Revolver":"Rewolwer rurowy", "Sturdy Clothing":"Wzmocnione ubranie", "Hunter's Pelt Outfit":"Strój z futra myśliwego", "Hunter's Hood":"Kaptur myśliwego", "Wood Armor Chest Piece":"Drewniany napierśnik", "Wooden Arm":"Drewniany pancerz ręki", "Wooden Leg":"Drewniany pancerz nogi", "Old World Cache Map":"Mapa skrytki Starego Świata"
  }
};

export function getWandererEquipmentLocalization(item, language = "en") {
  const lang = String(language || "en").split("-")[0];
  const canonical = String(item?.canonicalName || item?.name || "");
  const displayName = NAMES[lang]?.[canonical];
  return displayName ? { displayName } : null;
}
''', encoding='utf-8')

p = 'src/data/inventoryLocalizationAll.js'
s = read(p)
if 'getWandererEquipmentLocalization' not in s:
    s = s.replace('import { getLocalizedCraftingMaterial } from "./inventory/craftingMaterials.js";\n', 'import { getLocalizedCraftingMaterial } from "./inventory/craftingMaterials.js";\nimport { getWandererEquipmentLocalization } from "./wandererEquipmentLocalization.js";\n', 1)
    s = s.replace('  const craftingMaterial = getLocalizedCraftingMaterial(item, language);\n', '  const craftingMaterial = getLocalizedCraftingMaterial(item, language);\n  const wanderer = getWandererEquipmentLocalization(item, language);\n\n  if (wanderer) {\n    return {\n      ...base,\n      ...wanderer,\n      displayName: wanderer.displayName || base.displayName || item?.name || "",\n    };\n  }\n', 1)
write(p, s)

# Fully localize equipment-pack summaries, not just their labels.
pack_items = {
  'ru': {
    'assaultron_military':'Встроенный лазер; приводная рама на выбор; стандартная обшивка; ячейки синтеза; разведсенсоры; 15 крышек.',
    'assaultron_devil':'Маска-череп; зубчатая бронеплита на выбор; два строительных когтя; модуль обнаружения угроз; ячейки синтеза; ремкомплект робота.',
    'assaultron_caravan':'Встроенный лазер; заводская грузовая броня и броня ног; ячейки синтеза; по 3 случайных предмета боеприпасов, помощи и хлама; модуль анализа поведения; случайные крышки.',
    'outcast_ex_knight':'Лазерная винтовка и ячейки синтеза; потрёпанная форма Братства; фляга с водой; 2 броска по таблице снаряжения Изгнанников; 10 крышек.',
    'outcast_ex_scribe':'Лазерный пистолет и ячейки синтеза; потрёпанная броня писца; мультитул; 3 броска по таблице Изгнанников; 15 крышек.',
    'atom_missionary':'Прочная одежда; трость; гамма-пистолет и гамма-патроны; стимулятор; 10 крышек; 1 случайная еда.',
    'atom_zealot':'Прочная одежда или одежда бродяги; мачете; гамма-пистолет и гамма-патроны; противогаз; 2 случайные еды.',
    'nightkin_pack':'Лазерная винтовка и ячейки синтеза; меч из бампера; рейдерская броня груди, руки и ноги; Стелс-Бой; 2 случайные еды; 1 случайный напиток.',
    'tribal_modernist':'Современное оружие на выбор с боеприпасами; подбронный костюм; боевая броня на выбор; мультитул; случайная еда и напиток; 3 хлама.',
    'tribal_ritualist':'Оружие на выбор с боеприпасами; укреплённая одежда; кожаная броня груди; личный талисман; 2 случайных ценности.',
    'tribal_naturalist':'Лук и стрелы; мачете и боевой нож; охотничья одежда и капюшон; деревянная броня; 3 случайные еды; 3 случайных напитка.'
  },
  'uk': {
    'assaultron_military':'Вбудований лазер; приводна рама на вибір; стандартна обшивка; ядерні комірки; розвідсенсори; 15 кришок.',
    'assaultron_devil':'Маска-череп; зубчаста бронеплита на вибір; два будівельні кігті; модуль виявлення загроз; ядерні комірки; ремкомплект робота.',
    'assaultron_caravan':'Вбудований лазер; заводська вантажна броня й броня ніг; ядерні комірки; по 3 випадкові предмети боєприпасів, допомоги та мотлоху; модуль аналізу поведінки; випадкові кришки.',
    'outcast_ex_knight':'Лазерна гвинтівка та ядерні комірки; пошарпана форма Братства; фляга з водою; 2 кидки таблиці спорядження Вигнанців; 10 кришок.',
    'outcast_ex_scribe':'Лазерний пістолет та ядерні комірки; пошарпана броня писаря; мультитул; 3 кидки таблиці Вигнанців; 15 кришок.',
    'atom_missionary':'Міцний одяг; тростина; гамма-пістолет і гамма-набої; стимулятор; 10 кришок; 1 випадкова їжа.',
    'atom_zealot':'Міцний одяг або одяг мандрівника; мачете; гамма-пістолет і гамма-набої; протигаз; 2 випадкові їжі.',
    'nightkin_pack':'Лазерна гвинтівка та ядерні комірки; меч із бампера; рейдерська броня грудей, руки й ноги; Стелс-Бой; 2 випадкові їжі; 1 випадковий напій.',
    'tribal_modernist':'Сучасна зброя на вибір із боєприпасами; підбронний костюм; бойова броня на вибір; мультитул; випадкова їжа й напій; 3 мотлохи.',
    'tribal_ritualist':'Зброя на вибір із боєприпасами; укріплений одяг; шкіряна броня грудей; особистий талісман; 2 випадкові цінності.',
    'tribal_naturalist':'Лук і стріли; мачете та бойовий ніж; мисливський одяг і каптур; дерев’яна броня; 3 випадкові їжі; 3 випадкові напої.'
  },
  'pl': {
    'assaultron_military':'Wbudowany laser; rama siłownikowa do wyboru; standardowe poszycie; ogniwa fuzyjne; czujniki zwiadowcze; 15 kapsli.',
    'assaultron_devil':'Maska czaszki; ząbkowana płyta do wyboru; dwa pazury konstrukcyjne; moduł wykrywania zagrożeń; ogniwa fuzyjne; zestaw naprawczy robota.',
    'assaultron_caravan':'Wbudowany laser; fabryczny pancerz transportowy i nogi; ogniwa fuzyjne; po 3 losowe przedmioty amunicji, pomocy i złomu; moduł analizy zachowania; losowe kapsle.',
    'outcast_ex_knight':'Karabin laserowy i ogniwa fuzyjne; podarty mundur Bractwa; manierka z wodą; 2 rzuty na tabeli Wyrzutków; 10 kapsli.',
    'outcast_ex_scribe':'Pistolet laserowy i ogniwa fuzyjne; podarty pancerz Skryby; multitool; 3 rzuty na tabeli Wyrzutków; 15 kapsli.',
    'atom_missionary':'Wytrzymałe ubranie; laska; pistolet gamma i naboje gamma; Stimpak; 10 kapsli; 1 losowe jedzenie.',
    'atom_zealot':'Wytrzymałe ubranie lub strój włóczęgi; maczeta; pistolet gamma i naboje gamma; maska przeciwgazowa; 2 losowe jedzenia.',
    'nightkin_pack':'Karabin laserowy i ogniwa fuzyjne; miecz ze zderzaka; elementy pancerza bandyty; Stealth Boy; 2 losowe jedzenia; 1 losowy napój.',
    'tribal_modernist':'Nowoczesna broń do wyboru z amunicją; kombinezon pod pancerz; pancerz bojowy do wyboru; multitool; losowe jedzenie i napój; 3 złomu.',
    'tribal_ritualist':'Broń do wyboru z amunicją; wzmocnione ubranie; skórzany napierśnik; osobisty talizman; 2 losowe kosztowności.',
    'tribal_naturalist':'Łuk i strzały; maczeta i nóż bojowy; strój i kaptur myśliwego; drewniany pancerz; 3 losowe jedzenia; 3 losowe napoje.'
  }
}
for lang, values in pack_items.items():
    path = ROOT / f'src/locales/{lang}/common.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    for key, value in values.items():
        if key in data.get('equipmentPacks', {}):
            data['equipmentPacks'][key]['items'] = value
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print('Wanderer patch fixes applied')
