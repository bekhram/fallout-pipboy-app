import React, { useMemo, useState } from "react";
import { rollFalloutD20 } from "../../utils/dice.js";
import "./localSkillCheck.css";

const TEXT = {
  en: { check: "SKILL CHECK", target: "TARGET", difficulty: "DIFFICULTY", roll: "ROLL", rolling: "ROLLING...", success: "SUCCESS", fail: "FAIL", successes: "successes", complications: "complications", result: "Roll result" },
  ru: { check: "ПРОВЕРКА НАВЫКА", target: "ЦЕЛЬ", difficulty: "СЛОЖНОСТЬ", roll: "БРОСИТЬ", rolling: "БРОСОК...", success: "УСПЕХ", fail: "НЕУДАЧА", successes: "успехов", complications: "осложнений", result: "Результат броска" },
  uk: { check: "ПЕРЕВІРКА НАВИЧКИ", target: "ЦІЛЬ", difficulty: "СКЛАДНІСТЬ", roll: "КИНУТИ", rolling: "КИДОК...", success: "УСПІХ", fail: "НЕВДАЧА", successes: "успіхів", complications: "ускладнень", result: "Результат кидка" },
  pl: { check: "TEST UMIEJĘTNOŚCI", target: "CEL", difficulty: "TRUDNOŚĆ", roll: "RZUĆ", rolling: "RZUT...", success: "SUKCES", fail: "PORAŻKA", successes: "sukcesy", complications: "komplikacje", result: "Wynik rzutu" },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRollContext(check, character) {
  if (!check) return null;
  const skill = character?.skills?.[check.skill] || {};
  const attribute = check.attribute || skill.attribute || "A";
  const attributeValue = Number(character?.special?.[attribute] || 0);
  const rank = Number(skill.rank || 0);
  const bonus = Number(skill.bonus || 0);
  const targetNumber = clamp(attributeValue + rank + bonus, 0, 20);
  const criticalRange = skill.tagged ? clamp(rank, 1, 20) : 1;
  return {
    attribute,
    skillName: check.skill,
    targetNumber,
    criticalRange,
    difficulty: clamp(Number(check.difficulty) || 1, 0, 5),
    diceCount: clamp(Number(check.diceCount) || 2, 1, 5),
  };
}

export default function LocalSkillCheck({ check, character, language = "en", disabled, onSubmit }) {
  const tx = TEXT[language] || TEXT.en;
  const context = useMemo(() => getRollContext(check, character), [check, character]);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  if (!check || !context) return null;

  function rollCheck() {
    if (disabled || isRolling) return;
    setIsRolling(true);

    window.setTimeout(() => {
      const result = rollFalloutD20({
        diceCount: context.diceCount,
        targetNumber: context.targetNumber,
        criticalRange: context.criticalRange,
        label: `${context.attribute} + ${context.skillName}`,
      });
      setLastResult(result);
      setIsRolling(false);

      const passed = result.totalSuccesses >= context.difficulty;
      const dice = result.rolls.map((die) => die.value).join(", ");
      const message = `${tx.result}: ${context.attribute} + ${context.skillName}; d20=[${dice}]; ${tx.successes}=${result.totalSuccesses}; ${tx.complications}=${result.complications}; ${tx.difficulty}=${context.difficulty}; ${passed ? tx.success : tx.fail}. Resolve this check and continue the scene.`;
      onSubmit?.(message, { ...result, passed, check, context });
    }, 450);
  }

  const passed = lastResult ? lastResult.totalSuccesses >= context.difficulty : null;

  return (
    <section className="pip-local-check" aria-live="polite">
      <div className="pip-local-check__head">
        <div>
          <div className="pip-local-check__eyebrow">{tx.check}</div>
          <strong>{context.attribute} + {context.skillName}</strong>
        </div>
        <div className="pip-local-check__difficulty">{tx.difficulty} {context.difficulty}</div>
      </div>

      {check.reason ? <div className="pip-local-check__reason">{check.reason}</div> : null}

      <div className="pip-local-check__stats">
        <span>{tx.target}: {context.targetNumber}</span>
        <span>{context.diceCount}d20</span>
        <span>CR: {context.criticalRange}</span>
      </div>

      {lastResult ? (
        <div className={`pip-local-check__result ${passed ? "is-success" : "is-fail"}`}>
          <strong>{passed ? tx.success : tx.fail}</strong>
          <span>[{lastResult.rolls.map((die) => die.value).join(", ")}]</span>
          <span>{lastResult.totalSuccesses} {tx.successes}</span>
          <span>{lastResult.complications} {tx.complications}</span>
        </div>
      ) : null}

      <button type="button" className="pip-action-button pip-local-check__roll" onClick={rollCheck} disabled={disabled || isRolling}>
        {isRolling ? tx.rolling : `${tx.roll} ${context.diceCount}D20`}
      </button>
    </section>
  );
}
