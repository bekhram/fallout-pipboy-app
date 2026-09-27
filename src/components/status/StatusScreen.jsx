import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import HpPanel from "./HpPanel.jsx";
import VitalsPanel from "./VitalsPanel.jsx";
import InjuryPanel from "./InjuryPanel.jsx";
import SheetEffects from "./SheetEffects.jsx";
import SheetProfile from "../layout/SheetProfile.jsx";
import SheetIcon from "../layout/SheetIcon.jsx";
import SheetDisclosure from "../layout/SheetDisclosure.jsx";
import { sheetCopy } from "../layout/sheetCopy.js";
import { getLuckOfTheDrawSetup, getIndividualEscapeSetup } from "../../utils/winterOfAtomRules.js";

const DEHYDRATION_EFFECTS = {
  en: [
    ["Dry Mouth", "Speech tests +1 difficulty; END + Survival D1 before eating."],
    ["Can't Sweat", "Heat exposure causes 2 Fatigue instead of 1."],
    ["Extreme Thirst", "First water source: INT + Survival D2 or consume as much water as possible."],
    ["Dizziness", "AGI tests +1 difficulty; Sprint can make you fall prone."],
    ["Swollen Feet", "After every 2 hours of heavy travel on foot, END + Athletics D1 or suffer 1 Fatigue."],
    ["Weakness", "STR tests +1 difficulty and carrying capacity is reduced."],
    ["Confusion", "INT tests +1 difficulty; Interact becomes a Major Action."],
    ["Headache", "PER tests +1 difficulty and Initiative −2."],
    ["Racing Heart and Breath", "END tests +1 difficulty; suffer 1 Fatigue after an Action scene."],
    ["Fainting", "When gaining Fatigue, END + Survival or fall unconscious for rounds equal to Fatigue."],
  ],
  ru: [
    ["Сухость во рту", "Проверки Speech +1 к сложности; перед едой END + Survival D1."],
    ["Не потеет", "От жары получает 2 Fatigue вместо 1."],
    ["Сильная жажда", "При первом источнике воды INT + Survival D2 или персонаж пьёт максимально возможное количество."],
    ["Головокружение", "Проверки AGI +1 к сложности; Sprint может сбить персонажа с ног."],
    ["Опухшие ноги", "Каждые 2 часа тяжёлого пешего пути END + Athletics D1 или +1 Fatigue."],
    ["Слабость", "Проверки STR +1 к сложности и снижена грузоподъёмность."],
    ["Спутанность", "Проверки INT +1 к сложности; Interact становится Major Action."],
    ["Головная боль", "Проверки PER +1 к сложности; Initiative −2."],
    ["Учащённое сердце и дыхание", "Проверки END +1 к сложности; после Action scene +1 Fatigue."],
    ["Обморок", "При получении Fatigue — END + Survival, иначе потеря сознания на число раундов, равное Fatigue."],
  ],
  uk: [
    ["Сухість у роті", "Перевірки Speech +1 до складності; перед їжею END + Survival D1."],
    ["Не пітніє", "Від спеки отримує 2 Fatigue замість 1."],
    ["Сильна спрага", "При першому джерелі води INT + Survival D2 або персонаж п'є максимально можливу кількість."],
    ["Запаморочення", "Перевірки AGI +1 до складності; Sprint може збити персонажа з ніг."],
    ["Набряклі ноги", "Кожні 2 години важкої ходьби END + Athletics D1 або +1 Fatigue."],
    ["Слабкість", "Перевірки STR +1 до складності та знижена вантажопідйомність."],
    ["Сплутаність", "Перевірки INT +1 до складності; Interact стає Major Action."],
    ["Головний біль", "Перевірки PER +1 до складності; Initiative −2."],
    ["Прискорене серце й дихання", "Перевірки END +1 до складності; після Action scene +1 Fatigue."],
    ["Непритомність", "При отриманні Fatigue — END + Survival, інакше непритомність на кількість раундів, рівну Fatigue."],
  ],
  pl: [
    ["Suchość w ustach", "Testy Speech +1 trudności; przed jedzeniem END + Survival D1."],
    ["Brak potu", "Ekspozycja na upał powoduje 2 Fatigue zamiast 1."],
    ["Skrajne pragnienie", "Pierwsze źródło wody: INT + Survival D2 albo wypicie maksymalnej ilości."],
    ["Zawroty głowy", "Testy AGI +1 trudności; Sprint może przewrócić postać."],
    ["Spuchnięte stopy", "Co 2 godziny ciężkiej podróży pieszo END + Athletics D1 albo +1 Fatigue."],
    ["Osłabienie", "Testy STR +1 trudności i mniejszy udźwig."],
    ["Dezorientacja", "Testy INT +1 trudności; Interact staje się Major Action."],
    ["Ból głowy", "Testy PER +1 trudności; Initiative −2."],
    ["Kołatanie serca i oddech", "Testy END +1 trudności; po Action scene +1 Fatigue."],
    ["Omdlenie", "Przy otrzymaniu Fatigue: END + Survival albo utrata przytomności na liczbę rund równą Fatigue."],
  ],
};

