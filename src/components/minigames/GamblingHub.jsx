import React, { useMemo, useState } from "react";
import "./gambling.css";

const SUITS=["♠","♥","♦","♣"];
const RANKS=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RANK_VALUE={J:11,Q:12,K:13,A:14};
const RED=new Set(["♥","♦"]);

function makeDeck(){
  return SUITS.flatMap(suit=>RANKS.map(rank=>({suit,rank,id:suit+rank+"-"+Math.random().toString(36).slice(2)})));
}
function shuffle(cards){
  const copy=[...cards];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function cardValue(card){return card.rank==="A"?11:["K","Q","J"].includes(card.rank)?10:Number(card.rank);}
function blackjackValue(cards){
  let total=cards.reduce((sum,c)=>sum+cardValue(c),0),aces=cards.filter(c=>c.rank==="A").length;
  while(total>21&&aces>0){total-=10;aces--;}
  return total;
}
function pokerValue(rank){return Number(rank)||RANK_VALUE[rank]||0;}
function evaluatePoker(cards){
  const values=cards.map(c=>pokerValue(c.rank)).sort((a,b)=>b-a);
  const counts={}; values.forEach(v=>counts[v]=(counts[v]||0)+1);
  const groups=Object.entries(counts).map(([v,n])=>({v:Number(v),n})).sort((a,b)=>b.n-a.n||b.v-a.v);
  const flush=cards.every(c=>c.suit===cards[0].suit);
  const unique=[...new Set(values)];
  let straight=false,highStraight=values[0]||0;
  if(unique.length===5){
    if(unique[0]-unique[4]===4)straight=true;
    else if(JSON.stringify(unique)==="[14,5,4,3,2]"){straight=true;highStraight=5;}
  }
  let score=0,name="High Card",tie=[];
  if(straight&&flush){score=8;name="Straight Flush";tie=[highStraight];}
  else if(groups[0]?.n===4){score=7;name="Four of a Kind";tie=[groups[0].v,...values.filter(v=>v!==groups[0].v)];}
  else if(groups[0]?.n===3&&groups[1]?.n===2){score=6;name="Full House";tie=[groups[0].v,groups[1].v];}
  else if(flush){score=5;name="Flush";tie=values;}
  else if(straight){score=4;name="Straight";tie=[highStraight];}
  else if(groups[0]?.n===3){score=3;name="Three of a Kind";tie=[groups[0].v,...values.filter(v=>v!==groups[0].v)];}
  else if(groups[0]?.n===2&&groups[1]?.n===2){score=2;name="Two Pair";const ps=[groups[0].v,groups[1].v].sort((a,b)=>b-a);tie=[...ps,...values.filter(v=>!ps.includes(v))];}
  else if(groups[0]?.n===2){score=1;name="Pair";tie=[groups[0].v,...values.filter(v=>v!==groups[0].v)];}
  else tie=values;
  return {score,name,tie};
}
function comparePoker(a,b){
  const ea=evaluatePoker(a),eb=evaluatePoker(b);
  if(ea.score!==eb.score)return ea.score>eb.score?1:-1;
  for(let i=0;i<Math.max(ea.tie.length,eb.tie.length);i++){if((ea.tie[i]||0)!==(eb.tie[i]||0))return (ea.tie[i]||0)>(eb.tie[i]||0)?1:-1;}
  return 0;
}
function Card({card,hidden=false,selected=false,onClick}){
  return <button type="button" className={"gambling-card "+(RED.has(card?.suit)?"is-red ":"")+(selected?"is-selected":"")} onClick={onClick} disabled={!onClick}>
    {hidden?<span className="gambling-card-back">☢</span>:<><b>{card?.rank}</b><span>{card?.suit}</span></>}
  </button>;
}
function useWallet(form,setForm){
  const caps=Math.max(0,Number(form?.caps||0));
  const change=(delta)=>setForm?.(prev=>({...prev,caps:String(Math.max(0,Number(prev?.caps||0)+delta))}));
  return {caps,change};
}
function Stake({stake,setStake,caps}){
  return <div className="gambling-stake"><span>CAPS: <b>{caps}</b></span><label>BET <input type="number" min="1" max={Math.max(1,caps)} value={stake} onChange={e=>setStake(Math.max(1,Number(e.target.value)||1))}/></label></div>;
}

function Blackjack({form,setForm}){
  const {caps,change}=useWallet(form,setForm);const [stake,setStake]=useState(10);const [state,setState]=useState(null);
  const start=()=>{if(stake>caps)return;const deck=shuffle(makeDeck());change(-stake);setState({deck:deck.slice(4),player:[deck[0],deck[2]],dealer:[deck[1],deck[3]],done:false,message:""});};
  const settle=(s,msg,mult)=>{change(Math.floor(stake*mult));setState({...s,done:true,message:msg});};
  const hit=()=>setState(s=>{if(!s||s.done)return s;const card=s.deck[0],next={...s,deck:s.deck.slice(1),player:[...s.player,card]};if(blackjackValue(next.player)>21)return {...next,done:true,message:"BUST"};return next;});
  const stand=()=>setState(s=>{if(!s||s.done)return s;let dealer=[...s.dealer],deck=[...s.deck];while(blackjackValue(dealer)<17){dealer.push(deck.shift());}
    const pv=blackjackValue(s.player),dv=blackjackValue(dealer);const next={...s,dealer,deck};
    if(dv>21||pv>dv){change(stake*2);return {...next,done:true,message:"WIN"};}
    if(pv===dv){change(stake);return {...next,done:true,message:"PUSH"};}
    return {...next,done:true,message:"LOSE"};
  });
  const playerNatural=state&&!state.done&&state.player.length===2&&blackjackValue(state.player)===21;
  React.useEffect(()=>{if(playerNatural){const dealerNatural=blackjackValue(state.dealer)===21;change(dealerNatural?stake:Math.floor(stake*2.5));setState(s=>({...s,done:true,message:dealerNatural?"PUSH":"BLACKJACK"}));}},[playerNatural]);
  return <div className="gambling-game"><Stake stake={stake} setStake={setStake} caps={caps}/>{!state||state.done?<button className="pip-btn is-primary" onClick={start} disabled={stake>caps}>DEAL</button>:null}
    {state?<><div className="gambling-table"><h4>DEALER · {state.done?blackjackValue(state.dealer):"?"}</h4><div className="gambling-cards">{state.dealer.map((c,i)=><Card card={c} hidden={!state.done&&i===1} key={c.id}/>)}</div><h4>YOU · {blackjackValue(state.player)}</h4><div className="gambling-cards">{state.player.map(c=><Card card={c} key={c.id}/>)}</div></div>
    {!state.done?<div className="gambling-actions"><button className="pip-btn" onClick={hit}>HIT</button><button className="pip-btn" onClick={stand}>STAND</button></div>:<div className="gambling-result">{state.message}</div>}</>:null}</div>;
}

function Roulette({form,setForm}){
  const {caps,change}=useWallet(form,setForm);const [stake,setStake]=useState(10);const [bet,setBet]=useState("red");const [number,setNumber]=useState(7);const [result,setResult]=useState(null);
  const spin=()=>{if(stake>caps)return;change(-stake);const n=Math.floor(Math.random()*37);const redNums=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);const color=n===0?"green":redNums.has(n)?"red":"black";let win=false,payout=0;
    if(bet==="red"||bet==="black"){win=color===bet;payout=2;} else if(bet==="odd"){win=n>0&&n%2===1;payout=2;} else if(bet==="even"){win=n>0&&n%2===0;payout=2;} else if(bet==="low"){win=n>=1&&n<=18;payout=2;} else if(bet==="high"){win=n>=19&&n<=36;payout=2;} else {win=n===number;payout=36;}
    if(win)change(stake*payout);setResult({n,color,win,payout});};
  return <div className="gambling-game"><Stake stake={stake} setStake={setStake} caps={caps}/><div className="roulette-bets">{["red","black","odd","even","low","high","number"].map(x=><button className={"pip-btn "+(bet===x?"is-primary":"")} onClick={()=>setBet(x)} key={x}>{x.toUpperCase()}</button>)}</div>{bet==="number"?<input className="pip-input" type="number" min="0" max="36" value={number} onChange={e=>setNumber(Math.max(0,Math.min(36,Number(e.target.value)||0)))}/>:null}<button className="pip-btn is-primary" onClick={spin} disabled={stake>caps}>SPIN</button>{result?<div className={"roulette-result is-"+result.color}><strong>{result.n}</strong><span>{result.color.toUpperCase()} · {result.win?"WIN":"LOSE"}</span></div>:null}</div>;
}

