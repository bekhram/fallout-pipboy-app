import React from "react";
import { useTranslation } from "react-i18next";

const VITALS = [
  { key: "satiety", labelKey: "vitals.hunger" },
  { key: "thirst", labelKey: "vitals.thirst" },
  { key: "vigor", labelKey: "vitals.sleep" },
];

export default function VitalsPanel({
  form,
  onTopLevelChange,
  compact = false,
}) {
  const { t } = useTranslation();

  const content = <div className="sheet-vitals">{VITALS.map(item=>{
    const value=Number(form[item.key] || 0); const label=t(item.labelKey);
    return <div className="sheet-vital-row" key={item.key}><span>{label}</span><div className="sheet-vital-segments">{[1,2,3,4,5].map(step=><button key={step} type="button" aria-label={`${label} ${step}`} aria-pressed={value>=step} title={`${label} ${step}`} onClick={()=>onTopLevelChange(item.key,String(value===step?0:step))}/>)}</div></div>;
  })}</div>;

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