import React, { useEffect, useMemo, useRef, useState } from "react";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import { blankCreature, deleteCustomCreature, loadCustomCreatures, saveCustomCreature } from "../../utils/gmCreatureLibrary.js";
import "./gmUnifiedTokenManager.css";

const MAX_AVATAR_BYTES = 500 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function tokenSize(token) { return Number(token?.size) === 2 ? 2 : 1; }
function tokenStats(token) { return token?.stats && typeof token.stats === "object" ? token.stats : {}; }
function toNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
function text(value) { return String(value ?? "").trim(); }

function isNpcEntry(entry) {
  if (!entry || entry.statKind === "rule") return false;
  return !["trap", "hazard", "obstacle"].includes(String(entry.category || "").toLowerCase());
}

function defaultSize(entry) {
  const haystack = `${entry?.abilities || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  return haystack.includes("big") || haystack.includes("massive") ? 2 : 1;
}

function bestiaryStats(entry) {
  const maxHp = Math.max(0, toNumber(entry?.maxHp ?? entry?.hp ?? entry?.health, 0));
  return {
    hp: maxHp,
    maxHp,
    defense: Math.max(0, toNumber(entry?.defense ?? entry?.def, 0)),
    initiative: Math.max(0, toNumber(entry?.initiative ?? entry?.init, 0)),
    level: Math.max(0, toNumber(entry?.level, 0)),
    body: text(entry?.body),
    mind: text(entry?.mind),
    melee: text(entry?.melee),
    guns: text(entry?.guns),
    other: text(entry?.other),
    attacks: text(entry?.attacks ?? entry?.attack ?? entry?.weapons),
    abilities: text(entry?.abilities),
    tactics: text(entry?.tactics),
    loot: text(entry?.loot),
    summary: text(entry?.summary),
    drBlock: text(entry?.drBlock ?? entry?.dr ?? entry?.resistance),
    creatureType: text(entry?.creatureType),
    source: text(entry?.source),
    special: entry?.special && typeof entry.special === "object" ? { ...entry.special } : null,
    skills: Array.isArray(entry?.skills) ? entry.skills : [],
    visibleToPlayers: false,
    controlledByClientId: "",
  };
}

function bestiaryEntryFor(token) {
  const id = String(token?.npcId || "");
  return BESTIARY_ENTRIES.find((entry) => String(entry?.id || "") === id) || null;
}

function DetailLine({ label, value }) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
  const rendered = Array.isArray(value)
    ? value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" · ")
    : typeof value === "object"
      ? Object.entries(value).filter(([, item]) => item !== "" && item != null).map(([key, item]) => `${key} ${item}`).join(" · ")
      : String(value);
  if (!rendered) return null;
  return <div className="gm-npc-detail-line"><strong>{label}</strong><span>{rendered}</span></div>;
}

export default function GmUnifiedTokenManager({ session }) {
  const scene = session?.tacticalScene || null;
  const players = useMemo(
    () => (Array.isArray(session?.players) ? session.players : []).filter((player) => player?.clientId),
    [session?.players]
  );
  const tokens = Array.isArray(scene?.tokens) ? scene.tokens : [];
  const playerTokens = tokens.filter((token) => token.kind === "player");
  const npcTokens = tokens.filter((token) => token.kind !== "player");
  const [library, setLibrary] = useState([]);
  const [draft, setDraft] = useState(() => blankCreature());
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [message, setMessage] = useState("");
  const [bestiarySearch, setBestiarySearch] = useState("");
  const [selectedBestiaryId, setSelectedBestiaryId] = useState("");
  const [expandedTokenId, setExpandedTokenId] = useState("");
  const avatarRef = useRef(null);

  const bestiaryEntries = useMemo(() => BESTIARY_ENTRIES.filter(isNpcEntry), []);
  const filteredBestiary = useMemo(() => {
    const query = bestiarySearch.trim().toLowerCase();
    if (!query) return bestiaryEntries.slice(0, 160);
    return bestiaryEntries.filter((entry) => `${entry.name || ""} ${entry.creatureType || ""} ${(entry.tags || []).join(" ")} ${entry.source || ""}`.toLowerCase().includes(query)).slice(0, 160);
  }, [bestiaryEntries, bestiarySearch]);
  const selectedBestiary = useMemo(
    () => bestiaryEntries.find((entry) => String(entry.id) === String(selectedBestiaryId)) || null,
    [bestiaryEntries, selectedBestiaryId]
  );

  useEffect(() => { loadCustomCreatures().then(setLibrary).catch(() => setLibrary([])); }, []);
  useEffect(() => {
    if (expandedTokenId && !npcTokens.some((token) => token.id === expandedTokenId)) setExpandedTokenId("");
  }, [expandedTokenId, npcTokens]);

  if (!session?.isActive || session?.mode !== "host" || !scene) return null;

  const playerTokenFor = (clientId) => playerTokens.find((token) => token.ownerClientId === clientId && token.assignedByGm) || null;
  const patchDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const chooseLibrary = (id) => {
    setSelectedLibraryId(id);
    const item = library.find((entry) => entry.id === id);
    setDraft(item ? { ...item } : blankCreature());
    setMessage("");
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.has(String(file.type || "").toLowerCase())) return setMessage("Use JPEG, PNG or WebP.");
    if (file.size > MAX_AVATAR_BYTES) return setMessage("Avatar must be 500 KB or smaller.");
    try {
      patchDraft({ avatar: await readAsDataUrl(file) });
      setMessage("");
    } catch {
      setMessage("Could not read avatar.");
    }
  };

  const saveCard = async () => {
    const name = String(draft.name || "").trim();
    if (!name) return setMessage("Creature name is required.");
    const saved = await saveCustomCreature({ ...draft, name });
    const next = await loadCustomCreatures();
    setLibrary(next);
    setSelectedLibraryId(saved.id);
    setDraft(saved);
    setMessage("Creature card saved on GM device.");
  };

  const removeCard = async () => {
    if (!selectedLibraryId) return;
    const next = await deleteCustomCreature(selectedLibraryId);
    setLibrary(next);
    setSelectedLibraryId("");
    setDraft(blankCreature());
    setMessage("Creature card removed.");
  };

  const addCreature = async () => {
    const name = String(draft.name || "Creature").trim() || "Creature";
    const maxHp = Math.max(0, Number(draft.maxHp || 0));
    const response = await session.createNpcToken?.({
      name,
      size: Number(draft.size) === 2 ? 2 : 1,
      avatar: draft.avatar || "",
      npcId: selectedLibraryId || draft.id || null,
      stats: {
        hp: Math.max(0, Math.min(maxHp || Number(draft.hp || 0), Number(draft.hp || 0))),
        maxHp,
        defense: Math.max(0, Number(draft.defense || 0)),
        initiative: Math.max(0, Number(draft.initiative || 0)),
        level: Math.max(0, Number(draft.level || 0)),
        attacks: String(draft.attacks || ""),
        drBlock: String(draft.drBlock || ""),
        abilities: String(draft.abilities || ""),
        tactics: String(draft.tactics || ""),
        loot: String(draft.loot || ""),
        summary: String(draft.summary || ""),
        visibleToPlayers: false,
        controlledByClientId: "",
      },
    });
    setMessage(response?.ok ? `${name} added hidden. Activate it when ready.` : `Could not add token [${response?.error || "ERROR"}]`);
  };

  const addBestiaryCreature = async () => {
    if (!selectedBestiary) return setMessage("Choose a creature from the bestiary first.");
    const response = await session.createNpcToken?.({
      name: selectedBestiary.name || "Creature",
      size: defaultSize(selectedBestiary),
      avatar: "",
      npcId: selectedBestiary.id,
      stats: bestiaryStats(selectedBestiary),
    });
    setMessage(response?.ok
      ? `${selectedBestiary.name} added hidden from bestiary. Activate it when ready.`
      : `Could not add bestiary token [${response?.error || "ERROR"}]`);
  };

  const updateNpcStats = (token, patch) => session.updateToken?.(token.id, {
    stats: { ...tokenStats(token), ...patch },
  });

  return (
    <section className="pip-panel gm-unified-token-manager">
      <header className="gm-unified-token-manager__head">
        <div><div className="pip-bootline">TACTICAL CONTROL</div><h2>[ TOKENS / CREATURES ]</h2></div>
        <span>{tokens.length} ON SCENE</span>
      </header>

      <section className="gm-token-section">
        <h3>PLAYERS</h3>
        <div className="gm-player-token-grid">
          {players.length ? players.map((player) => {
            const token = playerTokenFor(player.clientId);
            const name = player?.character?.name || player?.name || "Player";
            return <article key={player.clientId} className="gm-token-control-card">
              <div className="gm-token-control-card__identity">
                <span className={`session-status-dot ${player.online === false ? "is-disconnected" : "is-online"}`} />
                <strong>{name}</strong>
                <small>{token ? `TOKEN ${tokenSize(token)}×${tokenSize(token)}` : "NO TOKEN"}</small>
              </div>
              <div className="gm-token-control-card__actions">
                {!token ? <>
                  <button type="button" className="pip-btn" disabled={!session.liveSceneId} onClick={() => session.createAssignedPlayerToken?.({ targetClientId: player.clientId, name, size: 1 })}>ASSIGN 1×1</button>
                  <button type="button" className="pip-btn" disabled={!session.liveSceneId} onClick={() => session.createAssignedPlayerToken?.({ targetClientId: player.clientId, name, size: 2 })}>ASSIGN 2×2</button>
                </> : <>
                  <select className="pip-input" value={tokenSize(token)} onChange={(event) => session.updateAssignedPlayerToken?.(player.clientId, { size: Number(event.target.value) === 2 ? 2 : 1 })}>
                    <option value="1">1×1</option><option value="2">2×2</option>
                  </select>
                  <button type="button" className="pip-btn" onClick={() => session.removeAssignedPlayerToken?.(player.clientId)}>REMOVE</button>
                </>}
              </div>
            </article>;
          }) : <div className="pip-logbox">No players connected.</div>}
        </div>
      </section>

      <section className="gm-token-section gm-bestiary-picker">
        <div className="gm-token-section__head"><h3>BESTIARY</h3><span>{bestiaryEntries.length} CREATURES</span></div>
        <div className="gm-bestiary-picker__controls">
          <input className="pip-input" value={bestiarySearch} placeholder="Search bestiary..." onChange={(event) => setBestiarySearch(event.target.value)} />
          <select className="pip-input" value={selectedBestiaryId} onChange={(event) => setSelectedBestiaryId(event.target.value)}>
            <option value="">— SELECT CREATURE —</option>
            {filteredBestiary.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
          <button type="button" className="pip-btn is-primary" disabled={!selectedBestiary} onClick={addBestiaryCreature}>ADD HIDDEN TOKEN</button>
        </div>
        {selectedBestiary ? <div className="gm-bestiary-preview">
          <div><strong>{selectedBestiary.name}</strong><span>{selectedBestiary.creatureType || selectedBestiary.category || "CREATURE"}</span></div>
          <div className="gm-bestiary-preview__stats">
            <span>HP {toNumber(selectedBestiary.maxHp ?? selectedBestiary.hp, 0)}</span>
            <span>DEF {toNumber(selectedBestiary.defense, 0)}</span>
            <span>INIT {toNumber(selectedBestiary.initiative, 0)}</span>
            <span>LVL {toNumber(selectedBestiary.level, 0)}</span>
            <span>{defaultSize(selectedBestiary)}×{defaultSize(selectedBestiary)}</span>
          </div>
          {selectedBestiary.summary ? <p>{selectedBestiary.summary}</p> : null}
        </div> : null}
      </section>

      <section className="gm-token-section">
        <h3>CUSTOM CREATURE CARD</h3>
        <div className="gm-creature-library-row">
          <select className="pip-input" value={selectedLibraryId} onChange={(event) => chooseLibrary(event.target.value)}>
            <option value="">— NEW CREATURE —</option>
            {library.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <button type="button" className="pip-btn" onClick={() => { setSelectedLibraryId(""); setDraft(blankCreature()); setMessage(""); }}>NEW</button>
          {selectedLibraryId ? <button type="button" className="pip-btn" onClick={removeCard}>DELETE CARD</button> : null}
        </div>

        <div className="gm-creature-editor">
          <button type="button" className="gm-creature-avatar" onClick={() => avatarRef.current?.click()}>
            {draft.avatar ? <img src={draft.avatar} alt="" /> : <span>NPC</span>}
          </button>
          <input ref={avatarRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { uploadAvatar(event.target.files?.[0]); event.target.value = ""; }} />
          <input className="pip-input gm-creature-name" value={draft.name || ""} placeholder="Name" onChange={(event) => patchDraft({ name: event.target.value })} />
          <label>SIZE<select className="pip-input" value={Number(draft.size) === 2 ? 2 : 1} onChange={(event) => patchDraft({ size: Number(event.target.value) === 2 ? 2 : 1 })}><option value="1">1×1</option><option value="2">2×2</option></select></label>
          <label>HP<input className="pip-input" type="number" min="0" value={draft.hp ?? 0} onChange={(event) => patchDraft({ hp: Number(event.target.value) })} /></label>
          <label>MAX HP<input className="pip-input" type="number" min="0" value={draft.maxHp ?? 0} onChange={(event) => patchDraft({ maxHp: Number(event.target.value) })} /></label>
          <label>DEF<input className="pip-input" type="number" min="0" value={draft.defense ?? 0} onChange={(event) => patchDraft({ defense: Number(event.target.value) })} /></label>
          <label>INIT<input className="pip-input" type="number" min="0" value={draft.initiative ?? 0} onChange={(event) => patchDraft({ initiative: Number(event.target.value) })} /></label>
          <label>LVL<input className="pip-input" type="number" min="0" value={draft.level ?? 0} onChange={(event) => patchDraft({ level: Number(event.target.value) })} /></label>
          <textarea className="pip-input gm-creature-notes" value={draft.attacks || ""} placeholder="Attacks / abilities" onChange={(event) => patchDraft({ attacks: event.target.value })} />
          <textarea className="pip-input gm-creature-notes" value={draft.drBlock || ""} placeholder="DR / notes" onChange={(event) => patchDraft({ drBlock: event.target.value })} />
        </div>
        <div className="gm-creature-editor-actions">
          <button type="button" className="pip-btn" onClick={() => avatarRef.current?.click()}>AVATAR ≤500 KB</button>
          <button type="button" className="pip-btn" onClick={saveCard}>SAVE CARD</button>
          <button type="button" className="pip-btn is-primary" onClick={addCreature}>ADD HIDDEN TOKEN</button>
        </div>
        {message ? <div className="gm-token-manager-message">{message}</div> : null}
      </section>

      <section className="gm-token-section">
        <div className="gm-token-section__head"><h3>CREATURES ON SCENE</h3><span>CLICK A CREATURE TO VIEW STATS</span></div>
        <div className="gm-npc-token-list">
          {npcTokens.length ? npcTokens.map((token) => {
            const stats = tokenStats(token);
            const linkedEntry = bestiaryEntryFor(token);
            const visible = stats.visibleToPlayers !== false;
            const controller = String(stats.controlledByClientId || "");
            const hp = Math.max(0, Number(stats.hp ?? 0));
            const maxHp = Math.max(0, Number(stats.maxHp ?? hp));
            const expanded = expandedTokenId === token.id;
            return <article className={`gm-npc-token-row${visible ? " is-active" : " is-hidden"}${expanded ? " is-expanded" : ""}`} key={token.id}>
              <button type="button" className="gm-npc-token-row__summary" aria-expanded={expanded} onClick={() => setExpandedTokenId(expanded ? "" : token.id)}>
                <div className="gm-npc-token-row__avatar">{token.avatar ? <img src={token.avatar} alt="" /> : <span>{String(token.name || "N").slice(0, 1)}</span>}</div>
                <div className="gm-npc-token-row__main">
                  <strong>{token.name}</strong>
                  <small>{visible ? "VISIBLE TO PLAYERS" : "HIDDEN / INACTIVE"} · INIT {Number(stats.initiative || 0)}{linkedEntry ? " · BESTIARY" : ""}</small>
                  <div className="gm-npc-token-row__stats">
                    <span>HP {hp}/{maxHp}</span><span>DEF {Number(stats.defense || 0)}</span><span>LVL {Number(stats.level || 0)}</span><span>{tokenSize(token)}×{tokenSize(token)}</span>
                  </div>
                </div>
                <span className="gm-npc-token-row__chevron">{expanded ? "▲" : "▼"}</span>
              </button>
              <div className="gm-npc-token-row__actions">
                <button type="button" className={`pip-btn${visible ? "" : " is-primary"}`} onClick={() => session.updateNpcVisibility?.(token.id, !visible)}>{visible ? "HIDE" : "ACTIVATE"}</button>
                <select className="pip-input" value={controller} onChange={(event) => session.updateNpcController?.(token.id, event.target.value)}>
                  <option value="">GM CONTROL</option>
                  {players.map((player) => <option key={player.clientId} value={player.clientId}>{player?.character?.name || player?.name || "Player"}</option>)}
                </select>
                <button type="button" className="pip-btn" disabled={maxHp <= 0} onClick={() => updateNpcStats(token, { hp: Math.max(0, hp - 1) })}>-HP</button>
                <button type="button" className="pip-btn" disabled={maxHp <= 0} onClick={() => updateNpcStats(token, { hp: Math.min(maxHp, hp + 1) })}>+HP</button>
                <select className="pip-input" value={tokenSize(token)} onChange={(event) => session.updateToken?.(token.id, { size: Number(event.target.value) === 2 ? 2 : 1 })}><option value="1">1×1</option><option value="2">2×2</option></select>
                <button type="button" className="pip-btn" onClick={() => session.deleteToken?.(token.id)}>REMOVE</button>
              </div>
              {expanded ? <div className="gm-npc-token-details">
                <div className="gm-npc-token-details__quick">
                  <span>HP <b>{hp}/{maxHp}</b></span>
                  <span>DEF <b>{Number(stats.defense || 0)}</b></span>
                  <span>INIT <b>{Number(stats.initiative || 0)}</b></span>
                  <span>LVL <b>{Number(stats.level || 0)}</b></span>
                  {stats.body || linkedEntry?.body ? <span>BODY <b>{stats.body || linkedEntry.body}</b></span> : null}
                  {stats.mind || linkedEntry?.mind ? <span>MIND <b>{stats.mind || linkedEntry.mind}</b></span> : null}
                  {stats.melee || linkedEntry?.melee ? <span>MELEE <b>{stats.melee || linkedEntry.melee}</b></span> : null}
                  {stats.guns || linkedEntry?.guns ? <span>GUNS <b>{stats.guns || linkedEntry.guns}</b></span> : null}
                </div>
                <DetailLine label="TYPE" value={stats.creatureType || linkedEntry?.creatureType} />
                <DetailLine label="ATTACKS" value={stats.attacks || linkedEntry?.attacks} />
                <DetailLine label="ABILITIES" value={stats.abilities || linkedEntry?.abilities} />
                <DetailLine label="DR / RESISTANCE" value={stats.drBlock || linkedEntry?.drBlock} />
                <DetailLine label="TACTICS" value={stats.tactics || linkedEntry?.tactics} />
                <DetailLine label="SPECIAL" value={stats.special || linkedEntry?.special} />
                <DetailLine label="SKILLS" value={stats.skills || linkedEntry?.skills} />
                <DetailLine label="LOOT" value={stats.loot || linkedEntry?.loot} />
                <DetailLine label="SUMMARY" value={stats.summary || linkedEntry?.summary} />
                <DetailLine label="SOURCE" value={stats.source || linkedEntry?.source} />
              </div> : null}
            </article>;
          }) : <div className="pip-logbox">No creatures on this scene.</div>}
        </div>
      </section>
    </section>
  );
}
