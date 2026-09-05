import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMapRegion } from "../../data/map/mapRegions.js";
import LocationLorePanel from "./LocationLorePanel.jsx";
import "./locationLore.css";

const CHARACTER_STORAGE_KEY = "fallout_pipboy_v4_last_character";

function readMapState() {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    const character = raw ? JSON.parse(raw)?.data : null;
    return character?.mapData || null;
  } catch {
    return null;
  }
}

function snapshotKey(mapState) {
  return `${mapState?.regionId || "commonwealth"}:${mapState?.trackedLocationId || ""}`;
}

export default function LocationLoreDock({ active }) {
  const { t, i18n } = useTranslation();
  const [mapState, setMapState] = useState(() => readMapState());

  useEffect(() => {
    if (!active) return undefined;
    let lastKey = snapshotKey(readMapState());
    setMapState(readMapState());
    const timer = window.setInterval(() => {
      const next = readMapState();
      const nextKey = snapshotKey(next);
      if (nextKey !== lastKey) {
        lastKey = nextKey;
        setMapState(next);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [active]);

  const region = useMemo(() => getMapRegion(mapState?.regionId), [mapState?.regionId]);
  const location = useMemo(
    () => region?.locations?.find((item) => item.id === mapState?.trackedLocationId) || null,
    [region, mapState?.trackedLocationId]
  );

  if (!active || !location) return null;

  const displayName = location.nameKey
    ? t(location.nameKey, { defaultValue: location.name || location.id })
    : location.name || location.id;

  return (
    <div className="pip-location-lore-dock" aria-live="polite">
      <LocationLorePanel
        location={location}
        regionId={region?.id}
        language={i18n.resolvedLanguage || i18n.language || "en"}
        displayName={displayName}
      />
    </div>
  );
}
