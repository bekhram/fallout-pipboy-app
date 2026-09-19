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
    onOpenDerived,
    stimpaks = [],
    treatableInjuries = [],
    onUseStimpak,
  } = props;
  const { t, i18n } = useTranslation();
  const c = sheetCopy(i18n.resolvedLanguage);
  const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const stimCopy = STIM_COPY[language] || STIM_COPY.en;
  const [stimMode, setStimMode] = useState("hp");
  const [stimIndex, setStimIndex] = useState("");
  const [injuryKey, setInjuryKey] = useState("");

  const survivalConditions = [["satiety", "starving"], ["thirst", "dehydrated"], ["vigor", "exhausted"]]
    .filter(([field]) => Number(form[field] || 0) === 0)
    .map(([, key]) => ({
      key,
      group: "negative",
      nameKey: `statuses.${key}.name`,
      descriptionKey: `statuses.${key}.description`,
      durationKey: "statuses.duration.whileZero",
    }));

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
    </section>
    <div className="sheet-body"><InjuryPanel injuries={form.injuries} statuses={form.statuses} armor={armor} derived={derived} onToggle={onInjuryToggle} onArmorChange={onArmorChange} survivalConditions={survivalConditions} bodyOnly /></div>
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
