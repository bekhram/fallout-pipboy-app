import React, { useEffect, useState } from "react";
import GmSessionMapV2 from "./GmSessionMapV2.jsx";
import GmUnifiedTokenManagerV4 from "./GmUnifiedTokenManagerV4.jsx";
import GmTokenStatusLayer from "./GmTokenStatusLayer.jsx";
import TacticalEnvironmentPanel, { TacticalEnvironmentSummary } from "./TacticalEnvironmentPanel.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import "./tacticalInteractionFixes.css";
import "./tacticalFootprint3.css";
import "./gmNpcCardEditor.css";
import "./gmTacticalTabs.css";

const TAB_STORAGE_KEY = "pip2d20_gm_tactical_tab_v1";
const TABS = ["battle", "custom", "encounter", "scenes", "tokens"];
const COPY = {
  en: { battle: "BATTLEMAP", custom: "CUSTOM", encounter: "ENCOUNTER", scenes: "SCENES", tokens: "TOKENS" },
  ru: { battle: "БЕТЛМАП", custom: "КАСТОМ", encounter: "ЭНКАУНТЕР", scenes: "СЦЕНЫ", tokens: "ТОКЕНЫ" },
  uk: { battle: "БЕТЛМАП", custom: "КАСТОМ", encounter: "ЕНКАУНТЕР", scenes: "СЦЕНИ", tokens: "ТОКЕНИ" },
  pl: { battle: "BATTLEMAP", custom: "WŁASNE", encounter: "ENCOUNTER", scenes: "SCENY", tokens: "TOKENY" },
};

function languageCode() {
  if (typeof document === "undefined") return "en";
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function initialTab() {
  if (typeof window === "undefined") return "battle";
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  return TABS.includes(stored) ? stored : "battle";
}

export default function GmSessionMap(props) {
  const bridgedSession = useLiveSessionBridge();
  const session = props.session || bridgedSession;
  const [activeTab, setActiveTab] = useState(initialTab);
  const labels = COPY[languageCode()] || COPY.en;

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  if (!session?.isActive || session?.mode !== "host" || !session?.tacticalScene) {
    return (
      <section className="pip-panel gm-session-map tactical-map">
        <div className="gm-session-map__hint">TACTICAL MAP // WAITING FOR GM ROOM...</div>
      </section>
    );
  }

  return (
    <section className="gm-tactical-tabs-shell">
      <nav className="gm-tactical-tabs" aria-label="GM tactical menu">
        <div className="gm-tactical-tabs__scroll">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`gm-tactical-tab${activeTab === tab ? " is-active" : ""}`}
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
          <TacticalEnvironmentSummary scene={session.tacticalScene} effectsOnly />
        </div>

        <div className="gm-tactical-environment-edit">
          <TacticalEnvironmentPanel scene={session.tacticalScene} session={session} />
        </div>

        <div className="gm-tactical-map-core">
          <GmSessionMapV2 {...props} session={session} />
        </div>

        <GmTokenStatusLayer session={session} />

        <div className="gm-tactical-token-manager">
          <GmUnifiedTokenManagerV4 session={session} />
        </div>
      </div>
    </section>
  );
}
