from pathlib import Path

repo = Path('.')

# 1) Shared combat state: keep editable NPC defense and allow GM stat edits both before and during combat.
hook_path = repo / 'src/hooks/useSharedSession.js'
hook = hook_path.read_text()

hook = hook.replace(
'''    initiative: clampNumber(npc.initiative, 0, 99),
    maxHp,
''',
'''    initiative: clampNumber(npc.initiative, 0, 99),
    defense: clampNumber(npc.defense, 0, 99),
    maxHp,
''',
1,
)

hook = hook.replace(
'''  const addCombatNpc = ({ name, initiative = 0, maxHp = 10, currentHp = maxHp, armorPhysical = 0, armorEnergy = 0 } = {}) => {
    if (mode !== "host" || combatRef.current.active) return false;
    const npc = sanitizeNpc({ id: makeId("npc"), name, initiative, maxHp, currentHp, armorPhysical, armorEnergy });
''',
'''  const addCombatNpc = ({ name, initiative = 0, defense = 0, maxHp = 10, currentHp = maxHp, armorPhysical = 0, armorEnergy = 0 } = {}) => {
    if (mode !== "host" || combatRef.current.active) return false;
    const npc = sanitizeNpc({ id: makeId("npc"), name, initiative, defense, maxHp, currentHp, armorPhysical, armorEnergy });
''',
1,
)

hook = hook.replace(
'''      initiative: clampNumber(npc.initiative, 0, 99),
      currentHp: clampNumber(npc.currentHp, 0, npc.maxHp || 9999),
''',
'''      initiative: clampNumber(npc.initiative, 0, 99),
      defense: clampNumber(npc.defense, 0, 99),
      currentHp: clampNumber(npc.currentHp, 0, npc.maxHp || 9999),
''',
1,
)

anchor = '''  const setCombatAp = (value) => {
    if (mode !== "host") return false;
    const current = combatRef.current;
    setHostCombat({ ...current, ap: clampNumber(value, 0, current.apMax || DEFAULT_AP_MAX) });
    return true;
  };
'''
insert = '''  const updateCombatNpcStats = (actorId, patch = {}) => {
    if (mode !== "host") return false;
    const targetId = String(actorId || "").startsWith("npc:") ? String(actorId) : `npc:${actorId}`;
    const npcId = targetId.replace(/^npc:/, "");
    const current = combatRef.current;
    const sourceNpc = current.npcs.find((npc) => npc.id === npcId);
    if (!sourceNpc) return false;

    const nextNpc = sanitizeNpc({ ...sourceNpc, ...patch, id: npcId });
    if (!nextNpc) return false;

    const npcs = current.npcs.map((npc) => npc.id === npcId ? nextNpc : npc);
    const order = current.order.map((actor) => actor.id === targetId && actor.kind === "npc"
      ? {
          ...actor,
          name: nextNpc.name,
          initiative: nextNpc.initiative,
          defense: nextNpc.defense,
          currentHp: nextNpc.currentHp,
          maxHp: nextNpc.maxHp,
          armorPhysical: nextNpc.armorPhysical,
          armorEnergy: nextNpc.armorEnergy,
        }
      : actor);

    setHostCombat({ ...current, npcs, order });
    return true;
  };

''' + anchor
if anchor not in hook:
    raise SystemExit('useSharedSession setCombatAp anchor not found')
hook = hook.replace(anchor, insert, 1)

hook = hook.replace(
'''    setCombatNpcMaxHp,
    setCombatAp,
''',
'''    setCombatNpcMaxHp,
    updateCombatNpcStats,
    setCombatAp,
''',
1,
)
hook_path.write_text(hook)

# 2) Existing combat board should preserve Bestiary defense in NPC combat records.
board_path = repo / 'src/components/session/SessionCombatBoard.jsx'
board = board_path.read_text()
board = board.replace(
'''      initiative: npc.initiative,
    }));
''',
'''      initiative: npc.initiative,
      defense: npc.defense ?? 0,
    }));
''',
1,
)
board = board.replace(
'''      initiative,
      maxHp: hp,
''',
'''      initiative,
      defense: Math.max(0, firstNumber(entry?.defense, 0)),
      maxHp: hp,
''',
1,
)
board_path.write_text(board)

