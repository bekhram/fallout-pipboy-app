import React, { useRef } from "react";
import GmSessionMap from "./GmSessionMap.jsx";
import "./gmWorkspace.css";
import "./gmSessionMapLayout.css";

export default function GmWorkspace({ character = null, session = null }) {
  const tacticalMapRef = useRef(null);

  return (
    <div className="gm-workspace gm-workspace--tactical-only">
      <div ref={tacticalMapRef} className="gm-workspace__tactical-anchor">
        <GmSessionMap character={character} session={session} />
      </div>
    </div>
  );
}
