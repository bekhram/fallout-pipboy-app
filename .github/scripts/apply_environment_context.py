from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing anchor: {label}")
    return text.replace(old, new, 1)

# ---- MapScreen: track hazardous exposure during travel/camp ----
path = Path("src/components/map/MapScreen.jsx")
text = path.read_text()

old = '''import {
  PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT,
  resolveTravelEncounter,
} from "../../utils/travelEncounterResolution.js";
'''
new = '''import {
  PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT,
  resolveTravelEncounter,
} from "../../utils/travelEncounterResolution.js";
import {
  formatEnvironmentalHazardLog,
  processEnvironmentalExposure,
} from "../../utils/environmentSystem.js";
'''
text = replace_once(text, old, new, "MapScreen environment import")

old = '''function mergeTravelLog(base, entries) {
  const cleanEntries = (entries || [])
    .filter((entry) => entry !== null && entry !== undefined && String(entry).trim())
    .map((entry) => String(entry));
  return [...cleanEntries, ...(Array.isArray(base.travelLog) ? base.travelLog : [])].slice(0, MAX_LOG_ENTRIES);
}
'''
new = '''function mergeTravelLog(base, entries) {
  const cleanEntries = (entries || [])
    .filter((entry) => entry !== null && entry !== undefined && String(entry).trim())
    .map((entry) => String(entry));
  return [...cleanEntries, ...(Array.isArray(base.travelLog) ? base.travelLog : [])].slice(0, MAX_LOG_ENTRIES);
}

function addHazardExposureHours(bucket, cell, hours) {
  const safeHours = Math.max(0, Number(hours) || 0);
  if (!cell || safeHours <= 0) return;
  for (const hazardId of getCellHazards(cell)) {
    bucket[hazardId] = (Number(bucket[hazardId]) || 0) + safeHours;
  }
}

function dispatchEnvironmentEffects(effects) {
  if (typeof window === "undefined") return;
  for (const effect of effects || []) {
    if (!effect?.resolution) continue;
    window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
      detail: { token: effect.token, resolution: effect.resolution },
    }));
  }
}
'''
text = replace_once(text, old, new, "MapScreen exposure helpers")

old = '''    let stoppedEncounter = null;
    let reachedDestination = true;
    const detailLog = [];

    for (const step of selectedRoute.cells) {
      const stepCost = getCellMoveCost(step) ?? 1;
      totalCost += stepCost;
'''
new = '''    let stoppedEncounter = null;
    let reachedDestination = true;
    const detailLog = [];
    const exposureHoursByHazard = {};

    for (const step of selectedRoute.cells) {
      const stepCost = getCellMoveCost(step) ?? 1;
      totalCost += stepCost;
      addHazardExposureHours(exposureHoursByHazard, step, stepCost);
'''
text = replace_once(text, old, new, "local travel exposure collection")

old = '''    const summary = stoppedEncounter && !reachedDestination
      ? tx("routeInterrupted")
      : tx("routeComplete", { steps: selectedRoute.cells.length, hours: totalCost });
    const routeLog = [summary, ...detailLog.reverse()];
    const encounterResolution = stoppedEncounter
'''
new = '''    const summary = stoppedEncounter && !reachedDestination
      ? tx("routeInterrupted")
      : tx("routeComplete", { steps: selectedRoute.cells.length, hours: totalCost });
    const environmentExposure = processEnvironmentalExposure({
      previousRemainders: safeMapState.hazardExposureRemainders || {},
      exposureHoursByHazard,
      character,
    });
    const environmentLog = environmentExposure.effects
      .map((effect) => formatEnvironmentalHazardLog(effect, language))
      .filter(Boolean);
    const routeLog = [summary, ...environmentLog, ...detailLog.reverse()];
    const encounterResolution = stoppedEncounter
'''
text = replace_once(text, old, new, "local travel exposure resolution")

old = '''        discoveredKeys: nextDiscoveredKeys,
        travelLog: mergeTravelLog(base, routeLog),
        pendingTravelEncounter: encounterContext,
'''
new = '''        discoveredKeys: nextDiscoveredKeys,
        travelLog: mergeTravelLog(base, routeLog),
        hazardExposureRemainders: environmentExposure.remainders,
        pendingTravelEncounter: encounterContext,
'''
text = replace_once(text, old, new, "local travel save exposure")

old = '''    if (typeof window !== "undefined" && encounterContext?.resolution) {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: encounterContext.token, resolution: encounterContext.resolution },
      }));
    }
    if (stoppedEncounter) setMapMode("local");
'''
new = '''    if (typeof window !== "undefined" && encounterContext?.resolution) {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: encounterContext.token, resolution: encounterContext.resolution },
      }));
    }
    dispatchEnvironmentEffects(environmentExposure.effects);
    if (stoppedEncounter) setMapMode("local");
'''
text = replace_once(text, old, new, "local travel dispatch exposure")

