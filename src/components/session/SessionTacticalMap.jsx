import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SessionTacticalMapV2 from "./SessionTacticalMapV2.jsx";

function findMapModeSwitch() {
  if (typeof document === "undefined") return null;
  return document.querySelector(".pip-map-mode-switch--external");
}

export default function SessionTacticalMap({ session }) {
  const [mapModeSwitch, setMapModeSwitch] = useState(null);
  const hasLiveScene = Boolean(
    session?.isActive
      && session?.mode === "player"
      && session?.tacticalScene?.active
  );

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const syncTarget = () => {
      const next = findMapModeSwitch();
      setMapModeSwitch((current) => (current === next ? current : next));
    };

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  const openBattlemap = () => {
    if (!hasLiveScene || typeof document === "undefined") return;
    const tacticalButton = document.querySelector(".session-tactical-toggle.is-live");
    tacticalButton?.click();
  };

  const shortcut = hasLiveScene && mapModeSwitch
    ? createPortal(
        <button
          type="button"
          role="tab"
          aria-selected="false"
          className="pip-map-battlemap-shortcut"
          onClick={openBattlemap}
        >
          BATTLEMAP
        </button>,
        mapModeSwitch
      )
    : null;

  return (
    <>
      <SessionTacticalMapV2 session={session} />
      {shortcut}
    </>
  );
}
