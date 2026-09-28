
import React,{useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {buildEncounterDeck,ENCOUNTER_SUIT_META,encounterCardLabel,encounterSummary,rollEncounterCount} from "../../data/encounterDeckRoyalFlush.js";
import cardBack from "../../assets/encounterDeck/card-back.svg";
import {getBestiaryTokenUrl} from "../../utils/bestiaryTokens.js";
import "./encounterDeckDrawer.css";

const COPY={
  en:{title:"ENCOUNTER DECK",draw:"DRAW",cards:"Cards",region:"Region",stage:"Stage",add:"ADD CARD",apply:"ADD TO MAP",discard:"DISCARD",history:"HISTORY",summary:"GENERATED ENCOUNTER",empty:"Draw cards to create an encounter.",hazards:"Hazards",enemies:"Enemies",remaining:"Remaining",reset:"RESET"},
  ru:{title:"КОЛОДА ВСТРЕЧ",draw:"ВЫТЯНУТЬ",cards:"Карты",region:"Регион",stage:"Этап",add:"ЕЩЁ КАРТА",apply:"ДОБАВИТЬ НА КАРТУ",discard:"СБРОСИТЬ",history:"ИСТОРИЯ",summary:"СГЕНЕРИРОВАННАЯ ВСТРЕЧА",empty:"Вытяни карты, чтобы создать встречу.",hazards:"Опасности",enemies:"Противники",remaining:"Осталось",reset:"СБРОС"},
  uk:{title:"КОЛОДА ЗУСТРІЧЕЙ",draw:"ВИТЯГНУТИ",cards:"Карти",region:"Регіон",stage:"Етап",add:"ЩЕ КАРТА",apply:"ДОДАТИ НА МАПУ",discard:"СКИНУТИ",history:"ІСТОРІЯ",summary:"ЗГЕНЕРОВАНА ЗУСТРІЧ",empty:"Витягни карти, щоб створити зустріч.",hazards:"Небезпеки",enemies:"Вороги",remaining:"Залишилось",reset:"СКИНУТИ"},
  pl:{title:"TALIA SPOTKAŃ",draw:"DOBIERZ",cards:"Karty",region:"Region",stage:"Etap",add:"DODAJ KARTĘ",apply:"DODAJ NA MAPĘ",discard:"ODRZUĆ",history:"HISTORIA",summary:"WYGENEROWANE SPOTKANIE",empty:"Dobierz karty, aby utworzyć spotkanie.",hazards:"Zagrożenia",enemies:"Wrogowie",remaining:"Pozostało",reset:"RESET"}
};
function langCode(){const code=String(document?.documentElement?.lang||"en").toLowerCase().split("-")[0];return COPY[code]?code:"en";}
function shuffle(list){const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function normalizeName(v){return String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function bestiaryStats(e){return{hp:Number(e?.hp||e?.maxHp||1),maxHp:Number(e?.hp||e?.maxHp||1),defense:Number(e?.defense||1),initiative:Number(e?.initiative||0),level:Number(e?.level||0),xp:Number(e?.xp||0),attacks:String(e?.attacks||""),drBlock:String(e?.drBlock||e?.dr||""),creatureType:e?.creatureType||"",body:e?.body??"",mind:e?.mind??"",melee:e?.melee??"",guns:e?.guns??"",other:e?.other??"",skills:e?.skills??[],special:e?.special??null,abilities:e?.abilities||"",tactics:e?.tactics||"",loot:e?.loot||"",summary:e?.summary||"",source:e?.source||""};}

function EncounterCard({card,onReroll}){
  const meta=ENCOUNTER_SUIT_META[card.suit]||{};
  const [tokenUrl,setTokenUrl]=useState("");
  useEffect(()=>{let cancelled=false;if(card.suit==="spades"||card.wild){setTokenUrl("");return()=>{};}
    import("../../data/bestiary.js").then(async mod=>{const names=(card.groups||[]).flatMap(g=>[g.name,...(g.alternatives||[])]);const entry=mod.BESTIARY_ENTRIES.find(e=>names.some(name=>normalizeName(e.name)===normalizeName(name)));if(!entry)return;const url=await getBestiaryTokenUrl(entry.id).catch(()=> "");if(!cancelled)setTokenUrl(String(url||""));}).catch(()=>{});
    return()=>{cancelled=true;};},[card.id]);
  return <article className={"encounter-deck-card is-"+card.suit}>
    <header><b>{card.rank}{meta.symbol}</b><span>{card.title}</span><button type="button" onClick={onReroll}>↻</button></header>
    <div className="encounter-deck-card__art">{tokenUrl?<img src={tokenUrl} alt="" draggable={false}/>:<span className="encounter-deck-card__glyph">{meta.symbol}</span>}</div>
    <p>{card.description}</p>{card.effect?<small>{card.effect}</small>:null}
    {(card.groups||[]).length?<div className="encounter-deck-card__groups">{card.groups.map((g,i)=><span key={i}>{String(g.count)} × {g.name}</span>)}</div>:null}
  </article>;
}

export default function EncounterDeckDrawer({session,container}){
  const scene=session?.tacticalScene||null;
  const text=COPY[langCode()]||COPY.en;
  const persisted=scene?.encounterDeck||{};
  const [open,setOpen]=useState(false);
  const [drawCount,setDrawCount]=useState(2);
  const [region,setRegion]=useState("Mojave");
  const [stage,setStage]=useState("Mid");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [deck,setDeck]=useState(()=>persisted.deck?.length?persisted.deck:shuffle(buildEncounterDeck()));
  const [drawn,setDrawn]=useState(()=>persisted.drawn||[]);
  const [discard,setDiscard]=useState(()=>persisted.discard||[]);
  const [history,setHistory]=useState(()=>persisted.history||[]);
  useEffect(()=>{if(!scene?.sceneId)return;const state=scene.encounterDeck||{};setDeck(state.deck?.length?state.deck:shuffle(buildEncounterDeck()));setDrawn(state.drawn||[]);setDiscard(state.discard||[]);setHistory(state.history||[]);setMessage("");},[scene?.sceneId]);
  const summary=useMemo(()=>encounterSummary(drawn),[drawn]);
  const persist=async next=>{setDeck(next.deck);setDrawn(next.drawn);setDiscard(next.discard);setHistory(next.history);await session.updateTacticalScene?.({encounterDeck:{...next,region,stage,updatedAt:Date.now()}});};
  const drawCards=async(count=drawCount)=>{if(busy||drawn.length>=5)return;setBusy(true);try{let source=[...deck],nextDrawn=[...drawn],nextDiscard=[...discard];const needed=Math.min(count,5-nextDrawn.length);if(source.length<needed){source=shuffle([...source,...nextDiscard]);nextDiscard=[];}for(let i=0;i<needed&&source.length;i++)nextDrawn.push(source.shift());await persist({deck:source,drawn:nextDrawn,discard:nextDiscard,history:[{id:"draw-"+Date.now(),cards:nextDrawn.slice(-needed).map(encounterCardLabel),at:Date.now()},...history].slice(0,20)});}finally{setBusy(false);}};
  const rerollCard=async index=>{if(busy||!drawn[index])return;setBusy(true);try{let source=[...deck];if(!source.length)source=shuffle([...discard]);if(!source.length)return;const nextDrawn=[...drawn],old=nextDrawn[index];nextDrawn[index]=source.shift();await persist({deck:source,drawn:nextDrawn,discard:[old,...discard],history:[{id:"reroll-"+Date.now(),cards:[encounterCardLabel(old)+" → "+encounterCardLabel(nextDrawn[index])],at:Date.now()},...history].slice(0,20)});}finally{setBusy(false);}};
  const discardDrawn=()=>persist({deck,drawn:[],discard:[...drawn,...discard],history:[{id:"discard-"+Date.now(),cards:drawn.map(encounterCardLabel),at:Date.now()},...history].slice(0,20)});
  const resetDeck=()=>persist({deck:shuffle(buildEncounterDeck()),drawn:[],discard:[],history:[]});
  const addToMap=async()=>{if(!drawn.length||busy)return;setBusy(true);setMessage("");try{const mod=await import("../../data/bestiary.js");let added=0;for(const card of drawn){if(card.suit==="spades"||card.wild)continue;for(const group of card.groups||[]){const names=[group.name,...(group.alternatives||[])];const entry=mod.BESTIARY_ENTRIES.find(e=>names.some(name=>normalizeName(e.name)===normalizeName(name)));if(!entry)continue;const count=Math.min(12,Math.max(0,rollEncounterCount(group.count)));for(let i=0;i<count;i++){const response=await session.createNpcToken?.({name:entry.name,size:Number(entry?.size||entry?.footprint||1),npcId:entry.id,stats:bestiaryStats(entry)});const tokenId=response?.token?.id;if(tokenId&&session.moveToken){const cols=Math.max(1,Number(scene?.environment?.proceduralMapSpec?.cols||scene?.cols||24));const rows=Math.max(1,Number(scene?.environment?.proceduralMapSpec?.rows||scene?.rows||24));const x=Math.max(0,Math.min(cols-1,Math.floor(cols*(0.55+Math.random()*0.35))));const y=Math.max(0,Math.min(rows-1,Math.floor(rows*(0.12+Math.random()*0.72))));try{await session.moveToken(tokenId,x,y);}catch{}}added++;}}}
      const hazardCards=drawn.filter(card=>card.suit==="spades");const environment={...(scene.environment||{}),encounterDeckHazards:hazardCards.map(card=>({id:card.id,title:card.title,effect:card.effect,description:card.description}))};await session.updateTacticalScene?.({environment,encounterDeck:{deck,drawn,discard,history,region,stage,lastAppliedAt:Date.now()}});setMessage(added?("+"+added+" tokens"):(hazardCards.length?("+"+hazardCards.length+" hazards"):"Applied"));}catch(error){setMessage(error?.message||"ADD_TO_MAP_FAILED");}finally{setBusy(false);}};
  if(!container||!scene)return null;
  const portalTarget=typeof document!=="undefined"?document.body:container;
  return createPortal(<>
    <button type="button" className={"encounter-deck-rail"+(open?" is-open":"")} onClick={()=>setOpen(v=>!v)} aria-label={text.title} title={text.title}><span>🂠</span><b>{text.cards}</b>{drawn.length?<i>{drawn.length}</i>:null}</button>
    <aside className={"encounter-deck-drawer"+(open?" is-open":"")}>
      <header className="encounter-deck-drawer__head"><div><small>GM / BATTLEMAP</small><strong>{text.title}</strong></div><button type="button" onClick={()=>setOpen(false)}>×</button></header>
      <div className="encounter-deck-setup">
        <label><span>{text.region}</span><select value={region} onChange={e=>setRegion(e.target.value)}><option>Mojave</option><option>Sierra</option><option>Custom</option></select></label>
        <label><span>{text.stage}</span><select value={stage} onChange={e=>setStage(e.target.value)}><option>Early</option><option>Mid</option><option>Late</option></select></label>
        <div className="encounter-deck-count">{[1,2,3].map(n=><button type="button" className={drawCount===n?"is-active":""} onClick={()=>setDrawCount(n)} key={n}>{n}</button>)}</div>
        <button type="button" className="pip-btn is-primary" onClick={()=>drawCards()} disabled={busy||drawn.length>=5}>{text.draw} ({drawCount})</button>
      </div>
      <div className="encounter-deck-status"><span>{text.remaining}: <b>{deck.length}</b></span><span>Discard: <b>{discard.length}</b></span><button type="button" onClick={resetDeck}>{text.reset}</button></div>
      <div className="encounter-deck-cards">{drawn.length?drawn.map((card,index)=><EncounterCard card={card} key={card.id+"-"+index} onReroll={()=>rerollCard(index)}/>):<div className="encounter-deck-empty"><img src={cardBack} alt=""/><span>{text.empty}</span></div>}</div>
      {drawn.length?<section className="encounter-deck-summary"><strong>{text.summary}</strong>{summary.enemies.length?<p><b>{text.enemies}:</b> {summary.enemies.join(", ")}</p>:null}{summary.hazards.length?<p><b>{text.hazards}:</b> {summary.hazards.join(", ")}</p>:null}</section>:null}
      {message?<div className="encounter-deck-message">{message}</div>:null}
      <div className="encounter-deck-actions"><button type="button" className="pip-btn" onClick={()=>drawCards(1)} disabled={busy||drawn.length>=5}>＋ {text.add}</button><button type="button" className="pip-btn" onClick={discardDrawn} disabled={!drawn.length||busy}>{text.discard}</button><button type="button" className="pip-btn is-primary" onClick={addToMap} disabled={!drawn.length||busy}>{text.apply}</button></div>
      <details className="encounter-deck-history"><summary>{text.history} ({history.length})</summary>{history.map(item=><div key={item.id}><time>{new Date(item.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time><span>{item.cards.join(" · ")}</span></div>)}</details>
    </aside>
  </>,portalTarget);
}
