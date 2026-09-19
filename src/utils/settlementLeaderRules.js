const normalized=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_+$/g,'');
const number=value=>Math.max(0,Number(value)||0);

export function settlementPerkRank(character,name){
  const target=normalized(name);
  return Math.max(0,...(character?.perksAndTraits||[])
    .filter(perk=>!perk?.isOriginTrait&&[perk?.id,perk?.name].some(value=>normalized(value)===target))
    .map(perk=>Math.max(1,Math.floor(number(perk.rank||1)))));
}

export function settlementLeaderProfile(character){
  return {
    charisma:Math.max(0,Math.min(10,number(character?.special?.charisma ?? character?.special?.CHA))),
    communityOrganizerRank:settlementPerkRank(character,'Community Organizer'),
    contractorRank:settlementPerkRank(character,'Contractor'),
    localLeaderRank:settlementPerkRank(character,'Local Leader'),
  };
}

export function applySettlementLeaderProfile(settlement,character){
  const profile=settlementLeaderProfile(character);
  return {
    ...settlement,
    leader:{...(settlement.leader||{}),...profile},
    leaderRuleProfile:profile,
  };
}

export function contractorConstructionRule(rule,character,mode='normal'){
  if(!rule)return null;
  const rank=settlementPerkRank(character,'Contractor');
  if(rank<1||!['cheap','careful'].includes(mode))return {...rule,contractorMode:'normal',happinessPenalty:0};
  const materials=Object.fromEntries(Object.entries(rule.materials||{}).map(([key,value])=>{
    const amount=Math.max(0,Math.floor(Number(value)||0));
    return [key,amount?Math.max(1,Math.ceil(amount/2)):0];
  }));
  return {
    ...rule,
    materials,
    constructionDays:mode==='careful'?Math.max(1,Number(rule.constructionDays||1)*2):Math.max(1,Number(rule.constructionDays||1)),
    contractorMode:mode,
    happinessPenalty:mode==='cheap'?2:0,
  };
}
