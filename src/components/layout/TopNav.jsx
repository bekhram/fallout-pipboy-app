import React from "react";
import { useTranslation } from "react-i18next";
import { playSound } from "../../utils/soundManager";

const tabs = [
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

export default function TopNav({ activeTab, onTabChange, onToggleMenu }) {
  const { t } = useTranslation();

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
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`pip-tab ${activeTab === tab.key ? "is-active" : ""}`}
              onClick={() => handleTabClick(tab.key)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}