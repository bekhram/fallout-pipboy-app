from pathlib import Path


def replace_once(path, old, new):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"Pattern not found in {path}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))

# 1) Fix D20 single-die rerolls so they do not re-roll D6 damage.
d20 = Path("src/components/dice/FalloutD20Roller.jsx")
replace_once(
    d20,
    'import React, { useEffect, useMemo, useState } from "react";',
    'import React, { useEffect, useMemo, useRef, useState } from "react";'
)
replace_once(
    d20,
    '  const [animatedHitValue, setAnimatedHitValue] = useState(1);\n',
    '  const [animatedHitValue, setAnimatedHitValue] = useState(1);\n  const damageRolledForAttackRef = useRef(false);\n'
)
replace_once(
    d20,
    '  const resultStats = buildRollSummary(lastRoll);\n  const difficulty = Number(rollConfig?.difficulty || 1);\n',
    '  const resultStats = buildRollSummary(lastRoll);\n  const difficulty = Number(rollConfig?.difficulty || 1);\n\n  useEffect(() => {\n    damageRolledForAttackRef.current = false;\n  }, [rollConfig]);\n'
)
replace_once(
    d20,
    '  const autoRollWeaponDamage = (attackResult) => {\n  if (!isWeaponRoll) return;\n\n  const didHit = (attackResult?.totalSuccesses || 0) >= difficulty;\n  if (!didHit) return;\n',
    '  const autoRollWeaponDamage = (attackResult) => {\n  if (!isWeaponRoll) return;\n  if (damageRolledForAttackRef.current) return;\n\n  const didHit = (attackResult?.totalSuccesses || 0) >= difficulty;\n  if (!didHit) return;\n'
)
replace_once(
    d20,
    '  const totalDamageDiceCount = baseDamageDiceCount + extraRateDiceCount;\n  if (totalDamageDiceCount <= 0) return;\n\n  onAutoRollDamage?.(totalDamageDiceCount);\n};\n',
    '  const totalDamageDiceCount = baseDamageDiceCount + extraRateDiceCount;\n  if (totalDamageDiceCount <= 0) return;\n\n  damageRolledForAttackRef.current = true;\n  onAutoRollDamage?.(totalDamageDiceCount);\n};\n'
)
replace_once(
    d20,
    '  const doRoll = () => {\n    if (isRolling || isHitRolling) return;\n\n    playSound("diceRoll");\n',
    '  const doRoll = () => {\n    if (isRolling || isHitRolling) return;\n\n    damageRolledForAttackRef.current = false;\n    playSound("diceRoll");\n'
)

# Preserve the already rolled hit location when only one attack d20 is re-rolled.
old_success = '''      if (isWeaponRoll && updatedResult.totalSuccesses >= difficulty) {\n        setLastRoll(updatedResult);\n        setHistory((prev) => {\n          if (prev.length === 0) return [updatedResult];\n          const next = [...prev];\n          next[0] = updatedResult;\n          return next.slice(0, MAX_HISTORY);\n        });\n        setRerollingDieIndex(null);\n        autoRollWeaponDamage(updatedResult);\n\n        setIsHitRolling(true);\n        animateHitDie(500, () => {\n          const nextHitLocation = rollHitLocationD20();\n          setHitLocation(nextHitLocation);\n\n          const nextUpdatedResult = {\n            ...updatedResult,\n            hitLocation: nextHitLocation,\n          };\n\n          setLastRoll(nextUpdatedResult);\n          setHistory((prev) => {\n            if (prev.length === 0) return [nextUpdatedResult];\n            const next = [...prev];\n            next[0] = nextUpdatedResult;\n            return next.slice(0, MAX_HISTORY);\n          });\n\n          setIsHitRolling(false);\n        });\n\n        return;\n      }\n'''
new_success = '''      if (isWeaponRoll && updatedResult.totalSuccesses >= difficulty) {\n        const previousHitLocation = lastRoll?.hitLocation || hitLocation || null;\n        const resultWithLocation = previousHitLocation\n          ? { ...updatedResult, hitLocation: previousHitLocation }\n          : updatedResult;\n\n        setLastRoll(resultWithLocation);\n        setHistory((prev) => {\n          if (prev.length === 0) return [resultWithLocation];\n          const next = [...prev];\n          next[0] = resultWithLocation;\n          return next.slice(0, MAX_HISTORY);\n        });\n        setRerollingDieIndex(null);\n        autoRollWeaponDamage(resultWithLocation);\n\n        if (previousHitLocation) return;\n\n        setIsHitRolling(true);\n        animateHitDie(500, () => {\n          const nextHitLocation = rollHitLocationD20();\n          setHitLocation(nextHitLocation);\n\n          const nextUpdatedResult = {\n            ...updatedResult,\n            hitLocation: nextHitLocation,\n          };\n\n          setLastRoll(nextUpdatedResult);\n          setHistory((prev) => {\n            if (prev.length === 0) return [nextUpdatedResult];\n            const next = [...prev];\n            next[0] = nextUpdatedResult;\n            return next.slice(0, MAX_HISTORY);\n          });\n\n          setIsHitRolling(false);\n        });\n\n        return;\n      }\n'''
replace_once(d20, old_success, new_success)

