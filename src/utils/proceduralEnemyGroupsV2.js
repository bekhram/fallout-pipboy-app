const GROUPS = [
  "auto",
  "raider",
  "forged",
  "trapper",
  "super_mutant",
  "brotherhood",
  "enclave",
  "gunner",
  "legion",
  "scorched",
  "trog",
  "mirelurk",
  "insect",
  "deathclaw",
  "gatorclaw",
  "ghoul",
  "robot",
  "institute",
  "zetan",
  "mole_rat",
  "yao_guai",
  "radrat",
  "gecko",
  "angler",
  "gulper",
  "hermit_crab",
  "mega_sloth",
  "grafton_monster",
  "mothman",
  "sheepsquatch",
  "snallygaster",
  "wendigo",
  "radstag",
  "brahmin",
  "wastelander",
  "vault_dweller",
  "trader",
  "minuteman",
  "railroad_agent",
  "mercenary",
  "children_of_atom",
];

const LEGACY_GROUP_ALIASES = { radscorpion: "insect" };
export const ENEMY_GROUP_OPTIONS = GROUPS;

const LABELS = {
  en: {
    auto:"Auto", raider:"Raiders + dogs", forged:"Forged", trapper:"Trappers", super_mutant:"Super Mutants + Floaters + mutant hounds",
    brotherhood:"Brotherhood of Steel", enclave:"Enclave", gunner:"Gunners", legion:"Caesar's Legion", scorched:"Scorched + Scorchbeasts", trog:"Trogs",
    mirelurk:"Mirelurks", insect:"Insects", deathclaw:"Deathclaws", gatorclaw:"Gatorclaws", ghoul:"Feral Ghouls", robot:"Robots / turrets",
    institute:"Institute / Synths", zetan:"Zetans", mole_rat:"Mole Rats", yao_guai:"Yao Guai", radrat:"Radrats", gecko:"Geckos",
    angler:"Anglers", gulper:"Gulpers", hermit_crab:"Hermit Crabs", mega_sloth:"Mega Sloths", grafton_monster:"Grafton Monsters",
    mothman:"Mothmen", sheepsquatch:"Sheepsquatch", snallygaster:"Snallygasters", wendigo:"Wendigos", radstag:"Radstags", brahmin:"Brahmin",
    wastelander:"Wastelanders", vault_dweller:"Vault Dwellers", trader:"Traders / Caravan Merchants", minuteman:"Minutemen",
    railroad_agent:"Railroad Agents", mercenary:"Mercenaries", children_of_atom:"Children of Atom", other:"Other",
  },
  ru: {
    auto:"Авто", raider:"Рейдеры + собаки", forged:"Кованые", trapper:"Трапперы", super_mutant:"Супермутанты + флоатеры + мутировавшие гончие",
    brotherhood:"Братство Стали", enclave:"Анклав", gunner:"Стрелки", legion:"Легион Цезаря", scorched:"Обгоревшие + Звери обгоревших", trog:"Троги",
    mirelurk:"Болотники", insect:"Насекомые", deathclaw:"Когти смерти", gatorclaw:"Гаторклоу", ghoul:"Дикие гули", robot:"Роботы / турели",
    institute:"Институт / синты", zetan:"Зетаны", mole_rat:"Кротокрысы", yao_guai:"Яо-гаи", radrat:"Радкрысы", gecko:"Гекконы",
    angler:"Удильщики", gulper:"Галперы", hermit_crab:"Крабы-отшельники", mega_sloth:"Мегаленивцы", grafton_monster:"Графтонские монстры",
    mothman:"Люди-мотыльки", sheepsquatch:"Овцеквачи", snallygaster:"Сналлигастеры", wendigo:"Вендиго", radstag:"Радстаги", brahmin:"Брамины",
    wastelander:"Жители пустоши", vault_dweller:"Жители убежища", trader:"Торговцы / караванщики", minuteman:"Минитмены",
    railroad_agent:"Агенты Подземки", mercenary:"Наёмники", children_of_atom:"Дети Атома", other:"Другие",
  },
  uk: {
    auto:"Авто", raider:"Рейдери + собаки", forged:"Ковані", trapper:"Трапери", super_mutant:"Супермутанти + флоатери + мутовані гончаки",
    brotherhood:"Братство Сталі", enclave:"Анклав", gunner:"Стрільці", legion:"Легіон Цезаря", scorched:"Обпалені + звірі обпалених", trog:"Троги",
    mirelurk:"Болотники", insect:"Комахи", deathclaw:"Кігті смерті", gatorclaw:"Гаторклоу", ghoul:"Дикі гулі", robot:"Роботи / турелі",
    institute:"Інститут / синти", zetan:"Зетани", mole_rat:"Кротощури", yao_guai:"Яо-гаї", radrat:"Радщури", gecko:"Гекони",
    angler:"Вудильники", gulper:"Галпери", hermit_crab:"Краби-відлюдники", mega_sloth:"Мегалінивці", grafton_monster:"Графтонські монстри",
    mothman:"Люди-метелики", sheepsquatch:"Шипсквочі", snallygaster:"Сналігастери", wendigo:"Вендіго", radstag:"Радстаги", brahmin:"Браміни",
    wastelander:"Мешканці пустки", vault_dweller:"Мешканці сховища", trader:"Торговці / караванники", minuteman:"Мінітмени",
    railroad_agent:"Агенти Підземки", mercenary:"Найманці", children_of_atom:"Діти Атома", other:"Інші",
  },
  pl: {
    auto:"Auto", raider:"Najeźdźcy + psy", forged:"Forged", trapper:"Traperzy", super_mutant:"Supermutanci + floatery + zmutowane psy",
    brotherhood:"Bractwo Stali", enclave:"Enklawa", gunner:"Gunnerzy", legion:"Legion Cezara", scorched:"Scorched + Scorchbeasts", trog:"Trogi",
    mirelurk:"Mirelurki", insect:"Owady", deathclaw:"Szpony śmierci", gatorclaw:"Gatorclawy", ghoul:"Dzikie ghule", robot:"Roboty / wieżyczki",
    institute:"Instytut / synthy", zetan:"Zetanie", mole_rat:"Kretoszczury", yao_guai:"Yao Guai", radrat:"Radraty", gecko:"Gekony",
    angler:"Anglery", gulper:"Gulpery", hermit_crab:"Kraby pustelniki", mega_sloth:"Mega Slothy", grafton_monster:"Grafton Monsters",
    mothman:"Mothmany", sheepsquatch:"Sheepsquatche", snallygaster:"Snallygastery", wendigo:"Wendigo", radstag:"Radstagi", brahmin:"Brahminy",
    wastelander:"Mieszkańcy pustkowi", vault_dweller:"Mieszkańcy krypt", trader:"Handlarze / kupcy karawanowi", minuteman:"Minutemeni",
    railroad_agent:"Agenci Railroad", mercenary:"Najemnicy", children_of_atom:"Dzieci Atomu", other:"Inne",
  },
};

