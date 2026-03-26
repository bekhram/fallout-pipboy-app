import React, { useEffect, useState } from "react";
import { playSound } from "../../utils/soundManager";
import { rollFalloutD6, rerollOneFalloutD6 } from "../../utils/dice";

const MAX_HISTORY = 5;
const MOBILE_VISIBLE_LIMIT = 25;

function formatHistoryEntry(entry) {
  const diceText = entry.rolls.map((die) => `[${die.label}]`).join("");

  const effectNamesText =
    entry.rawEffects?.length > 0
      ? ` Fx:${entry.rawEffects.join("|")}`
      : "";

  const spreadText =
    entry.spreadHits?.length > 0
      ? ` ${entry.spreadHits
          .map((hit) => `${hit.label}:${hit.damage}`)
          .join(",")}`
      : "";

  const burstText =
    entry.burstTargets?.length > 0
      ? ` nextTarg:${entry.burstDamagePerTarget}`
      : "";

  return `${entry.diceCount}d6:${diceText} D:${entry.totalDamage} E:${entry.totalEffects}${effectNamesText}${spreadText}${burstText}`;
}

function getD6SortWeight(die) {
  if (die.label === "0") return 0;
  if (die.label === "1") return 1;
  if (die.label === "1+") return 2;
  if (die.label === "2") return 3;
  return 99;
}

function getD6FaceLabel(value) {
  if (value === 1) return "1";
  if (value === 2) return "2";
  if (value === 3 || value === 4) return "-";
  if (value === 5 || value === 6) return "1+";
  return "-";
}

