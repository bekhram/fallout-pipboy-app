import React, { useMemo, useState } from "react";
import { REPUTATION_RANKS } from "../../utils/winterOfAtomRules.js";
import "./settlementReputationPanel.css";

const STORAGE_KEY = "pip2d20_settlement_reputations_v1";
const WINTER_KEY = "pip2d20_winter_rules_v1";

const COPY = {
  en: { title:"SETTLEMENT REPUTATION", hint:"Reputation is tracked per settlement. Select a settlement to use its reputation for settlement tasks.", settlement:"Settlement", reputation:"Reputation", positive:"Positive", negative:"Negative", add:"ADD SETTLEMENT", remove:"REMOVE", active:"ACTIVE", empty:"No settlements tracked yet.", readOnly:"Reputation is managed by the GM on this device." },
  ru: { title:"РЕПУТАЦИЯ ПОСЕЛЕНИЙ", hint:"Репутация хранится отдельно для каждого поселения. Выбранное поселение используется в заданиях поселения.", settlement:"Поселение", reputation:"Репутация", positive:"Положительные", negative:"Отрицательные", add:"ДОБАВИТЬ ПОСЕЛЕНИЕ", remove:"УДАЛИТЬ", active:"АКТИВНО", empty:"Поселения пока не добавлены.", readOnly:"Репутацией управляет ГМ на этом устройстве." },
  uk: { title:"РЕПУТАЦІЯ ПОСЕЛЕНЬ", hint:"Репутація зберігається окремо для кожного поселення. Обране поселення використовується у завданнях поселення.", settlement:"Поселення", reputation:"Репутація", positive:"Позитивні", negative:"Негативні", add:"ДОДАТИ ПОСЕЛЕННЯ", remove:"ВИДАЛИТИ", active:"АКТИВНЕ", empty:"Поселення ще не додані.", readOnly:"Репутацією керує ГМ на цьому пристрої." },
  pl: { title:"REPUTACJA OSAD", hint:"Reputacja jest śledzona osobno dla każdej osady. Wybrana osada jest używana w zadaniach osady.", settlement:"Osada", reputation:"Reputacja", positive:"Pozytywne", negative:"Negatywne", add:"DODAJ OSADĘ", remove:"USUŃ", active:"AKTYWNA", empty:"Nie śledzisz jeszcze żadnych osad.", readOnly:"Reputacją zarządza MG na tym urządzeniu." },
};

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function normalizeRow(row, index=0) {
  return {
    id: String(row?.id || `settlement-${Date.now()}-${index}`),
    name: String(row?.name || row?.settlement || "Settlement"),
    rank: Math.max(0, Math.min(5, Number(row?.rank ?? 2))),
    positive: Math.max(0, Number(row?.positive || 0)),
    negative: Math.max(0, Number(row?.negative || 0)),
  };
}
function initialState() {
  const stored = safeRead(STORAGE_KEY, null);
  if (stored?.rows?.length) return { rows: stored.rows.map(normalizeRow), activeId: stored.activeId || stored.rows[0].id };
  const legacy = safeRead(WINTER_KEY, {});
  if (legacy?.rep?.settlement) {
    const row = normalizeRow({ id:"legacy-settlement", ...legacy.rep });
    return { rows:[row], activeId:row.id };
  }
  const row = normalizeRow({ id:"diamond-city", name:"Diamond City", rank:2 });
  return { rows:[row], activeId:row.id };
}
function rankInfo(rank) { return REPUTATION_RANKS.find(item => item.rank === Number(rank)) || REPUTATION_RANKS[2]; }

