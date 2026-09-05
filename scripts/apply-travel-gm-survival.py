from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


# MapScreen: persist encounter context, open Local automatically, pass context to MapGrid.
path = Path("src/components/map/MapScreen.jsx")
text = path.read_text()

text = replace_once(
    text,
    '''function encounterText(encounter, t, fallback) {
  if (!encounter) return null;
  if (encounter.textKey) return t(encounter.textKey);
  return encounter.text || encounter.name || encounter.id || fallback;
}
''',
    '''function encounterText(encounter, t, fallback) {
  if (!encounter) return null;
  if (encounter.textKey) return t(encounter.textKey);
  return encounter.text || encounter.name || encounter.id || fallback;
}

function createTravelEncounterContext(encounter, description, details = {}) {
  if (!encounter) return null;
  return {
    token: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    id: encounter.id || "travel_encounter",
    type: encounter.type || "encounter",
    text: String(description || encounter.text || encounter.name || encounter.id || "Travel encounter"),
    source: "global_travel",
    ...details,
  };
}
''',
    "travel encounter helper",
)

text = replace_once(
    text,
    '''    const routeLog = [summary, ...detailLog.reverse()];

    onMapChange((prevMap) => {''',
    '''    const routeLog = [summary, ...detailLog.reverse()];
    const encounterContext = stoppedEncounter
      ? createTravelEncounterContext(
          stoppedEncounter,
          encounterText(stoppedEncounter, t, tx("travelEncounter")),
          {
            regionId: activeRegion.id,
            terrain: getCell(mapData, finalPosition.x, finalPosition.y)?.terrain || null,
            hours: totalCost,
            worldX: worldOffset.x * mapData.cols + finalPosition.x,
            worldY: worldOffset.y * mapData.rows + finalPosition.y,
          }
        )
      : null;

    onMapChange((prevMap) => {''',
    "local travel encounter context",
)

text = replace_once(
    text,
    '''        travelLog: mergeTravelLog(base, routeLog),
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: mapData },''',
    '''        travelLog: mergeTravelLog(base, routeLog),
        pendingTravelEncounter: encounterContext,
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: mapData },''',
    "local travel pending encounter",
)

text = replace_once(
    text,
    '''    if (reachedDestination) setSelectedCell(null);
  }

  function handleWorldTravel() {''',
    '''    if (stoppedEncounter) setMapMode("local");
    if (reachedDestination && !stoppedEncounter) setSelectedCell(null);
  }

  function handleWorldTravel() {''',
    "open local after local-route encounter",
)

# Second occurrence of routeLog belongs to world travel.
anchor = '''    const routeLog = [summary, ...detailLog.reverse()];

    const finalSector = worldToSectorPosition(finalStep.worldX, finalStep.worldY, mapData.cols, mapData.rows);'''
replacement = '''    const routeLog = [summary, ...detailLog.reverse()];
    const encounterContext = stoppedEncounter
      ? createTravelEncounterContext(
          stoppedEncounter,
          encounterText(stoppedEncounter, t, tx("travelEncounter")),
          {
            regionId: activeRegion.id,
            terrain: finalStep.cell?.terrain || null,
            hours: totalCost,
            worldX: finalStep.worldX,
            worldY: finalStep.worldY,
            destinationId: trackedLocation.id,
            destinationName: targetName,
          }
        )
      : null;

    const finalSector = worldToSectorPosition(finalStep.worldX, finalStep.worldY, mapData.cols, mapData.rows);'''
text = replace_once(text, anchor, replacement, "world travel encounter context")

# Replace the world-travel travelLog occurrence after final sector update.
old = '''        sectorCache: { ...(base.sectorCache || {}), ...route.cache },
        travelLog: mergeTravelLog(base, routeLog),
      };
    });'''
new = '''        sectorCache: { ...(base.sectorCache || {}), ...route.cache },
        travelLog: mergeTravelLog(base, routeLog),
        pendingTravelEncounter: encounterContext,
      };
    });'''
text = replace_once(text, old, new, "world travel pending encounter")

text = replace_once(
    text,
    '''    setSelectedCell(null);
  }

  function handleRegenerateMap() {''',
    '''    if (stoppedEncounter) setMapMode("local");
    setSelectedCell(null);
  }

  function handleRegenerateMap() {''',
    "open local after world encounter",
)

text = replace_once(
    text,
    '''  function selectStaticLocation(location) {
    onMapChange({ trackedLocationId: location.id });
    const cell = getCell(mapData, location.localX, location.localY);
    if (cell) setSelectedCell(cell);
  }

  return (''',
    '''  function selectStaticLocation(location) {
    onMapChange({ trackedLocationId: location.id });
    const cell = getCell(mapData, location.localX, location.localY);
    if (cell) setSelectedCell(cell);
  }

  function handleTravelEncounterHandled(token) {
    if (!token) return;
    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      if (base.pendingTravelEncounter?.token !== token) return base;
      return { ...base, pendingTravelEncounter: null };
    });
  }

  return (''',
    "encounter handled callback",
)

