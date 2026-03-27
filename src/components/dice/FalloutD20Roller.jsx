import React, { useEffect, useMemo, useState } from "react";
import { playSound } from "../../utils/soundManager";
import {
  rollHitLocationD20,
  rollFalloutD20,
  rerollOneFalloutD20,
} from "../../utils/dice";

function getHitFaceLabel(value) {
  const roll = Number(value);

  if (roll >= 1 && roll <= 2) return "H";
  if (roll >= 3 && roll <= 8) return "T";
  if (roll >= 9 && roll <= 11) return "LH";
  if (roll >= 12 && roll <= 14) return "RH";
  if (roll >= 15 && roll <= 17) return "LL";
  if (roll >= 18 && roll <= 20) return "RL";

  return "?";
}

const MAX_HISTORY = 5;

function getSkillTestValue(skill, form) {
  if (!skill || !form) return 0;

  const rank = Number(skill.rank || 0);
  const attributeKey = skill.attribute || "A";
  const attrValue = Number(form.special?.[attributeKey] || 0);
  const bonus = Number(skill.bonus || 0);

  return rank + attrValue + bonus;
}

function getSkillCriticalRange(skill) {
  if (!skill) return 1;

  const rank = Math.min(20, Number(skill.rank || 0));
  return skill.tagged ? Math.max(1, rank) : 1;
}

function getWeaponTestValue(weapon, form) {
  if (!weapon || !form) return 0;

  const skillName = weapon.skill;
  const skill = form.skills?.[skillName];
  if (!skill) return 0;

  return getSkillTestValue(skill, form);
}

function getWeaponCriticalRange(weapon, form) {
  if (!weapon || !form) return 1;

  const skillName = weapon.skill;
  const skill = form.skills?.[skillName];

  return getSkillCriticalRange(skill);
}

function getWeaponDamageDiceCount(weapon) {
  const raw = weapon?.damage;
  if (raw === null || raw === undefined) return 0;

  const match = String(raw).match(/\d+/);
  if (!match) return 0;

  return Math.max(0, Number(match[0]) || 0);
}

function buildRollSummary(result) {
  return {
    successes: result?.totalSuccesses ?? 0,
    complications: result?.complications ?? 0,
  };
}

function formatHistoryEntry(entry) {
  const diceText = entry.rolls?.map((die) => `[${die.value}]`).join("") || "";
  const label = entry.label ? `${entry.label} · ` : "";
  const target = entry.targetNumber ? ` ST:${entry.targetNumber}` : "";
  const hit = entry.hitLocation
    ? ` Hit:${entry.hitLocation.label} (${entry.hitLocation.value})`
    : "";

  if (entry.type === "hit-location-only") {
    return `Hit: ${entry.hitLocation.label} (${entry.hitLocation.value})`;
  }

  return `${label}${entry.diceCount}d20:${diceText} Suc:${entry.totalSuccesses} Com:${entry.complications}${target}${hit}`;
}

