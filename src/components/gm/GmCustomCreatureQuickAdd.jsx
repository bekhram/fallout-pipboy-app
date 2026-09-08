import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CUSTOM_CREATURES_CHANGED_EVENT,
  loadCustomCreatures,
} from "../../utils/gmCreatureLibrary.js";

function creatureStats(item) {
  const maxHp = Math.max(0, Number(item?.maxHp ?? item?.hp ?? 0));
  return {
    hp: Math.max(0, Math.min(maxHp || Number(item?.hp || 0), Number(item?.hp || 0))),
    maxHp,
    defense: Math.max(0, Number(item?.defense || 0)),
    initiative: Math.max(0, Number(item?.initiative || 0)),
    level: Math.max(0, Number(item?.level || 0)),
    attacks: String(item?.attacks || ""),
    drBlock: String(item?.drBlock || ""),
    customCreatureId: String(item?.id || ""),
    visibleToPlayers: false,
    controlledByClientId: "",
  };
}

export default function GmCustomCreatureQuickAdd({ session }) {
  const [target, setTarget] = useState(null);
  const [library, setLibrary] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");

  const selected = useMemo(
    () => library.find((item) => String(item.id) === String(selectedId)) || null,
    [library, selectedId]
  );

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const syncTarget = () => {
      const next = document.querySelector(".gm-bestiary-picker__controls");
      setTarget((current) => current === next ? current : next);
    };
    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    const reload = () => loadCustomCreatures()
      .then((items) => {
        if (!active) return;
        setLibrary(items);
        setSelectedId((current) => items.some((item) => item.id === current) ? current : "");
      })
      .catch(() => active && setLibrary([]));
    reload();
    if (typeof window !== "undefined") window.addEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    return () => {
      active = false;
      if (typeof window !== "undefined") window.removeEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    };
  }, []);

  if (!session?.isActive || session?.mode !== "host" || !target) return null;

  const add = async () => {
    if (!selected) return;
    setMessage("");
    const response = await session.createNpcToken?.({
      name: selected.name || "Creature",
      size: Number(selected.size) === 2 ? 2 : 1,
      avatar: selected.avatar || "",
      npcId: selected.id,
      stats: creatureStats(selected),
    });
    setMessage(response?.ok ? "CUSTOM TOKEN ADDED HIDDEN" : `CUSTOM TOKEN ERROR [${response?.error || "ERROR"}]`);
  };

  return createPortal(<>
    <select className="pip-input gm-custom-creature-quick-select" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setMessage(""); }}>
      <option value="">— SAVED CUSTOM CREATURE —</option>
      {library.map((item) => <option value={item.id} key={item.id}>CUSTOM · {item.name}</option>)}
    </select>
    <button type="button" className="pip-btn is-primary" disabled={!selected} onClick={add}>ADD CUSTOM TOKEN</button>
    {message ? <span className="gm-custom-creature-quick-message">{message}</span> : null}
  </>, target);
}
