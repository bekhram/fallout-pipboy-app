const QUEST_TYPES = [
  "holdout",
  "rescue",
  "escort",
  "elimination",
  "hunt",
  "investigation",
  "search",
  "repair",
  "defense",
  "infiltration",
  "sabotage",
  "escape",
];

const COMPATIBLE = {
  holdout: ["defense", "repair", "escape"],
  rescue: ["infiltration", "escort", "escape"],
  escort: ["rescue", "defense", "escape"],
  elimination: ["investigation", "infiltration", "escape"],
  hunt: ["investigation", "search", "escape"],
  investigation: ["search", "hunt", "elimination", "repair"],
  search: ["investigation", "infiltration", "escape"],
  repair: ["defense", "holdout", "search"],
  defense: ["holdout", "repair", "escort"],
  infiltration: ["rescue", "sabotage", "search", "elimination", "escape"],
  sabotage: ["infiltration", "escape", "elimination"],
  escape: ["rescue", "escort", "sabotage", "holdout", "search"],
};

const TEXT = {
  en: {
    title: { holdout:"Hold the Line", rescue:"Hostage Rescue", escort:"Safe Passage", elimination:"Remove the Threat", hunt:"Hunt the Threat", investigation:"What Happened Here?", search:"Search the Area", repair:"Bring It Back Online", defense:"Protect the Objective", infiltration:"Get Inside", sabotage:"Break Their Advantage", escape:"Get Out Alive" },
    intro: { holdout:"The position is about to come under pressure. Prepare the area and survive the attack.", rescue:"Someone is being held in the area. Find them before the situation gets worse.", escort:"Someone must be brought safely through this area.", elimination:"There is a dangerous presence here that must be dealt with.", hunt:"Something unusually dangerous is operating nearby. Follow the evidence and find it.", investigation:"Something has changed here recently. Work out what happened without assuming the answer too early.", search:"Something important is believed to be somewhere in this area. Search carefully.", repair:"A useful system in this area is offline. Find it and restore it if possible.", defense:"A person, object or position here must remain intact while the threat develops.", infiltration:"The objective lies beyond hostile ground. Find a way in without giving away more than necessary.", sabotage:"A hostile asset in this area is giving the enemy an advantage. Reach it and disable it.", escape:"Staying here is becoming more dangerous. Find a viable route out." },
    obj: { holdout:"Hold the position through 3 pressure waves.", rescue:"Find and free the captives.", escort:"Bring the protected character to a safe exit.", elimination:"Neutralize the hostile force controlling the area.", hunt:"Follow the evidence, locate the real target and neutralize it.", investigation:"Inspect the area and collect enough evidence to understand the situation.", search:"Search likely rooms, markers or points of interest for the objective.", repair:"Locate the damaged system and restore it to working order.", defense:"Keep the protected objective intact until the danger passes.", infiltration:"Reach the target area without unnecessarily alerting the whole location.", sabotage:"Locate the hostile asset and disable or destroy it.", escape:"Identify a viable exit route and reach safety." },
  },
  ru: {
    title: { holdout:"Выдержать нападение", rescue:"Спасти заложников", escort:"Сопровождение", elimination:"Устранить угрозу", hunt:"Охота", investigation:"Расследование", search:"Поиск", repair:"Ремонт", defense:"Защита цели", infiltration:"Проникновение", sabotage:"Диверсия", escape:"Побег" },
    intro: { holdout:"Позиция скоро окажется под давлением. Подготовьте территорию и выдержите нападение.", rescue:"Кого-то удерживают в этой области. Найдите пленников, пока ситуация не стала хуже.", escort:"Кого-то необходимо безопасно провести через эту территорию.", elimination:"Здесь присутствует опасная сила, с которой придётся разобраться.", hunt:"Поблизости действует нечто особенно опасное. Идите по следам и найдите цель.", investigation:"Здесь недавно что-то изменилось. Выясните, что произошло, не делая преждевременных выводов.", search:"Где-то в этой области находится важная цель или предмет. Территорию придётся тщательно обыскать.", repair:"Полезная система здесь не работает. Найдите её и попытайтесь восстановить.", defense:"Человек, объект или позиция должны уцелеть, пока развивается угроза.", infiltration:"Цель находится за враждебной территорией. Найдите путь внутрь и не поднимайте лишнюю тревогу.", sabotage:"Вражеский объект даёт противнику преимущество. Доберитесь до него и выведите из строя.", escape:"Оставаться здесь становится всё опаснее. Найдите безопасный путь наружу." },
    obj: { holdout:"Удержать позицию в течение 3 волн нападения.", rescue:"Найти и освободить заложников.", escort:"Довести защищаемого персонажа до безопасного выхода.", elimination:"Нейтрализовать враждебную силу, контролирующую область.", hunt:"Идти по следам, найти настоящую цель и нейтрализовать её.", investigation:"Исследовать область и собрать достаточно улик, чтобы понять ситуацию.", search:"Обыскать подходящие комнаты, метки и точки интереса в поисках цели.", repair:"Найти повреждённую систему и восстановить её работу.", defense:"Сохранить защищаемую цель до окончания угрозы.", infiltration:"Добраться до целевой области, не поднимая общую тревогу без необходимости.", sabotage:"Найти вражеский объект и вывести его из строя или уничтожить.", escape:"Найти подходящий путь отхода и выбраться из зоны энкаунтера." },
  },
  uk: {
    title: { holdout:"Витримати напад", rescue:"Врятувати заручників", escort:"Супровід", elimination:"Усунути загрозу", hunt:"Полювання", investigation:"Розслідування", search:"Пошук", repair:"Ремонт", defense:"Захист цілі", infiltration:"Проникнення", sabotage:"Диверсія", escape:"Втеча" },
    intro: { holdout:"Позиція скоро опиниться під тиском. Підготуйте територію та витримайте напад.", rescue:"Когось утримують у цій зоні. Знайдіть полонених, доки ситуація не погіршилася.", escort:"Когось потрібно безпечно провести через цю територію.", elimination:"Тут є небезпечна сила, з якою доведеться розібратися.", hunt:"Поблизу діє щось особливо небезпечне. Ідіть за слідами та знайдіть ціль.", investigation:"Тут нещодавно щось змінилося. З'ясуйте, що сталося, не роблячи передчасних висновків.", search:"Десь у цій зоні є важлива ціль або предмет. Територію треба ретельно обшукати.", repair:"Корисна система тут не працює. Знайдіть її та спробуйте відновити.", defense:"Людина, об'єкт або позиція мають вціліти, поки розвивається загроза.", infiltration:"Ціль лежить за ворожою територією. Знайдіть шлях усередину та не здіймайте зайвої тривоги.", sabotage:"Ворожий об'єкт дає противнику перевагу. Дістаньтеся до нього та виведіть з ладу.", escape:"Залишатися тут стає дедалі небезпечніше. Знайдіть безпечний шлях назовні." },
    obj: { holdout:"Утримати позицію протягом 3 хвиль нападу.", rescue:"Знайти та звільнити заручників.", escort:"Довести захищуваного персонажа до безпечного виходу.", elimination:"Нейтралізувати ворожу силу, що контролює зону.", hunt:"Іти за слідами, знайти справжню ціль і нейтралізувати її.", investigation:"Дослідити зону та зібрати достатньо доказів, щоб зрозуміти ситуацію.", search:"Обшукати відповідні кімнати, мітки й точки інтересу в пошуках цілі.", repair:"Знайти пошкоджену систему та відновити її роботу.", defense:"Зберегти захищувану ціль до завершення загрози.", infiltration:"Дістатися цільової зони, не здіймаючи загальної тривоги без потреби.", sabotage:"Знайти ворожий об'єкт і вивести його з ладу або знищити.", escape:"Знайти шлях відступу та вибратися із зони енкаунтера." },
  },
  pl: {
    title: { holdout:"Utrzymaj pozycję", rescue:"Uratuj zakładników", escort:"Eskorta", elimination:"Usuń zagrożenie", hunt:"Polowanie", investigation:"Śledztwo", search:"Poszukiwanie", repair:"Naprawa", defense:"Obrona celu", infiltration:"Infiltracja", sabotage:"Sabotaż", escape:"Ucieczka" },
    intro: { holdout:"Pozycja wkrótce znajdzie się pod presją. Przygotuj teren i przetrwaj atak.", rescue:"Ktoś jest przetrzymywany w tej okolicy. Znajdź jeńców, zanim sytuacja się pogorszy.", escort:"Kogoś trzeba bezpiecznie przeprowadzić przez ten teren.", elimination:"W tym miejscu znajduje się niebezpieczne zagrożenie, którym trzeba się zająć.", hunt:"W pobliżu działa coś wyjątkowo niebezpiecznego. Podążaj za śladami i znajdź cel.", investigation:"Coś ostatnio się tutaj zmieniło. Ustal, co się wydarzyło, nie zakładając odpowiedzi zbyt wcześnie.", search:"Gdzieś w tej okolicy znajduje się ważny cel lub przedmiot. Przeszukaj teren dokładnie.", repair:"Przydatny system w tym miejscu nie działa. Znajdź go i przywróć do działania.", defense:"Osoba, obiekt lub pozycja muszą przetrwać rozwijające się zagrożenie.", infiltration:"Cel znajduje się za wrogim terenem. Znajdź drogę do środka bez wzbudzania zbędnego alarmu.", sabotage:"Wrogi obiekt daje przeciwnikowi przewagę. Dotrzyj do niego i wyłącz go.", escape:"Pozostanie tutaj staje się coraz bardziej niebezpieczne. Znajdź drogę ucieczki." },
    obj: { holdout:"Utrzymaj pozycję przez 3 fale ataku.", rescue:"Znajdź i uwolnij zakładników.", escort:"Doprowadź chronioną postać do bezpiecznego wyjścia.", elimination:"Zneutralizuj wrogą siłę kontrolującą teren.", hunt:"Podążaj za śladami, znajdź właściwy cel i zneutralizuj go.", investigation:"Zbadaj teren i zbierz wystarczająco dużo dowodów, aby zrozumieć sytuację.", search:"Przeszukaj odpowiednie pomieszczenia, znaczniki i punkty zainteresowania.", repair:"Znajdź uszkodzony system i przywróć go do działania.", defense:"Utrzymaj chroniony cel w całości do końca zagrożenia.", infiltration:"Dotrzyj do obszaru celu bez niepotrzebnego alarmowania całej lokacji.", sabotage:"Znajdź wrogi obiekt i wyłącz go lub zniszcz.", escape:"Znajdź możliwą drogę wyjścia i wydostań się z obszaru spotkania." },
  },
};

