import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import GmSessionMapV2 from "./GmSessionMapV2.jsx";
import WastelandAssetPortal from "./WastelandAssetPortal.jsx";
import SettlementAssetPortal from "./SettlementAssetPortal.jsx";
import RedRocketAssetPortal from "./RedRocketAssetPortal.jsx";
import SuperDuperMartAssetPortal from "./SuperDuperMartAssetPortal.jsx";
import FortifiedCampAssetPortal from "./FortifiedCampAssetPortal.jsx";
import WastelandPoiPortal from "./WastelandPoiPortal.jsx";
import SettlementRoomMarkerPortal from "./SettlementRoomMarkerPortal.jsx";
import ProceduralBattlemapExtraPortal from "./ProceduralBattlemapExtraPortal.jsx";
import QuestTokenPortal from "./QuestTokenPortal.jsx";
import GmUnifiedTokenManagerV10 from "./GmUnifiedTokenManagerV10.jsx";
import GmTokenStatusLayer from "./GmTokenStatusLayer.jsx";
import GmTokenPointerGuard from "./GmTokenPointerGuard.jsx";
import GmTokenColorAndFocusEnhancer from "./GmTokenColorAndFocusEnhancer.jsx";
import BattlemapViewportControls from "./BattlemapViewportControls.jsx";
import BattlemapSharedLayer from "./BattlemapSharedLayer.jsx";
import GmBattlemapTools from "./GmBattlemapTools.jsx";
import GmZoomDrawerToggle from "./GmZoomDrawerToggle.jsx";
import GmAutoGmPanel from "./GmAutoGmPanel.jsx";
import GmLootGenerator from "./GmLootGenerator.jsx";
import GmMerchantGenerator from "./GmMerchantGenerator.jsx";
import TacticalEnvironmentPanel, { TacticalEnvironmentSummary } from "./TacticalEnvironmentPanel.jsx";
import GmWinterRulesPanel from "./GmWinterRulesPanel.jsx";
import GmReferenceScreen from "./GmReferenceScreen.jsx";
import GmSceneManagerScreen from "./GmSceneManagerScreen.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import "./tacticalInteractionFixes.css";
import "./tacticalFootprint3.css";
import "./tokenVisualFootprintFix.css";
import "./gmNpcCardEditor.css";
import "./gmTacticalTabs.css";
import "./gmDesktopLayoutV2.css";
import GmWorkspaceNavigation, { WORKSPACE_GROUPS, workspaceGroup, workspaceCopy } from "./GmWorkspaceNavigation.jsx";
import "./gmOrganicWorkspace.css";

import LiveSessionWorldMap from "../session/LiveSessionWorldMap.jsx";
import { worldCopy } from "../campaign/worldCopy.js";

const TAB_STORAGE_KEY = "pip2d20_gm_tactical_tab_v1";
const TABS = ["world", "battle", "scenes", "autogm", "loot", "merchants", "custom", "scene", "reference", "tokens", "roster", "participants"];
const SHARED_RULER_HOLD_MS = 6500;
const COPY = {
  en: { battle: "BATTLEMAP", autogm: "AUTO GM", loot: "LOOT", merchants: "MERCHANTS", custom: "CREATE NPC", scene: "ENCOUNTER / SCENE", tokens: "TOKENS", waiting: "TACTICAL MAP // WAITING FOR GM ROOM...", menu: "GM tactical menu", ap:"ACTION POINTS", playersAp:"Players AP", gmAp:"GM AP" },
  ru: { battle: "БОЕВАЯ КАРТА", autogm: "АВТО ГМ", loot: "ЛУТ", merchants: "ТОРГОВЦЫ", custom: "СОЗДАТЬ NPC", scene: "ВСТРЕЧА / СЦЕНА", tokens: "ТОКЕНЫ", waiting: "ТАКТИЧЕСКАЯ КАРТА // ОЖИДАНИЕ КОМНАТЫ ГМ...", menu: "Тактическое меню ГМ", ap:"ЭКШЕН ПОИНТЫ", playersAp:"AP игроков", gmAp:"AP ГМа" },
  uk: { battle: "БОЙОВА МАПА", autogm: "АВТО ГМ", loot: "ЛУТ", merchants: "ТОРГОВЦІ", custom: "СТВОРИТИ NPC", scene: "ЗУСТРІЧ / СЦЕНА", tokens: "ТОКЕНИ", waiting: "ТАКТИЧНА МАПА // ОЧІКУВАННЯ КІМНАТИ ГМ...", menu: "Тактичне меню ГМ" },
  pl: { battle: "MAPA BITWY", autogm: "AUTO MG", loot: "ŁUP", merchants: "HANDLARZE", custom: "UTWÓRZ NPC", scene: "SPOTKANIE / SCENA", tokens: "TOKENY", waiting: "MAPA TAKTYCZNA // OCZEKIWANIE NA POKÓJ MG...", menu: "Menu taktyczne MG", ap:"PUNKTY AKCJI", playersAp:"AP graczy", gmAp:"AP MG" },
};

