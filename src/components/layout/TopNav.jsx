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
  vehicles: {
    en: "VEHICLES",
    ru: "ТРАНСПОРТ",
    uk: "ТРАНСПОРТ",
    pl: "POJAZDY",
  },
};

export const PIPBOY_TABS = [
  { key: "status", labelKey: "tabs.status" },
  { key: "special", labelKey: "tabs.special" },
  { key: "companion" },
  { key: "weapons", labelKey: "tabs.weapons" },
  { key: "inventory", labelKey: "tabs.inventory" },
  { key: "crafting" },
  { key: "vehicles" },
  { key: "armor", labelKey: "tabs.armor" },
  { key: "perks", labelKey: "tabs.perks" },
  { key: "bestiary" },
  { key: "notes", labelKey: "tabs.notes" },
  { key: "map", labelKey: "tabs.map" },
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

  const label = (tab) => EXTRA_TAB_LABELS[tab.key]?.[language] || t(tab.labelKey);

  return (
    <header className="pip-panel pip-topnav">
      <div className="pip-brandline pip-brandline-nav">
        <span className="pip-brandline-title">PIP 2D20</span>
        <span className="pip-brandline-status">{t("brand.status")}</span>

        <button
          type="button"
          className="pip-icon-btn pip-icon-btn-menu"
          aria-label={{ en: "Settings", ru: "Настройки", uk: "Налаштування", pl: "Ustawienia" }[language]}
          onClick={handleMenuClick}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <label className="pip-sheet-mobile-select">
        <span>{label(PIPBOY_TABS.find((tab) => tab.key === activeTab) || PIPBOY_TABS[0])}</span>
        <select aria-label={{ en: "Character section", ru: "Раздел персонажа", uk: "Розділ персонажа", pl: "Sekcja postaci" }[language]} value={activeTab} onChange={(event) => handleTabClick(event.target.value)}>
          {PIPBOY_TABS.map((tab) => <option key={tab.key} value={tab.key}>{label(tab)}</option>)}
        </select>
      </label>
      <nav className="pip-tab-scroll">
        <div className="pip-tabrow pip-tabrow-nowrap">
          {PIPBOY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`pip-tab ${activeTab === tab.key ? "is-active" : ""}`}
              aria-current={activeTab === tab.key ? "page" : undefined}
              onClick={() => handleTabClick(tab.key)}
            >
              {EXTRA_TAB_LABELS[tab.key]
                ? EXTRA_TAB_LABELS[tab.key][language]
                : t(tab.labelKey)}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
