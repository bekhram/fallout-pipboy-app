export const WINTER_TERRAIN = [
  { id:"wet_snow", label:"Wet / soft / muddy snow", ap:1 },
  { id:"rubble", label:"Collapsed building / potholes / snow-covered rubble", ap:2 },
  { id:"slope", label:"Snow-covered slope / ice spikes / sinkholes", ap:3 },
];

export const WINTER_OBSTACLES = [
  { id:"waist_snow", label:"Waist-height snow / snow flurry / frozen carcass", ap:1 },
  { id:"frozen_water", label:"Frozen river / small lake / chest-height snow / fallen tree", ap:2 },
  { id:"frozen_ruin", label:"Frozen ruin / collapsing bridge / hidden powerline", ap:3 },
];

export const WINTER_CONDITIONS = [
  { id:"flash_freeze", label:"Flash Freeze", effect:"END test difficulty +1 to +3 by exposure length." },
  { id:"snow_covered", label:"Snow-Covered", effect:"Spot/avoid hazard difficulty +1 to +3 by snow height." },
  { id:"icy_surfaces", label:"Icy Surfaces", effect:"Sprint: AGI + Athletics D1–3; failure = no move, prone, stunned until next turn." },
  { id:"blizzard", label:"Blizzard", effect:"Vision PER tests and attacks at Medium+ difficulty +1 to +3." },
  { id:"rad_izzard", label:"Rad-izzard", effect:"Unsheltered turn start: END + Survival D1–3; failure = +1 Fatigue and 2 CD Vicious Radiation." },
];

export const WINTER_HAZARDS = [
  { id:"falling_icicles", label:"Falling icicles", damage:"3 CD Piercing Physical" },
  { id:"irradiated_snow", label:"Irradiated snow", damage:"2 CD Vicious Radiation" },
  { id:"snowslide", label:"Snowslide", damage:"2 CD Stun Physical" },
  { id:"poisonous_plants", label:"Poisonous plants", damage:"2 CD Persistent Poison" },
];

export const WINTER_DANGEROUS_OBJECTS = [
  { id:"rad_beacon", label:"Rad beacon", spot:"PER + Survival D2", effect:"4 CD Persistent Radiation" },
  { id:"anti_rad_disassembler", label:"Anti-Rad disassembler", spot:"PER + Survival D2", effect:"4 CD Vicious Energy; 6 CD against irradiated targets" },
  { id:"chemical_dispersal", label:"Chemical dispersal unit", spot:"PER + Survival D2", effect:"4 CD Persistent Poison" },
  { id:"spike_pit", label:"Spike pit", spot:"AGI + Athletics D2", effect:"4 CD Vicious Physical" },
];

export const JOURNEY_SPEEDS = {
  cautious: { id:"cautious", durationMultiplier:2, difficultyModifier:-2, complicationRange:0 },
  normal: { id:"normal", durationMultiplier:1, difficultyModifier:-1, complicationRange:2 },
  hurried: { id:"hurried", durationMultiplier:0.5, difficultyModifier:0, complicationRange:4 },
};

export function calculateJourneyDifficulty({
  establishedRoute=true,
  familiarArea=true,
  friendlyFaction=true,
  goodDirections=true,
  obstaclesAvoidable=true,
  durationHours=24,
  speed="normal",
  apDifficultyReduction=0,
}={}) {
  const answers=[establishedRoute,familiarArea,friendlyFaction,goodDirections,obstaclesAvoidable];
  let baseDifficulty=Math.min(5,answers.filter((value)=>!value).length);
  const extraDays=Math.max(0,Math.floor((Math.max(0,Number(durationHours)||0)-24)/24));
  baseDifficulty=Math.min(5,baseDifficulty+extraDays);
  const mode=JOURNEY_SPEEDS[speed]||JOURNEY_SPEEDS.normal;
  const cleverPlanReduction=Math.max(0,Math.floor(Number(apDifficultyReduction)||0));
  const difficulty=Math.max(0,baseDifficulty+mode.difficultyModifier-cleverPlanReduction);
  return {
    baseDifficulty,
    difficulty,
    durationHours:Math.max(0,Number(durationHours)||0)*mode.durationMultiplier,
    complicationRange:mode.complicationRange,
    speed:mode.id,
  };
}

export function calculateColdExposureDifficulty({
  hours=0,
  warmClothing=true,
  extremeCold=false,
  warmShelter=false,
  hotFood=false,
  physicalActivity=false,
}={}) {
  let difficulty=1+Math.floor(Math.max(0,Number(hours)||0)/12);
  if(!warmClothing) difficulty+=1;
  if(extremeCold) difficulty+=1;
  if(warmShelter) difficulty-=1;
  if(hotFood) difficulty-=1;
  if(physicalActivity) difficulty-=1;
  return Math.max(1,difficulty);
}

export function coldExposureFailure({hours=0,currentHp=0,complication=false}={}) {
  const cap=Math.ceil(Math.max(0,Number(currentHp)||0)/2);
  const fatigue=Math.min(cap,Math.max(0,Math.floor(Number(hours)||0)));
  return { fatigue, fatigueCap:cap, warmShelterRestHours:complication?24:6, lockedByComplication:Boolean(complication) };
}

