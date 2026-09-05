export default [
  {
    id:"rule-mechanical-lock",name:"Mechanical Lock",category:"obstacle",tags:["obstacle","lock","lockpick"],statKind:"rule",
    summary:"Doors, gates, safes, toolboxes and similar containers may be secured by a mechanical lock.",
    detectionDifficulty:"Not a universal detection test; the lock is part of the obstacle.",
    disarmDifficulty:"PER + Lockpick; Difficulty is set by the lock's complexity.",
    trigger:"A damaged, rusted or poor-condition lock can increase the test's complication range, risking broken lockpicking tools.",
    effect:"Normally takes 10 × Difficulty minutes to bypass. After a success, spending 2 AP can halve that time. A correct key bypasses the test almost immediately.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 198."
  },
  {
    id:"rule-electronic-lock",name:"Electronic Lock",category:"obstacle",tags:["obstacle","terminal","science"],statKind:"rule",
    summary:"Electronic locks are commonly controlled by a nearby computer terminal, though some can also have a manual mechanism.",
    disarmDifficulty:"Password, or INT + Science; Difficulty is set by the computer security's complexity.",
    effect:"Normally takes 10 × Difficulty minutes to bypass; 2 AP after success can halve the time. A valid password is effectively immediate once obtained.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 198."
  },
  {
    id:"rule-collapsed-structure",name:"Collapsed Structure",category:"obstacle",tags:["obstacle","ruins","athletics","survival"],statKind:"rule",
    summary:"A collapsed section, crevasse or blocked route can force an alternate path or a physical traversal.",
    disarmDifficulty:"PER + Survival to find a route, or STR/AGI + Athletics to cross it; Difficulty depends on how difficult the route is.",
    effect:"Normally takes 10 × Difficulty minutes to bypass; 2 AP after success can halve that time.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 198."
  },
  {
    id:"rule-ongoing-hazard",name:"Ongoing Hazard",category:"hazard",tags:["hazard","ongoing","environment"],statKind:"rule",
    summary:"A continuous environmental danger that damages characters while they remain in the hazardous area.",
    damage:"1 CD for each minute or each 10 minutes of exposure, chosen by the GM according to hazard intensity. Resolve accumulated exposure together at the end of an action.",
    effect:"Damage type follows the hazard: extreme heat/cold → Energy; heavy/sharp objects → Physical; toxic chemicals → Poison; radiation → Radiation.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 199."
  },
  {
    id:"rule-occasional-hazard",name:"Occasional Hazard",category:"hazard",tags:["hazard","occasional","environment"],statKind:"rule",
    summary:"A danger that only occurs in specific circumstances, such as a failed search/movement test or a complication.",
    trigger:"Examples include an ignition, electrical surge, collapse or another situational consequence selected by the GM.",
    damage:"Most hazards and deliberate traps inflict 3–8 CD when triggered; weapon-based traps can use an appropriate weapon profile from Equipment.",
    effect:"Armor and other protection can defend against hazard damage, but ordinary hazards usually cannot be disarmed before they occur.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 199."
  },
  {
    id:"rule-deliberate-trap",name:"Deliberate Trap",category:"trap",tags:["trap","disarm","hazard"],statKind:"rule",
    summary:"Purpose-built hazards such as tripwire weapons, large mechanical traps and mines can be detected in the fiction and disarmed as obstacles.",
    detectionDifficulty:"No single universal detection Difficulty is specified by this rule; concealment and circumstances are determined by the GM/location.",
    disarmDifficulty:"AGI + Small Guns, Survival or Explosives (depending on trap type), Difficulty 2.",
    trigger:"Failure to disarm activates the hazard and inflicts its damage.",
    damage:"Most hazards/traps use 3–8 CD; weapon traps may instead use the relevant weapon's Equipment profile.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 199."
  }
];
