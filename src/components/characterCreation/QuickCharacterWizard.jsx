import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildDefaultForm,
  SPECIAL_KEYS,
  SKILL_KEYS,
  SKILL_LABEL_KEYS,
} from "../../constants.js";
import {
  ORIGINS,
  ORIGINS_LIST,
  TRAITS_DICTIONARY,
} from "../data/origins.js";
import { PERKS_LIST } from "../data/perks.js";
import { getAddedPerkTranslation } from "../data/perkTranslations.js";
import {
  getOriginEquipmentGrant,
  getTagSkillEquipmentGrant,
} from "../../data/startingEquipment.js";
import { getDerivedStats } from "../../utils/characterMath.js";
import "./characterCreation.css";

export const CREATION_COPY = {
  en: {
    chooseMode: "CREATE NEW CHARACTER",
    chooseModeDesc: "Choose how you want to start.",
    blank: "Blank character sheet",
    blankDesc: "Open an empty sheet and configure everything manually.",
    quick: "Quick creation for beginners",
    quickDesc: "A guided 4-step tutorial that builds a rules-ready level 1 character.",
    tutorial: "BEGINNER CHARACTER CREATION",
    step: "Step",
    of: "of",
    back: "Back",
    next: "Next",
    cancel: "Cancel",
    finish: "Create character",
    originTitle: "Choose your Origin",
    originHelp: "Origin determines your background, special rules, available Tag Skills and starting equipment.",
    traits: "Choose traits",
    equipmentPack: "Starting equipment",
    selectPack: "-- Select equipment pack --",
    equipmentChoices: "Equipment choices",
    specialTitle: "Distribute S.P.E.C.I.A.L.",
    specialHelp: "You have 40 total S.P.E.C.I.A.L. points. Every attribute starts at 5. Adjust them while respecting your Origin limits.",
    total: "Total",
    remaining: "Remaining",
    specialReady: "All 40 points are assigned.",
    skillTitle: "Distribute Skills and choose Tag Skills",
    skillHelp: "Assign 9 starting Skill ranks. A starting Skill can have up to rank 3. Then choose all Tag Skills allowed by your Origin; each Tag gives +2 in the app and grants its starting items.",
    skillPoints: "Skill points",
    tags: "Tag Skills",
    requiredTags: "Required marked Tags",
    itemChoice: "Starting item",
    perkTitle: "Choose a Perk",
    perkHelp: "Only perks whose level-1 requirements your character currently meets are shown.",
    searchPerks: "Search perks...",
    noPerks: "No matching available perks.",
    requirements: "Requirements",
    maxRank: "Max rank",
    summary: "Everything is ready. Origin and Tag Skill items will be added to Inventory automatically when the character is created.",
    needOrigin: "Choose an Origin and its starting equipment first.",
    needTraits: "Choose all required Origin traits.",
    needSpecial: "Assign exactly 40 S.P.E.C.I.A.L. points.",
    needSkills: "Assign exactly 9 Skill ranks and all required Tag Skills.",
    needPerk: "Choose one available Perk.",
    available: "Available",
    selected: "Selected",
  },
  ru: {
    chooseMode: "СОЗДАТЬ НОВОГО ПЕРСОНАЖА",
    chooseModeDesc: "Выбери способ создания персонажа.",
    blank: "Пустой лист персонажа",
    blankDesc: "Открыть пустой лист и настроить всё вручную.",
    quick: "Быстрое создание для новичков",
    quickDesc: "Пошаговый туториал из 4 этапов для создания готового персонажа 1 уровня.",
    tutorial: "БЫСТРОЕ СОЗДАНИЕ ПЕРСОНАЖА",
    step: "Шаг",
    of: "из",
    back: "Назад",
    next: "Далее",
    cancel: "Отмена",
    finish: "Создать персонажа",
    originTitle: "Выбери Origin",
    originHelp: "Origin определяет происхождение, особые правила, доступные Tag Skills и стартовое снаряжение.",
    traits: "Выбери трейты",
    equipmentPack: "Стартовое снаряжение",
    selectPack: "-- Выбери набор снаряжения --",
    equipmentChoices: "Выбор предметов",
    specialTitle: "Распредели S.P.E.C.I.A.L.",
    specialHelp: "Всего доступно 40 очков S.P.E.C.I.A.L. Каждая характеристика начинает с 5. Распредели их с учётом ограничений Origin.",
    total: "Всего",
    remaining: "Осталось",
    specialReady: "Все 40 очков распределены.",
    skillTitle: "Распредели навыки и выбери Tag Skills",
    skillHelp: "Распредели 9 стартовых рангов навыков. На старте навык может иметь максимум 3 ранга. Затем выбери все Tag Skills, доступные Origin: приложение учитывает +2 и автоматически выдаёт стартовые предметы.",
    skillPoints: "Очки навыков",
    tags: "Tag Skills",
    requiredTags: "Обязательные отмеченные теги",
    itemChoice: "Стартовый предмет",
    perkTitle: "Выбери Perk",
    perkHelp: "Показаны только перки, требованиям которых твой персонаж соответствует на 1 уровне.",
    searchPerks: "Поиск перков...",
    noPerks: "Подходящих перков не найдено.",
    requirements: "Требования",
    maxRank: "Макс. ранг",
    summary: "Всё готово. Предметы Origin и Tag Skills автоматически появятся в инвентаре после создания персонажа.",
    needOrigin: "Сначала выбери Origin и стартовый набор снаряжения.",
    needTraits: "Выбери все обязательные трейты Origin.",
    needSpecial: "Нужно распределить ровно 40 очков S.P.E.C.I.A.L.",
    needSkills: "Нужно распределить ровно 9 рангов навыков и выбрать все обязательные Tag Skills.",
    needPerk: "Выбери один доступный Perk.",
    available: "Доступно",
    selected: "Выбрано",
  },
  uk: {
    chooseMode: "СТВОРИТИ НОВОГО ПЕРСОНАЖА",
    chooseModeDesc: "Обери спосіб створення персонажа.",
    blank: "Порожній лист персонажа",
    blankDesc: "Відкрити порожній лист і налаштувати все вручну.",
    quick: "Швидке створення для новачків",
    quickDesc: "Покроковий туторіал із 4 етапів для створення готового персонажа 1 рівня.",
    tutorial: "ШВИДКЕ СТВОРЕННЯ ПЕРСОНАЖА",
    step: "Крок",
    of: "з",
    back: "Назад",
    next: "Далі",
    cancel: "Скасувати",
    finish: "Створити персонажа",
    originTitle: "Обери Origin",
    originHelp: "Origin визначає походження, особливі правила, доступні Tag Skills і стартове спорядження.",
    traits: "Обери трейти",
    equipmentPack: "Стартове спорядження",
    selectPack: "-- Обери набір спорядження --",
    equipmentChoices: "Вибір предметів",
    specialTitle: "Розподіли S.P.E.C.I.A.L.",
    specialHelp: "Усього доступно 40 очок S.P.E.C.I.A.L. Кожна характеристика починається з 5. Розподіли їх з урахуванням обмежень Origin.",
    total: "Усього",
    remaining: "Залишилось",
    specialReady: "Усі 40 очок розподілено.",
    skillTitle: "Розподіли навички та обери Tag Skills",
    skillHelp: "Розподіли 9 стартових рангів навичок. На старті навичка може мати максимум 3 ранги. Потім обери всі Tag Skills, доступні Origin: застосунок врахує +2 та автоматично видасть стартові предмети.",
    skillPoints: "Очки навичок",
    tags: "Tag Skills",
    requiredTags: "Обов'язкові позначені теги",
    itemChoice: "Стартовий предмет",
    perkTitle: "Обери Perk",
    perkHelp: "Показано лише перки, вимогам яких персонаж відповідає на 1 рівні.",
    searchPerks: "Пошук перків...",
    noPerks: "Відповідних перків не знайдено.",
    requirements: "Вимоги",
    maxRank: "Макс. ранг",
    summary: "Усе готово. Предмети Origin і Tag Skills автоматично з'являться в інвентарі після створення персонажа.",
    needOrigin: "Спочатку обери Origin і стартовий набір спорядження.",
    needTraits: "Обери всі обов'язкові трейти Origin.",
    needSpecial: "Потрібно розподілити рівно 40 очок S.P.E.C.I.A.L.",
    needSkills: "Потрібно розподілити рівно 9 рангів навичок і обрати всі обов'язкові Tag Skills.",
    needPerk: "Обери один доступний Perk.",
    available: "Доступно",
    selected: "Обрано",
  },
  pl: {
    chooseMode: "UTWÓRZ NOWĄ POSTAĆ",
    chooseModeDesc: "Wybierz sposób tworzenia postaci.",
    blank: "Pusta karta postaci",
    blankDesc: "Otwórz pustą kartę i skonfiguruj wszystko ręcznie.",
    quick: "Szybkie tworzenie dla początkujących",
    quickDesc: "4-etapowy samouczek prowadzący do gotowej postaci 1. poziomu.",
    tutorial: "SZYBKIE TWORZENIE POSTACI",
    step: "Krok",
    of: "z",
    back: "Wstecz",
    next: "Dalej",
    cancel: "Anuluj",
    finish: "Utwórz postać",
    originTitle: "Wybierz Origin",
    originHelp: "Origin określa pochodzenie, zasady specjalne, dostępne Tag Skills i wyposażenie startowe.",
    traits: "Wybierz cechy",
    equipmentPack: "Wyposażenie startowe",
    selectPack: "-- Wybierz zestaw wyposażenia --",
    equipmentChoices: "Wybór przedmiotów",
    specialTitle: "Rozdziel S.P.E.C.I.A.L.",
    specialHelp: "Masz łącznie 40 punktów S.P.E.C.I.A.L. Każda cecha zaczyna od 5. Rozdziel punkty zgodnie z ograniczeniami Origin.",
    total: "Razem",
    remaining: "Pozostało",
    specialReady: "Wszystkie 40 punktów zostało przydzielonych.",
    skillTitle: "Rozdziel umiejętności i wybierz Tag Skills",
    skillHelp: "Rozdziel 9 początkowych rang umiejętności. Na starcie umiejętność może mieć maksymalnie 3 rangi. Następnie wybierz wszystkie Tag Skills dostępne dla Origin; aplikacja doliczy +2 i automatycznie doda przedmioty startowe.",
    skillPoints: "Punkty umiejętności",
    tags: "Tag Skills",
    requiredTags: "Wymagane oznaczone tagi",
    itemChoice: "Przedmiot startowy",
    perkTitle: "Wybierz Perk",
    perkHelp: "Pokazane są tylko perki, których wymagania spełnia twoja postać na 1. poziomie.",
    searchPerks: "Szukaj perków...",
    noPerks: "Brak pasujących dostępnych perków.",
    requirements: "Wymagania",
    maxRank: "Maks. ranga",
    summary: "Gotowe. Przedmioty z Origin i Tag Skills zostaną automatycznie dodane do ekwipunku po utworzeniu postaci.",
    needOrigin: "Najpierw wybierz Origin i zestaw wyposażenia startowego.",
    needTraits: "Wybierz wszystkie wymagane cechy Origin.",
    needSpecial: "Przydziel dokładnie 40 punktów S.P.E.C.I.A.L.",
    needSkills: "Przydziel dokładnie 9 rang umiejętności i wybierz wszystkie wymagane Tag Skills.",
    needPerk: "Wybierz jeden dostępny Perk.",
    available: "Dostępne",
    selected: "Wybrane",
  },
};

