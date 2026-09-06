from pathlib import Path

HOOK = Path('src/hooks/useSharedSession.js')
SCREEN = Path('src/components/session/SessionScreen.jsx')
CSS = Path('src/components/session/session.css')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing marker: {label}')
    return text.replace(old, new, 1)

# --- shared session data: armor + NPC combat vitals ---
hook = HOOK.read_text()
hook = replace_once(
    hook,
    'import { getDerivedStats } from "../utils/characterMath.js";',
    'import { getDerivedStats, getTotalResistanceForPart } from "../utils/characterMath.js";',
    'characterMath import',
)

hook = replace_once(
    hook,
    '  return {\n    name: characterName || "Unnamed",',
    '''  const torsoArmor = {\n    physical: Math.max(0, getTotalResistanceForPart({\n      armor: form?.armor || {},\n      part: "Torso",\n      damageType: "physical",\n      derived,\n    })),\n    energy: Math.max(0, getTotalResistanceForPart({\n      armor: form?.armor || {},\n      part: "Torso",\n      damageType: "energy",\n      derived,\n    })),\n  };\n\n  return {\n    name: characterName || "Unnamed",''',
    'snapshot armor calculation',
)

hook = replace_once(
    hook,
    '    defense: Math.max(0, Number(derived?.defense || 0)),\n    initiative: Math.max(0, Number(derived?.initiative || 0)),',
    '    defense: Math.max(0, Number(derived?.defense || 0)),\n    armor: torsoArmor,\n    initiative: Math.max(0, Number(derived?.initiative || 0)),',
    'snapshot armor field',
)

old_npc = '''function sanitizeNpc(npc) {\n  if (!npc || typeof npc !== "object") return null;\n  const name = cleanText(npc.name, 60);\n  if (!name) return null;\n  return {\n    id: cleanText(npc.id, 100) || makeId("npc"),\n    name,\n    initiative: clampNumber(npc.initiative, 0, 99),\n  };\n}'''
new_npc = '''function sanitizeNpc(npc) {\n  if (!npc || typeof npc !== "object") return null;\n  const name = cleanText(npc.name, 60);\n  if (!name) return null;\n  const maxHp = clampNumber(npc.maxHp ?? npc.currentHp ?? 10, 0, 9999);\n  return {\n    id: cleanText(npc.id, 100) || makeId("npc"),\n    name,\n    initiative: clampNumber(npc.initiative, 0, 99),\n    maxHp,\n    currentHp: clampNumber(npc.currentHp ?? maxHp, 0, maxHp || 9999),\n    armorPhysical: clampNumber(npc.armorPhysical, 0, 99),\n    armorEnergy: clampNumber(npc.armorEnergy, 0, 99),\n  };\n}'''
hook = replace_once(hook, old_npc, new_npc, 'sanitizeNpc')

old_actor = '''  return {\n    id,\n    kind: actor.kind === "npc" ? "npc" : "player",\n    name,\n    initiative: clampNumber(actor.initiative, 0, 99),\n    peerId: actor.kind === "npc" ? null : cleanText(actor.peerId, 140),\n  };'''
new_actor = '''  const maxHp = clampNumber(actor.maxHp, 0, 9999);\n  return {\n    id,\n    kind: actor.kind === "npc" ? "npc" : "player",\n    name,\n    initiative: clampNumber(actor.initiative, 0, 99),\n    peerId: actor.kind === "npc" ? null : cleanText(actor.peerId, 140),\n    maxHp,\n    currentHp: clampNumber(actor.currentHp, 0, maxHp || 9999),\n    defense: clampNumber(actor.defense, 0, 99),\n    armorPhysical: clampNumber(actor.armorPhysical, 0, 99),\n    armorEnergy: clampNumber(actor.armorEnergy, 0, 99),\n  };'''
hook = replace_once(hook, old_actor, new_actor, 'sanitizeActor')

