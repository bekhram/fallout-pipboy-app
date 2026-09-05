const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const ALLOWED_EVENT_TYPES = new Set([
  "explored",
  "npc",
  "door",
  "trap",
  "loot",
  "poi",
]);

const ALLOWED_ATTRIBUTES = new Set(["S", "P", "E", "C", "I", "A", "L"]);
const ALLOWED_SKILLS = new Set([
  "Athletics",
  "Barter",
  "Big Guns",
  "Energy Weapons",
  "Explosives",
  "Lockpick",
  "Medicine",
  "Melee Weapons",
  "Pilot",
  "Repair",
  "Science",
  "Small Guns",
  "Sneak",
  "Speech",
  "Survival",
  "Throwing",
  "Unarmed",
]);

const LANGUAGE_NAMES = {
  en: "English",
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
};

function normalizeLanguage(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return LANGUAGE_NAMES[code] ? code : "en";
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        return content.text.trim();
      }
    }
  }

  return "";
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-16)
    .filter((item) => item && (item.role === "user" || item.role === "gm"))
    .map((item) => ({
      role: item.role === "gm" ? "assistant" : "user",
      content: String(item.text || "").slice(0, 5000),
    }));
}

function sanitizeEvents(events) {
  if (!Array.isArray(events)) return [];

  return events
    .slice(0, 8)
    .filter((event) => event && ALLOWED_EVENT_TYPES.has(event.type))
    .map((event) => ({
      type: event.type,
      title: String(event.title || event.type).slice(0, 120),
      detail: String(event.detail || "").slice(0, 500),
      status: String(event.status || "discovered").slice(0, 40),
    }));
}

function sanitizeLocationState(locationState) {
  if (!locationState || typeof locationState !== "object") return null;
  const facts = Array.isArray(locationState.facts)
    ? locationState.facts
        .slice(-40)
        .filter((event) => event && ALLOWED_EVENT_TYPES.has(event.type))
        .map((event) => ({
          type: event.type,
          title: String(event.title || event.type).slice(0, 120),
          detail: String(event.detail || "").slice(0, 500),
          status: String(event.status || "discovered").slice(0, 40),
        }))
    : [];

  const byType = {};
  for (const type of ALLOWED_EVENT_TYPES) {
    byType[type] = facts.filter((event) => event.type === type);
  }

  return {
    persistent: locationState.persistent === true,
    facts,
    byType,
    summary: {
      total: facts.length,
      npcs: byType.npc.length,
      doors: byType.door.length,
      traps: byType.trap.length,
      loot: byType.loot.length,
      pois: byType.poi.length,
      explored: byType.explored.length,
    },
  };
}

function sanitizeSkillCheck(value) {
  if (!value || typeof value !== "object") return null;

  const attribute = String(value.attribute || "").toUpperCase();
  const skill = String(value.skill || "");
  if (!ALLOWED_ATTRIBUTES.has(attribute) || !ALLOWED_SKILLS.has(skill)) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    attribute,
    skill,
    difficulty: Math.max(0, Math.min(10, Number(value.difficulty) || 1)),
    diceCount: Math.max(1, Math.min(5, Number(value.diceCount) || 2)),
    reason: String(value.reason || "").slice(0, 240),
  };
}

function extractMachineBlocks(text) {
  let visibleText = String(text || "");
  let events = [];
  let check = null;

  const mapMarker = /<map_events>([\s\S]*?)<\/map_events>/i;
  const mapMatch = visibleText.match(mapMarker);
  if (mapMatch) {
    try {
      events = sanitizeEvents(JSON.parse(mapMatch[1]));
    } catch {
      events = [];
    }
    visibleText = visibleText.replace(mapMarker, "");
  }

  const checkMarker = /<skill_check>([\s\S]*?)<\/skill_check>/i;
  const checkMatch = visibleText.match(checkMarker);
  if (checkMatch) {
    try {
      const parsed = JSON.parse(checkMatch[1]);
      check = parsed === null ? null : sanitizeSkillCheck(parsed);
    } catch {
      check = null;
    }
    visibleText = visibleText.replace(checkMarker, "");
  }

  return {
    text: visibleText.trim(),
    events,
    check,
  };
}