# 2) App-level session combat resources: group AP, turn state, Luck bridge, once-per-turn/combat flags.
app = Path("src/App.jsx")
replace_once(
    app,
    '''  const onSpendLuck = () => {\n    setCurrentLuckPoints((prev) => Math.max(0, prev - 1));\n  };\n\n  const baseMaxHp = Math.max(1, Number(derived.maxHp || 1));\n''',
    '''  const onSpendLuck = () => {\n    setCurrentLuckPoints((prev) => Math.max(0, prev - 1));\n  };\n\n  const combatApMax = Math.max(0, Number(derived.groupApMax || 6));\n  const [combatState, setCombatState] = useState({\n    active: false,\n    turn: 0,\n    ap: 0,\n    usedThisTurn: {},\n    usedThisCombat: {},\n  });\n\n  useEffect(() => {\n    setCombatState((prev) => ({\n      ...prev,\n      ap: Math.min(combatApMax, Math.max(0, Number(prev.ap || 0))),\n    }));\n  }, [combatApMax]);\n\n  const setCombatAp = (value) => {\n    const next = Math.max(0, Math.min(combatApMax, Number(value || 0)));\n    setCombatState((prev) => ({ ...prev, ap: next }));\n  };\n\n  const startCombat = () => {\n    setCombatState({\n      active: true,\n      turn: 1,\n      ap: 0,\n      usedThisTurn: {},\n      usedThisCombat: {},\n    });\n  };\n\n  const endCombat = () => {\n    setCombatState({\n      active: false,\n      turn: 0,\n      ap: 0,\n      usedThisTurn: {},\n      usedThisCombat: {},\n    });\n  };\n\n  const nextCombatTurn = () => {\n    setCombatState((prev) => ({\n      ...prev,\n      active: true,\n      turn: Math.max(1, Number(prev.turn || 0) + 1),\n      usedThisTurn: {},\n    }));\n  };\n\n  const spendCombatAp = (amount = 1) => {\n    const cost = Math.max(0, Number(amount || 0));\n    if (!combatState.active || Number(combatState.ap || 0) < cost) return false;\n    setCombatState((prev) => ({ ...prev, ap: Math.max(0, Number(prev.ap || 0) - cost) }));\n    return true;\n  };\n\n  const spendCombatLuck = (amount = 1) => {\n    const cost = Math.max(1, Number(amount || 1));\n    if (Number(currentLuckPoints || 0) < cost) return false;\n    setCurrentLuckPoints((prev) => Math.max(0, Number(prev || 0) - cost));\n    return true;\n  };\n\n  const markCombatUse = (scope, key) => {\n    if (!key) return;\n    const field = scope === "turn" ? "usedThisTurn" : "usedThisCombat";\n    setCombatState((prev) => ({\n      ...prev,\n      [field]: { ...(prev[field] || {}), [key]: true },\n    }));\n  };\n\n  const baseMaxHp = Math.max(1, Number(derived.maxHp || 1));\n'''
)
replace_once(
    app,
    '''            onRoll={openContextDiceRoll}\n            form={form}\n            globalWeapons={globalWeapons}\n          />\n''',
    '''            onRoll={openContextDiceRoll}\n            form={form}\n            globalWeapons={globalWeapons}\n            combatState={combatState}\n            combatApMax={combatApMax}\n            currentLuckPoints={currentLuckPoints}\n            luckMax={derived.luckPoints || 0}\n            onSetCombatAp={setCombatAp}\n            onStartCombat={startCombat}\n            onEndCombat={endCombat}\n            onNextCombatTurn={nextCombatTurn}\n            onSpendCombatAp={spendCombatAp}\n          />\n'''
)
replace_once(
    app,
    '''        pendingAutoD6={pendingAutoD6}\n        setPendingAutoD6={setPendingAutoD6}\n      />\n''',
    '''        pendingAutoD6={pendingAutoD6}\n        setPendingAutoD6={setPendingAutoD6}\n        combatState={combatState}\n        currentLuckPoints={currentLuckPoints}\n        onSpendCombatLuck={spendCombatLuck}\n        onMarkCombatUse={markCombatUse}\n      />\n'''
)

