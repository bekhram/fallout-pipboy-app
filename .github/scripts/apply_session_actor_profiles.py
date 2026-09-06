from pathlib import Path
import re

root = Path('.')

# --- useSharedSession: enrich player snapshot with avatar, resistances, luck, SPECIAL, weapons and perks ---
hook_path = root / 'src/hooks/useSharedSession.js'
hook = hook_path.read_text()

if 'const PORTRAIT_STORAGE_KEY' not in hook:
    hook = hook.replace(
        'const DEFAULT_AP_MAX = 6;\n',
        'const DEFAULT_AP_MAX = 6;\nconst PORTRAIT_STORAGE_KEY = "fallout_pipboy_v4_portrait_preview";\n'
    )

if 'function readPortraitSnapshot()' not in hook:
    marker = '''function getCharacterName(form) {\n  return String(form?.characterName || form?.name || form?.playerName || "").trim();\n}\n'''
    insert = marker + '''\nfunction readPortraitSnapshot() {\n  try {\n    const value = localStorage.getItem(PORTRAIT_STORAGE_KEY) || "";\n    if (!value.startsWith("data:image/")) return "";\n    return value.length <= 220000 ? value : "";\n  } catch {\n    return "";\n  }\n}\n'''
    assert marker in hook, 'getCharacterName marker missing'
    hook = hook.replace(marker, insert, 1)

old_snapshot = '''  const torsoArmor = {\n    physical: Math.max(0, getTotalResistanceForPart({\n      armor: form?.armor || {},\n      part: "Torso",\n      damageType: "physical",\n      derived,\n    })),\n    energy: Math.max(0, getTotalResistanceForPart({\n      armor: form?.armor || {},\n      part: "Torso",\n      damageType: "energy",\n      derived,\n    })),\n  };\n\n  return {\n    name: characterName || "Unnamed",\n    origin: String(form?.origin || ""),\n    level: Math.max(1, Number(form?.level || 1)),\n    currentHp: Math.max(0, Number(form?.currentHp || 0)),\n    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),\n    defense: Math.max(0, Number(derived?.defense || 0)),\n    armor: torsoArmor,\n    initiative: Math.max(0, Number(derived?.initiative || 0)),\n    statuses,\n    updatedAt: new Date().toISOString(),\n  };'''

new_snapshot = '''  const torsoArmor = Object.fromEntries(\n    ["physical", "energy", "radiation", "poison"].map((damageType) => [\n      damageType,\n      Math.max(0, getTotalResistanceForPart({\n        armor: form?.armor || {},\n        part: "Torso",\n        damageType,\n        derived,\n      })),\n    ])\n  );\n\n  const weapons = (Array.isArray(form?.weapons) ? form.weapons : [])\n    .filter((weapon) => String(weapon?.name || "").trim())\n    .slice(0, 12)\n    .map((weapon) => ({\n      name: String(weapon?.name || "").slice(0, 80),\n      skill: String(weapon?.skill || "").slice(0, 40),\n      damage: weapon?.damage ?? "",\n      damageType: String(weapon?.type || weapon?.damageType || "").slice(0, 40),\n      rate: weapon?.rate ?? "",\n      range: String(weapon?.range || "").slice(0, 40),\n      effects: (Array.isArray(weapon?.effects) ? weapon.effects.join(", ") : String(weapon?.effects || weapon?.customEffect || "")).slice(0, 240),\n      qualities: (Array.isArray(weapon?.qualities) ? weapon.qualities.join(", ") : String(weapon?.qualities || weapon?.qualitiesCustom || "")).slice(0, 240),\n    }));\n\n  const perks = (Array.isArray(form?.perksAndTraits) ? form.perksAndTraits : [])\n    .filter((perk) => String(perk?.name || "").trim())\n    .slice(0, 24)\n    .map((perk) => ({\n      name: String(perk?.name || "").slice(0, 80),\n      rank: Math.max(1, Number(perk?.rank || 1)),\n    }));\n\n  return {\n    name: characterName || "Unnamed",\n    origin: String(form?.origin || ""),\n    level: Math.max(1, Number(form?.level || 1)),\n    currentHp: Math.max(0, Number(form?.currentHp || 0)),\n    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),\n    defense: Math.max(0, Number(derived?.defense || 0)),\n    armor: torsoArmor,\n    resistances: torsoArmor,\n    initiative: Math.max(0, Number(derived?.initiative || 0)),\n    luck: Math.max(0, Number(derived?.luckPoints || 0)),\n    special: { ...(derived?.effectiveSpecial || {}) },\n    weapons,\n    perks,\n    avatar: readPortraitSnapshot(),\n    statuses,\n    updatedAt: new Date().toISOString(),\n  };'''

