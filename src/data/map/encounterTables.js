// Official random-encounter tables from Fallout: The Roleplaying Game Core Rulebook,
// 2nd Printing (April 2022 Errata), p. 308. Event text is deliberately concise/paraphrased;
// the d20 ranges and encounter composition follow the source table.

export const OFFICIAL_COMMONWEALTH_ENCOUNTERS = [
  {
    id: "official_raider_shanties", rollMin: 1, rollMax: 2, type: "scene",
    bestiaryRefs: ["raider"], groupSize: "unspecified",
    texts: {
      en: "Raiders occupy a cluster of shanties and demand compliance from passing wastelanders.",
      ru: "Рейдеры заняли несколько лачуг и выкрикивают требования проходящим путникам.",
      uk: "Рейдери зайняли кілька халуп і вигукують вимоги мандрівникам, що проходять повз.",
      pl: "Rajderzy zajęli grupę szop i wykrzykują żądania do przechodzących wędrowców.",
    },
  },
  {
    id: "official_merchant_bloatflies", rollMin: 3, rollMax: 4, type: "scene",
    bestiaryRefs: ["bloatfly"], groupSize: "unspecified",
    texts: {
      en: "A wandering merchant is trying to escape bloatflies; helping may earn a discount or a small reward.",
      ru: "Странствующий торговец спасается от дутней; помощь может принести скидку или небольшую награду.",
      uk: "Мандрівний торговець тікає від дутнів; допомога може принести знижку або невелику нагороду.",
      pl: "Wędrowny kupiec ucieka przed bloatflyami; pomoc może przynieść zniżkę lub drobną nagrodę.",
    },
  },
  {
    id: "official_eyebot", rollMin: 5, rollMax: 6, type: "scene",
    bestiaryRefs: ["eyebot"], groupSize: 1,
    texts: {
      en: "A roaming Eyebot passes by broadcasting advertisements and possible mission information.",
      ru: "Мимо пролетает Эйбот, транслирующий рекламу и возможную информацию о заданиях.",
      uk: "Повз пролітає Ейбот, транслюючи рекламу та можливу інформацію про завдання.",
      pl: "Przelatuje Eyebot, nadając reklamy i możliwe informacje o zadaniach.",
    },
  },
  {
    id: "official_feral_dogs", rollMin: 7, rollMax: 8, type: "hostile_scene",
    bestiaryRefs: ["dog"], groupSize: "unspecified",
    texts: {
      en: "A hungry pack of feral dogs attacks in search of food.",
      ru: "Голодная стая одичавших собак нападает в поисках пищи.",
      uk: "Голодна зграя здичавілих собак нападає в пошуках їжі.",
      pl: "Głodna wataha zdziczałych psów atakuje w poszukiwaniu pożywienia.",
    },
  },
  {
    id: "official_yao_guai_ambush", rollMin: 9, rollMax: 10, type: "ambush",
    bestiaryRefs: ["yao-guai"], combatBestiaryIds: ["yao-guai"], groupSize: 1, autoCombat: true,
    texts: {
      en: "A rampaging Yao Guai ambushes the group inside its territory.",
      ru: "Разъярённый Яо-Гай устраивает засаду на путников, вторгшихся на его территорию.",
      uk: "Розлючений Яо-Гай влаштовує засідку на мандрівників, що зайшли на його територію.",
      pl: "Rozwścieczony Yao Guai urządza zasadzkę na grupę, która weszła na jego terytorium.",
    },
  },
  {
    id: "official_feral_ghouls", rollMin: 11, rollMax: 12, type: "hostile_scene",
    bestiaryRefs: ["feral-ghoul", "glowing-one"], groupSize: "unspecified",
    texts: {
      en: "A pack of feral ghouls rushes the party, with a Glowing One at its center.",
      ru: "Стая диких гулей бросается к группе; в центре стаи находится Светящийся.",
      uk: "Зграя диких гулів кидається до групи; у центрі зграї — Світляк.",
      pl: "Grupa dzikich ghuli rusza na drużynę, a w jej centrum znajduje się Glowing One.",
    },
  },
  {
    id: "official_bos_vertibird", rollMin: 13, rollMax: 14, type: "scene",
    bestiaryRefs: [], groupSize: "unspecified",
    texts: {
      en: "A Brotherhood of Steel Vertibird flies overhead and reacts according to the group's reputation.",
      ru: "Над группой пролетает винтокрыл Братства Стали; реакция зависит от репутации путников.",
      uk: "Над групою пролітає гвинтокрил Братства Сталі; реакція залежить від репутації мандрівників.",
      pl: "Nad grupą przelatuje Vertibird Bractwa Stali; reakcja zależy od reputacji wędrowców.",
    },
  },
  {
    id: "official_behemoth_guard", rollMin: 15, rollMax: 16, type: "scene",
    bestiaryRefs: ["super-mutant-behemoth"], groupSize: 1,
    texts: {
      en: "A Super Mutant Behemoth guards the location the party is currently exploring.",
      ru: "Супермутант-бегемот охраняет место, в котором сейчас находится группа.",
      uk: "Супермутант-бегемот охороняє місце, де зараз перебуває група.",
      pl: "Supermutant Behemot strzeże miejsca, w którym obecnie znajduje się drużyna.",
    },
  },
  {
    id: "official_mirelurk_queen", rollMin: 17, rollMax: 18, type: "scene",
    bestiaryRefs: ["mirelurk-queen", "hatchlings"], groupSize: "queen_plus_unspecified_brood",
    texts: {
      en: "A Mirelurk Queen and her brood defend a small spawning pool.",
      ru: "Королева болотников и её выводок защищают небольшой нерестовый водоём.",
      uk: "Королева болотників та її виводок захищають невелику нерестову водойму.",
      pl: "Królowa Mirelurków i jej potomstwo bronią małego miejsca lęgowego.",
    },
  },
  {
    id: "official_deathclaw_victor", rollMin: 19, rollMax: 19, type: "scene",
    bestiaryRefs: ["deathclaw"], groupSize: 1,
    texts: {
      en: "A Deathclaw stands over another Deathclaw it has just killed.",
      ru: "Коготь смерти стоит над другим Когтем смерти, которого только что убил.",
      uk: "Кіготь смерті стоїть над іншим Кігтем смерті, якого щойно вбив.",
      pl: "Deathclaw stoi nad drugim Deathclawem, którego właśnie zabił.",
    },
  },
  { id: "official_weird_wasteland", rollMin: 20, rollMax: 20, type: "weird_table" },
].map((entry) => ({
  ...entry,
  rulesSource: "Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata)",
  rulesPage: 308,
  tableName: "Random Commonwealth Encounters",
  generationSource: "core_rulebook_official",
}));

