import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LiveSessionWorldMap from "./LiveSessionWorldMap.jsx";
import { openWorkspaceUtility, WorkspaceIcon } from "../gm/GmWorkspaceNavigation.jsx";
import SessionActionsMenu from "./SessionActionsMenu.jsx";
import SessionChatDrawer from "./SessionChatDrawer.jsx";
import SessionTacticalMap from "./SessionTacticalMap.jsx";
import "./playerWorkspace.css";

const COPY = {
  en: { title: "Session", battle: "Battle", world: "World", chat: "Chat", dice: "Dice", waiting: "Waiting for the GM’s map", hint: "Open the shared live world or talk to your group while the GM prepares the scene.", character: "Character", party: "Your group" },
  ru: { title: "Сессия", battle: "Бой", world: "Мир", chat: "Чат", dice: "Кубики", waiting: "Ожидаем карту от ГМ", hint: "Пока ведущий готовит сцену, откройте общую live-карту или напишите группе.", character: "Персонаж", party: "Ваша группа" },
  uk: { title: "Сесія", battle: "Бій", world: "Світ", chat: "Чат", dice: "Кубики", waiting: "Очікуємо мапу від ГМ", hint: "Поки ведучий готує сцену, відкрийте спільну live-мапу або напишіть групі.", character: "Персонаж", party: "Ваша група" },
  pl: { title: "Sesja", battle: "Walka", world: "Świat", chat: "Czat", dice: "Kości", waiting: "Oczekiwanie na mapę MG", hint: "Otwórz wspólną mapę live lub porozmawiaj z grupą, gdy MG przygotowuje scenę.", character: "Postać", party: "Twoja drużyna" },
};

export default function PlayerCampaignWorkspace({ session, form, copy, error, onBack, onOpenSheet }) {
  const { i18n } = useTranslation();
  const labels = COPY[String(i18n.resolvedLanguage || i18n.language).slice(0, 2)] || COPY.en;
  const [tab, setTab] = useState("battle");
  const [chatDock, setChatDock] = useState(null);
  const hasScene = Boolean(session.tacticalScene);
  const status = session.status || "waiting";
  useEffect(() => {
    const showBattle = () => setTab("battle");
    document.addEventListener("pip2d20:open-battlemap", showBattle);
    return () => document.removeEventListener("pip2d20:open-battlemap", showBattle);
  }, []);

  return <section className="player-campaign player-workspace" data-workspace-tab={tab}>
    <header className="player-campaign__header">
      <div><span className="player-campaign__eyebrow">PIP 2D20 / {session.sessionCode}</span><h1>{labels.title}</h1></div>
      <span className="player-campaign__connection" role="status"><span className={`session-status-dot is-${status}`} />{copy[status] || status}</span>
      <SessionActionsMenu mode="player" session={session} onBack={onBack} onOpenSheet={onOpenSheet} labels={copy} />
    </header>
    {error && <div className="session-error" role="alert">{error}</div>}
    <div className="player-campaign__layout">
      <aside className="player-campaign__brief">
        <button className="player-campaign__character" type="button" onClick={onOpenSheet}>
          <span className="player-campaign__avatar">{String(form?.characterName || "P").slice(0, 1)}</span>
          <span><small>{labels.character}</small><strong>{form?.characterName || labels.character}</strong></span><span aria-hidden="true">↗</span>
        </button>
        <details className="player-campaign__message"><summary>{copy.currentMessage}</summary><p>{session.sceneMessage || copy.noMessage}</p></details>
        <div className="player-campaign__party"><small>{labels.party}</small><div>{(session.players || []).map((player, index) => <span key={player.clientId || player.peerId || index}>{player.name || player.character?.characterName || labels.character}</span>)}</div></div>
      </aside>
      <main className="player-campaign__main">
        <div hidden={tab !== "battle"}>
          {hasScene ? <SessionTacticalMap session={session} form={form} embedded /> : <div className="player-campaign__empty"><WorkspaceIcon name="battle" /><h2>{labels.waiting}</h2><p>{labels.hint}</p><button type="button" onClick={() => setTab("world")}>{labels.world} →</button></div>}
        </div>
        {tab === "world" && <LiveSessionWorldMap session={session} character={form} />}
      </main>
      <aside className="player-campaign__chat" ref={setChatDock} aria-label={labels.chat} />
    </div>
    <nav className="player-campaign__nav" aria-label={labels.title}>
      {[['battle','battle'],['world','screens']].map(([key, icon]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}><WorkspaceIcon name={icon}/><span>{labels[key]}</span></button>)}
      <button type="button" onClick={() => openWorkspaceUtility("chat")}><WorkspaceIcon name="chat"/><span>{labels.chat}</span></button>
      <button type="button" onClick={() => openWorkspaceUtility("dice")}><WorkspaceIcon name="dice"/><span>{labels.dice}</span></button>
    </nav>
    <SessionChatDrawer session={session} form={form} workspace dockTarget={chatDock} renderBattlemap={false} />
  </section>;
}
