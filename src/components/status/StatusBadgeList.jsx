import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { STATUS_LIST } from "../../constants.js";

const STORAGE_KEY = "fallout_status_groups_v1";

export default function StatusBadgeList({ statuses, onToggle }) {
  const { t } = useTranslation();

  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return {
      positive: false,
      negative: false,
      disease: false,
      chem: false,
      addiction: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch (_) {}
  }, [openGroups]);

  const positiveStatuses = STATUS_LIST.filter(
    (item) => item.group === "positive"
  );
  const negativeStatuses = STATUS_LIST.filter(
    (item) => item.group === "negative"
  );
  const diseaseStatuses = STATUS_LIST.filter(
    (item) => item.group === "disease"
  );
  const chemStatuses = STATUS_LIST.filter(
    (item) => item.group === "chem"
  );
  const addictionStatuses = STATUS_LIST.filter(
    (item) => item.group === "addiction"
  );

  const toggleGroup = (groupKey) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const renderGroup = (groupKey, title, items, className) => {
    const isOpen = !!openGroups[groupKey];

    return (
      <div className="pip-status-group" key={groupKey}>
        <button
          type="button"
          className={`pip-status-group-toggle ${isOpen ? "is-open" : ""}`}
          onClick={() => toggleGroup(groupKey)}
        >
          <span className="pip-status-group-title">{title}</span>
          <span className="pip-status-group-icon">{isOpen ? "−" : "+"}</span>
        </button>

        {isOpen && (
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
        )}
      </div>
    );
  };

  return (
    <div className="pip-status-groups">
      {renderGroup("positive", t("status.positive"), positiveStatuses, "is-positive")}
      {renderGroup("negative", t("status.negative"), negativeStatuses, "is-negative")}
      {renderGroup("disease", t("status.diseases"), diseaseStatuses, "is-disease")}
      {renderGroup("chem", t("status.chems"), chemStatuses, "is-chem")}
      {renderGroup("addiction", t("status.addictions"), addictionStatuses, "is-addiction")}
    </div>
  );
}