function Craps({form,setForm}){
  const {caps,change}=useWallet(form,setForm);const [stake,setStake]=useState(10);const [point,setPoint]=useState(null);const [active,setActive]=useState(false);const [last,setLast]=useState(null);const [message,setMessage]=useState("");
  const newRound=()=>{if(stake>caps)return;change(-stake);setPoint(null);setActive(true);setLast(null);setMessage("COME-OUT ROLL");};
  const roll=()=>{if(!active)return;const dice=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)],sum=dice[0]+dice[1];setLast(dice);
    if(point===null){if([7,11].includes(sum)){change(stake*2);setActive(false);setMessage("NATURAL · WIN");}else if([2,3,12].includes(sum)){setActive(false);setMessage("CRAPS · LOSE");}else{setPoint(sum);setMessage("POINT "+sum);}}
    else if(sum===point){change(stake*2);setActive(false);setMessage("MADE THE POINT · WIN");}else if(sum===7){setActive(false);setMessage("SEVEN OUT · LOSE");}else setMessage("POINT "+point);
  };
  return <div className="gambling-game"><Stake stake={stake} setStake={setStake} caps={caps}/>{!active?<button className="pip-btn is-primary" onClick={newRound} disabled={stake>caps}>NEW PASS LINE</button>:<button className="pip-btn is-primary" onClick={roll}>ROLL 2D6</button>}<div className="craps-dice">{last?.map((d,i)=><b key={i}>{d}</b>)}</div><div className="gambling-result">{message}</div></div>;
}