const STIM_COPY = {
  en: { title: "STIMPAK", hp: "Restore HP", injury: "Treat injury", use: "USE", none: "No Stimpaks", chooseInjury: "Choose injury", left: "left" },
  ru: { title: "СТИМПАК", hp: "Восстановить HP", injury: "Вылечить травму", use: "ПРИМЕНИТЬ", none: "Нет стимпаков", chooseInjury: "Выберите травму", left: "ост." },
  uk: { title: "СТИМПАК", hp: "Відновити HP", injury: "Вилікувати травму", use: "ЗАСТОСУВАТИ", none: "Немає стимпаків", chooseInjury: "Оберіть травму", left: "зал." },
  pl: { title: "STIMPAK", hp: "Przywróć HP", injury: "Wylecz uraz", use: "UŻYJ", none: "Brak Stimpaków", chooseInjury: "Wybierz uraz", left: "poz." },
};

export default function StatusScreen(props) {
  const {
    form,
    derived,
    armor,
    currentLuckPoints = 0,
    onSpendLuck,
    onTopLevelChange,
    onInjuryToggle,
    onArmorChange,
    onArmorStatusCycle,
    onOpenDerived,
    stimpaks = [],
    treatableInjuries = [],
    onUseStimpak,
    combatState,
    onBeginLuckEscape,
    canAttemptLuckEscape = false,
  } = props;
  const { t, i18n } = useTranslation();
  const c = sheetCopy(i18n.resolvedLanguage);
  const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const stimCopy = STIM_COPY[language] || STIM_COPY.en;
  const [stimMode, setStimMode] = useState("hp");
  const [stimIndex, setStimIndex] = useState("");
  const [injuryKey, setInjuryKey] = useState("");
  const [escapeChallenge, setEscapeChallenge] = useState("average");
  const [escapeDistance, setEscapeDistance] = useState("medium");
  const [dehydrationEffect, setDehydrationEffect] = useState(null);
  const luckEscape = getLuckOfTheDrawSetup(escapeChallenge);
  const soloEscape = getIndividualEscapeSetup(escapeDistance);

  const survivalConditions = [["satiety", "starving"], ["thirst", "dehydrated"], ["vigor", "exhausted"]]
    .filter(([field]) => Number(form[field] || 0) === 0)
    .map(([, key]) => ({
      key,
      group: "negative",
      nameKey: `statuses.${key}.name`,
      descriptionKey: `statuses.${key}.description`,
      durationKey: "statuses.duration.whileZero",
      ...(key === "dehydrated" && dehydrationEffect
        ? { randomEffectName: dehydrationEffect[0], randomEffectDescription: dehydrationEffect[1] }
        : {}),
    }));

  useEffect(() => {
    const dehydrated = Number(form.thirst || 0) === 0;
    if (!dehydrated) {
      setDehydrationEffect(null);
      return;
    }
    setDehydrationEffect((current) => {
      if (current) return current;
      const table = DEHYDRATION_EFFECTS[language] || DEHYDRATION_EFFECTS.en;
      return table[Math.floor(Math.random() * table.length)] || table[0];
    });
  }, [form.thirst, language]);

  useEffect(() => {
    if (!stimpaks.length) {
      setStimIndex("");
      return;
    }
    if (!stimpaks.some((item) => String(item.index) === String(stimIndex))) {
      setStimIndex(String(stimpaks[0].index));
    }
  }, [stimpaks, stimIndex]);

  useEffect(() => {
    if (!treatableInjuries.length) {
      setInjuryKey("");
      return;
    }
    if (!treatableInjuries.some((item) => item.key === injuryKey)) {
      setInjuryKey(treatableInjuries[0].key);
    }
  }, [treatableInjuries, injuryKey]);

  const selectedStim = useMemo(
    () => stimpaks.find((item) => String(item.index) === String(stimIndex)) || null,
    [stimpaks, stimIndex]
  );
  const canUseStim = Boolean(
    selectedStim && (stimMode === "hp" || treatableInjuries.some((item) => item.key === injuryKey))
  );

  const applyStim = () => {
    if (!canUseStim) return;
    onUseStimpak?.({
      index: Number(selectedStim.index),
      mode: stimMode,
      injuryKey: stimMode === "injury" ? injuryKey : "",
    });
  };

  return <div className="sheet-overview">
    <SheetProfile {...props}/>
    <HpPanel {...props} maxHp={props.hpMax} currentHp={props.hpCurrent}/>
    <section className="pip-panel sheet-combat"><div className="sheet-card-heading"><SheetIcon name="target"/><h2>{c.combat}</h2><button className="sheet-icon-button sheet-edit-stats" type="button" aria-label={t("main.statsAction")} onClick={onOpenDerived}><SheetIcon name="edit"/></button></div>
      <div className="sheet-combat-grid">
        {[["shield",t("main.defense"),derived.defense],["bolt",t("main.initiative"),derived.initiative],["melee",t("main.melee"),derived.md],["luck",t("derived.luckPoints"),currentLuckPoints]].map(([icon,label,value])=><div className="sheet-combat-stat" key={icon}><SheetIcon name={icon}/><div><small>{label}</small><strong>{value}</strong></div></div>)}
      </div>
      {combatState?.active && (
        <details className="pip-collapsible pip-collapsible--field" style={{marginTop:8}}>
          <summary className="pip-collapsible__summary">[ SURVIVING DEFEAT ]</summary>
          <div className="pip-collapsible__body" style={{display:"grid",gap:8}}>
            <div className="pip-panel" style={{padding:8}}>
              <strong>LUCK OF THE DRAW</strong>
              <label style={{display:"grid",gap:4,marginTop:6}}>
                <span>Encounter challenge</span>
                <select className="pip-input" value={escapeChallenge} onChange={e=>setEscapeChallenge(e.target.value)}>
                  <option value="simple">Simple · 2 Luck</option>
                  <option value="average">Average · 3 Luck</option>
                  <option value="hard">Hard · 4 Luck</option>
                </select>
              </label>
              <small>Spend {luckEscape.luckCost} Luck, then make a group escape test at D{luckEscape.difficulty}. Another attempt is blocked until the next combat turn.</small>
              <button type="button" className="pip-btn" style={{marginTop:6}} disabled={!canAttemptLuckEscape || currentLuckPoints < luckEscape.luckCost} onClick={()=>onBeginLuckEscape?.(luckEscape.luckCost)}>
                SPEND {luckEscape.luckCost} LUCK · ATTEMPT ESCAPE
              </button>
            </div>
            <div className="pip-panel" style={{padding:8}}>
              <strong>EVERY PERSON FOR THEMSELF</strong>
              <label style={{display:"grid",gap:4,marginTop:6}}>
                <span>Distance from nearest enemy who can see you</span>
                <select className="pip-input" value={escapeDistance} onChange={e=>setEscapeDistance(e.target.value)}>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                  <option value="extreme">Extreme</option>
                  <option value="beyond_extreme">Beyond Extreme at round end</option>
                </select>
              </label>
              <small>{soloEscape.automatic ? "Escape is automatic at the end of the round." : `Major action: STR/AGI + Athletics or AGI/PER + Sneak · D${soloEscape.difficulty}`}</small>
            </div>
          </div>
        </details>
      )}
    </section>
    <div className="sheet-body"><InjuryPanel injuries={form.injuries} statuses={form.statuses} armor={armor} derived={derived} onToggle={onInjuryToggle} onArmorChange={onArmorChange} onArmorStatusCycle={onArmorStatusCycle} survivalConditions={survivalConditions} bodyOnly /></div>
    <SheetDisclosure title={c.survival} icon="food" className="sheet-survival"><VitalsPanel form={form} onTopLevelChange={onTopLevelChange} compact /></SheetDisclosure>
    <SheetEffects {...props} survivalConditions={survivalConditions}/>
    <section className="pip-panel sheet-quick">
      <div className="sheet-card-heading"><SheetIcon name="bolt"/><h2>{c.quick}</h2></div>
      <div className="sheet-quick-grid sheet-quick-grid--compact">
        <button type="button" className="sheet-luck-action" disabled={currentLuckPoints <= 0} onClick={onSpendLuck}>
          <SheetIcon name="luck"/><span>{t("main.luckAction")} · {currentLuckPoints}</span>
        </button>

        <div className="sheet-stim-action">
          <div className="sheet-stim-action__title"><SheetIcon name="heart"/><strong>{stimCopy.title}</strong></div>
          <div className="sheet-stim-mode" role="group" aria-label={stimCopy.title}>
            <button type="button" className={stimMode === "hp" ? "is-active" : ""} onClick={() => setStimMode("hp")}>{stimCopy.hp}</button>
            <button type="button" className={stimMode === "injury" ? "is-active" : ""} onClick={() => setStimMode("injury")}>{stimCopy.injury}</button>
          </div>

          {stimpaks.length ? (
            <select className="sheet-stim-select" value={stimIndex} onChange={(event) => setStimIndex(event.target.value)}>
              {stimpaks.map((item) => (
                <option key={item.index} value={item.index}>
                  {item.name} · +{item.healingHp} HP · {item.quantity} {stimCopy.left}
                </option>
              ))}
            </select>
          ) : (
            <div className="sheet-stim-empty">{stimCopy.none}</div>
          )}

          {stimMode === "injury" && (
            treatableInjuries.length ? (
              <select className="sheet-stim-select" value={injuryKey} onChange={(event) => setInjuryKey(event.target.value)}>
                {treatableInjuries.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            ) : (
              <div className="sheet-stim-empty">{stimCopy.chooseInjury}: —</div>
            )
          )}

          <button type="button" className="sheet-stim-use" disabled={!canUseStim} onClick={applyStim}>{stimCopy.use}</button>
        </div>
      </div>
    </section>
  </div>;
}
