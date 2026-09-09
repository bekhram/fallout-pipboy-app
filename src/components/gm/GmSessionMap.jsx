import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import GmSessionMapV2 from "./GmSessionMapV2.jsx";
import GmUnifiedTokenManagerV9 from "./GmUnifiedTokenManagerV9.jsx";
import GmTokenStatusLayer from "./GmTokenStatusLayer.jsx";
import BattlemapViewportControls from "./BattlemapViewportControls.jsx";
import GmAutoGmPanel from "./GmAutoGmPanel.jsx";
import GmLootGenerator from "./GmLootGenerator.jsx";
import GmMerchantGenerator from "./GmMerchantGenerator.jsx";
import GmScenePresetPanel from "./GmScenePresetPanel.jsx";
import ProceduralMapSemanticPortal from "./ProceduralMapSemanticPortal.jsx";
import TacticalEnvironmentPanel, {
  TacticalEnvironmentSummary,
} from "./TacticalEnvironmentPanel.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import "./tacticalInteractionFixes.css";
import "./tacticalFootprint3.css";
import "./tokenVisualFootprintFix.css";
import "./gmNpcCardEditor.css";
import "./gmTacticalTabs.css";

const TAB_STORAGE_KEY = "pip2d20_gm_tactical_tab_v1";
const TABS = ["battle", "autogm", "loot", "merchants", "custom", "encounter", "scenes", "tokens"];
const COPY = {
  en: {
    battle: "BATTLEMAP", autogm: "AUTO GM", loot: "LOOT", merchants: "MERCHANTS", custom: "CREATE NPC",
    encounter: "ENCOUNTER", scenes: "SCENES", tokens: "TOKENS",
    waiting: "TACTICAL MAP // WAITING FOR GM ROOM...", menu: "GM tactical menu",
  },
  ru: {
    battle: "БОЕВАЯ КАРТА", autogm: "АВТО ГМ", loot: "ЛУТ", merchants: "ТОРГОВЦЫ", custom: "СОЗДАТЬ NPC",
    encounter: "СЦЕНА", scenes: "СЦЕНЫ", tokens: "ТОКЕНЫ",
    waiting: "ТАКТИЧЕСКАЯ КАРТА // ОЖИДАНИЕ КОМНАТЫ ГМ...", menu: "Тактическое меню ГМ",
  },
  uk: {
    battle: "БОЙОВА МАПА", autogm: "АВТО ГМ", loot: "ЛУТ", merchants: "ТОРГОВЦІ", custom: "СТВОРИТИ NPC",
    encounter: "СЦЕНА", scenes: "СЦЕНИ", tokens: "ТОКЕНИ",
    waiting: "ТАКТИЧНА МАПА // ОЧІКУВАННЯ КІМНАТИ ГМ...", menu: "Тактичне меню ГМ",
  },
  pl: {
    battle: "MAPA BITWY", autogm: "AUTO MG", loot: "ŁUP", merchants: "HANDLARZE", custom: "UTWÓRZ NPC",
    encounter: "SPOTKANIE", scenes: "SCENY", tokens: "TOKENY",
    waiting: "MAPA TAKTYCZNA // OCZEKIWANIE NA POKÓJ MG...", menu: "Menu taktyczne MG",
  },
};

function languageCode(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function initialTab() {
  if (typeof window === "undefined") return "battle";
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  return TABS.includes(stored) ? stored : "battle";
}

function sessionWithProceduralContext(session) {
  const scene = session?.tacticalScene;
  const proceduralActive = String(scene?.backgroundName || "").startsWith("PROC //");
  const map = proceduralActive ? scene?.environment?.proceduralMap : null;
  if (!map) return session;

  const rooms = (Array.isArray(map.rooms) ? map.rooms : [])
    .slice(0, 12)
    .map((item) => `${item.label}@${item.x},${item.y}[${item.w}x${item.h}]`)
    .join("; ");
  const doors = (Array.isArray(map.doors) ? map.doors : [])
    .slice(0, 16)
    .map((item) => `${item.id}@${item.x},${item.y}${item.locked ? `[LOCKED D${item.difficulty || 1}]` : ""}${item.connects?.length ? `(${item.connects.join("↔")})` : ""}`)
    .join("; ");
  const points = (Array.isArray(map.points) ? map.points : [])
    .slice(0, 12)
    .map((item) => `${item.type}@${item.x},${item.y}`)
    .join("; ");
  const context = [
    `PROCEDURAL MAP V${map.version || 2}`,
    rooms ? `ROOMS: ${rooms}` : "",
    doors ? `DOORS: ${doors}` : "",
    points ? `POINTS: ${points}` : "",
    `COVER: ${map.covers?.length || 0}`,
    `BLOCKING OBSTACLES: ${map.obstacles?.filter((item) => item.blocksMovement !== false).length || 0}`,
    `WALL SEGMENTS: ${map.walls?.length || 0}`,
  ].filter(Boolean).join(" | ");

  return {
    ...session,
    tacticalScene: {
      ...scene,
      backgroundName: `${scene.backgroundName} | ${context}`.slice(0, 5000),
    },
  };
}

export default function GmSessionMap(props) {
  const { i18n } = useTranslation();
  const bridgedSession = useLiveSessionBridge();
  const session = props.session || bridgedSession;
  const [activeTab, setActiveTab] = useState(initialTab);
  const labels = COPY[languageCode(i18n.resolvedLanguage || i18n.language)] || COPY.en;

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  if (!session?.isActive || session?.mode !== "host" || !session?.tacticalScene) {
    return <section className="pip-panel gm-session-map tactical-map"><div className="gm-session-map__hint">{labels.waiting}</div></section>;
  }

  const autoGmSession = sessionWithProceduralContext(session);

  return (
    <section className="gm-tactical-tabs-shell">
      <nav className="gm-tactical-tabs" aria-label={labels.menu}>
        <div className="gm-tactical-tabs__scroll">
          {TABS.map((tab) => <button key={tab} type="button" className={`gm-tactical-tab${activeTab===tab?" is-active":""}`} aria-pressed={activeTab===tab} onClick={()=>setActiveTab(tab)}>{labels[tab]}</button>)}
        </div>
      </nav>

      <div className={`gm-tactical-shell gm-tactical-view--${activeTab}`}>
        <div className="gm-tactical-battle-effects"><TacticalEnvironmentSummary scene={session.tacticalScene} effectsOnly /></div>
        <div className="gm-tactical-auto-gm"><GmAutoGmPanel session={autoGmSession} /></div>
        <div className="gm-tactical-loot"><GmLootGenerator session={session} /></div>
        <div className="gm-tactical-merchants"><GmMerchantGenerator session={session} /></div>
        <div className="gm-tactical-environment-edit"><TacticalEnvironmentPanel scene={session.tacticalScene} session={session} /></div>
        <div className="gm-tactical-scene-presets"><GmScenePresetPanel session={session} /></div>
        <div className="gm-tactical-map-core"><GmSessionMapV2 {...props} session={session} /></div>
        <ProceduralMapSemanticPortal scene={session.tacticalScene} />
        <BattlemapViewportControls session={session} role="gm" activeTab={activeTab} />
        <GmTokenStatusLayer session={session} />
        <div className="gm-tactical-token-manager"><GmUnifiedTokenManagerV9 session={session} /></div>
      </div>
    </section>
  );
}
