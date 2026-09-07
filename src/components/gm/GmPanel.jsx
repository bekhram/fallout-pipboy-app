import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDerivedStats } from "../../utils/characterMath.js";
import { getMapRegion, getRegionName } from "../../data/map/mapRegions.js";
import "./gmPanel.css";

const STORAGE_KEY = "fallout_pipboy_gm_panel_v1";

const COPY = {
  en: {
    title: "GM CONTROL PANEL",
    subtitle: "Fallout 2d20 session workspace",
    scene: "SCENE",
    initiative: "INITIATIVE",
    ap: "ACTION POINTS",
    dice: "DICE",
    journal: "GM JOURNAL",
    autoGm: "AUTOGM",
    context: "AUTOGM CONTEXT",
    map: "MAP",
    openMap: "OPEN MAP",
    sceneTitle: "Scene title",
    description: "Scene description / secret notes",
    sceneType: "Scene type",
    weather: "Weather",
    time: "Time",
    exploration: "Exploration",
    combat: "Combat",
    dialogue: "Dialogue",
    event: "Event",
    clear: "Clear",
    cloudy: "Cloudy",
    rain: "Rain",
    storm: "Storm",
    radstorm: "Radstorm",
    day: "Day",
    dusk: "Dusk",
    night: "Night",
    startScene: "START SCENE",
    add: "ADD",
    addPlayer: "ADD PLAYER",
    nextTurn: "NEXT TURN",
    round: "Round",
    score: "Init",
    player: "Player",
    npc: "NPC",
    playersAp: "Players AP",
    gmAp: "GM AP",
    skillCheck: "Skill check",
    damageDice: "Combat dice",
    attribute: "SPECIAL",
    skill: "Skill",
    difficulty: "Difficulty",
    diceCount: "d20",
    roll: "ROLL",
    combatDice: "CD",
    notesPlaceholder: "Session notes, secrets, reminders...",
    gmPlaceholder: "Ask AutoGM or give it an instruction...",
    send: "SEND TO AUTOGM",
    thinking: "AUTOGM IS RESPONDING...",
    continueScene: "Continue scene",
    describe: "Describe surroundings",
    createNpc: "Create NPC",
    encounter: "Create encounter",
    loot: "Generate loot",
    npcReaction: "NPC reaction",
    noResponse: "AutoGM returned an empty response.",
    currentRegion: "Region",
    currentLocation: "Location",
    worldPosition: "World position",
    character: "Character",
    hp: "HP",
    defense: "Defense",
    recentTravel: "Recent travel",
    sceneStarted: "Scene started",
    noLocation: "Wasteland",
    noCharacter: "No character loaded",
    rollResult: "Roll result",
    successes: "successes",
    complications: "complications",
    damage: "damage",
    effects: "effects",
    remove: "Remove",
  },
  ru: {
    title: "ПАНЕЛЬ ГМ",
    subtitle: "Рабочее место ведущего Fallout 2d20",
    scene: "СЦЕНА",
    initiative: "ИНИЦИАТИВА",
    ap: "ОЧКИ ДЕЙСТВИЯ",
    dice: "БРОСКИ",
    journal: "ЖУРНАЛ ГМ",
    autoGm: "АВТОГМ",
    context: "КОНТЕКСТ АВТОГМ",
    map: "КАРТА",
    openMap: "ОТКРЫТЬ КАРТУ",
    sceneTitle: "Название сцены",
    description: "Описание сцены / секретные заметки",
    sceneType: "Тип сцены",
    weather: "Погода",
    time: "Время",
    exploration: "Исследование",
    combat: "Бой",
    dialogue: "Диалог",
    event: "Событие",
    clear: "Ясно",
    cloudy: "Облачно",
    rain: "Дождь",
    storm: "Буря",
    radstorm: "Рад-буря",
    day: "День",
    dusk: "Сумерки",
    night: "Ночь",
    startScene: "НАЧАТЬ СЦЕНУ",
    add: "ДОБАВИТЬ",
    addPlayer: "ДОБАВИТЬ ИГРОКА",
    nextTurn: "СЛЕДУЮЩИЙ ХОД",
    round: "Раунд",
    score: "Иниц.",
    player: "Игрок",
    npc: "NPC",
    playersAp: "AP игроков",
    gmAp: "AP ГМ",
    skillCheck: "Проверка навыка",
    damageDice: "Боевые кубы",
    attribute: "SPECIAL",
    skill: "Навык",
    difficulty: "Сложность",
    diceCount: "d20",
    roll: "БРОСИТЬ",
    combatDice: "CD",
    notesPlaceholder: "Заметки сессии, секреты, напоминания...",
    gmPlaceholder: "Задайте вопрос AutoGM или дайте команду...",
    send: "ОТПРАВИТЬ В AUTOGM",
    thinking: "AUTOGM ОТВЕЧАЕТ...",
    continueScene: "Продолжить сцену",
    describe: "Опиши окружение",
    createNpc: "Создай NPC",
    encounter: "Создай встречу",
    loot: "Сгенерируй находку",
    npcReaction: "Реакция NPC",
    noResponse: "AutoGM вернул пустой ответ.",
    currentRegion: "Регион",
    currentLocation: "Локация",
    worldPosition: "Позиция в мире",
    character: "Персонаж",
    hp: "HP",
    defense: "Защита",
    recentTravel: "Последние события пути",
    sceneStarted: "Сцена начата",
    noLocation: "Пустошь",
    noCharacter: "Персонаж не загружен",
    rollResult: "Результат броска",
    successes: "успехов",
    complications: "осложнений",
    damage: "урона",
    effects: "эффектов",
    remove: "Удалить",
  },
  uk: {
    title: "ПАНЕЛЬ ГМ",
    subtitle: "Робоче місце ведучого Fallout 2d20",
    scene: "СЦЕНА",
    initiative: "ІНІЦІАТИВА",
    ap: "ОЧКИ ДІЇ",
    dice: "КИДКИ",
    journal: "ЖУРНАЛ ГМ",
    autoGm: "АВТОГМ",
    context: "КОНТЕКСТ АВТОГМ",
    map: "МАПА",
    openMap: "ВІДКРИТИ МАПУ",
    sceneTitle: "Назва сцени",
    description: "Опис сцени / секретні нотатки",
    sceneType: "Тип сцени",
    weather: "Погода",
    time: "Час",
    exploration: "Дослідження",
    combat: "Бій",
    dialogue: "Діалог",
    event: "Подія",
    clear: "Ясно",
    cloudy: "Хмарно",
    rain: "Дощ",
    storm: "Буря",
    radstorm: "Рад-буря",
    day: "День",
    dusk: "Сутінки",
    night: "Ніч",
    startScene: "ПОЧАТИ СЦЕНУ",
    add: "ДОДАТИ",
    addPlayer: "ДОДАТИ ГРАВЦЯ",
    nextTurn: "НАСТУПНИЙ ХІД",
    round: "Раунд",
    score: "Ініц.",
    player: "Гравець",
    npc: "NPC",
    playersAp: "AP гравців",
    gmAp: "AP ГМ",
    skillCheck: "Перевірка навички",
    damageDice: "Бойові куби",
    attribute: "SPECIAL",
    skill: "Навичка",
    difficulty: "Складність",
    diceCount: "d20",
    roll: "КИНУТИ",
    combatDice: "CD",
    notesPlaceholder: "Нотатки сесії, секрети, нагадування...",
    gmPlaceholder: "Поставте запитання AutoGM або дайте команду...",
    send: "НАДІСЛАТИ В AUTOGM",
    thinking: "AUTOGM ВІДПОВІДАЄ...",
    continueScene: "Продовжити сцену",
    describe: "Опиши оточення",
    createNpc: "Створи NPC",
    encounter: "Створи зустріч",
    loot: "Згенеруй знахідку",
    npcReaction: "Реакція NPC",
    noResponse: "AutoGM повернув порожню відповідь.",
    currentRegion: "Регіон",
    currentLocation: "Локація",
    worldPosition: "Позиція у світі",
    character: "Персонаж",
    hp: "HP",
    defense: "Захист",
    recentTravel: "Останні події шляху",
    sceneStarted: "Сцену розпочато",
    noLocation: "Пустка",
    noCharacter: "Персонажа не завантажено",
    rollResult: "Результат кидка",
    successes: "успіхів",
    complications: "ускладнень",
    damage: "шкоди",
    effects: "ефектів",
    remove: "Видалити",
  },
  pl: {
    title: "PANEL MG",
    subtitle: "Stanowisko prowadzącego Fallout 2d20",
    scene: "SCENA",
    initiative: "INICJATYWA",
    ap: "PUNKTY AKCJI",
    dice: "RZUTY",
    journal: "DZIENNIK MG",
    autoGm: "AUTOGM",
    context: "KONTEKST AUTOGM",
    map: "MAPA",
    openMap: "OTWÓRZ MAPĘ",
    sceneTitle: "Nazwa sceny",
    description: "Opis sceny / tajne notatki",
    sceneType: "Typ sceny",
    weather: "Pogoda",
    time: "Pora",
    exploration: "Eksploracja",
    combat: "Walka",
    dialogue: "Dialog",
    event: "Wydarzenie",
    clear: "Bezchmurnie",
    cloudy: "Pochmurno",
    rain: "Deszcz",
    storm: "Burza",
    radstorm: "Burza radiacyjna",
    day: "Dzień",
    dusk: "Zmierzch",
    night: "Noc",
    startScene: "ROZPOCZNIJ SCENĘ",
    add: "DODAJ",
    addPlayer: "DODAJ GRACZA",
    nextTurn: "NASTĘPNA TURA",
    round: "Runda",
    score: "Inic.",
    player: "Gracz",
    npc: "NPC",
    playersAp: "AP graczy",
    gmAp: "AP MG",
    skillCheck: "Test umiejętności",
    damageDice: "Kości obrażeń",
    attribute: "SPECIAL",
    skill: "Umiejętność",
    difficulty: "Trudność",
    diceCount: "d20",
    roll: "RZUĆ",
    combatDice: "CD",
    notesPlaceholder: "Notatki sesji, sekrety, przypomnienia...",
    gmPlaceholder: "Zapytaj AutoGM lub wydaj polecenie...",
    send: "WYŚLIJ DO AUTOGM",
    thinking: "AUTOGM ODPOWIADA...",
    continueScene: "Kontynuuj scenę",
    describe: "Opisz otoczenie",
    createNpc: "Stwórz NPC",
    encounter: "Stwórz spotkanie",
    loot: "Wygeneruj łup",
    npcReaction: "Reakcja NPC",
    noResponse: "AutoGM zwrócił pustą odpowiedź.",
    currentRegion: "Region",
    currentLocation: "Lokacja",
    worldPosition: "Pozycja w świecie",
    character: "Postać",
    hp: "HP",
    defense: "Obrona",
    recentTravel: "Ostatnia podróż",
    sceneStarted: "Scena rozpoczęta",
    noLocation: "Pustkowia",
    noCharacter: "Brak postaci",
    rollResult: "Wynik rzutu",
    successes: "sukcesów",
    complications: "komplikacji",
    damage: "obrażeń",
    effects: "efektów",
    remove: "Usuń",
  },
};