old = '''    let stoppedEncounter = null;
    let previousSectorKey = sectorKey;
    const detailLog = [tx("worldRouteStart", { name: targetName, blocks: route.steps.length })];

    for (const step of route.steps) {
      const stepCost = getCellMoveCost(step.cell) ?? 1;
      totalCost += stepCost;
      finalStep = step;
'''
new = '''    let stoppedEncounter = null;
    let previousSectorKey = sectorKey;
    const detailLog = [tx("worldRouteStart", { name: targetName, blocks: route.steps.length })];
    const exposureHoursByHazard = {};

    for (const step of route.steps) {
      const stepCost = getCellMoveCost(step.cell) ?? 1;
      totalCost += stepCost;
      addHazardExposureHours(exposureHoursByHazard, step.cell, stepCost);
      finalStep = step;
'''
text = replace_once(text, old, new, "world travel exposure collection")

old = '''    const summary = reachedTarget
      ? tx("arrived", { name: targetName, hours: totalCost })
      : stoppedEncounter
        ? tx("worldRouteInterrupted")
        : tx("worldRouteStopped");
    const routeLog = [summary, ...detailLog.reverse()];
    const encounterResolution = stoppedEncounter
'''
new = '''    const summary = reachedTarget
      ? tx("arrived", { name: targetName, hours: totalCost })
      : stoppedEncounter
        ? tx("worldRouteInterrupted")
        : tx("worldRouteStopped");
    const environmentExposure = processEnvironmentalExposure({
      previousRemainders: safeMapState.hazardExposureRemainders || {},
      exposureHoursByHazard,
      character,
    });
    const environmentLog = environmentExposure.effects
      .map((effect) => formatEnvironmentalHazardLog(effect, language))
      .filter(Boolean);
    const routeLog = [summary, ...environmentLog, ...detailLog.reverse()];
    const encounterResolution = stoppedEncounter
'''
text = replace_once(text, old, new, "world travel exposure resolution")

old = '''        sectorCache: { ...(base.sectorCache || {}), ...route.cache },
        travelLog: mergeTravelLog(base, routeLog),
        pendingTravelEncounter: encounterContext,
'''
new = '''        sectorCache: { ...(base.sectorCache || {}), ...route.cache },
        travelLog: mergeTravelLog(base, routeLog),
        hazardExposureRemainders: environmentExposure.remainders,
        pendingTravelEncounter: encounterContext,
'''
text = replace_once(text, old, new, "world travel save exposure")

# second identical encounter dispatch belongs to world travel
anchor = '''    if (typeof window !== "undefined" && encounterContext?.resolution) {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: encounterContext.token, resolution: encounterContext.resolution },
      }));
    }
    if (stoppedEncounter) setMapMode("local");
    setSelectedCell(null);
'''
replacement = '''    if (typeof window !== "undefined" && encounterContext?.resolution) {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: encounterContext.token, resolution: encounterContext.resolution },
      }));
    }
    dispatchEnvironmentEffects(environmentExposure.effects);
    if (stoppedEncounter) setMapMode("local");
    setSelectedCell(null);
'''
text = replace_once(text, anchor, replacement, "world travel dispatch exposure")

old = '''  function handleRegenerateMap() {
    const nextMap = createRandomMap(mapData.rows, mapData.cols, worldOffset);
    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        worldTotalHours: (base.worldTotalHours || 0) + 8,
        discoveredKeys: revealAround(nextMap, playerPosition, 1, []),
        travelLog: mergeTravelLog(base, [t("mapPanel.campRest")]),
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: nextMap },
      };
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PIPBOY_CAMP_REST_EVENT));
    }
    setSelectedCell(null);
  }
'''
new = '''  function handleRegenerateMap() {
    const nextMap = createRandomMap(mapData.rows, mapData.cols, worldOffset);
    const exposureHoursByHazard = {};
    addHazardExposureHours(exposureHoursByHazard, currentCell, 8);
    const environmentExposure = processEnvironmentalExposure({
      previousRemainders: safeMapState.hazardExposureRemainders || {},
      exposureHoursByHazard,
      character,
    });
    const environmentLog = environmentExposure.effects
      .map((effect) => formatEnvironmentalHazardLog(effect, language))
      .filter(Boolean);

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        worldTotalHours: (base.worldTotalHours || 0) + 8,
        discoveredKeys: revealAround(nextMap, playerPosition, 1, []),
        travelLog: mergeTravelLog(base, [t("mapPanel.campRest"), ...environmentLog]),
        hazardExposureRemainders: environmentExposure.remainders,
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: nextMap },
      };
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PIPBOY_CAMP_REST_EVENT));
    }
    dispatchEnvironmentEffects(environmentExposure.effects);
    setSelectedCell(null);
  }
'''
text = replace_once(text, old, new, "camp environmental exposure")