hook = replace_once(
    hook,
    '  const addCombatNpc = ({ name, initiative = 0 } = {}) => {\n    if (mode !== "host" || combatRef.current.active) return false;\n    const npc = sanitizeNpc({ id: makeId("npc"), name, initiative });',
    '''  const addCombatNpc = ({ name, initiative = 0, maxHp = 10, currentHp = maxHp, armorPhysical = 0, armorEnergy = 0 } = {}) => {\n    if (mode !== "host" || combatRef.current.active) return false;\n    const npc = sanitizeNpc({ id: makeId("npc"), name, initiative, maxHp, currentHp, armorPhysical, armorEnergy });''',
    'addCombatNpc fields',
)

hook = replace_once(
    hook,
    '        name: player.character?.name || player.name || "Player",\n        initiative: clampNumber(player.character?.initiative, 0, 99),',
    '''        name: player.character?.name || player.name || "Player",\n        initiative: clampNumber(player.character?.initiative, 0, 99),\n        currentHp: clampNumber(player.character?.currentHp, 0, 9999),\n        maxHp: clampNumber(player.character?.maxHp, 0, 9999),\n        defense: clampNumber(player.character?.defense, 0, 99),\n        armorPhysical: clampNumber(player.character?.armor?.physical, 0, 99),\n        armorEnergy: clampNumber(player.character?.armor?.energy, 0, 99),''',
    'player actor vitals',
)

hook = replace_once(
    hook,
    '      name: npc.name,\n      initiative: clampNumber(npc.initiative, 0, 99),',
    '''      name: npc.name,\n      initiative: clampNumber(npc.initiative, 0, 99),\n      currentHp: clampNumber(npc.currentHp, 0, npc.maxHp || 9999),\n      maxHp: clampNumber(npc.maxHp, 0, 9999),\n      armorPhysical: clampNumber(npc.armorPhysical, 0, 99),\n      armorEnergy: clampNumber(npc.armorEnergy, 0, 99),''',
    'npc actor vitals',
)

hook = replace_once(
    hook,
    '    if (actor.kind === "npc") return true;',
    '    if (actor.kind === "npc") return Number(actor.currentHp || 0) > 0;',
    'npc availability',
)

hook = replace_once(
    hook,
    '  const setCombatAp = (value) => {',
    '''  const setCombatNpcHp = (actorId, value) => {\n    if (mode !== "host" || !combatRef.current.active) return false;\n    const targetId = String(actorId || "").startsWith("npc:") ? String(actorId) : `npc:${actorId}`;\n    const npcId = targetId.replace(/^npc:/, "");\n    const current = combatRef.current;\n    const actor = current.order.find((item) => item.id === targetId && item.kind === "npc");\n    if (!actor) return false;\n    const nextHp = clampNumber(value, 0, actor.maxHp || 9999);\n    const order = current.order.map((item) => item.id === targetId ? { ...item, currentHp: nextHp } : item);\n    const npcs = current.npcs.map((npc) => npc.id === npcId ? { ...npc, currentHp: nextHp } : npc);\n    setHostCombat({ ...current, order, npcs });\n    return true;\n  };\n\n  const setCombatAp = (value) => {''',
    'setCombatNpcHp',
)

hook = replace_once(
    hook,
    '    nextCombatTurn,\n    setCombatAp,',
    '    nextCombatTurn,\n    setCombatNpcHp,\n    setCombatAp,',
    'return setCombatNpcHp',
)
HOOK.write_text(hook)

# --- session screen: sub-screens ---
screen = SCREEN.read_text()
screen = replace_once(
    screen,
    'import "./session.css";',
    'import SessionCombatBoard from "./SessionCombatBoard.jsx";\nimport "./session.css";',
    'combat board import',
)

