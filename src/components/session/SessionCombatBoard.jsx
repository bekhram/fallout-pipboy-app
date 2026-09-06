import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import SessionActorProfile from "./SessionActorProfile.jsx";
import "./sessionBestiaryPicker.css";

const BESTIARY_COPY = {
  en: {
    open: "ADD FROM BESTIARY",
    close: "CLOSE BESTIARY",
    title: "BESTIARY ENEMIES",
    search: "Search by name, type or tag...",
    add: "ADD",
    noResults: "No matching creatures.",
    level: "LVL",
    defense: "DEF",
    initiative: "INIT",
    armor: "DR P/E",
  },
  ru: {
    open: "ДОБАВИТЬ ИЗ БЕСТИАРИЯ",
    close: "ЗАКРЫТЬ БЕСТИАРИЙ",
    title: "ПРОТИВНИКИ ИЗ БЕСТИАРИЯ",
    search: "Поиск по имени, типу или тегу...",
    add: "ДОБАВИТЬ",
    noResults: "Подходящих существ нет.",
    level: "УР",
    defense: "ЗАЩ",
    initiative: "ИНИЦ",
    armor: "DR P/E",
  },
  uk: {
    open: "ДОДАТИ З БЕСТІАРІЮ",
    close: "ЗАКРИТИ БЕСТІАРІЙ",
    title: "ПРОТИВНИКИ З БЕСТІАРІЮ",
    search: "Пошук за ім’ям, типом або тегом...",
    add: "ДОДАТИ",
    noResults: "Відповідних істот немає.",
    level: "РІВ",
    defense: "ЗАХ",
    initiative: "ІНІЦ",
    armor: "DR P/E",
  },
  pl: {
    open: "DODAJ Z BESTIARIUSZA",
    close: "ZAMKNIJ BESTIARIUSZ",
    title: "PRZECIWNICY Z BESTIARIUSZA",
    search: "Szukaj po nazwie, typie lub tagu...",
    add: "DODAJ",
    noResults: "Brak pasujących stworzeń.",
    level: "POZ",
    defense: "OBR",
    initiative: "INIC",
    armor: "DR P/E",
  },
};

function languageOf(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return BESTIARY_COPY[code] ? code : "en";
}

function clampPercent(current, max) {
  const safeMax = Math.max(1, Number(max || 1));
  const safeCurrent = Math.max(0, Number(current || 0));
  return Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100));
}

function sortActors(actors) {
  return [...actors].sort((a, b) =>
    Number(b.initiative || 0) - Number(a.initiative || 0)
    || (a.kind === b.kind ? 0 : a.kind === "player" ? -1 : 1)
    || String(a.name || "").localeCompare(String(b.name || ""))
  );
}

function actorInitials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?";
}

