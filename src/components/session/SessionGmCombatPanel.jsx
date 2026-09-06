import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import SessionActorProfile from "./SessionActorProfile.jsx";
import "./sessionGmCombatPanel.css";

const COPY = {
  en: {
    title: "GM TURN PANEL", preview: "PREVIEW", current: "CURRENT", round: "ROUND", ap: "GROUP AP",
    next: "NEXT TURN", start: "START COMBAT", end: "END COMBAT", noActors: "No combatants yet.",
    editNpc: "EDIT NPC", close: "CLOSE", apply: "APPLY", name: "NAME", hp: "HP", maxHp: "MAX HP",
    defense: "DEFENSE", initiative: "INITIATIVE", physical: "PHYSICAL DR", energy: "ENERGY DR", level: "LEVEL",
    type: "TYPE", npc: "NPC", player: "PLAYER"
  },
  ru: {
    title: "ПОРЯДОК ХОДА ГМ", preview: "ПРЕДПРОСМОТР", current: "ТЕКУЩИЙ", round: "РАУНД", ap: "ОБЩИЕ AP",
    next: "СЛЕДУЮЩИЙ ХОД", start: "НАЧАТЬ БОЙ", end: "ЗАВЕРШИТЬ БОЙ", noActors: "Пока нет участников.",
    editNpc: "РЕДАКТОР NPC", close: "ЗАКРЫТЬ", apply: "ПРИМЕНИТЬ", name: "ИМЯ", hp: "HP", maxHp: "MAX HP",
    defense: "ЗАЩИТА", initiative: "ИНИЦИАТИВА", physical: "ФИЗИЧЕСКИЙ DR", energy: "ЭНЕРГЕТИЧЕСКИЙ DR", level: "УРОВЕНЬ",
    type: "ТИП", npc: "NPC", player: "ИГРОК"
  },
  uk: {
    title: "ПОРЯДОК ХОДУ ГМ", preview: "ПЕРЕГЛЯД", current: "ПОТОЧНИЙ", round: "РАУНД", ap: "СПІЛЬНІ AP",
    next: "НАСТУПНИЙ ХІД", start: "ПОЧАТИ БІЙ", end: "ЗАВЕРШИТИ БІЙ", noActors: "Поки немає учасників.",
    editNpc: "РЕДАКТОР NPC", close: "ЗАКРИТИ", apply: "ЗАСТОСУВАТИ", name: "ІМ’Я", hp: "HP", maxHp: "MAX HP",
    defense: "ЗАХИСТ", initiative: "ІНІЦІАТИВА", physical: "ФІЗИЧНИЙ DR", energy: "ЕНЕРГЕТИЧНИЙ DR", level: "РІВЕНЬ",
    type: "ТИП", npc: "NPC", player: "ГРАВЕЦЬ"
  },
  pl: {
    title: "KOLEJNOŚĆ TURY GM", preview: "PODGLĄD", current: "AKTUALNY", round: "RUNDA", ap: "WSPÓLNE AP",
    next: "NASTĘPNA TURA", start: "ROZPOCZNIJ WALKĘ", end: "ZAKOŃCZ WALKĘ", noActors: "Brak uczestników.",
    editNpc: "EDYCJA NPC", close: "ZAMKNIJ", apply: "ZASTOSUJ", name: "NAZWA", hp: "HP", maxHp: "MAX HP",
    defense: "OBRONA", initiative: "INICJATYWA", physical: "FIZYCZNY DR", energy: "ENERGETYCZNY DR", level: "POZIOM",
    type: "TYP", npc: "NPC", player: "GRACZ"
  },
};

