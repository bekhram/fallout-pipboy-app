import React, { useEffect, useState } from "react";
import diceIcon from "../../assets/dice/d20.png";
import "./mobileToolDock.css";

function clickSessionChat() {
  const target = typeof document !== "undefined"
    ? document.querySelector(".session-utility-drawer-toggle")
    : null;
  if (!target) return false;
  target.click();
  return true;
}

export default function FloatingDiceButton({ onOpen }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("pip2d20:dice-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasSessionChat, setHasSessionChat] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const sync = () => {
      setHasSessionChat(Boolean(document.querySelector(".session-utility-drawer-toggle")));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("pip2d20:dice-collapsed", String(next));
      } catch {
        // The control still works when storage is unavailable.
      }
      return next;
    });
  };

  const openDice = () => {
    setMobileOpen(false);
    onOpen?.();
  };

  const openChat = () => {
    setMobileOpen(false);
    clickSessionChat();
  };

  return (
    <>
      <div className={`floating-dice-control floating-dice-control--desktop${collapsed ? " is-collapsed" : ""}`}>
        {!collapsed && (
          <button
            type="button"
            className="floating-dice-button"
            onClick={onOpen}
            aria-label="Open dice roller"
          >
            <img
              src={diceIcon}
              alt="Dice roller"
              className="floating-dice-button-icon"
            />
          </button>
        )}
        <button
          type="button"
          className="floating-dice-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Show dice button" : "Hide dice button"}
          title={collapsed ? "Show dice" : "Hide dice"}
        >
          {collapsed ? "‹" : "›"}
        </button>
      </div>

      <div className={`pip-mobile-tool-dock${mobileOpen ? " is-open" : ""}`} aria-label="Quick tools">
        <div className="pip-mobile-tool-dock__actions" aria-hidden={!mobileOpen}>
          <button
            type="button"
            className="pip-mobile-tool-dock__action"
            onClick={openDice}
            tabIndex={mobileOpen ? 0 : -1}
            aria-label="Open dice roller"
          >
            <span className="pip-mobile-tool-dock__icon">🎲</span>
            <span>D20</span>
          </button>

          {hasSessionChat && (
            <button
              type="button"
              className="pip-mobile-tool-dock__action"
              onClick={openChat}
              tabIndex={mobileOpen ? 0 : -1}
              aria-label="Open session chat"
            >
              <span className="pip-mobile-tool-dock__icon">💬</span>
              <span>CHAT</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="pip-mobile-tool-dock__toggle"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close quick tools" : "Open quick tools"}
          title={mobileOpen ? "Close tools" : "Quick tools"}
        >
          {mobileOpen ? "×" : "☰"}
        </button>
      </div>
    </>
  );
}
