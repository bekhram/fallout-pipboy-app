import React, { useRef } from "react";
import GmSessionMap from "./GmSessionMap.jsx";
import GmCloudCampaignPanel from "./GmCloudCampaignPanel.jsx";
import QuestTypeSelectorPortal from "./QuestTypeSelectorPortal.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import "./gmWorkspace.css";
import "./gmSessionMapLayout.css";

export default function GmWorkspace({ character = null, session = null }) {
  const tacticalMapRef = useRef(null);
  const bridgedSession = useLiveSessionBridge();
  const effectiveSession = session || bridgedSession;

  return (
    <div className="gm-workspace gm-workspace--tactical-only">
      <GmCloudCampaignPanel session={effectiveSession} />
      <div ref={tacticalMapRef} className="gm-workspace__tactical-anchor">
        <GmSessionMap character={character} session={effectiveSession} />
        <QuestTypeSelectorPortal session={effectiveSession} />
      </div>
    </div>
  );
}
