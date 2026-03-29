import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { STATUS_LIST } from "../../constants.js";
import InjuriesVaultBoy from "./InjuriesVaultBoy";

const injuryLabels = [
  ["head", "injuries.head"],
  ["leftArm", "injuries.leftArm"],
  ["rightArm", "injuries.rightArm"],
  ["torso", "injuries.torso"],
  ["leftLeg", "injuries.leftLeg"],
  ["rightLeg", "injuries.rightLeg"],
];

const cycle = {
  normal: "crippled",
  crippled: "treated",
  treated: "normal",
};

export default function InjuryPanel({
  injuries,
  statuses,
  armor,
  derived,
  onToggle,
  survivalConditions = [],
}) {
  const { t } = useTranslation();
  const [selectedStatusKey, setSelectedStatusKey] = useState(null);

  const values = Object.values(injuries || {});
  const crippledCount = values.filter((value) => value === "crippled").length;
  const treatedCount = values.filter((value) => value === "treated").length;

  const activeEffects = injuryLabels
    .map(([key, labelKey]) => {
      const state = injuries?.[key] || "normal";
      if (state === "normal") return null;

      return {
        key,
        label: t(labelKey),
        state,
        text: t(`injuryEffects.${key}.${state}`),
      };
    })
    .filter(Boolean);

  const manualStatuses = STATUS_LIST.filter((item) => !!statuses?.[item.key]);
  const mergedStatuses = [...manualStatuses, ...survivalConditions];

  const uniqueStatuses = mergedStatuses.filter(
    (item, index, arr) => arr.findIndex((x) => x.key === item.key) === index
  );

  const selectedStatus =
    uniqueStatuses.find((item) => item.key === selectedStatusKey) || null;

  const handlePartClick = (part) => {
    const current = injuries?.[part] || "normal";
    onToggle(part, cycle[current]);
  };

  const handleStatusClick = (statusKey) => {
    setSelectedStatusKey((prev) => (prev === statusKey ? null : statusKey));
  };

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("injuries.title")} ]</h2>
        <span>
          {crippledCount > 0
            ? `${crippledCount} ${t("injuries.crippled")}`
            : treatedCount > 0
            ? `${treatedCount} ${t("injuries.treated")}`
            : t("injuries.selectBodyPart")}
        </span>
      </div>

      <div className="pip-injuries-card">
        <InjuriesVaultBoy
          injuries={injuries}
          armor={armor}
          derived={derived}
          onPartClick={handlePartClick}
        />

        <div className="pip-injuries-side">
          {uniqueStatuses.length > 0 && (
            <div className="pip-injury-conditions">
              <div className="pip-injuries-label">
                {t("injuries.conditions")}
              </div>

              <div className="pip-injury-conditions-list">
                {uniqueStatuses.map((status) => (
                  <button
                    key={status.key}
                    type="button"
                    className={`pip-injury-condition-chip is-${status.group} ${
                      selectedStatusKey === status.key ? "is-selected" : ""
                    }`}
                    onClick={() => handleStatusClick(status.key)}
                    title={`${t(status.nameKey)} • ${t(
                      status.descriptionKey
                    )} • ${t("status.duration")}: ${t(status.durationKey)}`}
                    aria-pressed={selectedStatusKey === status.key}
                  >
                    <span>{t(status.nameKey)}</span>
                    <small>{t(status.durationKey)}</small>
                  </button>
                ))}
              </div>

              {selectedStatus && (
                <div
                  className={`pip-injury-condition-details is-${selectedStatus.group}`}
                >
                  <strong>{t(selectedStatus.nameKey)}</strong>
                  <small>
                    {t("status.duration")}: {t(selectedStatus.durationKey)}
                  </small>
                  <p>{t(selectedStatus.descriptionKey)}</p>
                </div>
              )}
            </div>
          )}

          {activeEffects.length > 0 && (
            <div className="pip-injury-effects">
              <div className="pip-injuries-label">
                {t("injuries.activeEffects")}
              </div>

              <div className="pip-injury-effects-list">
                {activeEffects.map((effect) => (
                  <div
                    key={effect.key}
                    className={`pip-injury-effect-row is-${effect.state}`}
                    title={effect.text}
                  >
                    <strong>
                      {effect.label} [{t(`injuries.state.${effect.state}`)}]
                    </strong>
                    <span>{effect.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}