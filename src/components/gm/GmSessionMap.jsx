import React from "react";
import GmSessionMapV2 from "./GmSessionMapV2.jsx";
import GmUnifiedTokenManager from "./GmUnifiedTokenManager.jsx";
import GmCustomCreatureQuickAdd from "./GmCustomCreatureQuickAdd.jsx";
import GmTokenStatusLayer from "./GmTokenStatusLayer.jsx";
import TacticalEnvironmentPanel from "./TacticalEnvironmentPanel.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";

export default function GmSessionMap(props) {
  const bridgedSession = useLiveSessionBridge();
  const session = props.session || bridgedSession;

  if (!session?.isActive || session?.mode !== "host" || !session?.tacticalScene) {
    return (
      <section className="pip-panel gm-session-map tactical-map">
        <div className="gm-session-map__hint">TACTICAL MAP // WAITING FOR GM ROOM...</div>
      </section>
    );
  }

  return (
    <>
      <TacticalEnvironmentPanel scene={session.tacticalScene} session={session} />
      <GmSessionMapV2 {...props} session={session} />
      <GmTokenStatusLayer session={session} />
      <GmUnifiedTokenManager session={session} />
      <GmCustomCreatureQuickAdd session={session} />
    </>
  );
}