const LOCATION_GROUPS = {
  wasteland: ["raider","forged","trapper","super_mutant","enclave","gunner","legion","scorched","ghoul","trog","insect","mirelurk","deathclaw","gatorclaw","mole_rat","yao_guai","radrat","gecko","angler","gulper","hermit_crab","mega_sloth","grafton_monster","mothman","sheepsquatch","snallygaster","wendigo","robot","radstag","brahmin"],
  red_rocket: ["raider","forged","trapper","ghoul","scorched","insect","mole_rat","radrat","robot","deathclaw"],
  super_duper_mart: ["ghoul","scorched","raider","forged","insect","radrat","robot","institute"],
  raider_camp: ["raider","forged","trapper"],
  military_bunker: ["robot","brotherhood","enclave","gunner","ghoul","scorched","super_mutant","institute"],
  fortified_camp: ["raider","forged","super_mutant","brotherhood","enclave","gunner","legion"],
};

function norm(value) {
  return String(value || "").toLowerCase().replace(/[’'`]/g, "").replace(/[^a-z0-9а-яёіїєґ]+/gi, " ").replace(/\s+/g, " ").trim();
}

function sourceText(value) {
  if (typeof value === "string") return norm(value);
  return norm([value?.id,value?.name,value?.creatureType,value?.category,...(Array.isArray(value?.tags)?value.tags:[])].filter(Boolean).join(" "));
}

function speciesSlug(source) {
  const cleaned = norm(source).replace(/\b(mutated|normal|notable|major|mighty|legendary|creature|character|enemy|ally|human|mammal|reptile|arachnid|amphibian|invertebrate)\b/g," ").replace(/\s+/g," ").trim();
  return cleaned ? `species:${cleaned.split(" ").slice(0,3).join("_")}` : "other";
}

function exactGroup(value) {
  const id = typeof value === "object" && value ? String(value.id || "").toLowerCase().trim() : "";
  const name = norm(typeof value === "string" ? value : value?.name);
  const map = {
    radstag:"radstag", brahmin:"brahmin", deathclaw:"deathclaw", "mole-rat":"mole_rat", "yao-guai":"yao_guai",
    "wastelander-npc":"wastelander", "vault-dweller-npc":"vault_dweller", "trader-caravan-merchant":"trader",
    minuteman:"minuteman", "railroad-agent":"railroad_agent", gunner:"gunner", mercenary:"mercenary", "children-of-atom":"children_of_atom",
    radrat:"radrat", "glowing-plagued-radrat":"radrat", gecko:"gecko", angler:"angler", gulper:"gulper", "hermit-crab":"hermit_crab",
    "mega-sloth":"mega_sloth", "grafton-monster":"grafton_monster", sheepsquatch:"sheepsquatch", snallygaster:"snallygaster", wendigo:"wendigo",
  };
  if (map[id]) return map[id];
  if (name === "radstag") return "radstag";
  if (name === "brahmin") return "brahmin";
  return "";
}

export function normalizeEnemyGroup(value) {
  const raw = String(value || "auto").toLowerCase();
  if (raw.startsWith("species:")) return raw;
  const group = LEGACY_GROUP_ALIASES[raw] || raw;
  return GROUPS.includes(group) ? group : "auto";
}

export function enemyGroupForEntry(value) {
  const source = sourceText(value);
  if (!source) return "other";

  // Named factions first so mixed profiles (Frank Horrigan, robots, mutated humans) stay with their organization.
  if (/\benclave\b|augustus autumn|frank horrigan|hellfire trooper|tesla soldier/.test(source)) return "enclave";
  if (/robotic synth|\bsynth\b|\binstitute\b/.test(source)) return "institute";
  if (/brotherhood of steel|\bbrotherhood\b/.test(source)) return "brotherhood";
  if (/\bgunner\b|gunner sergeant|gunner commander|\bclint\b/.test(source)) return "gunner";
  if (/caesars legion|caesar s legion|\blegionary\b|\bcenturion\b|legate lanius|\bcaesar\b/.test(source)) return "legion";
  if (/\bforged\b|\bslag\b/.test(source)) return "forged";
  if (/stalking trapper|\btrapper\b/.test(source)) return "trapper";
  if (/\braider\b/.test(source)) return "raider";
  if (/\bzetan\b|\baliens?\b/.test(source)) return "zetan";

  // Super-mutant encounters may include Floaters because of Mutant Friend.
  if (/super mutant associated|\bfloater\b|mutant hound|super mutant|\bnightkin\b|\bthe master\b|ancient super mutant behemoth|\bswan\b/.test(source)) return "super_mutant";

  // Scorched creatures share a hive ecology; Scorchbeasts may lead mixed Scorched encounters.
  if (/\bscorched\b|scorchbeast|scorched wanderer|scorched berserker/.test(source)) return "scorched";
  if (/trog fledgling|trog devourer|\btrog\b/.test(source)) return "trog";

  // Ordinary dogs/mongrels may accompany raiders.
  if (/wild mongrel|mongrel dog|\bdog\b|\bcanine\b/.test(source)) return "raider";

  const exact = exactGroup(value);
  if (exact) return exact;

  if (/deathclaw|death claw/.test(source)) return "deathclaw";
  if (/gatorclaw/.test(source)) return "gatorclaw";
  if (/mirelurk|\bhatchlings?\b/.test(source)) return "mirelurk";
  if (/hermit crab/.test(source)) return "hermit_crab";

  if (/radroach|bloodbug|bloatfly|stingwing|radscorpion|cave cricket|cazador|giant ant|giant mantis|honey beast|bee swarm|\binsect\b|\barachnid\b/.test(source)) return "insect";
  if (/mole rat/.test(source)) return "mole_rat";
  if (/yao guai/.test(source)) return "yao_guai";
  if (/feral ghoul|glowing one|\bghoul\b|\bferal\b/.test(source)) return "ghoul";

  if (/wise mothman|vengeful mothman|\bmothman\b/.test(source)) return "mothman";
  if (/grafton monster/.test(source)) return "grafton_monster";
  if (/mega sloth/.test(source)) return "mega_sloth";
  if (/sheepsquatch/.test(source)) return "sheepsquatch";
  if (/snallygaster/.test(source)) return "snallygaster";
  if (/wendigo/.test(source)) return "wendigo";
  if (/\bgecko\b/.test(source)) return "gecko";
  if (/\bradrat\b/.test(source)) return "radrat";
  if (/\bangler\b/.test(source)) return "angler";
  if (/\bgulper\b/.test(source)) return "gulper";

  if (/\brobot\b|robotic|colonel gutsy|cyberdog|liberator|protectron|turret|mister gutsy|mr gutsy|sentry bot|assaultron|eyebot|security robot/.test(source)) return "robot";

  return speciesSlug(source);
}

export function entriesCompatible(a, b) {
  const direct = (value) => {
    if (typeof value === "string" && value.startsWith("species:")) return value.toLowerCase();
    if (typeof value === "string" && GROUPS.includes(value.toLowerCase())) return normalizeEnemyGroup(value);
    return enemyGroupForEntry(value);
  };
  return direct(a) === direct(b);
}

export function autoEnemyGroupsForLocation(type) {
  return [...(LOCATION_GROUPS[type] || LOCATION_GROUPS.wasteland)];
}

export function enemyGroupLabel(group, lang = "en") {
  const code = ["en","ru","uk","pl"].includes(String(lang || "en").toLowerCase().split("-")[0]) ? String(lang || "en").toLowerCase().split("-")[0] : "en";
  const key = normalizeEnemyGroup(group);
  if (LABELS[code]?.[key]) return LABELS[code][key];
  if (String(group || "").startsWith("species:")) return String(group).slice(8).replace(/_/g," ");
  return LABELS[code]?.other || LABELS.en.other;
}
