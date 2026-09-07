import React, { useRef, useState } from "react";
import GmPanel from "./GmPanel.jsx";
import GmToolkit from "./GmToolkit.jsx";
import GmSessionMap from "./GmSessionMap.jsx";
import "./gmWorkspace.css";
import "./gmSessionMapLayout.css";

export default function GmWorkspace({ character = null, setCharacter = null, session = null }) {
  const [panelVersion, setPanelVersion] = useState(0);
  const tacticalMapRef = useRef(null);

  const openTacticalMap = () => {
    tacticalMapRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      tacticalMapRef.current?.querySelector?.("button, select, input")?.focus?.({ preventScroll: true });
    }, 260);
  };

  return (
    <div className="gm-workspace">
      <div ref={tacticalMapRef} className="gm-workspace__tactical-anchor">
        <GmSessionMap character={character} session={session} />
      </div>
      <GmPanel
        key={`gm-panel-${panelVersion}`}
        character={character}
        onOpenMap={openTacticalMap}
      />
      <GmToolkit
        character={character}
        setCharacter={setCharacter}
        onGmStateChanged={() => setPanelVersion((value) => value + 1)}
      />
    </div>
  );
}
