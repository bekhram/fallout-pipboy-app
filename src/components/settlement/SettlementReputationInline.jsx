import React, { useEffect, useMemo, useState } from "react";
import { REPUTATION_RANKS, SETTLEMENT_TASKS } from "../../utils/winterOfAtomRules.js";

const STORAGE_KEY = "pip2d20_settlement_reputations_v2";
const WINTER_KEY = "pip2d20_winter_rules_v1";
const CHANGE_EVENT = "pip2d20:settlement-reputation-changed";

const COPY = {
  en: { title:"REPUTATION", untracked:"Not tracked", track:"TRACK SETTLEMENT", tasks:"SETTLEMENT TASKS", locked:"Friendly reputation (3+) required", unlocked:"Friendly+ · tasks unlocked", rank:"Rank" },
  ru: { title:"РЕПУТАЦИЯ", untracked:"Не отслеживается", track:"ДОБАВИТЬ В РЕПУТАЦИЮ", tasks:"ЗАДАНИЯ ПОСЕЛЕНИЯ", locked:"Нужна репутация Friendly (3+)", unlocked:"Friendly+ · задания доступны", rank:"Ранг" },
  uk: { title:"РЕПУТАЦІЯ", untracked:"Не відстежується", track:"ДОДАТИ ДО РЕПУТАЦІЇ", tasks:"ЗАВДАННЯ ПОСЕЛЕННЯ", locked:"Потрібна репутація Friendly (3+)", unlocked:"Friendly+ · завдання доступні", rank:"Ранг" },
  pl: { title:"REPUTACJA", untracked:"Nie śledzono", track:"ŚLEDŹ OSADĘ", tasks:"ZADANIA OSADY", locked:"Wymagana reputacja Friendly (3+)", unlocked:"Friendly+ · zadania odblokowane", rank:"Ranga" },
};

function readStore() {
  if (typeof window === "undefined") return { rows: [], activeId: "" };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return {
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      activeId: String(parsed?.activeId || ""),
    };
  } catch {
    return { rows: [], activeId: "" };
  }
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function rankInfo(rank) {
  return REPUTATION_RANKS.find((item) => item.rank === Number(rank)) || REPUTATION_RANKS[2];
}

function writeStore(next) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));

  const active = next.rows.find((row) => row.id === next.activeId);
  if (!active) return;
  try {
    const winter = JSON.parse(window.localStorage.getItem(WINTER_KEY) || "{}") || {};
    window.localStorage.setItem(WINTER_KEY, JSON.stringify({
      ...winter,
      rep: {
        ...(winter.rep || {}),
        settlement: active.name,
        rank: Number(active.rank ?? 2),
        rolls: "",
        last: null,
      },
    }));
  } catch {
    // Optional local compatibility bridge.
  }
}

export default function SettlementReputationInline({ settlement, language="en", canEdit=true }) {
  const code = String(language || "en").split("-")[0];
  const text = COPY[code] || COPY.en;
  const [store, setStore] = useState(readStore);

  useEffect(() => {
    const sync = () => setStore(readStore());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const row = useMemo(() => {
    const settlementId = String(settlement?.id || "");
    const name = normalizeName(settlement?.name);
    return store.rows.find((item) =>
      (settlementId && String(item?.sourceId || "") === settlementId) ||
      normalizeName(item?.name) === name
    ) || null;
  }, [settlement?.id, settlement?.name, store.rows]);

  const track = () => {
    if (!settlement?.name) return;
    const nextRow = {
      id: `settlement-local-${settlement.id || Date.now()}`,
      sourceId: String(settlement.id || ""),
      name: String(settlement.name),
      rank: 2,
      bonus: "",
      penalty: "",
      regionId: "",
      worldX: null,
      worldY: null,
    };
    const next = {
      rows: [...store.rows, nextRow],
      activeId: store.activeId || nextRow.id,
    };
    writeStore(next);
    setStore(next);
  };

  const setRank = (rank) => {
    if (!row) return;
    const nextRows = store.rows.map((item) =>
      item.id === row.id ? { ...item, rank: Math.max(0, Math.min(5, Number(rank))) } : item
    );
    const next = { ...store, rows: nextRows };
    writeStore(next);
    setStore(next);
  };

  if (!row) {
    return (
      <section className="settlement-inline-reputation pip-panel">
        <div className="settlement-inline-reputation__head">
          <strong>[ {text.title} ]</strong>
          <span>{text.untracked}</span>
        </div>
        {canEdit ? <button type="button" className="pip-action-button" onClick={track}>{text.track}</button> : null}
      </section>
    );
  }

  const info = rankInfo(row.rank);
  const tasksUnlocked = Number(row.rank) >= 3;

  return (
    <section className={`settlement-inline-reputation pip-panel rank-${row.rank}`}>
      <div className="settlement-inline-reputation__head">
        <div>
          <small>{text.title}</small>
          <strong>{info.label} <span>{row.rank}/5</span></strong>
        </div>
        {canEdit ? (
          <label>
            <span>{text.rank}</span>
            <select className="pip-input" value={row.rank} onChange={(event) => setRank(event.target.value)}>
              {REPUTATION_RANKS.map((rank) => (
                <option key={rank.rank} value={rank.rank}>{rank.rank} · {rank.label}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="settlement-inline-reputation__track" aria-label={`${info.label} ${row.rank} of 5`}>
        {REPUTATION_RANKS.map((rank) => (
          <span key={rank.rank} className={Number(row.rank) >= rank.rank ? "is-filled" : ""} title={rank.label} />
        ))}
      </div>

      <div className="settlement-inline-reputation__tasks">
        <div className="settlement-inline-reputation__tasks-head">
          <strong>[ {text.tasks} ]</strong>
          <small>{tasksUnlocked ? text.unlocked : text.locked}</small>
        </div>
        {tasksUnlocked ? (
          <div className="settlement-inline-reputation__task-list">
            {SETTLEMENT_TASKS.map((task) => (
              <span key={task.id} title={task.description}>{task.label} · {task.attribute}</span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
