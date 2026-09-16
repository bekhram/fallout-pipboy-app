const GROUPS = [
  "auto",
  "raider",
  "super_mutant",
  "brotherhood",
  "mirelurk",
  "insect",
  "deathclaw",
  "amphibian",
  "reptile",
  "mammal",
  "crustacean",
  "cryptid",
  "ghoul",
  "scorched",
  "trog",
  "robot",
  "cyber_animal",
  "floater",
  "institute",
  "zetan",
  "mole_rat",
  "yao_guai",
  // Factionless profiles. These are encounter groups, not factions: each may
  // only be grouped with another member of the same profile/species.
  "radstag",
  "brahmin",
  "wastelander",
  "vault_dweller",
  "trader",
  "minuteman",
  "railroad_agent",
  "gunner",
  "mercenary",
  "children_of_atom",
];

const LEGACY_GROUP_ALIASES = {
  radscorpion: "insect",
};

export const ENEMY_GROUP_OPTIONS = GROUPS;

const LABELS = {
  en: {
    auto: "Auto",
    raider: "Raiders + dogs",
    super_mutant: "Super Mutants + mutant hounds + floaters",
    brotherhood: "Brotherhood of Steel",
    mirelurk: "Mirelurks",
    insect: "Insects",
    deathclaw: "Deathclaws",
    amphibian: "Amphibians",
    reptile: "Reptiles",
    mammal: "Mammals",
    crustacean: "Crustaceans",
    cryptid: "Cryptids",
    ghoul: "Feral Ghouls",
    scorched: "Scorched",
    trog: "Trogs",
    robot: "Robots / turrets",
    cyber_animal: "Cyber Animals",
    floater: "Floaters",
    institute: "Institute / Synths",
    zetan: "Zetans",
    mole_rat: "Mole Rats",
    yao_guai: "Yao Guai",
    radstag: "Radstags",
    brahmin: "Brahmin",
    wastelander: "Wastelanders",
    vault_dweller: "Vault Dwellers",
    trader: "Traders / Caravan Merchants",
    minuteman: "Minutemen",
    railroad_agent: "Railroad Agents",
    gunner: "Gunners",
    mercenary: "Mercenaries",
    children_of_atom: "Children of Atom",
    human: "Humans",
    other: "Other",
  },
  ru: {
    auto: "Авто",
    raider: "Рейдеры + собаки",
    super_mutant: "Супермутанты + мутировавшие собаки + флоатеры",
    brotherhood: "Братство Стали",
    mirelurk: "Болотники",
    insect: "Насекомые",
    deathclaw: "Когти смерти",
    amphibian: "Амфибии",
    reptile: "Рептилии",
    mammal: "Млекопитающие",
    crustacean: "Ракообразные",
    cryptid: "Криптиды",
    ghoul: "Дикие гули",
    scorched: "Обгоревшие",
    trog: "Троги",
    robot: "Роботы / турели",
    cyber_animal: "Киберживотные",
    floater: "Флоатеры",
    institute: "Институт / синты",
    zetan: "Зетаны",
    mole_rat: "Кротокрысы",
    yao_guai: "Яо-гаи",
    radstag: "Радстаги",
    brahmin: "Брамины",
    wastelander: "Жители пустоши",
    vault_dweller: "Жители убежища",
    trader: "Торговцы / караванщики",
    minuteman: "Минитмены",
    railroad_agent: "Агенты Подземки",
    gunner: "Стрелки",
    mercenary: "Наёмники",
    children_of_atom: "Дети Атома",
    human: "Люди",
    other: "Другие",
  },
  uk: {
    auto: "Авто",
    raider: "Рейдери + собаки",
    super_mutant: "Супермутанти + мутовані собаки + флоатери",
    brotherhood: "Братство Сталі",
    mirelurk: "Болотники",
    insect: "Комахи",
    deathclaw: "Кігті смерті",
    amphibian: "Амфібії",
    reptile: "Рептилії",
    mammal: "Ссавці",
    crustacean: "Ракоподібні",
    cryptid: "Криптиди",
    ghoul: "Дикі гулі",
    scorched: "Обпалені",
    trog: "Троги",
    robot: "Роботи / турелі",
    cyber_animal: "Кібер-тварини",
    floater: "Флоатери",
    institute: "Інститут / синти",
    zetan: "Зетани",
    mole_rat: "Кротощури",
    yao_guai: "Яо-гаї",
    radstag: "Радстаги",
    brahmin: "Браміни",
    wastelander: "Мешканці пустки",
    vault_dweller: "Мешканці сховища",
    trader: "Торговці / караванники",
    minuteman: "Мінітмени",
    railroad_agent: "Агенти Підземки",
    gunner: "Стрільці",
    mercenary: "Найманці",
    children_of_atom: "Діти Атома",
    human: "Люди",
    other: "Інші",
  },
  pl: {
    auto: "Auto",
    raider: "Najeźdźcy + psy",
    super_mutant: "Supermutanci + zmutowane psy + floatery",
    brotherhood: "Bractwo Stali",
    mirelurk: "Mirelurki",
    insect: "Owady",
    deathclaw: "Szpony śmierci",
    amphibian: "Płazy",
    reptile: "Gady",
    mammal: "Ssaki",
    crustacean: "Skorupiaki",
    cryptid: "Kryptydy",
    ghoul: "Dzikie ghule",
    scorched: "Scorched",
    trog: "Trogi",
    robot: "Roboty / wieżyczki",
    cyber_animal: "Cyberzwierzęta",
    floater: "Floatery",
    institute: "Instytut / synthy",
    zetan: "Zetanie",
    mole_rat: "Kretoszczury",
    yao_guai: "Yao Guai",
    radstag: "Radstagi",
    brahmin: "Brahminy",
    wastelander: "Mieszkańcy pustkowi",
    vault_dweller: "Mieszkańcy krypt",
    trader: "Handlarze / kupcy karawanowi",
    minuteman: "Minutemeni",
    railroad_agent: "Agenci Railroad",
    gunner: "Gunnerzy",
    mercenary: "Najemnicy",
    children_of_atom: "Dzieci Atomu",
    human: "Ludzie",
    other: "Inne",
  },
};