function languageCode(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}
function normalizeTab(tab) {
  if (tab === "encounter") return "scene";
  return TABS.includes(tab) ? tab : "battle";
}
function ActionPointCounter({session,labels}){
  const ap=session?.tacticalScene?.actionPoints||{players:0,gm:0,max:6};
  const playerMax=6;
  const change=async(key,delta)=>{
    const current=Math.max(0,Math.floor(Number(ap[key]||0)));
    const next=key==="players"
      ? Math.max(0,Math.min(playerMax,current+delta))
      : Math.max(0,current+delta);
    await session?.updateTacticalScene?.({actionPoints:{players:Math.max(0,Math.min(playerMax,Math.floor(Number(ap.players||0)))),gm:Math.max(0,Math.floor(Number(ap.gm||0))),max:playerMax,[key]:next}});
  };
  const row=(key,label)=><div className="gm-ap-counter__row" key={key}><span>{label}</span><div><button type="button" onClick={()=>change(key,-1)} aria-label={label+" -1"}>−</button><strong>{key==="players" ? `${Math.max(0,Math.min(playerMax,Number(ap.players||0)))}/${playerMax}` : Math.max(0,Number(ap.gm||0))}</strong><button type="button" onClick={()=>change(key,1)} aria-label={label+" +1"}>+</button></div></div>;
  return <section className="gm-ap-counter" aria-label={labels.ap}>{row("players",labels.playersAp)}{row("gm",labels.gmAp)}</section>;
}

function initialTab() {
  if (typeof window === "undefined") return "battle";
  try { return normalizeTab(window.localStorage.getItem(TAB_STORAGE_KEY)); } catch { return "battle"; }
}