copy_additions = {
    'turnChanged: "turn"': 'turnChanged: "turn", overview: "OVERVIEW", combatBoard: "COMBAT BOARD", logScreen: "CHAT / LOG", initiativeTrack: "INITIATIVE", preview: "PREVIEW", combatants: "COMBATANTS", noActors: "No combatants yet.", armor: "ARMOR"',
    'turnChanged: "ход"': 'turnChanged: "ход", overview: "ОБЗОР", combatBoard: "БОЕВОЙ ЭКРАН", logScreen: "ЧАТ / ЖУРНАЛ", initiativeTrack: "ИНИЦИАТИВА", preview: "ПРЕДПРОСМОТР", combatants: "УЧАСТНИКИ", noActors: "Пока нет участников.", armor: "БРОНЯ"',
    'turnChanged: "хід"': 'turnChanged: "хід", overview: "ОГЛЯД", combatBoard: "БОЙОВИЙ ЕКРАН", logScreen: "ЧАТ / ЖУРНАЛ", initiativeTrack: "ІНІЦІАТИВА", preview: "ПЕРЕГЛЯД", combatants: "УЧАСНИКИ", noActors: "Поки немає учасників.", armor: "БРОНЯ"',
    'turnChanged: "tura"': 'turnChanged: "tura", overview: "PRZEGLĄD", combatBoard: "EKRAN WALKI", logScreen: "CZAT / DZIENNIK", initiativeTrack: "INICJATYWA", preview: "PODGLĄD", combatants: "UCZESTNICY", noActors: "Brak uczestników.", armor: "PANCERZ"',
}
for old, new in copy_additions.items():
    screen = replace_once(screen, old, new, f'copy {old}')

screen = replace_once(
    screen,
    '  const [localError, setLocalError] = useState("");',
    '  const [localError, setLocalError] = useState("");\n  const [activeView, setActiveView] = useState("overview");',
    'activeView state',
)

# Insert sub-navigation immediately before the existing dashboard.
dashboard_start = screen.index('      <div className="session-dashboard-grid">')
nav = '''      <nav className="session-view-nav" aria-label="Session screens">\n        <button type="button" className={`pip-btn${activeView === "overview" ? " is-primary" : ""}`} onClick={() => setActiveView("overview")}>{copy.overview}</button>\n        <button type="button" className={`pip-btn${activeView === "combat" ? " is-primary" : ""}`} onClick={() => setActiveView("combat")}>{copy.combatBoard}</button>\n        <button type="button" className={`pip-btn${activeView === "log" ? " is-primary" : ""}`} onClick={() => setActiveView("log")}>{copy.logScreen}</button>\n      </nav>\n\n'''
screen = screen[:dashboard_start] + nav + screen[dashboard_start:]

# Recompute positions after inserting navigation.
dashboard_start = screen.index('      <div className="session-dashboard-grid">')
combat_start = screen.index('      <section className="pip-panel pip-block session-combat-panel">', dashboard_start)
dashboard_block = screen[dashboard_start:combat_start]
wrapped_dashboard = '      {activeView === "overview" && (\n' + dashboard_block + '      )}\n\n'
screen = screen[:dashboard_start] + wrapped_dashboard + screen[combat_start:]

combat_start = screen.index('      <section className="pip-panel pip-block session-combat-panel">')
feed_start = screen.index('      <section className="pip-panel pip-block session-feed-panel">', combat_start)
screen = screen[:combat_start] + '      {activeView === "combat" && (\n        <SessionCombatBoard session={session} players={players} mode={mode} copy={copy} />\n      )}\n\n' + screen[feed_start:]

feed_start = screen.index('      <section className="pip-panel pip-block session-feed-panel">')
feed_end = screen.index('\n\n      <div className="stat-sub session-beta-note">', feed_start)
feed_block = screen[feed_start:feed_end]
screen = screen[:feed_start] + '      {activeView === "log" && (\n' + feed_block + '\n      )}' + screen[feed_end:]

SCREEN.write_text(screen)

