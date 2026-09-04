import React, { useMemo, useState } from "react";
import { rerollOneFalloutD20, rollFalloutD20 } from "../../utils/dice.js";
import "./localSkillCheck.css";

const RESOURCE_STORAGE_KEY = "fallout_pipboy_local_check_resources_v1";
const MAX_AP = 6;
const MAX_D20 = 5;

const TEXT = {
  en: {
    check: "SKILL CHECK", target: "TARGET", difficulty: "DIFFICULTY", roll: "ROLL", rolling: "ROLLING...", success: "SUCCESS", fail: "FAIL", successes: "successes", complications: "complications", result: "Roll result", ap: "AP", luck: "LUCK", buyDie: "BUY +1D20", cost: "COST", generated: "AP GENERATED", reroll: "REROLL", rerollHint: "Spend 1 Luck to reroll an unsuccessful die", finalize: "CONTINUE", spent: "spent", remaining: "remaining",
  },
  ru: {
    check: "ПРОВЕРКА НАВЫКА", target: "ЦЕЛЬ", difficulty: "СЛОЖНОСТЬ", roll: "БРОСИТЬ", rolling: "БРОСОК...", success: "УСПЕХ", fail: "НЕУДАЧА", successes: "успехов", complications: "осложнений", result: "Результат броска", ap: "ОД", luck: "УДАЧА", buyDie: "КУПИТЬ +1D20", cost: "ЦЕНА", generated: "ПОЛУЧЕНО ОД", reroll: "ПЕРЕБРОСИТЬ", rerollHint: "Потратить 1 очко Удачи, чтобы перебросить неудачный куб", finalize: "ПРОДОЛЖИТЬ", spent: "потрачено", remaining: "осталось",
  },
  uk: {
    check: "ПЕРЕВІРКА НАВИЧКИ", target: "ЦІЛЬ", difficulty: "СКЛАДНІСТЬ", roll: "КИНУТИ", rolling: "КИДОК...", success: "УСПІХ", fail: "НЕВДАЧА", successes: "успіхів", complications: "ускладнень", result: "Результат кидка", ap: "ОД", luck: "УДАЧА", buyDie: "КУПИТИ +1D20", cost: "ЦІНА", generated: "ОТРИМАНО ОД", reroll: "ПЕРЕКИНУТИ", rerollHint: "Витратити 1 очко Удачі, щоб перекинути невдалий куб", finalize: "ПРОДОВЖИТИ", spent: "витрачено", remaining: "залишилось",
  },
  pl: {
    check: "TEST UMIEJĘTNOŚCI", target: "CEL", difficulty: "TRUDNOŚĆ", roll: "RZUĆ", rolling: "RZUT...", success: "SUKCES", fail: "PORAŻKA", successes: "sukcesy", complications: "komplikacje", result: "Wynik rzutu", ap: "PA", luck: "SZCZĘŚCIE", buyDie: "KUP +1D20", cost: "KOSZT", generated: "ZDOBYTE PA", reroll: "PRZERZUĆ", rerollHint: "Wydaj 1 punkt Szczęścia, aby przerzucić nieudany wynik", finalize: "KONTYNUUJ", spent: "wydano", remaining: "pozostało",
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getInitialResources(character) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(RESOURCE_STORAGE_KEY) || "null");
  } catch {
    saved = null;
  }

  const sheetAp = Number(character?.actionPoints ?? character?.ap ?? character?.AP);
  const sheetLuck = Number(character?.luckPoints ?? character?.currentLuck ?? character?.luck);
  const specialLuck = Number(character?.special?.L ?? character?.SPECIAL?.L ?? 0);

  return {
    ap: clamp(Number.isFinite(saved?.ap) ? Number(saved.ap) : Number.isFinite(sheetAp) ? sheetAp : 0, 0, MAX_AP),
    luck: Math.max(0, Number.isFinite(saved?.luck) ? Number(saved.luck) : Number.isFinite(sheetLuck) ? sheetLuck : specialLuck),
  };
}