if old_snapshot in hook:
    hook = hook.replace(old_snapshot, new_snapshot, 1)
elif 'resistances: torsoArmor' not in hook:
    raise RuntimeError('character snapshot block changed unexpectedly')

hook_path.write_text(hook)

# --- SessionCombatBoard: clickable avatars and live profile modal ---
board_path = root / 'src/components/session/SessionCombatBoard.jsx'
board = board_path.read_text()

if 'SessionActorProfile' not in board:
    board = board.replace(
        'import React, { useMemo, useState } from "react";\n',
        'import React, { useMemo, useState } from "react";\nimport SessionActorProfile from "./SessionActorProfile.jsx";\n'
    )

if 'function actorInitials' not in board:
    marker = '''function sortActors(actors) {\n  return [...actors].sort((a, b) =>\n    Number(b.initiative || 0) - Number(a.initiative || 0)\n    || (a.kind === b.kind ? 0 : a.kind === "player" ? -1 : 1)\n    || String(a.name || "").localeCompare(String(b.name || ""))\n  );\n}\n'''
    insert = marker + '''\nfunction actorInitials(name) {\n  return String(name || "?").trim().split(/\\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?";\n}\n'''
    assert marker in board, 'sortActors marker missing'
    board = board.replace(marker, insert, 1)

old_merge = '''    armorPhysical: character.armor?.physical ?? actor.armorPhysical ?? 0,\n    armorEnergy: character.armor?.energy ?? actor.armorEnergy ?? 0,\n    initiative: character.initiative ?? actor.initiative ?? 0,\n  };'''
new_merge = '''    armorPhysical: character.armor?.physical ?? actor.armorPhysical ?? 0,\n    armorEnergy: character.armor?.energy ?? actor.armorEnergy ?? 0,\n    initiative: character.initiative ?? actor.initiative ?? 0,\n    avatar: character.avatar || actor.avatar || "",\n    profile: character,\n  };'''
if old_merge in board:
    board = board.replace(old_merge, new_merge, 1)

actor_card_pattern = re.compile(r'function ActorCard\(.*?\n}\n\nexport default function', re.S)
actor_card_replacement = '''function ActorCard({ actor, active, copy, mode, session, onOpenProfile }) {\n  const hpCurrent = Math.max(0, Number(actor.currentHp || 0));\n  const hpMax = Math.max(0, Number(actor.maxHp || 0));\n  const hpPercent = clampPercent(hpCurrent, hpMax);\n  const isNpc = actor.kind === "npc";\n\n  return (\n    <article className={`session-actor-card${active ? " is-active" : ""}${isNpc ? " is-npc" : " is-player"}`}>\n      <div className="session-actor-card-head">\n        <span className="session-turn-kind">{isNpc ? copy.npc : copy.player}</span>\n        <span className="session-actor-init">{copy.initiative} <strong>{actor.initiative ?? 0}</strong></span>\n      </div>\n\n      <div className="session-actor-identity">\n        <button type="button" className={`session-actor-avatar${isNpc ? " is-npc" : ""}`} onClick={() => onOpenProfile?.(actor.id)} aria-label={actor.name}>\n          {actor.avatar ? <img src={actor.avatar} alt="" /> : <span>{actorInitials(actor.name)}</span>}\n        </button>\n        <button type="button" className="session-actor-name session-actor-name-button" onClick={() => onOpenProfile?.(actor.id)}>{actor.name || "—"}</button>\n      </div>\n\n      <div className="session-actor-primary-stats">\n        <div className="session-actor-stat">\n          <span>{copy.hp}</span>\n          <strong>{hpCurrent}/{hpMax || "—"}</strong>\n        </div>\n        <div className="session-actor-stat">\n          <span>{copy.armor}</span>\n          <strong>P {actor.armorPhysical ?? 0} · E {actor.armorEnergy ?? 0}</strong>\n        </div>\n        <div className="session-actor-stat">\n          <span>{copy.initiative}</span>\n          <strong>{actor.initiative ?? 0}</strong>\n        </div>\n      </div>\n\n      <div className="session-hp-track" aria-label={`${copy.hp}: ${hpCurrent}/${hpMax}`}>\n        <div className="session-hp-fill" style={{ width: `${hpPercent}%` }} />\n      </div>\n\n      {isNpc && mode === "host" && session.combat?.active && (\n        <div className="session-npc-hp-controls">\n          <button type="button" className="pip-btn" onClick={() => session.setCombatNpcHp(actor.id, hpCurrent - 1)} disabled={hpCurrent <= 0}>− HP</button>\n          <button type="button" className="pip-btn" onClick={() => session.setCombatNpcHp(actor.id, hpCurrent + 1)} disabled={hpMax > 0 && hpCurrent >= hpMax}>+ HP</button>\n        </div>\n      )}\n    </article>\n  );\n}\n\nexport default function'''
board, count = actor_card_pattern.subn(actor_card_replacement, board, count=1)
assert count == 1, 'ActorCard replacement failed'