text = replace_once(
    text,
    '''                locations={regionLocations}
                region={{ id: activeRegion.id, game: activeRegion.game, name: getRegionName(activeRegion, language) }}
              />''',
    '''                locations={regionLocations}
                region={{ id: activeRegion.id, game: activeRegion.game, name: getRegionName(activeRegion, language) }}
                travelEncounter={safeMapState.pendingTravelEncounter || null}
                onTravelEncounterHandled={handleTravelEncounterHandled}
              />''',
    "pass travel encounter to MapGrid",
)

path.write_text(text)


# MapGrid: forward encounter into LocalGmChat.
path = Path("src/components/map/MapGrid.jsx")
text = path.read_text()
text = replace_once(
    text,
    '''  locations,
  region,
}) {''',
    '''  locations,
  region,
  travelEncounter,
  onTravelEncounterHandled,
}) {''',
    "MapGrid encounter props",
)
text = replace_once(
    text,
    '''              locations={locations}
              region={region}
            />''',
    '''              locations={locations}
              region={region}
              travelEncounter={travelEncounter}
              onTravelEncounterHandled={onTravelEncounterHandled}
            />''',
    "LocalGmChat encounter props",
)
path.write_text(text)


# LocalGmChat: include global travel history and auto-describe pending encounter.
path = Path("src/components/map/LocalGmChat.jsx")
text = path.read_text()
text = replace_once(
    text,
    '''    selectedDestination: selectedCell
      ? {
          localX: selectedCell.x,
          localY: selectedCell.y,
          worldX: selectedWorldX,
          worldY: selectedWorldY,
          terrain: selectedCell.terrain,
          location: compactLocation(selectedStaticLocation) || selectedCell.poi || null,
        }
      : null,
  };''',
    '''    selectedDestination: selectedCell
      ? {
          localX: selectedCell.x,
          localY: selectedCell.y,
          worldX: selectedWorldX,
          worldY: selectedWorldY,
          terrain: selectedCell.terrain,
          location: compactLocation(selectedStaticLocation) || selectedCell.poi || null,
        }
      : null,
    travelHistory: {
      totalHours: Number(savedMapData?.worldTotalHours || 0),
      recentLog: Array.isArray(savedMapData?.travelLog)
        ? savedMapData.travelLog.slice(0, 30)
        : [],
    },
  };''',
    "global travel history in world context",
)

text = replace_once(
    text,
    '''export default function LocalGmChat({ mapData, playerPosition, selectedCell, onWorldEvents, characterData, weaponDatabase = [], locations = [], region = null }) {''',
    '''export default function LocalGmChat({ mapData, playerPosition, selectedCell, onWorldEvents, characterData, weaponDatabase = [], locations = [], region = null, travelEncounter = null, onTravelEncounterHandled }) {''',
    "LocalGmChat encounter props signature",
)

text = replace_once(
    text,
    '''  const world = useMemo(
    () => buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData, localizedLocations, region),
    [mapData, playerPosition, selectedCell, rawCharacter, localizedLocations, region]
  );''',
    '''  const world = useMemo(
    () => ({
      ...buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData, localizedLocations, region),
      travelEncounter: travelEncounter || rawCharacter?.mapData?.pendingTravelEncounter || null,
    }),
    [mapData, playerPosition, selectedCell, rawCharacter, localizedLocations, region, travelEncounter]
  );''',
    "world travel encounter context",
)

text = replace_once(
    text,
    '''  const introStartedRef = useRef(new Set());
''',
    '''  const introStartedRef = useRef(new Set());
  const encounterHandledRef = useRef(new Set());
''',
    "encounter handled ref",
)

intro_effect = '''  useEffect(() => {
    if (isArchiveView || messages.length > 0 || introStartedRef.current.has(currentSessionKey)) return;
    introStartedRef.current.add(currentSessionKey);
    startScene([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionKey, messages.length, isArchiveView]);'''
