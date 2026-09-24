import React, { useMemo, useState } from "react";
import { REPUTATION_RANKS } from "../../utils/winterOfAtomRules.js";
import "./settlementReputationPanel.css";

const STORAGE_KEY = "pip2d20_settlement_reputations_v2";
const LEGACY_KEY = "pip2d20_settlement_reputations_v1";
const WINTER_KEY = "pip2d20_winter_rules_v1";

const COPY = {
  en: { title:"SETTLEMENT REPUTATION", hint:"Track reputation for known or custom settlements.", settlement:"Settlement", reputation:"Reputation level", bonus:"Bonuses", penalty:"Penalties", add:"ADD SETTLEMENT", remove:"REMOVE", active:"ACTIVE", empty:"No settlements tracked yet.", choose:"Choose existing settlement", custom:"Or enter a custom settlement", customPlaceholder:"Settlement name", addExisting:"ADD", bonusPlaceholder:"Describe bonuses or privileges…", penaltyPlaceholder:"Describe penalties or restrictions…", customPosition:"Custom settlement will be placed at your current map position.", rankChanged:"Reputation changed" },
  ru: { title:"РЕПУТАЦИЯ ПОСЕЛЕНИЙ", hint:"Отдельная таблица отношений персонажа с известными или собственными поселениями.", settlement:"Поселение", reputation:"Уровень репутации", bonus:"Бонусы", penalty:"Штрафы", add:"ДОБАВИТЬ ПОСЕЛЕНИЕ", remove:"УДАЛИТЬ", active:"АКТИВНО", empty:"Поселения пока не добавлены.", choose:"Выбрать из имеющихся", custom:"Или вписать своё поселение", customPlaceholder:"Название поселения", addExisting:"ДОБАВИТЬ", bonusPlaceholder:"Например: скидка, доступ, помощь…", penaltyPlaceholder:"Например: наценка, запрет, враждебность…", customPosition:"Своё поселение будет поставлено в текущей позиции персонажа на карте.", rankChanged:"Репутация изменена" },
  uk: { title:"РЕПУТАЦІЯ ПОСЕЛЕНЬ", hint:"Окрема таблиця відносин персонажа з відомими або власними поселеннями.", settlement:"Поселення", reputation:"Рівень репутації", bonus:"Бонуси", penalty:"Штрафи", add:"ДОДАТИ ПОСЕЛЕННЯ", remove:"ВИДАЛИТИ", active:"АКТИВНЕ", empty:"Поселень ще немає.", choose:"Обрати з наявних", custom:"Або вписати своє поселення", customPlaceholder:"Назва поселення", addExisting:"ДОДАТИ", bonusPlaceholder:"Наприклад: знижка, доступ, допомога…", penaltyPlaceholder:"Наприклад: націнка, заборона, ворожість…", customPosition:"Власне поселення буде розміщено у поточній позиції персонажа на мапі.", rankChanged:"Репутацію змінено" },
  pl: { title:"REPUTACJA OSAD", hint:"Osobna tabela relacji postaci ze znanymi lub własnymi osadami.", settlement:"Osada", reputation:"Poziom reputacji", bonus:"Bonusy", penalty:"Kary", add:"DODAJ OSADĘ", remove:"USUŃ", active:"AKTYWNA", empty:"Brak śledzonych osad.", choose:"Wybierz istniejącą osadę", custom:"Lub wpisz własną osadę", customPlaceholder:"Nazwa osady", addExisting:"DODAJ", bonusPlaceholder:"Np. zniżka, dostęp, pomoc…", penaltyPlaceholder:"Np. podwyżka, zakaz, wrogość…", customPosition:"Własna osada zostanie umieszczona w bieżącej pozycji postaci na mapie.", rankChanged:"Reputacja zmieniona" },
};

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function normalizeRow(row, index=0) {
  return {
    id: String(row?.id || `settlement-${Date.now()}-${index}`),
    sourceId: String(row?.sourceId || ""),
    name: String(row?.name || row?.settlement || "Settlement"),
    rank: Math.max(0, Math.min(5, Number(row?.rank ?? 2))),
    bonus: String(row?.bonus || ""),
    penalty: String(row?.penalty || ""),
    regionId: String(row?.regionId || ""),
    worldX: Number.isFinite(Number(row?.worldX)) ? Number(row.worldX) : null,
    worldY: Number.isFinite(Number(row?.worldY)) ? Number(row.worldY) : null,
  };
}
function initialState() {
  const stored = safeRead(STORAGE_KEY, null);
  if (stored?.rows?.length) return { rows: stored.rows.map(normalizeRow), activeId: stored.activeId || stored.rows[0].id };
  const legacy = safeRead(LEGACY_KEY, null);
  if (legacy?.rows?.length) {
    const rows = legacy.rows.map((row,index)=>normalizeRow({ ...row, bonus: row.positive ? `+${row.positive} positive influence` : "", penalty: row.negative ? `+${row.negative} negative influence` : "" },index));
    return { rows, activeId: legacy.activeId || rows[0]?.id || "" };
  }
  const winter = safeRead(WINTER_KEY, {});
  if (winter?.rep?.settlement) {
    const row = normalizeRow({ id:"legacy-settlement", name:winter.rep.settlement, rank:winter.rep.rank });
    return { rows:[row], activeId:row.id };
  }
  return { rows:[], activeId:"" };
}
function rankInfo(rank) { return REPUTATION_RANKS.find(item => item.rank === Number(rank)) || REPUTATION_RANKS[2]; }
function isSettlementLike(location) {
  return ["settlement","town","city","village","vault","bunker"].includes(String(location?.type||"").toLowerCase());
}

