import { generateLocalizedProceduralRooms, generateProceduralRoomData } from "./proceduralRoomContent.js";
import { getProceduralRoomBounds } from "./proceduralRoomLayout.js";
import {
  generateRedRocketRoomMarkers,
  generateSettlementRoomMarkers,
  generateSuperDuperMartRoomMarkers,
} from "./proceduralSettlementRoomMarkers.js";

function code(value) {
  const lang = String(value || "en").toLowerCase().split("-")[0];
  return ["en", "ru", "uk", "pl"].includes(lang) ? lang : "en";
}

function enemyFamily(token = {}) {
  const stats = token.stats || {};
  const source = `${token.name || ""} ${stats.creatureType || ""} ${stats.generatedEnemyGroup || ""}`.toLowerCase();
  if (/mongrel|dog|hound|canine/.test(source)) return "canine";
  if (/raider/.test(source)) return "raider";
  if (/super.?mutant|nightkin/.test(source)) return "super_mutant";
  if (/ghoul|feral|glowing one/.test(source)) return "ghoul";
  if (/robot|turret|protectron|assaultron|eyebot|sentry|gutsy/.test(source)) return "robot";
  if (/mirelurk/.test(source)) return "mirelurk";
  if (/radroach|bloatfly|bloodbug|stingwing|radscorpion|insect/.test(source)) return "insect";
  if (/deathclaw|yao guai|mole rat|creature|beast/.test(source)) return "beast";
  return "unknown";
}

const CLUES = {
  canine: [
    "There is a damp animal smell in the air, reminiscent of wet fur.",
    "The dust is broken by overlapping four-legged tracks.",
    "A faint scratching sound comes from somewhere beyond sight.",
  ],
  raider: [
    "The air carries a trace of recent smoke and poorly burned tobacco.",
    "Some of the makeshift cover looks as if it was moved very recently.",
    "Fresh boot marks cross older dust without an obvious destination.",
  ],
  super_mutant: [
    "Several unusually deep footprints press into the dirt and debris.",
    "A door frame nearby is bent as though something heavy forced its way through.",
    "From deeper inside comes a dull impact, then silence.",
  ],
  ghoul: [
    "A stale, sour smell hangs in the still air.",
    "There are irregular drag marks and disturbed dust near the darker passages.",
    "A dry scraping sound briefly echoes and stops when the area grows quiet.",
  ],
  robot: [
    "There is a faint smell of ozone and heated insulation.",
    "A quiet metallic tick repeats somewhere out of view.",
    "Old surfaces show a few surprisingly fresh straight-edged scratches.",
  ],
  mirelurk: [
    "The ground carries a briny, stagnant smell that does not match the surrounding air.",
    "Hard shell-like fragments lie among freshly disturbed debris.",
    "Something occasionally shifts with a wet scrape beyond direct sight.",
  ],
  insect: [
    "A faint dry clicking comes and goes beneath the ambient noise.",
    "Tiny clustered tracks disturb the dust around cracks and sheltered edges.",
    "The air has a sharp, slightly sweet organic smell.",
  ],
  beast: [
    "The ground bears fresh signs of a heavy animal passing through.",
    "Something has recently pushed aside debris that weather alone would not move.",
    "A low sound carries from beyond sight, too brief to identify with certainty.",
  ],
  unknown: [
    "Fresh tracks interrupt the older layer of dust and ash.",
    "Something nearby has disturbed debris recently.",
    "A brief sound from beyond sight suggests the place may not be empty.",
  ],
};

