import React from "react";
import { useTranslation } from "react-i18next";
import { playSound } from "../../utils/soundManager";

const EXTRA_TAB_LABELS = {
  companion: {
    en: "COMPANION",
    ru: "СПУТНИК",
    uk: "КОМПАНЬЙОН",
    pl: "TOWARZYSZ",
  },
  bestiary: {
    en: "BESTIARY",
    ru: "БЕСТИАРИЙ",
    uk: "БЕСТІАРІЙ",
    pl: "BESTIARIUSZ",
  },
  crafting: {
    en: "CRAFTING",
    ru: "КРАФТ",
    uk: "КРАФТ",
    pl: "RZEMIOSŁO",
  },
  gm: {
    en: "GM",
    ru: "ГМ",
    uk: "ГМ",
    pl: "MG",
  },
};

export const PIPBOY_TABS = [
  { key: "status", labelKey: "tabs.status" },
  { key: "special", labelKey: "tabs.special" },
  { key: "companion" },
  { key: "weapons", labelKey: "tabs.weapons" },
  { key: "inventory", labelKey: "tabs.inventory" },
  { key: "crafting" },
  { key: "armor", labelKey: "tabs.armor" },
  { key: "perks", labelKey: "tabs.perks" },
  { key: "bestiary" },
  { key: "notes", labelKey: "tabs.notes" },
  { key: "map", labelKey: "tabs.map" },
  { key: "gm" },
  { key: "games", labelKey: "tabs.games" },
];

function getLanguage(value) {
  const language = String(value || "en").split("-")[0];
  return ["en", "ru", "uk", "pl"].includes(language) ? language : "en";
}

export default function TopNav({ activeTab, onTabChange, onToggleMenu }) {
  const { t, i18n } = useTranslation();
  const language = getLanguage(i18n.resolvedLanguage || i18n.language);

  const handleTabClick = (tabKey) => {
    if (tabKey === activeTab) return;
    playSound("uiTab");
    onTabChange(tabKey);
  };

  const handleMenuClick = () => {
    playSound("uiTab");
    onToggleMenu?.();
  };

  return (
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
          {PIPBOY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`pip-tab ${activeTab === tab.key ? "is-active" : ""}`}
              onClick={() => handleTabClick(tab.key)}
            >
              {EXTRA_TAB_LABELS[tab.key]
                ? EXTRA_TAB_LABELS[tab.key][language]
                : t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