function Poker({form,setForm}){
  const {caps,change}=useWallet(form,setForm);const [stake,setStake]=useState(10);const [state,setState]=useState(null);const [selected,setSelected]=useState([]);
  const deal=()=>{if(stake>caps)return;change(-stake);const d=shuffle(makeDeck());setState({player:d.slice(0,5),dealer:d.slice(5,10),deck:d.slice(10),done:false,message:"",drawn:false});setSelected([]);};
  const draw=()=>setState(s=>{if(!s||s.drawn)return s;let deck=[...s.deck];const player=s.player.map((c,i)=>selected.includes(i)?deck.shift():c);
    const evalDealer=evaluatePoker(s.dealer);let dealer=[...s.dealer];if(evalDealer.score<1){dealer=dealer.map((c,i)=>pokerValue(c.rank)<11&&i<3?deck.shift():c);}else if(evalDealer.score===1){const pair=evalDealer.tie[0];dealer=dealer.map(c=>pokerValue(c.rank)!==pair&&pokerValue(c.rank)<11?deck.shift():c);}
    const cmp=comparePoker(player,dealer);if(cmp>0)change(stake*2);else if(cmp===0)change(stake);return {...s,player,dealer,deck,done:true,drawn:true,message:cmp>0?"WIN":cmp<0?"LOSE":"PUSH"};});
  return <div className="gambling-game"><Stake stake={stake} setStake={setStake} caps={caps}/>{!state||state.done?<button className="pip-btn is-primary" onClick={deal} disabled={stake>caps}>DEAL 5</button>:null}{state?<><h4>DEALER · {state.done?evaluatePoker(state.dealer).name:"Hidden"}</h4><div className="gambling-cards">{state.dealer.map((c,i)=><Card card={c} hidden={!state.done} key={c.id}/>)}</div><h4>YOU · {evaluatePoker(state.player).name}</h4><div className="gambling-cards">{state.player.map((c,i)=><Card card={c} selected={selected.includes(i)} onClick={!state.done?()=>setSelected(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i]):null} key={c.id}/>)}</div>{!state.done?<><small>Select cards to replace.</small><button className="pip-btn is-primary" onClick={draw}>DRAW {selected.length||0}</button></>:<div className="gambling-result">{state.message}</div>}</>:null}</div>;
}

