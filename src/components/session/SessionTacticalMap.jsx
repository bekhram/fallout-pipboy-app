import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import SessionTacticalMapV3 from "./SessionTacticalMapV3.jsx";
import PlayerTokenAssignmentBridge from "./PlayerTokenAssignmentBridge.jsx";
import PlayerBattlemapControls from "./PlayerBattlemapControls.jsx";
import PlayerClickMoveLayer from "./PlayerClickMoveLayer.jsx";
import BattlemapSharedLayer from "../gm/BattlemapSharedLayer.jsx";

function findMapModeSwitch() {
  if (typeof document === "undefined") return null;
  return document.querySelector(".pip-map-mode-switch--external");
}

export default function SessionTacticalMap({ session, openRequest = 0, embedded = false, form = null }) {
  const [mapModeSwitch, setMapModeSwitch] = useState(null);
  const isPlayerSession = Boolean(session?.isActive && session?.mode === "player");
  const hasLiveScene = Boolean(session?.tacticalScene || session?.liveSceneId);

  const tacticalSession = useMemo(() => {
    if (!hasLiveScene || !session?.tacticalScene || session.tacticalScene.active) return session;
    return { ...session, tacticalScene: { ...session.tacticalScene, active: true } };
  }, [session, hasLiveScene]);

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
    document.dispatchEvent(new CustomEvent("pip2d20:open-battlemap"));
  };

  const shortcut = isPlayerSession && mapModeSwitch ? createPortal(
    <button type="button" role="tab" aria-selected="false" aria-disabled={!hasLiveScene} disabled={!hasLiveScene} className={`pip-map-battlemap-shortcut${hasLiveScene ? " is-live" : ""}`} title={hasLiveScene ? "Open active battlemap" : "GM has not activated a battlemap yet"} onClick={openBattlemap}>BATTLEMAP</button>,
    mapModeSwitch
  ) : null;

  return <>
    <SessionTacticalMapV3 session={tacticalSession} openRequest={openRequest} embedded={embedded} form={form} />
    {isPlayerSession && tacticalSession?.tacticalScene ? (
      <BattlemapSharedLayer scene={tacticalSession.tacticalScene} role="player" />
    ) : null}
    <PlayerClickMoveLayer session={tacticalSession} />
    <PlayerBattlemapControls session={tacticalSession} />
    <PlayerTokenAssignmentBridge session={tacticalSession} />
    {shortcut}
  </>;
}
