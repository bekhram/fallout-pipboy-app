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

  const isMobile =
    typeof window !== "undefined" ? window.innerWidth <= 640 : false;

  const labelColumn = isMobile ? "60px" : "80px";
  const segmentWidth = isMobile ? 14 : 18;
  const segmentHeight = isMobile ? 7 : 8;
  const rowGap = isMobile ? 8 : 10;

  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: rowGap,
        minWidth: 0,
      }}
    >
      {VITALS.map((item) => {
        const value = Number(form[item.key] || 0);
        const label = t(item.labelKey);

        return (
          <div
            key={item.key}
            style={{
              display: "grid",
              gridTemplateColumns: `${labelColumn} minmax(0, 1fr)`,
              alignItems: "center",
              gap: rowGap,
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: "var(--pip-accent)",
                fontSize: isMobile ? 12 : 14,
                letterSpacing: "0.05em",
                lineHeight: 1.1,
                minWidth: 0,
              }}
            >
              {label}
            </div>

            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                flexWrap: "wrap",
                minWidth: 0,
              }}
            >
              {[1, 2, 3, 4, 5].map((step) => (
                <button
                  key={`${item.key}-${step}`}
                  type="button"
                  onClick={() =>
                    onTopLevelChange(item.key, String(value === step ? 0 : step))
                  }
                  aria-label={`${label} ${step}`}
                  title={`${label} ${step}`}
                  style={{
                    WebkitAppearance: "none",
                    appearance: "none",
                    width: segmentWidth,
                    height: segmentHeight,
                    minWidth: segmentWidth,
                    minHeight: segmentHeight,
                    padding: 0,
                    margin: 0,
                    border: "1px solid rgba(220,255,220,0.8)",
                    borderRadius: 2,
                    background:
                      value >= step
                        ? "var(--pip-accent)"
                        : "rgba(255,255,255,0.08)",
                    boxShadow:
                      value >= step
                        ? "0 0 6px rgba(180,255,160,0.4)"
                        : "none",
                    cursor: "pointer",
                    flex: "0 0 auto",
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

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