if 'selectedActorId' not in board:
    board = board.replace(
        '  const combat = session?.combat || {};\n',
        '  const combat = session?.combat || {};\n  const [selectedActorId, setSelectedActorId] = useState(null);\n',
        1
    )

player_preview_old = '''        armorPhysical: player.character.armor?.physical ?? 0,\n        armorEnergy: player.character.armor?.energy ?? 0,\n        initiative: player.character.initiative ?? 0,\n      }));'''
player_preview_new = '''        armorPhysical: player.character.armor?.physical ?? 0,\n        armorEnergy: player.character.armor?.energy ?? 0,\n        initiative: player.character.initiative ?? 0,\n        avatar: player.character.avatar || "",\n        profile: player.character,\n      }));'''
if player_preview_old in board:
    board = board.replace(player_preview_old, player_preview_new, 1)

actors_old = '''  const actors = (combat.active ? combat.order || [] : previewActors)\n    .map((actor) => mergeLiveActor(actor, players));\n  const activeActor = actors.find((actor) => actor.id === combat.activeActorId) || null;'''
actors_new = '''  const actors = (combat.active ? combat.order || [] : previewActors)\n    .map((actor) => mergeLiveActor(actor, players));\n  const activeActor = actors.find((actor) => actor.id === combat.activeActorId) || null;\n  const selectedActor = actors.find((actor) => actor.id === selectedActorId) || null;'''
if actors_old in board:
    board = board.replace(actors_old, actors_new, 1)

initiative_old = '''              <span className="session-initiative-order">{index + 1}</span>\n              <span className="session-initiative-name">{actor.name}</span>\n              <strong>{actor.initiative ?? 0}</strong>'''
initiative_new = '''              <span className="session-initiative-order">{index + 1}</span>\n              <button type="button" className={`session-initiative-avatar${actor.kind === "npc" ? " is-npc" : ""}`} onClick={() => setSelectedActorId(actor.id)} aria-label={actor.name}>\n                {actor.avatar ? <img src={actor.avatar} alt="" /> : <span>{actorInitials(actor.name)}</span>}\n              </button>\n              <button type="button" className="session-initiative-name session-initiative-name-button" onClick={() => setSelectedActorId(actor.id)}>{actor.name}</button>\n              <strong>{actor.initiative ?? 0}</strong>'''
if initiative_old in board:
    board = board.replace(initiative_old, initiative_new, 1)

card_use_old = '<ActorCard key={actor.id} actor={actor} active={actor.id === combat.activeActorId} copy={copy} mode={mode} session={session} />'
card_use_new = '<ActorCard key={actor.id} actor={actor} active={actor.id === combat.activeActorId} copy={copy} mode={mode} session={session} onOpenProfile={setSelectedActorId} />'
if card_use_old in board:
    board = board.replace(card_use_old, card_use_new, 1)

profile_tail_old = '''      {mode === "host" && combat.active && (\n        <section className="pip-panel pip-block session-combat-actions session-board-actions">\n          <button type="button" className="pip-btn is-primary" onClick={() => session.nextCombatTurn()}>{copy.nextTurn}</button>\n          <button type="button" className="pip-btn" onClick={() => session.endCombat()}>{copy.endCombat}</button>\n        </section>\n      )}\n    </section>'''
profile_tail_new = '''      {mode === "host" && combat.active && (\n        <section className="pip-panel pip-block session-combat-actions session-board-actions">\n          <button type="button" className="pip-btn is-primary" onClick={() => session.nextCombatTurn()}>{copy.nextTurn}</button>\n          <button type="button" className="pip-btn" onClick={() => session.endCombat()}>{copy.endCombat}</button>\n        </section>\n      )}\n\n      {selectedActor && <SessionActorProfile actor={selectedActor} onClose={() => setSelectedActorId(null)} />}\n    </section>'''
if profile_tail_old in board:
    board = board.replace(profile_tail_old, profile_tail_new, 1)
elif 'SessionActorProfile actor={selectedActor}' not in board:
    raise RuntimeError('profile modal insertion point missing')

board_path.write_text(board)