export default function FalloutD6Roller({
  history,
  setHistory,
  lastRoll,
  setLastRoll,
  autoRollRequest = null,
  onAutoRollHandled,
  weaponEffects = [],
}) {
  const [isRolling, setIsRolling] = useState(false);
  const [rerollingDieIndex, setRerollingDieIndex] = useState(null);
  const [animatedValue, setAnimatedValue] = useState(1);
  const [diceCount, setDiceCount] = useState(4);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);

    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const resultStats = {
    damage: lastRoll?.totalDamage ?? 0,
    effects: lastRoll?.totalEffects ?? 0,
  };

  const sortedRolls = lastRoll
    ? lastRoll.rolls
        .map((die, originalIndex) => ({ ...die, originalIndex }))
        .sort((a, b) => getD6SortWeight(a) - getD6SortWeight(b))
    : [];

  const visibleRolls = isMobile
    ? sortedRolls.slice(0, MOBILE_VISIBLE_LIMIT)
    : sortedRolls;

  const hiddenRollsCount = isMobile
    ? Math.max(0, sortedRolls.length - MOBILE_VISIBLE_LIMIT)
    : 0;

  const diceGridClassName = [
    "dice-rolls-grid",
    visibleRolls.length >= 21
      ? "is-ultra-compact"
      : visibleRolls.length >= 13
      ? "is-compact"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const clampDiceCount = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return 1;
    return Math.max(1, Math.min(50, numeric));
  };

  const decreaseDiceCount = () => {
    setDiceCount((prev) => Math.max(1, Number(prev || 1) - 1));
  };

  const increaseDiceCount = () => {
    setDiceCount((prev) => Math.min(50, Number(prev || 1) + 1));
  };

  const handleDiceCountChange = (event) => {
    const raw = event.target.value;

    if (raw === "") {
      setDiceCount("");
      return;
    }

    setDiceCount(clampDiceCount(raw));
  };

  const handleDiceCountBlur = () => {
    if (diceCount === "") {
      setDiceCount(1);
      return;
    }

    setDiceCount(clampDiceCount(diceCount));
  };

  const animateDice = (duration = 600, onFinish) => {
    const start = Date.now();
    let step = 0;
    const maxSteps = 10;

    const tick = () => {
      const elapsed = Date.now() - start;
      step += 1;

      setAnimatedValue(Math.floor(Math.random() * 6) + 1);

      if (elapsed < duration && step < maxSteps) {
        window.setTimeout(tick, 50);
      } else {
        onFinish?.();
      }
    };

    tick();
  };

  const performRoll = (count) => {
    const finalResult = rollFalloutD6({
      diceCount: count,
      effects: weaponEffects,
    });

    setLastRoll(finalResult);
    setHistory((prev) => [finalResult, ...prev].slice(0, MAX_HISTORY));
  };

  const doRoll = () => {
    if (isRolling) return;

    const count = Number(diceCount) || 1;
    playSound("diceRoll");
    setIsRolling(true);

    animateDice(600, () => {
      performRoll(count);
      setIsRolling(false);
    });
  };

  const handleRerollOne = (dieIndex) => {
    if (!lastRoll || isRolling || rerollingDieIndex !== null) return;

    playSound("diceRoll");
    setRerollingDieIndex(dieIndex);

    animateDice(500, () => {
      const finalUpdatedResult = rerollOneFalloutD6(lastRoll, dieIndex, {
        effects: weaponEffects,
      });

      setLastRoll(finalUpdatedResult);

      setHistory((prev) => {
        if (prev.length === 0) return [finalUpdatedResult];
        const next = [...prev];
        next[0] = finalUpdatedResult;
        return next.slice(0, MAX_HISTORY);
      });

      setRerollingDieIndex(null);
    });
  };

  useEffect(() => {
    if (!autoRollRequest?.diceCount) return;
    if (isRolling) return;

    const count = Number(autoRollRequest.diceCount) || 1;

    setDiceCount(count);
    playSound("diceRoll");
    setIsRolling(true);

    animateDice(600, () => {
      performRoll(count);
      setIsRolling(false);
      onAutoRollHandled?.();
    });
  }, [autoRollRequest?.id]);

  const placeholderDice = Array.from(
    { length: Number(diceCount) || 1 },
    () => null
  );

  const reelStep = isMobile ? 24 : 32;

  return (
    <section className="dice-card dice-card-fullscreen">
      <div className="dice-card-header">
        <h2 className="dice-card-title">D6 Damage Roller</h2>
      </div>

      <div className="dice-card-body dice-card-body-compact">
        <div className="dice-result-top dice-result-top-compact">
          <div className="dice-result-stat">
            <span className="dice-result-stat-label">Damage</span>
            <span className="dice-result-stat-value">{resultStats.damage}</span>
          </div>

          <div className="dice-result-stat">
            <span className="dice-result-stat-label">Effects</span>
            <span className="dice-result-stat-value">{resultStats.effects}</span>
          </div>
        </div>

        <div className="dice-top-layout">
          <div className="dice-field-group">
            <div className="dice-field-label">Dice Count</div>

            <div className="dice-d6-counter-row">
              <button
                type="button"
                className="dice-stepper-button"
                onClick={decreaseDiceCount}
                aria-label="Decrease d6 count"
              >
                −
              </button>

              <div className="dice-d6-counter-pill">
                <span className="dice-d6-counter-label">d6</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={diceCount}
                  onChange={handleDiceCountChange}
                  onBlur={handleDiceCountBlur}
                  className="dice-d6-counter-input"
                />
              </div>

              <button
                type="button"
                className="dice-stepper-button"
                onClick={increaseDiceCount}
                aria-label="Increase d6 count"
              >
                +
              </button>
            </div>
          </div>

          <div className="dice-actions">
            <button
              type="button"
              className={`dice-roll-button ${isRolling ? "is-rolling" : ""}`}
              onClick={doRoll}
              disabled={isRolling}
            >
              {isRolling ? "Rolling..." : "Roll"}
            </button>

            <button
              type="button"
              className="dice-roll-button dice-roll-button-secondary"
              onClick={doRoll}
              disabled={isRolling}
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

            <div className={diceGridClassName}>
              {(visibleRolls.length > 0 ? visibleRolls : placeholderDice).map(
                (die, index) => (
                  <button
                    key={
                      die
                        ? `${die.originalIndex}-${die.value}`
                        : `placeholder-${index}`
                    }
                    type="button"
                    className={[
                      "dice-roll-chip",
                      die?.damage === 0 ? "is-zero" : "",
                      die?.effect > 0 ? "is-effect" : "",
                      die?.damage === 2 ? "is-strong" : "",
                      !die ? "is-placeholder" : "",
                      rerollingDieIndex === die?.originalIndex
                        ? "is-rerolling"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      if (die) handleRerollOne(die.originalIndex);
                    }}
                    title={die ? "Reroll this die" : "Roll to reveal"}
                    disabled={!die || isRolling || rerollingDieIndex !== null}
                  >
                    <div className="dice-roll-chip-window">
                      {!die && !isRolling ? (
                        <div className="dice-roll-chip-value">-</div>
                      ) : (
                        <div
                          className="dice-roll-chip-reel"
                          style={{
                            transform: `translateY(-${(
                              (isRolling
                                ? animatedValue
                                : rerollingDieIndex === die?.originalIndex
                                  ? animatedValue
                                  : die?.value ?? 1) - 1
                            ) * reelStep}px)`,
                          }}
                        >
                          {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} className="dice-roll-chip-value">
                              {getD6FaceLabel(i + 1)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                )
              )}
            </div>

            {hiddenRollsCount > 0 ? (
              <div className="dice-hidden-note">
                +{hiddenRollsCount} more dice hidden on mobile
              </div>
            ) : null}

            {!lastRoll && !isRolling && (
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