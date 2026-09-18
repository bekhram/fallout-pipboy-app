import PhaserMapViewport from "../phaser/PhaserMapViewport.jsx";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { mapUiText } from "./mapUiText.js";

const PADDING = 4;
const LOCAL_GM_STORE_KEY = "fallout_pipboy_local_gm_sessions_v3";

function fallbackLocationName(location) {
  if (!location) return "Unknown";
  return location.name || location.id?.replaceAll("_", " ") || "Unknown";
}

function readLocalGmStore() {
  try {
    const raw = localStorage.getItem(LOCAL_GM_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getLocationProgress(locationId, sessions) {
  const session = sessions?.[`location:${locationId}`];
  if (!session) return null;
  const messages = Array.isArray(session.messages) ? session.messages : [];
  const events = Array.isArray(session.events) ? session.events : [];
  if (!messages.length && !events.length) return null;
  const cleared = events.some((event) => ["cleared", "resolved"].includes(String(event?.status || "").toLowerCase()));
  return {
    status: cleared ? "cleared" : events.length ? "explored" : "visited",
    messages: messages.length,
    discoveries: events.length,
    updatedAt: Number(session.updatedAt || 0),
    events,
  };
}

export default function WorldOverview({ background, mapData, playerPosition, locations = [] }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const tx = (key, vars) => mapUiText(language, key, vars);
  const displayName = (location) => {
    if (location?.nameKey) {
      const translated = t(location.nameKey);
      if (translated && translated !== location.nameKey) return translated;
    }
    return fallbackLocationName(location);
  };
  const worldOffset = mapData?.worldOffset || { x: 0, y: 0 };
  const cols = mapData?.cols || 8;
  const rows = mapData?.rows || 8;
  const playerWorld = {
    x: worldOffset.x * cols + (playerPosition?.x || 0),
    y: worldOffset.y * rows + (playerPosition?.y || 0),
  };

  const sessions = useMemo(() => readLocalGmStore(), []);
  const [selectedId, setSelectedId] = useState(() => {
    try {
      const select = document.querySelector(".pip-map-select-label select");
      return select?.value || locations[0]?.id || "";
    } catch {
      return locations[0]?.id || "";
    }
  });

  const selected = locations.find((location) => location.id === selectedId) || null;
  const selectedProgress = selected ? getLocationProgress(selected.id, sessions) : null;

  const bounds = useMemo(() => {
    const xs = [playerWorld.x, ...locations.map((location) => location.worldX)];
    const ys = [playerWorld.y, ...locations.map((location) => location.worldY)];
    const minX = Math.min(...xs) - PADDING;
    const maxX = Math.max(...xs) + PADDING;
    const minY = Math.min(...ys) - PADDING;
    const maxY = Math.max(...ys) + PADDING;
    return { minX, maxX, minY, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }, [playerWorld.x, playerWorld.y, locations]);

  function chooseLocation(location) {
    setSelectedId(location.id);
    try {
      const select = document.querySelector(".pip-map-select-label select");
      if (select) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
        setter?.call(select, location.id);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch {
      // Sidebar synchronization is optional; overview still works independently.
    }
  }

  const distance = selected
    ? Math.hypot(selected.worldX - playerWorld.x, selected.worldY - playerWorld.y)
    : 0;

  return (
    <section className="pip-world-overview">
      <div className="pip-world-overview__toolbar">
        <div>
          <strong>{tx("worldOverview")}</strong>
          <span>{selected ? `${tx("route")} // ${displayName(selected).toUpperCase()}` : tx("selectStaticLocation")}</span>
          {selectedProgress ? (
            <span className={`pip-world-overview__progress-text is-${selectedProgress.status}`}>
              {selectedProgress.status.toUpperCase()} · {selectedProgress.discoveries} {tx("discoveries")}
            </span>
          ) : null}
        </div>

      </div>

      <label className="phaser-location-select">
        {tx("target")}
        <select value={selectedId} onChange={event => { const location = locations.find(item => item.id === event.target.value); if (location) chooseLocation(location); }}>
          {locations.map(location => <option key={location.id} value={location.id}>{displayName(location)}</option>)}
        </select>
      </label>
      <PhaserMapViewport
        cols={Math.ceil(bounds.width)} rows={Math.ceil(bounds.height)} sceneKey={background}
        background={background} label={tx("worldOverview")}
        markers={locations.map(location => ({ ...location, x: location.worldX - bounds.minX - .5, y: location.worldY - bounds.minY - .5 }))}
        onMarker={chooseLocation}
        player={{ x: playerWorld.x - bounds.minX - .5, y: playerWorld.y - bounds.minY - .5 }}
        route={selected ? [{ x: playerWorld.x - bounds.minX - .5, y: playerWorld.y - bounds.minY - .5 }, { x: selected.worldX - bounds.minX - .5, y: selected.worldY - bounds.minY - .5 }] : []}
      />

      <div className="pip-world-overview__status">
        <span>{tx("world")} {playerWorld.x},{playerWorld.y}</span>
        {selected ? <span>{tx("target")} {selected.worldX},{selected.worldY}</span> : null}
        {selected ? <span>~{distance.toFixed(1)} {tx("blocks")}</span> : null}
        {selectedProgress ? <span>{selectedProgress.messages} {tx("messages")} · {selectedProgress.discoveries} {tx("discoveries")}</span> : null}
        <span>{Math.ceil(bounds.width / cols)}×{Math.ceil(bounds.height / rows)} {tx("sectorView")}</span>
      </div>
    </section>
  );
}