const QUEST_COPY = {
  en: {
    investigate: "Find out why this place has recently become unsafe and identify what happened here.",
    recover: "Search the area for useful supplies or records before leaving.",
    terminal: "Reach the terminal or communications point and recover any useful information.",
    meds: "Locate the medical supplies believed to remain somewhere in the area.",
    safe: "Find the secured cache and determine whether anything valuable survived inside.",
    intro: "Something here has changed recently. The signs are subtle, but the area does not feel abandoned.",
  },
  ru: {
    investigate: "Выяснить, почему это место недавно стало опасным, и понять, что здесь произошло.",
    recover: "Обыскать территорию и найти полезные припасы или записи перед уходом.",
    terminal: "Добраться до терминала или узла связи и извлечь полезную информацию.",
    meds: "Найти медицинские припасы, которые, предположительно, всё ещё находятся где-то здесь.",
    safe: "Найти защищённый тайник и проверить, сохранилось ли внутри что-нибудь ценное.",
    intro: "Здесь недавно что-то изменилось. Признаки едва заметны, но место не кажется по-настоящему заброшенным.",
  },
  uk: {
    investigate: "З'ясувати, чому це місце нещодавно стало небезпечним, і зрозуміти, що тут сталося.",
    recover: "Обшукати територію та знайти корисні припаси або записи перед відходом.",
    terminal: "Дістатися до термінала або вузла зв'язку та отримати корисну інформацію.",
    meds: "Знайти медичні припаси, які, ймовірно, досі залишаються десь тут.",
    safe: "Знайти захищений сховок і перевірити, чи вціліло всередині щось цінне.",
    intro: "Тут нещодавно щось змінилося. Ознаки ледь помітні, але місце не здається справді покинутим.",
  },
  pl: {
    investigate: "Ustal, dlaczego to miejsce ostatnio stało się niebezpieczne, i dowiedz się, co się tutaj wydarzyło.",
    recover: "Przeszukaj teren i znajdź przydatne zapasy lub zapiski przed odejściem.",
    terminal: "Dotrzyj do terminala lub punktu łączności i odzyskaj przydatne informacje.",
    meds: "Odszukaj zapasy medyczne, które prawdopodobnie wciąż znajdują się gdzieś na tym terenie.",
    safe: "Znajdź zabezpieczony schowek i sprawdź, czy przetrwało w nim coś cennego.",
    intro: "Coś tutaj niedawno się zmieniło. Ślady są subtelne, ale miejsce nie wydaje się naprawdę opuszczone.",
  },
};

function markerList(spec) {
  const type = String(spec?.type || "");
  if (type === "settlement") return generateSettlementRoomMarkers(spec);
  if (type === "red_rocket") return generateRedRocketRoomMarkers(spec);
  if (type === "super_duper_mart") return generateSuperDuperMartRoomMarkers(spec);
  return [];
}

function questFor(areas, language) {
  const t = QUEST_COPY[language] || QUEST_COPY.en;
  const markers = areas.flatMap((area) => area.markers || []).map((item) => String(item).toUpperCase());
  let objective = t.investigate;
  if (markers.some((m) => /TERMINAL/.test(m))) objective = t.terminal;
  else if (markers.some((m) => /MEDS|MEDKIT/.test(m))) objective = t.meds;
  else if (markers.some((m) => /SAFE/.test(m))) objective = t.safe;

  return {
    intro: t.intro,
    primaryObjective: objective,
    optionalObjectives: [t.recover],
    hiddenObjectives: ["Identify the real threat from environmental evidence before direct contact, if the players investigate carefully."],
    resolution: "Resolve the primary objective using the actual room/POI state and generated encounter truth; do not invent a contradictory faction or creature.",
  };
}

