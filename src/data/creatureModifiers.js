export const SPECIAL_CREATURE_TEMPLATES = [
  { id: "alpha", name: "Alpha", summary: "Уровень +1; +1 к Body или Mind; +1 к одному навыку; пересчитать инициативу. Получает Aggressive и Leader of the Pack." },
  { id: "glowing", name: "Glowing", summary: "Только не-робот. Излучает радиацию в ближней зоне, атаки ближнего боя получают Radioactive; иммунитет к радиации." },
  { id: "rabid", name: "Rabid", summary: "Только не-робот. Получает Feral; атаки ближнего боя получают Persistent (Poison), а яд повышает риск болезни." },
  { id: "scorched", name: "Scorched", summary: "Для немутировавшего человека или не-робота. Получает Scorched: действует инстинктивно, не поддаётся Speech и предупреждает заражённых поблизости." },
];

export const LEGENDARY_CREATURE_ABILITIES = [
  { id: "scarred", name: "Scarred", summary: "Physical DR и Energy DR +2. После мутации можно снимать травмы бросками CD; затем оба DR ещё +2." },
  { id: "stalker", name: "Stalker", summary: "Автоматический успех на Sneak, инициатива +2; в укрытии защита +1. После мутации становится невидимым." },
  { id: "toxic", name: "Toxic", summary: "Атаки ближнего боя получают Persistent (Poison) и выбранный эффект. После мутации наносит яд существам в Reach." },
  { id: "tyrant", name: "Tyrant", summary: "Появляется с обычными существами своего типа. После мутации прибывает такое же подкрепление." },
  { id: "cruel", name: "Cruel", summary: "Получает 1 Luck за критическое попадание. После мутации атаки получают Vicious либо +2 CD, если Vicious уже есть." },
  { id: "explosive", name: "Explosive", summary: "После мутации получает Radioactive на атаки ближнего боя; при падении до 0 HP наносит радиационный урон в Close." },
  { id: "legendary-damage", name: "Legendary Damage", summary: "Выбранная атака получает +3 CD. После мутации дополнительная атака стоит меньше AP и игнорирует штраф сложности." },
  { id: "legendary-proficiency", name: "Legendary Proficiency", summary: "Только персонажи: выбранный Tag skill даёт автоматический успех; после мутации — два." },
  { id: "radioactive", name: "Radioactive", summary: "Иммунитет к радиации; атаки ближнего боя получают Radioactive. После мутации наносит Piercing 1 Radiation рядом." },
  { id: "rage-heal", name: "Rage Heal", summary: "В начале хода восстанавливает 3 HP. После мутации сразу восстанавливает максимум HP." },
];

export function creatureAbilityList(modifier) {
  if (modifier === "special") return SPECIAL_CREATURE_TEMPLATES;
  if (modifier === "legendary") return LEGENDARY_CREATURE_ABILITIES;
  return [];
}
