import React from "react";

export const GM_UTILITY_EVENT = "pip2d20:gm-utility";
export const WORKSPACE_GROUPS = {
  battle: ["battle", "world"],
  screens: ["scene", "autogm"],
  survival: ["winter"],
  creatures: ["tokens", "custom", "roster", "participants"],
  supplies: ["loot", "merchants"],
};
export const workspaceGroup = (tab) => Object.keys(WORKSPACE_GROUPS).find((key) => WORKSPACE_GROUPS[key].includes(tab)) || "battle";
const COPY = {
  en: { battle: "Map", screens: "Screens", survival: "Survival", winter: "Winter", creatures: "Creatures", supplies: "Supplies", scene: "Environment & encounters", autogm: "Auto GM", tokens: "Bestiary", custom: "My NPCs", roster: "On map", participants: "Players", loot: "Loot", merchants: "Merchants", journal: "Journal", chat: "Chat", dice: "Dice", more: "More", menu: "GM workspace", close: "Close", effects: "Active effects", subtitle: "Your session, at a glance" },
  ru: { battle: "Карта", screens: "Экраны", survival: "Выживание", winter: "Зима", creatures: "Существа", supplies: "Снабжение", scene: "Окружение и встречи", autogm: "Авто ГМ", tokens: "Бестиарий", custom: "Мои NPC", roster: "На карте", participants: "Игроки", loot: "Лут", merchants: "Торговцы", journal: "Журнал", chat: "Чат", dice: "Кубики", more: "Ещё", menu: "Рабочее место ГМ", close: "Закрыть", effects: "Активные эффекты", subtitle: "Всё для текущей сессии" },
  uk: { battle: "Мапа", screens: "Екрани", survival: "Виживання", winter: "Зима", creatures: "Істоти", supplies: "Постачання", scene: "Оточення та зустрічі", autogm: "Авто ГМ", tokens: "Бестіарій", custom: "Мої NPC", roster: "На мапі", participants: "Гравці", loot: "Здобич", merchants: "Торговці", journal: "Журнал", chat: "Чат", dice: "Кубики", more: "Ще", menu: "Робоче місце ГМ", close: "Закрити", effects: "Активні ефекти", subtitle: "Усе для поточної сесії" },
  pl: { battle: "Mapa", screens: "Ekrany", survival: "Przetrwanie", winter: "Zima", creatures: "Istoty", supplies: "Zaopatrzenie", scene: "Otoczenie i spotkania", autogm: "Auto MG", tokens: "Bestiariusz", custom: "Moi NPC", roster: "Na mapie", participants: "Gracze", loot: "Łup", merchants: "Handlarze", journal: "Dziennik", chat: "Czat", dice: "Kości", more: "Więcej", menu: "Panel MG", close: "Zamknij", effects: "Aktywne efekty", subtitle: "Wszystko dla bieżącej sesji" },
};
export const workspaceCopy = (language) => COPY[String(language || "en").split("-")[0]] || COPY.en;

export function WorkspaceIcon({ name }) {
  const paths = {
    battle: "M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5zm6-2v16m6-14v16",
    screens: "M3 4h18v13H3V4zm5 17h8m-4-4v4",
    creatures: "M8 20v-3a7 7 0 1 1 8 0v3H8zm1-10h.01M15 10h.01M10 20v-3m4 3v-3",
    supplies: "M3 7l9-4 9 4v11l-9 4-9-4V7zm0 0l9 4 9-4m-9 4v11M7 5l9 4",
    survival: "M12 3v18m-5-3 5 3 5-3M5 8l7-5 7 5M6 13h12",
    participants: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8m5 9v-2a4 4 0 0 0-3-4",
    chat: "M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z",
    dice: "M12 2l10 6v9l-10 5-10-5V8l10-6zm0 0v10m-10-4 10 4 10-4m-10 4v10",
    more: "M4 12h.01M12 12h.01M20 12h.01",
  };
  return <svg className="gm-workspace-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "more" ? 4 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.screens} /></svg>;
}
export function openWorkspaceUtility(view) {
  window.dispatchEvent(new CustomEvent(GM_UTILITY_EVENT, { detail: { view } }));
}

export default function GmWorkspaceNavigation({ activeTab, onSelect, labels, moreOpen, onMore }) {
  const group = workspaceGroup(activeTab);
  return <>
    <nav className="gm-organic-nav" aria-label={labels.menu}>
      <span className="gm-organic-nav__eyebrow">PIP / 2D20</span>
      {Object.keys(WORKSPACE_GROUPS).map((key) => <button type="button" key={key} aria-pressed={group === key} onClick={() => onSelect(WORKSPACE_GROUPS[key][0])}><WorkspaceIcon name={key}/><span>{labels[key]}</span></button>)}
      <div className="gm-organic-nav__utilities">
        <button type="button" onClick={() => onSelect("participants")} aria-pressed={activeTab === "participants"}><WorkspaceIcon name="participants"/><span>{labels.participants}</span></button>
        <button type="button" onClick={() => openWorkspaceUtility("chat")}><WorkspaceIcon name="chat"/><span>{labels.chat}</span></button>
        <button type="button" onClick={() => openWorkspaceUtility("dice")}><WorkspaceIcon name="dice"/><span>{labels.dice}</span></button>
      </div>
    </nav>
    <nav className="gm-organic-bottom-nav" aria-label={labels.menu}>
      <button type="button" aria-pressed={group === "battle"} onClick={() => onSelect("battle")}><WorkspaceIcon name="battle"/><span>{labels.battle}</span></button>
      <button type="button" onClick={() => openWorkspaceUtility("chat")}><WorkspaceIcon name="chat"/><span>{labels.chat}</span></button>
      <button type="button" aria-pressed={group === "screens"} onClick={() => onSelect("scene")}><WorkspaceIcon name="screens"/><span>{labels.screens}</span></button>
      <button type="button" onClick={() => openWorkspaceUtility("dice")}><WorkspaceIcon name="dice"/><span>{labels.dice}</span></button>
      <button type="button" aria-expanded={moreOpen} aria-controls="gm-workspace-more" aria-pressed={group === "creatures" || group === "supplies" || group === "survival"} onClick={() => onMore(!moreOpen)}><WorkspaceIcon name="more"/><span>{labels.more}</span></button>
    </nav>
    {moreOpen && <div className="gm-organic-more" id="gm-workspace-more">
      <div><strong>{labels.menu}</strong><button type="button" onClick={() => onMore(false)} aria-label={labels.close}>×</button></div>
      {["survival", "creatures", "supplies", "participants"].map((key) => <button type="button" key={key} onClick={() => onSelect(key === "participants" ? key : WORKSPACE_GROUPS[key][0])}><WorkspaceIcon name={key}/>{labels[key]}</button>)}
    </div>}
  </>;
}
