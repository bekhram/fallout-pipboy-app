import React, { lazy, Suspense } from "react";
import GmSessionMapV2 from "./GmSessionMapV2.jsx";
import WastelandAssetPortal from "./WastelandAssetPortal.jsx";
import SettlementAssetPortal from "./SettlementAssetPortal.jsx";
import RedRocketAssetPortal from "./RedRocketAssetPortal.jsx";
import SuperDuperMartAssetPortal from "./SuperDuperMartAssetPortal.jsx";
import VaultRoomMarkerPortal from "./VaultRoomMarkerPortal.jsx";
import FortifiedCampAssetPortal from "./FortifiedCampAssetPortal.jsx";
import WastelandPoiPortal from "./WastelandPoiPortal.jsx";
import SettlementRoomMarkerPortal from "./SettlementRoomMarkerPortal.jsx";
import ProceduralBattlemapExtraPortal from "./ProceduralBattlemapExtraPortal.jsx";
import QuestTokenPortal from "./QuestTokenPortal.jsx";
import GmTokenStatusLayer from "./GmTokenStatusLayer.jsx";
import GmTokenPointerGuard from "./GmTokenPointerGuard.jsx";
import GmTokenColorAndFocusEnhancer from "./GmTokenColorAndFocusEnhancer.jsx";
import BattlemapViewportControls from "./BattlemapViewportControls.jsx";
import BattlemapSharedLayer from "./BattlemapSharedLayer.jsx";
import GmBattlemapTools from "./GmBattlemapTools.jsx";
import GmZoomDrawerToggle from "./GmZoomDrawerToggle.jsx";
import { TacticalEnvironmentSummary } from "./TacticalEnvironmentPanel.jsx";

const LazyVaultEncounterPanel = lazy(() => import("./GmVaultEncounterPanel.jsx"));

// Only mount the Phaser map, scene portals and interactive tools while the
// battlemap tab is visible. The scene generator must never run alongside a
// hidden Phaser canvas or its token/DOM observers.
export default function GmBattleStage({ session, toolsSession, effectsLabel, ...mapProps }) {
  const isVault = session?.tacticalScene?.environment?.proceduralMapSpec?.type === "vault_tunnels";
  return (
    <>
      <details className="gm-tactical-battle-effects">
        <summary>{effectsLabel}</summary>
        <TacticalEnvironmentSummary scene={session.tacticalScene} effectsOnly />
      </details>
      <div className="gm-organic-initiative" />
      <div className="gm-tactical-map-core">
        <GmSessionMapV2 {...mapProps} session={session} />
      </div>
      <WastelandAssetPortal session={session} />
      <SettlementAssetPortal session={session} />
      <RedRocketAssetPortal session={session} />
      <SuperDuperMartAssetPortal session={session} />
      <VaultRoomMarkerPortal session={session} />
      <FortifiedCampAssetPortal session={session} />
      <WastelandPoiPortal session={session} />
      <SettlementRoomMarkerPortal session={session} />
      <ProceduralBattlemapExtraPortal session={session} />
      <QuestTokenPortal session={session} />
      <BattlemapSharedLayer scene={session.tacticalScene} role="gm" />
      <BattlemapViewportControls session={session} role="gm" activeTab="battle" />
      <GmZoomDrawerToggle />
      <GmBattlemapTools session={toolsSession} />
      <GmTokenColorAndFocusEnhancer session={session} />
      <GmTokenStatusLayer session={session} />
      <GmTokenPointerGuard />
      {isVault ? (
        <Suspense fallback={null}>
          <LazyVaultEncounterPanel session={session} />
        </Suspense>
      ) : null}
    </>
  );
}