# 3) New compact GM-only combat panel.
gm_panel_path = repo / 'src/components/session/SessionGmCombatPanel.jsx'
gm_panel_path.write_text(r'''import React, { useMemo, useState } from "react";
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
''')

css_path = repo / 'src/components/session/sessionGmCombatPanel.css'
css_path.write_text(r'''.session-gm-panel { min-width: 0; }
.session-gm-turn-panel { display: grid; gap: 14px; }
.session-gm-mini-order { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: thin; }
.session-gm-turn-token { position: relative; flex: 0 0 118px; min-width: 0; display: grid; justify-items: center; gap: 5px; padding: 10px 8px 8px; border: 1px solid rgba(126,255,126,.32); background: rgba(0,18,4,.72); color: var(--pip-green, #78ff7a); font: inherit; cursor: pointer; text-align: center; box-shadow: inset 0 0 16px rgba(62,255,88,.035); }
.session-gm-turn-token:hover, .session-gm-turn-token:focus-visible { border-color: currentColor; outline: none; box-shadow: 0 0 12px rgba(93,255,105,.15), inset 0 0 16px rgba(62,255,88,.06); }
.session-gm-turn-token.is-active { border-width: 2px; box-shadow: 0 0 18px rgba(93,255,105,.28), inset 0 0 18px rgba(62,255,88,.08); }
.session-gm-turn-token.is-npc { border-style: dashed; }
.session-gm-order-number { position: absolute; top: 4px; left: 6px; opacity: .7; font-size: 10px; }
.session-gm-turn-avatar { width: 52px; height: 52px; border: 1px solid currentColor; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-weight: 800; font-size: 14px; background: rgba(0,0,0,.35); }
.session-gm-turn-avatar img { width: 100%; height: 100%; object-fit: cover; }
.session-gm-turn-name { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 800; font-size: 12px; }
.session-gm-turn-meta { font-size: 9px; opacity: .75; white-space: nowrap; }
.session-gm-mini-hp { width: 100%; height: 4px; border: 1px solid rgba(126,255,126,.28); overflow: hidden; }
.session-gm-mini-hp > span { display: block; height: 100%; background: currentColor; opacity: .75; }
.session-gm-turn-footer { display: grid; grid-template-columns: minmax(140px,1.5fr) 90px minmax(180px,1fr) auto; gap: 10px; align-items: stretch; }
.session-gm-turn-stat { border: 1px solid rgba(126,255,126,.22); padding: 8px 10px; display: grid; gap: 4px; }
.session-gm-turn-stat > span { font-size: 9px; opacity: .66; letter-spacing: .08em; }
.session-gm-turn-stat > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-gm-ap-stat > div { display: flex; align-items: center; gap: 8px; }
.session-gm-ap-stat .pip-btn { min-width: 32px; padding-inline: 8px; }
.session-gm-turn-actions { display: flex; gap: 8px; align-items: stretch; }
.session-gm-turn-actions .pip-btn { white-space: nowrap; }

.session-gm-npc-overlay { position: fixed; inset: 0; z-index: 1000002; background: rgba(0,0,0,.78); display: grid; place-items: center; padding: 16px; overflow-y: auto; }
.session-gm-npc-modal { width: min(720px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; display: grid; gap: 16px; }
.session-gm-npc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.session-gm-npc-identity { display: flex; gap: 12px; align-items: center; min-width: 0; }
.session-gm-npc-identity h2 { margin: 3px 0 0; }
.session-gm-npc-avatar { width: 68px; height: 68px; flex: 0 0 68px; border: 2px dashed currentColor; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 18px; background: rgba(0,0,0,.35); }
.session-gm-npc-hp-tools { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; padding: 10px; border: 1px solid rgba(126,255,126,.22); }
.session-gm-npc-hp-tools strong { min-width: 100px; text-align: center; font-size: 18px; }
.session-gm-npc-fields { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
.session-gm-npc-name-field { grid-column: 1 / -1; }
.session-gm-npc-actions { display: flex; justify-content: flex-end; gap: 10px; }

@media (max-width: 760px) {
  .session-gm-turn-footer { grid-template-columns: 1fr 82px; }
  .session-gm-ap-stat { grid-column: 1 / -1; }
  .session-gm-turn-actions { grid-column: 1 / -1; }
  .session-gm-turn-actions .pip-btn { flex: 1; }
  .session-gm-npc-fields { grid-template-columns: repeat(2, minmax(0,1fr)); }
}

@media (max-width: 480px) {
  .session-gm-turn-token { flex-basis: 104px; }
  .session-gm-turn-avatar { width: 46px; height: 46px; }
  .session-gm-npc-overlay { padding: 8px; }
  .session-gm-npc-modal { max-height: calc(100vh - 16px); }
  .session-gm-npc-head { align-items: center; }
  .session-gm-npc-avatar { width: 54px; height: 54px; flex-basis: 54px; }
  .session-gm-npc-fields { grid-template-columns: 1fr 1fr; }
  .session-gm-npc-hp-tools .pip-btn { padding-inline: 8px; }
}
''')

