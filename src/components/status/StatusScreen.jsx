import React from "react";
import HpPanel from "./HpPanel.jsx";
import VitalsPanel from "./VitalsPanel.jsx";
import InjuryPanel from "./InjuryPanel.jsx";
import StatusBadgeList from "./StatusBadgeList.jsx";
import { useTranslation } from "react-i18next";

export default function StatusScreen({
  form,
  derived,
  armor,
  currentLuckPoints = 0,
  onSpendLuck,
  portraitPreview,
  onPickPortrait,
  onRemovePortrait,
  onTopLevelChange,
  onStatusToggle,
  onInjuryToggle,
  hpMax,
  hpCurrent,
  radiationHp,
  onHpSliderChange,
  onRadiationSliderChange,
  onHpDecrease,
  onHpIncrease,
  onOpenConditions,
  onOpenDerived,
}) {
  const { t } = useTranslation();
  const survivalConditions = [
  Number(form.satiety || 0) === 0
    ? {
        key: "starving",
        group: "negative",
        nameKey: "statuses.starving.name",
        descriptionKey: "statuses.starving.description",
        durationKey: "statuses.duration.whileZero",
      }
    : null,
  Number(form.thirst || 0) === 0
    ? {
        key: "dehydrated",
        group: "negative",
        nameKey: "statuses.dehydrated.name",
        descriptionKey: "statuses.dehydrated.description",
        durationKey: "statuses.duration.whileZero",
      }
    : null,
  Number(form.vigor || 0) === 0
    ? {
        key: "exhausted",
        group: "negative",
        nameKey: "statuses.exhausted.name",
        descriptionKey: "statuses.exhausted.description",
        durationKey: "statuses.duration.whileZero",
      }
    : null,
].filter(Boolean);

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-hero">
        <div className="pip-head">
          <h2>[ {t("main.title")} ]</h2>
          <span className="pip-cursor">{t("main.dataReady")}</span>
        </div>

        <div className="pip-hero-grid">
          <div className="pip-hero-left">
            <div className="pip-portrait-card">
              <button
                type="button"
                className="pip-portrait"
                onClick={onPickPortrait}
              >
                {portraitPreview ? (
                  <img
                    src={portraitPreview}
                    alt="Character portrait"
                    className="pip-portrait-image"
                  />
                ) : (
                  <span>{t("main.addPortrait")}</span>
                )}
              </button>

              {portraitPreview && (
                <button
                  type="button"
                  className="pip-portrait-remove"
                  onClick={onRemovePortrait}
                >
                  ×
                </button>
              )}
            </div>

            <div className="pip-portrait-actions">
              <button
                type="button"
                className="pip-action-btn"
                onClick={onOpenDerived}
              >
                ★
              </button>

              <button
                type="button"
                className="pip-action-btn"
                onClick={onSpendLuck}
                disabled={currentLuckPoints <= 0}
              >
                ✤{currentLuckPoints}
              </button>

              <button
                type="button"
                className="pip-action-btn"
                onClick={onOpenConditions}
              >
                ➙
              </button>
            </div>
          </div>

          <div className="pip-hero-meta">
            <input
              value={form.characterName}
              onChange={(e) => onTopLevelChange("characterName", e.target.value)}
              className="pip-input"
            />

            <div>
              <label>{t("main.origin")}</label>
              <input
                value={form.origin}
                onChange={(e) => onTopLevelChange("origin", e.target.value)}
                className="pip-input"
              />
            </div>

            <div>
              <label>{t("main.level")}</label>
              <input
                value={form.level}
                onChange={(e) => onTopLevelChange("level", e.target.value)}
                className="pip-input"
              />
            </div>

            <div className="pip-inline-stats">
              <span>{t("main.defense")}:[{derived.defense}]</span>
              <span>{t("main.initiative")}:[{derived.initiative}]</span>
              <span>{t("main.melee")}:[{derived.md}]</span>
              <span>{t("main.luck")}:[{currentLuckPoints}]</span>
            </div>

            <div className="pip-status-vitals-inline">
              <VitalsPanel
                form={form}
                onTopLevelChange={onTopLevelChange}
                compact
              />
            </div>
          </div>
        </div>
      </section>

      <HpPanel
        maxHp={hpMax}
        currentHp={hpCurrent}
        radiationHp={radiationHp}
        onHpSliderChange={onHpSliderChange}
        onRadiationSliderChange={onRadiationSliderChange}
        onHpDecrease={onHpDecrease}
        onHpIncrease={onHpIncrease}
      />

 <InjuryPanel
  injuries={form.injuries}
  statuses={form.statuses}
  armor={armor}
  onToggle={onInjuryToggle}
  survivalConditions={survivalConditions}
/>
    </div>
  );
}