function languageCode(value) {
  const code = String(value || "en").split("-")[0];
  return ["en", "ru", "uk", "pl"].includes(code) ? code : "en";
}

function makeId(prefix = "gm") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readState() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function defaultState() {
  return {
    scene: { title: "", type: "exploration", weather: "clear", time: "day", description: "" },
    initiative: [],
    activeInitiative: 0,
    round: 1,
    ap: { players: 0, gm: 0, max: 6 },
    notes: "",
    log: [],
    gmHistory: [],
  };
}

function compactCharacter(character, derived) {
  if (!character) return null;
  return {
    name: character.characterName || character.name || null,
    level: character.level || null,
    origin: character.origin || null,
    special: character.special || null,
    skills: character.skills || null,
    hp: {
      current: character.currentHp ?? null,
      max: derived?.maxHp ?? character.maxHpOverride ?? null,
      radiation: character.radiationHp ?? null,
    },
    defense: derived?.defense ?? character.defenseOverride ?? null,
    statuses: character.statuses || null,
    injuries: character.injuries || null,
    weapons: (character.weapons || []).slice(0, 12).map((item) => ({
      name: item?.name || null,
      damage: item?.damage ?? null,
      damageType: item?.damageType || item?.type || null,
      effects: item?.effects || item?.damageEffects || null,
      range: item?.range || null,
    })),
    inventory: (character.inventoryItems || []).slice(0, 30).map((item) => ({
      name: item?.name || null,
      quantity: item?.quantity ?? item?.qty ?? null,
      category: item?.category || null,
    })),
    perks: (character.perksAndTraits || []).slice(0, 20).map((item) => ({
      name: item?.name || null,
      rank: item?.rank ?? null,
    })),
  };
}

