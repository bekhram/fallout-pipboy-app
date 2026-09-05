from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)

# MapScreen: persist a resolved encounter, force Local mode, and dispatch character effects.
path = Path("src/components/map/MapScreen.jsx")
text = path.read_text()
text = replace_once(
    text,
    'import { maybeRollTravelEncounter } from "../../utils/encounterEngine.js";\n',
    'import { maybeRollTravelEncounter } from "../../utils/encounterEngine.js";\nimport {\n  PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT,\n  resolveTravelEncounter,\n} from "../../utils/travelEncounterResolution.js";\n',
    "MapScreen encounter resolution import",
)
text = replace_once(
    text,
    '''  const safeMapState = useMemo(
    () => ({ ...buildDefaultMapState(), ...(mapState || {}) }),
    [mapState]
  );
  const activeRegion = getMapRegion(safeMapState.regionId);''',
    '''  const safeMapState = useMemo(
    () => ({ ...buildDefaultMapState(), ...(mapState || {}) }),
    [mapState]
  );

  useEffect(() => {
    if (safeMapState.pendingTravelEncounter?.token) {
      setMapMode("local");
    }
  }, [safeMapState.pendingTravelEncounter?.token]);

  const activeRegion = getMapRegion(safeMapState.regionId);''',
    "force Local for pending encounter",
)
text = replace_once(
    text,
    '''    const routeLog = [summary, ...detailLog.reverse()];
    const encounterContext = stoppedEncounter
      ? createTravelEncounterContext(''',
    '''    const routeLog = [summary, ...detailLog.reverse()];
    const encounterResolution = stoppedEncounter
      ? resolveTravelEncounter(stoppedEncounter, character)
      : null;
    const encounterContext = stoppedEncounter
      ? createTravelEncounterContext(''',
    "local travel resolution",
)
text = replace_once(
    text,
    '''            worldY: worldOffset.y * mapData.rows + finalPosition.y,
          }
        )''',
    '''            worldY: worldOffset.y * mapData.rows + finalPosition.y,
            resolution: encounterResolution,
          }
        )''',
    "local travel context resolution",
)
text = replace_once(
    text,
    '''    if (typeof window !== "undefined" && totalCost > 0) {
      window.dispatchEvent(new CustomEvent(PIPBOY_SURVIVAL_TRAVEL_EVENT, {
        detail: { hours: totalCost },
      }));
    }
    if (stoppedEncounter) setMapMode("local");''',
    '''    if (typeof window !== "undefined" && totalCost > 0) {
      window.dispatchEvent(new CustomEvent(PIPBOY_SURVIVAL_TRAVEL_EVENT, {
        detail: { hours: totalCost },
      }));
    }
    if (typeof window !== "undefined" && encounterContext?.resolution) {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: encounterContext.token, resolution: encounterContext.resolution },
      }));
    }
    if (stoppedEncounter) setMapMode("local");''',
    "local travel dispatch resolution",
)
text = replace_once(
    text,
    '''    const routeLog = [summary, ...detailLog.reverse()];
    const encounterContext = stoppedEncounter
      ? createTravelEncounterContext(''',
    '''    const routeLog = [summary, ...detailLog.reverse()];
    const encounterResolution = stoppedEncounter
      ? resolveTravelEncounter(stoppedEncounter, character)
      : null;
    const encounterContext = stoppedEncounter
      ? createTravelEncounterContext(''',
    "world travel resolution",
)
text = replace_once(
    text,
    '''            destinationId: trackedLocation.id,
            destinationName: targetName,
          }
        )''',
    '''            destinationId: trackedLocation.id,
            destinationName: targetName,
            resolution: encounterResolution,
          }
        )''',
    "world travel context resolution",
)
text = replace_once(
    text,
    '''    if (typeof window !== "undefined" && totalCost > 0) {
      window.dispatchEvent(new CustomEvent(PIPBOY_SURVIVAL_TRAVEL_EVENT, {
        detail: { hours: totalCost },
      }));
    }
    if (stoppedEncounter) setMapMode("local");
    setSelectedCell(null);''',
    '''    if (typeof window !== "undefined" && totalCost > 0) {
      window.dispatchEvent(new CustomEvent(PIPBOY_SURVIVAL_TRAVEL_EVENT, {
        detail: { hours: totalCost },
      }));
    }
    if (typeof window !== "undefined" && encounterContext?.resolution) {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: encounterContext.token, resolution: encounterContext.resolution },
      }));
    }
    if (stoppedEncounter) setMapMode("local");
    setSelectedCell(null);''',
    "world travel dispatch resolution",
)
path.write_text(text)