function languageOf(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?";
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sortActors(actors) {
  return [...actors].sort((a, b) =>
    Number(b.initiative || 0) - Number(a.initiative || 0)
    || (a.kind === b.kind ? 0 : a.kind === "player" ? -1 : 1)
    || String(a.name || "").localeCompare(String(b.name || ""))
  );
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

function NpcEditor({ actor, session, copy, onClose }) {
  const bestiary = useMemo(() => {
    const wanted = normalizeName(actor?.name);
    return BESTIARY_ENTRIES.find((entry) => normalizeName(entry?.name) === wanted) || null;
  }, [actor?.name]);
  const [draft, setDraft] = useState(() => ({
    name: actor?.name || "",
    currentHp: actor?.currentHp ?? 0,
    maxHp: actor?.maxHp ?? 1,
    defense: actor?.defense ?? 0,
    initiative: actor?.initiative ?? 0,
    armorPhysical: actor?.armorPhysical ?? 0,
    armorEnergy: actor?.armorEnergy ?? 0,
  }));

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const bumpHp = (amount) => setDraft((current) => {
    const max = Math.max(1, Number(current.maxHp || 1));
    const hp = Math.max(0, Math.min(max, Number(current.currentHp || 0) + amount));
    return { ...current, currentHp: hp };
  });

  const apply = () => {
    const ok = session.updateCombatNpcStats(actor.id, {
      name: draft.name,
      currentHp: Number(draft.currentHp || 0),
      maxHp: Number(draft.maxHp || 1),
      defense: Number(draft.defense || 0),
      initiative: Number(draft.initiative || 0),
      armorPhysical: Number(draft.armorPhysical || 0),
      armorEnergy: Number(draft.armorEnergy || 0),
    });
    if (ok) onClose?.();
  };

  return (
    <div className="session-gm-npc-overlay" role="dialog" aria-modal="true" aria-label={actor?.name} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className="session-gm-npc-modal pip-panel">
        <header className="session-gm-npc-head">
          <div className="session-gm-npc-identity">
            <div className="session-gm-npc-avatar">{initials(actor?.name)}</div>
            <div>
              <span className="session-turn-kind">{copy.editNpc}</span>
              <h2>{actor?.name || copy.npc}</h2>
              <div className="stat-sub">
                {bestiary?.creatureType && `${copy.type}: ${bestiary.creatureType}`}
                {bestiary?.level && ` · ${copy.level}: ${bestiary.level}`}
              </div>
            </div>
          </div>
          <button type="button" className="pip-btn" onClick={onClose}>{copy.close}</button>
        </header>

        <div className="session-gm-npc-hp-tools">
          <button type="button" className="pip-btn" onClick={() => bumpHp(-5)}>−5 HP</button>
          <button type="button" className="pip-btn" onClick={() => bumpHp(-1)}>−1 HP</button>
          <strong>{Number(draft.currentHp || 0)} / {Number(draft.maxHp || 0)}</strong>
          <button type="button" className="pip-btn" onClick={() => bumpHp(1)}>+1 HP</button>
          <button type="button" className="pip-btn" onClick={() => bumpHp(5)}>+5 HP</button>
        </div>

        <div className="session-gm-npc-fields">
          <label className="session-field session-gm-npc-name-field"><span>{copy.name}</span><input className="pip-input" maxLength={60} value={draft.name} onChange={(event) => setField("name", event.target.value)} /></label>
          <label className="session-field"><span>{copy.hp}</span><input className="pip-input" type="number" min="0" max="9999" value={draft.currentHp} onChange={(event) => setField("currentHp", event.target.value)} /></label>
          <label className="session-field"><span>{copy.maxHp}</span><input className="pip-input" type="number" min="1" max="9999" value={draft.maxHp} onChange={(event) => setField("maxHp", event.target.value)} /></label>
          <label className="session-field"><span>{copy.defense}</span><input className="pip-input" type="number" min="0" max="99" value={draft.defense} onChange={(event) => setField("defense", event.target.value)} /></label>
          <label className="session-field"><span>{copy.initiative}</span><input className="pip-input" type="number" min="0" max="99" value={draft.initiative} onChange={(event) => setField("initiative", event.target.value)} /></label>
          <label className="session-field"><span>{copy.physical}</span><input className="pip-input" type="number" min="0" max="99" value={draft.armorPhysical} onChange={(event) => setField("armorPhysical", event.target.value)} /></label>
          <label className="session-field"><span>{copy.energy}</span><input className="pip-input" type="number" min="0" max="99" value={draft.armorEnergy} onChange={(event) => setField("armorEnergy", event.target.value)} /></label>
        </div>

        <footer className="session-gm-npc-actions">
          <button type="button" className="pip-btn" onClick={onClose}>{copy.close}</button>
          <button type="button" className="pip-btn is-primary" onClick={apply} disabled={!String(draft.name || "").trim()}>{copy.apply}</button>
        </footer>
      </section>
    </div>
  );
}

export default function SessionGmCombatPanel({ session, players = [] }) {
  const { i18n } = useTranslation();
  const copy = COPY[languageOf(i18n.resolvedLanguage || i18n.language)];
  const combat = session?.combat || {};
  const [selectedActorId, setSelectedActorId] = useState(null);

  const actors = useMemo(() => {
    if (combat.active) return (combat.order || []).map((actor) => mergeLiveActor(actor, players));
    const playerActors = players.filter((player) => player?.character).map((player) => ({
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
      name: npc.name,
      currentHp: npc.currentHp,
      maxHp: npc.maxHp,
      defense: npc.defense ?? 0,
      armorPhysical: npc.armorPhysical,
      armorEnergy: npc.armorEnergy,
      initiative: npc.initiative,
    }));
    return sortActors([...playerActors, ...npcActors]);
  }, [combat.active, combat.order, combat.npcs, players]);

  const activeActor = actors.find((actor) => actor.id === combat.activeActorId) || null;
  const selectedActor = actors.find((actor) => actor.id === selectedActorId) || null;

  return (
    <section className="session-gm-panel">
      <section className="pip-panel pip-block session-gm-turn-panel">
        <div className="pip-head">
          <h2>[ {copy.title} ]</h2>
          <span>{combat.active ? `${copy.round}: ${combat.round || 1}` : copy.preview}</span>
        </div>

        <div className="session-gm-mini-order">
          {actors.length ? actors.map((actor, index) => {
            const active = actor.id === combat.activeActorId;
            const isNpc = actor.kind === "npc";
            const hpMax = Math.max(1, Number(actor.maxHp || 1));
            const hp = Math.max(0, Math.min(hpMax, Number(actor.currentHp || 0)));
            const hpPercent = Math.max(0, Math.min(100, (hp / hpMax) * 100));
            return (
              <button
                type="button"
                key={actor.id}
                className={`session-gm-turn-token${active ? " is-active" : ""}${isNpc ? " is-npc" : " is-player"}`}
                onClick={() => setSelectedActorId(actor.id)}
                title={`${index + 1}. ${actor.name}`}
              >
                <span className="session-gm-order-number">{index + 1}</span>
                <span className="session-gm-turn-avatar">
                  {actor.avatar ? <img src={actor.avatar} alt="" /> : <span>{initials(actor.name)}</span>}
                </span>
                <span className="session-gm-turn-name">{actor.name}</span>
                <span className="session-gm-turn-meta">INIT {actor.initiative ?? 0} · HP {hp}/{hpMax}</span>
                <span className="session-gm-mini-hp"><span style={{ width: `${hpPercent}%` }} /></span>
              </button>
            );
          }) : <div className="pip-logbox">{copy.noActors}</div>}
        </div>

        <div className="session-gm-turn-footer">
          <div className="session-gm-turn-stat"><span>{copy.current}</span><strong>{activeActor?.name || "—"}</strong></div>
          <div className="session-gm-turn-stat"><span>{copy.round}</span><strong>{combat.active ? (combat.round || 1) : "—"}</strong></div>
          <div className="session-gm-turn-stat session-gm-ap-stat">
            <span>{copy.ap}</span>
            <div>
              <button type="button" className="pip-btn" onClick={() => session.setCombatAp((combat.ap || 0) - 1)} disabled={(combat.ap || 0) <= 0}>−</button>
              <strong>{combat.ap || 0}/{combat.apMax || 6}</strong>
              <button type="button" className="pip-btn" onClick={() => session.setCombatAp((combat.ap || 0) + 1)} disabled={(combat.ap || 0) >= (combat.apMax || 6)}>+</button>
            </div>
          </div>
          <div className="session-gm-turn-actions">
            {combat.active ? (
              <>
                <button type="button" className="pip-btn is-primary" onClick={() => session.nextCombatTurn()}>{copy.next}</button>
                <button type="button" className="pip-btn" onClick={() => session.endCombat()}>{copy.end}</button>
              </>
            ) : (
              <button type="button" className="pip-btn is-primary" disabled={!actors.length} onClick={() => session.startCombat()}>{copy.start}</button>
            )}
          </div>
        </div>
      </section>

      {selectedActor?.kind === "npc" && <NpcEditor actor={selectedActor} session={session} copy={copy} onClose={() => setSelectedActorId(null)} />}
      {selectedActor?.kind === "player" && <SessionActorProfile actor={selectedActor} onClose={() => setSelectedActorId(null)} />}
    </section>
  );
}