function firstNumber(value, fallback = 0) {
  const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return fallback;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bestiaryArmor(entry) {
  const text = String(entry?.drBlock || "");
  const physicalMatch = text.match(/Physical\s*:?\s*(\d+)/i);
  const energyMatch = text.match(/Energy\s*:?\s*(\d+)/i);
  const allNumbers = text.match(/\d+/g) || [];
  return {
    physical: physicalMatch ? Number(physicalMatch[1]) : Number(allNumbers[0] || 0),
    energy: energyMatch ? Number(energyMatch[1]) : Number(allNumbers[1] || 0),
  };
}

function mergeLiveActor(actor, players) {
  if (actor?.kind !== "player") return actor;
  const player = players.find((item) => item.peerId === actor.peerId);
  const character = player?.character;
  if (!character) return actor;
  return {
    ...actor,
    name: character.name || actor.name,
    currentHp: character.currentHp,
    maxHp: character.maxHp,
    defense: character.defense,
    armorPhysical: character.armor?.physical ?? actor.armorPhysical ?? 0,
    armorEnergy: character.armor?.energy ?? actor.armorEnergy ?? 0,
    initiative: character.initiative ?? actor.initiative ?? 0,
    avatar: character.avatar || actor.avatar || "",
    profile: character,
  };
}

function ActorCard({ actor, active, copy, mode, session, onOpenProfile }) {
  const hpCurrent = Math.max(0, Number(actor.currentHp || 0));
  const hpMax = Math.max(0, Number(actor.maxHp || 0));
  const hpPercent = clampPercent(hpCurrent, hpMax);
  const isNpc = actor.kind === "npc";

  return (
    <article className={`session-actor-card${active ? " is-active" : ""}${isNpc ? " is-npc" : " is-player"}`}>
      <div className="session-actor-card-head">
        <span className="session-turn-kind">{isNpc ? copy.npc : copy.player}</span>
        <span className="session-actor-init">{copy.initiative} <strong>{actor.initiative ?? 0}</strong></span>
      </div>

      <div className="session-actor-identity">
        <button type="button" className={`session-actor-avatar${isNpc ? " is-npc" : ""}`} onClick={() => onOpenProfile?.(actor.id)} aria-label={actor.name}>
          {actor.avatar ? <img src={actor.avatar} alt="" /> : <span>{actorInitials(actor.name)}</span>}
        </button>
        <button type="button" className="session-actor-name session-actor-name-button" onClick={() => onOpenProfile?.(actor.id)}>{actor.name || "—"}</button>
      </div>

      <div className="session-actor-primary-stats">
        <div className="session-actor-stat">
          <span>{copy.hp}</span>
          <strong>{hpCurrent}/{hpMax || "—"}</strong>
        </div>
        <div className="session-actor-stat">
          <span>{copy.armor}</span>
          <strong>P {actor.armorPhysical ?? 0} · E {actor.armorEnergy ?? 0}</strong>
        </div>
        <div className="session-actor-stat">
          <span>{copy.initiative}</span>
          <strong>{actor.initiative ?? 0}</strong>
        </div>
      </div>

      <div className="session-hp-track" aria-label={`${copy.hp}: ${hpCurrent}/${hpMax}`}>
        <div className="session-hp-fill" style={{ width: `${hpPercent}%` }} />
      </div>

      {isNpc && mode === "host" && session.combat?.active && (
        <div className="session-npc-hp-controls session-npc-hp-editor">
          <button type="button" className="pip-btn" onClick={() => session.setCombatNpcHp(actor.id, hpCurrent - 1)} disabled={hpCurrent <= 0}>−1</button>
          <label className="session-npc-hp-field">
            <span>HP</span>
            <input
              className="pip-input"
              type="number"
              min="0"
              max={Math.max(1, hpMax)}
              value={hpCurrent}
              onChange={(event) => session.setCombatNpcHp(actor.id, event.target.value)}
            />
          </label>
          <span className="session-npc-hp-divider">/</span>
          <label className="session-npc-hp-field">
            <span>MAX</span>
            <input
              className="pip-input"
              type="number"
              min="1"
              max="9999"
              value={Math.max(1, hpMax)}
              onChange={(event) => session.setCombatNpcMaxHp(actor.id, event.target.value)}
            />
          </label>
          <button type="button" className="pip-btn" onClick={() => session.setCombatNpcHp(actor.id, hpCurrent + 1)} disabled={hpMax > 0 && hpCurrent >= hpMax}>+1</button>
        </div>
      )}
    </article>
  );
}

export default function SessionCombatBoard({ session, players, mode, copy }) {
  const { i18n } = useTranslation();
  const bestiaryCopy = BESTIARY_COPY[languageOf(i18n.resolvedLanguage || i18n.language)];
  const combat = session?.combat || {};
  const [selectedActorId, setSelectedActorId] = useState(null);
  const [npcName, setNpcName] = useState("");
  const [npcInitiative, setNpcInitiative] = useState("10");
  const [npcHp, setNpcHp] = useState("10");
  const [npcArmorPhysical, setNpcArmorPhysical] = useState("0");
  const [npcArmorEnergy, setNpcArmorEnergy] = useState("0");
  const [bestiaryOpen, setBestiaryOpen] = useState(false);
  const [bestiarySearch, setBestiarySearch] = useState("");

  const bestiaryEntries = useMemo(() => {
    const query = String(bestiarySearch || "").trim().toLowerCase();
    return BESTIARY_ENTRIES
      .filter((entry) => entry?.statKind === "creature" && String(entry?.name || "").trim() && firstNumber(entry?.hp, 0) > 0)
      .filter((entry) => {
        if (!query) return true;
        const haystack = [entry.name, entry.creatureType, entry.category, ...(Array.isArray(entry.tags) ? entry.tags : [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .slice(0, 120);
  }, [bestiarySearch]);

  const previewActors = useMemo(() => {
    const playerActors = players
      .filter((player) => player?.character)
      .map((player) => ({
        id: `player:${player.peerId}`,
        kind: "player",
        peerId: player.peerId,
        name: player.character.name || player.name || "Player",
        currentHp: player.character.currentHp,
        maxHp: player.character.maxHp,
        defense: player.character.defense,
        armorPhysical: player.character.armor?.physical ?? 0,
        armorEnergy: player.character.armor?.energy ?? 0,
        initiative: player.character.initiative ?? 0,
        avatar: player.character.avatar || "",
        profile: player.character,
      }));
    const npcActors = (combat.npcs || []).map((npc) => ({
      id: `npc:${npc.id}`,
      kind: "npc",
      peerId: null,
      name: npc.name,
      currentHp: npc.currentHp,
      maxHp: npc.maxHp,
      armorPhysical: npc.armorPhysical,
      armorEnergy: npc.armorEnergy,
      initiative: npc.initiative,
    }));
    return sortActors([...playerActors, ...npcActors]);
  }, [players, combat.npcs]);

  const actors = (combat.active ? combat.order || [] : previewActors)
    .map((actor) => mergeLiveActor(actor, players));
  const activeActor = actors.find((actor) => actor.id === combat.activeActorId) || null;
  const selectedActor = actors.find((actor) => actor.id === selectedActorId) || null;

  const handleAddNpc = (event) => {
    event.preventDefault();
    if (!String(npcName).trim()) return;
    const ok = session.addCombatNpc({
      name: npcName,
      initiative: Number(npcInitiative || 0),
      maxHp: Number(npcHp || 0),
      currentHp: Number(npcHp || 0),
      armorPhysical: Number(npcArmorPhysical || 0),
      armorEnergy: Number(npcArmorEnergy || 0),
    });
    if (!ok) return;
    setNpcName("");
    setNpcInitiative("10");
    setNpcHp("10");
    setNpcArmorPhysical("0");
    setNpcArmorEnergy("0");
  };

  const handleAddBestiaryNpc = (entry) => {
    const hp = Math.max(1, firstNumber(entry?.hp, 10));
    const initiative = Math.max(0, firstNumber(entry?.initiative, 0));
    const armor = bestiaryArmor(entry);
    session.addCombatNpc({
      name: entry?.name,
      initiative,
      maxHp: hp,
      currentHp: hp,
      armorPhysical: armor.physical,
      armorEnergy: armor.energy,
    });
  };

  return (
    <section className="session-combat-board">
      <section className="pip-panel pip-block session-initiative-panel">
        <div className="pip-head">
          <h2>[ {copy.initiativeTrack} ]</h2>
          <span>{combat.active ? `${copy.round}: ${combat.round}` : copy.preview}</span>
        </div>

        <div className="session-initiative-strip">
          {actors.length ? actors.map((actor, index) => (
            <div key={actor.id} className={`session-initiative-token${actor.id === combat.activeActorId ? " is-active" : ""}${actor.kind === "npc" ? " is-npc" : " is-player"}`}>
              <span className="session-initiative-order">{index + 1}</span>
              <button type="button" className={`session-initiative-avatar${actor.kind === "npc" ? " is-npc" : ""}`} onClick={() => setSelectedActorId(actor.id)} aria-label={actor.name}>
                {actor.avatar ? <img src={actor.avatar} alt="" /> : <span>{actorInitials(actor.name)}</span>}
              </button>
              <button type="button" className="session-initiative-name session-initiative-name-button" onClick={() => setSelectedActorId(actor.id)}>{actor.name}</button>
              <strong>{actor.initiative ?? 0}</strong>
            </div>
          )) : <div className="pip-logbox">{copy.noActors}</div>}
        </div>

        {combat.active && (
          <div className="session-combat-summary session-board-summary">
            <div><span>{copy.currentTurn}</span><strong>{activeActor?.name || "—"}</strong></div>
            <div><span>{copy.round}</span><strong>{combat.round || 1}</strong></div>
            <div className="session-ap-box">
              <span>{copy.groupAp}</span>
              {mode === "host" ? (
                <div className="session-ap-controls">
                  <button type="button" className="pip-btn" onClick={() => session.setCombatAp(combat.ap - 1)} disabled={combat.ap <= 0}>−</button>
                  <strong>{combat.ap}/{combat.apMax}</strong>
                  <button type="button" className="pip-btn" onClick={() => session.setCombatAp(combat.ap + 1)} disabled={combat.ap >= combat.apMax}>+</button>
                </div>
              ) : <strong>{combat.ap}/{combat.apMax}</strong>}
            </div>
          </div>
        )}
      </section>

      <section className="pip-panel pip-block">
        <div className="pip-head"><h2>[ {copy.combatants} ]</h2><span>{actors.length}</span></div>
        <div className="session-actor-grid">
          {actors.map((actor) => (
            <ActorCard key={actor.id} actor={actor} active={actor.id === combat.activeActorId} copy={copy} mode={mode} session={session} onOpenProfile={setSelectedActorId} />
          ))}
        </div>
      </section>

      {mode === "host" && !combat.active && (
        <section className="pip-panel pip-block session-npc-builder">
          <div className="pip-head">
            <h2>[ {copy.addNpc} ]</h2>
            <button type="button" className="pip-btn is-primary" onClick={() => setBestiaryOpen((value) => !value)}>
              {bestiaryOpen ? bestiaryCopy.close : bestiaryCopy.open}
            </button>
          </div>

          {bestiaryOpen && (
            <section className="session-bestiary-picker">
              <div className="session-bestiary-picker-head">
                <strong>[ {bestiaryCopy.title} ]</strong>
                <span>{bestiaryEntries.length}</span>
              </div>
              <input
                className="pip-input session-bestiary-picker-search"
                value={bestiarySearch}
                placeholder={bestiaryCopy.search}
                onChange={(event) => setBestiarySearch(event.target.value)}
              />
              <div className="session-bestiary-picker-list">
                {bestiaryEntries.length ? bestiaryEntries.map((entry) => {
                  const armor = bestiaryArmor(entry);
                  return (
                    <article className="session-bestiary-entry" key={entry.id || entry.name}>
                      <div className="session-bestiary-entry-head">
                        <div>
                          <div className="session-bestiary-entry-name">{entry.name}</div>
                          <div className="session-bestiary-entry-type">{entry.creatureType || entry.category || "NPC"}</div>
                        </div>
                        <span className="session-bestiary-entry-level">{bestiaryCopy.level} {entry.level || "—"}</span>
                      </div>
                      <div className="session-bestiary-entry-stats">
                        <div className="session-bestiary-entry-stat"><span>HP</span><strong>{firstNumber(entry.hp, 0)}</strong></div>
                        <div className="session-bestiary-entry-stat"><span>{bestiaryCopy.defense}</span><strong>{firstNumber(entry.defense, 0)}</strong></div>
                        <div className="session-bestiary-entry-stat"><span>{bestiaryCopy.initiative}</span><strong>{firstNumber(entry.initiative, 0)}</strong></div>
                        <div className="session-bestiary-entry-stat"><span>{bestiaryCopy.armor}</span><strong>{armor.physical}/{armor.energy}</strong></div>
                      </div>
                      <button type="button" className="pip-btn" onClick={() => handleAddBestiaryNpc(entry)}>+ {bestiaryCopy.add}</button>
                    </article>
                  );
                }) : <div className="pip-logbox session-bestiary-picker-empty">{bestiaryCopy.noResults}</div>}
              </div>
            </section>
          )}

          <div className="session-precombat-npc-list">
            {(combat.npcs || []).map((npc) => (
              <div key={npc.id} className="session-precombat-npc-row">
                <input className="pip-input" value={npc.name} maxLength={60} onChange={(event) => session.updateCombatNpc(npc.id, { name: event.target.value })} />
                <label><span>{copy.initiative}</span><input className="pip-input" type="number" min="0" max="99" value={npc.initiative} onChange={(event) => session.updateCombatNpc(npc.id, { initiative: event.target.value })} /></label>
                <label><span>{copy.hp}</span><input className="pip-input" type="number" min="0" max="9999" value={npc.maxHp} onChange={(event) => session.updateCombatNpc(npc.id, { maxHp: event.target.value, currentHp: event.target.value })} /></label>
                <label><span>P</span><input className="pip-input" type="number" min="0" max="99" value={npc.armorPhysical} onChange={(event) => session.updateCombatNpc(npc.id, { armorPhysical: event.target.value })} /></label>
                <label><span>E</span><input className="pip-input" type="number" min="0" max="99" value={npc.armorEnergy} onChange={(event) => session.updateCombatNpc(npc.id, { armorEnergy: event.target.value })} /></label>
                <button type="button" className="pip-btn" onClick={() => session.removeCombatNpc(npc.id)}>{copy.remove}</button>
              </div>
            ))}
          </div>

          <form className="session-board-npc-form" onSubmit={handleAddNpc}>
            <input className="pip-input" maxLength={60} value={npcName} placeholder={copy.npcName} onChange={(event) => setNpcName(event.target.value)} />
            <label><span>{copy.initiative}</span><input className="pip-input" type="number" min="0" max="99" value={npcInitiative} onChange={(event) => setNpcInitiative(event.target.value)} /></label>
            <label><span>{copy.hp}</span><input className="pip-input" type="number" min="0" max="9999" value={npcHp} onChange={(event) => setNpcHp(event.target.value)} /></label>
            <label><span>P</span><input className="pip-input" type="number" min="0" max="99" value={npcArmorPhysical} onChange={(event) => setNpcArmorPhysical(event.target.value)} /></label>
            <label><span>E</span><input className="pip-input" type="number" min="0" max="99" value={npcArmorEnergy} onChange={(event) => setNpcArmorEnergy(event.target.value)} /></label>
            <button type="submit" className="pip-btn">{copy.addNpc}</button>
          </form>

          <button type="button" className="pip-btn is-primary session-main-button" onClick={() => session.startCombat()} disabled={!actors.length}>{copy.startCombat}</button>
        </section>
      )}

      {mode === "host" && combat.active && (
        <section className="pip-panel pip-block session-combat-actions session-board-actions">
          <button type="button" className="pip-btn is-primary" onClick={() => session.nextCombatTurn()}>{copy.nextTurn}</button>
          <button type="button" className="pip-btn" onClick={() => session.endCombat()}>{copy.endCombat}</button>
        </section>
      )}

      {selectedActor && <SessionActorProfile actor={selectedActor} onClose={() => setSelectedActorId(null)} />}
    </section>
  );
}
