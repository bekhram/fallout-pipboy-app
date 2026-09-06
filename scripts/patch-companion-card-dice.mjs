import fs from 'node:fs';

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Anchor not found: ${label}`);
  return text.replace(from, to);
}

// Companion card: view mode by default, only current HP editable, shared dice roller for attacks.
{
  const path = 'src/components/companion/CompanionTab.jsx';
  let text = fs.readFileSync(path, 'utf8');

  text = replaceOnce(
    text,
    `import React, { useEffect, useMemo, useState } from "react";\nimport { useTranslation } from "react-i18next";\nimport { rollFalloutD20, rollFalloutD6, rollHitLocationD20 } from "../../utils/dice.js";\nimport { playSound } from "../../utils/soundManager.js";\n`,
    `import React, { useEffect, useMemo, useState } from "react";\nimport { useTranslation } from "react-i18next";\n`,
    'remove local dice imports'
  );

  const copyAdds = [
    ['    remove: "DELETE",\n', '    remove: "DELETE",\n    editCard: "EDIT",\n    doneEditing: "DONE",\n'],
    ['    remove: "УДАЛИТЬ",\n', '    remove: "УДАЛИТЬ",\n    editCard: "РЕДАКТИРОВАТЬ",\n    doneEditing: "ГОТОВО",\n'],
    ['    remove: "ВИДАЛИТИ",\n', '    remove: "ВИДАЛИТИ",\n    editCard: "РЕДАГУВАТИ",\n    doneEditing: "ГОТОВО",\n'],
    ['    remove: "USUŃ",\n', '    remove: "USUŃ",\n    editCard: "EDYTUJ",\n    doneEditing: "GOTOWE",\n'],
  ];
  for (const [from, to] of copyAdds) text = replaceOnce(text, from, to, `edit copy ${from}`);

  text = replaceOnce(
    text,
    `function NumberField({ label, value, onChange, min = 0, max = 999 }) {\n`,
    `function NumberField({ label, value, onChange, min = 0, max = 999, readOnly = false }) {\n`,
    'NumberField readonly prop'
  );
  text = replaceOnce(
    text,
    `        value={value}\n        onChange={(event) => onChange(clamp(event.target.value, min, max))}\n`,
    `        value={value}\n        readOnly={readOnly}\n        onChange={readOnly ? undefined : (event) => onChange(clamp(event.target.value, min, max))}\n`,
    'NumberField readonly behavior'
  );

  text = replaceOnce(
    text,
    `export default function CompanionTab() {\n`,
    `export default function CompanionTab({ onRoll = null }) {\n`,
    'CompanionTab onRoll prop'
  );

  text = replaceOnce(
    text,
    `  const copy = COPY[language];\n  const hitLabels = HIT_LOCATION_LABELS[language] || HIT_LOCATION_LABELS.en;\n  const [state, setState] = useState({ items: [], activeId: null });\n  const [ready, setReady] = useState(false);\n  const [attackResults, setAttackResults] = useState({});\n  const [editingAttackId, setEditingAttackId] = useState(null);\n`,
    `  const copy = COPY[language];\n  const [state, setState] = useState({ items: [], activeId: null });\n  const [ready, setReady] = useState(false);\n  const [editingAttackId, setEditingAttackId] = useState(null);\n  const [isEditingCard, setIsEditingCard] = useState(false);\n`,
    'remove local attack results and add card edit state'
  );

  text = replaceOnce(
    text,
    `  useEffect(() => {\n    setEditingAttackId(null);\n  }, [active?.id]);\n`,
    `  useEffect(() => {\n    setEditingAttackId(null);\n    setIsEditingCard(false);\n  }, [active?.id]);\n`,
    'close editor on active change'
  );

  text = replaceOnce(
    text,
    `  const removeAttack = (attackId) => {\n    if (!active) return;\n    updateActive({ attacks: (active.attacks || []).filter((attack) => attack.id !== attackId) });\n    if (editingAttackId === attackId) setEditingAttackId(null);\n    setAttackResults((prev) => {\n      const next = { ...prev };\n      delete next[\`${active.id}:\${attackId}\`];\n      return next;\n    });\n  };\n\n  const rollAttack = (attack) => {\n    if (!active) return;\n    playSound("diceRoll");\n\n    const targetNumber = attackTargetNumber(active, attack);\n    const diceCount = Math.max(1, Math.min(5, Number(attack.diceCount) || 2));\n    const difficulty = Math.max(0, Math.min(10, Number(attack.difficulty) || 1));\n    const effects = parseEffects(attack.effects);\n    const attackRoll = rollFalloutD20({\n      diceCount,\n      targetNumber,\n      criticalRange: 1,\n      label: \`${active.name || copy.unnamed}: \${attack.name || copy.attackName}\`,\n    });\n    const passed = attackRoll.totalSuccesses >= difficulty;\n    const damageDice = Math.max(0, Math.min(50, Number(attack.damage) || 0));\n    const damageRoll = passed && damageDice > 0\n      ? rollFalloutD6({ diceCount: damageDice, effects })\n      : null;\n    const hitLocation = passed ? rollHitLocationD20() : null;\n\n    setAttackResults((prev) => ({\n      ...prev,\n      [\`${active.id}:\${attack.id}\`]: {\n        attackRoll,\n        passed,\n        difficulty,\n        targetNumber,\n        damageRoll,\n        hitLocation,\n        damageType: attack.damageType,\n        at: Date.now(),\n      },\n    }));\n  };\n`,
    `  const removeAttack = (attackId) => {\n    if (!active) return;\n    updateActive({ attacks: (active.attacks || []).filter((attack) => attack.id !== attackId) });\n    if (editingAttackId === attackId) setEditingAttackId(null);\n  };\n\n  const rollAttack = (attack) => {\n    if (!active || typeof onRoll !== "function") return;\n\n    const targetNumber = attackTargetNumber(active, attack);\n    const diceCount = Math.max(1, Math.min(5, Number(attack.diceCount) || 2));\n    const difficulty = Math.max(0, Math.min(10, Number(attack.difficulty) || 1));\n    const damageDice = Math.max(0, Math.min(50, Number(attack.damage) || 0));\n    const effects = parseEffects(attack.effects);\n\n    onRoll({\n      id: \`companion-attack-\${active.id}-\${attack.id}-\${Date.now()}\`,\n      type: "weapon",\n      title: \`${active.name || copy.unnamed}: \${attack.name || copy.attackName}\`,\n      targetNumber,\n      criticalRange: 1,\n      diceCount,\n      difficulty,\n      useRate: false,\n      weapon: {\n        name: attack.name || copy.attackName,\n        damage: String(damageDice),\n        effects,\n        customEffect: "",\n        type: attack.damageType,\n        ammo: "",\n      },\n    });\n  };\n`,
    'shared companion attack roller'
  );

  text = replaceOnce(
    text,
    `          <div className="companion-content">\n            <div className="pip-inline-stats companion-summary push-bottom">\n              <span>{active.name || copy.unnamed}</span>\n              <span>{active.creatureType || (active.kind === "pet" ? copy.pet : copy.companion)}</span>\n              <span>LV {active.level || "1"}</span>\n            </div>\n`,
    `          <div className={\`companion-content \${isEditingCard ? "is-editing" : "is-readonly"}\`}>\n            <div className="companion-summary-row push-bottom">\n              <div className="pip-inline-stats companion-summary">\n                <span>{active.name || copy.unnamed}</span>\n                <span>{active.creatureType || (active.kind === "pet" ? copy.pet : copy.companion)}</span>\n                <span>LV {active.level || "1"}</span>\n              </div>\n              <button\n                type="button"\n                className={\`pip-btn \${isEditingCard ? "is-primary" : ""}\`}\n                onClick={() => {\n                  setIsEditingCard((value) => !value);\n                  if (isEditingCard) setEditingAttackId(null);\n                }}\n              >\n                {isEditingCard ? copy.doneEditing : copy.editCard}\n              </button>\n            </div>\n`,
    'card edit toggle'
  );

  // Identity fields readonly outside edit mode.
  text = replaceOnce(
    text,
    `<input className="pip-inline-input" value={active.name} placeholder={copy.unnamed} onChange={(event) => updateActive({ name: event.target.value })} />`,
    `<input className="pip-inline-input" value={active.name} readOnly={!isEditingCard} placeholder={copy.unnamed} onChange={isEditingCard ? (event) => updateActive({ name: event.target.value }) : undefined} />`,
    'name readonly'
  );
  text = replaceOnce(
    text,
    `<input className="pip-inline-input" value={active.creatureType} placeholder={active.kind === "pet" ? copy.pet : copy.companion} onChange={(event) => updateActive({ creatureType: event.target.value })} />`,
    `<input className="pip-inline-input" value={active.creatureType} readOnly={!isEditingCard} placeholder={active.kind === "pet" ? copy.pet : copy.companion} onChange={isEditingCard ? (event) => updateActive({ creatureType: event.target.value }) : undefined} />`,
    'type readonly'
  );
  text = replaceOnce(
    text,
    `<NumberField label={copy.level} value={active.level} min={1} max={999} onChange={(value) => updateActive({ level: value || "1" })} />`,
    `<NumberField label={copy.level} value={active.level} min={1} max={999} readOnly={!isEditingCard} onChange={(value) => updateActive({ level: value || "1" })} />`,
    'level readonly'
  );

  text = text.replaceAll(
    `className={\`pip-tag \${active.kind === "companion" ? "is-selected" : ""}\`} onClick={() => updateActive({ kind: "companion" })}`,
    `className={\`pip-tag \${active.kind === "companion" ? "is-selected" : ""}\`} disabled={!isEditingCard} onClick={() => updateActive({ kind: "companion" })}`
  );
  text = text.replaceAll(
    `className={\`pip-tag \${active.kind === "pet" ? "is-selected" : ""}\`} onClick={() => updateActive({ kind: "pet" })}`,
    `className={\`pip-tag \${active.kind === "pet" ? "is-selected" : ""}\`} disabled={!isEditingCard} onClick={() => updateActive({ kind: "pet" })}`
  );

  const numberFieldPatterns = [
    ['copy.body', 'active.body', 'body', '0', '20'],
    ['copy.mind', 'active.mind', 'mind', '0', '20'],
    ['copy.melee', 'active.melee', 'melee', '0', '20'],
    ['copy.guns', 'active.guns', 'guns', '0', '20'],
    ['copy.other', 'active.other', 'other', '0', '20'],
    ['copy.initiative', 'active.initiative', 'initiative', '0', '999'],
    ['copy.defense', 'active.defense', 'defense', '0', '99'],
    ['copy.carryWeight', 'active.carryWeight', 'carryWeight', '0', '9999'],
    ['copy.meleeBonus', 'active.meleeBonus', 'meleeBonus', '0', '99'],
    ['copy.physDr', 'active.physDr', 'physDr', '0', '99'],
    ['copy.energyDr', 'active.energyDr', 'energyDr', '0', '99'],
    ['copy.radDr', 'active.radDr', 'radDr', '0', '99'],
    ['copy.poisonDr', 'active.poisonDr', 'poisonDr', '0', '99'],
  ];
  for (const [label, value, key, min, max] of numberFieldPatterns) {
    const from = `<NumberField label={${label}} value={${value}} min={${min}} max={${max}} onChange={(${key}) => updateActive({ ${key} })} />`;
    const to = `<NumberField label={${label}} value={${value}} min={${min}} max={${max}} readOnly={!isEditingCard} onChange={(${key}) => updateActive({ ${key} })} />`;
    text = replaceOnce(text, from, to, `readonly ${key}`);
  }

  // Max HP locked outside card edit mode; current HP and +/- remain usable.
  text = replaceOnce(
    text,
    `<input className="pip-inline-input" inputMode="numeric" value={active.maxHp} onChange={(event) => updateMaxHp(event.target.value)} />`,
    `<input className="pip-inline-input" inputMode="numeric" value={active.maxHp} readOnly={!isEditingCard} onChange={isEditingCard ? (event) => updateMaxHp(event.target.value) : undefined} />`,
    'max hp readonly'
  );

  text = replaceOnce(
    text,
    `<div className="companion-section-head">\n                <strong>[ {copy.attacks} ]</strong>\n                <button type="button" className="pip-btn is-primary" onClick={addAttack}>{copy.addAttack}</button>\n              </div>`,
    `<div className="companion-section-head">\n                <strong>[ {copy.attacks} ]</strong>\n                {isEditingCard ? <button type="button" className="pip-btn is-primary" onClick={addAttack}>{copy.addAttack}</button> : null}\n              </div>`,
    'hide add attack outside edit mode'
  );

  text = replaceOnce(
    text,
    `                    const result = attackResults[\`${active.id}:\${attack.id}\`];\n                    const tn = attackTargetNumber(active, attack);\n`,
    `                    const tn = attackTargetNumber(active, attack);\n`,
    'remove local result lookup'
  );

  text = replaceOnce(
    text,
    `                            <button\n                              type="button"\n                              className="pip-btn is-primary"\n                              onClick={() => rollAttack(attack)}\n                              style={{ width: "100%", display: "grid", gap: "5px", textAlign: "left" }}\n                              title={copy.roll}\n                            >\n                              <strong>{attack.name || copy.attackName}</strong>\n                              <span style={{ fontSize: "0.78em", opacity: 0.82 }}>\n                                {copy.target}: {tn} · {attack.diceCount || 2}d20 · D{attack.difficulty || 1} · {attack.damage || 0} CD · {damageTypeLabel}\n                              </span>\n                            </button>\n\n                            <div className="companion-attack-footer">\n                              <div className="pip-inline-stats companion-attack-summary">\n                                {attack.effects ? <span>{copy.effects}: {attack.effects}</span> : <span>{copy.roll}</span>}\n                              </div>\n                              <div style={{ display: "flex", gap: "6px" }}>\n                                <button type="button" className="pip-btn" onClick={() => setEditingAttackId(attack.id)} title={copy.attackName}>✎</button>\n                                <button type="button" className="pip-btn" onClick={() => removeAttack(attack.id)}>{copy.removeAttack}</button>\n                              </div>\n                            </div>\n`,
    `                            <button\n                              type="button"\n                              className="pip-btn is-primary companion-attack-roll"\n                              onClick={() => rollAttack(attack)}\n                              title={copy.roll}\n                            >\n                              <strong>{attack.name || copy.attackName}</strong>\n                              <span className="companion-attack-roll-meta">\n                                <span>{copy.target}: {tn}</span>\n                                <span>{attack.diceCount || 2}d20</span>\n                                <span>D{attack.difficulty || 1}</span>\n                                <span>{attack.damage || 0} CD</span>\n                                <span>{damageTypeLabel}</span>\n                              </span>\n                              {attack.effects ? <span className="companion-attack-roll-effects">{copy.effects}: {attack.effects}</span> : null}\n                            </button>\n\n                            {isEditingCard ? (\n                              <div className="companion-attack-footer">\n                                <div className="pip-inline-stats companion-attack-summary" />\n                                <div className="companion-attack-actions">\n                                  <button type="button" className="pip-btn" onClick={() => setEditingAttackId(attack.id)} title={copy.attackName}>✎</button>\n                                  <button type="button" className="pip-btn" onClick={() => removeAttack(attack.id)}>{copy.removeAttack}</button>\n                                </div>\n                              </div>\n                            ) : null}\n`,
    'compact attack card'
  );

  // Remove inline attack result log entirely.
  text = replaceOnce(
    text,
    `\n                        {result ? (\n                          <div className={\`companion-attack-result \${result.passed ? "is-success" : "is-failure"}\`}>\n                            <strong>{result.passed ? copy.success : copy.failure}</strong>\n                            <span>d20: {result.attackRoll.rolls.map((die) => die.value).join(", ")}</span>\n                            <span>{copy.target}: {result.targetNumber}</span>\n                            <span>{copy.successes}: {result.attackRoll.totalSuccesses}</span>\n                            <span>{copy.complications}: {result.attackRoll.complications}</span>\n                            {result.hitLocation ? <span>{copy.hit}: {hitLabels[result.hitLocation.location] || result.hitLocation.label}</span> : null}\n                            {result.damageRoll ? <span>{copy.damage}: {result.damageRoll.totalDamage} · {copy.effectTriggers}: {result.damageRoll.totalEffects}</span> : null}\n                          </div>\n                        ) : null}`,
    ``,
    'remove local attack result UI'
  );

  text = replaceOnce(
    text,
    `                  onChange={(event) => updateActive({ attackNotes: event.target.value })}\n`,
    `                  readOnly={!isEditingCard}\n                  onChange={isEditingCard ? (event) => updateActive({ attackNotes: event.target.value }) : undefined}\n`,
    'attack notes readonly'
  );
  text = replaceOnce(
    text,
    `<textarea className="pip-input" rows={6} value={active.specialAbilities} placeholder={copy.abilitiesPlaceholder} onChange={(event) => updateActive({ specialAbilities: event.target.value })} />`,
    `<textarea className="pip-input" rows={6} value={active.specialAbilities} readOnly={!isEditingCard} placeholder={copy.abilitiesPlaceholder} onChange={isEditingCard ? (event) => updateActive({ specialAbilities: event.target.value }) : undefined} />`,
    'abilities readonly'
  );
  text = replaceOnce(
    text,
    `<textarea className="pip-input" rows={3} value={active.notes} placeholder={copy.notesPlaceholder} onChange={(event) => updateActive({ notes: event.target.value })} />`,
    `<textarea className="pip-input" rows={3} value={active.notes} readOnly={!isEditingCard} placeholder={copy.notesPlaceholder} onChange={isEditingCard ? (event) => updateActive({ notes: event.target.value }) : undefined} />`,
    'notes readonly'
  );

  fs.writeFileSync(path, text);
}

// Pass the shared dice callback down to companion cards.
{
  const path = 'src/components/companion/CompanionPresetHub.jsx';
  let text = fs.readFileSync(path, 'utf8');
  text = replaceOnce(text, `export default function CompanionPresetHub() {\n`, `export default function CompanionPresetHub({ onRoll = null }) {\n`, 'hub onRoll prop');
  text = replaceOnce(text, `      <CompanionTab key={revision} />\n`, `      <CompanionTab key={revision} onRoll={onRoll} />\n`, 'pass onRoll to CompanionTab');
  fs.writeFileSync(path, text);
}

{
  const path = 'src/components/layout/PipboyShell.jsx';
  let text = fs.readFileSync(path, 'utf8');
  text = replaceOnce(
    text,
    `  character = null,\n  setCharacter = null,\n  children,\n}) {\n`,
    `  character = null,\n  setCharacter = null,\n  onRoll = null,\n  children,\n}) {\n`,
    'shell onRoll prop'
  );
  text = replaceOnce(text, `  if (activeTab === "companion") screenContent = <CompanionPresetHub />;\n`, `  if (activeTab === "companion") screenContent = <CompanionPresetHub onRoll={onRoll} />;\n`, 'pass onRoll to hub');
  fs.writeFileSync(path, text);
}

{
  const path = 'src/App.jsx';
  let text = fs.readFileSync(path, 'utf8');
  text = replaceOnce(
    text,
    `          character={form}\n          setCharacter={setForm}\n        >\n`,
    `          character={form}\n          setCharacter={setForm}\n          onRoll={openContextDiceRoll}\n        >\n`,
    'pass app dice callback to shell'
  );
  fs.writeFileSync(path, text);
}

// Compact mobile companion attack layout and read-only card styling.
{
  const path = 'src/components/companion/companion.css';
  let text = fs.readFileSync(path, 'utf8');
  const anchor = `.companion-summary {\n  flex-wrap: wrap;\n  gap: 8px 18px;\n}\n`;
  const insert = `.companion-summary {\n  flex-wrap: wrap;\n  gap: 8px 18px;\n}\n\n.companion-summary-row {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 8px;\n  align-items: center;\n}\n\n.companion-content.is-readonly input[readonly],\n.companion-content.is-readonly textarea[readonly] {\n  background: rgba(0, 0, 0, 0.08);\n  opacity: 0.9;\n  cursor: default;\n}\n\n.companion-content.is-readonly .companion-kind-row .pip-tag:disabled {\n  opacity: 0.8;\n}\n`;
  text = replaceOnce(text, anchor, insert, 'summary/read-only styles');

  const attackAnchor = `.companion-attack-card {\n  display: grid;\n  gap: 9px;\n  padding: 9px;\n  border: 1px solid color-mix(in srgb, currentColor 42%, transparent);\n  background: rgba(0, 0, 0, 0.12);\n}\n`;
  const attackInsert = `${attackAnchor}\n.companion-attack-roll {\n  width: 100%;\n  min-width: 0;\n  display: grid;\n  gap: 6px;\n  text-align: left;\n  overflow: hidden;\n}\n\n.companion-attack-roll > strong {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.companion-attack-roll-meta {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px 10px;\n  min-width: 0;\n  font-size: 0.74em;\n  opacity: 0.84;\n}\n\n.companion-attack-roll-meta > span {\n  white-space: nowrap;\n}\n\n.companion-attack-roll-effects {\n  min-width: 0;\n  font-size: 0.72em;\n  opacity: 0.76;\n  overflow-wrap: anywhere;\n}\n\n.companion-attack-actions {\n  display: flex;\n  gap: 6px;\n}\n`;
  text = replaceOnce(text, attackAnchor, attackInsert, 'compact attack styles');

  text = replaceOnce(
    text,
    `@media (max-width: 520px) {\n`,
    `@media (max-width: 520px) {\n  .companion-summary-row {\n    grid-template-columns: 1fr;\n  }\n\n  .companion-summary-row > .pip-btn {\n    width: 100%;\n  }\n\n  .companion-attack-card {\n    padding: 7px;\n    gap: 7px;\n  }\n\n  .companion-attack-roll {\n    padding-inline: 8px;\n  }\n\n  .companion-attack-roll-meta {\n    gap: 3px 8px;\n    font-size: 0.69em;\n  }\n\n  .companion-attack-actions {\n    display: grid;\n    grid-template-columns: 44px minmax(0, 1fr);\n    width: 100%;\n  }\n\n`,
    'mobile compact attack styles'
  );

  fs.writeFileSync(path, text);
}

console.log('Companion card and shared dice patch applied.');
