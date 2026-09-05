from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


# 1) Character storage: food/drink recovery + travel/camp event listeners.
hook_path = Path("src/hooks/useCharacterStorage.js")
hook = hook_path.read_text(encoding="utf-8")

if "PIPBOY_SURVIVAL_TRAVEL_EVENT" not in hook:
    hook = replace_once(
        hook,
        'const TAG_EQUIPMENT_CHOICE_EVENT = "pipboy:set-tag-equipment-choice";\n',
        'const TAG_EQUIPMENT_CHOICE_EVENT = "pipboy:set-tag-equipment-choice";\n'
        'const PIPBOY_SURVIVAL_TRAVEL_EVENT = "pipboy:survival-travel-hours";\n'
        'const PIPBOY_CAMP_REST_EVENT = "pipboy:survival-camp-rest";\n',
        "survival event constants",
    )

old_next_base = '''        const nextBase = {
          ...prev,
          inventoryItems,
          statuses,
          activeConsumableEffects,
          radiationHp: String(radiationHp),
        };'''
new_next_base = '''        const category = String(item?.category || "").toLowerCase();
        const satiety = category === "food"
          ? Math.min(5, Math.max(0, Number(prev.satiety || 0)) + 1)
          : Math.max(0, Math.min(5, Number(prev.satiety || 0)));
        const thirst = category === "beverages"
          ? Math.min(5, Math.max(0, Number(prev.thirst || 0)) + 1)
          : Math.max(0, Math.min(5, Number(prev.thirst || 0)));

        const nextBase = {
          ...prev,
          inventoryItems,
          statuses,
          activeConsumableEffects,
          radiationHp: String(radiationHp),
          satiety: String(satiety),
          thirst: String(thirst),
        };'''
if 'const category = String(item?.category || "").toLowerCase();' not in hook:
    hook = replace_once(hook, old_next_base, new_next_base, "food and beverage recovery")

old_listeners = '''    window.addEventListener(PIPBOY_USE_ITEM_EVENT, handleUseItem);
    window.addEventListener(
      PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
      handleEndConsumableEffect
    );

    return () => {
      window.removeEventListener(PIPBOY_USE_ITEM_EVENT, handleUseItem);
      window.removeEventListener(
        PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
        handleEndConsumableEffect
      );
    };'''
new_listeners = '''    const handleSurvivalTravel = (event) => {
      const hours = Math.max(0, Number(event?.detail?.hours || 0));
      if (hours <= 0) return;

      setForm((prev) => {
        const previousRemainder = Math.max(
          0,
          Number(prev.survivalTravelHoursRemainder || 0)
        );
        const accumulatedHours = previousRemainder + hours;
        const drainSteps = Math.floor(accumulatedHours / 4);
        const remainder = accumulatedHours - drainSteps * 4;
        const satiety = Math.max(
          0,
          Math.min(5, Number(prev.satiety || 0)) - drainSteps
        );
        const thirst = Math.max(
          0,
          Math.min(5, Number(prev.thirst || 0)) - drainSteps
        );

        return {
          ...prev,
          satiety: String(satiety),
          thirst: String(thirst),
          survivalTravelHoursRemainder: String(Number(remainder.toFixed(2))),
        };
      });
    };

    const handleCampRest = () => {
      setForm((prev) => ({ ...prev, vigor: "5" }));
    };

    window.addEventListener(PIPBOY_USE_ITEM_EVENT, handleUseItem);
    window.addEventListener(
      PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
      handleEndConsumableEffect
    );
    window.addEventListener(PIPBOY_SURVIVAL_TRAVEL_EVENT, handleSurvivalTravel);
    window.addEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);

    return () => {
      window.removeEventListener(PIPBOY_USE_ITEM_EVENT, handleUseItem);
      window.removeEventListener(
        PIPBOY_END_CONSUMABLE_EFFECT_EVENT,
        handleEndConsumableEffect
      );
      window.removeEventListener(PIPBOY_SURVIVAL_TRAVEL_EVENT, handleSurvivalTravel);
      window.removeEventListener(PIPBOY_CAMP_REST_EVENT, handleCampRest);
    };'''
if "const handleSurvivalTravel = (event) =>" not in hook:
    hook = replace_once(hook, old_listeners, new_listeners, "survival listeners")

hook_path.write_text(hook, encoding="utf-8")


# 2) Default form: keep partial travel hours between journeys.
constants_path = Path("src/constants.js")
constants = constants_path.read_text(encoding="utf-8")
if "survivalTravelHoursRemainder" not in constants:
    constants = replace_once(
        constants,
        '    vigor: "3",\n',
        '    vigor: "3",\n    survivalTravelHoursRemainder: "0",\n',
        "default survival travel remainder",
    )
    constants_path.write_text(constants, encoding="utf-8")


# 3) Map: send actual travel hours and restore vigor when camping.
map_path = Path("src/components/map/MapScreen.jsx")
map_text = map_path.read_text(encoding="utf-8")

if "PIPBOY_SURVIVAL_TRAVEL_EVENT" not in map_text:
    map_text = replace_once(
        map_text,
        "const WORLD_ROUTE_MARGIN = 6;\n",
        'const WORLD_ROUTE_MARGIN = 6;\n'
        'const PIPBOY_SURVIVAL_TRAVEL_EVENT = "pipboy:survival-travel-hours";\n'
        'const PIPBOY_CAMP_REST_EVENT = "pipboy:survival-camp-rest";\n',
        "map survival constants",
    )

travel_dispatch = '''    if (typeof window !== "undefined" && totalCost > 0) {
      window.dispatchEvent(new CustomEvent(PIPBOY_SURVIVAL_TRAVEL_EVENT, {
        detail: { hours: totalCost },
      }));
    }
'''

# Local/sector travel.
local_anchor = '''    if (reachedDestination) setSelectedCell(null);
  }

  function handleWorldTravel() {'''
if map_text.count('detail: { hours: totalCost },') < 1:
    map_text = replace_once(
        map_text,
        local_anchor,
        travel_dispatch + '''    if (reachedDestination) setSelectedCell(null);
  }

  function handleWorldTravel() {''',
        "sector travel survival event",
    )

# Inter-sector/world travel.
world_anchor = '''    setSelectedCell(null);
  }

  function handleRegenerateMap() {'''
if map_text.count('detail: { hours: totalCost },') < 2:
    map_text = replace_once(
        map_text,
        world_anchor,
        travel_dispatch + '''    setSelectedCell(null);
  }

  function handleRegenerateMap() {''',
        "world travel survival event",
    )

# Camping restores vigor to 5/5. Camp time itself does not consume hunger/thirst;
# the requested drain is travel-only.
camp_dispatch = '''    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PIPBOY_CAMP_REST_EVENT));
    }
'''
camp_anchor = '''    });
    setSelectedCell(null);
  }

  function shiftMap(direction) {'''
if 'window.dispatchEvent(new CustomEvent(PIPBOY_CAMP_REST_EVENT));' not in map_text:
    map_text = replace_once(
        map_text,
        camp_anchor,
        '''    });
''' + camp_dispatch + '''    setSelectedCell(null);
  }

  function shiftMap(direction) {''',
        "camp vigor event",
    )

map_path.write_text(map_text, encoding="utf-8")

print("Survival vitals patch applied.")
