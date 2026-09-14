const SUPPORTED_LANGUAGES = new Set(["en", "ru", "uk", "pl"]);

export const PROCEDURAL_QUEST_TYPES = Object.freeze({
  holdout: {
    id: "holdout",
    compatible: ["defense", "repair", "escape"],
  },
  rescue: {
    id: "rescue",
    compatible: ["infiltration", "escort", "escape"],
  },
  escort: {
    id: "escort",
    compatible: ["rescue", "defense", "escape"],
  },
  elimination: {
    id: "elimination",
    compatible: ["investigation", "infiltration", "escape"],
  },
  hunt: {
    id: "hunt",
    compatible: ["investigation", "search", "escape"],
  },
  investigation: {
    id: "investigation",
    compatible: ["search", "hunt", "elimination", "repair"],
  },
  search: {
    id: "search",
    compatible: ["investigation", "infiltration", "escape"],
  },
  repair: {
    id: "repair",
    compatible: ["defense", "holdout", "search"],
  },
  defense: {
    id: "defense",
    compatible: ["holdout", "repair", "escort"],
  },
  infiltration: {
    id: "infiltration",
    compatible: ["rescue", "sabotage", "search", "elimination", "escape"],
  },
  sabotage: {
    id: "sabotage",
    compatible: ["infiltration", "escape", "elimination"],
  },
  escape: {
    id: "escape",
    compatible: ["rescue", "escort", "sabotage", "holdout", "search"],
  },
});