export function buildProceduralEncounterContext({ spec = {}, scene = {}, placedTokens = [], language = "en" } = {}) {
  const lang = code(language);
  const raw = generateProceduralRoomData(spec);
  const localized = generateLocalizedProceduralRooms(spec, lang);
  const boundsById = String(spec?.type || "") === "wasteland" ? {} : getProceduralRoomBounds(spec);
  const numbered = markerList(spec);
  const numberedByRoom = Object.fromEntries(numbered.map((m) => [m.roomId, m]));

  const areas = raw.map((area, index) => {
    const localizedArea = localized.find((item) => item.id === area.id) || localized[index] || {};
    const tokens = placedTokens.filter((token) => {
      const stats = token.stats || {};
      return String(stats.generatedRoomId || stats.generatedPoiId || "") === String(area.id);
    });
    return {
      id: area.id || `area-${index + 1}`,
      kind: String(spec?.type || "") === "wasteland" ? "poi" : "room",
      name: localizedArea.name || area.name || area.id || `Area ${index + 1}`,
      description: localizedArea.desc || localizedArea.description || localizedArea.lines || area.desc || area.description || "",
      position: Number.isFinite(Number(area.x)) && Number.isFinite(Number(area.y)) ? { x: Number(area.x), y: Number(area.y) } : null,
      bounds: boundsById[area.id] || numberedByRoom[area.id]?.bounds || null,
      numberedMarker: numberedByRoom[area.id] || null,
      markers: Array.isArray(area.markers) ? area.markers : [area.marker].filter(Boolean),
      houseId: area.houseId || "",
      houseType: area.houseType || "",
      disposition: area.disposition || "",
      generatedOccupants: [...(area.enemies || []), ...(area.residents || [])].map((item) => ({
        type: item.type || item.name || item.npcId || "unknown",
        npcId: item.npcId || "",
        count: Number(item.count || 0),
        rank: item.rank || "standard",
        disposition: item.disposition || area.disposition || "hostile",
        enemyGroup: item.enemyGroup || area.enemyGroup || "",
      })),
      placedTokens: tokens.map((token) => ({
        name: token.name || "NPC",
        x: Number(token.x),
        y: Number(token.y),
        rank: token.stats?.generatedEncounterRank || token.stats?.creatureRank || "standard",
        disposition: token.stats?.generatedDisposition || "hostile",
      })),
    };
  });

  const hostileTokens = placedTokens.filter((token) => String(token.stats?.generatedDisposition || "hostile").toLowerCase() !== "friendly");
  const groups = new Map();
  hostileTokens.forEach((token) => {
    const stats = token.stats || {};
    const locationId = stats.generatedRoomId || stats.generatedPoiId || "area";
    const family = enemyFamily(token);
    const key = `${locationId}:${family}:${stats.generatedEnemyGroup || ""}`;
    const group = groups.get(key) || { id: key, locationId, family, enemyGroup: stats.generatedEnemyGroup || "", enemies: [] };
    group.enemies.push({ name: token.name || "Enemy", x: Number(token.x), y: Number(token.y), rank: stats.generatedEncounterRank || stats.creatureRank || "standard" });
    groups.set(key, group);
  });

  const enemyGroups = [...groups.values()];
  const playerClues = enemyGroups.flatMap((group, index) => {
    const pool = CLUES[group.family] || CLUES.unknown;
    return pool.slice(index % 2, index % 2 + 2).map((text, clueIndex) => ({
      id: `${group.id}:clue-${clueIndex + 1}`,
      areaId: group.locationId,
      sense: clueIndex === 0 ? "smell_or_visual" : "sound_or_tracks",
      text,
      reveals: "presence of an unidentified nearby threat only; never reveal exact enemy type, count or position",
    }));
  }).slice(0, 8);

  return {
    version: 1,
    generatedAt: Date.now(),
    autoNarrateNonce: `${scene?.sceneId || "scene"}:${Date.now()}`,
    location: {
      type: spec.type || "unknown",
      terrain: spec.terrain || "",
      seed: spec.seed || "",
      sceneName: scene?.name || "",
    },
    areas,
    markers: numbered,
    quest: questFor(areas, lang),
    enemies: { groups: enemyGroups },
    gmTruth: {
      enemyGroups,
      exactEnemyCount: hostileTokens.length,
      exactEnemyPositions: hostileTokens.map((token) => ({
        name: token.name || "Enemy",
        areaId: token.stats?.generatedRoomId || token.stats?.generatedPoiId || "",
        x: Number(token.x),
        y: Number(token.y),
      })),
    },
    playerClues,
    gmSecrets: ["Enemy identities, counts and exact positions are secret until discovered by play."],
    revealedFacts: [],
    narrationPolicy: {
      sensoryFirst: true,
      neverRevealHiddenEnemyIdentity: true,
      neverRevealHiddenEnemyCount: true,
      neverRevealHiddenEnemyPosition: true,
      rule: "Player-facing narration may use playerClues and visible environment only. gmTruth, generatedOccupants and exact enemy positions are GM-only until revealedFacts explicitly expose them.",
    },
  };
}