export function getCreationCopy(language) {
  const key = String(language || "en").split("-")[0];
  return CREATION_COPY[key] || CREATION_COPY.en;
}

function getChoiceEntries(entries = []) {
  return (entries || []).filter((entry) => entry?.type === "choice");
}

function describeQuantity(quantity) {
  if (typeof quantity === "number" && quantity > 1) return ` ×${quantity}`;
  return "";
}

function choiceOptionLabel(option = []) {
  const names = option
    .filter((entry) => entry?.type === "item")
    .map((entry) => `${entry.name}${describeQuantity(entry.quantity)}`);
  return names.join(" + ") || "Option";
}

function getPerkWarnings(perk, form) {
  const reqString = perk?.requirements;
  if (!reqString || reqString === "None") return [];

  const warnings = [];
  const stats = {
    STR: Number(form?.special?.S || 0),
    PER: Number(form?.special?.P || 0),
    END: Number(form?.special?.E || 0),
    CHA: Number(form?.special?.C || 0),
    INT: Number(form?.special?.I || 0),
    AGI: Number(form?.special?.A || 0),
    LCK: Number(form?.special?.L || 0),
  };
  const level = Number(form?.level || 1);
  const isRobot = form?.origin === "mister_handy";

  String(reqString)
    .split(",")
    .map((part) => part.trim())
    .forEach((part) => {
      const levelMatch = part.match(/Level\s*(\d+)\+/i);
      if (levelMatch) {
        if (level < Number(levelMatch[1])) warnings.push(part);
        return;
      }

      const statMatch = part.match(/(STR|PER|END|CHA|INT|AGI|LCK)\s*(\d+)/i);
      if (statMatch) {
        if (Number(stats[statMatch[1].toUpperCase()] || 0) < Number(statMatch[2])) {
          warnings.push(part);
        }
        return;
      }

      if (part.toLowerCase() === "not a robot" && isRobot) warnings.push(part);
    });

  return warnings;
}

