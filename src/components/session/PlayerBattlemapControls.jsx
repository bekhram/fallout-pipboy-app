import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BattlemapViewportControls from "../gm/BattlemapViewportControls.jsx";
import "./playerBattlemapControls.css";

const COLLAPSED_KEY = "pip2d20_player_zoom_collapsed_v1";

function readCollapsed() {
  try {
    const stored = window.localStorage.getItem(COLLAPSED_KEY);
    return stored === null ? true : stored !== "0";
  } catch {
    return true;
  }
}

function clickFirst(selector) {
  const target = typeof document !== "undefined" ? document.querySelector(selector) : null;
  if (!target) return false;
  target.click();
  return true;
}

function openSessionChat() {
  const target = typeof document !== "undefined"
    ? document.querySelector(".session-utility-drawer-toggle")
    : null;
  if (!target) return false;
  if (target.getAttribute("aria-expanded") !== "true") target.click();
  return true;
}

function openDice() {
  if (clickFirst(".floating-dice-button")) return true;
  if (clickFirst(".floating-dice-toggle")) {
    requestAnimationFrame(() => clickFirst(".floating-dice-button"));
    return true;
  }
  return false;
}

function toggleBattlemapTools() {
  return clickFirst(
    ".session-tactical-overlay .battlemap-tools-toggle, .session-tactical-player .battlemap-tools-toggle, .battlemap-tools-toggle"
  );
}

function stopMapGesture(event) {
  event.preventDefault();
  event.stopPropagation();
}

export default function PlayerBattlemapControls({ session }) {
  const [zoomCollapsed, setZoomCollapsed] = useState(readCollapsed);
  const [battlemapTarget, setBattlemapTarget] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const sync = () => {
      const playerMap = document.querySelector(
        ".session-tactical-overlay .session-tactical-player"
      );
      const controlsSlot = document.querySelector(
        ".session-tactical-overlay .session-tactical-player__controls-slot"
      );
      const controls = document.querySelector(
        ".session-tactical-overlay .battlemap-view-controls, .battlemap-view-controls"
      );

      document.body.classList.toggle("pip-player-battlemap-open", Boolean(playerMap));
      setBattlemapTarget((current) => (current === controlsSlot ? current : controlsSlot));

      document.querySelectorAll(".battlemap-view-controls.is-player-battlemap-viewport")
        .forEach((node) => {
          if (node !== controls) node.classList.remove("is-player-battlemap-viewport");
        });

      if (controls) {
        controls.classList.add("is-player-battlemap-viewport");
        controls.classList.toggle("is-player-collapsed", zoomCollapsed);
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      document.body.classList.remove("pip-player-battlemap-open");
      document.querySelectorAll(".battlemap-view-controls.is-player-battlemap-viewport")
        .forEach((node) => node.classList.remove("is-player-battlemap-viewport"));
    };
  }, [zoomCollapsed, session?.tacticalScene?.sceneId]);

  const toggleZoom = (event) => {
    stopMapGesture(event);
    setZoomCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // best effort only
      }
      return next;
    });
  };

  const handleChat = (event) => {
    stopMapGesture(event);
    openSessionChat();
  };

  const handleDice = (event) => {
    stopMapGesture(event);
    openDice();
  };

  const handleTools = (event) => {
    stopMapGesture(event);
    toggleBattlemapTools();
  };

  if (
    !battlemapTarget ||
    !session?.isActive ||
    session?.mode !== "player" ||
    !session?.tacticalScene?.active
  ) {
    return null;
  }

  const dock = (
    <div
      className="player-battlemap-side-controls"
      aria-label="Player battlemap tools"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="player-battlemap-tool player-battlemap-tool--zoom"
        onClick={toggleZoom}
        title={zoomCollapsed ? "Show zoom controls" : "Hide zoom controls"}
        aria-label={zoomCollapsed ? "Show zoom controls" : "Hide zoom controls"}
      >
        ZOOM
      </button>
      <button
        type="button"
        className="player-battlemap-tool player-battlemap-tool--chat"
        onClick={handleChat}
        title="Chat"
        aria-label="Open session chat"
      >
        CHAT
      </button>
      <button
        type="button"
        className="player-battlemap-tool player-battlemap-tool--dice"
        onClick={handleDice}
        title="Dice"
        aria-label="Open dice roller"
      >
        D20
      </button>
      <button
        type="button"
        className="player-battlemap-tool player-battlemap-tool--tools"
        onClick={handleTools}
        title="Battlemap tools"
        aria-label="Open battlemap tools"
      >
        TOOLS
      </button>
    </div>
  );

  return (
    <>
      <BattlemapViewportControls session={session} role="player" activeTab="battle" />
      {createPortal(dock, battlemapTarget)}
    </>
  );
}
