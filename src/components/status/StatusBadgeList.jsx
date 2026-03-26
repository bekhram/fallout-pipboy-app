import React from "react";
import { useTranslation } from "react-i18next";
import { STATUS_LIST } from "../../constants.js";

export default function StatusBadgeList({ statuses, onToggle }) {
  const { t } = useTranslation();

  const positiveStatuses = STATUS_LIST.filter(
    (item) => item.group === "positive"
  );
  const negativeStatuses = STATUS_LIST.filter(
    (item) => item.group === "negative"
  );

  const renderGroup = (title, items, className) => (
    <div className="pip-status-group">
      <div className="pip-status-group-title">{title}</div>

      <div className="pip-status-chip-grid">
        {items.map((item) => {
          const active = !!statuses?.[item.key];

          return (
            <button
              key={item.key}
              type="button"
              className={`pip-status-chip ${className} ${
                active ? "is-active" : ""
              }`}
              onClick={() => onToggle(item.key)}
              title={`${t(item.nameKey)}\n${t(item.descriptionKey)}\n${t(
                "status.duration"
              )}: ${t(item.durationKey)}`}
            >
              <span className="pip-status-chip-name">
                {t(item.nameKey)}
              </span>

              <span className="pip-status-chip-duration">
                {t(item.durationKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="pip-status-groups">
      {renderGroup(t("status.positive"), positiveStatuses, "is-positive")}
      {renderGroup(t("status.negative"), negativeStatuses, "is-negative")}
    </div>
  );
}