# 3) Weapons screen combat panel.
weapons_screen = Path("src/components/weapons/WeaponsScreen.jsx")
replace_once(
    weapons_screen,
    'import WeaponEditor from "./WeaponEditor.jsx";\n',
    '''import WeaponEditor from "./WeaponEditor.jsx";\n\nconst COMBAT_COPY = {\n  en: { combat: "COMBAT", start: "START", end: "END", turn: "TURN", nextTurn: "NEXT TURN", ap: "AP", luck: "LUCK" },\n  ru: { combat: "БОЙ", start: "НАЧАТЬ", end: "ЗАВЕРШИТЬ", turn: "ХОД", nextTurn: "СЛЕД. ХОД", ap: "ОД", luck: "УДАЧА" },\n  uk: { combat: "БІЙ", start: "ПОЧАТИ", end: "ЗАВЕРШИТИ", turn: "ХІД", nextTurn: "НАСТ. ХІД", ap: "ОД", luck: "УДАЧА" },\n  pl: { combat: "WALKA", start: "START", end: "KONIEC", turn: "TURA", nextTurn: "NAST. TURA", ap: "PA", luck: "SZCZĘŚCIE" },\n};\n\nfunction getCombatLanguage(value) {\n  const code = String(value || "en").toLowerCase().split("-")[0];\n  return COMBAT_COPY[code] ? code : "en";\n}\n'''
)
replace_once(
    weapons_screen,
    '''  onRoll,\n  form,\n  globalWeapons\n}) {\n  const { t } = useTranslation();\n''',
    '''  onRoll,\n  form,\n  globalWeapons,\n  combatState,\n  combatApMax,\n  currentLuckPoints,\n  luckMax,\n  onSetCombatAp,\n  onStartCombat,\n  onEndCombat,\n  onNextCombatTurn,\n  onSpendCombatAp,\n}) {\n  const { t, i18n } = useTranslation();\n  const combatCopy = COMBAT_COPY[getCombatLanguage(i18n.resolvedLanguage || i18n.language)];\n'''
)
replace_once(
    weapons_screen,
    '''        </div>\n\n        <div className="pip-stack">\n''',
    '''        </div>\n\n        <div className="pip-panel" style={{ marginBottom: 10, padding: 8, display: "grid", gap: 7 }}>\n          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>\n            <strong>[ {combatCopy.combat} ]</strong>\n            {!combatState?.active ? (\n              <button type="button" className="pip-btn is-primary" onClick={onStartCombat}>\n                {combatCopy.start}\n              </button>\n            ) : (\n              <>\n                <span className="stat-sub">{combatCopy.turn}: {combatState.turn}</span>\n                <button type="button" className="pip-btn" onClick={onNextCombatTurn}>\n                  {combatCopy.nextTurn}\n                </button>\n                <button type="button" className="pip-btn is-danger" onClick={onEndCombat}>\n                  {combatCopy.end}\n                </button>\n              </>\n            )}\n          </div>\n\n          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>\n            <strong>{combatCopy.ap}</strong>\n            <button type="button" className="pip-btn" disabled={!combatState?.active || Number(combatState?.ap || 0) <= 0} onClick={() => onSetCombatAp?.(Number(combatState?.ap || 0) - 1)}>−</button>\n            <input\n              className="pip-inline-input"\n              style={{ width: 54 }}\n              type="number"\n              min="0"\n              max={combatApMax}\n              disabled={!combatState?.active}\n              value={combatState?.ap || 0}\n              onChange={(event) => onSetCombatAp?.(event.target.value)}\n            />\n            <button type="button" className="pip-btn" disabled={!combatState?.active || Number(combatState?.ap || 0) >= Number(combatApMax || 0)} onClick={() => onSetCombatAp?.(Number(combatState?.ap || 0) + 1)}>+</button>\n            <span className="stat-sub">/ {combatApMax}</span>\n            <strong style={{ marginLeft: 6 }}>{combatCopy.luck}: {currentLuckPoints} / {luckMax}</strong>\n          </div>\n        </div>\n\n        <div className="pip-stack">\n'''
)
replace_once(
    weapons_screen,
    '''              form={form}\n              globalWeapons={globalWeapons}\n            />\n''',
    '''              form={form}\n              globalWeapons={globalWeapons}\n              combatState={combatState}\n              onSpendCombatAp={onSpendCombatAp}\n            />\n'''
)