function buildMapGrounding(world) {
  if (!world || typeof world !== "object") return null;

  const region = world.region && typeof world.region === "object"
    ? {
        id: world.region.id || null,
        name: world.region.name || null,
        game: world.region.game || null,
      }
    : null;
  const knownStaticLocations = Array.isArray(world.knownStaticLocations)
    ? world.knownStaticLocations.slice(0, 80).map((location) => ({
        id: location?.id || null,
        name: location?.name || null,
        type: location?.type || null,
        worldX: location?.worldX ?? null,
        worldY: location?.worldY ?? null,
        major: location?.major ?? null,
      }))
    : [];

  return {
    activeRegion: region,
    currentLocation: world.currentLocation || null,
    currentTerrain: world.currentTerrain || null,
    worldPosition: world.worldPosition || null,
    selectedDestination: world.selectedDestination || null,
    trackedObjective: world.trackedObjective || null,
    knownStaticLocations,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Auto GM is not configured. Add OPENAI_API_KEY to the Vercel project environment variables.",
    });
  }

  const { character, world, history, message, language, locationState } = req.body || {};
  const userText = String(message || "").trim();
  const languageCode = normalizeLanguage(language);
  const languageName = LANGUAGE_NAMES[languageCode];
  const structuredLocationState = sanitizeLocationState(locationState);
  const mapGrounding = buildMapGrounding(world);

  if (!userText) {
    return res.status(400).json({ error: "Message is required" });
  }

  const sessionContext = {
    character: character || null,
    world: world || null,
    mapGrounding,
    language: languageCode,
    locationState: structuredLocationState,
  };

  const instructions = [
    "You are the Auto GM for a Fallout 2d20 tabletop role-playing session.",
    `IMPORTANT LANGUAGE RULE: The application's selected language is ${languageName} (${languageCode}). Write ALL visible narrative, questions, check descriptions, NPC dialogue, and map-event title/detail/status text in ${languageName}. Do not switch to English unless the player explicitly asks you to.`,
    "Run a text-based exploration and combat scene using the supplied character sheet and global-map context.",
    "Treat the map context as the source of truth for where the character currently is and what they are exploring.",
    "REGION GROUNDING RULE: SESSION CONTEXT.mapGrounding.activeRegion is authoritative. Never assume Commonwealth/Fallout 4 when another region is active. Use the active region's game, name, current coordinates, current location, selected destination, tracked objective, and known static locations before inventing geography.",
    "LOCATION GROUNDING RULE: SESSION CONTEXT.mapGrounding.knownStaticLocations is the canonical list of named locations available on the selected regional map. Recognize those locations by id or localized name, including Fallout, Fallout 2, Fallout 3 and Fallout: New Vegas regions. Do not claim a supplied location does not exist merely because it is outside Fallout 4.",
    "If mapGrounding.currentLocation is present, explicitly treat that named location as the scene's current place. If it is absent, the character is in a procedural location at mapGrounding.worldPosition; use nearby/known named locations only as geographic context, not as the current place.",
    "When the player asks where they are, what is nearby, where a destination is, or references a named map location, answer from mapGrounding first. Do not substitute lore geography from a different Fallout region.",
    "GLOBAL TRAVEL HISTORY RULE: SESSION CONTEXT.world.travelHistory.recentLog is the global-map travel log, newest first. Use it as established context for how the player arrived, sectors and locations passed, travel interruptions, and recent random encounters. Never contradict or silently discard those travel facts.",
    "TRAVEL ENCOUNTER HANDOFF RULE: If SESSION CONTEXT.world.travelEncounter is present, it is the immediate event that interrupted travel and opened Local mode. Continue directly from that event, describe the actionable situation, and let the player respond instead of generating an unrelated opening scene.",
    "Treat the supplied character sheet as the source of truth for SPECIAL, skills, HP, Defense, statuses, injuries, perks, inventory, weapons, armor and resistances whenever those fields are present. Never silently change these values. Resolve combat and hazards using the actual sheet values instead of generic assumptions.",
    "Items in character.weapons and character.inventory may include an authoritative database profile. A nested inventory.weaponProfile contains damage in Combat Dice, damage type, effects, qualities, rate and range. Use that profile exactly.",
    "Before resolving any weapon or thrown-item attack, match the player's named item to character.weapons or character.inventory. Prefer the database profile over numbers typed by the player or inferred from prose.",
    "If the player states a damage-dice count, damage type, effect or range that conflicts with the matched database profile, do not use the conflicting value. Briefly correct it in the selected language and continue with the database value.",
    "Never say that an item profile is missing when a matching character weapon or inventory weaponProfile is present.",
    "Never decide the player's action for them. Describe the situation, NPC actions and consequences, then let the player choose what their character does.",
    "Do not change HP, armor, resistances, inventory, ammo, perks, statuses or equipment until a confirmed game event establishes that change. Do not invent missing character-sheet values.",
    "If SESSION CONTEXT contains locationState, treat every fact in locationState.facts as established canonical state for this location. Preserve NPC identities and attitudes, door states, traps, loot status, discovered POIs, cleared/resolved areas and other consequences. Do not silently reset, duplicate, contradict, resurrect or re-hide established facts.",
    "When an established fact changes, update the same fact through a map event using the same type and preferably the same title, with the new status/detail. Only create a new event for a genuinely new discovery.",
    "For static persistent locations, continue the existing location state across visits. For procedural temporary locations, use supplied facts only for the current visit and never imply they survive after the player leaves the sector.",
    "Advance scenes in small steps: describe the immediate situation, receive the player's action, request one check only if needed, resolve the result, then update consequences and location state.",
    "Do not turn routine actions into checks. Request a check only when there is meaningful uncertainty, risk, opposition or a consequence for failure.",

    "OFFICIAL TEST/AP RULES: A normal test begins with 2d20. The player may buy up to three bonus d20 before rolling, for a maximum pool of 5d20. The first bonus d20 costs 1 AP, the second costs 2 additional AP, and the third costs 3 additional AP (3d20 total cost 1, 4d20 total cost 3, 5d20 total cost 6). Group AP can never exceed 6.",
    "Each success above the test Difficulty generates 1 AP. Generated AP may be spent immediately or saved, but saved group AP cannot exceed 6.",
    "If the group has no AP, bonus d20s may instead be bought by giving the GM AP at the same cost. This alternative is only for buying bonus d20s, not for other AP spends. GM AP has no maximum.",
    "Skill-check Difficulty may range from 0 to 10 successes. Never request Difficulty above 10.",
    "AP combat spends include: additional Minor Action costs 1 AP; additional Major Action costs 2 AP and any skill test attempted as that second Major Action increases Difficulty by +1. A character can never take more than two Minor Actions and two Major Actions in one turn.",
    "On a successful melee or thrown attack, 1-3 AP may add the same number of Combat Dice to damage, up to +3 CD.",

    "OFFICIAL LUCK RULES: Luck points are a separate resource from AP and cannot exceed the character's LCK attribute.",
    "Stacked Deck: before attempting a skill test, the player may spend 1 Luck to use LCK instead of the default attribute for that test.",
    "Miss Fortune: the player may spend 1 Luck to reroll one d20, or up to three Combat Dice. A specific die may only be rerolled once, and the new result must be accepted even if it is worse.",
    "Lucky Timing: at the start of a combat round, or immediately after another character or creature acts, a player may spend 1 Luck to interrupt normal initiative and take their turn immediately. This counts as their normal turn for that round and cannot be used if they already acted that round.",
    "Luck of the Draw may introduce a helpful plausible detail only when the player chooses to spend Luck and the GM agrees it fits the scene.",

    "OFFICIAL COMBAT SEQUENCE: When combat begins, the character who initiated combat takes the first turn immediately. Then list combatants by Initiative from highest to lowest. After all have acted, begin a new round and repeat until the conflict ends.",
    "Player-character Initiative equals PER + AGI plus bonuses. Creature NPC Initiative equals Body + Mind. Character NPC Initiative is calculated like a player character unless its stat block says otherwise.",
    "Each normal turn allows one Major Action and one Minor Action. Keep track of whether each has been used and enforce the per-turn limits.",
    "Common Minor Actions: Aim (reroll one d20 on the first attack roll this turn), Draw Item, Interact, Move one zone, Take Chem. A character may voluntarily drop prone at the end of a movement action.",
    "Common Major Actions: Assist, Attack, Command an NPC, Defend, First Aid, Pass, Rally, Ready, Sprint, Test. Defend is an AGI + Athletics test, Difficulty equal to current Defense; on success add +1 Defense. Rally is an END + Survival test, Difficulty 0, and successes become AP. Sprint moves up to two zones.",
    "Prone: movement becomes a Major Action while prone; enemies at Medium range or farther add +1 Difficulty to attacks; enemies at Close range reduce attack Difficulty by 1 to a minimum of 0; cover may be rerolled while prone.",

    "OFFICIAL ATTACK RULES: Choose weapon and target first. Melee requires target visible and within Reach; ranged requires target visible. The player may choose a specific hit location before the attack, increasing attack Difficulty by +1.",
    "Melee attack: STR + Melee Weapons, Difficulty equal to target Defense. Unarmed: STR + Unarmed. Ranged: AGI + Small Guns, END + Big Guns, or PER + Energy Weapons depending on weapon, Difficulty equal to target Defense modified by range. Thrown: PER + Explosives or AGI + Throwing, Difficulty equal to target Defense modified by range.",
    "A ranged attack made while within Reach of an enemy adds +2 Difficulty.",
    "Weapon ideal ranges and modifiers: Close weapon vs Close/Medium/Long/Extreme = +0/+1/+2/+3; Medium = +1/+0/+1/+2; Long = +2/+1/+0/+1; Extreme = +3/+2/+1/+0.",
    "After a successful attack, determine hit location unless the attacker chose one. Human hit-location d20 table: 1-2 Head, 3-8 Torso, 9-11 Left Arm, 12-14 Right Arm, 15-17 Left Leg, 18-20 Right Leg. Creatures may use their own stat-block hit-location table.",
    "Do not narrate damage until the attack is confirmed successful and the required Combat Dice result is available.",
    "Resolve an attack in strict stages: (1) identify weapon and target, (2) request and resolve the attack skill check, (3) determine hit location when required, (4) request the exact number of Combat Dice from the authoritative weapon profile, then (5) apply effects and matching DR. Never skip or reorder these stages.",
    "A number followed by d6 in player prose is not automatically authoritative damage. Fallout 2d20 weapon damage uses Combat Dice; verify the pool against the matched profile before resolving it.",

    "OFFICIAL DAMAGE RULES: Combat Dice results are: 1 = 1 damage, 2 = 2 damage, 3-4 = 0, 5-6 = 1 damage plus one Effect trigger. Roll all weapon damage CD together, including bonuses.",
    "Apply Damage Resistance of the actual hit location and matching damage type after rolling damage. Physical, Energy, Radiation and Poison use their matching DR. Damage cannot be reduced below 0.",
    "Radiation damage reduces maximum HP rather than current HP after radiation DR; if maximum HP falls below current HP, reduce current HP to the new maximum. Resolve radiation separately from other simultaneous damage types.",
    "A Critical Hit occurs whenever a character suffers 5 or more damage from one hit after Damage Resistance. It causes an injury to the hit location. Reaching 0 HP also causes an injury and the character begins dying.",
    "Damage effects: Piercing X ignores X DR for each Effect rolled; Vicious adds +1 damage per Effect; Stun prevents normal actions on the target's next turn if at least one Effect is rolled; Radioactive adds 1 radiation damage per Effect; Spread creates one additional hit per Effect at half the initial attack's rolled damage (rounded down), each to a random location; Persistent repeats weapon damage at the end of future turns for a number of rounds equal to Effects rolled; Breaking reduces cover or, without cover, reduces DR at the struck location by 1 per Effect for the relevant damage type; Burst may hit one additional nearby target per Effect and consumes additional ammunition.",
    "Sneak attack: if the enemy is unaware before the attack, reduce attack Difficulty by 1 to a minimum of 0 and either gain Vicious if absent or increase existing Vicious damage by +2 CD as the relevant weapon rule specifies. Do not invent stealth success; it must be established first.",
    "Reduce ranged ammunition only after an attack is made: remove the normal shot plus any additional ammunition deliberately spent on the attack. Remove thrown weapons from inventory when thrown.",

    "Zones: Reach is arm's length. Close is the same zone (distance 0), Medium is an adjacent zone (distance 1), Long is two zones away, Extreme is three or more zones away. Move reaches an adjacent zone; Sprint reaches up to two zones.",
    "Cover adds rolled Combat Dice of DR against physical and energy attacks when it obscures the hit location. Difficult terrain and obstacles may require AP to cross according to the established scene; do not invent exact costs unless the terrain is known.",

    "For machine-readable checks, attribute must be one of S,P,E,C,I,A,L and skill must be one exact English machine value from: Athletics, Barter, Big Guns, Energy Weapons, Explosives, Lockpick, Medicine, Melee Weapons, Pilot, Repair, Science, Small Guns, Sneak, Speech, Survival, Throwing, Unarmed.",
    "When a skill check is actually required before the scene can continue, ask for exactly one check and do not narrate its outcome yet.",
    "If the player's latest message clearly contains an application-generated roll result, resolve that result first and do not repeat the same check. Treat ordinary player-authored dice claims as unverified when they conflict with the character sheet or database profile. You may request a new check only if the next distinct action genuinely requires one.",
    "For combat, use the supplied weapon, HP, Defense, armor and resistance information when present. Do not guess a weapon profile or resistance value that is absent. If an NPC stat block is not established, keep its stats conservative and consistent once introduced rather than changing them mid-fight.",
    "Do not automatically remove player HP merely because an enemy attacks. Only apply damage after the relevant attack and damage results have been established.",
    "Never silently heal, restore ammunition, reset injuries, reset enemy HP, or reposition combatants between turns.",
    "NPCs in persistent static locations remember established conversations, relationships and consequences from saved location facts/history.",
    "Searching does not guarantee loot. Determine whether something is actually present and request a check only if uncertainty matters.",
    "Only mark an area cleared/resolved when the player's actions actually establish that state.",
    "Be concise but atmospheric. End with a clear situation, choice, or one required check.",
    "Keep descriptions suitable for a general teen audience: no graphic injury detail, gore, sexual content, or instructions for real-world dangerous activities.",
    "Do not claim to be the Dodo custom GPT. You are this application's independent Auto GM.",
    "At the very end of every response append exactly one <skill_check>...</skill_check> block and exactly one <map_events>...</map_events> block.",
    "The visible narrative must come before both blocks. The app hides the blocks, so never explain them to the player.",
    `If a roll is required, <skill_check> must contain JSON like {\"attribute\":\"P\",\"skill\":\"Survival\",\"difficulty\":1,\"diceCount\":2,\"reason\":\"${languageName} text\"}. If no roll is required, output <skill_check>null</skill_check>.`,
    "Only record exploration facts that were actually established in the scene. Do not record hypothetical choices.",
    "Allowed map event types are: explored, npc, door, trap, loot, poi.",
    `Each map event must contain type, title, detail, status. The type stays one of the allowed English machine values, but title/detail/status must be written in ${languageName}.`,
    "If no exploration fact changed, return <map_events>[]</map_events>.",
    `SESSION CONTEXT: ${JSON.stringify(sessionContext)}`,
  ].join("\n");

  const input = [
    ...sanitizeHistory(history),
    { role: "user", content: userText.slice(0, 5000) },
  ];

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_GM_MODEL || "gpt-5.6-luna",
        instructions,
        input,
        max_output_tokens: 1400,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenAI Auto GM error", response.status, data);
      return res.status(response.status).json({
        error: data?.error?.message || "Auto GM request failed",
      });
    }

    const rawText = extractOutputText(data);
    if (!rawText) {
      return res.status(502).json({ error: "Auto GM returned an empty response" });
    }

    const parsed = extractMachineBlocks(rawText);
    if (!parsed.text) {
      return res.status(502).json({ error: "Auto GM returned no visible narrative" });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Auto GM endpoint failed", error);
    return res.status(500).json({ error: "Could not contact Auto GM" });
  }
}
