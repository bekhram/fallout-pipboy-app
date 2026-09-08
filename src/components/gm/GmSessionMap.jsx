import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import GmSessionMapV2 from "./GmSessionMapV2.jsx";
import GmUnifiedTokenManagerV4 from "./GmUnifiedTokenManagerV4.jsx";
import GmTokenStatusLayer from "./GmTokenStatusLayer.jsx";
import BattlemapViewportControls from "./BattlemapViewportControls.jsx";
import GmAutoGmPanel from "./GmAutoGmPanel.jsx";
import GmLootGenerator from "./GmLootGenerator.jsx";
import TacticalEnvironmentPanel, {
  TacticalEnvironmentSummary,
} from "./TacticalEnvironmentPanel.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import "./tacticalInteractionFixes.css";
import "./tacticalFootprint3.css";
import "./gmNpcCardEditor.css";
import "./gmTacticalTabs.css";

const TAB_STORAGE_KEY = "pip2d20_gm_tactical_tab_v1";
const TABS = ["battle", "autogm", "loot", "custom", "encounter", "scenes", "tokens"];
const COPY = {
  en: {
    battle: "BATTLEMAP",
    autogm: "AUTO GM",
    loot: "LOOT",
    custom: "CUSTOM",
    encounter: "ENCOUNTER",
    scenes: "SCENES",
    tokens: "TOKENS",
    waiting: "TACTICAL MAP // WAITING FOR GM ROOM...",
    menu: "GM tactical menu",
  },
  ru: {
    battle: "БОЕВАЯ КАРТА",
    autogm: "АВТО ГМ",
    loot: "ЛУТ",
    custom: "СВОЁ",
    encounter: "СЦЕНА",
    scenes: "СЦЕНЫ",
    tokens: "ТОКЕНЫ",
    waiting: "ТАКТИЧЕСКАЯ КАРТА // ОЖИДАНИЕ КОМНАТЫ ГМ...",
    menu: "Тактическое меню ГМ",
  },
  uk: {
    battle: "БОЙОВА МАПА",
    autogm: "АВТО ГМ",
    loot: "ЛУТ",
    custom: "ВЛАСНЕ",
    encounter: "СЦЕНА",
    scenes: "СЦЕНИ",
    tokens: "ТОКЕНИ",
    waiting: "ТАКТИЧНА МАПА // ОЧІКУВАННЯ КІМНАТИ ГМ...",
    menu: "Тактичне меню ГМ",
  },
  pl: {
    battle: "MAPA BITWY",
    autogm: "AUTO MG",
    loot: "ŁUP",
    custom: "WŁASNE",
    encounter: "SPOTKANIE",
    scenes: "SCENY",
    tokens: "TOKENY",
    waiting: "MAPA TAKTYCZNA // OCZEKIWANIE NA POKÓJ MG...",
    menu: "Menu taktyczne MG",
  },
};

function languageCode(language) {
  const code = String(language || "en")
    .toLowerCase()
    .split("-")[0];
  return COPY[code] ? code : "en";
}

function initialTab() {
  if (typeof window === "undefined") return "battle";
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  return TABS.includes(stored) ? stored : "battle";
}

export default function GmSessionMap(props) {
  const { i18n } = useTranslation();
  const bridgedSession = useLiveSessionBridge();
  const session = props.session || bridgedSession;
  const [activeTab, setActiveTab] = useState(initialTab);
  const labels =
    COPY[languageCode(i18n.resolvedLanguage || i18n.language)] || COPY.en;

  useEffect(() => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  if (
    !session?.isActive ||
    session?.mode !== "host" ||
    !session?.tacticalScene
  ) {
    return (
      <section className="pip-panel gm-session-map tactical-map">
        <div className="gm-session-map__hint">{labels.waiting}</div>
      </section>
    );
  }

  return (
    <section className="gm-tactical-tabs-shell">
      <nav className="gm-tactical-tabs" aria-label={labels.menu}>
        <div className="gm-tactical-tabs__scroll">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`gm-tactical-tab${
                activeTab === tab ? " is-active" : ""
              }`}
              aria-pressed={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {labels[tab]}
            </button>
          ))}
        </div>
      </nav>

      <div className={`gm-tactical-shell gm-tactical-view--${activeTab}`}>
        <div className="gm-tactical-battle-effects">
          <TacticalEnvironmentSummary
            scene={session.tacticalScene}
            effectsOnly
          />
        </div>

        <div className="gm-tactical-auto-gm">
          <GmAutoGmPanel session={session} />
        </div>

        <div className="gm-tactical-loot">
          <GmLootGenerator session={session} />
        </div>

        <div className="gm-tactical-environment-edit">
          <TacticalEnvironmentPanel
            scene={session.tacticalScene}
            session={session}
          />
        </div>

        <div className="gm-tactical-map-core">
          <GmSessionMapV2 {...props} session={session} />
        </div>

        <BattlemapViewportControls
          session={session}
          role="gm"
          activeTab={activeTab}
        />
        <GmTokenStatusLayer session={session} />

        <div className="gm-tactical-token-manager">
          <GmUnifiedTokenManagerV4 session={session} />
        </div>
      </div>
    </section>
  );
}