function rollCombatDice(count) {
  const dice = Array.from({ length: Math.max(1, Number(count) || 1) }, () => 1 + Math.floor(Math.random() * 6));
  let damage = 0;
  let effects = 0;
  dice.forEach((die) => {
    if (die === 1) damage += 1;
    if (die === 2) damage += 2;
    if (die >= 5) {
      damage += 1;
      effects += 1;
    }
  });
  return { dice, damage, effects };
}

export default function GmPanel({ character = null, onOpenMap }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[language] || COPY.en;
  const derived = useMemo(() => (character ? getDerivedStats(character) : {}), [character]);
  const [state, setState] = useState(() => ({ ...defaultState(), ...(readState() || {}) }));
  const [npcName, setNpcName] = useState("");
  const [npcInitiative, setNpcInitiative] = useState("10");
  const [selectedAttribute, setSelectedAttribute] = useState("A");
  const skillNames = useMemo(() => Object.keys(character?.skills || {}), [character]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [d20Count, setD20Count] = useState(2);
  const [combatDiceCount, setCombatDiceCount] = useState(3);
  const [gmDraft, setGmDraft] = useState("");
  const [gmBusy, setGmBusy] = useState(false);
  const [gmError, setGmError] = useState("");
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    if (!selectedSkill && skillNames.length) setSelectedSkill(skillNames[0]);
  }, [selectedSkill, skillNames]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // GM panel persistence is optional.
    }
  }, [state]);

  const mapData = character?.mapData || {};
  const region = useMemo(() => getMapRegion(mapData.regionId), [mapData.regionId]);
  const regionName = getRegionName(region, language);
  const worldOffset = mapData.worldOffset || { x: 0, y: 0 };
  const playerPosition = mapData.playerPosition || { x: 0, y: 0 };
  const worldPosition = {
    x: Number(worldOffset.x || 0) * 8 + Number(playerPosition.x || 0),
    y: Number(worldOffset.y || 0) * 8 + Number(playerPosition.y || 0),
  };
  const exactLocation = (region?.locations || []).find(
    (location) => Number(location.worldX) === worldPosition.x && Number(location.worldY) === worldPosition.y
  );
  const trackedLocation = (region?.locations || []).find((location) => location.id === mapData.trackedLocationId);
  const locationName = exactLocation?.name || trackedLocation?.name || text.noLocation;
  const characterName = character?.characterName || character?.name || text.noCharacter;

  const context = useMemo(() => ({
    scene: state.scene,
    world: {
      region: { id: region?.id || mapData.regionId || "commonwealth", name: regionName, game: region?.game || null },
      worldPosition,
      currentLocation: exactLocation
        ? { id: exactLocation.id || null, name: exactLocation.name || null, type: exactLocation.type || null }
        : null,
      trackedObjective: trackedLocation
        ? { id: trackedLocation.id || null, name: trackedLocation.name || null }
        : null,
      travelHistory: {
        totalHours: Number(mapData.worldTotalHours || 0),
        recentLog: Array.isArray(mapData.travelLog) ? mapData.travelLog.slice(0, 12) : [],
      },
    },
    character: compactCharacter(character, derived),
    initiative: state.initiative,
    actionPoints: state.ap,
    gmNotes: state.notes.slice(0, 2000),
  }), [state.scene, state.initiative, state.ap, state.notes, region, regionName, mapData, exactLocation, trackedLocation, worldPosition.x, worldPosition.y, character, derived]);

  const patchScene = (key, value) => {
    setState((prev) => ({ ...prev, scene: { ...prev.scene, [key]: value } }));
  };

  const addLog = (message) => {
    setState((prev) => ({
      ...prev,
      log: [{ id: makeId("log"), at: Date.now(), message }, ...(prev.log || [])].slice(0, 30),
    }));
  };

  const startScene = () => {
    const sceneLabel = state.scene.title || locationName;
    addLog(`${text.sceneStarted}: ${sceneLabel}`);
    setGmDraft(text.continueScene);
  };

  const addInitiativeEntry = (name, score, type = "npc") => {
    const cleanName = String(name || "").trim();
    if (!cleanName) return;
    setState((prev) => {
      const initiative = [...(prev.initiative || []), {
        id: makeId("init"),
        name: cleanName,
        score: Number(score) || 0,
        type,
      }].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
      return { ...prev, initiative, activeInitiative: 0, round: Math.max(1, Number(prev.round || 1)) };
    });
    setNpcName("");
  };

  const addCurrentPlayer = () => {
    addInitiativeEntry(characterName, Number(derived?.initiative || 0), "player");
  };

  const removeInitiative = (id) => {
    setState((prev) => {
      const initiative = (prev.initiative || []).filter((entry) => entry.id !== id);
      return { ...prev, initiative, activeInitiative: Math.min(prev.activeInitiative || 0, Math.max(0, initiative.length - 1)) };
    });
  };

  const nextTurn = () => {
    setState((prev) => {
      const count = prev.initiative?.length || 0;
      if (!count) return prev;
      const nextIndex = (Number(prev.activeInitiative || 0) + 1) % count;
      const wrapped = nextIndex === 0;
      return { ...prev, activeInitiative: nextIndex, round: wrapped ? Number(prev.round || 1) + 1 : Number(prev.round || 1) };
    });
  };

  const changeAp = (pool, delta) => {
    setState((prev) => {
      const max = Math.max(1, Number(prev.ap?.max || 6));
      const current = Number(prev.ap?.[pool] || 0);
      return { ...prev, ap: { ...prev.ap, [pool]: Math.max(0, Math.min(max, current + delta)) } };
    });
  };

  const rollSkill = () => {
    const skill = character?.skills?.[selectedSkill] || {};
    const attribute = Number(character?.special?.[selectedAttribute] || 0);
    const rank = Number(skill.rank || 0);
    const taggedBonus = skill.tagged ? 2 : 0;
    const bonus = Number(skill.bonus || 0);
    const target = Math.max(0, attribute + rank + taggedBonus + bonus);
    const dice = Array.from({ length: Math.max(1, Math.min(5, Number(d20Count) || 2)) }, () => 1 + Math.floor(Math.random() * 20));
    let successes = 0;
    let complications = 0;
    dice.forEach((die) => {
      if (die <= target) successes += 1;
      if (skill.tagged && die <= Math.max(1, rank)) successes += 1;
      if (die === 20) complications += 1;
    });
    const message = `${text.rollResult}: ${selectedAttribute} + ${selectedSkill || "-"} (TN ${target}, D${difficulty}) → [${dice.join(", ")}] = ${successes} ${text.successes}, ${complications} ${text.complications}`;
    addLog(message);
  };

  const rollDamage = () => {
    const result = rollCombatDice(combatDiceCount);
    addLog(`${text.damageDice}: ${combatDiceCount} ${text.combatDice} → [${result.dice.join(", ")}] = ${result.damage} ${text.damage}, ${result.effects} ${text.effects}`);
  };

  const quickCommands = [
    text.continueScene,
    text.describe,
    text.createNpc,
    text.encounter,
    text.loot,
    text.npcReaction,
  ];

  const sendToAutoGm = async () => {
    const message = String(gmDraft || "").trim();
    if (!message || gmBusy) return;
    setGmBusy(true);
    setGmError("");
    const history = Array.isArray(state.gmHistory) ? state.gmHistory.slice(-12) : [];
    try {
      const response = await fetch("/api/auto-gm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: context.character,
          world: context.world,
          language,
          locationState: { persistent: true, facts: [] },
          sessionKey: "gm-control-panel",
          history,
          message: `[GM CONTROL PANEL]\nActive scene: ${JSON.stringify(state.scene)}\nGM instruction: ${message}\nTreat the GM instruction as authoritative session direction. Do not decide player actions. Reply in the selected app language.`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      const reply = data?.text || text.noResponse;
      const nextHistory = [
        ...history,
        { role: "user", text: message, at: Date.now() },
        { role: "gm", text: reply, at: Date.now() },
      ].slice(-20);
      setState((prev) => ({ ...prev, gmHistory: nextHistory }));
      setGmDraft("");
      addLog(`AutoGM: ${reply}`);
    } catch (error) {
      setGmError(error?.message || "AutoGM error");
    } finally {
      setGmBusy(false);
    }
  };

  const latestAutoGm = [...(state.gmHistory || [])].reverse().find((item) => item.role === "gm");

  return (
    <section className="gm-panel pip-screen">
      <header className="gm-panel__header">
        <div>
          <div className="gm-panel__eyebrow">VAULT-TEC // OVERSEER TERMINAL</div>
          <h1>[ {text.title} ]</h1>
          <p>{text.subtitle}</p>
        </div>
        <button type="button" className="pip-btn gm-panel__map-button" onClick={onOpenMap}>{text.openMap}</button>
      </header>

      <div className="gm-panel__status-strip">
        <span>{text.currentRegion}: <strong>{regionName}</strong></span>
        <span>{text.currentLocation}: <strong>{locationName}</strong></span>
        <span>{text.character}: <strong>{characterName}</strong></span>
        <span>{text.hp}: <strong>{character?.currentHp ?? "-"}/{derived?.maxHp ?? "-"}</strong></span>
        <span>{text.defense}: <strong>{derived?.defense ?? "-"}</strong></span>
      </div>

      <div className="gm-panel__grid">
        <div className="gm-panel__column">
          <article className="pip-panel gm-card">
            <div className="gm-card__head"><h2>[ {text.scene} ]</h2></div>
            <input className="pip-input" value={state.scene.title} placeholder={text.sceneTitle} onChange={(event) => patchScene("title", event.target.value)} />
            <div className="gm-form-grid">
              <label><span>{text.sceneType}</span><select className="pip-input" value={state.scene.type} onChange={(event) => patchScene("type", event.target.value)}><option value="exploration">{text.exploration}</option><option value="combat">{text.combat}</option><option value="dialogue">{text.dialogue}</option><option value="event">{text.event}</option></select></label>
              <label><span>{text.weather}</span><select className="pip-input" value={state.scene.weather} onChange={(event) => patchScene("weather", event.target.value)}><option value="clear">{text.clear}</option><option value="cloudy">{text.cloudy}</option><option value="rain">{text.rain}</option><option value="storm">{text.storm}</option><option value="radstorm">{text.radstorm}</option></select></label>
              <label><span>{text.time}</span><select className="pip-input" value={state.scene.time} onChange={(event) => patchScene("time", event.target.value)}><option value="day">{text.day}</option><option value="dusk">{text.dusk}</option><option value="night">{text.night}</option></select></label>
            </div>
            <textarea className="pip-input gm-textarea" value={state.scene.description} placeholder={text.description} onChange={(event) => patchScene("description", event.target.value)} />
            <button type="button" className="pip-btn gm-primary" onClick={startScene}>{text.startScene}</button>
          </article>

          <article className="pip-panel gm-card">
            <div className="gm-card__head"><h2>[ {text.initiative} ]</h2><span>{text.round}: {state.round}</span></div>
            <div className="gm-initiative-list">
              {(state.initiative || []).map((entry, index) => (
                <div key={entry.id} className={`gm-initiative-row ${index === state.activeInitiative ? "is-active" : ""}`}>
                  <span className="gm-initiative-rank">{index + 1}</span>
                  <span className="gm-initiative-name">{entry.name}<small>{entry.type === "player" ? text.player : text.npc}</small></span>
                  <strong>{entry.score}</strong>
                  <button type="button" onClick={() => removeInitiative(entry.id)} aria-label={text.remove}>×</button>
                </div>
              ))}
            </div>
            <div className="gm-inline-form">
              <input className="pip-input" value={npcName} placeholder="NPC" onChange={(event) => setNpcName(event.target.value)} />
              <input className="pip-input gm-number" type="number" value={npcInitiative} onChange={(event) => setNpcInitiative(event.target.value)} />
              <button type="button" className="pip-btn" onClick={() => addInitiativeEntry(npcName, npcInitiative, "npc")}>{text.add}</button>
            </div>
            <div className="gm-button-row">
              <button type="button" className="pip-btn" onClick={addCurrentPlayer}>{text.addPlayer}</button>
              <button type="button" className="pip-btn gm-primary" onClick={nextTurn} disabled={!state.initiative?.length}>{text.nextTurn}</button>
            </div>
          </article>
        </div>

        <div className="gm-panel__column gm-panel__column--wide">
          <article className="pip-panel gm-card gm-card--autogm">
            <div className="gm-card__head"><h2>[ {text.autoGm} ]</h2><button type="button" className="gm-link-button" onClick={() => setContextOpen((value) => !value)}>{text.context}</button></div>
            <div className="gm-quick-commands">
              {quickCommands.map((command) => <button key={command} type="button" onClick={() => setGmDraft(command)}>{command}</button>)}
            </div>
            {contextOpen ? <pre className="gm-context-view">{JSON.stringify(context, null, 2)}</pre> : null}
            <div className="gm-chat-output">{latestAutoGm?.text || `${text.currentRegion}: ${regionName}. ${text.currentLocation}: ${locationName}.`}</div>
            {gmError ? <div className="gm-error">{gmError}</div> : null}
            <textarea className="pip-input gm-textarea gm-textarea--chat" value={gmDraft} placeholder={text.gmPlaceholder} onChange={(event) => setGmDraft(event.target.value)} />
            <button type="button" className="pip-btn gm-primary" disabled={gmBusy || !gmDraft.trim()} onClick={sendToAutoGm}>{gmBusy ? text.thinking : text.send}</button>
          </article>

          <article className="pip-panel gm-card">
            <div className="gm-card__head"><h2>[ {text.map} / LOG ]</h2><span>{text.worldPosition}: {worldPosition.x}, {worldPosition.y}</span></div>
            <div className="gm-travel-log">
              {(state.log || []).slice(0, 8).map((entry) => <div key={entry.id}>{entry.message}</div>)}
              {!(state.log || []).length && (mapData.travelLog || []).slice(0, 8).map((entry, index) => <div key={`${index}-${entry}`}>{entry}</div>)}
            </div>
            <button type="button" className="pip-btn" onClick={onOpenMap}>{text.openMap}</button>
          </article>
        </div>

        <div className="gm-panel__column">
          <article className="pip-panel gm-card">
            <div className="gm-card__head"><h2>[ {text.ap} ]</h2></div>
            {[{ key: "players", label: text.playersAp }, { key: "gm", label: text.gmAp }].map((pool) => (
              <div key={pool.key} className="gm-ap-row">
                <span>{pool.label}</span>
                <div><button type="button" onClick={() => changeAp(pool.key, -1)}>−</button><strong>{state.ap?.[pool.key] || 0}/{state.ap?.max || 6}</strong><button type="button" onClick={() => changeAp(pool.key, 1)}>+</button></div>
              </div>
            ))}
          </article>

          <article className="pip-panel gm-card">
            <div className="gm-card__head"><h2>[ {text.dice} ]</h2></div>
            <div className="gm-dice-section">
              <h3>{text.skillCheck}</h3>
              <div className="gm-form-grid gm-form-grid--dice">
                <label><span>{text.attribute}</span><select className="pip-input" value={selectedAttribute} onChange={(event) => setSelectedAttribute(event.target.value)}>{["S", "P", "E", "C", "I", "A", "L"].map((key) => <option key={key} value={key}>{key}</option>)}</select></label>
                <label><span>{text.skill}</span><select className="pip-input" value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}>{skillNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
                <label><span>{text.difficulty}</span><input className="pip-input" type="number" min="0" max="5" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} /></label>
                <label><span>{text.diceCount}</span><input className="pip-input" type="number" min="1" max="5" value={d20Count} onChange={(event) => setD20Count(event.target.value)} /></label>
              </div>
              <button type="button" className="pip-btn gm-primary" onClick={rollSkill}>{text.roll} 2d20</button>
            </div>
            <div className="gm-dice-section">
              <h3>{text.damageDice}</h3>
              <div className="gm-inline-form"><input className="pip-input gm-number" type="number" min="1" max="20" value={combatDiceCount} onChange={(event) => setCombatDiceCount(event.target.value)} /><button type="button" className="pip-btn" onClick={rollDamage}>{text.roll} {text.combatDice}</button></div>
            </div>
            <div className="gm-mini-log">{(state.log || []).slice(0, 4).map((entry) => <div key={entry.id}>{entry.message}</div>)}</div>
          </article>

          <article className="pip-panel gm-card">
            <div className="gm-card__head"><h2>[ {text.journal} ]</h2></div>
            <textarea className="pip-input gm-textarea gm-textarea--notes" value={state.notes || ""} placeholder={text.notesPlaceholder} onChange={(event) => setState((prev) => ({ ...prev, notes: event.target.value }))} />
          </article>
        </div>
      </div>
    </section>
  );
}
