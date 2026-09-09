import React from "react";
import SessionTacticalMapV3 from "./SessionTacticalMapV3.jsx";
import PlayerProceduralMapSemanticPortal from "./PlayerProceduralMapSemanticPortal.jsx";
import PlayerTacticalCoverBadge from "./PlayerTacticalCoverBadge.jsx";
import "../gm/tacticalFootprint3.css";

export default function SessionTacticalMapV4(props) {
  return (
    <>
      <SessionTacticalMapV3 {...props} />
      <PlayerProceduralMapSemanticPortal scene={props.session?.tacticalScene} />
      <PlayerTacticalCoverBadge session={props.session} />
    </>
  );
}
