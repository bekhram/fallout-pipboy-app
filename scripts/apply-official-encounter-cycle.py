from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Anchor not found: {label}")
    return text.replace(old, new, 1)


# 1) Exact bestiary preset combat for official encounters.
path = "src/utils/bestiaryCombatContext.js"
text = read(path)
pattern = re.compile(r"export function buildBestiaryCombatForEncounter\(encounter, character = \{\}\) \{.*?\n\}\n\nfunction readStore", re.S)
replacement = '''export function buildBestiaryCombatForEncounter(encounter, character = {}) {
  if (!encounter || (encounter.type !== "ambush" && encounter.autoCombat !== true)) return null;

  const playerLevel = safeLevel(character?.level);
  const presetIds = Array.isArray(encounter?.combatBestiaryIds)
    ? encounter.combatBestiaryIds.filter(Boolean)
    : [];

  let enemies = [];
  let selectionRule = "app_level_matched_ambush";

  if (presetIds.length) {
    const entries = presetIds
      .map((id) => BESTIARY_ENTRIES.find((entry) => entry?.id === id))
      .filter(Boolean);
    if (!entries.length) return null;
    enemies = entries.map((entry, index) => combatSnapshot(entry, index));
    selectionRule = encounter?.generationSource === "core_rulebook_official"
      ? "core_rulebook_encounter_preset"
      : "encounter_preset";
  } else {
    const picked = pickClosestByLevel(getAmbushPool(character), playerLevel);
    if (!picked) return null;
    enemies = [combatSnapshot(picked, 0)];
  }

  return {
    id: `combat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "active",
    source: "bestiary",
    selectionRule,
    encounterId: encounter.id || "ambush",
    encounterSource: encounter?.generationSource || "app_custom",
    encounterTable: encounter?.tableName || null,
    encounterRoll: encounter?.roll ?? null,
    weirdRoll: encounter?.weirdRoll ?? null,
    rulesSource: encounter?.rulesSource || null,
    rulesPage: encounter?.rulesPage || null,
    regionId: character?.mapData?.regionId || "commonwealth",
    playerLevel,
    round: 1,
    enemies,
    log: [],
    lastAction: null,
    createdAt: Date.now(),
  };
}

function readStore'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise RuntimeError("Could not patch buildBestiaryCombatForEncounter")
write(path, text)


# 2) Map encounter metadata, official region-aware rolls, and resumable routes.
path = "src/components/map/MapScreen.jsx"
text = read(path)

resume_copy = '''const RESUME_ROUTE_TEXT = {
  en: { title: "ROUTE INTERRUPTED", button: "CONTINUE ROUTE", activeCombat: "Resolve the active combat before continuing the route." },
  ru: { title: "МАРШРУТ ПРЕРВАН", button: "ПРОДОЛЖИТЬ МАРШРУТ", activeCombat: "Сначала завершите активный бой." },
  uk: { title: "МАРШРУТ ПЕРЕРВАНО", button: "ПРОДОВЖИТИ МАРШРУТ", activeCombat: "Спочатку завершіть активний бій." },
  pl: { title: "TRASA PRZERWANA", button: "KONTYNUUJ TRASĘ", activeCombat: "Najpierw zakończ aktywną walkę." },
};

