const SKILL_NAMES = ['Repair','Science','Medicine','Survival','Barter','Small Guns'];

export const SETTLER_PERKS = {
  scrapper: {
    id:'scrapper',
    name:{en:'Scrapper',ru:'Сборщик',uk:'Збирач',pl:'Złomiarz'},
    summary:{en:'+1 Common Material when scavenging.',ru:'+1 обычный материал при поиске припасов.',uk:'+1 звичайний матеріал під час пошуку припасів.',pl:'+1 materiał pospolity podczas zbierania złomu.'},
  },
  green_thumb: {
    id:'green_thumb',
    name:{en:'Green Thumb',ru:'Зелёный палец',uk:'Зелений палець',pl:'Zielony kciuk'},
    summary:{en:'+1 Food when tending crops.',ru:'+1 еда при работе на посевах.',uk:'+1 їжа під час догляду за посівами.',pl:'+1 żywność przy uprawie roślin.'},
  },
  trader: {
    id:'trader',
    name:{en:'Trader',ru:'Торговец',uk:'Торговець',pl:'Handlarz'},
    summary:{en:'+1 Caps income from staffed stores.',ru:'+1 крышка дохода от магазина.',uk:'+1 кришка доходу від крамниці.',pl:'+1 kapsel dochodu ze sklepu.'},
  },
  sentry: {
    id:'sentry',
    name:{en:'Sentry',ru:'Часовой',uk:'Вартовий',pl:'Wartownik'},
    summary:{en:'+1 Defense while guarding.',ru:'+1 защита при работе охранником.',uk:'+1 захист під час варти.',pl:'+1 Obrony podczas warty.'},
  },
  builder: {
    id:'builder',
    name:{en:'Builder',ru:'Строитель',uk:'Будівельник',pl:'Budowniczy'},
    summary:{en:'Builds 25% faster.',ru:'Строит на 25% быстрее.',uk:'Будує на 25% швидше.',pl:'Buduje o 25% szybciej.'},
  },
  mechanic: {
    id:'mechanic',
    name:{en:'Mechanic',ru:'Механик',uk:'Механік',pl:'Mechanik'},
    summary:{en:'Repairs 10 extra condition per day.',ru:'Ремонтирует на 10% состояния больше за день.',uk:'Відновлює на 10% стану більше за день.',pl:'Naprawia o 10% stanu więcej dziennie.'},
  },
  medic: {
    id:'medic',
    name:{en:'Medic',ru:'Медик',uk:'Медик',pl:'Medyk'},
    summary:{en:'Improves settlement medical work.',ru:'Улучшает медицинскую работу поселения.',uk:'Покращує медичну роботу поселення.',pl:'Poprawia pracę medyczną osady.'},
  },
  hunter: {
    id:'hunter',
    name:{en:'Hunter',ru:'Охотник',uk:'Мисливець',pl:'Myśliwy'},
    summary:{en:'+1 Combat Die when hunting & gathering.',ru:'+1 БК при охоте и собирательстве.',uk:'+1 БК під час полювання та збиральництва.',pl:'+1 kość obrażeń podczas polowania i zbieractwa.'},
  },
};

const ARCHETYPES = [
  { specialty:'Repair', skills:{Repair:3,Science:1,Survival:1}, perks:['builder','mechanic'] },
  { specialty:'Survival', skills:{Survival:3,'Small Guns':1,Repair:1}, perks:['hunter','green_thumb'] },
  { specialty:'Barter', skills:{Barter:3,Survival:1,Medicine:1}, perks:['trader'] },
  { specialty:'Science', skills:{Science:3,Repair:2,Medicine:1}, perks:['mechanic'] },
  { specialty:'Medicine', skills:{Medicine:3,Science:1,Survival:1}, perks:['medic'] },
  { specialty:'Small Guns', skills:{'Small Guns':3,Survival:2,Repair:1}, perks:['sentry'] },
  { specialty:'Scavenger', skills:{Repair:2,Survival:2,Barter:1}, perks:['scrapper'] },
];

function randomRank(base=0){
  const roll=Math.random();
  if(roll>0.92)return Math.min(4,base+1);
  if(roll<0.18)return Math.max(0,base-1);
  return base;
}

export function createSettlerProfile(){
  const base=ARCHETYPES[Math.floor(Math.random()*ARCHETYPES.length)];
  const skills={};
  for(const name of SKILL_NAMES) skills[name]={rank:randomRank(Number(base.skills?.[name]||0))};
  const perkPool=[...new Set([...(base.perks||[]),...Object.keys(SETTLER_PERKS)])];
  const perks=[...(base.perks||[])];
  if(Math.random()>0.55){
    const extra=perkPool[Math.floor(Math.random()*perkPool.length)];
    if(extra && !perks.includes(extra))perks.push(extra);
  }
  return {specialty:base.specialty,skills,perks:perks.slice(0,2),level:1,experience:0};
}

export function settlerSkillRank(settler,skill){
  return Math.max(0,Number(settler?.skills?.[skill]?.rank || 0));
}

export function settlerHasPerk(settler,perk){
  return Array.isArray(settler?.perks) && settler.perks.includes(perk);
}

export function settlerActionBonus(settler,action){
  const map={
    hunting_gathering:['Survival','hunter'],
    scavenging:['Repair','scrapper'],
    guard:['Small Guns','sentry'],
    tend_crops:['Survival','green_thumb'],
    business:['Barter','trader'],
    trade_caravan:['Barter','trader'],
    build:['Repair','builder'],
    repair:['Repair','mechanic'],
  };
  const [skill,perk]=map[action]||[];
  const skillBonus=skill ? Math.floor(settlerSkillRank(settler,skill)/2) : 0;
  return {skill:skill||'',rank:skill ? settlerSkillRank(settler,skill) : 0,perk:perk||'',skillBonus,hasPerk:perk ? settlerHasPerk(settler,perk) : false};
}

export function settlerProfileLabel(settler,language='en'){
  const key=String(language||'en').split('-')[0];
  const top=Object.entries(settler?.skills||{}).sort((a,b)=>Number(b[1]?.rank||0)-Number(a[1]?.rank||0)).slice(0,3).map(([name,data])=>`${name} ${Number(data?.rank||0)}`);
  const perks=(settler?.perks||[]).map(id=>SETTLER_PERKS[id]?.name?.[key]||SETTLER_PERKS[id]?.name?.en||id);
  return [settler?.specialty,...top,...perks].filter(Boolean).join(' · ');
}