export function normalizeRequestedQuestType(value) {
  const type = String(value || "auto").toLowerCase();
  return QUEST_TYPES.includes(type) ? type : "auto";
}

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return TEXT[code] ? code : "en";
}

function makeObjective(type, description) {
  return {
    id: `primary-manual-${type}`,
    type,
    description,
    status: "active",
    optional: false,
    progress: 0,
  };
}

function secondaryFor(type, baseQuest) {
  const scores = baseQuest?.generation?.typeScores || {};
  return (COMPATIBLE[type] || [])
    .filter((candidate) => candidate !== type)
    .sort((a, b) => Number(scores[b] || 0) - Number(scores[a] || 0))
    .slice(0, 1);
}

export function applyRequestedQuestType(baseQuest, requestedType, language = "en") {
  const type = normalizeRequestedQuestType(requestedType);
  if (!baseQuest || type === "auto" || baseQuest.primaryType === type) {
    return baseQuest ? {
      ...baseQuest,
      generation: { ...(baseQuest.generation || {}), requestedType: type, selectionMode: type === "auto" ? "auto" : "manual" },
    } : baseQuest;
  }

  const lang = languageCode(language);
  const text = TEXT[lang] || TEXT.en;
  const secondaryTypes = secondaryFor(type, baseQuest);
  const optional = Array.isArray(baseQuest.objectives)
    ? baseQuest.objectives.filter((item) => item?.optional).slice(0, 2)
    : [];
  const primary = makeObjective(type, text.obj[type] || text.obj.investigation);

  return {
    ...baseQuest,
    id: `${baseQuest.id || "quest"}-manual-${type}`,
    primaryType: type,
    secondaryTypes,
    title: text.title[type] || text.title.investigation,
    intro: text.intro[type] || text.intro.investigation,
    objectives: [primary, ...optional],
    primaryObjectiveIds: [primary.id],
    currentStage: "hook",
    generation: {
      ...(baseQuest.generation || {}),
      requestedType: type,
      selectionMode: "manual",
      automaticPrimaryType: baseQuest.primaryType,
    },
  };
}

export const PROCEDURAL_QUEST_SELECTION_OPTIONS = ["auto", ...QUEST_TYPES];
