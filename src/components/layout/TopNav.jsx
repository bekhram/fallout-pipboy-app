import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { playSound } from "../../utils/soundManager";
import CompanionTab from "../companion/CompanionTab.jsx";

export const PIPBOY_TABS = [
  { key: "status", labelKey: "tabs.status" },
  { key: "special", labelKey: "tabs.special" },
  { key: "weapons", labelKey: "tabs.weapons" },
  { key: "inventory", labelKey: "tabs.inventory" },
  { key: "armor", labelKey: "tabs.armor" },
  { key: "perks", labelKey: "tabs.perks" },
  { key: "notes", labelKey: "tabs.notes" },
  { key: "map", labelKey: "tabs.map" },
  { key: "games", labelKey: "tabs.games" },
];

const COMPANION_LABELS = {
  en: "COMPANION",
  ru: "СПУТНИК",
  uk: "КОМПАНЬЙОН",
  pl: "TOWARZYSZ",
};

function getLanguage(value) {
  const language = String(value || "en").split("-")[0];
  return COMPANION_LABELS[language] ? language : "en";
}

export default function TopNav({ activeTab, onTabChange, onToggleMenu }) {
  const { t, i18n } = useTranslation();
  const [companionOpen, setCompanionOpen] = useState(false);
  const language = getLanguage(i18n.resolvedLanguage || i18n.language);

  const handleTabClick = (tabKey) => {
    setCompanionOpen(false);
    if (tabKey === activeTab) return;
    playSound("uiTab");
    onTabChange(tabKey);
  };

  const handleCompanionClick = () => {
    if (!companionOpen) playSound("uiTab");
    setCompanionOpen(true);
  };

  const handleMenuClick = () => {
    setCompanionOpen(false);
    playSound("uiTab");
    onToggleMenu?.();
  };

  return (
    <>
      <header className="pip-panel pip-topnav">
        <div className="pip-brandline pip-brandline-nav">
          <button className="pip-icon-btn pip-icon-btn-left" type="button">
            <span className="pip-icon-dot" />
          </button>

          <span className="pip-brandline-title">{t("brand.title")}</span>
          <span className="pip-brandline-status">{t("brand.status")}</span>

          <button
            type="button"
            className="pip-icon-btn pip-icon-btn-menu"
            onClick={handleMenuClick}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className="pip-tab-scroll">
          <div className="pip-tabrow pip-tabrow-nowrap">
            {PIPBOY_TABS.slice(0, 2).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`pip-tab ${!companionOpen && activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => handleTabClick(tab.key)}
              >
                {t(tab.labelKey)}
              </button>
            ))}

            <button
              type="button"
              className={`pip-tab ${companionOpen ? "is-active" : ""}`}
              onClick={handleCompanionClick}
            >
              {COMPANION_LABELS[language]}
            </button>

            {PIPBOY_TABS.slice(2).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`pip-tab ${!companionOpen && activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => handleTabClick(tab.key)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <CompanionTab open={companionOpen} onClose={() => setCompanionOpen(false)} />
    </>
  );
}