export const CAMPSITE_TIERS = {
  1:{tier:1,difficulty:0,materials:{common:2,uncommon:0,rare:0}},
  2:{tier:2,difficulty:2,materials:{common:3,uncommon:0,rare:0}},
  3:{tier:3,difficulty:3,materials:{common:4,uncommon:2,rare:0}},
  4:{tier:4,difficulty:4,materials:{common:5,uncommon:3,rare:0}},
  5:{tier:5,difficulty:5,materials:{common:6,uncommon:4,rare:2}},
  6:{tier:6,difficulty:6,materials:{common:7,uncommon:5,rare:3}},
};

export const CAMPSITE_FEATURES = [
  {id:"campfire",label:"Campfire",effect:"Warmth against cold exposure for short periods."},
  {id:"shelter",label:"Shelter",effect:"Protection from weather; with heat allows recovery from cold Fatigue."},
  {id:"bedding",label:"Comfortable Bedding",effect:"+2 Maximum HP until the character sleeps again."},
  {id:"cooking",label:"Cooking Station",effect:"Temporary cooking station for food and beverages."},
  {id:"alarmed",label:"Alarmed Site",effect:"Intruder AGI test difficulty equals campsite tier."},
  {id:"cleaned",label:"Cleaned Site",effect:"Disease/poison sources cleared and irradiated spots marked."},
  {id:"concealed",label:"Concealed Site",effect:"Tracking Survival difficulty +2; roll campsite visitors twice and use lowest."},
  {id:"defensible",label:"Defensible Site",effect:"2 CD cover; repeated picks +1 CD each, max 4 CD."},
];

export function calculateCampsite({tier=1,apSpentAfterTest=0,buildSucceeded=true}={}) {
  const attempted=Math.max(1,Math.min(6,Math.floor(Number(tier)||1)));
  const built=buildSucceeded?attempted:Math.max(1,attempted-2);
  const def=CAMPSITE_TIERS[attempted];
  const builtDef=CAMPSITE_TIERS[built];
  const features=built+Math.floor(Math.max(0,Number(apSpentAfterTest)||0)/3);
  const refund=Object.fromEntries(Object.entries(builtDef.materials).map(([key,value])=>[key,Math.ceil(value/2)]));
  return {attemptedTier:attempted,builtTier:built,difficulty:def.difficulty,materials:def.materials,featureSlots:features,teardownRefund:refund};
}

export const REPUTATION_RANKS = [
  {rank:0,label:"Hostile"},
  {rank:1,label:"Cautious"},
  {rank:2,label:"Neutral"},
  {rank:3,label:"Friendly"},
  {rank:4,label:"Trusting"},
  {rank:5,label:"Allied"},
];

export function prepareReputationTest({charisma=0,rank=2,positive=0,negative=0}={}) {
  const safeRank=Math.max(0,Math.min(5,Math.floor(Number(rank)||0)));
  return {
    targetNumber:Math.max(0,Number(charisma)||0)+safeRank,
    difficulty:1+Math.max(0,Math.floor(Number(negative)||0)),
    diceCount:2+Math.max(0,Math.floor(Number(positive)||0)),
    rank:safeRank,
  };
}

export function resolveReputationTest({charisma=0,rank=2,positive=0,negative=0,rolls=[]}={}) {
  const setup=prepareReputationTest({charisma,rank,positive,negative});
  const dice=Array.isArray(rolls)?rolls.map(Number).filter((n)=>Number.isFinite(n)):[];
  let successes=0;
  let complications=0;
  for(const die of dice){
    if(die===20) complications+=1;
    if(die<=setup.rank) successes+=2;
    else if(die<=setup.targetNumber) successes+=1;
  }
  const success=successes>=setup.difficulty;
  let nextRank=setup.rank;
  if(success) nextRank=Math.min(5,nextRank+1);
  else if(Number(negative)>Number(positive)) nextRank=Math.max(0,nextRank-1);
  return {...setup,rolls:dice,successes,success,complications,gmAp:complications*2,nextRank};
}

export const JOURNEY_COMPLICATIONS = [
  [1,2,"Hungry arrival: each PC moves Hunger down one step."],
  [3,4,"Low spirits: social CHA test difficulty +1 until rest."],
  [5,6,"An essential piece of gear breaks."],
  [7,8,"Obstacle: group STR + Athletics D3; failure = +1 Fatigue each."],
  [9,10,"Ominous sight: +2 AP to GM pool."],
  [11,12,"All carried food and drink become Irradiated."],
  [13,14,"Irradiated area: roll CD equal to navigation difficulty as Radiation damage."],
  [15,16,"Roll on the Commonwealth Winter Random Encounter table."],
  [17,18,"Apply a Winter Environment Condition."],
  [19,19,"END + Survival D2 or +1 Fatigue."],
  [20,20,"END + Survival D3 or Cold Exposure worsens one step."],
];