'''
text = replace_once(text, "function getPoiIcon(poi) {", resume_copy + "function getPoiIcon(poi) {", "resume copy")
text = replace_once(
    text,
    '  const tx = (key, vars) => mapUiText(language, key, vars);\n',
    '  const tx = (key, vars) => mapUiText(language, key, vars);\n  const resumeCopy = RESUME_ROUTE_TEXT[String(language).split("-")[0]] || RESUME_ROUTE_TEXT.en;\n',
    "resume language",
)

text = replace_once(
    text,
    '    source: "global_travel",\n    ...details,',
    '''    source: "global_travel",
    generationSource: encounter.generationSource || "app_custom",
    tableName: encounter.tableName || null,
    tableRoll: encounter.roll ?? null,
    weirdRoll: encounter.weirdRoll ?? null,
    rulesSource: encounter.rulesSource || null,
    rulesPage: encounter.rulesPage || null,
    bestiaryRefs: Array.isArray(encounter.bestiaryRefs) ? encounter.bestiaryRefs : [],
    groupSize: encounter.groupSize ?? null,
    autoCombat: encounter.autoCombat === true,
    combatBestiaryIds: Array.isArray(encounter.combatBestiaryIds) ? encounter.combatBestiaryIds : [],
    ...details,''',
    "encounter metadata",
)

text = text.replace(
    "maybeRollTravelEncounter(step.terrain, t)",
    'maybeRollTravelEncounter(step.terrain, { regionId: activeRegion.id, language })',
)
text = text.replace(
    "maybeRollTravelEncounter(step.cell.terrain, t)",
    'maybeRollTravelEncounter(step.cell.terrain, { regionId: activeRegion.id, language })',
)

start = text.index("  function handleTravel() {")
end = text.index("\n  function handleWorldTravel() {", start)
segment = text[start:end]
segment = replace_once(
    segment,
    '''  function handleTravel() {
    if (!selectedCell || !selectedRoute?.cells?.length) return;''',
    '''  function handleTravel(targetOverride = null) {
    const targetCell = targetOverride && Number.isFinite(Number(targetOverride.x)) && Number.isFinite(Number(targetOverride.y))
      ? targetOverride
      : selectedCell;
    const travelRoute = targetCell ? findTravelRoute(mapData, playerPosition, targetCell) : null;
    if (!targetCell || !travelRoute?.cells?.length) return;''',
    "handleTravel header",
)
segment = segment.replace("selectedRoute", "travelRoute")
segment = segment.replace("selectedCell.x", "targetCell.x").replace("selectedCell.y", "targetCell.y")
segment = replace_once(
    segment,
    "        pendingTravelEncounter: encounterContext,\n        sectorCache:",
    '''        pendingTravelEncounter: encounterContext,
        interruptedRoute: stoppedEncounter
          ? {
              kind: "local",
              regionId: activeRegion.id,
              sectorKey,
              destination: { x: targetCell.x, y: targetCell.y },
              destinationName: targetCell.poi ? getPoiDisplayName(targetCell.poi, t) : `${targetCell.x},${targetCell.y}`,
              encounterToken: encounterContext?.token || null,
              interruptedAt: Date.now(),
            }
          : null,
        sectorCache:''',
    "local interrupted route",
)
text = text[:start] + segment + text[end:]

start = text.index("  function handleWorldTravel() {")
end = text.index("\n  function handleRegenerateMap() {", start)
segment = text[start:end]
segment = segment.replace("trackedAtCurrentPosition", "targetAtCurrentPosition")
segment = segment.replace("trackedLocation", "targetLocation")
segment = replace_once(
    segment,
    '''  function handleWorldTravel() {
    if (!targetLocation || targetAtCurrentPosition) return;''',
    '''  function handleWorldTravel(targetOverride = null) {
    const targetLocation = targetOverride && Number.isFinite(Number(targetOverride.worldX)) && Number.isFinite(Number(targetOverride.worldY))
      ? targetOverride
      : trackedLocation;
    const targetAtCurrentPosition = Boolean(
      targetLocation && targetLocation.worldX === playerWorldX && targetLocation.worldY === playerWorldY
    );
    if (!targetLocation || targetAtCurrentPosition) return;''',
    "handleWorldTravel header",
)
segment = replace_once(
    segment,
    "        pendingTravelEncounter: encounterContext,\n      };",
    '''        pendingTravelEncounter: encounterContext,
        interruptedRoute: stoppedEncounter
          ? {
              kind: "world",
              regionId: activeRegion.id,
              destinationId: targetLocation.id || null,
              destinationName: targetName,
              worldX: targetLocation.worldX,
              worldY: targetLocation.worldY,
              encounterToken: encounterContext?.token || null,
              interruptedAt: Date.now(),
            }
          : null,
      };''',
    "world interrupted route",
)
text = text[:start] + segment + text[end:]

resume_functions = '''  function hasActiveBestiaryCombat() {
    if (typeof window === "undefined") return false;
    try {
      const store = JSON.parse(window.localStorage.getItem("fallout_pipboy_bestiary_combat_v1") || "null");
      const latestKey = store?.latestSessionKey;
      return Boolean(latestKey && store?.bySession?.[latestKey]?.status === "active");
    } catch {
      return false;
    }
  }

  function resumeInterruptedRoute() {
    const interrupted = safeMapState.interruptedRoute;
    if (!interrupted) return;
    if (hasActiveBestiaryCombat()) {
      setMapMode("local");
      return;
    }
    if (interrupted.regionId && interrupted.regionId !== activeRegion.id) {
      onMapChange({ interruptedRoute: null });
      return;
    }

    if (interrupted.kind === "world") {
      const target = regionLocations.find((location) => location.id === interrupted.destinationId) || (
        Number.isFinite(Number(interrupted.worldX)) && Number.isFinite(Number(interrupted.worldY))
          ? { id: interrupted.destinationId, name: interrupted.destinationName, worldX: Number(interrupted.worldX), worldY: Number(interrupted.worldY) }
          : null
      );
      if (!target) {
        onMapChange({ interruptedRoute: null });
        return;
      }
      if (target.id) onMapChange({ trackedLocationId: target.id });
      handleWorldTravel(target);
      return;
    }

    if (interrupted.kind === "local") {
      if (interrupted.sectorKey && interrupted.sectorKey !== sectorKey) {
        onMapChange({ interruptedRoute: null });
        return;
      }
      const destination = interrupted.destination || {};
      const targetCell = getCell(mapData, Number(destination.x), Number(destination.y));
      if (!targetCell) {
        onMapChange({ interruptedRoute: null });
        return;
      }
      setSelectedCell(targetCell);
      handleTravel(targetCell);
    }
  }

'''
text = replace_once(text, "  function handleTravelEncounterHandled(token) {", resume_functions + "  function handleTravelEncounterHandled(token) {", "resume functions")

resume_ui = '''            {safeMapState.interruptedRoute && !safeMapState.pendingTravelEncounter ? (
              <div className="pip-map-world-route is-inter-sector">
                <div className="pip-map-world-route__topline">
                  <span>{resumeCopy.title}</span>
                  <span>{safeMapState.interruptedRoute.kind === "world" ? tx("world") : tx("currentSector")}</span>
                </div>
                <strong>{safeMapState.interruptedRoute.destinationName || resumeCopy.title}</strong>
                <button type="button" className="pip-map-world-route__travel" onClick={resumeInterruptedRoute}>
                  {resumeCopy.button}
                </button>
              </div>
            ) : null}

'''
text = replace_once(text, "            {trackedLocation ? (\n", resume_ui + "            {trackedLocation ? (\n", "resume UI")
write(path, text)


# 3) Combat rewards: grant once and show exact XP + bestiary loot instructions.
path = "src/components/combat/CombatTurnSequence.jsx"
text = read(path)
text = replace_once(
    text,
    'import "./combatTurnSequence.css";\n',
    'import { grantResolvedCombatRewards } from "../../utils/combatRewards.js";\nimport "./combatTurnSequence.css";\n',
    "reward import",
)
reward_text = '''
const REWARD_TEXT = {
  en: { title: "ENCOUNTER REWARDS", xp: "XP AWARDED", loot: "LOOT / SALVAGE RULES" },
  ru: { title: "НАГРАДЫ ЗА ВСТРЕЧУ", xp: "ПОЛУЧЕНО XP", loot: "ДОБЫЧА / ПРАВИЛА СБОРА" },
  uk: { title: "НАГОРОДИ ЗА ЗУСТРІЧ", xp: "ОТРИМАНО XP", loot: "ЗДОБИЧ / ПРАВИЛА ЗБОРУ" },
  pl: { title: "NAGRODY ZA SPOTKANIE", xp: "PRZYZNANE XP", loot: "ŁUP / ZASADY POZYSKANIA" },
};
'''
text = replace_once(text, "function lang(value) {", reward_text + "\nfunction lang(value) {", "reward text")
text = replace_once(
    text,
    "  const copy = TEXT[language];\n  const [state, setState] = useState(() => readLatestCombat());",
    "  const copy = TEXT[language];\n  const rewardCopy = REWARD_TEXT[language] || REWARD_TEXT.en;\n  const [state, setState] = useState(() => readLatestCombat());",
    "reward copy",
)
reward_effect = '''
  useEffect(() => {
    if (!state?.sessionKey || state.status !== "resolved" || state.rewards?.granted) return;
    const rewards = grantResolvedCombatRewards(state.sessionKey);
    if (rewards) setState(readLatestCombat());
  }, [state?.sessionKey, state?.status, state?.rewards?.granted]);
'''
text = replace_once(text, "  const active = useMemo(() => getActiveCombatActor(state), [state]);", reward_effect + "\n  const active = useMemo(() => getActiveCombatActor(state), [state]);", "reward effect")
reward_ui = '''      {state.status === "resolved" && state.rewards?.granted ? (
        <section className="pip-panel combat-turn-sequence__actor-panel">
          <strong>[ {rewardCopy.title} ]</strong>
          <div className="combat-turn-sequence__result">{rewardCopy.xp}: +{state.rewards.xp || 0}</div>
          {Array.isArray(state.rewards.loot) && state.rewards.loot.length ? (
            <div className="combat-turn-sequence__result">
              <strong>{rewardCopy.loot}</strong>
              {state.rewards.loot.map((entry) => (
                <div key={`${entry.instanceId || entry.bestiaryId}:${entry.name}`}>{entry.name}: {entry.instruction}</div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
'''
text = replace_once(text, "      <TurnHeader character={character} state={state} setState={setState} copy={copy} />\n", "      <TurnHeader character={character} state={state} setState={setState} copy={copy} />\n" + reward_ui, "reward UI")
write(path, text)


# 4) Apply XP to the live character once per combat session.
path = "src/hooks/useCharacterStorage.js"
text = read(path)
text = replace_once(
    text,
    'import { getDerivedStats } from "../utils/characterMath.js";\n',
    'import { getDerivedStats } from "../utils/characterMath.js";\nimport { PIPBOY_COMBAT_XP_REWARD_EVENT } from "../utils/combatRewards.js";\n',
    "xp event import",
)
xp_handler = '''
    const handleCombatXpReward = (event) => {
      const xp = Math.max(0, Number(event?.detail?.xp || 0));
      const sessionKey = String(event?.detail?.sessionKey || "").trim();
      if (xp <= 0 || !sessionKey) return;

      setForm((prev) => {
        const applied = Array.isArray(prev.appliedCombatRewardSessions)
          ? prev.appliedCombatRewardSessions
          : [];
        if (applied.includes(sessionKey)) return prev;
        return {
          ...prev,
          xp: String(Math.max(0, Number(prev.xp || 0)) + xp),
          appliedCombatRewardSessions: [...applied, sessionKey].slice(-50),
        };
      });
    };
'''
text = replace_once(text, "    const handleCampRest = () => {", xp_handler + "\n    const handleCampRest = () => {", "xp handler")
text = replace_once(
    text,
    "    window.addEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);\n",
    "    window.addEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);\n    window.addEventListener(PIPBOY_COMBAT_XP_REWARD_EVENT, handleCombatXpReward);\n",
    "xp add listener",
)
text = replace_once(
    text,
    "      window.removeEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);\n",
    "      window.removeEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);\n      window.removeEventListener(PIPBOY_COMBAT_XP_REWARD_EVENT, handleCombatXpReward);\n",
    "xp remove listener",
)
write(path, text)

print("Official encounter lifecycle patch applied")
