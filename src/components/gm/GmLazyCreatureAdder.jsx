import React, { useEffect, useMemo, useState } from "react";

function isNpcEntry(entry) {
  if (!entry || entry.statKind === "rule") return false;
  return !["trap", "hazard", "obstacle"].includes(String(entry.category || "").toLowerCase());
}

function defaultSize(entry) {
  const haystack = `${entry?.abilities || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  return haystack.includes("big") || haystack.includes("massive") ? 2 : 1;
}

export default function GmLazyCreatureAdder({ onAddToken, language = "en" }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [size, setSize] = useState(1);

  const copy = {
    en: { open: "ADD CREATURE", close: "CLOSE", search: "Search bestiary...", custom: "Custom", name: "Token name", add: "ADD TOKEN", loading: "Loading bestiary..." },
    ru: { open: "ДОБАВИТЬ СУЩЕСТВО", close: "ЗАКРЫТЬ", search: "Поиск по бестиарию...", custom: "Свободный токен", name: "Имя токена", add: "ДОБАВИТЬ ТОКЕН", loading: "Загрузка бестиария..." },
    uk: { open: "ДОДАТИ ІСТОТУ", close: "ЗАКРИТИ", search: "Пошук у бестіарії...", custom: "Вільний токен", name: "Ім'я токена", add: "ДОДАТИ ТОКЕН", loading: "Завантаження бестіарію..." },
    pl: { open: "DODAJ ISTOTĘ", close: "ZAMKNIJ", search: "Szukaj w bestiariuszu...", custom: "Token własny", name: "Nazwa tokena", add: "DODAJ TOKEN", loading: "Ładowanie bestiariusza..." },
  }[language] || null;

  useEffect(() => {
    if (!open || entries.length || loading) return;
    let cancelled = false;
    setLoading(true);
    import("../../data/bestiary.js")
      .then((module) => {
        if (cancelled) return;
        const merged = (module.BESTIARY_ENTRIES || []).filter(isNpcEntry);
        const seen = new Set();
        setEntries(merged.filter((entry) => {
          const key = String(entry?.id || entry?.name || "").toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, entries.length, loading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = q
      ? entries.filter((entry) => `${entry.name || ""} ${entry.creatureType || ""} ${(entry.tags || []).join(" ")}`.toLowerCase().includes(q))
      : entries;
    return source.slice(0, 80);
  }, [entries, search]);

  const selected = entries.find((entry) => String(entry.id) === String(selectedId)) || null;

  const choose = (id) => {
    setSelectedId(id);
    const entry = entries.find((item) => String(item.id) === String(id)) || null;
    if (entry) {
      setName(entry.name || "");
      setSize(defaultSize(entry));
    }
  };

  const add = () => {
    const finalName = String(name || selected?.name || "Enemy").trim();
    if (!finalName) return;
    onAddToken?.({ entry: selected, name: finalName, size });
  };

  return (
    <div className="gm-lazy-creature-adder">
      <button type="button" className="pip-btn" onClick={() => setOpen((value) => !value)}>
        {open ? copy.close : copy.open}
      </button>
      {open ? (
        <div className="gm-lazy-creature-adder__panel">
          {loading ? <small>{copy.loading}</small> : null}
          <input className="pip-input" value={search} placeholder={copy.search} onChange={(event) => setSearch(event.target.value)} />
          <select className="pip-input" value={selectedId} onChange={(event) => choose(event.target.value)}>
            <option value="">— {copy.custom} —</option>
            {filtered.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
          <input className="pip-input" value={name} placeholder={copy.name} onChange={(event) => setName(event.target.value)} />
          <select className="pip-input" value={size} onChange={(event) => setSize(Number(event.target.value) === 2 ? 2 : 1)}>
            <option value={1}>1×1</option>
            <option value={2}>2×2</option>
          </select>
          <button type="button" className="pip-btn is-primary" onClick={add}>{copy.add}</button>
        </div>
      ) : null}
    </div>
  );
}
