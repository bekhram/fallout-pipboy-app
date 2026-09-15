import React, { useEffect, useState } from "react";
import BattlemapViewportControls from "../gm/BattlemapViewportControls.jsx";
import "./playerBattlemapControls.css";

const COLLAPSED_KEY = "pip2d20_player_zoom_collapsed_v1";

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function clickFirst(selector) {
  const target = typeof document !== "undefined" ? document.querySelector(selector) : null;
  if (!target) return false;
  target.click();
  return true;
}

function openDice() {
  if (clickFirst(".floating-dice-button")) return;
  if (clickFirst(".floating-dice-toggle")) {
    requestAnimationFrame(() => clickFirst(".floating-dice-button"));
  }
}

function toggleBattlemapTools() {
  return clickFirst(
    ".session-tactical-player .battlemap-tools-toggle, .session-tactical-overlay .battlemap-tools-toggle, .battlemap-tools-toggle"
  );
}

export default function PlayerBattlemapControls({ session }) {
  const [zoomCollapsed, setZoomCollapsed] = useState(readCollapsed);
  const [battlemapOpen, setBattlemapOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const sync = () => {
      const playerMap = document.querySelector(
        ".session-tactical-overlay .session-tactical-player"
      );
      const controls = document.querySelector(
        ".session-tactical-player .battlemap-view-controls"
      );

      setBattlemapOpen(Boolean(playerMap));
      if (controls) controls.classList.toggle("is-player-collapsed", zoomCollapsed);
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
  }, [zoomCollapsed, session?.tacticalScene?.sceneId]);

  const toggleZoom = () => {
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

  if (
    !battlemapOpen ||
    !session?.isActive ||
    session?.mode !== "player" ||
    !session?.tacticalScene?.active
  ) {
    return null;
  }

  return (
    <>
      <BattlemapViewportControls session={session} role="player" activeTab="battle" />

      <div className="player-battlemap-side-controls" aria-label="Player battlemap tools">
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
          onClick={() => clickFirst(".session-utility-drawer-toggle")}
          title="Chat"
          aria-label="Open session chat"
        >
          CHAT
        </button>
        <button
          type="button"
          className="player-battlemap-tool player-battlemap-tool--dice"
          onClick={openDice}
          title="Dice"
          aria-label="Open dice roller"
        >
          D20
        </button>
        <button
          type="button"
          className="player-battlemap-tool player-battlemap-tool--tools"
          onClick={toggleBattlemapTools}
          title="Battlemap tools"
          aria-label="Open battlemap tools"
        >
          TOOLS
        </button>
      </div>
    </>
  );
}