function caravanDeck(){return shuffle(SUITS.flatMap(s=>Array.from({length:10},(_,i)=>({suit:s,rank:String(i+1),value:i+1,id:s+(i+1)+"-"+Math.random()}))));}
function laneScore(cards){return cards.reduce((sum,c)=>sum+c.value,0);}
function laneSold(player,ai){const p=laneScore(player),a=laneScore(ai),pok=p>=21&&p<=26,aok=a>=21&&a<=26;if(pok&&!aok)return "player";if(aok&&!pok)return "ai";if(pok&&aok&&p!==a)return p>a?"player":"ai";return null;}
function Caravan({form,setForm}){
  const {caps,change}=useWallet(form,setForm);const [stake,setStake]=useState(10);const [state,setState]=useState(null);const [message,setMessage]=useState("");
  const start=()=>{if(stake>caps)return;change(-stake);const d=caravanDeck();setState({deck:d.slice(16),hand:d.slice(0,8),aiHand:d.slice(8,16),p:[[],[],[]],a:[[],[],[]],turn:"player",done:false});setMessage("");};
  const resolve=(s)=>{const sold=[0,1,2].map(i=>laneSold(s.p[i],s.a[i]));const pw=sold.filter(x=>x==="player").length,aw=sold.filter(x=>x==="ai").length;if(pw>=2||aw>=2){if(pw>aw)change(stake*2);return {...s,done:true,winner:pw>aw?"WIN":"LOSE"};}return s;};
  const aiTurn=(s)=>{let hand=[...s.aiHand],a=s.a.map(x=>[...x]),deck=[...s.deck];let best=null;for(let hi=0;hi<hand.length;hi++)for(let lane=0;lane<3;lane++){const next=laneScore(a[lane])+hand[hi].value;if(next<=26){const score=(next>=21?100:0)+next;if(!best||score>best.score)best={hi,lane,score};}}
    if(best){a[best.lane].push(hand[best.hi]);hand.splice(best.hi,1);if(deck.length)hand.push(deck.shift());}return resolve({...s,a,aiHand:hand,deck,turn:"player"});};
  const play=(hi,lane)=>setState(s=>{if(!s||s.done||s.turn!=="player")return s;const card=s.hand[hi];if(laneScore(s.p[lane])+card.value>26)return s;let hand=[...s.hand],p=s.p.map(x=>[...x]),deck=[...s.deck];p[lane].push(card);hand.splice(hi,1);if(deck.length)hand.push(deck.shift());let next=resolve({...s,p,hand,deck,turn:"ai"});if(!next.done)next=aiTurn(next);return next;});
  return <div className="gambling-game"><Stake stake={stake} setStake={setStake} caps={caps}/>{!state||state.done?<button className="pip-btn is-primary" onClick={start} disabled={stake>caps}>START CARAVAN</button>:null}{state?<><div className="caravan-board">{[0,1,2].map(i=><div className="caravan-lane" key={i}><div><small>AI</small><strong>{laneScore(state.a[i])}</strong><div className="caravan-stack">{state.a[i].map(c=><span key={c.id}>{c.rank}{c.suit}</span>)}</div></div><div className={"caravan-sold "+(laneSold(state.p[i],state.a[i])||"")}>{laneSold(state.p[i],state.a[i])||"—"}</div><div><small>YOU</small><strong>{laneScore(state.p[i])}</strong><div className="caravan-stack">{state.p[i].map(c=><span key={c.id}>{c.rank}{c.suit}</span>)}</div></div></div>)}</div>{!state.done?<div className="caravan-hand">{state.hand.map((c,hi)=><div key={c.id}><Card card={c}/><div className="caravan-play-buttons">{[0,1,2].map(l=><button className="pip-btn" key={l} disabled={laneScore(state.p[l])+c.value>26} onClick={()=>play(hi,l)}>→ {l+1}</button>)}</div></div>)}</div>:<div className="gambling-result">{state.winner}</div>}</>:null}</div>;
}

export default function GamblingHub({form,setForm}){
  const [game,setGame]=useState("blackjack");
  const tabs=[["blackjack","Blackjack"],["roulette","Roulette"],["craps","Craps"],["poker","Poker"],["caravan","Caravan"]];
  return <section className="gambling-hub"><div className="gambling-tabs">{tabs.map(([id,label])=><button className={"pip-btn "+(game===id?"is-primary":"")} onClick={()=>setGame(id)} key={id}>{label}</button>)}</div>{game==="blackjack"?<Blackjack form={form} setForm={setForm}/>:game==="roulette"?<Roulette form={form} setForm={setForm}/>:game==="craps"?<Craps form={form} setForm={setForm}/>:game==="poker"?<Poker form={form} setForm={setForm}/>:<Caravan form={form} setForm={setForm}/>}</section>;
}
