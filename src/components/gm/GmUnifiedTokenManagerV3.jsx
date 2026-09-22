import React, { useEffect, useMemo, useRef, useState } from "react";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import {
  CUSTOM_CREATURES_CHANGED_EVENT,
  blankCreature,
  deleteCustomCreature,
  loadCustomCreatures,
  saveCustomCreature,
} from "../../utils/gmCreatureLibrary.js";
import {
  NPC_RANKS,
  applyNpcRank,
  extractAbilityNames,
  normalizeStructuredAttack,
  parseAttackText,
  rankLabel,
  rollNpcAttack,
} from "../../utils/npcCombat.js";
import { findFreePlacement } from "../../utils/gmSessionModel.js";
import "./gmUnifiedTokenManager.css";
import "./gmNpcCombat.css";

const MAX_AVATAR_BYTES = 500 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];

function num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function txt(value) { return String(value ?? "").trim(); }
function tokenSize(token) { const n = Number(token?.stats?.footprint || token?.size); return n === 3 ? 3 : n === 2 ? 2 : 1; }
function tokenStats(token) { return token?.stats && typeof token.stats === "object" ? token.stats : {}; }
function primaryType(value, fallback = "Other") { return txt(value).split("•")[0].trim() || fallback; }
function isNpcEntry(entry) { return entry && entry.statKind !== "rule" && !["trap", "hazard", "obstacle"].includes(String(entry.category || "").toLowerCase()); }
function defaultSize(entry) { const s = `${entry?.abilities || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase(); return s.includes("big") || s.includes("massive") ? 2 : 1; }

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function bestiaryBase(entry) {
  const hp = Math.max(1, num(entry?.maxHp ?? entry?.hp ?? entry?.health, 1));
  const defense = Math.max(0, num(entry?.defense ?? entry?.def, 0));
  const xp = Math.max(0, num(entry?.xp, 0));
  return {
    hp, maxHp: hp, baseMaxHp: hp,
    defense, baseDefense: defense,
    xp, baseXp: xp,
    size: defaultSize(entry), baseSize: defaultSize(entry),
    initiative: Math.max(0, num(entry?.initiative ?? entry?.init, 0)),
    level: Math.max(0, num(entry?.level, 0)),
    body: txt(entry?.body), mind: txt(entry?.mind), melee: txt(entry?.melee), guns: txt(entry?.guns), other: txt(entry?.other),
    attacks: txt(entry?.attacks ?? entry?.attack),
    customAttacks: [],
    abilities: txt(entry?.abilities), tactics: txt(entry?.tactics), loot: txt(entry?.loot), summary: txt(entry?.summary),
    drBlock: txt(entry?.drBlock ?? entry?.dr ?? entry?.resistance),
    creatureType: txt(entry?.creatureType), category: txt(entry?.category), source: txt(entry?.source),
    special: entry?.special && typeof entry.special === "object" ? { ...entry.special } : null,
    skills: Array.isArray(entry?.skills) ? entry.skills : [],
  };
}

function customBase(item) {
  return {
    ...item,
    baseMaxHp: Math.max(1, num(item?.baseMaxHp ?? item?.maxHp ?? item?.hp, 1)),
    baseDefense: Math.max(0, num(item?.baseDefense ?? item?.defense, 0)),
    baseXp: Math.max(0, num(item?.baseXp ?? item?.xp, 0)),
    baseSize: Number(item?.baseSize ?? item?.size) === 2 ? 2 : 1,
    customCreatureId: String(item?.id || ""),
  };
}

function buildSpawnStats(base, rank, hordeEnabled, hordeSize, specialFeature = "") {
  return {
    ...applyNpcRank(base, { ...base, rank, hordeEnabled, hordeSize, specialFeature }),
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

function attacksFor(stats, linkedEntry) {
  const parsed = parseAttackText(stats.attacks || linkedEntry?.attacks || "");
  const custom = (Array.isArray(stats.customAttacks) ? stats.customAttacks : []).map(normalizeStructuredAttack);
  return [...parsed, ...custom];
}

export default function GmUnifiedTokenManagerV3({ session }) {
  const scene = session?.tacticalScene || null;
  const players = useMemo(() => (Array.isArray(session?.players) ? session.players : []).filter((player) => player?.clientId), [session?.players]);
  const tokens = Array.isArray(scene?.tokens) ? scene.tokens : [];
  const playerTokens = tokens.filter((token) => token.kind === "player");
  const npcTokens = tokens.filter((token) => token.kind !== "player");

  const [library, setLibrary] = useState([]);
  const [draft, setDraft] = useState(() => blankCreature());
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [selectedCustomTokenId, setSelectedCustomTokenId] = useState("");
  const [selectedBestiaryId, setSelectedBestiaryId] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [spawnRank, setSpawnRank] = useState("standard");
  const [spawnHorde, setSpawnHorde] = useState(false);
  const [spawnHordeSize, setSpawnHordeSize] = useState(2);
  const [spawnFeature, setSpawnFeature] = useState("");
  const [message, setMessage] = useState("");
  const [expandedTokenId, setExpandedTokenId] = useState("");
  const avatarRef = useRef(null);

  const bestiaryEntries = useMemo(() => BESTIARY_ENTRIES.filter(isNpcEntry), []);
  const featureOptions = useMemo(() => extractAbilityNames(bestiaryEntries), [bestiaryEntries]);
  const typeOptions = useMemo(() => {
    const values = new Set();
    bestiaryEntries.forEach((entry) => values.add(primaryType(entry.creatureType, primaryType(entry.category))));
    library.forEach((entry) => values.add(primaryType(entry.creatureType, "Custom")));
    return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [bestiaryEntries, library]);

  const filteredBestiary = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bestiaryEntries.filter((entry) => {
      const type = primaryType(entry?.creatureType, primaryType(entry?.category));
      if (typeFilter !== "all" && type !== typeFilter) return false;
      if (!q) return true;
      return `${entry?.name || ""} ${entry?.creatureType || ""} ${entry?.category || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase().includes(q);
    }).slice(0, 180);
  }, [bestiaryEntries, search, typeFilter]);

  const filteredCustom = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter((entry) => {
      const type = primaryType(entry?.creatureType, "Custom");
      if (typeFilter !== "all" && type !== typeFilter) return false;
      if (!q) return true;
      return `${entry?.name || ""} ${entry?.creatureType || ""}`.toLowerCase().includes(q);
    });
  }, [library, search, typeFilter]);

  const selectedBestiary = bestiaryEntries.find((entry) => String(entry.id) === String(selectedBestiaryId)) || null;
  const selectedCustom = library.find((entry) => String(entry.id) === String(selectedCustomTokenId)) || null;

  useEffect(() => {
    let active = true;
    const reload = () => loadCustomCreatures().then((items) => active && setLibrary(items)).catch(() => active && setLibrary([]));
    reload();
    window.addEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    return () => { active = false; window.removeEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload); };
  }, []);
  useEffect(() => { if (expandedTokenId && !npcTokens.some((token) => token.id === expandedTokenId)) setExpandedTokenId(""); }, [expandedTokenId, npcTokens]);

  if (!session?.isActive || session?.mode !== "host" || !scene) return null;

  const playerTokenFor = (clientId) => playerTokens.find((token) => token.ownerClientId === clientId && token.assignedByGm) || null;
  const patchDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const patchSpecial = (key, value) => setDraft((current) => ({ ...current, special: { ...(current.special || {}), [key]: value } }));

  const chooseLibrary = (id) => {
    setSelectedLibraryId(id);
    const item = library.find((entry) => entry.id === id);
    setDraft(item ? { ...item, special: { ...(item.special || {}) }, customAttacks: [...(item.customAttacks || [])] } : blankCreature());
    setMessage("");
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.has(String(file.type || "").toLowerCase())) return setMessage("Use JPEG, PNG or WebP.");
    if (file.size > MAX_AVATAR_BYTES) return setMessage("Avatar must be 500 KB or smaller.");
    try { patchDraft({ avatar: await readAsDataUrl(file) }); setMessage(""); }
    catch { setMessage("Could not read avatar."); }
  };

  const setDraftRank = (patch) => {
    setDraft((current) => {
      const nextBase = {
        ...current,
        baseMaxHp: Math.max(1, num(current.baseMaxHp ?? current.maxHp ?? current.hp, 1)),
        baseDefense: Math.max(0, num(current.baseDefense ?? current.defense, 0)),
        baseXp: Math.max(0, num(current.baseXp ?? current.xp, 0)),
        baseSize: Number(current.baseSize ?? current.size) === 2 ? 2 : 1,
        ...patch,
      };
      const effective = applyNpcRank(nextBase, nextBase);
      return { ...nextBase, ...effective, size: effective.footprint };
    });
  };

  const saveCard = async () => {
    if (!String(draft.name || "").trim()) return setMessage("NPC name is required.");
    const saved = await saveCustomCreature(draft);
    setLibrary(await loadCustomCreatures());
    setSelectedLibraryId(saved.id);
    setSelectedCustomTokenId(saved.id);
    setDraft(saved);
    setMessage("NPC card saved on GM device.");
  };

  const removeCard = async () => {
    if (!selectedLibraryId) return;
    setLibrary(await deleteCustomCreature(selectedLibraryId));
    setSelectedLibraryId(""); setSelectedCustomTokenId(""); setDraft(blankCreature());
    setMessage("NPC card removed.");
  };

  const addCustomAttack = () => {
    const targetNumber = Math.max(0, num(draft.body, 0) + num(draft.melee, 0));
    patchDraft({ customAttacks: [...(draft.customAttacks || []), normalizeStructuredAttack({ name: "New Attack", attribute: "BODY", skill: "Combat", targetNumber, damageDice: 4 })] });
  };
  const patchCustomAttack = (index, patch) => patchDraft({ customAttacks: (draft.customAttacks || []).map((attack, i) => i === index ? { ...attack, ...patch } : attack) });
  const removeCustomAttack = (index) => patchDraft({ customAttacks: (draft.customAttacks || []).filter((_, i) => i !== index) });

  const rollAttack = (attack, stats, actorName) => {
    const result = rollNpcAttack(attack, stats, actorName);
    session.sendDiceResult?.(result.check);
    if (result.damage) session.sendDiceResult?.(result.damage);
  };

  const createToken = async ({ name, npcId, avatar = "", stats }) => {
    const footprint = Math.max(1, Math.min(3, num(stats?.footprint, 1)));
    const placement = findFreePlacement(scene, footprint, []);
    if (!placement) return { ok: false, error: `NO_FREE_${footprint}X${footprint}_AREA` };
    return session.createNpcToken?.({ name, size: footprint, npcId, avatar, stats, x: placement.x, y: placement.y });
  };

  const createBestiaryToken = async () => {
    if (!selectedBestiary) return setMessage("Choose a bestiary creature.");
    const base = bestiaryBase(selectedBestiary);
    const stats = buildSpawnStats(base, spawnRank, spawnHorde, spawnHordeSize, spawnFeature);
    const response = await createToken({ name: selectedBestiary.name, npcId: selectedBestiary.id, stats });
    setMessage(response?.ok ? `${selectedBestiary.name} added hidden · ${rankLabel(spawnRank)}${spawnHorde ? ` · HORDE ${spawnHordeSize}` : ""}` : `Could not add token [${response?.error || "ERROR"}]`);
  };

  const createCustomToken = async (item) => {
    if (!item) return setMessage("Choose a saved custom NPC.");
    const base = customBase(item);
    const stats = buildSpawnStats(base, item.rank || "standard", item.hordeEnabled, item.hordeSize, item.specialFeature);
    const response = await createToken({ name: item.name, npcId: item.id, avatar: item.avatar || "", stats });
    setMessage(response?.ok ? `${item.name} added hidden · ${rankLabel(stats.rank)}${stats.hordeEnabled ? ` · HORDE ${stats.hordeSize}` : ""}` : `Could not add token [${response?.error || "ERROR"}]`);
  };

  const updateNpcStats = (token, patch) => session.updateToken?.(token.id, { stats: { ...tokenStats(token), ...patch } });
  const updateHordeMember = (token, index, delta) => {
    const stats = tokenStats(token);
    const max = Math.max(1, num(stats.memberMaxHp, 1));
    const hp = [...(stats.hordeHp || [])];
    hp[index] = Math.max(0, Math.min(max, num(hp[index], max) + delta));
    updateNpcStats(token, { hordeHp: hp, hordeLiving: hp.filter((value) => value > 0).length, hp: hp.reduce((sum, value) => sum + value, 0) });
  };

  const draftEffective = applyNpcRank(customBase(draft), draft);
  const selectedPreviewBase = selectedBestiary ? bestiaryBase(selectedBestiary) : selectedCustom ? customBase(selectedCustom) : null;
  const selectedPreview = selectedPreviewBase ? buildSpawnStats(
    selectedPreviewBase,
    selectedBestiary ? spawnRank : selectedCustom.rank,
    selectedBestiary ? spawnHorde : selectedCustom.hordeEnabled,
    selectedBestiary ? spawnHordeSize : selectedCustom.hordeSize,
    selectedBestiary ? spawnFeature : selectedCustom.specialFeature,
  ) : null;

  return <section className="pip-panel gm-unified-token-manager gm-unified-token-manager-v2">
    <header className="gm-unified-token-manager__head"><div><div className="pip-bootline">TACTICAL CONTROL</div><h2>[ TOKENS / CREATURES ]</h2></div><span>{tokens.length} ON SCENE</span></header>

    <section className="gm-token-section">
      <h3>PLAYERS</h3>
      <div className="gm-player-token-grid">{players.length ? players.map((player) => {
        const token = playerTokenFor(player.clientId); const name = player?.character?.name || player?.name || "Player";
        return <article key={player.clientId} className="gm-token-control-card"><div className="gm-token-control-card__identity"><span className={`session-status-dot ${player.online === false ? "is-disconnected" : "is-online"}`} /><strong>{name}</strong><small>{token ? `TOKEN ${tokenSize(token)}×${tokenSize(token)}` : "NO TOKEN"}</small></div><div className="gm-token-control-card__actions">
          {!token ? <><button className="pip-btn" disabled={!session.liveSceneId} onClick={() => session.createAssignedPlayerToken?.({ targetClientId: player.clientId, name, size: 1 })}>ASSIGN 1×1</button><button className="pip-btn" disabled={!session.liveSceneId} onClick={() => session.createAssignedPlayerToken?.({ targetClientId: player.clientId, name, size: 2 })}>ASSIGN 2×2</button></> : <><select className="pip-input" value={tokenSize(token)} onChange={(e) => session.updateAssignedPlayerToken?.(player.clientId, { size: Number(e.target.value) === 2 ? 2 : 1 })}><option value="1">1×1</option><option value="2">2×2</option></select><button className="pip-btn" onClick={() => session.removeAssignedPlayerToken?.(player.clientId)}>REMOVE</button></>}
        </div></article>;
      }) : <div className="pip-logbox">No players connected.</div>}</div>
    </section>

    <section className="gm-token-section gm-bestiary-picker">
      <div className="gm-token-section__head"><h3>ADD CREATURE TOKEN</h3><span>{filteredBestiary.length} BESTIARY · {filteredCustom.length} CUSTOM</span></div>
      <div className="gm-bestiary-filter-row"><input className="pip-input" value={search} placeholder="Search creatures..." onChange={(e) => setSearch(e.target.value)} /><select className="pip-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">ALL CREATURE TYPES</option>{typeOptions.map((type) => <option key={type}>{type}</option>)}</select></div>
      <div className="gm-bestiary-picker__controls"><select className="pip-input" value={selectedBestiaryId} onChange={(e) => { setSelectedBestiaryId(e.target.value); setSelectedCustomTokenId(""); }}><option value="">— BESTIARY CREATURE —</option>{filteredBestiary.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {primaryType(entry.creatureType, entry.category)}</option>)}</select><button className="pip-btn is-primary" disabled={!selectedBestiary} onClick={createBestiaryToken}>ADD BESTIARY</button><select className="pip-input" value={selectedCustomTokenId} onChange={(e) => { setSelectedCustomTokenId(e.target.value); setSelectedBestiaryId(""); }}><option value="">— SAVED CUSTOM NPC —</option>{filteredCustom.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {rankLabel(entry.rank)}</option>)}</select><button className="pip-btn is-primary" disabled={!selectedCustom} onClick={() => createCustomToken(selectedCustom)}>ADD CUSTOM</button></div>
      {selectedBestiary ? <div className="gm-npc-spawn-modifiers"><label>RANK<select className="pip-input" value={spawnRank} onChange={(e) => setSpawnRank(e.target.value)}>{NPC_RANKS.map((rank) => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}</select></label><label className="gm-horde-toggle"><input type="checkbox" checked={spawnHorde} onChange={(e) => setSpawnHorde(e.target.checked)} /> HORDE</label>{spawnHorde ? <label>GROUP<select className="pip-input" value={spawnHordeSize} onChange={(e) => setSpawnHordeSize(Number(e.target.value))}>{[2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></label> : null}{spawnRank === "special" ? <label className="is-wide">SPECIAL FEATURE<select className="pip-input" value={spawnFeature} onChange={(e) => setSpawnFeature(e.target.value)}><option value="">— FEATURE —</option>{featureOptions.map((name) => <option key={name}>{name}</option>)}</select></label> : null}</div> : null}
      {selectedPreview ? <div className="gm-bestiary-preview"><div><strong>{selectedBestiary?.name || selectedCustom?.name}</strong><span>{rankLabel(selectedPreview.rank)}{selectedPreview.hordeEnabled ? ` · HORDE ${selectedPreview.hordeSize}` : ""}</span></div><div className="gm-bestiary-preview__stats"><span>HP {selectedPreview.hp}/{selectedPreview.maxHp}</span><span>DEF {selectedPreview.defense}</span><span>XP {selectedPreview.xp}</span><span>DR +{selectedPreview.resistanceBonus}</span><span>DMG ×{selectedPreview.damageMultiplier}</span><span>{selectedPreview.footprint}×{selectedPreview.footprint}</span></div></div> : null}
    </section>

    <section className="gm-token-section gm-custom-npc-card">
      <div className="gm-token-section__head"><h3>CUSTOM NPC CARD</h3><span>ATTACKS · RANK · HORDE</span></div>
      <div className="gm-creature-library-row"><select className="pip-input" value={selectedLibraryId} onChange={(e) => chooseLibrary(e.target.value)}><option value="">— NEW NPC CARD —</option>{library.map((item) => <option key={item.id} value={item.id}>{item.name} · {rankLabel(item.rank)}</option>)}</select><button className="pip-btn" onClick={() => { setSelectedLibraryId(""); setDraft(blankCreature()); setMessage(""); }}>NEW</button>{selectedLibraryId ? <button className="pip-btn" onClick={removeCard}>DELETE CARD</button> : null}</div>

      <div className="gm-npc-card-editor">
        <div className="gm-npc-card-editor__identity"><button className="gm-creature-avatar" onClick={() => avatarRef.current?.click()}>{draft.avatar ? <img src={draft.avatar} alt="" /> : <span>NPC</span>}</button><input ref={avatarRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ""; }} /><label className="is-wide"><span>NAME</span><input className="pip-input" value={draft.name || ""} onChange={(e) => patchDraft({ name: e.target.value })} /></label><label className="is-wide"><span>CREATURE TYPE</span><input className="pip-input" value={draft.creatureType || ""} onChange={(e) => patchDraft({ creatureType: e.target.value })} /></label><label><span>BASE SIZE</span><select className="pip-input" value={draft.baseSize || 1} onChange={(e) => setDraftRank({ baseSize: Number(e.target.value), size: Number(e.target.value) })}><option value="1">1×1</option><option value="2">2×2 BIG</option></select></label><label><span>LVL</span><input className="pip-input" type="number" min="0" value={draft.level ?? 0} onChange={(e) => patchDraft({ level: Number(e.target.value) })} /></label></div>

        <div className="gm-npc-card-editor__section"><h4>CREATURE MODIFIER</h4><div className="gm-npc-rank-grid"><label>RANK<select className="pip-input" value={draft.rank || "standard"} onChange={(e) => setDraftRank({ rank: e.target.value })}>{NPC_RANKS.map((rank) => <option value={rank} key={rank}>{rankLabel(rank)}</option>)}</select></label><label className="gm-horde-toggle"><input type="checkbox" checked={Boolean(draft.hordeEnabled)} onChange={(e) => setDraftRank({ hordeEnabled: e.target.checked })} /> HORDE</label>{draft.hordeEnabled ? <label>GROUP SIZE<select className="pip-input" value={draft.hordeSize || 2} onChange={(e) => setDraftRank({ hordeSize: Number(e.target.value) })}>{[2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></label> : null}{draft.rank === "special" ? <label className="is-wide">SPECIAL FEATURE<select className="pip-input" value={draft.specialFeature || ""} onChange={(e) => patchDraft({ specialFeature: e.target.value })}><option value="">— SELECT FEATURE —</option>{featureOptions.map((name) => <option key={name}>{name}</option>)}</select></label> : null}{draft.rank === "legendary" ? <><label className="is-wide">LEGENDARY ABILITY<textarea className="pip-input" value={draft.legendaryAbility || ""} onChange={(e) => patchDraft({ legendaryAbility: e.target.value })} /></label><label className="is-wide">LEGENDARY REWARD<textarea className="pip-input" placeholder="Unique encounter reward" value={draft.legendaryReward || ""} onChange={(e) => patchDraft({ legendaryReward: e.target.value })} /></label></> : null}</div><div className="gm-npc-effective-stats"><span>HP <b>{draftEffective.hp}/{draftEffective.maxHp}</b></span><span>DEF <b>{draftEffective.defense}</b></span><span>XP <b>{draftEffective.xp}</b></span><span>DR <b>+{draftEffective.resistanceBonus}</b></span><span>DMG <b>×{draftEffective.damageMultiplier}</b></span><span>FOOTPRINT <b>{draftEffective.footprint}×{draftEffective.footprint}</b></span></div></div>

        <div className="gm-npc-card-editor__section"><h4>BASE COMBAT STATS</h4><div className="gm-npc-card-editor__stats"><label><span>BASE HP</span><input className="pip-input" type="number" min="1" value={draft.baseMaxHp ?? 10} onChange={(e) => setDraftRank({ baseMaxHp: Number(e.target.value), maxHp: Number(e.target.value), hp: Number(e.target.value) })} /></label><label><span>BASE DEF</span><input className="pip-input" type="number" min="0" value={draft.baseDefense ?? 1} onChange={(e) => setDraftRank({ baseDefense: Number(e.target.value), defense: Number(e.target.value) })} /></label><label><span>BASE XP</span><input className="pip-input" type="number" min="0" value={draft.baseXp ?? 0} onChange={(e) => setDraftRank({ baseXp: Number(e.target.value), xp: Number(e.target.value) })} /></label><label><span>INIT</span><input className="pip-input" type="number" min="0" value={draft.initiative ?? 0} onChange={(e) => patchDraft({ initiative: Number(e.target.value) })} /></label>{["body","mind","melee","guns","other"].map((key) => <label key={key}><span>{key.toUpperCase()}</span><input className="pip-input" value={draft[key] ?? ""} onChange={(e) => patchDraft({ [key]: e.target.value })} /></label>)}</div></div>

        <div className="gm-npc-card-editor__section"><h4>S.P.E.C.I.A.L.</h4><div className="gm-npc-card-editor__special">{SPECIAL_KEYS.map((key) => <label key={key}><span>{key}</span><input className="pip-input" type="number" min="0" max="20" value={draft.special?.[key] ?? ""} onChange={(e) => patchSpecial(key, e.target.value)} /></label>)}</div></div>

        <div className="gm-npc-card-editor__section"><div className="gm-token-section__head"><h4>CUSTOM ATTACKS</h4><button className="pip-btn" onClick={addCustomAttack}>+ ATTACK</button></div><div className="gm-npc-attack-editor-list">{(draft.customAttacks || []).map((attack, index) => <div className="gm-npc-attack-editor" key={attack.id || index}><input className="pip-input" value={attack.name || ""} placeholder="Attack name" onChange={(e) => patchCustomAttack(index, { name: e.target.value })} /><label>TN<input className="pip-input" type="number" min="0" max="20" value={attack.targetNumber ?? 0} onChange={(e) => patchCustomAttack(index, { targetNumber: Number(e.target.value) })} /></label><label>CD<input className="pip-input" type="number" min="0" value={attack.damageDice ?? 0} onChange={(e) => patchCustomAttack(index, { damageDice: Number(e.target.value) })} /></label><input className="pip-input" value={attack.skill || "Combat"} placeholder="Skill" onChange={(e) => patchCustomAttack(index, { skill: e.target.value })} /><input className="pip-input" value={attack.damageType || "Physical"} placeholder="Damage type" onChange={(e) => patchCustomAttack(index, { damageType: e.target.value })} /><input className="pip-input" value={attack.effects || ""} placeholder="Effects" onChange={(e) => patchCustomAttack(index, { effects: e.target.value })} /><button className="pip-btn" onClick={() => rollAttack(attack, draftEffective, draft.name || "NPC")}>ROLL</button><button className="pip-btn" onClick={() => removeCustomAttack(index)}>×</button></div>)}</div></div>

        <div className="gm-npc-card-editor__section"><h4>DETAILS</h4><div className="gm-npc-card-editor__text-grid"><label><span>SKILLS</span><textarea className="pip-input" value={draft.skills || ""} onChange={(e) => patchDraft({ skills: e.target.value })} /></label><label><span>LEGACY / TEXT ATTACKS</span><textarea className="pip-input" value={draft.attacks || ""} onChange={(e) => patchDraft({ attacks: e.target.value })} /></label><label><span>ABILITIES</span><textarea className="pip-input" value={draft.abilities || ""} onChange={(e) => patchDraft({ abilities: e.target.value })} /></label><label><span>DR / RESISTANCE</span><textarea className="pip-input" value={draft.drBlock || ""} onChange={(e) => patchDraft({ drBlock: e.target.value })} /></label><label><span>TACTICS</span><textarea className="pip-input" value={draft.tactics || ""} onChange={(e) => patchDraft({ tactics: e.target.value })} /></label><label><span>LOOT</span><textarea className="pip-input" value={draft.loot || ""} onChange={(e) => patchDraft({ loot: e.target.value })} /></label><label><span>SUMMARY</span><textarea className="pip-input" value={draft.summary || ""} onChange={(e) => patchDraft({ summary: e.target.value })} /></label><label><span>NOTES</span><textarea className="pip-input" value={draft.notes || ""} onChange={(e) => patchDraft({ notes: e.target.value })} /></label></div></div>
      </div>
      <div className="gm-creature-editor-actions"><button className="pip-btn" onClick={() => avatarRef.current?.click()}>AVATAR ≤500 KB</button><button className="pip-btn" onClick={saveCard}>SAVE NPC CARD</button><button className="pip-btn is-primary" onClick={() => createCustomToken(draft)}>ADD HIDDEN TOKEN</button></div>
      {message ? <div className="gm-token-manager-message">{message}</div> : null}
    </section>

    <section className="gm-token-section"><div className="gm-token-section__head"><h3>CREATURES ON SCENE</h3><span>CLICK TO VIEW / ATTACK</span></div><div className="gm-npc-token-list">{npcTokens.length ? npcTokens.map((token) => {
      const stats = tokenStats(token); const linked = bestiaryEntryFor(token); const visible = stats.visibleToPlayers !== false; const controller = String(stats.controlledByClientId || ""); const hp = Math.max(0, num(stats.hp)); const maxHp = Math.max(0, num(stats.maxHp, hp)); const expanded = expandedTokenId === token.id; const attacks = attacksFor(stats, linked);
      return <article className={`gm-npc-token-row${visible ? " is-active" : " is-hidden"}${expanded ? " is-expanded" : ""}`} key={token.id}><button className="gm-npc-token-row__summary" aria-expanded={expanded} onClick={() => setExpandedTokenId(expanded ? "" : token.id)}><div className="gm-npc-token-row__avatar">{token.avatar ? <img src={token.avatar} alt="" draggable={false} /> : <span>{String(token.name || "N").slice(0,1)}</span>}</div><div className="gm-npc-token-row__main"><strong>{token.name}</strong><small>{visible ? "VISIBLE" : "HIDDEN"} · {rankLabel(stats.rank)}{stats.hordeEnabled ? ` · HORDE ${stats.hordeLiving}/${stats.hordeSize}` : ""} · INIT {num(stats.initiative)}</small><div className="gm-npc-token-row__stats"><span>HP {hp}/{maxHp}</span><span>DEF {num(stats.defense)}</span><span>XP {num(stats.xp)}</span><span>DR +{num(stats.resistanceBonus)}</span><span>{tokenSize(token)}×{tokenSize(token)}</span></div></div><span className="gm-npc-token-row__chevron">{expanded ? "▲" : "▼"}</span></button><div className="gm-npc-token-row__actions"><button className={`pip-btn${visible ? "" : " is-primary"}`} onClick={() => session.updateNpcVisibility?.(token.id, !visible)}>{visible ? "HIDE" : "ACTIVATE"}</button><select className="pip-input" value={controller} onChange={(e) => session.updateNpcController?.(token.id, e.target.value)}><option value="">GM CONTROL</option>{players.map((player) => <option key={player.clientId} value={player.clientId}>{player?.character?.name || player?.name || "Player"}</option>)}</select>{!stats.hordeEnabled ? <><button className="pip-btn" onClick={() => updateNpcStats(token, { hp: Math.max(0, hp - 1) })}>-HP</button><button className="pip-btn" onClick={() => updateNpcStats(token, { hp: Math.min(maxHp, hp + 1) })}>+HP</button></> : null}<button className="pip-btn" onClick={() => session.deleteToken?.(token.id)}>REMOVE</button></div>
      {expanded ? <div className="gm-npc-token-details"><div className="gm-npc-token-details__quick"><span>HP <b>{hp}/{maxHp}</b></span><span>DEF <b>{num(stats.defense)}</b></span><span>INIT <b>{num(stats.initiative)}</b></span><span>LVL <b>{num(stats.level)}</b></span><span>XP <b>{num(stats.xp)}</b></span><span>RANK <b>{rankLabel(stats.rank)}</b></span><span>DR BONUS <b>+{num(stats.resistanceBonus)}</b></span><span>DMG <b>×{num(stats.damageMultiplier,1)}</b></span></div>
        {stats.hordeEnabled ? <div className="gm-horde-members"><strong>HORDE MEMBERS</strong>{(stats.hordeHp || []).map((memberHp, index) => <div key={index} className={`gm-horde-member${memberHp <= 0 ? " is-down" : ""}`}><span>#{index + 1}</span><b>{memberHp}/{stats.memberMaxHp}</b><button className="pip-btn" onClick={() => updateHordeMember(token,index,-1)}>−</button><button className="pip-btn" onClick={() => updateHordeMember(token,index,1)}>+</button></div>)}</div> : null}
        {attacks.length ? <div className="gm-npc-attack-buttons"><strong>ATTACKS · CLICK TO ROLL</strong>{attacks.map((attack,index) => <button key={`${attack.id}-${index}`} className="gm-npc-attack-button" onClick={() => rollAttack(attack, stats, token.name)}><b>{attack.name}</b><span>TN {attack.targetNumber || "—"} · {attack.damageDice} CD · {attack.damageType}{attack.effects ? ` · ${attack.effects}` : ""}</span></button>)}</div> : null}
        <DetailLine label="TYPE" value={stats.creatureType || linked?.creatureType} /><DetailLine label="SPECIAL FEATURE" value={stats.specialFeature} /><DetailLine label="LEGENDARY ABILITY" value={stats.legendaryAbility} /><DetailLine label="LEGENDARY REWARD" value={stats.legendaryReward} /><DetailLine label="SPECIAL" value={stats.special || linked?.special} /><DetailLine label="SKILLS" value={stats.skills || linked?.skills} /><DetailLine label="ABILITIES" value={stats.abilities || linked?.abilities} /><DetailLine label="DR / RESISTANCE" value={`${stats.drBlock || linked?.drBlock || ""}${num(stats.resistanceBonus) ? ` · +${stats.resistanceBonus} ALL` : ""}`} /><DetailLine label="TACTICS" value={stats.tactics || linked?.tactics} /><DetailLine label="LOOT" value={stats.loot || linked?.loot} /><DetailLine label="SUMMARY" value={stats.summary || linked?.summary} /><DetailLine label="NOTES" value={stats.notes} /><DetailLine label="SOURCE" value={stats.source || linked?.source} />
      </div> : null}</article>;
    }) : <div className="pip-logbox">No creatures on this scene.</div>}</div></section>
  </section>;
}
