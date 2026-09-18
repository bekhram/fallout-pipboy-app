import React, { useEffect, useState } from "react";
import BattlemapViewportControls from "../gm/BattlemapViewportControls.jsx";
import "./playerBattlemapControls.css";

export default function PlayerBattlemapControls({ session }) {
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

      const isOpen = Boolean(playerMap && !playerMap.closest(".player-workspace--embedded"));
      document.body.classList.toggle("pip-player-battlemap-open", isOpen);
      document.documentElement.classList.toggle("pip-player-battlemap-open", isOpen);
      setBattlemapTarget((current) => (current === controlsSlot ? current : controlsSlot));

      document.querySelectorAll(".battlemap-view-controls.is-player-battlemap-viewport")
        .forEach((node) => {
          if (node !== controls) node.classList.remove("is-player-battlemap-viewport");
        });

      if (controls) {
        controls.classList.add("is-player-battlemap-viewport");
        controls.classList.remove("is-player-collapsed");
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      document.body.classList.remove("pip-player-battlemap-open");
      document.documentElement.classList.remove("pip-player-battlemap-open");
      document.querySelectorAll(".battlemap-view-controls.is-player-battlemap-viewport")
        .forEach((node) => node.classList.remove("is-player-battlemap-viewport"));
    };
  }, [session?.tacticalScene?.sceneId]);

  if (
    !battlemapTarget ||
    !session?.isActive ||
    session?.mode !== "player" ||
    !session?.tacticalScene?.active
  ) {
    return null;
  }

  return <BattlemapViewportControls session={session} role="player" activeTab="battle" />;
}