export const OFFICIAL_WEIRD_WASTELAND_ENCOUNTERS = [
  {
    id: "official_weird_gutsy_drill", rollMin: 1, rollMax: 3, type: "weird",
    bestiaryRefs: ["mister-gutsy"], groupSize: "unspecified",
    texts: {
      en: "A group of Mister Gutsy robots running a mock military exercise tries to assign the party a role.",
      ru: "Группа роботов Мистер Храбрец проводит учебные манёвры и пытается назначить группе военную роль.",
      uk: "Група роботів Містер Хоробрець проводить навчальні маневри й намагається призначити групі військову роль.",
      pl: "Grupa robotów Mister Gutsy prowadzi ćwiczenia wojskowe i próbuje przydzielić drużynie rolę.",
    },
  },
  {
    id: "official_weird_pillars", rollMin: 4, rollMax: 7, type: "weird", bestiaryRefs: [], groupSize: "unspecified",
    texts: {
      en: "Followers of the Pillars of the Community approach to preach to the group.",
      ru: "Последователи культа «Столпы Общины» подходят к группе с проповедью.",
      uk: "Послідовники культу «Стовпи Спільноти» підходять до групи з проповіддю.",
      pl: "Wyznawcy Pillars of the Community podchodzą, aby głosić swoje nauki drużynie.",
    },
  },
  {
    id: "official_weird_convention", rollMin: 8, rollMax: 10, type: "weird", bestiaryRefs: [], groupSize: "unspecified",
    texts: {
      en: "Fans of several pre-War cultural icons gather to organize a wasteland convention.",
      ru: "Поклонники разных довоенных культурных символов собираются организовать пустошный «конвент».",
      uk: "Шанувальники різних довоєнних культурних символів збираються організувати пустельний «конвент».",
      pl: "Fani różnych przedwojennych ikon kultury zbierają się, by zorganizować konwent na pustkowiu.",
    },
  },
  {
    id: "official_weird_mutant_tech", rollMin: 11, rollMax: 14, type: "weird",
    bestiaryRefs: ["super-mutant"], groupSize: "unspecified",
    texts: {
      en: "A group of Super Mutants struggles to make a piece of advanced technology work.",
      ru: "Группа супермутантов пытается разобраться с неработающей продвинутой техникой.",
      uk: "Група супермутантів намагається змусити працювати складну довоєнну техніку.",
      pl: "Grupa supermutantów próbuje uruchomić zaawansowane urządzenie.",
    },
  },
  {
    id: "official_weird_rickshaw", rollMin: 15, rollMax: 17, type: "weird", bestiaryRefs: [], groupSize: "unspecified",
    texts: {
      en: "Settlers operating improvised rickshaw taxis offer the party transport for caps.",
      ru: "Поселенцы на самодельных рикшах предлагают группе поездку за крышки.",
      uk: "Поселенці на саморобних рикшах пропонують групі поїздку за кришки.",
      pl: "Osadnicy prowadzący prowizoryczne riksze oferują drużynie przejazd za kapsle.",
    },
  },
  {
    id: "official_weird_vault_dweller", rollMin: 18, rollMax: 20, type: "weird", bestiaryRefs: [], groupSize: 1,
    texts: {
      en: "A Vault Dweller from an unknown vault asks the group for parts needed by their home.",
      ru: "Житель ранее неизвестного убежища просит детали, необходимые его убежищу.",
      uk: "Мешканець раніше невідомого сховища просить деталі, потрібні його сховищу.",
      pl: "Mieszkaniec nieznanego wcześniej schronu prosi o części potrzebne jego społeczności.",
    },
  },
].map((entry) => ({
  ...entry,
  rulesSource: "Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata)",
  rulesPage: 308,
  tableName: "Random Weird Wasteland Encounters",
  generationSource: "core_rulebook_official",
}));

