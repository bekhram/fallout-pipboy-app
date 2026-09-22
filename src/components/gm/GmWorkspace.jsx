import React, { useRef } from "react";
import GmSessionMap from "./GmSessionMap.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import "./gmWorkspace.css";
import "./gmSessionMapLayout.css";

export default function GmWorkspace({ character = null, setCharacter = null, session = null, onChatDockReady, onOpenCampaigns }) {
  const tacticalMapRef = useRef(null);
  const bridgedSession = useLiveSessionBridge();
  const effectiveSession = session || bridgedSession;

  return (
    <div className="gm-workspace gm-workspace--tactical-only">
      <div ref={tacticalMapRef} className="gm-workspace__tactical-anchor">
        <GmSessionMap character={character} setCharacter={setCharacter} session={effectiveSession} onChatDockReady={onChatDockReady} onOpenCampaigns={onOpenCampaigns} />
      </div>
    </div>
  );
}