# Character storage: apply the exact resolved character consequences once when generated.
path = Path("src/hooks/useCharacterStorage.js")
text = path.read_text()
text = replace_once(
    text,
    'const PIPBOY_CAMP_REST_EVENT = "pipboy:survival-camp-rest";\n',
    'const PIPBOY_CAMP_REST_EVENT = "pipboy:survival-camp-rest";\nconst PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT = "pipboy:travel-encounter-effect";\n',
    "encounter effect event constant",
)
text = replace_once(
    text,
    '''    const handleCampRest = () => {
      setForm((prev) => ({
        ...prev,
        vigor: "5",
        satiety: String(Math.max(0, Math.min(5, Number(prev.satiety || 0)) - 2)),
        thirst: String(Math.max(0, Math.min(5, Number(prev.thirst || 0)) - 2)),
      }));
    };''',
    '''    const handleTravelEncounterEffect = (event) => {
      const resolution = event?.detail?.resolution;
      if (!resolution || typeof resolution !== "object") return;

      setForm((prev) => {
        if (resolution.kind === "damage") {
          const finalDamage = Math.max(0, Number(resolution.finalDamage || 0));
          if (finalDamage <= 0) return prev;

          if (resolution.damageType === "radiation") {
            const derived = getDerivedStats(prev);
            const nextRadiation = Math.min(
              Number(derived.maxHp || 0),
              Math.max(0, Number(prev.radiationHp || 0)) + finalDamage
            );
            const nextEffectiveMax = Math.max(0, Number(derived.maxHp || 0) - nextRadiation);
            return {
              ...prev,
              radiationHp: String(nextRadiation),
              currentHp: String(Math.min(Math.max(0, Number(prev.currentHp || 0)), nextEffectiveMax)),
            };
          }

          return {
            ...prev,
            currentHp: String(Math.max(0, Number(prev.currentHp || 0) - finalDamage)),
          };
        }

        if (resolution.kind === "survival") {
          const next = { ...prev };
          if (resolution.satietySet !== undefined) {
            next.satiety = String(Math.max(0, Math.min(5, Number(resolution.satietySet))));
          }
          if (resolution.thirstSet !== undefined) {
            next.thirst = String(Math.max(0, Math.min(5, Number(resolution.thirstSet))));
          }
          if (resolution.vigorDelta) {
            next.vigor = String(Math.max(0, Math.min(5, Number(prev.vigor || 0) + Number(resolution.vigorDelta))));
          }
          return next;
        }

        return prev;
      });
    };

    const handleCampRest = () => {
      setForm((prev) => ({
        ...prev,
        vigor: "5",
        satiety: String(Math.max(0, Math.min(5, Number(prev.satiety || 0)) - 2)),
        thirst: String(Math.max(0, Math.min(5, Number(prev.thirst || 0)) - 2)),
      }));
    };''',
    "travel encounter effect handler",
)
text = replace_once(
    text,
    '''    window.addEventListener(PIPBOY_SURVIVAL_TRAVEL_EVENT, handleSurvivalTravel);
    window.addEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);''',
    '''    window.addEventListener(PIPBOY_SURVIVAL_TRAVEL_EVENT, handleSurvivalTravel);
    window.addEventListener(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, handleTravelEncounterEffect);
    window.addEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);''',
    "encounter effect listener",
)
text = replace_once(
    text,
    '''      window.removeEventListener(PIPBOY_SURVIVAL_TRAVEL_EVENT, handleSurvivalTravel);
      window.removeEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);''',
    '''      window.removeEventListener(PIPBOY_SURVIVAL_TRAVEL_EVENT, handleSurvivalTravel);
      window.removeEventListener(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, handleTravelEncounterEffect);
      window.removeEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);''',
    "encounter effect listener cleanup",
)
path.write_text(text)

