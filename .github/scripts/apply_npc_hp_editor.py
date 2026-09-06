from pathlib import Path

hook_path = Path("src/hooks/useSharedSession.js")
hook = hook_path.read_text()
old = '''  const setCombatAp = (value) => {
    if (mode !== "host") return false;
    const current = combatRef.current;
    setHostCombat({ ...current, ap: clampNumber(value, 0, current.apMax || DEFAULT_AP_MAX) });
    return true;
  };
'''
new = '''  const setCombatNpcMaxHp = (actorId, value) => {
    if (mode !== "host" || !combatRef.current.active) return false;
    const targetId = String(actorId || "").startsWith("npc:") ? String(actorId) : `npc:${actorId}`;
    const npcId = targetId.replace(/^npc:/, "");
    const current = combatRef.current;
    const actor = current.order.find((item) => item.id === targetId && item.kind === "npc");
    if (!actor) return false;
    const nextMaxHp = clampNumber(value, 1, 9999);
    const nextCurrentHp = clampNumber(actor.currentHp, 0, nextMaxHp);
    const order = current.order.map((item) => item.id === targetId
      ? { ...item, maxHp: nextMaxHp, currentHp: nextCurrentHp }
      : item);
    const npcs = current.npcs.map((npc) => npc.id === npcId
      ? { ...npc, maxHp: nextMaxHp, currentHp: nextCurrentHp }
      : npc);
    setHostCombat({ ...current, order, npcs });
    return true;
  };

  const setCombatAp = (value) => {
    if (mode !== "host") return false;
    const current = combatRef.current;
    setHostCombat({ ...current, ap: clampNumber(value, 0, current.apMax || DEFAULT_AP_MAX) });
    return true;
  };
'''
if old not in hook:
    raise SystemExit("setCombatAp anchor not found")
hook = hook.replace(old, new, 1)
old_return = '''    setCombatNpcHp,
    setCombatAp,
'''
new_return = '''    setCombatNpcHp,
    setCombatNpcMaxHp,
    setCombatAp,
'''
if old_return not in hook:
    raise SystemExit("return anchor not found")
hook = hook.replace(old_return, new_return, 1)
hook_path.write_text(hook)

board_path = Path("src/components/session/SessionCombatBoard.jsx")
board = board_path.read_text()
old_controls = '''      {isNpc && mode === "host" && session.combat?.active && (
        <div className="session-npc-hp-controls">
          <button type="button" className="pip-btn" onClick={() => session.setCombatNpcHp(actor.id, hpCurrent - 1)} disabled={hpCurrent <= 0}>− HP</button>
          <button type="button" className="pip-btn" onClick={() => session.setCombatNpcHp(actor.id, hpCurrent + 1)} disabled={hpMax > 0 && hpCurrent >= hpMax}>+ HP</button>
        </div>
      )}
'''
new_controls = '''      {isNpc && mode === "host" && session.combat?.active && (
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
'''
if old_controls not in board:
    raise SystemExit("NPC HP controls anchor not found")
board = board.replace(old_controls, new_controls, 1)
board_path.write_text(board)

css_path = Path("src/components/session/session.css")
css = css_path.read_text()
marker = "/* GM NPC HP editor */"
if marker not in css:
    css += '''\n\n/* GM NPC HP editor */\n.session-npc-hp-editor {\n  align-items: end;\n  flex-wrap: wrap;\n}\n\n.session-npc-hp-field {\n  display: grid;\n  gap: 4px;\n  min-width: 72px;\n}\n\n.session-npc-hp-field > span {\n  font-size: 10px;\n  opacity: 0.72;\n  letter-spacing: 0.08em;\n}\n\n.session-npc-hp-field .pip-input {\n  width: 82px;\n}\n\n.session-npc-hp-divider {\n  align-self: center;\n  opacity: 0.7;\n  padding-bottom: 8px;\n}\n\n@media (max-width: 640px) {\n  .session-npc-hp-editor {\n    display: grid;\n    grid-template-columns: auto minmax(68px, 1fr) auto minmax(68px, 1fr) auto;\n    align-items: end;\n  }\n\n  .session-npc-hp-field,\n  .session-npc-hp-field .pip-input {\n    width: 100%;\n    min-width: 0;\n  }\n}\n'''
    css_path.write_text(css)