export const WINTER_RANDOM_ENCOUNTERS = [
  [1,2,"Wandering merchant willing to trade and share local news."],
  [3,4,"Lost roaming Protectron."],
  [5,6,"Ruined campsite recently attacked by Raiders."],
  [7,8,"A Deathclaw flees from something even worse."],
  [9,10,"Minutemen patrol questions the group."],
  [11,12,"Freezing wastelanders ask for help."],
  [13,14,"Fake Vault survivors attempt an ambush."],
  [15,16,"Feral ghoul pack spots the party."],
  [17,18,"Super Mutants charge the group."],
  [19,19,"Super Mutant riding a harnessed deathclaw demands food and caps."],
  [20,20,"Followers of the Last Son of Atom attempt recruitment."],
];

export function lookupD20(table,roll){
  const value=Math.max(1,Math.min(20,Math.floor(Number(roll)||1)));
  const row=table.find(([min,max])=>value>=min&&value<=max);
  return row?{roll:value,text:row[2]}:{roll:value,text:""};
}


export const CAMPSITE_VISITORS = [
  [1,10,"Only the frigid wind visits the campsite tonight."],
  [11,12,"A hooded stranger wanders near the camp, searching for something—or someone."],
  [13,13,"A starving Super Mutant arrives and demands food; they may be bargained with."],
  [14,14,"A trader approaches seeking shelter and safety and may be willing to trade."],
  [15,15,"A cautious stranger—secretly a synth—from a nearby settlement seeks shelter."],
  [16,16,"A small band of raiders fleeing a hazard or monstrous threat approaches warily."],
  [17,17,"A small horde of ghouls roams near the camp but has not noticed the party yet."],
  [18,18,"A family of refugees arrives with supplies and caps, lost and seeking help."],
  [19,20,"A loud crash sounds in the distance; afterward the wasteland becomes deadly silent."],
];

export const WINTER_WASTELAND_SCAVENGING = [
  [2,2,"Heavy dog armor"],
  [3,3,"10mm pistol"],
  [4,4,"Addictol"],
  [5,5,"Day Tripper"],
  [6,6,"Machete"],
  [7,7,"Sledgehammer"],
  [8,8,"Healing Salve"],
  [9,9,".45 rounds (9+4 CD)"],
  [10,10,"3+5 CD Uncommon Materials"],
  [11,11,"Pork 'N' Beans"],
  [12,12,"1+2 CD Signal Flares"],
  [13,13,"Holotape Player"],
  [14,14,"2+1 CD Tomahawks"],
  [15,15,"Pool Cue"],
  [16,16,"Hard Hat"],
  [17,17,"Military Fatigues"],
  [18,18,"Flapper Dress"],
  [19,19,"Well-Preserved Athletic Clothes"],
  [20,20,"Wine"],
  [21,21,"1+2 CD glass bottles (junk; 2 Common Materials each)"],
  [22,22,"5+5 CD Common Materials"],
  [23,23,"Yum-Yum Deviled Eggs"],
  [24,24,"Lab Coat"],
  [25,25,"Iguana Bits"],
  [26,26,"Potato Crisps"],
  [27,27,"Flare (2+1 CD)"],
  [28,28,"Syringer Ammo (2+2 CD)"],
  [29,29,"Pre-War Money worth 4d20 Caps"],
  [30,30,"Toolkit"],
  [31,31,"First Aid Kit"],
  [32,32,"Lantern"],
  [33,33,"Stimpak"],
  [34,34,"RadAway"],
  [35,35,"Knuckle Dusters"],
  [36,36,"Tire Iron"],
  [37,37,"Super Stimpak"],
  [38,38,"Buffout"],
  [39,39,"Jet"],
  [40,40,"1+5 CD Rare Materials"],
];

export function lookup2D20(table,rollA,rollB){
  const a=Math.max(1,Math.min(20,Math.floor(Number(rollA)||1)));
  const b=Math.max(1,Math.min(20,Math.floor(Number(rollB)||1)));
  const total=a+b;
  const row=table.find(([min,max])=>total>=min&&total<=max);
  return row?{rollA:a,rollB:b,total,text:row[2]}:{rollA:a,rollB:b,total,text:""};
}

export function resolveCampsiteVisitor({rollA=1,rollB=null,concealed=false}={}){
  const first=Math.max(1,Math.min(20,Math.floor(Number(rollA)||1)));
  const second=rollB==null?null:Math.max(1,Math.min(20,Math.floor(Number(rollB)||1)));
  const effective=concealed&&second!=null?Math.min(first,second):first;
  return {...lookupD20(CAMPSITE_VISITORS,effective),rollA:first,rollB:second,concealed:Boolean(concealed)};
}

export const SETTLEMENT_TASKS = [
  {id:"construction",label:"Construction Work",attribute:"Strength"},
  {id:"militia",label:"Town Militia",attribute:"Perception"},
  {id:"courier",label:"Courier",attribute:"Endurance"},
  {id:"merchant",label:"Merchant Assistant",attribute:"Charisma"},
  {id:"science",label:"Science Assistant",attribute:"Intelligence"},
  {id:"supply",label:"Supply Runner",attribute:"Agility"},
  {id:"gambler",label:"Gambler",attribute:"Luck"},
];
