import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import {
  CUSTOM_CREATURES_CHANGED_EVENT,
  loadCustomCreatures,
} from "../../utils/gmCreatureLibrary.js";
import {
  NPC_RANKS,
  applyNpcRank,
  parseAttackText,
  rankLabel,
} from "../../utils/npcCombat.js";
import {
  SPECIAL_CREATURE_FEATURES,
  legendaryAbilitiesFor,
  legendaryAbilityById,
  specialFeatureById,
} from "../../utils/npcFeaturePresets.js";
import { findFreePlacement } from "../../utils/gmSessionModel.js";
import GmUnifiedTokenManagerV4 from "./GmUnifiedTokenManagerV4.jsx";
import "./gmUnifiedTokenManagerV5.css";

const GROUPS = ["all", "people", "mutatedPeople", "postNuclearPeople", "animals", "cryptids", "robots"];

const COPY = {
  en: {
    filter: "CREATURE GROUP", all: "ALL", people: "PEOPLE", mutatedPeople: "MUTATED PEOPLE",
    postNuclearPeople: "POST-NUCLEAR PEOPLE / GHOULS", animals: "ANIMALS / INSECTS",
    cryptids: "CRYPTIDS / ALIENS", robots: "ROBOTS / TURRETS", npc: "NPC", creature: "CREATURE", kind: "TYPE",
    level: "LVL", quantity: "TOKENS", horde: "HORDE", hordeSize: "MEMBERS", attacks: "ATTACKS",
    addToMap: "ADD TO MAP", adding: "ADDING...", added: "Added to map", noLiveScene: "Start a scene before adding tokens.",
    noSpace: "Not enough free cells on the map.", addFailed: "Could not add token.", specialFeature: "SPECIAL FEATURE",
    selectFeature: "SELECT FEATURE", legendaryAbility: "LEGENDARY ABILITY", selectAbility: "SELECT ABILITY",
    rewardType: "REWARD TYPE", reward: "REWARD", weapon: "WEAPON", armor: "ARMOR", rewardPlaceholder: "Reward name / note",
  },
  ru: {
    filter: "ГРУППА", all: "ВСЕ", people: "ЛЮДИ", mutatedPeople: "МУТИРОВАННЫЕ ЛЮДИ",
    postNuclearPeople: "ПОСТЯДЕРНЫЕ ЛЮДИ / ГУЛИ", animals: "ЖИВОТНЫЕ / НАСЕКОМЫЕ",
    cryptids: "КРИПТИДЫ / ИНОПЛАНЕТЯНЕ", robots: "РОБОТЫ / ТУРЕЛИ", npc: "NPC", creature: "СУЩЕСТВО", kind: "ТИП",
    level: "УР.", quantity: "ТОКЕНОВ", horde: "ТОЛПА", hordeSize: "УЧАСТНИКОВ", attacks: "АТАКИ",
    addToMap: "ДОБАВИТЬ НА КАРТУ", adding: "ДОБАВЛЕНИЕ...", added: "Добавлено на карту", noLiveScene: "Сначала запустите сцену.",
    noSpace: "На карте недостаточно свободных клеток.", addFailed: "Не удалось добавить токен.", specialFeature: "ОСОБАЯ ЧЕРТА",
    selectFeature: "ВЫБРАТЬ ЧЕРТУ", legendaryAbility: "ЛЕГЕНДАРНАЯ СПОСОБНОСТЬ", selectAbility: "ВЫБРАТЬ СПОСОБНОСТЬ",
    rewardType: "ТИП НАГРАДЫ", reward: "НАГРАДА", weapon: "ОРУЖИЕ", armor: "БРОНЯ", rewardPlaceholder: "Название / заметка награды",
  },
  uk: {
    filter: "ГРУПА", all: "УСІ", people: "ЛЮДИ", mutatedPeople: "МУТОВАНІ ЛЮДИ",
    postNuclearPeople: "ПОСТЯДЕРНІ ЛЮДИ / ГУЛІ", animals: "ТВАРИНИ / КОМАХИ",
    cryptids: "КРИПТИДИ / ІНОПЛАНЕТЯНИ", robots: "РОБОТИ / ТУРЕЛІ", npc: "NPC", creature: "ІСТОТА", kind: "ТИП",
    level: "РІВ.", quantity: "ТОКЕНІВ", horde: "НАТОВП", hordeSize: "УЧАСНИКІВ", attacks: "АТАКИ",
    addToMap: "ДОДАТИ НА МАПУ", adding: "ДОДАВАННЯ...", added: "Додано на мапу", noLiveScene: "Спочатку запустіть сцену.",
    noSpace: "На мапі недостатньо вільних клітин.", addFailed: "Не вдалося додати токен.", specialFeature: "ОСОБЛИВА РИСА",
    selectFeature: "ОБРАТИ РИСУ", legendaryAbility: "ЛЕГЕНДАРНА ЗДІБНІСТЬ", selectAbility: "ОБРАТИ ЗДІБНІСТЬ",
    rewardType: "ТИП НАГОРОДИ", reward: "НАГОРОДА", weapon: "ЗБРОЯ", armor: "БРОНЯ", rewardPlaceholder: "Назва / нотатка нагороди",
  },
  pl: {
    filter: "GRUPA", all: "WSZYSTKIE", people: "LUDZIE", mutatedPeople: "ZMUTOWANI LUDZIE",
    postNuclearPeople: "LUDZIE POSTNUKLEARNI / GHOULY", animals: "ZWIERZĘTA / OWADY",
    cryptids: "KRYPTYDY / OBCY", robots: "ROBOTY / WIEŻYCZKI", npc: "NPC", creature: "STWÓR", kind: "TYP",
    level: "POZ.", quantity: "TOKENY", horde: "HORDA", hordeSize: "CZŁONKÓW", attacks: "ATAKI",
    addToMap: "DODAJ NA MAPĘ", adding: "DODAWANIE...", added: "Dodano na mapę", noLiveScene: "Najpierw uruchom scenę.",
    noSpace: "Brak wolnych pól na mapie.", addFailed: "Nie udało się dodać tokenu.", specialFeature: "CECHA SPECJALNA",
    selectFeature: "WYBIERZ CECHĘ", legendaryAbility: "ZDOLNOŚĆ LEGENDARNA", selectAbility: "WYBIERZ ZDOLNOŚĆ",
    rewardType: "TYP NAGRODY", reward: "NAGRODA", weapon: "BROŃ", armor: "PANCERZ", rewardPlaceholder: "Nazwa / opis nagrody",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function entryText(entry) {
  return normalizeSearch([
    entry?.name,
    entry?.creatureType,
    entry?.category,
    entry?.cardKind,
    ...(Array.isArray(entry?.tags) ? entry.tags : []),
  ].filter(Boolean).join(" "));
}

function tokenGroup(entry) {
  const source = entryText(entry);

  if (/\b(robot|robotic|synth|turret|sentry bot|protectron|assaultron|eyebot|mister handy|mister gutsy|machine)\b|робот|турел|синт|robot|wieżycz/i.test(source)) {
    return "robots";
  }
  if (/\b(ghoul|glowing one|post-nuclear|post nuclear)\b|гул|гуль|ghoul/i.test(source)) {
    return "postNuclearPeople";
  }
  if (/\b(super mutant|mutated human|mutated-human|nightkin|mutant human)\b|супер.?мут|мутированн.*человек|мутован.*люд/i.test(source)) {
    return "mutatedPeople";
  }
  if (/\b(cryptid|alien|extraterrestrial|mothman|flatwoods|snallygaster|grafton monster|wendigo|sheepsquatch)\b|криптид|инопланет|чуж/i.test(source)) {
    return "cryptids";
  }
  if (/\b(insect|arachnid|crustacean|mammal|reptile|animal|canine|dog|brahmin|deathclaw|mirelurk|radroach|radscorpion|radstag|stingwing|bloodbug|bloatfly|mole rat|mutant hound|yao guai)\b|живот|насеком|звер|тварин|комах/i.test(source)) {
    return "animals";
  }
  if (/\b(human|person|people|raider|settler|gunner|npc|ally|character)\b|человек|люди|людина|люд|człowiek/i.test(source)) {
    return "people";
  }

  if (String(entry?.cardKind || "").toLowerCase() === "npc") return "people";
  if (String(entry?.cardKind || "").toLowerCase() === "creature") return "animals";
  if (String(entry?.statKind || "").toLowerCase() === "character") return "people";
  return "animals";
}

function optionFallback(option) {
  return {
    name: option?.textContent || "",
    creatureType: option?.textContent || "",
    cardKind: String(option?.textContent || "").toLowerCase().includes("npc") ? "npc" : "creature",
  };
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultSize(entry) {
  const explicit = Number(entry?.baseSize ?? entry?.size);
  if ([1, 2, 3].includes(explicit)) return explicit;
  const source = `${entry?.abilities || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  return source.includes("massive") || source.includes("big") ? 2 : 1;
}

function quickBase(entry) {
  if (!entry) return null;
  const hp = Math.max(1, number(entry?.baseMaxHp ?? entry?.maxHp ?? entry?.hp, 1));
  const defense = Math.max(0, number(entry?.baseDefense ?? entry?.defense, 0));
  const xp = Math.max(0, number(entry?.baseXp ?? entry?.xp, 0));
  const size = defaultSize(entry);
  return {
    ...entry,
    cardKind: String(entry?.cardKind || "creature").toLowerCase() === "npc" ? "npc" : "creature",
    hp,
    maxHp: hp,
    baseMaxHp: hp,
    defense,
    baseDefense: defense,
    xp,
    baseXp: xp,
    size,
    baseSize: size,
    customAttacks: Array.isArray(entry?.customAttacks) ? entry.customAttacks : [],
    weapons: Array.isArray(entry?.weapons) ? entry.weapons : [],
  };
}

function buildQuickStats(entry, options) {
  const base = quickBase(entry);
  if (!base) return null;
  const special = options.rank === "special" ? specialFeatureById(options.specialFeatureId) : null;
  const legendary = options.rank === "legendary" ? legendaryAbilityById(options.legendaryAbilityId) : null;
  const decorated = {
    ...base,
    specialFeatureId: special?.id || (options.rank === "special" ? String(base.specialFeatureId || "") : ""),
    specialFeature: special ? `${special.name} — ${special.summary}` : (options.rank === "special" ? String(base.specialFeature || "") : ""),
    legendaryAbilityId: legendary?.id || (options.rank === "legendary" ? String(base.legendaryAbilityId || "") : ""),
    legendaryAbility: legendary ? `${legendary.name} — ${legendary.summary}` : (options.rank === "legendary" ? String(base.legendaryAbility || "") : ""),
    legendaryRewardType: options.rank === "legendary" ? options.rewardType : "",
    legendaryReward: options.rank === "legendary" ? options.reward : "",
  };
  return {
    ...applyNpcRank(decorated, {
      ...decorated,
      rank: options.rank,
      hordeEnabled: options.horde,
      hordeSize: options.hordeSize,
    }),
    visibleToPlayers: false,
    controlledByClientId: "",
  };
}

function attackNames(entry) {
  if (!entry) return [];
  const names = [
    ...parseAttackText(entry?.attacks || "").map((attack) => attack.name),
    ...(Array.isArray(entry?.customAttacks) ? entry.customAttacks.map((attack) => attack?.name) : []),
    ...(Array.isArray(entry?.weapons) ? entry.weapons.map((weapon) => weapon?.name) : []),
  ].map((value) => String(value || "").trim()).filter(Boolean);
  return [...new Set(names)].slice(0, 6);
}

function clampCount(value, min, max) {
  return Math.max(min, Math.min(max, Math.floor(number(value, min))));
}

function localRankLabel(rank, language) {
  const labels = {
    en: { minion: "MINION", standard: "STANDARD", special: "SPECIAL", legendary: "LEGENDARY" },
    ru: { minion: "МИНЬОН", standard: "ОБЫЧНЫЙ", special: "ОСОБЫЙ", legendary: "ЛЕГЕНДАРНЫЙ" },
    uk: { minion: "МІНЬЙОН", standard: "ЗВИЧАЙНИЙ", special: "ОСОБЛИВИЙ", legendary: "ЛЕГЕНДАРНИЙ" },
    pl: { minion: "SŁUGA", standard: "ZWYKŁY", special: "SPECJALNY", legendary: "LEGENDARNY" },
  };
  return labels[language]?.[rank] || rankLabel(rank);
}

export default function GmUnifiedTokenManagerV5({ session }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const rootRef = useRef(null);
  const [group, setGroup] = useState("all");
  const [customEntries, setCustomEntries] = useState([]);
  const [filterHost, setFilterHost] = useState(null);
  const [kindHost, setKindHost] = useState(null);
  const [previewHost, setPreviewHost] = useState(null);
  const [editorKind, setEditorKind] = useState("npc");
  const [selectedBestiaryId, setSelectedBestiaryId] = useState("");
  const [selectedCustomId, setSelectedCustomId] = useState("");
  const [quickRank, setQuickRank] = useState("standard");
  const [spawnCount, setSpawnCount] = useState(1);
  const [quickHorde, setQuickHorde] = useState(false);
  const [quickHordeSize, setQuickHordeSize] = useState(2);
  const [specialFeatureId, setSpecialFeatureId] = useState("");
  const [legendaryAbilityId, setLegendaryAbilityId] = useState("");
  const [rewardType, setRewardType] = useState("weapon");
  const [reward, setReward] = useState("");
  const [spawning, setSpawning] = useState(false);
  const [spawnStatus, setSpawnStatus] = useState("");

  const bestiaryById = useMemo(
    () => new Map(BESTIARY_ENTRIES.map((entry) => [String(entry?.id || ""), entry])),
    []
  );
  const customById = useMemo(
    () => new Map(customEntries.map((entry) => [String(entry?.id || ""), entry])),
    [customEntries]
  );
  const selectedEntry = selectedBestiaryId
    ? bestiaryById.get(String(selectedBestiaryId)) || null
    : selectedCustomId
    ? customById.get(String(selectedCustomId)) || null
    : null;

  const groupCounts = useMemo(() => {
    const counts = Object.fromEntries(GROUPS.map((value) => [value, 0]));
    const entries = [...BESTIARY_ENTRIES.filter((entry) => entry?.statKind !== "rule"), ...customEntries];
    counts.all = entries.length;
    entries.forEach((entry) => { counts[tokenGroup(entry)] = (counts[tokenGroup(entry)] || 0) + 1; });
    return counts;
  }, [customEntries]);

  const quickStats = useMemo(
    () => buildQuickStats(selectedEntry, {
      rank: quickRank,
      horde: quickHorde,
      hordeSize: quickHordeSize,
      specialFeatureId,
      legendaryAbilityId,
      rewardType,
      reward,
    }),
    [selectedEntry, quickRank, quickHorde, quickHordeSize, specialFeatureId, legendaryAbilityId, rewardType, reward]
  );
  const quickAttacks = useMemo(() => attackNames(selectedEntry), [selectedEntry]);
  const legendaryOptions = useMemo(
    () => legendaryAbilitiesFor(String(selectedEntry?.cardKind || "creature").toLowerCase() === "npc" ? "npc" : "creature"),
    [selectedEntry]
  );

  useEffect(() => {
    let active = true;
    const reload = () => loadCustomCreatures()
      .then((items) => { if (active) setCustomEntries(Array.isArray(items) ? items : []); })
      .catch(() => { if (active) setCustomEntries([]); });
    reload();
    window.addEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    };
  }, []);

  useEffect(() => {
    const entry = selectedBestiaryId
      ? bestiaryById.get(String(selectedBestiaryId))
      : selectedCustomId
      ? customById.get(String(selectedCustomId))
      : null;
    if (!entry) {
      setSpawnStatus("");
      return;
    }
    const savedRank = NPC_RANKS.includes(String(entry?.rank || "").toLowerCase()) ? String(entry.rank).toLowerCase() : "standard";
    setQuickRank(savedRank);
    setQuickHorde(Boolean(entry?.hordeEnabled));
    setQuickHordeSize(clampCount(entry?.hordeSize || 2, 2, 5));
    setSpawnCount(1);
    setSpecialFeatureId(String(entry?.specialFeatureId || ""));
    setLegendaryAbilityId(String(entry?.legendaryAbilityId || ""));
    setRewardType(String(entry?.legendaryRewardType || "weapon") === "armor" ? "armor" : "weapon");
    setReward(String(entry?.legendaryReward || ""));
    setSpawnStatus("");
  }, [selectedBestiaryId, selectedCustomId, bestiaryById, customById]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const syncDomState = () => {
      const nextFilterHost = root.querySelector(".gm-bestiary-filter-row");
      const nextKindHost = root.querySelector(".gm-npc-v4-kind-tabs");
      const nextPreviewHost = root.querySelector(".gm-bestiary-preview");
      setFilterHost((current) => current === nextFilterHost ? current : nextFilterHost);
      setKindHost((current) => current === nextKindHost ? current : nextKindHost);
      setPreviewHost((current) => current === nextPreviewHost ? current : nextPreviewHost);

      const selectors = [...root.querySelectorAll(".gm-bestiary-picker__controls > select.pip-input")];
      setSelectedBestiaryId(String(selectors[0]?.value || ""));
      setSelectedCustomId(String(selectors[1]?.value || ""));

      if (nextKindHost) {
        const originalButtons = [...nextKindHost.querySelectorAll(":scope > button.pip-btn:not(.gm-npc-v5-kind-toggle)")];
        const activeIndex = originalButtons.findIndex((button) => button.classList.contains("is-primary"));
        if (activeIndex >= 0) setEditorKind(activeIndex === 1 ? "creature" : "npc");
      }
    };

    syncDomState();
    root.addEventListener("change", syncDomState);
    const observer = new MutationObserver(syncDomState);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      root.removeEventListener("change", syncDomState);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const host = kindHost;
    if (!host) return undefined;
    const syncKind = () => {
      const originalButtons = [...host.querySelectorAll(":scope > button.pip-btn:not(.gm-npc-v5-kind-toggle)")];
      const activeIndex = originalButtons.findIndex((button) => button.classList.contains("is-primary"));
      if (activeIndex >= 0) setEditorKind(activeIndex === 1 ? "creature" : "npc");
    };
    syncKind();
    const observer = new MutationObserver(syncKind);
    observer.observe(host, { subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [kindHost]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const applyFilter = () => {
      const selects = [...root.querySelectorAll(".gm-bestiary-picker__controls > select.pip-input")];
      selects.forEach((select, selectIndex) => {
        const lookup = selectIndex === 0 ? bestiaryById : customById;
        [...select.options].forEach((option) => {
          if (!option.value) {
            option.hidden = false;
            option.disabled = false;
            option.style.display = "";
            return;
          }
          const entry = lookup.get(String(option.value)) || optionFallback(option);
          const hidden = group !== "all" && tokenGroup(entry) !== group;
          option.hidden = hidden;
          option.disabled = hidden;
          option.style.display = hidden ? "none" : "";
        });

        const selected = select.options[select.selectedIndex];
        if (selected?.value && selected.hidden) {
          select.value = "";
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    };

    applyFilter();
    const observer = new MutationObserver(applyFilter);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [group, bestiaryById, customById]);

  const toggleKind = () => {
    const host = kindHost;
    if (!host) return;
    const originalButtons = [...host.querySelectorAll(":scope > button.pip-btn:not(.gm-npc-v5-kind-toggle)")];
    if (originalButtons.length < 2) return;
    const nextIndex = editorKind === "npc" ? 1 : 0;
    originalButtons[nextIndex]?.click();
    setEditorKind(nextIndex === 1 ? "creature" : "npc");
  };

  const spawnSelected = async () => {
    if (!selectedEntry || !quickStats || spawning) return;
    if (!session?.liveSceneId || !session?.tacticalScene) {
      setSpawnStatus(copy.noLiveScene);
      return;
    }
    setSpawning(true);
    setSpawnStatus("");
    const scene = session.tacticalScene;
    const workingScene = { ...scene, tokens: [...(Array.isArray(scene.tokens) ? scene.tokens : [])] };
    let added = 0;
    let failure = "";
    const count = clampCount(spawnCount, 1, 12);

    for (let index = 0; index < count; index += 1) {
      const stats = {
        ...quickStats,
        hordeHp: Array.isArray(quickStats.hordeHp) ? [...quickStats.hordeHp] : [],
        customAttacks: Array.isArray(quickStats.customAttacks) ? quickStats.customAttacks.map((item) => ({ ...item })) : [],
        weapons: Array.isArray(quickStats.weapons) ? quickStats.weapons.map((item) => ({ ...item })) : [],
      };
      const footprint = clampCount(stats?.footprint || stats?.size || 1, 1, 3);
      const placement = findFreePlacement(workingScene, footprint, []);
      if (!placement) {
        failure = copy.noSpace;
        break;
      }

      const response = await session.createNpcToken?.({
        name: String(selectedEntry?.name || "NPC"),
        size: footprint,
        npcId: String(selectedEntry?.id || ""),
        avatar: String(selectedEntry?.avatar || ""),
        stats,
        x: placement.x,
        y: placement.y,
      });
      if (!response?.ok) {
        failure = copy.addFailed;
        break;
      }
      added += 1;
      workingScene.tokens.push({
        id: `reserved-${Date.now()}-${index}`,
        kind: "npc",
        x: placement.x,
        y: placement.y,
        size: footprint,
        stats,
      });
    }

    if (added > 0) setSpawnStatus(`${copy.added}: ${added}${failure ? ` · ${failure}` : ""}`);
    else setSpawnStatus(failure || copy.addFailed);
    setSpawning(false);
  };

  return (
    <div className="gm-unified-token-manager-v5" ref={rootRef}>
      <GmUnifiedTokenManagerV4 session={session} />

      {filterHost ? createPortal(
        <div className="gm-token-group-filter-wrap">
          <span>{copy.filter}</span>
          <div className="gm-token-group-chips">
            {GROUPS.map((value) => (
              <button
                type="button"
                key={value}
                className={`pip-btn gm-token-group-chip${group === value ? " is-primary" : ""}`}
                onClick={() => setGroup(value)}
              >
                <span>{copy[value]}</span><b>{groupCounts[value] || 0}</b>
              </button>
            ))}
          </div>
        </div>,
        filterHost
      ) : null}

      {kindHost ? createPortal(
        <button
          type="button"
          className="pip-btn is-primary gm-npc-v5-kind-toggle"
          onClick={toggleKind}
          aria-label={`${copy.kind}: ${editorKind === "npc" ? copy.npc : copy.creature}`}
        >
          {copy.npc} ⇄ {copy.creature} · {editorKind === "npc" ? copy.npc : copy.creature}
        </button>,
        kindHost
      ) : null}

      {previewHost && selectedEntry && quickStats ? createPortal(
        <div className="gm-token-v5-quick-preview">
          <div className="gm-token-v5-preview-head">
            <div>
              <strong>{selectedEntry.name}</strong>
              <small>{selectedEntry.creatureType || (selectedEntry.cardKind === "npc" ? copy.npc : copy.creature)} · {copy.level} {number(selectedEntry.level, 0)}</small>
            </div>
            <span className="gm-token-v5-size">{quickStats.footprint}×{quickStats.footprint}</span>
          </div>

          <div className="gm-token-v5-stats">
            <span>HP <b>{quickStats.hp}/{quickStats.maxHp}</b></span>
            <span>DEF <b>{quickStats.defense}</b></span>
            <span>XP <b>{quickStats.xp}</b></span>
            <span>DR <b>+{quickStats.resistanceBonus || 0}</b></span>
            <span>DMG <b>×{quickStats.damageMultiplier || 1}</b></span>
          </div>

          <div className="gm-token-v5-ranks" aria-label="Rank">
            {NPC_RANKS.map((rank) => (
              <button
                type="button"
                key={rank}
                className={`pip-btn${quickRank === rank ? " is-primary" : ""}`}
                onClick={() => setQuickRank(rank)}
              >
                {localRankLabel(rank, language)}
              </button>
            ))}
          </div>

          <div className="gm-token-v5-spawn-row">
            <label className="gm-token-v5-stepper-label">
              <span>{copy.quantity}</span>
              <div className="gm-token-v5-stepper">
                <button type="button" className="pip-btn" onClick={() => setSpawnCount((value) => clampCount(value - 1, 1, 12))}>−</button>
                <input className="pip-input" type="number" inputMode="numeric" min="1" max="12" value={spawnCount} onChange={(event) => setSpawnCount(clampCount(event.target.value, 1, 12))} />
                <button type="button" className="pip-btn" onClick={() => setSpawnCount((value) => clampCount(value + 1, 1, 12))}>+</button>
              </div>
            </label>
            <label className="gm-token-v5-horde-toggle">
              <input type="checkbox" checked={quickHorde} onChange={(event) => setQuickHorde(event.target.checked)} />
              <span>{copy.horde}</span>
            </label>
            {quickHorde ? (
              <label className="gm-token-v5-stepper-label">
                <span>{copy.hordeSize}</span>
                <div className="gm-token-v5-stepper">
                  <button type="button" className="pip-btn" onClick={() => setQuickHordeSize((value) => clampCount(value - 1, 2, 5))}>−</button>
                  <input className="pip-input" type="number" inputMode="numeric" min="2" max="5" value={quickHordeSize} onChange={(event) => setQuickHordeSize(clampCount(event.target.value, 2, 5))} />
                  <button type="button" className="pip-btn" onClick={() => setQuickHordeSize((value) => clampCount(value + 1, 2, 5))}>+</button>
                </div>
              </label>
            ) : null}
          </div>

          {quickRank === "special" ? (
            <label className="gm-token-v5-wide-control">
              <span>{copy.specialFeature}</span>
              <select className="pip-input" value={specialFeatureId} onChange={(event) => setSpecialFeatureId(event.target.value)}>
                <option value="">— {copy.selectFeature} —</option>
                {SPECIAL_CREATURE_FEATURES.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
              </select>
            </label>
          ) : null}

          {quickRank === "legendary" ? (
            <div className="gm-token-v5-legendary-controls">
              <label className="gm-token-v5-wide-control">
                <span>{copy.legendaryAbility}</span>
                <select className="pip-input" value={legendaryAbilityId} onChange={(event) => setLegendaryAbilityId(event.target.value)}>
                  <option value="">— {copy.selectAbility} —</option>
                  {legendaryOptions.map((ability) => <option key={ability.id} value={ability.id}>{ability.name}</option>)}
                </select>
              </label>
              <label>
                <span>{copy.rewardType}</span>
                <select className="pip-input" value={rewardType} onChange={(event) => setRewardType(event.target.value === "armor" ? "armor" : "weapon")}>
                  <option value="weapon">{copy.weapon}</option>
                  <option value="armor">{copy.armor}</option>
                </select>
              </label>
              <label className="gm-token-v5-wide-control">
                <span>{copy.reward}</span>
                <input className="pip-input" value={reward} placeholder={copy.rewardPlaceholder} onChange={(event) => setReward(event.target.value)} />
              </label>
            </div>
          ) : null}

          {quickAttacks.length ? (
            <div className="gm-token-v5-attacks">
              <span>{copy.attacks}</span>
              <div>{quickAttacks.map((name) => <b key={name}>{name}</b>)}</div>
            </div>
          ) : null}

          <button
            type="button"
            className="pip-btn is-primary gm-token-v5-add"
            disabled={spawning || !session?.liveSceneId}
            onClick={spawnSelected}
          >
            {spawning ? copy.adding : `${copy.addToMap}${spawnCount > 1 ? ` ×${spawnCount}` : ""}`}
          </button>
          {spawnStatus ? <div className="gm-token-v5-status">{spawnStatus}</div> : null}
        </div>,
        previewHost
      ) : null}
    </div>
  );
}
