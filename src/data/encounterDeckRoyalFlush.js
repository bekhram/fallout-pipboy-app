const SUITS = ["clubs","hearts","spades","diamonds"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

export const ENCOUNTER_SUIT_META = {
  clubs:{symbol:"♣",label:"Creatures",kind:"creature"},
  hearts:{symbol:"♥",label:"Raiders",kind:"creature"},
  spades:{symbol:"♠",label:"Environment",kind:"hazard"},
  diamonds:{symbol:"♦",label:"People",kind:"creature"},
};

const C = (rank,title,description,groups=[])=>({rank,suit:"clubs",title,description,groups});
const H = (rank,title,description,groups=[])=>({rank,suit:"hearts",title,description,groups});
const S = (rank,title,description,effect="")=>({rank,suit:"spades",title,description,effect});
const D = (rank,title,description,groups=[])=>({rank,suit:"diamonds",title,description,groups});

export const ROYAL_FLUSH_ENCOUNTER_CARDS = [
  C("2","Radroaches","A swarm of radroaches overruns the area.",[{name:"Radroach",count:"4+4CD"}]),
  C("3","Molerats","Molerats burst from loose ground and debris.",[{name:"Molerat",count:"2+2CD"}]),
  C("4","Bloatflies","Bloatflies circle the battlefield.",[{name:"Bloatfly",count:"2+2CD"}]),
  C("5","Bloatflies","A larger cloud of bloatflies arrives.",[{name:"Bloatfly",count:"3+3CD"}]),
  C("6","Mongrel Hounds","A hungry pack closes in.",[{name:"Mongrel Hound",count:"2+2CD"}]),
  C("7","Mongrel Hounds","A large mongrel pack claims the area.",[{name:"Mongrel Hound",count:"3+3CD"}]),
  C("8","Bloodbugs","Bloodbugs descend on exposed targets.",[{name:"Bloodbug",count:"1+2CD"}]),
  C("9","Bloodbugs","A dangerous bloodbug swarm approaches.",[{name:"Bloodbug",count:"2+3CD"}]),
  C("10","Radscorpion","A radscorpion stalks the battlefield.",[{name:"Radscorpion",count:1}]),
  C("J","Radscorpions","More than one radscorpion is hunting here.",[{name:"Radscorpion",count:"1+1CD"}]),
  C("Q","Deathclaw","A Deathclaw enters the scene.",[{name:"Deathclaw",count:1}]),
  C("K","Yao Guai","A Yao Guai claims the area.",[{name:"Yao Guai",count:1}]),

  H("2","Raiders","A small Raider group arrives.",[{name:"Raider",count:"3+3CD"}]),
  H("3","Raiders","A larger Raider group arrives.",[{name:"Raider",count:"4+4CD"}]),
  H("4","Raiders & Hounds","Raiders arrive with mongrel hounds.",[{name:"Raider",count:"3+2CD"},{name:"Mongrel Hound",count:"2+2CD"}]),
  H("5","Raider Psycho","A Raider Psycho charges into the scene.",[{name:"Raider Psycho",count:1}]),
  H("6","Raider Scavver","A Raider Scavver is working the area.",[{name:"Raider Scavver",count:1}]),
  H("7","Raider Psycho & Raiders","A Psycho leads a Raider group.",[{name:"Raider Psycho",count:1},{name:"Raider",count:"2+2CD"}]),
  H("8","Raider Scavver & Raiders","A Scavver leads a Raider group.",[{name:"Raider Scavver",count:1},{name:"Raider",count:"2+2CD"}]),
  H("9","Raider Psychos","Several Psychos are looking for trouble.",[{name:"Raider Psycho",count:"1+1CD"}]),
  H("10","Raider Scavvers","Several Raider Scavvers arrive.",[{name:"Raider Scavver",count:"1+1CD"}]),
  H("J","Raider Veteran","A veteran Raider leads the assault.",[{name:"Raider Veteran",count:1},{name:"Raider",count:"2+2CD"}]),
  H("Q","Raider Veteran","A veteran Raider commands a large group.",[{name:"Raider Veteran",count:1},{name:"Raider",count:"3+3CD"}]),
  H("K","Raider Boss","A Raider Boss and gang enter the scene.",[{name:"Raider Boss",count:1},{name:"Raider",count:"3+3CD"}]),

  S("2","Standing Water","Pools of dirty water occupy one or more zones.","Treat affected zones as difficult terrain."),
  S("3","Cloudburst","Sudden heavy rain lashes the area.","Heavy rain changes visibility and footing."),
  S("4","Smoke or Fog","Smoke or fog moves across several zones.","Occupied zones obstruct sight; the cloud can move each round."),
  S("5","Toxic Chemical Spill","A toxic spill covers one or two adjacent zones.","Creatures in the spill suffer 2 CD Poison damage."),
  S("6","Minor Rad Source","One or two zones contain a radiation source.","Creatures in those zones suffer 2 CD Piercing 1 Radiation damage."),
  S("7","Irradiated Water","Irradiated water covers one or two zones.","Difficult terrain; creatures inside suffer 2 CD Persistent Radiation damage."),
  S("8","Radstorm","A radiation storm sweeps the battlefield.","Characters in the open suffer 2 CD Radiation damage at the start of each turn."),
  S("9","Sandstorm","A violent sandstorm reduces visibility.","No sight beyond Close without shelter; exposed creatures suffer 2 CD Piercing 1 Spread Physical damage each turn."),
  S("10","Frag Minefield","Frag mines cover one or two zones.","One or two zones contain Frag Mines."),
  S("J","Plasma Minefield","Plasma mines have been laid here.","One or two zones contain 1+2 CD Plasma Mines."),
  S("Q","Rad Sandstorm","A radioactive sandstorm engulfs the scene.","Sight is limited; exposed creatures suffer Physical and Radiation damage."),
  S("K","Bomb Crater","A heavily irradiated crater dominates the area.","One zone deals 5 CD Radiation; adjacent zones deal 2 CD Radiation."),

  D("2","Travelers","A group of wasteland travelers enters the scene.",[{name:"Wastelander",count:"3+3CD"}]),
  D("3","Scavengers","Scavengers are searching the area.",[{name:"Scavenger",count:"2+2CD"}]),
  D("4","Mercenary Band","A band of mercenaries arrives.",[{name:"Mercenary",count:"2+2CD"}]),
  D("5","Eyebot","An Eyebot floats into the area.",[{name:"Eyebot",count:1}]),
  D("6","Traveling Trader","A trader and brahmin cross the scene.",[{name:"Trader",count:1},{name:"Brahmin",count:1}]),
  D("7","Feral Ghoul Pack","A pack of feral ghouls moves through the area.",[{name:"Feral Ghoul",count:"3+3CD"},{name:"Glowing One",count:"1CD"}]),
  D("8","Roaming Robot","A combat robot patrols the area.",[{name:"Assaultron",count:1,alternatives:["Mr. Gutsy"]}]),
  D("9","NCR Patrol","An NCR patrol arrives.",[{name:"NCR Sergeant",count:1},{name:"NCR Trooper",count:"3+2CD"}]),
  D("10","Super Mutant Band","A band of Super Mutants crosses the scene.",[{name:"Super Mutant",count:"2+2CD"},{name:"Super Mutant Brute",count:"1CD"}]),
  D("J","Brotherhood Expedition","A Brotherhood expedition enters the scene.",[{name:"Paladin",count:1},{name:"Knight",count:"1+1CD"},{name:"Scribe",count:"1+1CD"}]),
  D("Q","Legion Scouts","Legion scouts appear.",[{name:"Veteran Legionary",count:1},{name:"Recruit Legionary",count:"3+3CD"}]),
  D("K","Caravan","A guarded caravan crosses the scene.",[{name:"Caravan Boss",count:1},{name:"Caravan Guard",count:"2+2CD"},{name:"Brahmin",count:"3+1CD"}]),
];

for(const suit of SUITS){
  ROYAL_FLUSH_ENCOUNTER_CARDS.unshift({rank:"A",suit,title:"Ace — Wild",description:"Use this Ace as another drawn card of the same suit, or choose any result from this suit.",wild:true});
}

export function buildEncounterDeck(){
  return ROYAL_FLUSH_ENCOUNTER_CARDS.map((card,index)=>({...card,id:`${card.suit}-${card.rank}-${index}`}));
}

function cdFace(){
  const roll=1+Math.floor(Math.random()*6);
  return [1,2,0,0,1,1][roll-1];
}

export function rollEncounterCount(expr){
  if(Number.isFinite(Number(expr)))return Math.max(0,Math.floor(Number(expr)));
  const text=String(expr||"").trim().toUpperCase();
  const simple=text.match(/^(\d+)CD$/);
  if(simple){
    let total=0;for(let i=0;i<Number(simple[1]);i++)total+=cdFace();return total;
  }
  const mixed=text.match(/^(\d+)\+(\d+)CD$/);
  if(mixed){
    let total=Number(mixed[1]);for(let i=0;i<Number(mixed[2]);i++)total+=cdFace();return total;
  }
  return 1;
}

export function encounterCardLabel(card){
  const meta=ENCOUNTER_SUIT_META[card?.suit]||{};
  return `${card?.rank||"?"}${meta.symbol||""} ${card?.title||"Encounter"}`;
}

export function encounterSummary(cards=[]){
  const enemies=[];const hazards=[];
  for(const card of cards){
    if(card.suit==="spades") hazards.push(card.title);
    else for(const group of card.groups||[]) enemies.push(group.name);
  }
  return {enemies:[...new Set(enemies)],hazards:[...new Set(hazards)]};
}