function makeOriginTraitCards(originId, selectedTraits, t) {
  const origin = ORIGINS[originId];
  if (!origin) return [];

  return [...(origin.traits || []), ...(selectedTraits || [])]
    .map((traitKey) => {
      const id = TRAITS_DICTIONARY[traitKey];
      if (!id) return null;
      return {
        id,
        name: t(`traitsInfo.${id}.name`, { defaultValue: id }),
        rank: "1",
        description: t(`traitsInfo.${id}.desc`, { defaultValue: "" }),
        isOriginTrait: true,
      };
    })
    .filter(Boolean);
}

export default function QuickCharacterWizard({ open, onCancel, onComplete }) {
  const { t, i18n } = useTranslation();
  const copy = getCreationCopy(i18n.resolvedLanguage || i18n.language);
  const [step, setStep] = useState(1);
  const [originId, setOriginId] = useState("");
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [equipmentPack, setEquipmentPack] = useState("");
  const [special, setSpecial] = useState(() => ({ ...buildDefaultForm().special }));
  const [skills, setSkills] = useState(() => ({ ...buildDefaultForm().skills }));
  const [startingChoices, setStartingChoices] = useState({});
  const [perkId, setPerkId] = useState("");
  const [perkSearch, setPerkSearch] = useState("");

  const origin = originId ? ORIGINS[originId] : null;
  const originTraitRequired = Number(origin?.traitSelectCount || 0);
  const selectedTraitReady =
    !origin?.availableTraits?.length || selectedTraits.length === originTraitRequired;

  const specialTotal = SPECIAL_KEYS.reduce(
    (sum, key) => sum + Number(special?.[key] || 0),
    0
  );
  const specialRemaining = 40 - specialTotal;

  let tagLimit = Number(origin?.tagSkillCount || 3);
  if (selectedTraits.includes("educated")) tagLimit += 1;
  const restrictedTags = origin?.restrictedTagList || [];
  const restrictedRequired = Number(origin?.restrictedTagCount || 0);

  const usedSkillPoints = SKILL_KEYS.reduce(
    (sum, key) => sum + Number(skills?.[key]?.rank || 0),
    0
  );
  const taggedSkills = SKILL_KEYS.filter((key) => Boolean(skills?.[key]?.tagged));
  const restrictedTaggedCount = taggedSkills.filter((key) => restrictedTags.includes(key)).length;

  const draftForPerks = useMemo(
    () => ({
      ...buildDefaultForm(),
      origin: originId,
      originTraits: selectedTraits,
      special,
      skills,
      level: "1",
    }),
    [originId, selectedTraits, special, skills]
  );

  const localizedPerk = (perk) => {
    const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
    const added = getAddedPerkTranslation(perk.id, language);
    return {
      name:
        added?.name ||
        t(`perksInfo.${perk.id}.name`, { defaultValue: perk.name || perk.id }),
      description:
        added?.description ||
        t(`perksInfo.${perk.id}.desc`, { defaultValue: perk.description || "" }),
    };
  };

  const availablePerks = useMemo(() => {
    const query = perkSearch.trim().toLowerCase();
    return PERKS_LIST.filter((perk) => getPerkWarnings(perk, draftForPerks).length === 0)
      .filter((perk) => {
        if (!query) return true;
        const localized = localizedPerk(perk);
        return `${localized.name} ${localized.description}`.toLowerCase().includes(query);
      });
  }, [draftForPerks, perkSearch, i18n.resolvedLanguage, i18n.language]);

  if (!open) return null;

  const originReady = Boolean(originId && equipmentPack && selectedTraitReady);
  const specialReady = specialTotal === 40;
  const skillsReady =
    usedSkillPoints === 9 &&
    taggedSkills.length === tagLimit &&
    restrictedTaggedCount >= restrictedRequired;
  const perkReady = Boolean(perkId);

  const canContinue =
    step === 1 ? originReady : step === 2 ? specialReady : step === 3 ? skillsReady : perkReady;

  const setOrigin = (id) => {
    setOriginId(id);
    setSelectedTraits([]);
    setEquipmentPack("");
    setSpecial({ ...buildDefaultForm().special });
    setSkills({ ...buildDefaultForm().skills });
    setStartingChoices({});
    setPerkId("");
  };

  const setPack = (packId) => {
    setEquipmentPack(packId);
    setStartingChoices((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([key]) => !key.startsWith("origin:"))
      );
      const sourceKey = `origin:${originId}:${packId}`;
      const defaults = {};
      getChoiceEntries(getOriginEquipmentGrant(packId)).forEach((entry) => {
        defaults[entry.id] = Number(entry.defaultOption || 0);
      });
      next[sourceKey] = defaults;
      return next;
    });
  };

  const updateOriginChoice = (choiceId, optionIndex) => {
    const sourceKey = `origin:${originId}:${equipmentPack}`;
    setStartingChoices((prev) => ({
      ...prev,
      [sourceKey]: {
        ...(prev[sourceKey] || {}),
        [choiceId]: Number(optionIndex),
      },
    }));
  };

  const changeSpecial = (key, delta) => {
    if (!origin) return;
    const limits = origin.specialLimits || { min: 1, max: 10 };
    const min = Number(limits.min ?? 1);
    const max = Number(limits[key] ?? limits.max ?? 10);
    setSpecial((prev) => {
      const current = Number(prev[key] || 0);
      const nextValue = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [key]: String(nextValue) };
    });
    setPerkId("");
  };

  const changeSkillRank = (skillName, delta) => {
    const current = Number(skills?.[skillName]?.rank || 0);
    const nextRank = Math.max(0, Math.min(3, current + delta));
    if (delta > 0 && usedSkillPoints >= 9) return;
    setSkills((prev) => ({
      ...prev,
      [skillName]: {
        ...prev[skillName],
        rank: String(nextRank),
      },
    }));
  };

  const toggleTag = (skillName) => {
    const isTagged = Boolean(skills?.[skillName]?.tagged);
    if (!isTagged && taggedSkills.length >= tagLimit) return;

    setSkills((prev) => ({
      ...prev,
      [skillName]: {
        ...prev[skillName],
        tagged: !isTagged,
      },
    }));

    const sourceKey = `tag:${skillName}`;
    if (!isTagged) {
      const defaults = {};
      getChoiceEntries(getTagSkillEquipmentGrant(skillName)).forEach((entry) => {
        defaults[entry.id] = Number(entry.defaultOption || 0);
      });
      if (Object.keys(defaults).length) {
        setStartingChoices((prev) => ({ ...prev, [sourceKey]: defaults }));
      }
    } else {
      setStartingChoices((prev) => {
        const next = { ...prev };
        delete next[sourceKey];
        return next;
      });
    }
  };

  const updateTagChoice = (skillName, choiceId, optionIndex) => {
    const sourceKey = `tag:${skillName}`;
    setStartingChoices((prev) => ({
      ...prev,
      [sourceKey]: {
        ...(prev[sourceKey] || {}),
        [choiceId]: Number(optionIndex),
      },
    }));
  };

  const finish = () => {
    if (!perkReady || !origin) return;
    const perk = PERKS_LIST.find((entry) => entry.id === perkId);
    if (!perk) return;
    const perkText = localizedPerk(perk);
    const originTraitCards = makeOriginTraitCards(originId, selectedTraits, t);

    let finalForm = {
      ...buildDefaultForm(),
      activeConsumableEffects: [],
      origin: originId,
      originTraits: selectedTraits,
      originEquipmentPack: equipmentPack,
      startingEquipmentGrants: {},
      startingEquipmentChoices: startingChoices,
      special,
      skills,
      tagged_skills: taggedSkills,
      perksAndTraits: [
        ...originTraitCards,
        {
          id: perk.id,
          name: perkText.name,
          rank: "1",
          description: `${perkText.description}\n[Req: ${perk.requirements} | Max Rank: ${perk.maxRanks}]`,
        },
      ],
      characterCreationMode: "quick",
    };

    const derived = getDerivedStats(finalForm);
    finalForm = {
      ...finalForm,
      currentHp: String(derived.maxHp),
    };

    onComplete?.(finalForm);
  };

  const originChoices = equipmentPack
    ? getChoiceEntries(getOriginEquipmentGrant(equipmentPack))
    : [];

  return (
    <div className="pip-modal-backdrop quick-create-backdrop">
      <div className="pip-modal pip-panel quick-create-modal">
        <div className="quick-create-header">
          <div>
            <div className="pip-bootline">[ {copy.tutorial} ]</div>
            <h2>{copy.step} {step} {copy.of} 4</h2>
          </div>
          <button type="button" className="pip-btn" onClick={onCancel}>✕</button>
        </div>

        <div className="quick-create-progress" aria-label={`${step}/4`}>
          {[1, 2, 3, 4].map((value) => (
            <div key={value} className={`quick-create-progress-segment ${value <= step ? "is-active" : ""}`} />
          ))}
        </div>

        <div className="quick-create-body">
          {step === 1 && (
            <>
              <div className="quick-create-intro">
                <h3>{copy.originTitle}</h3>
                <p>{copy.originHelp}</p>
              </div>

              <div className="quick-origin-grid">
                {ORIGINS_LIST.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`pip-btn quick-origin-btn ${originId === entry.id ? "is-primary" : ""}`}
                    onClick={() => setOrigin(entry.id)}
                  >
                    {t(entry.translationKey, { defaultValue: entry.id })}
                  </button>
                ))}
              </div>

              {origin && (
                <div className="quick-create-section">
                  {origin.availableTraits?.length > 0 && (
                    <div className="quick-create-subsection">
                      <strong>{copy.traits} ({selectedTraits.length}/{originTraitRequired})</strong>
                      <div className="quick-trait-list">
                        {origin.availableTraits.map((traitId) => {
                          const checked = selectedTraits.includes(traitId);
                          const disabled = !checked && selectedTraits.length >= originTraitRequired;
                          return (
                            <label key={traitId} className={`quick-choice-card ${checked ? "is-selected" : ""}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => {
                                  setSelectedTraits((prev) =>
                                    checked ? prev.filter((id) => id !== traitId) : [...prev, traitId]
                                  );
                                }}
                              />
                              <span>
                                <strong>{t(`traitsInfo.${traitId}.name`, { defaultValue: traitId })}</strong>
                                <small>{t(`traitsInfo.${traitId}.desc`, { defaultValue: "" })}</small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="quick-create-subsection">
                    <label><strong>{copy.equipmentPack}</strong></label>
                    <select className="pip-input" value={equipmentPack} onChange={(e) => setPack(e.target.value)}>
                      <option value="">{copy.selectPack}</option>
                      {(origin.equipmentPacks || []).map((packId) => (
                        <option key={packId} value={packId}>
                          {t(`equipmentPacks.${packId}.name`, { defaultValue: packId })}
                        </option>
                      ))}
                    </select>
                    {equipmentPack && (
                      <div className="pip-logbox quick-equipment-summary">
                        {t(`equipmentPacks.${equipmentPack}.items`, { defaultValue: "" })}
                      </div>
                    )}
                  </div>

                  {originChoices.length > 0 && (
                    <div className="quick-create-subsection">
                      <strong>{copy.equipmentChoices}</strong>
                      <div className="quick-select-stack">
                        {originChoices.map((choice) => {
                          const sourceKey = `origin:${originId}:${equipmentPack}`;
                          const value = Number(startingChoices?.[sourceKey]?.[choice.id] ?? choice.defaultOption ?? 0);
                          return (
                            <label key={choice.id}>
                              <span>{choice.id}</span>
                              <select className="pip-input" value={value} onChange={(e) => updateOriginChoice(choice.id, e.target.value)}>
                                {(choice.options || []).map((option, index) => (
                                  <option key={index} value={index}>{choiceOptionLabel(option)}</option>
                                ))}
                              </select>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="quick-create-intro">
                <h3>{copy.specialTitle}</h3>
                <p>{copy.specialHelp}</p>
              </div>
              <div className={`quick-budget ${specialReady ? "is-ready" : ""}`}>
                <span>{copy.total}: <strong>{specialTotal}/40</strong></span>
                <span>{copy.remaining}: <strong>{specialRemaining}</strong></span>
              </div>
              <div className="quick-special-grid">
                {SPECIAL_KEYS.map((key) => {
                  const limits = origin?.specialLimits || { min: 1, max: 10 };
                  const min = Number(limits.min ?? 1);
                  const max = Number(limits[key] ?? limits.max ?? 10);
                  const value = Number(special[key] || 0);
                  return (
                    <div className="quick-special-card" key={key}>
                      <div className="quick-special-letter">{key}</div>
                      <div className="quick-counter">
                        <button type="button" className="pip-btn" disabled={value <= min} onClick={() => changeSpecial(key, -1)}>−</button>
                        <strong>{value}</strong>
                        <button type="button" className="pip-btn" disabled={value >= max || specialRemaining <= 0} onClick={() => changeSpecial(key, 1)}>+</button>
                      </div>
                      <small>{min}–{max}</small>
                    </div>
                  );
                })}
              </div>
              {specialReady && <div className="pip-logbox quick-ready-note">✓ {copy.specialReady}</div>}
            </>
          )}

          {step === 3 && (
            <>
              <div className="quick-create-intro">
                <h3>{copy.skillTitle}</h3>
                <p>{copy.skillHelp}</p>
              </div>
              <div className={`quick-budget ${skillsReady ? "is-ready" : ""}`}>
                <span>{copy.skillPoints}: <strong>{usedSkillPoints}/9</strong></span>
                <span>{copy.tags}: <strong>{taggedSkills.length}/{tagLimit}</strong></span>
                {restrictedRequired > 0 && (
                  <span>{copy.requiredTags}: <strong>{restrictedTaggedCount}/{restrictedRequired}</strong></span>
                )}
              </div>

              <div className="quick-skill-list">
                {SKILL_KEYS.map((skillName) => {
                  const skill = skills[skillName];
                  const isTagged = Boolean(skill?.tagged);
                  const marked = restrictedTags.includes(skillName);
                  const tagChoices = isTagged ? getChoiceEntries(getTagSkillEquipmentGrant(skillName)) : [];
                  return (
                    <div className={`quick-skill-row ${isTagged ? "is-tagged" : ""}`} key={skillName}>
                      <div className="quick-skill-main">
                        <div className="quick-skill-name">
                          {t(SKILL_LABEL_KEYS?.[skillName] || skillName)}
                          {marked && restrictedRequired > 0 && <span className="quick-required-mark">*</span>}
                        </div>
                        <div className="quick-counter compact">
                          <button type="button" className="pip-btn" disabled={Number(skill.rank || 0) <= 0} onClick={() => changeSkillRank(skillName, -1)}>−</button>
                          <strong>{skill.rank || "0"}</strong>
                          <button type="button" className="pip-btn" disabled={Number(skill.rank || 0) >= 3 || usedSkillPoints >= 9} onClick={() => changeSkillRank(skillName, 1)}>+</button>
                        </div>
                        <button
                          type="button"
                          className={`pip-skill-tag-btn ${isTagged ? "is-on" : ""}`}
                          disabled={!isTagged && taggedSkills.length >= tagLimit}
                          onClick={() => toggleTag(skillName)}
                        >
                          TAG +2
                        </button>
                      </div>

                      {tagChoices.map((choice) => {
                        const sourceKey = `tag:${skillName}`;
                        const value = Number(startingChoices?.[sourceKey]?.[choice.id] ?? choice.defaultOption ?? 0);
                        return (
                          <label className="quick-tag-choice" key={choice.id}>
                            <span>{copy.itemChoice}</span>
                            <select className="pip-input" value={value} onChange={(e) => updateTagChoice(skillName, choice.id, e.target.value)}>
                              {(choice.options || []).map((option, index) => (
                                <option key={index} value={index}>{choiceOptionLabel(option)}</option>
                              ))}
                            </select>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="quick-create-intro">
                <h3>{copy.perkTitle}</h3>
                <p>{copy.perkHelp}</p>
              </div>
              <input
                className="pip-input"
                type="search"
                value={perkSearch}
                onChange={(e) => setPerkSearch(e.target.value)}
                placeholder={copy.searchPerks}
              />

              <div className="quick-perk-list">
                {availablePerks.map((perk) => {
                  const localized = localizedPerk(perk);
                  const selected = perkId === perk.id;
                  return (
                    <button
                      key={perk.id}
                      type="button"
                      className={`quick-perk-card ${selected ? "is-selected" : ""}`}
                      onClick={() => setPerkId(perk.id)}
                    >
                      <div className="quick-perk-heading">
                        <strong>{localized.name}</strong>
                        <span>{selected ? copy.selected : copy.available}</span>
                      </div>
                      <p>{localized.description}</p>
                      <small>{copy.requirements}: {perk.requirements} · {copy.maxRank}: {perk.maxRanks}</small>
                    </button>
                  );
                })}
                {availablePerks.length === 0 && <div className="pip-logbox">{copy.noPerks}</div>}
              </div>

              {perkReady && <div className="pip-logbox quick-ready-note">✓ {copy.summary}</div>}
            </>
          )}
        </div>

        <div className="quick-create-footer">
          <button
            type="button"
            className="pip-btn"
            onClick={() => (step === 1 ? onCancel?.() : setStep((value) => Math.max(1, value - 1)))}
          >
            {step === 1 ? copy.cancel : copy.back}
          </button>

          <div className="quick-create-validation">
            {!canContinue && step === 1 && (selectedTraitReady ? copy.needOrigin : copy.needTraits)}
            {!canContinue && step === 2 && copy.needSpecial}
            {!canContinue && step === 3 && copy.needSkills}
            {!canContinue && step === 4 && copy.needPerk}
          </div>

          {step < 4 ? (
            <button type="button" className="pip-btn is-primary" disabled={!canContinue} onClick={() => setStep((value) => Math.min(4, value + 1))}>
              {copy.next}
            </button>
          ) : (
            <button type="button" className="pip-btn is-primary" disabled={!perkReady} onClick={finish}>
              {copy.finish}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