const LOCATION_GROUPS = {
  wasteland: [
    "raider", "super_mutant", "ghoul", "scorched", "trog", "insect", "mirelurk", "deathclaw",
    "amphibian", "reptile", "mammal", "crustacean", "cryptid", "floater", "cyber_animal",
    "mole_rat", "yao_guai", "robot", "radstag", "brahmin",
  ],
  red_rocket: ["raider", "ghoul", "scorched", "insect", "reptile", "mammal", "floater", "mole_rat", "robot", "cyber_animal", "deathclaw"],
  super_duper_mart: ["ghoul", "scorched", "trog", "raider", "insect", "robot", "cyber_animal", "institute"],
  raider_camp: ["raider"],
  military_bunker: ["robot", "cyber_animal", "brotherhood", "ghoul", "scorched", "super_mutant", "institute"],
};

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9а-яёіїєґ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceText(value) {
  if (typeof value === "string") return norm(value);
  const tags = Array.isArray(value?.tags) ? value.tags : [];
  return norm([
    value?.id,
    value?.name,
    value?.creatureType,
    value?.category,
    ...tags,
  ].filter(Boolean).join(" "));
}

function speciesSlug(source) {
  const cleaned = norm(source)
    .replace(/\b(mutated|normal|notable|major|creature|character|enemy|ally|human|mammal|reptile|arachnid)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? `species:${cleaned.split(" ").slice(0, 3).join("_")}` : "other";
}

function exactFactionlessGroup(value) {
  const id = typeof value === "object" && value ? String(value.id || "").toLowerCase().trim() : "";
  const name = norm(typeof value === "string" ? value : value?.name);

  if (id === "radstag" || name === "radstag") return "radstag";
  if (id === "brahmin" || name === "brahmin") return "brahmin";
  if (id === "deathclaw" || name === "deathclaw") return "deathclaw";
  if (id === "mole-rat" || name === "mole rat") return "mole_rat";
  if (id === "yao-guai" || name === "yao guai") return "yao_guai";
  if (id === "wastelander-npc" || name === "wastelander") return "wastelander";
  if (id === "vault-dweller-npc" || name === "vault dweller") return "vault_dweller";
  if (id === "trader-caravan-merchant" || name === "trader caravan merchant") return "trader";
  if (id === "minuteman" || name === "minuteman") return "minuteman";
  if (id === "railroad-agent" || name === "railroad agent") return "railroad_agent";
  if (id === "gunner" || name === "gunner") return "gunner";
  if (id === "mercenary" || name === "mercenary") return "mercenary";
  if (id === "children-of-atom" || name === "children of atom") return "children_of_atom";
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

  // Named factions first. Institute Scientist intentionally stays with Synths.
  if (/robotic synth|robotic-synth|\bsynth\b|\binstitute\b/.test(source)) return "institute";
  if (/\bzetan\b|\baliens?\b/.test(source)) return "zetan";
  if (/brotherhood of steel|brotherhood-of-steel|\bbrotherhood\b/.test(source)) return "brotherhood";
  if (/\braider\b/.test(source)) return "raider";

  // Creature families with explicit compatibility rules.
  if (/mutant hound|mutant-hound/.test(source)) return "super_mutant";
  if (/super mutant|super-mutant|\bnightkin\b/.test(source)) return "super_mutant";

  // Floater is its own encounter family. It is also permitted as Super Mutant support.
  if (/\bfloater\b/.test(source)) return "floater";

  // Scorched are kept together, including Scorchbeasts that can call them into battle.
  if (/\bscorched\b|\bscorchbeast\b/.test(source)) return "scorched";
  if (/\btrogs?\b/.test(source)) return "trog";

  // Cyber animals remain separate from ordinary robots and mammals.
  if (/cyber animal|cyber-animal|cyber animals|cyber-animals|\bcyberdog\b/.test(source)) return "cyber_animal";

  // Ordinary dogs/mongrels are factionless in lore, but may accompany raiders in encounters.
  if (/wild mongrel|mongrel dog|\bdog\b|\bcanine\b/.test(source)) return "raider";

  // User-defined factionless profiles: never mix them with another faction/species.
  const factionless = exactFactionlessGroup(value);
  if (factionless) return factionless;

  if (/deathclaw|death-claw/.test(source)) return "deathclaw";
  if (/mirelurk|\bhatchlings?\b/.test(source)) return "mirelurk";

  // All Radscorpions are intentionally part of Insects in this app.
  if (/radroach|bloodbug|bloatfly|stingwing|radscorpion|rad-scorpion|cave cricket|cazador|giant ant|giant mantis|honey beast|bee swarm|\binsect\b|\barachnid\b/.test(source)) return "insect";

  // Wanderer's Guide creature-family pools.
  if (/\bangler\b|\bgulper\b|\bamphibian\b/.test(source)) return "amphibian";
  if (/\bgatorclaw\b|\bgecko\b|\breptile\b|\blizard\b/.test(source)) return "reptile";
  if (/\bhermit crab\b|\bcrustacean\b/.test(source)) return "crustacean";
  if (/\bcryptid\b|grafton monster|mothman|sheepsquatch|snallygaster|wendigo/.test(source)) return "cryptid";

  if (/mole rat|mole-rat/.test(source)) return "mole_rat";
  if (/yao guai|yao-guai/.test(source)) return "yao_guai";
  if (/feral ghoul|glowing one|\bghoul\b|\bferal\b/.test(source)) return "ghoul";

  if (/\brobot\b|protectron|turret|mister gutsy|mr gutsy|sentry bot|assaultron|eyebot|security robot|\bliberator\b/.test(source)) return "robot";

  if (/\bradrat\b|mega sloth|\bmammal\b/.test(source)) return "mammal";

  // No generic Human bucket: an otherwise factionless human profile gets its own
  // exact species/profile identity instead of being mixed with unrelated humans.
  return speciesSlug(source);
}

export function entriesCompatible(a, b) {
  const directGroup = (value) => {
    if (typeof value === "string" && value.startsWith("species:")) return value.toLowerCase();
    if (typeof value === "string" && GROUPS.includes(value.toLowerCase())) return normalizeEnemyGroup(value);
    return enemyGroupForEntry(value);
  };
  const aGroup = directGroup(a);
  const bGroup = directGroup(b);
  if (aGroup === bGroup) return true;
  // Floaters may accompany Super Mutants without losing their standalone pool.
  return (aGroup === "floater" && bGroup === "super_mutant") || (aGroup === "super_mutant" && bGroup === "floater");
}

export function autoEnemyGroupsForLocation(type) {
  return [...(LOCATION_GROUPS[type] || LOCATION_GROUPS.wasteland)];
}

export function enemyGroupLabel(group, lang = "en") {
  const code = ["en", "ru", "uk", "pl"].includes(String(lang || "en").toLowerCase().split("-")[0])
    ? String(lang || "en").toLowerCase().split("-")[0]
    : "en";
  const key = normalizeEnemyGroup(group);
  if (LABELS[code]?.[key]) return LABELS[code][key];
  if (String(group || "").startsWith("species:")) return String(group).slice(8).replace(/_/g, " ");
  return LABELS[code]?.other || LABELS.en.other;
}