export default function FalloutD20Roller({
  history,
  setHistory,
  lastRoll,
  setLastRoll,
  rollConfig = null,
  form = null,
  onAutoRollDamage,
}) {
  const [diceCount, setDiceCount] = useState(2);
  const [isRolling, setIsRolling] = useState(false);
  const [rerollingDieIndex, setRerollingDieIndex] = useState(null);
  const [animatedValue, setAnimatedValue] = useState(1);
  const [hitLocation, setHitLocation] = useState(null);
  const [isHitRolling, setIsHitRolling] = useState(false);
  const [animatedHitValue, setAnimatedHitValue] = useState(1);

  const isSkillRoll = rollConfig?.type === "skill";
  const isWeaponRoll = rollConfig?.type === "weapon";
  const isContextRoll = isSkillRoll || isWeaponRoll;

  const targetNumber = useMemo(() => {
    if (typeof rollConfig?.targetNumber === "number") {
      return rollConfig.targetNumber;
    }

    if (isSkillRoll) {
      if (typeof rollConfig?.testValue === "number") {
        return rollConfig.testValue;
      }
      return getSkillTestValue(rollConfig?.skill, form);
    }

    if (isWeaponRoll) {
      return getWeaponTestValue(rollConfig?.weapon, form);
    }

    return null;
  }, [rollConfig, form, isSkillRoll, isWeaponRoll]);

  const criticalRange = useMemo(() => {
    if (typeof rollConfig?.criticalRange === "number") {
      return rollConfig.criticalRange;
    }

    if (isSkillRoll) {
      return getSkillCriticalRange(rollConfig?.skill);
    }

    if (isWeaponRoll) {
      return getWeaponCriticalRange(rollConfig?.weapon, form);
    }

    return 1;
  }, [rollConfig, form, isSkillRoll, isWeaponRoll]);

  const rollLabel = useMemo(() => {
    if (isSkillRoll) return rollConfig?.title || rollConfig?.skillName || "Skill Test";
    if (isWeaponRoll) return rollConfig?.title || rollConfig?.weapon?.name || "Weapon Attack";
    return "Free Roll";
  }, [rollConfig, isSkillRoll, isWeaponRoll]);

  useEffect(() => {
    if (!rollConfig?.id) return;

    setIsRolling(false);
    setRerollingDieIndex(null);
    setAnimatedValue(1);
    setHitLocation(null);
    setIsHitRolling(false);
    setAnimatedHitValue(1);
  }, [rollConfig?.id]);

  useEffect(() => {
    if (isSkillRoll && rollConfig?.diceCount) {
      setDiceCount(Number(rollConfig.diceCount) || 2);
      return;
    }

    if (isSkillRoll) {
      setDiceCount(2);
      return;
    }

    if (isWeaponRoll) {
      setDiceCount(Number(rollConfig?.diceCount) || 2);
      return;
    }

    if (!rollConfig) {
      setDiceCount(2);
    }
  }, [rollConfig, isSkillRoll, isWeaponRoll]);

  const resultStats = buildRollSummary(lastRoll);
  const difficulty = Number(rollConfig?.difficulty || 1);

  const autoRollWeaponDamage = (attackResult) => {
  if (!isWeaponRoll) return;

  const didHit = (attackResult?.totalSuccesses || 0) >= difficulty;
  if (!didHit) return;

  const baseDamageDiceCount = getWeaponDamageDiceCount(rollConfig?.weapon);
  const extraRateDiceCount = rollConfig?.useRate
    ? Number(rollConfig?.rate) || 0
    : 0;

  const totalDamageDiceCount = baseDamageDiceCount + extraRateDiceCount;
  if (totalDamageDiceCount <= 0) return;

  onAutoRollDamage?.(totalDamageDiceCount);
};

  const animateDice = (duration = 600, onFinish) => {
    const start = Date.now();
    let step = 0;
    const maxSteps = 10;

    const tick = () => {
      const elapsed = Date.now() - start;
      step += 1;

      setAnimatedValue(Math.floor(Math.random() * 20) + 1);

      if (elapsed < duration && step < maxSteps) {
        window.setTimeout(tick, 50);
      } else {
        onFinish?.();
      }
    };

    tick();
  };

  const animateHitDie = (duration = 500, onFinish) => {
    const start = Date.now();
    let step = 0;
    const maxSteps = 8;

    const tick = () => {
      const elapsed = Date.now() - start;
      step += 1;

      setAnimatedHitValue(Math.floor(Math.random() * 20) + 1);

      if (elapsed < duration && step < maxSteps) {
        window.setTimeout(tick, 50);
      } else {
        onFinish?.();
      }
    };

    tick();
  };

  const handleHitLocation = () => {
    if (isRolling || isHitRolling) return;

    playSound("diceRoll");
    setIsHitRolling(true);

    animateHitDie(500, () => {
      const result = rollHitLocationD20();
      setHitLocation(result);

      const historyEntry = {
        type: "hit-location-only",
        hitLocation: result,
        timestamp: result.timestamp,
      };

      setHistory((prev) => [historyEntry, ...prev].slice(0, MAX_HISTORY));
      setIsHitRolling(false);
    });
  };

  const doRoll = () => {
    if (isRolling || isHitRolling) return;

    playSound("diceRoll");
    setIsRolling(true);

    animateDice(600, () => {
      const result = rollFalloutD20({
        diceCount,
        targetNumber: isContextRoll ? targetNumber : undefined,
        criticalRange: isContextRoll ? criticalRange : undefined,
        label: rollLabel,
      });

      if (isWeaponRoll && result.totalSuccesses >= difficulty) {
        setLastRoll(result);
        setHistory((prev) => [result, ...prev].slice(0, MAX_HISTORY));
        setIsRolling(false);
        autoRollWeaponDamage(result);

        setIsHitRolling(true);
        animateHitDie(500, () => {
          const nextHit = rollHitLocationD20();
          setHitLocation(nextHit);

          const nextResult = { ...result, hitLocation: nextHit };
          setLastRoll(nextResult);
          setHistory((prev) => {
            const next = [...prev];
            next[0] = nextResult;
            return next.slice(0, MAX_HISTORY);
          });

          setIsHitRolling(false);
        });

        return;
      }

      setLastRoll(result);
      setHistory((prev) => [result, ...prev].slice(0, MAX_HISTORY));
      autoRollWeaponDamage(result);
      setIsRolling(false);
    });
  };

  const handleRerollOne = (dieIndex) => {
    if (!lastRoll || isRolling || rerollingDieIndex !== null || isHitRolling) return;

    playSound("diceRoll");
    setRerollingDieIndex(dieIndex);

    animateDice(500, () => {
      const updatedResult = rerollOneFalloutD20(lastRoll, dieIndex, {
        targetNumber: isContextRoll ? targetNumber : undefined,
        criticalRange: isContextRoll ? criticalRange : undefined,
        label: rollLabel,
      });

      if (isWeaponRoll && updatedResult.totalSuccesses >= difficulty) {
        setLastRoll(updatedResult);
        setHistory((prev) => {
          if (prev.length === 0) return [updatedResult];
          const next = [...prev];
          next[0] = updatedResult;
          return next.slice(0, MAX_HISTORY);
        });
        setRerollingDieIndex(null);
        autoRollWeaponDamage(updatedResult);

        setIsHitRolling(true);
        animateHitDie(500, () => {
          const nextHitLocation = rollHitLocationD20();
          setHitLocation(nextHitLocation);

          const nextUpdatedResult = {
            ...updatedResult,
            hitLocation: nextHitLocation,
          };

          setLastRoll(nextUpdatedResult);
          setHistory((prev) => {
            if (prev.length === 0) return [nextUpdatedResult];
            const next = [...prev];
            next[0] = nextUpdatedResult;
            return next.slice(0, MAX_HISTORY);
          });

          setIsHitRolling(false);
        });

        return;
      }

      setLastRoll(updatedResult);
      setHistory((prev) => {
        if (prev.length === 0) return [updatedResult];
        const next = [...prev];
        next[0] = updatedResult;
        return next.slice(0, MAX_HISTORY);
      });

      autoRollWeaponDamage(updatedResult);
      setRerollingDieIndex(null);
    });
  };

  const diceList = [
    ...(lastRoll?.rolls?.length
      ? lastRoll.rolls.map((d, i) => ({ ...d, type: "d20", index: i }))
      : Array.from({ length: diceCount }, (_, i) => ({
          type: "d20",
          index: i,
          placeholder: true,
        }))),
    { type: "hit" },
  ];

  return (
    <section className="dice-card dice-card-fullscreen">
      <div className="dice-card-header">
        <h2 className="dice-card-title">
          {isWeaponRoll
            ? "Weapon Attack Roller"
            : isSkillRoll
              ? "Skill Test Roller"
              : "D20 Check Roller"}
        </h2>
      </div>

      <div className="dice-card-body dice-card-body-compact">
        {isContextRoll && (
          <div className="dice-context-panel">
            <div className="dice-context-title">{rollLabel}</div>

            <div className="dice-context-stats">
              <div className="dice-context-stat">
                <span className="dice-context-stat-label">Skill test:</span>
                <span className="dice-context-stat-value">{targetNumber ?? 0}</span>
              </div>
            </div>
          </div>
        )}

        <div className="dice-result-top dice-result-top-compact">
          <div className="dice-result-stat">
            <span className="dice-result-stat-label">Successes</span>
            <span className="dice-result-stat-value">{resultStats.successes}</span>
          </div>

          <div className="dice-result-stat">
            <span className="dice-result-stat-label">Complications</span>
            <span className="dice-result-stat-value">{resultStats.complications}</span>
          </div>
        </div>

        <div className="dice-top-layout">
          <div className="dice-field-group">
            <div className="dice-field-label">Dice Count</div>

            <div className="dice-count-row">
              {[1, 2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={isSkillRoll && !!rollConfig?.diceCount}
                  className={`dice-count-button ${diceCount === count ? "active" : ""}`}
                  onClick={() => setDiceCount(count)}
                >
                  {count}d20
                </button>
              ))}

              <button
                type="button"
                className="dice-count-button"
                onClick={handleHitLocation}
                disabled={isRolling || isHitRolling}
              >
                Hit
              </button>
            </div>
          </div>

          <div className="dice-actions">
            <button
              type="button"
              className={`dice-roll-button ${isRolling ? "is-rolling" : ""}`}
              onClick={doRoll}
              disabled={isRolling || isHitRolling}
            >
              {isRolling ? "Rolling..." : "Roll"}
            </button>

            <button
              type="button"
              className="dice-roll-button dice-roll-button-secondary"
              onClick={doRoll}
              disabled={isRolling || isHitRolling}
            >
              Reroll
            </button>
          </div>
        </div>

        <div className="dice-middle-layout">
          <div className="dice-result-panel">
            {lastRoll && (
              <div className="dice-reroll-hint">Tap a die to reroll it</div>
            )}

            <div className="dice-rolls-grid">
              {diceList.map((item) => {
                if (item.type === "hit") {
                  return (
                    <button
                      key="hit-die"
                      type="button"
                      className={`dice-roll-chip dice-hit-die ${isHitRolling ? "is-rerolling" : ""}`}
                      onClick={handleHitLocation}
                      disabled={isRolling || isHitRolling}
                      title="Roll hit location"
                    >
                      <div className="dice-roll-chip-window">
                        <div
                          className="dice-roll-chip-reel"
                          style={{
                            transform: `translateY(-${((isHitRolling
                              ? animatedHitValue
                              : hitLocation?.value ?? 1) - 1) * 24}px)`,
                          }}
                        >
                          {Array.from({ length: 20 }, (_, i) => (
                            <div key={i} className="dice-roll-chip-value">
                              {getHitFaceLabel(i + 1)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                }

                const die = item;
                const i = item.index;

                return (
                  <button
                    key={die.placeholder ? `placeholder-${i}` : `${die.value}-${i}`}
                    type="button"
                    className={[
                      "dice-roll-chip",
                      die?.isSuccess ? "is-success" : "",
                      die?.isCritical ? "is-critical" : "",
                      die?.isComplication ? "is-complication" : "",
                      die?.placeholder ? "is-placeholder" : "",
                      rerollingDieIndex === i ? "is-rerolling" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      if (!die.placeholder) handleRerollOne(i);
                    }}
                    title={die.placeholder ? "Roll to reveal" : "Reroll this die"}
                    disabled={
                      die.placeholder ||
                      isRolling ||
                      rerollingDieIndex !== null ||
                      isHitRolling
                    }
                  >
                    <div className="dice-roll-chip-window">
                      {die.placeholder && !isRolling && rerollingDieIndex !== i ? (
                        <div className="dice-roll-chip-value">—</div>
                      ) : (
                        <div
                          className="dice-roll-chip-reel"
                          style={{
                            transform: `translateY(-${(
                              (isRolling
                                ? animatedValue
                                : rerollingDieIndex === i
                                  ? animatedValue
                                  : die?.value ?? 1) - 1
                            ) * 24}px)`,
                          }}
                        >
                          {Array.from({ length: 20 }, (_, j) => (
                            <div key={j} className="dice-roll-chip-value">
                              {j + 1}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!lastRoll && !isRolling && !isHitRolling && (
              <div className="dice-empty-state">Choose dice count and roll</div>
            )}
          </div>

          <div className="dice-history-panel">
            <div className="dice-history-title">Log</div>

            {history.length === 0 ? (
              <div className="dice-empty-state">No history</div>
            ) : (
              <div className="dice-history-list dice-history-list-compact">
                {history.map((entry, index) => (
                  <div
                    key={`${entry.timestamp}-${index}`}
                    className="dice-history-item"
                  >
                    {formatHistoryEntry(entry)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}