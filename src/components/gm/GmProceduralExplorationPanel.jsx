import React from "react";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import GmSettlementRoomPanel from "./GmSettlementRoomPanel.jsx";
import GmWastelandPoiPanel from "./GmWastelandPoiPanel.jsx";

export default function GmProceduralExplorationPanel({ session }) {
  const spec = session?.tacticalScene?.environment?.proceduralMapSpec || null;
  const type = String(spec?.type || "");
  if (type === "wasteland") return <GmWastelandPoiPanel session={session} />;
  if (type === "settlement") return <GmSettlementRoomPanel session={session} />;
  return <GmProceduralRoomDescriptionsV4 session={session} />;
}