# 4) Add GM-only tab to session screen.
screen_path = repo / 'src/components/session/SessionScreen.jsx'
screen = screen_path.read_text()
screen = screen.replace(
'''import SessionCombatBoard from "./SessionCombatBoard.jsx";
''',
'''import SessionCombatBoard from "./SessionCombatBoard.jsx";
import SessionGmCombatPanel from "./SessionGmCombatPanel.jsx";
''',
1,
)

replacements = {
'combatBoard: "COMBAT BOARD"': 'gmPanel: "GM PANEL", combatBoard: "COMBAT BOARD"',
'combatBoard: "БОЕВОЙ ЭКРАН"': 'gmPanel: "ПАНЕЛЬ ГМ", combatBoard: "БОЕВОЙ ЭКРАН"',
'combatBoard: "БОЙОВИЙ ЕКРАН"': 'gmPanel: "ПАНЕЛЬ ГМ", combatBoard: "БОЙОВИЙ ЕКРАН"',
'combatBoard: "EKRAN WALKI"': 'gmPanel: "PANEL GM", combatBoard: "EKRAN WALKI"',
}
for old, new in replacements.items():
    if old not in screen:
        raise SystemExit(f'SessionScreen copy anchor not found: {old}')
    screen = screen.replace(old, new, 1)

screen = screen.replace(
'''  const mode = session?.mode || "lobby";
''',
'''  const mode = session?.mode || "lobby";
  React.useEffect(() => {
    if (mode !== "host" && activeView === "gm") setActiveView("overview");
  }, [mode, activeView]);
''',
1,
)

nav_anchor = '''        <button type="button" className={`pip-btn${activeView === "overview" ? " is-primary" : ""}`} onClick={() => setActiveView("overview")}>{copy.overview}</button>
        <button type="button" className={`pip-btn${activeView === "combat" ? " is-primary" : ""}`} onClick={() => setActiveView("combat")}>{copy.combatBoard}</button>
'''
nav_new = '''        <button type="button" className={`pip-btn${activeView === "overview" ? " is-primary" : ""}`} onClick={() => setActiveView("overview")}>{copy.overview}</button>
        {mode === "host" && <button type="button" className={`pip-btn${activeView === "gm" ? " is-primary" : ""}`} onClick={() => setActiveView("gm")}>{copy.gmPanel}</button>}
        <button type="button" className={`pip-btn${activeView === "combat" ? " is-primary" : ""}`} onClick={() => setActiveView("combat")}>{copy.combatBoard}</button>
'''
if nav_anchor not in screen:
    raise SystemExit('SessionScreen nav anchor not found')
screen = screen.replace(nav_anchor, nav_new, 1)

render_anchor = '''      {activeView === "combat" && (
        <SessionCombatBoard session={session} players={players} mode={mode} copy={copy} />
      )}
'''
render_new = '''      {activeView === "gm" && mode === "host" && (
        <SessionGmCombatPanel session={session} players={players} />
      )}

''' + render_anchor
if render_anchor not in screen:
    raise SystemExit('SessionScreen combat render anchor not found')
screen = screen.replace(render_anchor, render_new, 1)
screen_path.write_text(screen)
