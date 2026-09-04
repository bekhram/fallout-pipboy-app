import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ORIGINS_LIST, TRAITS_DICTIONARY } from "../data/origins";
import { getOriginEquipmentGrant } from "../../data/startingEquipment.js";
import { getLocalizedInventoryItem } from "../../data/inventoryLocalizationAll.js";

const ORIGIN_EQUIPMENT_CHOICE_EVENT = "pipboy:set-origin-equipment-choices";

function getChoiceEntries(packId) {
  if (!packId) return [];
  return getOriginEquipmentGrant(packId).filter((entry) => entry?.type === "choice");
}

export default function OriginSelectionModal({
  open,
  onSelectOrigin,
  onCancel,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.split("-")[0] || "en";
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [selectedPack, setSelectedPack] = useState("");
  const [equipmentChoices, setEquipmentChoices] = useState({});

  const selectedOriginData = ORIGINS_LIST.find((o) => o.id === selectedId);
  const packChoiceEntries = useMemo(
    () => getChoiceEntries(selectedPack),
    [selectedPack]
  );

  if (!open) return null;

  const describeOption = (option = []) =>
    option
      .filter((entry) => entry?.type === "item")
      .map((entry) => {
        const localized = getLocalizedInventoryItem(entry, language);
        return localized.displayName || entry.name;
      })
      .filter(Boolean)
      .join(" + ");

  const handleConfirm = () => {
    if (!selectedId) return;

    onSelectOrigin(selectedId, selectedTraits, selectedPack);

    if (selectedPack && packChoiceEntries.length > 0) {
      const normalizedChoices = {};
      packChoiceEntries.forEach((entry) => {
        normalizedChoices[entry.id] = Number(
          equipmentChoices[entry.id] ?? entry.defaultOption ?? 0
        );
      });

      window.dispatchEvent(
        new CustomEvent(ORIGIN_EQUIPMENT_CHOICE_EVENT, {
          detail: {
            originId: selectedId,
            packId: selectedPack,
            choices: normalizedChoices,
          },
        })
      );
    }
  };

  const handleSelectOrigin = (id) => {
    setSelectedId(id);
    setSelectedTraits([]);
    setSelectedPack("");
    setEquipmentChoices({});
  };

  const handlePackChange = (packId) => {
    setSelectedPack(packId);
    setEquipmentChoices({});
  };

  const handleToggleTrait = (traitId) => {
    setSelectedTraits((prev) => {
      if (prev.includes(traitId)) {
        return prev.filter((id) => id !== traitId);
      }

      const originData = ORIGINS_LIST.find((o) => o.id === selectedId);
      const limit = originData?.traitSelectCount || 2;

      if (prev.length < limit) {
        return [...prev, traitId];
      }
      return prev;
    });
  };

  return (
    <div className="pip-modal-backdrop">
      <div className="pip-modal pip-panel" style={{ maxWidth: "500px" }}>
        <div className="pip-head">
          <h2>[ {t("characterCreation.selectOriginTitle")} ]</h2>
        </div>

        <div
          className="pip-logbox"
          style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "10px" }}
        >
          <p>{t("characterCreation.selectOriginDescription")}</p>

          <div
            className="origin-list"
            style={{
              marginTop: "15px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {ORIGINS_LIST.map((origin) => (
              <button
                key={origin.id}
                type="button"
                className={`pip-btn ${selectedId === origin.id ? "is-primary" : ""}`}
                onClick={() => handleSelectOrigin(origin.id)}
              >
                {t(`origins.${origin.id}`)}
              </button>
            ))}
          </div>

          {selectedId && selectedOriginData && (
            <div
              className="origin-details push-top"
              style={{ padding: "10px", border: "1px solid var(--pip-color, #14ff00)" }}
            >
              {selectedOriginData.traits && selectedOriginData.traits.length > 0 && (
                <div>
                  <strong>{t("characterCreation.trait")}: </strong>
                  {t(
                    `traitsInfo.${
                      TRAITS_DICTIONARY[selectedOriginData.traits[0]]
                    }.name`
                  )}
                  <div style={{ fontSize: "0.85em", opacity: 0.7, marginTop: "5px" }}>
                    {t(
                      `traitsInfo.${
                        TRAITS_DICTIONARY[selectedOriginData.traits[0]]
                      }.desc`
                    )}
                  </div>
                </div>
              )}

              {selectedOriginData.availableTraits &&
                selectedOriginData.availableTraits.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <strong>
                      {t("characterCreation.selectTraits")} ({selectedTraits.length} /{" "}
                      {selectedOriginData.traitSelectCount}):
                    </strong>
                    <div
                      style={{
                        fontSize: "0.8em",
                        opacity: 0.8,
                        marginBottom: "10px",
                      }}
                    >
                      {t("characterCreation.chooseTwoTraits")}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {selectedOriginData.availableTraits.map((traitId) => (
                        <label
                          key={traitId}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{ marginTop: "3px" }}
                            checked={selectedTraits.includes(traitId)}
                            onChange={() => handleToggleTrait(traitId)}
                            disabled={
                              !selectedTraits.includes(traitId) &&
                              selectedTraits.length >= selectedOriginData.traitSelectCount
                            }
                          />
                          <div>
                            <div style={{ fontWeight: "bold" }}>
                              {t(`traitsInfo.${traitId}.name`)}
                            </div>
                            <div style={{ fontSize: "0.85em", opacity: 0.7 }}>
                              {t(`traitsInfo.${traitId}.desc`)}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              {selectedOriginData.equipmentPacks &&
                selectedOriginData.equipmentPacks.length > 0 && (
                  <div
                    style={{
                      marginTop: "15px",
                      borderTop: "1px dashed var(--pip-color, #14ff00)",
                      paddingTop: "10px",
                    }}
                  >
                    <strong>
                      {t("equipmentPacks.title", { defaultValue: "STARTING EQUIPMENT" })}:
                    </strong>
                    <select
                      className="pip-input"
                      style={{ marginTop: "5px", marginBottom: "10px", width: "100%" }}
                      value={selectedPack}
                      onChange={(e) => handlePackChange(e.target.value)}
                    >
                      <option value="" disabled>
                        {t("equipmentPacks.select", {
                          defaultValue: "-- Select Equipment Pack --",
                        })}
                      </option>
                      {selectedOriginData.equipmentPacks.map((packId) => (
                        <option key={packId} value={packId}>
                          {t(`equipmentPacks.${packId}.name`)}
                        </option>
                      ))}
                    </select>

                    {selectedPack && (
                      <div
                        style={{
                          fontSize: "0.85em",
                          opacity: 0.8,
                          whiteSpace: "pre-line",
                          backgroundColor: "rgba(20, 255, 0, 0.05)",
                          padding: "8px",
                          borderLeft: "2px solid var(--pip-color, #14ff00)",
                        }}
                      >
                        {t(`equipmentPacks.${selectedPack}.items`)}
                      </div>
                    )}

                    {packChoiceEntries.length > 0 && (
                      <div
                        style={{
                          marginTop: "10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {packChoiceEntries.map((entry, choiceIndex) => (
                          <label key={entry.id}>
                            <div
                              style={{
                                fontSize: "0.75em",
                                opacity: 0.75,
                                marginBottom: "4px",
                              }}
                            >
                              [ {t("equipmentPacks.choice", { defaultValue: "EQUIPMENT CHOICE" })}{" "}
                              {choiceIndex + 1} ]
                            </div>
                            <select
                              className="pip-input"
                              style={{ width: "100%" }}
                              value={Number(
                                equipmentChoices[entry.id] ?? entry.defaultOption ?? 0
                              )}
                              onChange={(e) =>
                                setEquipmentChoices((prev) => ({
                                  ...prev,
                                  [entry.id]: Number(e.target.value),
                                }))
                              }
                            >
                              {(entry.options || []).map((option, optionIndex) => (
                                <option key={optionIndex} value={optionIndex}>
                                  {describeOption(option) || `Option ${optionIndex + 1}`}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="pip-actions-inline push-top">
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={handleConfirm}
            disabled={
              !selectedId ||
              (selectedOriginData?.equipmentPacks && !selectedPack)
            }
          >
            {t("common.confirm")}
          </button>

          <button type="button" className="pip-btn" onClick={onCancel}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
