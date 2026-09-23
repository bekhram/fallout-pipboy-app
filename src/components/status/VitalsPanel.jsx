import React from "react";
import { useTranslation } from "react-i18next";

const VITALS = [
  { key: "satiety", labelKey: "vitals.hunger" },
  { key: "thirst", labelKey: "vitals.thirst" },
  { key: "vigor", labelKey: "vitals.sleep" },
];

const WINTER_COPY = {
  en: { fatigue: "Fatigue", recovery: "Cold recovery", hours: "h warm shelter", locked: "24h required", bedding: "Bedding +2 Max HP", fever: "Famished Fever", duration: "Duration", stage: "Stage", stage2: "Symptoms active", stage3: "Only Flesh Fruit restores HP", stage5: "Living flesh counts as Flesh Fruit", stage7: "Flesh Fruit/living flesh benefits doubled", stage10: "GM control required" },
  ru: { fatigue: "Усталость", recovery: "Восстановление от холода", hours: "ч в тёплом укрытии", locked: "нужно 24ч", bedding: "Постель +2 Max HP", fever: "Голодная лихорадка", duration: "Длительность", stage: "Стадия", stage2: "Симптомы активны", stage3: "HP восстанавливает только Flesh Fruit", stage5: "Живая плоть считается Flesh Fruit", stage7: "Эффект Flesh Fruit/плоти удвоен", stage10: "Персонаж переходит под контроль ГМ" },
  uk: { fatigue: "Втома", recovery: "Відновлення від холоду", hours: "год у теплому укритті", locked: "потрібно 24год", bedding: "Постіль +2 Max HP", fever: "Голодна лихоманка", duration: "Тривалість", stage: "Стадія", stage2: "Симптоми активні", stage3: "HP відновлює лише Flesh Fruit", stage5: "Жива плоть вважається Flesh Fruit", stage7: "Ефект Flesh Fruit/плоті подвоєний", stage10: "Персонаж переходить під контроль ГМ" },
  pl: { fatigue: "Zmęczenie", recovery: "Regeneracja po zimnie", hours: "h w ciepłym schronieniu", locked: "wymagane 24h", bedding: "Posłanie +2 Max HP", fever: "Gorączka Głodu", duration: "Czas trwania", stage: "Etap", stage2: "Objawy aktywne", stage3: "HP przywraca tylko Flesh Fruit", stage5: "Żywe mięso działa jak Flesh Fruit", stage7: "Korzyści z Flesh Fruit/mięsa są podwojone", stage10: "Wymagana kontrola MG" },
};

export default function VitalsPanel({
  form,
  onTopLevelChange,
  compact = false,
}) {
  const { t, i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const winter = WINTER_COPY[language] || WINTER_COPY.en;
  const fatigue = Math.max(0, Number(form.fatigue || 0));
  const recoveryHours = Math.max(0, Number(form.coldExposureRecoveryHours || 0));
  const maxHpBonus = Math.max(0, Number(form.campsiteMaxHpBonus || 0));
  const feverDuration = Math.max(0, Number(form.famishedFeverDuration || 0));
  const feverStage = feverDuration >= 10
    ? winter.stage10
    : feverDuration >= 7
    ? winter.stage7
    : feverDuration >= 5
    ? winter.stage5
    : feverDuration >= 3
    ? winter.stage3
    : winter.stage2;

  const content = <div className="sheet-vitals">
    {VITALS.map(item=>{
      const value=Number(form[item.key] || 0); const label=t(item.labelKey);
      return <div className="sheet-vital-row" key={item.key}><span>{label}</span><div className="sheet-vital-segments">{[1,2,3,4,5].map(step=><button key={step} type="button" aria-label={`${label} ${step}`} aria-pressed={value>=step} title={`${label} ${step}`} onClick={()=>onTopLevelChange(item.key,String(value===step?0:step))}/>)}</div></div>;
    })}
    <div className={`sheet-winter-vital ${fatigue>0?"is-warning":""}`}>
      <div><strong>{winter.fatigue}</strong><span>{fatigue}</span></div>
      {recoveryHours>0?<small>{winter.recovery}: {recoveryHours}{winter.hours}{form.coldExposureLocked?` · ${winter.locked}`:""}</small>:null}
      {maxHpBonus>0?<small>{winter.bedding}</small>:null}
    </div>
    {feverDuration>0 && (
      <div className={`sheet-winter-vital ${feverDuration>=10?"is-warning":""}`}>
        <div><strong>{winter.fever}</strong><span>{winter.duration}: {feverDuration}</span></div>
        <small>{winter.stage}: {feverStage}</small>
      </div>
    )}
  </div>;

  if (compact) return content;

  return (
    <section className="pip-panel">
      <div className="pip-head">
        <h2>[ {t("vitals.title")} ]</h2>
        <span>{t("vitals.status")}</span>
      </div>
      {content}
    </section>
  );
}
