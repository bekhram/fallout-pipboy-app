import React from "react";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import GmWastelandPoiPanel from "./GmWastelandPoiPanel.jsx";

export default function GmProceduralExplorationPanel({ session }) {
  const spec = session?.tacticalScene?.environment?.proceduralMapSpec || null;
  if (String(spec?.type || "") === "wasteland") return <GmWastelandPoiPanel session={session} />;
  return <GmProceduralRoomDescriptionsV4 session={session} />;
}
