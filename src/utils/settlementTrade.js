import { provisions } from './settlementProvisions.js';
export function merchantPresent(s) {
 return s.trade?.merchantDay===(s.settlementDay||1)||(s.settlementDay%7===0&&(s.buildings||[]).some(b=>b.type==='caravan_post'&&b.state==='active'&&Number(b.condition??100)>0));
}
function roll(count,rng) {const rolls=Array.from({length:count},()=>1+Math.floor(rng()*6));return {rolls,total:rolls.reduce((sum,d)=>sum+(d===2?2:d===1||d>=5?1:0),0)};}
export function tradeCommand(s,c,actor,now=Date.now(),rng=Math.random) {
 if(c.type==='merchant') {
  if(!actor?.isGM)throw new Error('FORBIDDEN');
  return {...s,trade:{...s.trade,merchantDay:s.settlementDay||1}};
 }
 if(!actor?.isGM&&reputationRank(s,actor?.id)===0)throw new Error('FORBIDDEN');
 if(!merchantPresent(s))throw new Error('NO_MERCHANT');
 const n=c.quantity,key=c.resource;
 if(!['food','water'].includes(key)||!Number.isSafeInteger(n)||n<1||n>100)throw new Error('INVALID_TRADE');
 const trade={...s.trade},stored=provisions(s.stockpile),income=Number(trade.income||0);
 let dice;
 if(c.type==='tradeSell') {
  // App adaptation: sell stored surplus, not an already consumed daily score.
  if(stored[key]<n)throw new Error('insufficient');
  dice=roll(n,rng);stored[key]-=n;trade.income=income+1+dice.total;
 } else if(c.type==='tradeBuy') {
  if(income<n)throw new Error('insufficient');
  dice=roll(n,rng);trade.income=income-n;
  trade.supplies={...trade.supplies,[key]:Number(trade.supplies?.[key]||0)+Math.max(1,dice.total)};
 } else throw new Error('INVALID_COMMAND');
 const entry={type:c.type,resource:key,quantity:n,rolls:dice.rolls,total:dice.total,actorId:actor?.id,createdAt:now};
 trade.history=[entry,...(trade.history||[])].slice(0,50);
 return {...s,trade,stockpile:{...s.stockpile,provisions:stored}};
}
export function useTradeSupply(s,key) {
 if(!['food','water'].includes(key)||!(Number(s.trade?.supplies?.[key])>=1))throw new Error('insufficient');
 return {...s,trade:{...s.trade,supplies:{...s.trade.supplies,[key]:s.trade.supplies[key]-1}},nextDaySupplies:{...s.nextDaySupplies,[key]:Number(s.nextDaySupplies?.[key]||0)+1}};
}
export function reputationRank(s,id) {return s.reputation?.[id]?.rank??(id===(s.access?.ownerId||s.ownerCharacterId)?3:2);}
export function reputationCommand(s,c,actor,now=Date.now()) {
 if(!actor?.isGM)throw new Error('FORBIDDEN');
 if(typeof c.memberId!=='string'||!c.memberId||['__proto__','constructor','prototype'].includes(c.memberId)||!Number.isInteger(c.rank)||c.rank<0||c.rank>5||typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>300)throw new Error('INVALID_REPUTATION');
 const previous=reputationRank(s,c.memberId);
 return {...s,reputation:{...s.reputation,[c.memberId]:{rank:c.rank}},reputationHistory:[{memberId:c.memberId,previous,rank:c.rank,reason:c.reason.trim(),actorId:actor.id,createdAt:now},...(s.reputationHistory||[])].slice(0,50)};
}
