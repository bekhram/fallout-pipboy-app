import React, { useEffect, useState } from "react";
import diceIcon from "../../assets/dice/d20.png";
import "./mobileToolDock.css";

function clickSessionChat() {
  const target = typeof document !== "undefined"
    ? document.querySelector(".session-utility-drawer-toggle")
    : null;
  if (!target) return false;
  if (target.getAttribute("aria-expanded") !== "true") target.click();
  return true;
}

function openBattlemap() {
  if (typeof document === "undefined") return false;
  document.dispatchEvent(new CustomEvent("pip2d20:open-battlemap"));
  return true;
}

function openMainMenu() {
  if (typeof document === "undefined") return false;

  const selectors = [
    ".pip-topbar-menu-toggle",
    ".pip-menu-toggle",
    ".mobile-menu-toggle",
    ".app-menu-toggle",
    ".topbar-menu-toggle",
    "header button[aria-label*='menu' i]",
    "header button[title*='menu' i]",
  ];

  for (const selector of selectors) {
    const target = document.querySelector(selector);
    if (target && !target.closest(".pip-mobile-tool-dock")) {
      target.click();
      return true;
    }
  }

  const fallback = Array.from(document.querySelectorAll("button")).find((button) => {
    if (button.closest(".pip-mobile-tool-dock")) return false;
    const text = String(button.textContent || "").trim();
    const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`.toLowerCase();
    return text === "☰" || text === "≡" || label.includes("menu") || label.includes("меню");
  });

  if (!fallback) return false;
  fallback.click();
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
  const [hasSessionChat, setHasSessionChat] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const sync = () => {
      setHasSessionChat(Boolean(document.querySelector(".session-utility-drawer-toggle")));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
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

      <div className="pip-mobile-tool-dock" aria-label="Sheet quick tools">
        <button
          type="button"
          className="pip-mobile-tool-dock__action"
          onClick={clickSessionChat}
          disabled={!hasSessionChat}
          aria-label="Open session chat"
          title={hasSessionChat ? "Chat" : "Join a session to use chat"}
        >
          CHAT
        </button>
        <button
          type="button"
          className="pip-mobile-tool-dock__action"
          onClick={onOpen}
          aria-label="Open dice roller"
          title="Dice"
        >
          D20
        </button>
        <button
          type="button"
          className="pip-mobile-tool-dock__action pip-mobile-tool-dock__action--battlemap"
          onClick={openBattlemap}
          aria-label="Open active battlemap"
          title="Battlemap"
        >
          BATTLEMAP
        </button>
        <button
          type="button"
          className="pip-mobile-tool-dock__action"
          onClick={openMainMenu}
          aria-label="Open main menu"
          title="Menu"
        >
          MENU
        </button>
      </div>
    </>
  );
}