// Existing application-authored fallback table. It is intentionally kept for regions
// for which the currently loaded Core Rulebook does not provide a regional d20 table.
export const APP_CUSTOM_ENCOUNTERS = [
  { id: "ammo_crate", type: "loot", weight: 8, textKey: "encounters.commonwealth.ammo_crate" },
  { id: "nuka_fridge", type: "loot", weight: 6, textKey: "encounters.commonwealth.nuka_fridge" },
  { id: "metro_station", type: "location", weight: 7, textKey: "encounters.commonwealth.metro_station" },
  { id: "cave", type: "location", weight: 7, textKey: "encounters.commonwealth.cave" },
  { id: "west_tek_building", type: "location", weight: 4, textKey: "encounters.commonwealth.west_tek_building" },
  { id: "bus_station", type: "location", weight: 5, textKey: "encounters.commonwealth.bus_station" },
  { id: "mine", type: "location", weight: 5, textKey: "encounters.commonwealth.mine" },
  { id: "super_duper_mart", type: "location", weight: 6, textKey: "encounters.commonwealth.super_duper_mart" },
  { id: "raider_outpost", type: "location", weight: 6, textKey: "encounters.commonwealth.raider_outpost" },
  { id: "mutant_outpost", type: "location", weight: 5, textKey: "encounters.commonwealth.mutant_outpost" },
  { id: "bos_outpost", type: "location", weight: 4, textKey: "encounters.commonwealth.bos_outpost" },
  { id: "ncr_outpost", type: "location", weight: 4, textKey: "encounters.commonwealth.ncr_outpost" },
  { id: "settlement", type: "location", weight: 7, textKey: "encounters.commonwealth.settlement" },
  { id: "wasteland_nothing", type: "location", weight: 8, textKey: "encounters.commonwealth.wasteland_nothing" },
  { id: "ambush", type: "ambush", weight: 10, textKey: "encounters.commonwealth.ambush" },
  { id: "rad_waste_pit", type: "trap", weight: 4, textKey: "encounters.commonwealth.rad_waste_pit" },
  { id: "lost_supplies", type: "trap", weight: 3, textKey: "encounters.commonwealth.lost_supplies" },
  { id: "broken_backpack", type: "trap", weight: 3, textKey: "encounters.commonwealth.broken_backpack" },
  { id: "fatal_breakdown", type: "trap", weight: 3, textKey: "encounters.commonwealth.fatal_breakdown" },
  { id: "food_poisoning", type: "trap", weight: 3, textKey: "encounters.commonwealth.food_poisoning" },
  { id: "hunger_crash", type: "trap", weight: 3, textKey: "encounters.commonwealth.hunger_crash" },
  { id: "toxic_puddle", type: "trap", weight: 3, textKey: "encounters.commonwealth.toxic_puddle" },
  { id: "pickpocket", type: "trap", weight: 2, textKey: "encounters.commonwealth.pickpocket" },
  { id: "building_collapse", type: "trap", weight: 4, textKey: "encounters.commonwealth.building_collapse" },
  { id: "radioactive_puddle", type: "trap", weight: 4, textKey: "encounters.commonwealth.radioactive_puddle" },
  { id: "grenade_tripwire", type: "trap", weight: 2, textKey: "encounters.commonwealth.grenade_tripwire" },
  { id: "stuck_in_textures", type: "trap", weight: 1, textKey: "encounters.commonwealth.stuck_in_textures" },
  { id: "overload", type: "trap", weight: 2, textKey: "encounters.commonwealth.overload" },
].map((entry) => ({ ...entry, generationSource: "app_custom" }));

// Backward-compatible exports for older imports.
export const COMMONWEALTH_ENCOUNTERS = APP_CUSTOM_ENCOUNTERS;
export const WEIRD_WASTELAND_ENCOUNTERS = OFFICIAL_WEIRD_WASTELAND_ENCOUNTERS;