function saveResources(resources) {
  try {
    localStorage.setItem(RESOURCE_STORAGE_KEY, JSON.stringify(resources));
  } catch {
    // Resource persistence is optional.
  }
}

function getRollContext(check, character) {
  if (!check) return null;
  const skill = character?.skills?.[check.skill] || {};
  const attribute = check.attribute || skill.attribute || "A";
  const attributeValue = Number(character?.special?.[attribute] ?? character?.SPECIAL?.[attribute] ?? 0);
  const rank = Number(skill.rank || 0);
  const bonus = Number(skill.bonus || 0);
  const targetNumber = clamp(attributeValue + rank + bonus, 0, 20);
  const criticalRange = skill.tagged ? clamp(rank, 1, 20) : 1;
  return {
    attribute,
    skillName: check.skill,
    targetNumber,
    criticalRange,
    difficulty: clamp(Number(check.difficulty) || 1, 0, 10),
    diceCount: clamp(Number(check.diceCount) || 2, 1, MAX_D20),
  };
}

function getExtraDiceCost(baseDice, selectedDice) {
  const extras = Math.max(0, selectedDice - baseDice);
  let cost = 0;
  for (let i = 1; i <= extras; i += 1) cost += i;
  return cost;
}

export default function LocalSkillCheck({ check, character, language = "en", disabled, onSubmit }) {
  const tx = TEXT[language] || TEXT.en;
  const context = useMemo(() => getRollContext(check, character), [check, character]);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [selectedDice, setSelectedDice] = useState(() => context?.diceCount || 2);
  const [resources, setResources] = useState(() => getInitialResources(character));
  const [spentAp, setSpentAp] = useState(0);
  const [spentLuck, setSpentLuck] = useState(0);
  const [generatedAp, setGeneratedAp] = useState(0);

  if (!check || !context) return null;

  const baseDice = context.diceCount;
  const apCost = getExtraDiceCost(baseDice, selectedDice);
  const nextExtraCost = Math.max(1, selectedDice - baseDice + 1);
  const canBuyDie = !lastResult && selectedDice < MAX_D20 && apCost + nextExtraCost <= resources.ap;

  function updateResources(next) {
    setResources(next);
    saveResources(next);
  }

  function buyExtraDie() {
    if (disabled || isRolling || !canBuyDie) return;
    setSelectedDice((value) => clamp(value + 1, baseDice, MAX_D20));
  }

  function rollCheck() {
    if (disabled || isRolling || lastResult) return;
    if (apCost > resources.ap) return;
    setIsRolling(true);

    window.setTimeout(() => {
      const result = rollFalloutD20({
        diceCount: selectedDice,
        targetNumber: context.targetNumber,
        criticalRange: context.criticalRange,
        label: `${context.attribute} + ${context.skillName}`,
      });

      const gained = Math.max(0, result.totalSuccesses - context.difficulty);
      const remainingAfterSpend = clamp(resources.ap - apCost, 0, MAX_AP);
      const actualGain = Math.min(gained, MAX_AP - remainingAfterSpend);
      const nextResources = {
        ...resources,
        ap: clamp(remainingAfterSpend + actualGain, 0, MAX_AP),
      };

      setSpentAp(apCost);
      setGeneratedAp(actualGain);
      updateResources(nextResources);
      setLastResult(result);
      setIsRolling(false);
    }, 450);
  }

  function rerollDie(index) {
    if (disabled || isRolling || !lastResult || resources.luck <= 0) return;
    const die = lastResult.rolls[index];
    if (!die || die.successes > 0) return;

    const rerolled = rerollOneFalloutD20(lastResult, index, {
      targetNumber: context.targetNumber,
      criticalRange: context.criticalRange,
      label: `${context.attribute} + ${context.skillName}`,
    });

    const oldExcess = Math.max(0, lastResult.totalSuccesses - context.difficulty);
    const newExcess = Math.max(0, rerolled.totalSuccesses - context.difficulty);
    const deltaExcess = newExcess - oldExcess;
    const nextAp = clamp(resources.ap + deltaExcess, 0, MAX_AP);
    const effectiveGenerated = clamp(generatedAp + deltaExcess, 0, MAX_AP);
    const nextResources = {
      ap: nextAp,
      luck: Math.max(0, resources.luck - 1),
    };

    setGeneratedAp(effectiveGenerated);
    setSpentLuck((value) => value + 1);
    updateResources(nextResources);
    setLastResult(rerolled);
  }

  function finalizeResult() {
    if (!lastResult || disabled || isRolling) return;
    const passed = lastResult.totalSuccesses >= context.difficulty;
    const dice = lastResult.rolls.map((die) => die.value).join(", ");
    const message = `${tx.result}: ${context.attribute} + ${context.skillName}; d20=[${dice}]; ${tx.successes}=${lastResult.totalSuccesses}; ${tx.complications}=${lastResult.complications}; ${tx.difficulty}=${context.difficulty}; ${tx.ap} ${tx.spent}=${spentAp}; ${tx.generated}=${generatedAp}; ${tx.ap} ${tx.remaining}=${resources.ap}; ${tx.luck} ${tx.spent}=${spentLuck}; ${tx.luck} ${tx.remaining}=${resources.luck}; ${passed ? tx.success : tx.fail}. Resolve this check and continue the scene.`;
    onSubmit?.(message, { ...lastResult, passed, check, context, spentAp, generatedAp, spentLuck, resources });
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
        <span>{selectedDice}d20</span>
        <span>CR: {context.criticalRange}</span>
        <span>{tx.ap}: {resources.ap}/{MAX_AP}</span>
        <span>{tx.luck}: {resources.luck}</span>
      </div>

      {!lastResult && selectedDice < MAX_D20 ? (
        <div className="pip-local-check__buy-row">
          <button type="button" className="pip-btn" onClick={buyExtraDie} disabled={disabled || isRolling || !canBuyDie}>
            {tx.buyDie} · {tx.cost} {nextExtraCost} {tx.ap}
          </button>
          {apCost > 0 ? <span>{tx.cost}: {apCost} {tx.ap}</span> : null}
        </div>
      ) : null}

      {lastResult ? (
        <div className={`pip-local-check__result ${passed ? "is-success" : "is-fail"}`}>
          <strong>{passed ? tx.success : tx.fail}</strong>
          <span>{lastResult.totalSuccesses} {tx.successes}</span>
          <span>{lastResult.complications} {tx.complications}</span>
          <span>{tx.generated}: {generatedAp}</span>
        </div>
      ) : null}

      {lastResult ? (
        <div className="pip-local-check__dice-list">
          {lastResult.rolls.map((die, index) => (
            <button
              type="button"
              className={`pip-local-check__die${die.successes > 0 ? " is-success" : " is-fail"}`}
              key={`${index}-${die.value}-${spentLuck}`}
              onClick={() => rerollDie(index)}
              disabled={disabled || isRolling || die.successes > 0 || resources.luck <= 0}
              title={die.successes > 0 ? "" : tx.rerollHint}
            >
              <strong>{die.value}</strong>
              <span>{die.successes > 0 ? `+${die.successes}` : tx.reroll}</span>
            </button>
          ))}
        </div>
      ) : null}

      {!lastResult ? (
        <button type="button" className="pip-action-button pip-local-check__roll" onClick={rollCheck} disabled={disabled || isRolling || apCost > resources.ap}>
          {isRolling ? tx.rolling : `${tx.roll} ${selectedDice}D20`}
        </button>
      ) : (
        <button type="button" className="pip-action-button pip-local-check__roll" onClick={finalizeResult} disabled={disabled || isRolling}>
          {tx.finalize}
        </button>
      )}
    </section>
  );
}