encounter_effect = '''  useEffect(() => {
    const encounter = world.travelEncounter;
    const token = String(encounter?.token || "").trim();
    if (!token || isArchiveView || encounterHandledRef.current.has(token)) return undefined;

    encounterHandledRef.current.add(token);
    let cancelled = false;

    const describeTravelEncounter = async () => {
      setError("");
      setIsSending(true);
      try {
        const result = await requestGm(
          `A RANDOM TRAVEL ENCOUNTER has just interrupted global-map travel. Treat it as the immediate situation in Local mode. Encounter data: ${JSON.stringify({
            id: encounter.id || null,
            type: encounter.type || null,
            text: encounter.text || null,
            terrain: encounter.terrain || null,
            hours: encounter.hours || null,
            destinationName: encounter.destinationName || null,
          })}. Use SESSION CONTEXT.world.travelHistory.recentLog to understand the route and what happened immediately before this encounter. Describe the encounter as an actionable Fallout 2d20 scene in the selected app language. Do not decide the player's actions. Do not skip straight to the outcome. End by asking what the player does, or request one meaningful skill check if the situation already demands it.`,
          messages,
          world
        );
        if (cancelled) return;
        setPendingCheck(result.check);
        persist(
          [...messages, { role: "gm", text: result.text, at: Date.now() }],
          result.events,
          result.check
        );
      } catch (requestError) {
        if (cancelled) return;
        const fallbackText = String(encounter.text || tx("travelEncounter") || tx("gmError"));
        persist(
          [...messages, { role: "gm", text: fallbackText, at: Date.now() }],
          [],
          pendingCheck
        );
        setError(requestError?.message || tx("gmError"));
      } finally {
        if (!cancelled) {
          setIsSending(false);
          if (typeof onTravelEncounterHandled === "function") {
            onTravelEncounterHandled(token);
          }
        }
      }
    };

    describeTravelEncounter();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.travelEncounter?.token, currentSessionKey, isArchiveView]);

  useEffect(() => {
    if (world.travelEncounter || isArchiveView || messages.length > 0 || introStartedRef.current.has(currentSessionKey)) return;
    introStartedRef.current.add(currentSessionKey);
    startScene([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionKey, messages.length, isArchiveView, world.travelEncounter]);'''
text = replace_once(text, intro_effect, encounter_effect, "automatic encounter scene effect")
path.write_text(text)


# Survival: travel drains vigor too; 8h camp consumes 2 hunger/thirst ticks while restoring vigor.
path = Path("src/hooks/useCharacterStorage.js")
text = path.read_text()
text = replace_once(
    text,
    '''        const thirst = Math.max(
          0,
          Math.min(5, Number(prev.thirst || 0)) - drainSteps
        );

        return {
          ...prev,
          satiety: String(satiety),
          thirst: String(thirst),
          survivalTravelHoursRemainder: String(Number(remainder.toFixed(2))),
        };''',
    '''        const thirst = Math.max(
          0,
          Math.min(5, Number(prev.thirst || 0)) - drainSteps
        );
        const vigor = Math.max(
          0,
          Math.min(5, Number(prev.vigor || 0)) - drainSteps
        );

        return {
          ...prev,
          satiety: String(satiety),
          thirst: String(thirst),
          vigor: String(vigor),
          survivalTravelHoursRemainder: String(Number(remainder.toFixed(2))),
        };''',
    "travel vigor drain",
)
text = replace_once(
    text,
    '''    const handleCampRest = () => {
      setForm((prev) => ({ ...prev, vigor: "5" }));
    };''',
    '''    const handleCampRest = () => {
      setForm((prev) => ({
        ...prev,
        vigor: "5",
        satiety: String(Math.max(0, Math.min(5, Number(prev.satiety || 0)) - 2)),
        thirst: String(Math.max(0, Math.min(5, Number(prev.thirst || 0)) - 2)),
      }));
    };''',
    "camp hunger thirst drain",
)
path.write_text(text)


# Auto GM: explicit grounding rule for global travel history and encounter handoff.
path = Path("api/auto-gm.js")
text = path.read_text()
text = replace_once(
    text,
    '''    "When the player asks where they are, what is nearby, where a destination is, or references a named map location, answer from mapGrounding first. Do not substitute lore geography from a different Fallout region.",
    "Treat the supplied character sheet as the source of truth for SPECIAL, skills, HP, Defense, statuses, injuries, perks, inventory, weapons, armor and resistances whenever those fields are present. Never silently change these values.",''',
    '''    "When the player asks where they are, what is nearby, where a destination is, or references a named map location, answer from mapGrounding first. Do not substitute lore geography from a different Fallout region.",
    "GLOBAL TRAVEL HISTORY RULE: SESSION CONTEXT.world.travelHistory.recentLog is the global-map travel log, newest first. Use it as established context for how the player arrived, sectors and locations passed, travel interruptions, and recent random encounters. Never contradict or silently discard those travel facts.",
    "TRAVEL ENCOUNTER HANDOFF RULE: If SESSION CONTEXT.world.travelEncounter is present, it is the immediate event that interrupted travel and opened Local mode. Continue directly from that event, describe the actionable situation, and let the player respond instead of generating an unrelated opening scene.",
    "Treat the supplied character sheet as the source of truth for SPECIAL, skills, HP, Defense, statuses, injuries, perks, inventory, weapons, armor and resistances whenever those fields are present. Never silently change these values.",''',
    "Auto GM global travel rules",
)
path.write_text(text)

print("Travel/GM/survival integration patch applied")
