import React from "react";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import GmSettlementRoomPanel from "./GmSettlementRoomPanel.jsx";
import GmWastelandPoiPanel from "./GmWastelandPoiPanel.jsx";
import GmBattlemapExtrasPanel from "./GmBattlemapExtrasPanel.jsx";

export default function GmProceduralExplorationPanel({ session }) {
  const spec = session?.tacticalScene?.environment?.proceduralMapSpec || null;
  const type = String(spec?.type || "");

  let primary = <GmProceduralRoomDescriptionsV4 session={session} />;
  if (type === "wasteland") primary = <GmWastelandPoiPanel session={session} />;
  if (type === "settlement") primary = <GmSettlementRoomPanel session={session} />;

  return (
    <>
      {primary}
      <GmBattlemapExtrasPanel session={session} />
    </>
  );
}
