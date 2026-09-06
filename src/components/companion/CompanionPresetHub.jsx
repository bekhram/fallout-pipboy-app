import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CompanionTab from "./CompanionTab.jsx";
import {
  readCompanionState,
  writeCompanionState,
} from "../../utils/companionStorage.js";
import "./companionPresetHub.css";

const COPY = {
  en: {
    addCompanion: "+ COMPANION",
    addPet: "+ PET",
    choose: "CHOOSE PRESET",
    blank: "Blank card",
    dogmeat: "Dogmeat",
    dogmeatDesc: "Level 1 dog companion",
    brahmin: "Brahmin",
    brahminDesc: "Pack animal template",
    cancel: "CANCEL",
    bite: "Bite",
    headbutt: "Headbutt",
    dogType: "Mammal",
    brahminType: "Mammal",
    dogAbilities: "Keen senses. Can assist the player in close combat. Companion level follows the player; HP and Body/Mind can be advanced as the companion grows.",
    dogNotes: "Initiative: same as the player character.",
    brahminAbilities: "Docile wasteland pack animal. Carry Weight can be edited for the specific animal or campaign.",
  },
  ru: {
    addCompanion: "+ КОМПАНЬОН",
    addPet: "+ ПИТОМЕЦ",
    choose: "ВЫБЕРИ ПРЕСЕТ",
    blank: "Пустая карточка",
    dogmeat: "Dogmeat",
    dogmeatDesc: "Пёс-компаньон 1 уровня",
    brahmin: "Брамин",
    brahminDesc: "Шаблон вьючного животного",
    cancel: "ОТМЕНА",
    bite: "Укус",
    headbutt: "Удар головой",
    dogType: "Млекопитающее",
    brahminType: "Млекопитающее",
    dogAbilities: "Острые чувства. Может помогать персонажу в ближнем бою. Уровень компаньона следует за уровнем игрока; HP и Body/Mind можно повышать по мере развития.",
    dogNotes: "Инициатива: как у персонажа игрока.",
    brahminAbilities: "Спокойное вьючное животное Пустоши. Carry Weight можно настроить под конкретное животное или кампанию.",
  },
  uk: {
    addCompanion: "+ КОМПАНЬЙОН",
    addPet: "+ УЛЮБЛЕНЕЦЬ",
    choose: "ОБЕРИ ПРЕСЕТ",
    blank: "Порожня картка",
    dogmeat: "Dogmeat",
    dogmeatDesc: "Пес-компаньйон 1 рівня",
    brahmin: "Брамін",
    brahminDesc: "Шаблон в'ючної тварини",
    cancel: "СКАСУВАТИ",
    bite: "Укус",
    headbutt: "Удар головою",
    dogType: "Ссавець",
    brahminType: "Ссавець",
    dogAbilities: "Гострі чуття. Може допомагати персонажу в ближньому бою. Рівень компаньйона слідує за рівнем гравця; HP і Body/Mind можна підвищувати під час розвитку.",
    dogNotes: "Ініціатива: як у персонажа гравця.",
    brahminAbilities: "Спокійна в'ючна тварина Пустки. Carry Weight можна налаштувати під конкретну тварину або кампанію.",
  },
  pl: {
    addCompanion: "+ TOWARZYSZ",
    addPet: "+ PUPIL",
    choose: "WYBIERZ PRESET",
    blank: "Pusta karta",
    dogmeat: "Dogmeat",
    dogmeatDesc: "Psi towarzysz poziomu 1",
    brahmin: "Brahmin",
    brahminDesc: "Szablon zwierzęcia jucznego",
    cancel: "ANULUJ",
    bite: "Ugryzienie",
    headbutt: "Uderzenie głową",
    dogType: "Ssak",
    brahminType: "Ssak",
    dogAbilities: "Wyostrzone zmysły. Może pomagać postaci w walce wręcz. Poziom towarzysza podąża za poziomem gracza; HP i Body/Mind można rozwijać wraz z postępem.",
    dogNotes: "Inicjatywa: jak postać gracza.",
    brahminAbilities: "Spokojne zwierzę juczne Pustkowi. Carry Weight można dostosować do konkretnego zwierzęcia lub kampanii.",
  },
};

function languageCode(value) {
  const code = String(value || "en").split("-")[0];
  return COPY[code] ? code : "en";
}

function makeId(prefix = "cmp") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeAttack(seed = {}) {
  return {
    id: makeId("atk"),
    name: seed.name || "",
    attribute: seed.attribute || "body",
    skill: seed.skill || "melee",
    damage: String(seed.damage ?? "2"),
    damageType: seed.damageType || "physical",
    effects: seed.effects || "",
    difficulty: String(seed.difficulty ?? "1"),
    diceCount: String(seed.diceCount ?? "2"),
  };
}