export default function SettlementReputationPanel({ language="en", readOnly=false, locations=[], regionId="", currentPosition=null, onActivity=null }) {
  const code = String(language || "en").split("-")[0];
  const text = COPY[code] || COPY.en;
  const initial = useMemo(initialState, []);
  const [rows, setRows] = useState(initial.rows);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [selectedLocationId,setSelectedLocationId]=useState("");
  const [customName,setCustomName]=useState("");

  const availableLocations=useMemo(()=>{
    const filtered=(locations||[]).filter(isSettlementLike);
    return filtered.length?filtered:(locations||[]);
  },[locations]);

  const persist = (nextRows, nextActiveId) => {
    setRows(nextRows);
    setActiveId(nextActiveId);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows:nextRows, activeId:nextActiveId }));
      window.dispatchEvent(new CustomEvent("pip2d20:settlement-reputation-changed",{detail:{rows:nextRows,activeId:nextActiveId}}));
      const active = nextRows.find(row => row.id === nextActiveId) || nextRows[0];
      if (active) {
        const winter = safeRead(WINTER_KEY, {});
        window.localStorage.setItem(WINTER_KEY, JSON.stringify({
          ...winter,
          rep:{ ...(winter.rep || {}), settlement:active.name, rank:active.rank, rolls:"", last:null }
        }));
      }
    } catch {}
  };

  const update = (id, patch) => {
    const before=rows.find(row=>row.id===id);
    const next = rows.map(row => row.id === id ? normalizeRow({ ...row, ...patch }) : row);
    persist(next, activeId || id);
    if(Object.prototype.hasOwnProperty.call(patch,"rank")&&before&&Number(before.rank)!==Number(patch.rank)){
      const after=next.find(row=>row.id===id);
      onActivity?.({type:"reputation",text:`${text.rankChanged}: ${after?.name||before.name} → ${rankInfo(after?.rank).label}`});
    }
  };
  const select = (id) => persist(rows, id);
  const addByName=(name,sourceId="",position=null)=>{
    const clean=String(name||"").trim();
    if(!clean)return;
    const existing=rows.find(row=>row.name.toLowerCase()===clean.toLowerCase());
    if(existing){select(existing.id);return;}
    const row=normalizeRow({id:`settlement-${Date.now()}`,sourceId,name:clean,rank:2,regionId:position?.regionId||"",worldX:position?.worldX,worldY:position?.worldY});
    persist([...rows,row],row.id);
  };
  const addSelected=()=>{
    const loc=availableLocations.find(item=>item.id===selectedLocationId);
    if(!loc)return;
    addByName(loc.name||loc.id,loc.id,{regionId,worldX:loc.worldX,worldY:loc.worldY});
    setSelectedLocationId("");
  };
  const addCustom=()=>{addByName(customName,"",{regionId,worldX:currentPosition?.worldX,worldY:currentPosition?.worldY});setCustomName("");};
  const remove = (id) => {
    const next = rows.filter(row => row.id !== id);
    const nextActive = activeId === id ? (next[0]?.id || "") : activeId;
    persist(next, nextActive);
  };

  return <section className="pip-panel settlement-reputation settlement-reputation--standalone">
    <header className="settlement-reputation__header">
      <div><small>PIP / 2D20 // WORLD</small><h2>[ {text.title} ]</h2><p>{text.hint}</p></div>
    </header>

    {!readOnly?<div className="settlement-reputation__add-grid">
      <div className="settlement-reputation__add-card">
        <label><span>{text.choose}</span><select className="pip-input" value={selectedLocationId} onChange={e=>setSelectedLocationId(e.target.value)}><option value="">—</option>{availableLocations.map(location=><option key={location.id} value={location.id}>{location.name||location.id}</option>)}</select></label>
        <button type="button" className="pip-btn is-primary" disabled={!selectedLocationId} onClick={addSelected}>{text.addExisting}</button>
      </div>
      <div className="settlement-reputation__add-card">
        <label><span>{text.custom}</span><input className="pip-input" value={customName} placeholder={text.customPlaceholder} onChange={e=>setCustomName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addCustom();}}}/></label>
        <small className="settlement-reputation__position-note">{text.customPosition}</small>
        <button type="button" className="pip-btn is-primary" disabled={!customName.trim()||!Number.isFinite(Number(currentPosition?.worldX))||!Number.isFinite(Number(currentPosition?.worldY))} onClick={addCustom}>{text.add}</button>
      </div>
    </div>:null}

    {rows.length ? <div className="settlement-reputation__table-wrap">
      <table className="settlement-reputation__table">
        <thead><tr><th>{text.settlement}</th><th>{text.reputation}</th><th>{text.bonus}</th><th>{text.penalty}</th><th></th></tr></thead>
        <tbody>{rows.map(row => {
          const rank = rankInfo(row.rank);
          const active = row.id === activeId;
          return <tr key={row.id} className={active ? "is-active" : ""} onClick={() => !readOnly && select(row.id)}>
            <td data-label={text.settlement}><strong>{row.name}</strong>{active?<span className="settlement-reputation__active">{text.active}</span>:null}</td>
            <td data-label={text.reputation}>{!readOnly?<select className="pip-input" value={row.rank} onClick={e=>e.stopPropagation()} onChange={e=>update(row.id,{rank:Number(e.target.value)})}>{REPUTATION_RANKS.map(item=><option key={item.rank} value={item.rank}>{item.rank} · {item.label}</option>)}</select>:<span className={`settlement-reputation__rank rank-${row.rank}`}>{rank.label}</span>}<small>{rank.label} · R{row.rank}/5</small></td>
            <td data-label={text.bonus}>{!readOnly?<textarea className="pip-input settlement-reputation__note" rows="2" value={row.bonus} placeholder={text.bonusPlaceholder} onClick={e=>e.stopPropagation()} onChange={e=>update(row.id,{bonus:e.target.value})}/>:<span>{row.bonus||"—"}</span>}</td>
            <td data-label={text.penalty}>{!readOnly?<textarea className="pip-input settlement-reputation__note" rows="2" value={row.penalty} placeholder={text.penaltyPlaceholder} onClick={e=>e.stopPropagation()} onChange={e=>update(row.id,{penalty:e.target.value})}/>:<span>{row.penalty||"—"}</span>}</td>
            <td>{!readOnly?<button type="button" className="pip-btn settlement-reputation__remove" onClick={e=>{e.stopPropagation();remove(row.id);}}>{text.remove}</button>:null}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>:<div className="settlement-reputation__empty">{text.empty}</div>}
  </section>;
}
