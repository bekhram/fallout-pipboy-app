import React, { useState } from "react";
import diceIcon from "../../assets/dice/d20.png";

export default function FloatingDiceButton({ onOpen }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("pip2d20:dice-collapsed") === "true";
    } catch {
      return false;
    }
  });

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
    <div className={`floating-dice-control${collapsed ? " is-collapsed" : ""}`}>
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
  );
}