# --- styling ---
css = CSS.read_text()
append = r'''

/* ===== Session multi-screen navigation / combat board ===== */
.session-view-nav {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.session-view-nav .pip-btn {
  min-height: 42px;
  letter-spacing: 0.06em;
}

.session-combat-board {
  display: grid;
  gap: 12px;
}

.session-initiative-panel {
  overflow: hidden;
}

.session-initiative-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 10px;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;
}

.session-initiative-token {
  position: relative;
  flex: 0 0 auto;
  min-width: 142px;
  min-height: 70px;
  padding: 9px 11px 9px 35px;
  border: 1px solid color-mix(in srgb, currentColor 38%, transparent);
  background: color-mix(in srgb, currentColor 4%, transparent);
  display: grid;
  align-content: center;
  gap: 3px;
  scroll-snap-align: start;
}

.session-initiative-token.is-npc {
  border-style: dashed;
}

.session-initiative-token.is-active {
  border-width: 2px;
  box-shadow: 0 0 16px color-mix(in srgb, currentColor 26%, transparent), inset 0 0 18px color-mix(in srgb, currentColor 7%, transparent);
}

.session-initiative-order {
  position: absolute;
  left: 8px;
  top: 8px;
  width: 20px;
  height: 20px;
  border: 1px solid currentColor;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 900;
}

.session-initiative-name {
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
}

.session-initiative-token > strong {
  font-size: 1.2rem;
}

.session-board-summary {
  margin-top: 8px;
}

.session-actor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 10px;
}

.session-actor-card {
  position: relative;
  padding: 12px;
  border: 1px solid color-mix(in srgb, currentColor 38%, transparent);
  background: color-mix(in srgb, currentColor 4%, transparent);
  overflow: hidden;
}

.session-actor-card.is-npc {
  border-style: dashed;
}

.session-actor-card.is-active {
  border-width: 2px;
  box-shadow: inset 0 0 24px color-mix(in srgb, currentColor 8%, transparent);
}

.session-actor-card-head,
.session-actor-primary-stats,
.session-npc-hp-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-actor-card-head {
  justify-content: space-between;
}

.session-actor-name {
  margin: 10px 0;
  font-size: clamp(1.05rem, 3vw, 1.35rem);
  font-weight: 900;
  overflow-wrap: anywhere;
}

.session-actor-init {
  font-size: 0.75rem;
}

.session-actor-primary-stats {
  align-items: stretch;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.session-actor-stat {
  min-width: 0;
  padding: 8px;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  display: grid;
  gap: 4px;
}

.session-actor-stat span {
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.session-actor-stat strong {
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}

.session-hp-track {
  height: 8px;
  margin-top: 10px;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  overflow: hidden;
}

.session-hp-fill {
  height: 100%;
  background: currentColor;
  opacity: 0.75;
  transition: width 0.2s ease;
}

.session-npc-hp-controls {
  margin-top: 10px;
}

.session-precombat-npc-list {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.session-precombat-npc-row,
.session-board-npc-form {
  display: grid;
  grid-template-columns: minmax(150px, 1.7fr) repeat(4, minmax(70px, 0.7fr)) auto;
  gap: 7px;
  align-items: end;
}

.session-precombat-npc-row label,
.session-board-npc-form label {
  display: grid;
  gap: 4px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.session-board-npc-form {
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  margin-bottom: 10px;
}

.session-board-actions {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
}

@media (max-width: 760px) {
  .session-view-nav {
    position: sticky;
    top: 0;
    z-index: 5;
    background: color-mix(in srgb, #071008 94%, transparent);
    padding: 5px 0;
  }

  .session-view-nav .pip-btn {
    min-width: 0;
    padding-inline: 5px;
    font-size: 0.68rem;
  }

  .session-initiative-token {
    min-width: 124px;
  }

  .session-actor-grid {
    grid-template-columns: 1fr;
  }

  .session-precombat-npc-row,
  .session-board-npc-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .session-precombat-npc-row > .pip-input:first-child,
  .session-board-npc-form > .pip-input:first-child,
  .session-precombat-npc-row > .pip-btn,
  .session-board-npc-form > .pip-btn {
    grid-column: 1 / -1;
  }
}
'''
if 'Session multi-screen navigation / combat board' not in css:
    css += append
CSS.write_text(css)