function buildPreset(id, kind, copy) {
  const base = {
    id: makeId(),
    kind,
    name: "",
    creatureType: "",
    level: "1",
    body: "5",
    mind: "4",
    melee: "0",
    guns: "0",
    other: "0",
    currentHp: "6",
    maxHp: "6",
    initiative: "",
    defense: "1",
    carryWeight: "",
    meleeBonus: "",
    physDr: "0",
    energyDr: "0",
    radDr: "0",
    poisonDr: "0",
    attacks: [],
    attackNotes: "",
    specialAbilities: "",
    notes: "",
  };

  if (id === "dogmeat") {
    return {
      ...base,
      kind,
      name: "Dogmeat",
      creatureType: copy.dogType,
      level: "1",
      body: "5",
      mind: "4",
      melee: "2",
      other: "1",
      currentHp: "6",
      maxHp: "6",
      defense: "1",
      carryWeight: "50",
      attacks: [
        makeAttack({
          name: copy.bite,
          attribute: "body",
          skill: "melee",
          damage: "2",
          damageType: "physical",
          effects: "Vicious",
          difficulty: "1",
          diceCount: "2",
        }),
      ],
      specialAbilities: copy.dogAbilities,
      notes: copy.dogNotes,
    };
  }

  if (id === "brahmin") {
    return {
      ...base,
      kind,
      name: copy.brahmin,
      creatureType: copy.brahminType,
      level: "3",
      body: "6",
      mind: "4",
      melee: "1",
      other: "2",
      currentHp: "9",
      maxHp: "9",
      initiative: "10",
      defense: "1",
      physDr: "1",
      energyDr: "1",
      attacks: [
        makeAttack({
          name: copy.headbutt,
          attribute: "body",
          skill: "melee",
          damage: "4",
          damageType: "physical",
          difficulty: "1",
          diceCount: "2",
        }),
      ],
      specialAbilities: copy.brahminAbilities,
    };
  }

  return base;
}

export default function CompanionPresetHub({ onRoll = null }) {
  const { i18n } = useTranslation();
  const lang = languageCode(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[lang];
  const [pickerKind, setPickerKind] = useState(null);
  const [revision, setRevision] = useState(0);
  const [startEditorOnMount, setStartEditorOnMount] = useState(false);

  const presets = useMemo(
    () => [
      { id: "blank", title: copy.blank, description: "" },
      { id: "dogmeat", title: copy.dogmeat, description: copy.dogmeatDesc },
      { id: "brahmin", title: copy.brahmin, description: copy.brahminDesc },
    ],
    [copy]
  );

  const addPreset = (presetId) => {
    if (!pickerKind) return;
    const item = buildPreset(presetId, pickerKind, copy);
    const current = readCompanionState();
    writeCompanionState({
      items: [...current.items, item],
      activeId: item.id,
    });
    setPickerKind(null);
    setStartEditorOnMount(true);
    setRevision((value) => value + 1);
  };

  return (
    <div className="companion-preset-hub">
      <div className="pip-panel pip-block companion-preset-toolbar">
        <div className="pip-inventory-actions companion-preset-add-row">
          <button type="button" className="pip-btn is-primary" onClick={() => setPickerKind("companion")}>
            {copy.addCompanion}
          </button>
          <button type="button" className="pip-btn" onClick={() => setPickerKind("pet")}>
            {copy.addPet}
          </button>
        </div>

        {pickerKind ? (
          <div className="pip-editor-fullscreen" role="dialog" aria-modal="true" aria-label={copy.choose}>
            <div className="pip-editor-fullscreen__body companion-preset-fullscreen">
              <button
                type="button"
                className="pip-btn pip-editor-fullscreen__close"
                onClick={() => setPickerKind(null)}
                aria-label={copy.cancel}
                title={copy.cancel}
              >
                ×
              </button>
              <div className="pip-logbox companion-preset-picker">
                <div className="companion-preset-picker-head">
                  <strong>[ {copy.choose} ]</strong>
                </div>
                <div className="companion-preset-options">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="pip-btn companion-preset-option"
                      onClick={() => addPreset(preset.id)}
                    >
                      <strong>{preset.title}</strong>
                      {preset.description ? <span>{preset.description}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <CompanionTab key={revision} onRoll={onRoll} startInEditMode={startEditorOnMount} />
    </div>
  );
}