# 4) Quick Hands on weapon cards uses the shared AP pool for one attack.
weapon_card = Path("src/components/weapons/WeaponCard.jsx")
for lang, old, new in [
    ("en", '    rerolls: "Re-rolls",\n', '    rerolls: "Re-rolls",\n    quickHands: "QUICK HANDS · 2 AP",\n'),
    ("ru", '    rerolls: "Перебросы",\n', '    rerolls: "Перебросы",\n    quickHands: "БЫСТРЫЕ РУКИ · 2 ОД",\n'),
    ("uk", '    rerolls: "Перекидання",\n', '    rerolls: "Перекидання",\n    quickHands: "ШВИДКІ РУКИ · 2 ОД",\n'),
    ("pl", '    rerolls: "Przerzuty",\n', '    rerolls: "Przerzuty",\n    quickHands: "SZYBKIE RĘCE · 2 PA",\n'),
]:
    replace_once(weapon_card, old, new)
replace_once(
    weapon_card,
    '''  form,\n  globalWeapons,\n}) {\n''',
    '''  form,\n  globalWeapons,\n  combatState,\n  onSpendCombatAp,\n}) {\n'''
)
replace_once(
    weapon_card,
    '  const [attackContext, setAttackContext] = useState(makeDefaultAttackContext);\n',
    '  const [attackContext, setAttackContext] = useState(makeDefaultAttackContext);\n  const [quickHandsArmed, setQuickHandsArmed] = useState(false);\n'
)
replace_once(
    weapon_card,
    '''  const calculatedWeapon = conditionalPerkResult.weapon;\n  const attackDifficulty = Math.max(0, 1 + Number(conditionalPerkResult.difficultyDelta || 0));\n''',
    '''  const calculatedWeapon = conditionalPerkResult.weapon;\n  const isRangedWeapon = ["Small Guns", "Energy Weapons", "Big Guns", "Explosives", "Throwing"]\n    .includes(String(calculatedWeapon?.skill || "").trim());\n  const hasQuickHands = isRangedWeapon && getPerkRank(form, "quick_hands") > 0;\n  const quickHandsRateBonus = quickHandsArmed ? 2 : 0;\n  const attackWeapon = quickHandsRateBonus > 0\n    ? { ...calculatedWeapon, rate: Number(calculatedWeapon.rate || 0) + quickHandsRateBonus }\n    : calculatedWeapon;\n  const attackDifficulty = Math.max(0, 1 + Number(conditionalPerkResult.difficultyDelta || 0));\n'''
)
replace_once(
    weapon_card,
    '''    setShowAttackContext(false);\n    setAttackContext(makeDefaultAttackContext());\n  }, [weapon]);\n''',
    '''    setShowAttackContext(false);\n    setAttackContext(makeDefaultAttackContext());\n    setQuickHandsArmed(false);\n  }, [weapon]);\n'''
)
replace_once(
    weapon_card,
    '''  const handleRoll = (event) => {\n    event.stopPropagation();\n    const roll = createWeaponRoll({\n      weapon: {\n        ...calculatedWeapon,\n''',
    '''  const handleQuickHands = () => {\n    if (quickHandsArmed) {\n      setQuickHandsArmed(false);\n      return;\n    }\n    if (!hasQuickHands || !combatState?.active) return;\n    if (onSpendCombatAp?.(2)) setQuickHandsArmed(true);\n  };\n\n  const handleRoll = (event) => {\n    event.stopPropagation();\n    const roll = createWeaponRoll({\n      weapon: {\n        ...attackWeapon,\n'''
)
replace_once(
    weapon_card,
    '''      useRate: Number(calculatedWeapon.rate || 0) > 0 && useRate,\n    });\n''',
    '''      useRate: Number(attackWeapon.rate || 0) > 0 && useRate,\n    });\n'''
)
replace_once(
    weapon_card,
    '''      attackContext: { ...attackContext },\n    });\n\n    if (attackContext.aimed''',
    '''      attackContext: { ...attackContext },\n    });\n\n    if (quickHandsArmed) setQuickHandsArmed(false);\n\n    if (attackContext.aimed'''
)
replace_once(
    weapon_card,
    '''        {attackContext.aimed && (\n          <span className="stat-sub">\n            {isInaccurateWeapon\n              ? contextCopy.aimNoBenefit\n              : `${contextCopy.rerolls}: ${Math.max(1, totalAttackRerolls)}d20`}\n          </span>\n        )}\n      </div>\n''',
    '''        {attackContext.aimed && (\n          <span className="stat-sub">\n            {isInaccurateWeapon\n              ? contextCopy.aimNoBenefit\n              : `${contextCopy.rerolls}: ${Math.max(1, totalAttackRerolls)}d20`}\n          </span>\n        )}\n        {hasQuickHands && (\n          <button\n            type="button"\n            className={`pip-btn ${quickHandsArmed ? "is-primary" : ""}`}\n            disabled={!quickHandsArmed && (!combatState?.active || Number(combatState?.ap || 0) < 2)}\n            onClick={handleQuickHands}\n          >\n            {contextCopy.quickHands}\n          </button>\n        )}\n      </div>\n'''
)
replace_once(
    weapon_card,
    '''        {Number(calculatedWeapon.rate || 0) > 0 && (\n          <div\n            className={`pip-stat-box is-clickable ${useRate ? "is-active" : ""}`}\n            onClick={(event) => { event.stopPropagation(); setUseRate((prev) => !prev); }}\n            title="Click to toggle Burst"\n          >\n            <div className="stat-label">Rate of Fire</div>\n            <div className="stat-value">{calculatedWeapon.rate}</div>\n            <div className="stat-sub">{useRate ? "ACTIVE" : "OFF"}</div>\n          </div>\n        )}\n''',
    '''        {Number(attackWeapon.rate || 0) > 0 && (\n          <div\n            className={`pip-stat-box is-clickable ${useRate ? "is-active" : ""}`}\n            onClick={(event) => { event.stopPropagation(); setUseRate((prev) => !prev); }}\n            title="Click to toggle Burst"\n          >\n            <div className="stat-label">Rate of Fire</div>\n            <div className="stat-value">{attackWeapon.rate}</div>\n            <div className="stat-sub">{quickHandsArmed ? "QUICK HANDS +2" : (useRate ? "ACTIVE" : "OFF")}</div>\n          </div>\n        )}\n'''
)

