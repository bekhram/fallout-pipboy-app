const GROUPS = [
  "auto",
  "raider",
  "super_mutant",
  "brotherhood",
  "mirelurk",
  "insect",
  "deathclaw",
  "ghoul",
  "robot",
  "institute",
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
];

const LEGACY_GROUP_ALIASES = {
  radscorpion: "insect",
};

export const ENEMY_GROUP_OPTIONS = GROUPS;

const LABELS = {
  en: {
    auto: "Auto",
    raider: "Raiders + dogs",
    super_mutant: "Super Mutants + mutant hounds",
    brotherhood: "Brotherhood of Steel",
    mirelurk: "Mirelurks",
    insect: "Insects",
    deathclaw: "Deathclaws",
    ghoul: "Feral Ghouls",
    robot: "Robots / turrets",
    institute: "Institute / Synths",
    mole_rat: "Mole Rats",
    yao_guai: "Yao Guai",
    radstag: "Radstags",
    brahmin: "Brahmin",
    wastelander: "Wastelanders",
    vault_dweller: "Vault Dwellers",
    trader: "Traders / Caravan Merchants",
    minuteman: "Minutemen",
    human: "Humans",
    other: "Other",
  },
  ru: {
    auto: "Авто",
    raider: "Рейдеры + собаки",
    super_mutant: "Супермутанты + мутировавшие собаки",
    brotherhood: "Братство Стали",
    mirelurk: "Болотники",
    insect: "Насекомые",
    deathclaw: "Когти смерти",
    ghoul: "Дикие гули",
    robot: "Роботы / турели",
    institute: "Институт / синты",
    mole_rat: "Кротокрысы",
    yao_guai: "Яо-гаи",
    radstag: "Радстаги",
    brahmin: "Брамины",
    wastelander: "Жители пустоши",
    vault_dweller: "Жители убежища",
    trader: "Торговцы / караванщики",
    minuteman: "Минитмены",
    human: "Люди",
    other: "Другие",
  },
  uk: {
    auto: "Авто",
    raider: "Рейдери + собаки",
    super_mutant: "Супермутанти + мутовані собаки",
    brotherhood: "Братство Сталі",
    mirelurk: "Болотники",
    insect: "Комахи",
    deathclaw: "Кігті смерті",
    ghoul: "Дикі гулі",
    robot: "Роботи / турелі",
    institute: "Інститут / синти",
    mole_rat: "Кротощури",
    yao_guai: "Яо-гаї",
    radstag: "Радстаги",
    brahmin: "Браміни",
    wastelander: "Мешканці пустки",
    vault_dweller: "Мешканці сховища",
    trader: "Торговці / караванники",
    minuteman: "Мінітмени",
    human: "Люди",
    other: "Інші",
  },
  pl: {
    auto: "Auto",
    raider: "Najeźdźcy + psy",
    super_mutant: "Supermutanci + zmutowane psy",
    brotherhood: "Bractwo Stali",
    mirelurk: "Mirelurki",
    insect: "Owady",
    deathclaw: "Szpony śmierci",
    ghoul: "Dzikie ghule",
    robot: "Roboty / wieżyczki",
    institute: "Instytut / synthy",
    mole_rat: "Kretoszczury",
    yao_guai: "Yao Guai",
    radstag: "Radstagi",
    brahmin: "Brahminy",
    wastelander: "Mieszkańcy pustkowi",
    vault_dweller: "Mieszkańcy krypt",
    trader: "Handlarze / kupcy karawanowi",
    minuteman: "Minutemeni",
    human: "Ludzie",
    other: "Inne",
  },
};

const LOCATION_GROUPS = {
  wasteland: ["raider", "super_mutant", "ghoul", "insect", "mirelurk", "deathclaw", "mole_rat", "yao_guai", "robot", "radstag", "brahmin"],
  red_rocket: ["raider", "ghoul", "insect", "mole_rat", "robot", "deathclaw"],
  super_duper_mart: ["ghoul", "raider", "insect", "robot", "institute"],
  raider_camp: ["raider"],
  military_bunker: ["robot", "brotherhood", "ghoul", "super_mutant", "institute"],
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
  if (/brotherhood of steel|brotherhood-of-steel|\bbrotherhood\b/.test(source)) return "brotherhood";
  if (/\braider\b/.test(source)) return "raider";

  // Creature families with explicit compatibility rules.
  if (/mutant hound|mutant-hound/.test(source)) return "super_mutant";
  if (/super mutant|super-mutant|\bnightkin\b/.test(source)) return "super_mutant";

  // Ordinary dogs/mongrels are factionless in lore, but may accompany raiders in encounters.
  if (/wild mongrel|mongrel dog|\bdog\b|\bcanine\b/.test(source)) return "raider";

  // User-defined factionless profiles: never mix them with another faction/species.
  const factionless = exactFactionlessGroup(value);
  if (factionless) return factionless;

  if (/deathclaw|death-claw/.test(source)) return "deathclaw";
  if (/mirelurk|\bcrustacean\b|\bhatchlings?\b/.test(source)) return "mirelurk";

  // All insect/arthropod enemies explicitly assigned by the GM belong to one compatible group.
  // Current set: Radroach, Bloatfly, Bloodbug, Stingwing and Radscorpion.
  if (/radroach|bloodbug|bloatfly|stingwing|radscorpion|rad-scorpion|\binsect\b|\barachnid\b/.test(source)) return "insect";

  if (/mole rat|mole-rat/.test(source)) return "mole_rat";
  if (/yao guai|yao-guai/.test(source)) return "yao_guai";
  if (/feral ghoul|glowing one|\bghoul\b|\bferal\b/.test(source)) return "ghoul";

  if (/\brobot\b|protectron|turret|mister gutsy|mr gutsy|sentry bot|assaultron|eyebot|security robot/.test(source)) return "robot";

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
  return directGroup(a) === directGroup(b);
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
