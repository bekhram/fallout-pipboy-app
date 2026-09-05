from pathlib import Path

path = Path("src/components/map/MapScreen.jsx")
text = path.read_text()
old = '''  useEffect(() => {
    if (safeMapState.pendingTravelEncounter?.token) {
      setMapMode("local");
    }
  }, [safeMapState.pendingTravelEncounter?.token]);'''
new = '''  useEffect(() => {
    const pending = safeMapState.pendingTravelEncounter;
    if (!pending?.token) return;

    setMapMode("local");
    if (pending.resolution) return;

    const resolution = resolveTravelEncounter(pending, character);
    if (!resolution) return;

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      if (base.pendingTravelEncounter?.token !== pending.token) return base;
      if (base.pendingTravelEncounter?.resolution) return base;
      return {
        ...base,
        pendingTravelEncounter: {
          ...base.pendingTravelEncounter,
          resolution,
        },
      };
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: pending.token, resolution },
      }));
    }
    // Resolve legacy pending encounters created before exact encounter mechanics existed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMapState.pendingTravelEncounter?.token]);'''
if old not in text:
    raise SystemExit("Missing pending encounter effect anchor")
path.write_text(text.replace(old, new, 1))
print("Pending encounter migration applied")