export default function SettlementReputationPanel({ language="en", readOnly=false, compact=false }) {
  const code = String(language || "en").split("-")[0];
  const text = COPY[code] || COPY.en;
  const initial = useMemo(initialState, []);
  const [rows, setRows] = useState(initial.rows);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [expanded,setExpanded]=useState(false);

  const persist = (nextRows, nextActiveId) => {
    setRows(nextRows);
    setActiveId(nextActiveId);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows:nextRows, activeId:nextActiveId }));
      const active = nextRows.find(row => row.id === nextActiveId) || nextRows[0];
      if (active) {
        const winter = safeRead(WINTER_KEY, {});
        window.localStorage.setItem(WINTER_KEY, JSON.stringify({
          ...winter,
          rep:{ ...(winter.rep || {}), settlement:active.name, rank:active.rank, positive:active.positive, negative:active.negative, rolls:"", last:null }
        }));
      }
    } catch {}
  };

  const update = (id, patch) => {
    const next = rows.map(row => row.id === id ? normalizeRow({ ...row, ...patch }) : row);
    persist(next, activeId || id);
  };
  const select = (id) => persist(rows, id);
  const add = () => {
    const row = normalizeRow({ id:`settlement-${Date.now()}`, name:"New settlement", rank:2 });
    persist([...rows, row], row.id);
  };
  const remove = (id) => {
    const next = rows.filter(row => row.id !== id);
    const nextActive = activeId === id ? (next[0]?.id || "") : activeId;
    persist(next, nextActive);
  };

  if(compact&&!expanded)return <section className="pip-panel settlement-reputation settlement-reputation--compact">
    <header className="settlement-reputation__header"><div><small>PIP / 2D20 // WORLD</small><h3>[ {text.title} ]</h3></div><button type="button" className="pip-btn" onClick={()=>setExpanded(true)}>→</button></header>
    <div className="settlement-reputation__compact-list">{rows.slice(0,3).map(row=>{const rank=rankInfo(row.rank);return <button type="button" key={row.id} className={row.id===activeId?"is-active":""} onClick={()=>select(row.id)}><strong>{row.name}</strong><span className={`settlement-reputation__rank rank-${row.rank}`}>{rank.label}</span></button>})}</div>
  </section>;
  return <section className="pip-panel settlement-reputation">
    <header className="settlement-reputation__header">
      <div><small>PIP / 2D20 // WORLD</small><h3>[ {text.title} ]</h3><p>{text.hint}</p></div>
      <div className="settlement-reputation__header-actions">{compact?<button type="button" className="pip-btn" onClick={()=>setExpanded(false)}>×</button>:null}{!readOnly ? <button type="button" className="pip-btn" onClick={add}>+ {text.add}</button> : <small>{text.readOnly}</small>}</div>
    </header>
    {rows.length ? <div className="settlement-reputation__table-wrap">
      <table className="settlement-reputation__table">
        <thead><tr><th>{text.settlement}</th><th>{text.reputation}</th><th>{text.positive}</th><th>{text.negative}</th><th></th></tr></thead>
        <tbody>{rows.map(row => {
          const rank = rankInfo(row.rank);
          const active = row.id === activeId;
          return <tr key={row.id} className={active ? "is-active" : ""} onClick={() => !readOnly && select(row.id)}>
            <td data-label={text.settlement}>
              {!readOnly ? <input className="pip-input" value={row.name} onClick={e=>e.stopPropagation()} onChange={e=>update(row.id,{name:e.target.value})}/> : <strong>{row.name}</strong>}
              {active ? <span className="settlement-reputation__active">{text.active}</span> : null}
            </td>
            <td data-label={text.reputation}>
              {!readOnly ? <select className="pip-input" value={row.rank} onClick={e=>e.stopPropagation()} onChange={e=>update(row.id,{rank:Number(e.target.value)})}>{REPUTATION_RANKS.map(item=><option key={item.rank} value={item.rank}>{item.label}</option>)}</select> : <span className={`settlement-reputation__rank rank-${row.rank}`}>{rank.label}</span>}
              <small>R{row.rank}/5</small>
            </td>
            <td data-label={text.positive}>{!readOnly ? <input className="pip-input" type="number" min="0" value={row.positive} onClick={e=>e.stopPropagation()} onChange={e=>update(row.id,{positive:e.target.value})}/> : row.positive}</td>
            <td data-label={text.negative}>{!readOnly ? <input className="pip-input" type="number" min="0" value={row.negative} onClick={e=>e.stopPropagation()} onChange={e=>update(row.id,{negative:e.target.value})}/> : row.negative}</td>
            <td>{!readOnly ? <button type="button" className="pip-btn settlement-reputation__remove" onClick={e=>{e.stopPropagation();remove(row.id);}}>{text.remove}</button> : null}</td>
          </tr>;
        })}</tbody>
      </table>
    </div> : <p>{text.empty}</p>}
  </section>;
}