path.write_text(text)

# ---- LocalGmChat: include authoritative environment context ----
path = Path("src/components/map/LocalGmChat.jsx")
text = path.read_text()

old = '''import { rollFalloutD20 } from "../../utils/dice.js";
import { playSound } from "../../utils/soundManager.js";
'''
new = '''import { rollFalloutD20 } from "../../utils/dice.js";
import { playSound } from "../../utils/soundManager.js";
import { getCellHazards } from "../../utils/mapMath.js";
import { getEnvironmentSnapshot } from "../../utils/environmentSystem.js";
'''
text = replace_once(text, old, new, "LocalGmChat environment imports")

old = '''function buildWorldContext(mapData, playerPosition, selectedCell, savedMapData, locations = [], region = null) {
'''
new = '''function buildWorldContext(mapData, playerPosition, selectedCell, savedMapData, locations = [], region = null, character = null) {
'''
text = replace_once(text, old, new, "world context signature")

old = '''  const selectedStaticLocation = selectedCell
    ? locations.find(
        (location) => location.worldX === selectedWorldX && location.worldY === selectedWorldY
      )
    : null;

  return {
'''
new = '''  const selectedStaticLocation = selectedCell
    ? locations.find(
        (location) => location.worldX === selectedWorldX && location.worldY === selectedWorldY
      )
    : null;
  const currentHazards = getCellHazards(currentCell);
  const environment = getEnvironmentSnapshot({
    totalHours: Number(savedMapData?.worldTotalHours || 0),
    regionId: region?.id || "commonwealth",
    hazards: currentHazards,
    character,
  });

  return {
'''
text = replace_once(text, old, new, "world environment snapshot")

old = '''    currentTerrain: currentCell?.terrain || null,
    currentLocation: compactLocation(staticLocation) || currentCell?.poi || null,
'''
new = '''    currentTerrain: currentCell?.terrain || null,
    currentHazards,
    environment,
    currentLocation: compactLocation(staticLocation) || currentCell?.poi || null,
'''
text = replace_once(text, old, new, "world context environment fields")

old = '''      ...buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData, localizedLocations, region),
      travelEncounter: travelEncounter || rawCharacter?.mapData?.pendingTravelEncounter || null,
'''
new = '''      ...buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData, localizedLocations, region, rawCharacter),
      travelEncounter: travelEncounter || rawCharacter?.mapData?.pendingTravelEncounter || null,
'''
text = replace_once(text, old, new, "world context call")

path.write_text(text)

# ---- Auto GM: make environmental modifiers authoritative ----
path = Path("api/auto-gm.js")
text = path.read_text()
old = '''    "TRAVEL ENCOUNTER HANDOFF RULE: If SESSION CONTEXT.world.travelEncounter is present, it is the immediate event that interrupted travel and opened Local mode. Continue directly from that event, describe the actionable situation, and let the player respond instead of generating an unrelated opening scene.",
'''
new = '''    "TRAVEL ENCOUNTER HANDOFF RULE: If SESSION CONTEXT.world.travelEncounter is present, it is the immediate event that interrupted travel and opened Local mode. Continue directly from that event, describe the actionable situation, and let the player respond instead of generating an unrelated opening scene.",
    "ENVIRONMENT CONTEXT RULE: SESSION CONTEXT.world.environment is the authoritative current time-of-day, weather, visibility, wind, detected light/night-vision equipment, active zone hazards and environmental check modifiers. Use it when describing the scene and when setting a test Difficulty.",
    "ENVIRONMENT DIFFICULTY RULE: For a requested test, inspect world.environment.checkModifiers and apply every modifier whose appliesTo and condition genuinely match the attempted action. Clamp final Difficulty to 0-10. Briefly tell the player when darkness, fog, rain, wind, dust or heat haze changed the Difficulty instead of silently changing it.",
    "DARKNESS EQUIPMENT RULE: A detected light source is only available, not automatically switched on. If the player actively uses it, it may cancel normal darkness vision/aiming penalties where it illuminates the task, but it can also remove darkness-based concealment. Detected night vision cancels normal darkness vision/aiming penalties when usable without automatically removing concealment from darkness.",
    "ENVIRONMENT HAZARD RULE: Radiation, toxic, danger and anomaly zones are mechanically resolved by the app as periodic exposure ticks when world time advances. Respect exact hazard damage already present in travelHistory/recent logs and the character sheet; never apply the same automatic tick twice. While the player remains in a hazardous zone, describe the ongoing risk and use world.environment.hazards as established context.",
'''
text = replace_once(text, old, new, "Auto GM environment rules")
path.write_text(text)

print("Environment integration patch applied")
