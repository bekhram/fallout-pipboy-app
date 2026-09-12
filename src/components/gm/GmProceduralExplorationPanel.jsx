import React, { useMemo } from "react";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import GmSettlementRoomPanel from "./GmSettlementRoomPanel.jsx";
import GmWastelandPoiPanel from "./GmWastelandPoiPanel.jsx";
import GmBattlemapExtrasPanel from "./GmBattlemapExtrasPanel.jsx";
import { applyRandomEncounterEnemyBuff } from "../../utils/proceduralEnemyBuffs.js";

function buffSeed(payload = {}, stats = {}) {
  return [
    stats.generatedEncounterSeed || "encounter",
    stats.generatedRoomId || stats.generatedPoiId || "area",
    payload.npcId || payload.name || "npc",
    Number.isFinite(Number(payload.x)) ? Number(payload.x) : "x",
    Number.isFinite(Number(payload.y)) ? Number(payload.y) : "y",
  ].join(":");
}

export default function GmProceduralExplorationPanel({ session }) {
  const spec = session?.tacticalScene?.environment?.proceduralMapSpec || null;
  const type = String(spec?.type || "");

  const encounterSession = useMemo(() => {
    if (!session || !spec?.enemyBuffsEnabled) return session;
    return {
      ...session,
      createNpcToken: async (payload = {}) => {
        const stats = payload?.stats && typeof payload.stats === "object" ? payload.stats : {};
        if (!stats.generatedEncounterSeed) return session.createNpcToken?.(payload);

        const disposition = String(stats.generatedDisposition || "hostile").toLowerCase();
        const nextStats = applyRandomEncounterEnemyBuff(stats, {
          enabled: disposition !== "friendly",
          tier: spec.enemyBuffTier,
          disposition,
          seed: buffSeed(payload, stats),
        });
        return session.createNpcToken?.({ ...payload, stats: nextStats });
      },
    };
  }, [session, spec?.enemyBuffsEnabled, spec?.enemyBuffTier, spec?.seed]);

  let primary = <GmProceduralRoomDescriptionsV4 session={encounterSession} />;
  if (type === "wasteland") primary = <GmWastelandPoiPanel session={encounterSession} />;
  if (type === "settlement") primary = <GmSettlementRoomPanel session={encounterSession} />;

  return (
    <>
      {primary}
      <GmBattlemapExtrasPanel session={session} />
    </>
  );
}