const TEXT = {
  en: {
    title: {
      holdout: "Hold the Line",
      rescue: "Hostage Rescue",
      escort: "Safe Passage",
      elimination: "Remove the Threat",
      hunt: "Hunt the Threat",
      investigation: "What Happened Here?",
      search: "Search the Area",
      repair: "Bring It Back Online",
      defense: "Protect the Objective",
      infiltration: "Get Inside",
      sabotage: "Break Their Advantage",
      escape: "Get Out Alive",
    },
    intro: {
      holdout: "The position is about to come under pressure. Prepare the area and survive the attack.",
      rescue: "Someone is being held in the area. Find them before the situation gets worse.",
      escort: "Someone must be brought safely through this area.",
      elimination: "There is a dangerous presence here that must be dealt with.",
      hunt: "Something unusually dangerous is operating nearby. Follow the evidence and find it.",
      investigation: "Something has changed here recently. Work out what happened without assuming the answer too early.",
      search: "Something important is believed to be somewhere in this area. Search carefully.",
      repair: "A useful system in this area is offline. Find it and restore it if possible.",
      defense: "A person, object or position here must remain intact while the threat develops.",
      infiltration: "The objective lies beyond hostile ground. Find a way in without giving away more than necessary.",
      sabotage: "A hostile asset in this area is giving the enemy an advantage. Reach it and disable it.",
      escape: "Staying here is becoming more dangerous. Find a viable route out.",
    },
    objectives: {
      investigate: "Inspect the area and collect enough evidence to understand the situation.",
      locateTarget: "Locate the real target without relying on information the characters have not discovered.",
      defeatTarget: "Neutralize the identified threat.",
      clearHostiles: "Neutralize the hostile force controlling the area.",
      hold: "Hold the position through {count} pressure waves.",
      rescueLocate: "Find where the captives are being held.",
      rescueFree: "Free the captives.",
      escort: "Bring the protected character to a safe exit.",
      search: "Search likely rooms, markers or points of interest for the objective.",
      repairLocate: "Locate the damaged or inactive system.",
      repair: "Restore the system to working order.",
      defend: "Keep the protected objective intact until the danger passes.",
      infiltrate: "Reach the target area without unnecessarily alerting the whole location.",
      sabotageLocate: "Locate the hostile device or infrastructure target.",
      sabotage: "Disable or destroy the target.",
      escape: "Reach a safe exit from the encounter area.",
      discoverExit: "Identify a viable exit route.",
      clue: "Follow environmental clues before the hidden threat is fully revealed.",
    },
    optional: {
      quiet: "Avoid raising a general alarm before reaching the primary objective.",
      clues: "Identify the nature of the threat from environmental evidence before direct contact.",
      supplies: "Recover useful supplies or records while completing the main objective.",
      protect: "Complete the objective without losing the protected NPC or object.",
    },
  },
  ru: {
    title: {
      holdout: "Выдержать нападение",
      rescue: "Спасти заложников",
      escort: "Безопасный путь",
      elimination: "Устранить угрозу",
      hunt: "Охота",
      investigation: "Что здесь произошло?",
      search: "Обыскать территорию",
      repair: "Вернуть систему в строй",
      defense: "Защитить цель",
      infiltration: "Проникновение",
      sabotage: "Диверсия",
      escape: "Выбраться живыми",
    },
    intro: {
      holdout: "Позиция скоро окажется под давлением. Подготовьте территорию и выдержите нападение.",
      rescue: "Кого-то удерживают в этой области. Найдите пленников, пока ситуация не стала хуже.",
      escort: "Кого-то необходимо безопасно провести через эту территорию.",
      elimination: "Здесь присутствует опасная сила, с которой придётся разобраться.",
      hunt: "Поблизости действует нечто особенно опасное. Идите по следам и найдите цель.",
      investigation: "Здесь недавно что-то изменилось. Выясните, что произошло, не делая преждевременных выводов.",
      search: "Где-то в этой области находится важная цель или предмет. Территорию придётся тщательно обыскать.",
      repair: "Полезная система здесь не работает. Найдите её и попытайтесь восстановить.",
      defense: "Человек, объект или позиция должны уцелеть, пока развивается угроза.",
      infiltration: "Цель находится за враждебной территорией. Найдите путь внутрь и не поднимайте лишнюю тревогу.",
      sabotage: "Вражеский объект даёт противнику преимущество. Доберитесь до него и выведите из строя.",
      escape: "Оставаться здесь становится всё опаснее. Найдите безопасный путь наружу.",
    },
    objectives: {
      investigate: "Исследовать область и собрать достаточно улик, чтобы понять ситуацию.",
      locateTarget: "Найти настоящую цель, не используя ещё не открытую персонажами информацию.",
      defeatTarget: "Нейтрализовать обнаруженную угрозу.",
      clearHostiles: "Нейтрализовать враждебную силу, контролирующую область.",
      hold: "Удержать позицию в течение {count} волн нападения.",
      rescueLocate: "Найти место, где удерживают заложников.",
      rescueFree: "Освободить заложников.",
      escort: "Довести защищаемого персонажа до безопасного выхода.",
      search: "Обыскать подходящие комнаты, метки и точки интереса в поисках цели.",
      repairLocate: "Найти повреждённую или отключённую систему.",
      repair: "Восстановить работу системы.",
      defend: "Сохранить защищаемую цель до окончания угрозы.",
      infiltrate: "Добраться до целевой области, не поднимая общую тревогу без необходимости.",
      sabotageLocate: "Найти вражеское устройство или инфраструктурную цель.",
      sabotage: "Вывести цель из строя или уничтожить её.",
      escape: "Добраться до безопасного выхода из зоны энкаунтера.",
      discoverExit: "Найти подходящий путь для отхода.",
      clue: "Следовать подсказкам окружения, пока скрытая угроза ещё не раскрыта полностью.",
    },
    optional: {
      quiet: "Не поднимать общую тревогу до достижения основной цели.",
      clues: "Определить характер угрозы по следам окружения до прямого контакта.",
      supplies: "Найти полезные припасы или записи по пути к основной цели.",
      protect: "Выполнить задачу, не потеряв защищаемого NPC или объект.",
    },
  },
  uk: {
    title: {
      holdout: "Витримати напад",
      rescue: "Врятувати заручників",
      escort: "Безпечний шлях",
      elimination: "Усунути загрозу",
      hunt: "Полювання",
      investigation: "Що тут сталося?",
      search: "Обшукати територію",
      repair: "Повернути систему до роботи",
      defense: "Захистити ціль",
      infiltration: "Проникнення",
      sabotage: "Диверсія",
      escape: "Вибратися живими",
    },
    intro: {
      holdout: "Позиція скоро опиниться під тиском. Підготуйте територію та витримайте напад.",
      rescue: "Когось утримують у цій зоні. Знайдіть полонених, доки ситуація не погіршилася.",
      escort: "Когось потрібно безпечно провести через цю територію.",
      elimination: "Тут є небезпечна сила, з якою доведеться розібратися.",
      hunt: "Поблизу діє щось особливо небезпечне. Ідіть за слідами та знайдіть ціль.",
      investigation: "Тут нещодавно щось змінилося. З'ясуйте, що сталося, не роблячи передчасних висновків.",
      search: "Десь у цій зоні є важлива ціль або предмет. Територію треба ретельно обшукати.",
      repair: "Корисна система тут не працює. Знайдіть її та спробуйте відновити.",
      defense: "Людина, об'єкт або позиція мають вціліти, поки розвивається загроза.",
      infiltration: "Ціль лежить за ворожою територією. Знайдіть шлях усередину та не здіймайте зайвої тривоги.",
      sabotage: "Ворожий об'єкт дає противнику перевагу. Дістаньтеся до нього та виведіть з ладу.",
      escape: "Залишатися тут стає дедалі небезпечніше. Знайдіть безпечний шлях назовні.",
    },
    objectives: {
      investigate: "Дослідити зону та зібрати достатньо доказів, щоб зрозуміти ситуацію.",
      locateTarget: "Знайти справжню ціль, не використовуючи ще не відкриту персонажами інформацію.",
      defeatTarget: "Нейтралізувати виявлену загрозу.",
      clearHostiles: "Нейтралізувати ворожу силу, що контролює зону.",
      hold: "Утримати позицію протягом {count} хвиль нападу.",
      rescueLocate: "Знайти місце, де утримують заручників.",
      rescueFree: "Звільнити заручників.",
      escort: "Довести захищуваного персонажа до безпечного виходу.",
      search: "Обшукати відповідні кімнати, мітки та точки інтересу в пошуках цілі.",
      repairLocate: "Знайти пошкоджену або вимкнену систему.",
      repair: "Відновити роботу системи.",
      defend: "Зберегти захищувану ціль до завершення загрози.",
      infiltrate: "Дістатися цільової зони, не здіймаючи загальної тривоги без потреби.",
      sabotageLocate: "Знайти ворожий пристрій або інфраструктурну ціль.",
      sabotage: "Вивести ціль з ладу або знищити її.",
      escape: "Дістатися безпечного виходу із зони енкаунтера.",
      discoverExit: "Знайти придатний шлях для відступу.",
      clue: "Йти за підказками оточення, доки прихована загроза ще не розкрита повністю.",
    },
    optional: {
      quiet: "Не здіймати загальної тривоги до досягнення основної цілі.",
      clues: "Визначити характер загрози за слідами оточення до прямого контакту.",
      supplies: "Знайти корисні припаси або записи під час виконання основної цілі.",
      protect: "Виконати завдання, не втративши захищуваного NPC або об'єкт.",
    },
  },
  pl: {
    title: {
      holdout: "Przetrwać atak",
      rescue: "Uratować zakładników",
      escort: "Bezpieczne przejście",
      elimination: "Usunąć zagrożenie",
      hunt: "Polowanie",
      investigation: "Co się tutaj stało?",
      search: "Przeszukać teren",
      repair: "Przywrócić system",
      defense: "Obronić cel",
      infiltration: "Infiltracja",
      sabotage: "Sabotaż",
      escape: "Wydostać się żywym",
    },
    intro: {
      holdout: "Pozycja wkrótce znajdzie się pod presją. Przygotuj teren i przetrwaj atak.",
      rescue: "Ktoś jest przetrzymywany na tym terenie. Znajdź jeńców, zanim sytuacja się pogorszy.",
      escort: "Kogoś trzeba bezpiecznie przeprowadzić przez ten teren.",
      elimination: "Znajduje się tu niebezpieczna siła, z którą trzeba się uporać.",
      hunt: "W pobliżu działa coś wyjątkowo niebezpiecznego. Podążaj za śladami i znajdź cel.",
      investigation: "Coś tutaj niedawno się zmieniło. Ustal, co się stało, bez zbyt wczesnych założeń.",
      search: "Gdzieś na tym obszarze znajduje się ważny cel lub przedmiot. Dokładnie przeszukaj teren.",
      repair: "Przydatny system jest wyłączony. Znajdź go i spróbuj przywrócić działanie.",
      defense: "Osoba, obiekt lub pozycja muszą przetrwać rozwijające się zagrożenie.",
      infiltration: "Cel znajduje się za wrogim terenem. Znajdź drogę do środka i unikaj zbędnego alarmu.",
      sabotage: "Wrogi obiekt daje przeciwnikowi przewagę. Dotrzyj do niego i go wyłącz.",
      escape: "Pozostanie tutaj staje się coraz bardziej niebezpieczne. Znajdź bezpieczną drogę wyjścia.",
    },
    objectives: {
      investigate: "Zbadaj obszar i zbierz wystarczająco dużo dowodów, aby zrozumieć sytuację.",
      locateTarget: "Znajdź prawdziwy cel bez korzystania z informacji, których postacie jeszcze nie odkryły.",
      defeatTarget: "Zneutralizuj rozpoznane zagrożenie.",
      clearHostiles: "Zneutralizuj wrogą siłę kontrolującą obszar.",
      hold: "Utrzymaj pozycję przez {count} fal ataku.",
      rescueLocate: "Znajdź miejsce przetrzymywania zakładników.",
      rescueFree: "Uwolnij zakładników.",
      escort: "Doprowadź chronioną postać do bezpiecznego wyjścia.",
      search: "Przeszukaj odpowiednie pomieszczenia, znaczniki i punkty zainteresowania.",
      repairLocate: "Znajdź uszkodzony lub wyłączony system.",
      repair: "Przywróć działanie systemu.",
      defend: "Utrzymaj chroniony cel do końca zagrożenia.",
      infiltrate: "Dotrzyj do obszaru celu bez niepotrzebnego wszczynania ogólnego alarmu.",
      sabotageLocate: "Znajdź wrogie urządzenie lub cel infrastrukturalny.",
      sabotage: "Wyłącz lub zniszcz cel.",
      escape: "Dotrzyj do bezpiecznego wyjścia z obszaru spotkania.",
      discoverExit: "Znajdź możliwą drogę odwrotu.",
      clue: "Podążaj za wskazówkami otoczenia, zanim ukryte zagrożenie zostanie w pełni ujawnione.",
    },
    optional: {
      quiet: "Nie wszczynaj ogólnego alarmu przed dotarciem do głównego celu.",
      clues: "Rozpoznaj naturę zagrożenia po śladach otoczenia przed bezpośrednim kontaktem.",
      supplies: "Odzyskaj przydatne zapasy lub zapiski podczas wykonywania głównego celu.",
      protect: "Wykonaj zadanie bez utraty chronionego NPC lub obiektu.",
    },
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.has(code) ? code : "en";
}

function hashSeed(value) {
  const text = String(value || "quest");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function replaceCount(text, count) {
  return String(text || "").replace("{count}", String(count));
}

function normalizedMarkerText(areas = [], markers = []) {
  return [
    ...markers.map((marker) => `${marker?.label || ""} ${marker?.name || ""} ${marker?.type || ""} ${marker?.roomId || ""}`),
    ...areas.flatMap((area) => [
      area?.name,
      area?.description,
      ...(Array.isArray(area?.markers) ? area.markers : []),
    ]),
  ].filter(Boolean).join(" ").toLowerCase();
}

function hasCaptiveSignal(areas = [], placedTokens = []) {
  const tokenMatch = placedTokens.some((token) => {
    const stats = token?.stats || {};
    const source = `${token?.name || ""} ${stats.role || ""} ${stats.generatedRole || ""} ${stats.status || ""}`.toLowerCase();
    return /hostage|captive|prisoner|залож|плен|заруч|jeniec|zakładnik/.test(source);
  });
  if (tokenMatch) return true;
  return areas.some((area) => {
    const source = `${area?.name || ""} ${area?.description || ""} ${(area?.markers || []).join(" ")}`.toLowerCase();
    return /hostage|captive|prisoner|залож|плен|заруч|jeniec|zakładnik/.test(source);
  });
}

function friendlyCount(areas = [], placedTokens = []) {
  const placed = placedTokens.filter((token) => String(token?.stats?.generatedDisposition || "hostile").toLowerCase() === "friendly").length;
  const generated = areas.reduce((sum, area) => sum + (area?.generatedOccupants || []).filter((item) => String(item?.disposition || "").toLowerCase() === "friendly").reduce((n, item) => n + Math.max(1, Number(item?.count || 1)), 0), 0);
  return placed + generated;
}

function notableEnemyCount(enemyGroups = []) {
  return enemyGroups.reduce((sum, group) => sum + (group?.enemies || []).filter((enemy) => /special|legendary|boss/i.test(String(enemy?.rank || ""))).length, 0);
}

function capabilityProfile({ areas = [], markers = [], enemyGroups = [], placedTokens = [] } = {}) {
  const hostileCount = enemyGroups.reduce((sum, group) => sum + (group?.enemies?.length || 0), 0);
  const markerText = normalizedMarkerText(areas, markers);
  const friendlies = friendlyCount(areas, placedTokens);
  const captives = hasCaptiveSignal(areas, placedTokens);
  const notable = notableEnemyCount(enemyGroups);
  const hasSystem = /terminal|generator|power|radio|relay|console|pump|turret|reactor|термин|генератор|радио|насос|турел|термін|генератор|pompa/.test(markerText);
  const hasSabotageTarget = /generator|radio|relay|turret|reactor|armory|fuel|генератор|радио|турел|арсен|палив|paliw/.test(markerText);
  const hasSearchTarget = /safe|cache|stash|med|storage|office|terminal|сейф|тайник|мед|склад|схов|sejf|magazyn/.test(markerText);
  const multipleAreas = areas.length >= 2;

  return {
    hostileCount,
    friendlies,
    captives,
    notable,
    hasSystem,
    hasSabotageTarget,
    hasSearchTarget,
    multipleAreas,
  };
}

function scoreQuestTypes(profile) {
  const scores = {
    investigation: 28,
    search: profile.hasSearchTarget ? 32 : 18,
    elimination: profile.hostileCount > 0 ? 30 : 0,
    holdout: profile.hostileCount >= 3 ? 18 + Math.min(12, profile.hostileCount) : 0,
    rescue: profile.captives ? 50 : 0,
    escort: profile.friendlies > 0 ? 22 : 0,
    hunt: profile.notable > 0 ? 48 : profile.hostileCount > 0 ? 8 : 0,
    repair: profile.hasSystem ? 34 : 0,
    defense: profile.hostileCount > 0 && (profile.friendlies > 0 || profile.hasSystem) ? 28 : 0,
    infiltration: profile.hostileCount > 0 && profile.multipleAreas ? 24 : 0,
    sabotage: profile.hostileCount > 0 && profile.hasSabotageTarget ? 35 : 0,
    escape: profile.hostileCount > 0 && profile.multipleAreas ? 16 : 0,
  };
  return scores;
}

function weightedPick(scores, random, excluded = new Set()) {
  const entries = Object.entries(scores).filter(([id, score]) => score > 0 && !excluded.has(id));
  const total = entries.reduce((sum, [, score]) => sum + score, 0);
  if (!entries.length || total <= 0) return "investigation";
  let roll = random() * total;
  for (const [id, score] of entries) {
    roll -= score;
    if (roll <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

function pickSecondary(primary, scores, random) {
  const compatible = new Set(PROCEDURAL_QUEST_TYPES[primary]?.compatible || []);
  const candidates = Object.fromEntries(Object.entries(scores).filter(([id, score]) => compatible.has(id) && score > 0));
  if (!Object.keys(candidates).length) return [];

  const chance = primary === "investigation" || primary === "search" ? 0.58 : 0.72;
  if (random() > chance) return [];
  const first = weightedPick(candidates, random, new Set([primary]));
  if (!first || first === primary) return [];

  const result = [first];
  if (random() < 0.22) {
    const secondAllowed = new Set(PROCEDURAL_QUEST_TYPES[first]?.compatible || []);
    const secondCandidates = Object.fromEntries(Object.entries(scores).filter(([id, score]) => id !== primary && id !== first && compatible.has(id) && secondAllowed.has(id) && score > 0));
    if (Object.keys(secondCandidates).length) result.push(weightedPick(secondCandidates, random, new Set([primary, first])));
  }
  return result;
}

function makeObjective(id, type, text, extra = {}) {
  return {
    id,
    type,
    text,
    status: "pending",
    hidden: false,
    ...extra,
  };
}

function objectivesFor(type, text, profile, seed, prefix = "primary") {
  const waveCount = 2 + (hashSeed(`${seed}:waves`) % 3);
  switch (type) {
    case "holdout":
      return [makeObjective(`${prefix}-hold`, "holdout", replaceCount(text.objectives.hold, waveCount), { requiredWaves: waveCount, progress: 0 })];
    case "rescue":
      return [
        makeObjective(`${prefix}-locate-captives`, "discover", text.objectives.rescueLocate),
        makeObjective(`${prefix}-free-captives`, "rescue", text.objectives.rescueFree, { dependsOn: `${prefix}-locate-captives` }),
      ];
    case "escort":
      return [makeObjective(`${prefix}-escort`, "escort", text.objectives.escort)];
    case "elimination":
      return [makeObjective(`${prefix}-eliminate`, "elimination", text.objectives.clearHostiles, { required: Math.max(1, profile.hostileCount), progress: 0 })];
    case "hunt":
      return [
        makeObjective(`${prefix}-track`, "investigation", text.objectives.clue),
        makeObjective(`${prefix}-locate-target`, "discover", text.objectives.locateTarget, { dependsOn: `${prefix}-track` }),
        makeObjective(`${prefix}-defeat-target`, "hunt", text.objectives.defeatTarget, { dependsOn: `${prefix}-locate-target` }),
      ];
    case "investigation":
      return [makeObjective(`${prefix}-investigate`, "investigation", text.objectives.investigate, { requiredClues: 2, progress: 0 })];
    case "search":
      return [makeObjective(`${prefix}-search`, "search", text.objectives.search)];
    case "repair":
      return [
        makeObjective(`${prefix}-locate-system`, "discover", text.objectives.repairLocate),
        makeObjective(`${prefix}-repair`, "repair", text.objectives.repair, { dependsOn: `${prefix}-locate-system` }),
      ];
    case "defense":
      return [makeObjective(`${prefix}-defend`, "defense", text.objectives.defend)];
    case "infiltration":
      return [makeObjective(`${prefix}-infiltrate`, "infiltration", text.objectives.infiltrate)];
    case "sabotage":
      return [
        makeObjective(`${prefix}-locate-sabotage`, "discover", text.objectives.sabotageLocate),
        makeObjective(`${prefix}-sabotage`, "sabotage", text.objectives.sabotage, { dependsOn: `${prefix}-locate-sabotage` }),
      ];
    case "escape":
      return [
        makeObjective(`${prefix}-find-exit`, "discover", text.objectives.discoverExit),
        makeObjective(`${prefix}-escape`, "escape", text.objectives.escape, { dependsOn: `${prefix}-find-exit` }),
      ];
    default:
      return [makeObjective(`${prefix}-investigate`, "investigation", text.objectives.investigate)];
  }
}

function optionalObjectives(primary, secondaries, text) {
  const all = new Set([primary, ...secondaries]);
  const result = [];
  if (all.has("infiltration") || all.has("sabotage")) result.push(makeObjective("optional-quiet", "optional", text.optional.quiet, { optional: true }));
  if (all.has("investigation") || all.has("hunt")) result.push(makeObjective("optional-clues", "optional", text.optional.clues, { optional: true }));
  if (all.has("rescue") || all.has("escort") || all.has("defense")) result.push(makeObjective("optional-protect", "optional", text.optional.protect, { optional: true }));
  result.push(makeObjective("optional-supplies", "optional", text.optional.supplies, { optional: true }));
  return result.slice(0, 2);
}

function linkedAreaIds(areas = []) {
  return areas.map((area) => String(area?.id || "")).filter(Boolean);
}

function linkedMarkerIds(markers = []) {
  return markers.map((marker, index) => String(marker?.id || marker?.roomId || marker?.number || `marker-${index + 1}`)).filter(Boolean);
}

export function generateProceduralQuest({
  areas = [],
  markers = [],
  enemyGroups = [],
  placedTokens = [],
  language = "en",
  seed = "quest",
  locationType = "unknown",
} = {}) {
  const lang = languageCode(language);
  const text = TEXT[lang] || TEXT.en;
  const profile = capabilityProfile({ areas, markers, enemyGroups, placedTokens });
  const scores = scoreQuestTypes(profile);
  const random = seededRandom(`${seed}:${locationType}:quest-v2`);
  const primaryType = weightedPick(scores, random);
  const secondaryTypes = pickSecondary(primaryType, scores, random);

  const primaryObjectives = objectivesFor(primaryType, text, profile, seed, "primary");
  const secondaryObjectives = secondaryTypes.flatMap((type, index) => objectivesFor(type, text, profile, `${seed}:${type}`, `secondary-${index + 1}`));
  const optional = optionalObjectives(primaryType, secondaryTypes, text);
  const objectives = [...primaryObjectives, ...secondaryObjectives, ...optional];

  return {
    version: 2,
    id: `quest-${hashSeed(`${seed}:${locationType}:${primaryType}`).toString(36)}`,
    status: "active",
    primaryType,
    secondaryTypes,
    title: text.title[primaryType] || text.title.investigation,
    intro: text.intro[primaryType] || text.intro.investigation,
    stages: ["hook", "explore", "discovery", "confrontation", "resolution"],
    currentStage: "hook",
    objectives,
    primaryObjectiveIds: primaryObjectives.map((item) => item.id),
    optionalObjectiveIds: optional.map((item) => item.id),
    encounterLinks: {
      areaIds: linkedAreaIds(areas),
      markerIds: linkedMarkerIds(markers),
      enemyGroupIds: enemyGroups.map((group) => String(group?.id || "")).filter(Boolean),
    },
    playerKnowledge: {
      discoveredAreaIds: [],
      discoveredMarkerIds: [],
      discoveredEnemyGroupIds: [],
      discoveredClueIds: [],
      knownQuestFacts: [],
    },
    gmRules: {
      doNotRevealHiddenEnemies: true,
      doNotRevealUndiscoveredAreas: true,
      doNotRevealQuestSolution: true,
      revealThroughPlayerKnowledgeOnly: true,
    },
    generation: {
      seed: String(seed || "quest"),
      locationType: String(locationType || "unknown"),
      capabilityProfile: profile,
      typeScores: scores,
    },
  };
}

export function isQuestTypeCompatible(primaryType, secondaryType) {
  return (PROCEDURAL_QUEST_TYPES[primaryType]?.compatible || []).includes(secondaryType);
}
