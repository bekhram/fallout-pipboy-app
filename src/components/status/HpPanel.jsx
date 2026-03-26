import React from "react";
import { useTranslation } from "react-i18next";

export default function HpPanel({
  maxHp,
  currentHp,
  radiationHp,
  onHpSliderChange,
  onRadiationSliderChange,
  onHpDecrease,
  onHpIncrease,
}) {
  const { t } = useTranslation();

  const safeMax = Math.max(1, Number(maxHp || 1));
  const safeRad = Math.max(0, Math.min(Number(radiationHp || 0), safeMax));
  const safeEffective = Math.max(0, safeMax - safeRad);
  const safeCurrent = Math.max(0, Math.min(Number(currentHp || 0), safeEffective));

  const greenFillPercent = safeMax > 0 ? (safeCurrent / safeMax) * 100 : 0;
  const radPercent = safeMax > 0 ? (safeRad / safeMax) * 100 : 0;

  const hpMarkerLeft = `${Math.min(100, (safeCurrent / safeMax) * 100)}%`;
  const radMarkerLeft = `${Math.min(100, ((safeMax - safeRad) / safeMax) * 100)}%`;

  return (
    <section className="pip-panel">
      <div className="pip-head">
        <h2>[ {t("hp.title")} ]</h2>
        <span>
          {safeCurrent} / {safeEffective}
        </span>
      </div>

      <div className="pip-flagbar-wrap">
        <div className="pip-flagbar-shell">
          <button
            type="button"
            className="pip-flagbar-side pip-flagbar-btn"
            onClick={onHpDecrease}
          >
            -
          </button>

          <div className="pip-flagbar-track">
            <div
              className="pip-flagbar-fill"
              style={{ width: `${greenFillPercent}%` }}
            />
            <div
              className="pip-flagbar-rad"
              style={{ width: `${radPercent}%` }}
            />
            <div className="pip-flagbar-label">
              HP {safeCurrent}/{safeEffective}
            </div>

            <div
              className="pip-marker pip-marker-rad"
              style={{ left: radMarkerLeft }}
            >
              ▲
            </div>

            <div
              className="pip-marker pip-marker-hp"
              style={{ left: hpMarkerLeft }}
            >
              ▼
            </div>

            <input
              className="pip-flag-slider pip-flag-slider-rad"
              type="range"
              min={0}
              max={safeMax}
              step={1}
              value={safeMax - safeRad}
              onChange={(e) =>
                onRadiationSliderChange?.(safeMax - Number(e.target.value))
              }
            />

            <input
              className="pip-flag-slider pip-flag-slider-hp"
              type="range"
              min={0}
              max={safeMax}
              step={1}
              value={safeCurrent}
              onChange={(e) => onHpSliderChange?.(Number(e.target.value))}
            />
          </div>

          <button
            type="button"
            className="pip-flagbar-side pip-flagbar-btn"
            onClick={onHpIncrease}
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 12,
        }}
      >
        <span>{t("hp.baseMax")}: {safeMax}</span>
        <span>{t("hp.usableMax")}: {safeEffective}</span>
        <span>{t("hp.radiation")}: {safeRad}</span>
      </div>
    </section>
  );
}