# --- styles ---
css_path = root / 'src/components/session/session.css'
css = css_path.read_text()
marker = '/* ===== Session actor profile modal ===== */'
if marker not in css:
    css += '''\n\n/* ===== Session actor profile modal ===== */\n.session-actor-identity {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin: 10px 0;\n}\n\n.session-actor-avatar,\n.session-initiative-avatar {\n  flex: 0 0 auto;\n  display: grid;\n  place-items: center;\n  padding: 0;\n  border: 1px solid currentColor;\n  border-radius: 50%;\n  background: color-mix(in srgb, currentColor 6%, #071008);\n  color: inherit;\n  font: inherit;\n  font-weight: 900;\n  overflow: hidden;\n  cursor: pointer;\n}\n\n.session-actor-avatar { width: 54px; height: 54px; font-size: 0.9rem; }\n.session-initiative-avatar { position: absolute; right: 8px; top: 8px; width: 34px; height: 34px; font-size: 0.62rem; }\n.session-actor-avatar.is-npc, .session-initiative-avatar.is-npc { border-style: dashed; }\n.session-actor-avatar img, .session-initiative-avatar img, .session-profile-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }\n\n.session-actor-name-button,\n.session-initiative-name-button {\n  border: 0;\n  padding: 0;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n.session-actor-name-button:hover, .session-initiative-name-button:hover { text-decoration: underline; }\n.session-initiative-token { padding-right: 50px; }\n\n.session-profile-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 1000002;\n  padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));\n  display: grid;\n  place-items: center;\n  background: rgba(0, 0, 0, 0.82);\n  backdrop-filter: blur(5px);\n}\n\n.session-profile-modal {\n  width: min(1040px, 100%);\n  max-height: calc(100dvh - 24px);\n  overflow: auto;\n  padding: clamp(12px, 2vw, 20px);\n  box-shadow: 0 0 32px color-mix(in srgb, currentColor 22%, transparent);\n}\n\n.session-profile-header {\n  position: sticky;\n  top: -1px;\n  z-index: 2;\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n  padding-bottom: 12px;\n  background: color-mix(in srgb, #071008 96%, transparent);\n  border-bottom: 1px solid color-mix(in srgb, currentColor 30%, transparent);\n}\n\n.session-profile-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }\n.session-profile-identity h2 { margin: 2px 0; overflow-wrap: anywhere; }\n.session-profile-avatar {\n  width: 76px;\n  height: 76px;\n  flex: 0 0 76px;\n  display: grid;\n  place-items: center;\n  border: 2px solid currentColor;\n  border-radius: 50%;\n  overflow: hidden;\n  font-size: 1.1rem;\n  font-weight: 900;\n}\n.session-profile-avatar.is-npc { border-style: dashed; }\n\n.session-profile-core-stats {\n  display: grid;\n  grid-template-columns: repeat(5, minmax(0, 1fr));\n  gap: 8px;\n  margin: 12px 0;\n}\n.session-profile-core-stats > div,\n.session-profile-resistance-grid > div,\n.session-profile-special-grid > div {\n  padding: 9px;\n  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);\n  background: color-mix(in srgb, currentColor 4%, transparent);\n  display: grid;\n  gap: 4px;\n}\n.session-profile-core-stats span, .session-profile-resistance-grid span, .session-profile-special-grid span { font-size: 0.67rem; letter-spacing: 0.07em; opacity: 0.72; }\n.session-profile-core-stats strong { font-size: 1.08rem; }\n\n.session-profile-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }\n.session-profile-section { margin-bottom: 12px; }\n.session-profile-section h3 { margin: 0 0 7px; font-size: 0.82rem; letter-spacing: 0.07em; }\n.session-profile-resistance-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; }\n.session-profile-special-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 7px; }\n.session-profile-special-grid strong, .session-profile-resistance-grid strong { font-size: 1rem; }\n.session-profile-text { white-space: pre-wrap; overflow-wrap: anywhere; padding: 9px; border: 1px solid color-mix(in srgb, currentColor 22%, transparent); line-height: 1.45; }\n.session-profile-weapons { display: grid; gap: 7px; }\n.session-profile-weapon { padding: 9px; border: 1px solid color-mix(in srgb, currentColor 26%, transparent); }\n.session-profile-weapon-head { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }\n.session-profile-weapon-stats { display: flex; gap: 6px 12px; flex-wrap: wrap; margin: 5px 0; font-size: 0.76rem; }\n.session-profile-tags { display: flex; flex-wrap: wrap; gap: 6px; }\n.session-profile-tags span { padding: 4px 7px; border: 1px solid color-mix(in srgb, currentColor 28%, transparent); font-size: 0.72rem; }\n\n@media (max-width: 760px) {\n  .session-profile-overlay { padding: 0; place-items: stretch; }\n  .session-profile-modal { width: 100%; max-height: 100dvh; min-height: 100dvh; border-radius: 0; }\n  .session-profile-columns { grid-template-columns: 1fr; }\n  .session-profile-core-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n  .session-profile-resistance-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n  .session-profile-avatar { width: 60px; height: 60px; flex-basis: 60px; }\n}\n'''
css_path.write_text(css)