# 5) Pass combat state and character context into D6 damage roller.
modal = Path("src/components/dice/DiceRollModal.jsx")
replace_once(
    modal,
    '''  pendingAutoD6,\n  setPendingAutoD6,\n}) {\n''',
    '''  pendingAutoD6,\n  setPendingAutoD6,\n  combatState,\n  currentLuckPoints,\n  onSpendCombatLuck,\n  onMarkCombatUse,\n}) {\n'''
)
replace_once(
    modal,
    '''                onAutoRollHandled={() => setPendingAutoD6(null)}\n                weaponEffects={[\n''',
    '''                onAutoRollHandled={() => setPendingAutoD6(null)}\n                form={form}\n                weapon={rollConfig?.weapon || null}\n                combatState={combatState}\n                currentLuckPoints={currentLuckPoints}\n                onSpendCombatLuck={onSpendCombatLuck}\n                onMarkCombatUse={onMarkCombatUse}\n                weaponEffects={[\n'''
)

# 6) D6 combat perks: Finesse once/combat and Luck-powered critical markers.
d6 = Path("src/components/dice/FalloutD6Roller.jsx")
replace_once(
    d6,
    'import { rollFalloutD6, rerollOneFalloutD6 } from "../../utils/dice";\n',
    'import { rollFalloutD6, rerollOneFalloutD6 } from "../../utils/dice";\nimport { getPerkRank } from "../../utils/perkEffects.js";\n'
)
replace_once(
    d6,
    '''  onAutoRollHandled,\n  weaponEffects = [],\n}) {\n''',
    '''  onAutoRollHandled,\n  weaponEffects = [],\n  form = null,\n  weapon = null,\n  combatState = null,\n  currentLuckPoints = 0,\n  onSpendCombatLuck,\n  onMarkCombatUse,\n}) {\n'''
)
replace_once(
    d6,
    '''  const resultStats = {\n    damage: lastRoll?.totalDamage ?? 0,\n    effects: lastRoll?.totalEffects ?? 0,\n  };\n''',
    '''  const resultStats = {\n    damage: lastRoll?.totalDamage ?? 0,\n    effects: lastRoll?.totalEffects ?? 0,\n  };\n\n  const finesseAvailable = Boolean(\n    lastRoll\n    && combatState?.active\n    && getPerkRank(form, "finesse") > 0\n    && !combatState?.usedThisCombat?.finesse\n  );\n  const weaponSkill = String(weapon?.skill || "").trim();\n  const slayerEligible = weaponSkill === "Melee Weapons" || weaponSkill === "Unarmed";\n  const criticalPerkSource = getPerkRank(form, "better_criticals") > 0\n    ? "Better Criticals"\n    : (slayerEligible && getPerkRank(form, "slayer") > 0 ? "Slayer" : "");\n  const forceCriticalAvailable = Boolean(\n    lastRoll\n    && Number(lastRoll?.totalDamage || 0) > 0\n    && criticalPerkSource\n    && Number(currentLuckPoints || 0) > 0\n    && !lastRoll?.forcedCritical\n  );\n'''
)
replace_once(
    d6,
    '''  const handleRerollOne = (dieIndex) => {\n''',
    '''  const handleFinesseReroll = () => {\n    if (!finesseAvailable || isRolling || !lastRoll) return;\n    onMarkCombatUse?.("combat", "finesse");\n    const count = Math.max(1, Number(lastRoll.diceCount || lastRoll.rolls?.length || diceCount || 1));\n    playSound("diceRoll");\n    setIsRolling(true);\n    animateDice(600, () => {\n      performRoll(count);\n      setIsRolling(false);\n    });\n  };\n\n  const handleForceCritical = () => {\n    if (!forceCriticalAvailable) return;\n    if (!onSpendCombatLuck?.(1)) return;\n    const updated = {\n      ...lastRoll,\n      forcedCritical: true,\n      forcedCriticalSource: criticalPerkSource,\n    };\n    setLastRoll(updated);\n    setHistory((prev) => {\n      if (!prev.length) return [updated];\n      const next = [...prev];\n      next[0] = updated;\n      return next.slice(0, MAX_HISTORY);\n    });\n  };\n\n  const handleRerollOne = (dieIndex) => {\n'''
)
replace_once(
    d6,
    '''        <div className="dice-top-layout">\n''',
    '''        {(finesseAvailable || forceCriticalAvailable || lastRoll?.forcedCritical) && (\n          <div className="dice-actions" style={{ marginBottom: 10, flexWrap: "wrap" }}>\n            {finesseAvailable && (\n              <button type="button" className="dice-roll-button dice-roll-button-secondary" onClick={handleFinesseReroll} disabled={isRolling}>\n                FINESSE · REROLL ALL\n              </button>\n            )}\n            {forceCriticalAvailable && (\n              <button type="button" className="dice-roll-button dice-roll-button-secondary" onClick={handleForceCritical} disabled={isRolling}>\n                {criticalPerkSource.toUpperCase()} · 1 LUCK\n              </button>\n            )}\n            {lastRoll?.forcedCritical && (\n              <div className="dice-context-stat">\n                <span className="dice-context-stat-label">CRITICAL:</span>\n                <span className="dice-context-stat-value">{lastRoll.forcedCriticalSource}</span>\n              </div>\n            )}\n          </div>\n        )}\n\n        <div className="dice-top-layout">\n'''
)

print("Combat resource layer and dice reroll fix applied.")