export default function GmSessionMap(props) {
  const { i18n } = useTranslation();
  const bridgedSession = useLiveSessionBridge();
  const session = props.session || bridgedSession;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [moreOpen, setMoreOpen] = useState(false);
  const ui = workspaceCopy(i18n.resolvedLanguage || i18n.language);
  const group = workspaceGroup(activeTab);
  const worldLabels = worldCopy(i18n.resolvedLanguage || i18n.language);
  const selectTab = (tab) => { setActiveTab(normalizeTab(tab)); setMoreOpen(false); };
  const rulerClearTimerRef = useRef(null);
  const labels = COPY[languageCode(i18n.resolvedLanguage || i18n.language)] || COPY.en;

  const toolsSession = useMemo(() => {
    if (!session) return session;
    return {
      ...session,
      updateSharedMapMarkup: (payload = {}) => {
        if (payload?.operation === "ruler:set") {
          if (rulerClearTimerRef.current) {
            window.clearTimeout(rulerClearTimerRef.current);
            rulerClearTimerRef.current = null;
          }
          return session.updateSharedMapMarkup?.(payload);
        }
        if (payload?.operation === "ruler:clear") {
          if (rulerClearTimerRef.current) window.clearTimeout(rulerClearTimerRef.current);
          rulerClearTimerRef.current = window.setTimeout(() => {
            session.updateSharedMapMarkup?.({ operation: "ruler:clear" });
            rulerClearTimerRef.current = null;
          }, SHARED_RULER_HOLD_MS);
          return Promise.resolve({ ok: true, delayed: true });
        }
        return session.updateSharedMapMarkup?.(payload);
      },
    };
  }, [session]);

  useEffect(() => {
    try { window.localStorage.setItem(TAB_STORAGE_KEY, activeTab); } catch { /* Private browsing can disable storage. */ }
  }, [activeTab]);

  useEffect(() => {
    const openBattle = () => selectTab("battle");
    window.addEventListener("pip2d20:gm-open-battlemap", openBattle);
    return () => window.removeEventListener("pip2d20:gm-open-battlemap", openBattle);
  }, []);

  useEffect(() => () => {
    if (rulerClearTimerRef.current) window.clearTimeout(rulerClearTimerRef.current);
  }, []);

  if (!session?.isActive || session?.mode !== "host" || !session?.tacticalScene) {
    return <section className="pip-panel gm-session-map tactical-map"><div className="gm-session-map__hint">{labels.waiting}</div></section>;
  }

  return (
    <section className={`gm-tactical-tabs-shell gm-organic-workspace gm-organic-group--${group}`}>
      <GmWorkspaceNavigation activeTab={activeTab} onSelect={selectTab} labels={ui} moreOpen={moreOpen} onMore={setMoreOpen} />
      <div className="gm-organic-content">
        <header className="gm-organic-pagehead"><div><span>{ui.subtitle}</span><h1>{ui[group]}</h1></div><div className="gm-organic-pagehead__tools"><ActionPointCounter session={session} labels={labels}/><span className="gm-organic-scene-name">{session.tacticalScene.name || session.tacticalScene.title || ""}</span></div></header>
        <nav className="gm-organic-subtabs" aria-label={ui[group]}>
          {WORKSPACE_GROUPS[group].map((tab) => <button type="button" key={tab} aria-pressed={activeTab === tab} onClick={() => selectTab(tab)}>{tab === "world" ? worldLabels.world : tab === "battle" ? worldLabels.tactical : ui[tab]}</button>)}
        </nav>
      {activeTab === "world" && <LiveSessionWorldMap session={session} />}
      {activeTab === "scenes" && <GmSceneManagerScreen session={session} onOpenBattlemap={()=>selectTab("battle")}/>} 
      {activeTab === "reference" && <GmReferenceScreen session={session}/>} 
      <div hidden={activeTab === "world" || activeTab === "reference" || activeTab === "scenes"} className={`gm-tactical-shell gm-tactical-view--${activeTab}`}>
        {activeTab === "scene" ? <div className="gm-tactical-winter"><GmWinterRulesPanel character={props.character} setCharacter={props.setCharacter} language={i18n.resolvedLanguage || i18n.language} showReputation={false} /></div> : null}
        <details className="gm-tactical-battle-effects"><summary>{ui.effects}</summary><TacticalEnvironmentSummary scene={session.tacticalScene} effectsOnly /></details>
        <div className="gm-tactical-auto-gm"><GmAutoGmPanel session={session} /></div>
        <div className="gm-tactical-loot"><GmLootGenerator session={session} /></div>
        <div className="gm-tactical-merchants"><GmMerchantGenerator session={session} /></div>
        <div className="gm-tactical-environment-edit"><TacticalEnvironmentPanel scene={session.tacticalScene} session={session} /></div>
        <div className="gm-organic-initiative" hidden={activeTab !== "battle"} />
        <div className="gm-tactical-map-core"><GmSessionMapV2 {...props} session={session} /></div>
        <WastelandAssetPortal session={session} />
        <SettlementAssetPortal session={session} />
        <RedRocketAssetPortal session={session} />
        <SuperDuperMartAssetPortal session={session} />
        <FortifiedCampAssetPortal session={session} />
        <WastelandPoiPortal session={session} />
        <SettlementRoomMarkerPortal session={session} />
        <ProceduralBattlemapExtraPortal session={session} />
        <QuestTokenPortal session={session} />
        <BattlemapSharedLayer scene={session.tacticalScene} role="gm" />
        <BattlemapViewportControls session={session} role="gm" activeTab={activeTab} />
        <GmZoomDrawerToggle />
        {activeTab === "battle" ? <GmBattlemapTools session={toolsSession} /> : null}
        <GmTokenColorAndFocusEnhancer session={session} />
        <GmTokenStatusLayer session={session} />
        <GmTokenPointerGuard />
        <div className="gm-tactical-token-manager"><GmUnifiedTokenManagerV10 session={session} /></div>
      </div>
      </div>
      <div className="gm-organic-chat-dock" ref={props.onChatDockReady} />
    </section>
  );
}
