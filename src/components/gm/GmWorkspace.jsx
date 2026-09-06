import React, { useState } from "react";
import GmPanel from "./GmPanel.jsx";
import GmToolkit from "./GmToolkit.jsx";
import "./gmWorkspace.css";

export default function GmWorkspace({ character = null, setCharacter = null, onOpenMap }) {
  const [panelVersion, setPanelVersion] = useState(0);

  return (
    <div className="gm-workspace">
      <GmPanel
        key={`gm-panel-${panelVersion}`}
        character={character}
        onOpenMap={onOpenMap}
      />
      <GmToolkit
        character={character}
        setCharacter={setCharacter}
        onGmStateChanged={() => setPanelVersion((value) => value + 1)}
      />
    </div>
  );
}