# Local GM: persist a mechanical encounter receipt before narrative and make the numbers authoritative.
path = Path("src/components/map/LocalGmChat.jsx")
text = path.read_text()
text = replace_once(
    text,
    'const LORE_REFERENCE_CACHE = new Map();\n',
    '''const LORE_REFERENCE_CACHE = new Map();

const ENCOUNTER_RESULT_TEXT = {
  en: { event: "TRAVEL ENCOUNTER", roll: "Damage roll", raw: "raw", location: "location", dr: "DR", final: "final", hp: "HP", rad: "RAD", critical: "critical injury threshold reached" },
  ru: { event: "СЛУЧАЙНОЕ СОБЫТИЕ", roll: "Бросок урона", raw: "до DR", location: "зона", dr: "DR", final: "итого", hp: "HP", rad: "РАД", critical: "достигнут порог критической травмы" },
  uk: { event: "ВИПАДКОВА ЗУСТРІЧ", roll: "Кидок шкоди", raw: "до DR", location: "зона", dr: "DR", final: "підсумок", hp: "HP", rad: "РАД", critical: "досягнуто поріг критичної травми" },
  pl: { event: "LOSOWE ZDARZENIE", roll: "Rzut obrażeń", raw: "przed DR", location: "lokacja", dr: "DR", final: "wynik", hp: "HP", rad: "RAD", critical: "osiągnięto próg obrażeń krytycznych" },
};

function formatTravelEncounterResolution(encounter, language) {
  const resolution = encounter?.resolution;
  if (!resolution) return "";
  const text = ENCOUNTER_RESULT_TEXT[language] || ENCOUNTER_RESULT_TEXT.en;
  const title = `${text.event}: ${encounter.text || encounter.id || "-"}`;

  if (resolution.kind === "damage") {
    const dice = Array.isArray(resolution.dice) ? resolution.dice.join(", ") : "-";
    const location = resolution.hitLocationLabel || resolution.hitLocation || "-";
    const resource = resolution.damageType === "radiation" ? text.rad : text.hp;
    return `${title}\n${text.roll}: ${resolution.diceCount} CD [${dice}] = ${resolution.rawDamage} ${resolution.damageType} (${text.raw}); ${text.location}: ${location}; ${text.dr}: ${resolution.resistance}; ${text.final}: ${resolution.finalDamage} ${resource}${resolution.criticalInjury ? `; ${text.critical}` : ""}.`;
  }

  return `${title}\n${resolution.summary || ""}`.trim();
}
''',
    "encounter result formatter",
)
text = replace_once(
    text,
    '''    const describeTravelEncounter = async () => {
      setError("");
      setIsSending(true);
      try {
        const result = await requestGm(''',
    '''    const describeTravelEncounter = async () => {
      const mechanicalText = formatTravelEncounterResolution(encounter, language);
      const alreadyLogged = messages.some((message) => message?.travelEncounterToken === token);
      const baseMessages = mechanicalText && !alreadyLogged
        ? [...messages, { role: "gm", text: mechanicalText, at: Date.now(), travelEncounterToken: token }]
        : messages;

      if (baseMessages !== messages) {
        persist(baseMessages, [], pendingCheck);
      }

      setError("");
      setIsSending(true);
      try {
        const result = await requestGm(''',
    "persist mechanical encounter receipt",
)
text = replace_once(
    text,
    '''            destinationName: encounter.destinationName || null,
          })}. Use SESSION CONTEXT.world.travelHistory.recentLog''',
    '''            destinationName: encounter.destinationName || null,
            resolution: encounter.resolution || null,
          })}. The encounter resolution is authoritative: do not reroll it, do not change its damage dice, hit location, DR, final damage, or already-applied character consequence. Use SESSION CONTEXT.world.travelHistory.recentLog''',
    "authoritative encounter resolution prompt",
)
text = replace_once(
    text,
    '''          messages,
          world
        );
        if (cancelled) return;
        setPendingCheck(result.check);
        persist(
          [...messages, { role: "gm", text: result.text, at: Date.now() }],''',
    '''          baseMessages,
          world
        );
        if (cancelled) return;
        setPendingCheck(result.check);
        persist(
          [...baseMessages, { role: "gm", text: result.text, at: Date.now() }],''',
    "encounter narrative history",
)
text = replace_once(
    text,
    '''        persist(
          [...messages, { role: "gm", text: fallbackText, at: Date.now() }],
          [],''',
    '''        persist(
          [...baseMessages, { role: "gm", text: fallbackText, at: Date.now() }],
          [],''',
    "encounter fallback history",
)
path.write_text(text)

# Auto GM: enforce the pre-rolled, pre-applied encounter resolution.
path = Path("api/auto-gm.js")
text = path.read_text()
text = replace_once(
    text,
    '''    "TRAVEL ENCOUNTER HANDOFF RULE: If SESSION CONTEXT.world.travelEncounter is present, it is the immediate event that interrupted travel and opened Local mode. Continue directly from that event, describe the actionable situation, and let the player respond instead of generating an unrelated opening scene.",''',
    '''    "TRAVEL ENCOUNTER HANDOFF RULE: If SESSION CONTEXT.world.travelEncounter is present, it is the immediate event that interrupted travel and opened Local mode. Continue directly from that event, describe the actionable situation, and let the player respond instead of generating an unrelated opening scene.",
    "TRAVEL ENCOUNTER RESOLUTION RULE: If world.travelEncounter.resolution is present, its Combat Dice faces, raw damage, hit location, resistance, final damage, critical flag and HP/radiation consequence were already rolled and applied by the client. State those exact results when relevant. Never reroll, replace, add, subtract, or apply that damage a second time. Narrate the consequences from the supplied final result.",''',
    "Auto GM encounter resolution rule",
)
path.write_text(text)

print("Travel encounter resolution fix applied")
