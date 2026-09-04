import React, { useMemo, useState } from "react";
import { rerollOneFalloutD20, rollFalloutD20 } from "../../utils/dice.js";
import "./localSkillCheck.css";

const RESOURCE_STORAGE_KEY = "fallout_pipboy_local_check_resources_v2";
const MAX_AP = 6;
const MAX_D20 = 5;

const TEXT = {
  en: {
    check: "SKILL CHECK", target: "TARGET", difficulty: "DIFFICULTY", roll: "ROLL", rolling: "ROLLING...", success: "SUCCESS", fail: "FAIL", successes: "successes", complications: "complications", result: "Roll result", ap: "AP", gmAp: "GM AP", luck: "LUCK", buyDie: "BUY +1D20", giveGmAp: "GIVE GM AP", cost: "COST", generated: "AP GENERATED", reroll: "REROLL", rerollHint: "Spend 1 Luck to reroll this die. A die can only be rerolled once.", finalize: "CONTINUE", spent: "spent", remaining: "remaining", stackedDeck: "STACKED DECK", useLuckAttribute: "USE LCK FOR THIS TEST", lckUsed: "LCK USED",
  },
  ru: {
    check: "ПРОВЕРКА НАВЫКА", target: "ЦЕЛЬ", difficulty: "СЛОЖНОСТЬ", roll: "БРОСИТЬ", rolling: "БРОСОК...", success: "УСПЕХ", fail: "НЕУДАЧА", successes: "успехов", complications: "осложнений", result: "Результат броска", ap: "ОД", gmAp: "ОД GM", luck: "УДАЧА", buyDie: "КУПИТЬ +1D20", giveGmAp: "ДАТЬ GM ОД", cost: "ЦЕНА", generated: "ПОЛУЧЕНО ОД", reroll: "ПЕРЕБРОСИТЬ", rerollHint: "Потратить 1 Удачу и перебросить этот куб. Каждый куб можно перебросить только один раз.", finalize: "ПРОДОЛЖИТЬ", spent: "потрачено", remaining: "осталось", stackedDeck: "STACKED DECK", useLuckAttribute: "ИСПОЛЬЗОВАТЬ LCK ДЛЯ ТЕСТА", lckUsed: "ИСПОЛЬЗУЕТСЯ LCK",
  },
  uk: {
    check: "ПЕРЕВІРКА НАВИЧКИ", target: "ЦІЛЬ", difficulty: "СКЛАДНІСТЬ", roll: "КИНУТИ", rolling: "КИДОК...", success: "УСПІХ", fail: "НЕВДАЧА", successes: "успіхів", complications: "ускладнень", result: "Результат кидка", ap: "ОД", gmAp: "ОД GM", luck: "УДАЧА", buyDie: "КУПИТИ +1D20", giveGmAp: "ДАТИ GM ОД", cost: "ЦІНА", generated: "ОТРИМАНО ОД", reroll: "ПЕРЕКИНУТИ", rerollHint: "Витратити 1 Удачу та перекинути цей куб. Кожен куб можна перекинути лише один раз.", finalize: "ПРОДОВЖИТИ", spent: "витрачено", remaining: "залишилось", stackedDeck: "STACKED DECK", useLuckAttribute: "ВИКОРИСТАТИ LCK ДЛЯ ТЕСТУ", lckUsed: "ВИКОРИСТАНО LCK",
  },
  pl: {
    check: "TEST UMIEJĘTNOŚCI", target: "CEL", difficulty: "TRUDNOŚĆ", roll: "RZUĆ", rolling: "RZUT...", success: "SUKCES", fail: "PORAŻKA", successes: "sukcesy", complications: "komplikacje", result: "Wynik rzutu", ap: "PA", gmAp: "PA MG", luck: "SZCZĘŚCIE", buyDie: "KUP +1D20", giveGmAp: "DAJ MG PA", cost: "KOSZT", generated: "ZDOBYTE PA", reroll: "PRZERZUĆ", rerollHint: "Wydaj 1 Szczęście, aby przerzucić tę kość. Każdą kość można przerzucić tylko raz.", finalize: "KONTYNUUJ", spent: "wydano", remaining: "pozostało", stackedDeck: "STACKED DECK", useLuckAttribute: "UŻYJ LCK W TYM TEŚCIE", lckUsed: "UŻYTO LCK",
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getLuckMaximum(character) {
  return Math.max(0, Number(character?.special?.L ?? character?.SPECIAL?.L ?? 0));
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
  const maxLuck = getLuckMaximum(character);

  return {
    ap: clamp(Number.isFinite(saved?.ap) ? Number(saved.ap) : Number.isFinite(sheetAp) ? sheetAp : 0, 0, MAX_AP),
    gmAp: Math.max(0, Number.isFinite(saved?.gmAp) ? Number(saved.gmAp) : 1),
    luck: clamp(Number.isFinite(saved?.luck) ? Number(saved.luck) : Number.isFinite(sheetLuck) ? sheetLuck : maxLuck, 0, maxLuck),
  };
}

function saveResources(resources) {
  try {
    localStorage.setItem(RESOURCE_STORAGE_KEY, JSON.stringify(resources));
  } catch {
    // Resource persistence is optional.
  }
}

function getRollContext(check, character, useLuckAttribute = false) {
  if (!check) return null;
  const skill = character?.skills?.[check.skill] || {};
  const baseAttribute = check.attribute || skill.attribute || "A";
  const attribute = useLuckAttribute ? "L" : baseAttribute;
  const attributeValue = Number(character?.special?.[attribute] ?? character?.SPECIAL?.[attribute] ?? 0);
  const rank = Number(skill.rank || 0);
  const bonus = Number(skill.bonus || 0);
  const targetNumber = clamp(attributeValue + rank + bonus, 0, 20);
  const criticalRange = skill.tagged ? clamp(rank, 1, 20) : 1;
  return {
    attribute,
    baseAttribute,
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
  const [useLuckAttribute, setUseLuckAttribute] = useState(false);
  const context = useMemo(() => getRollContext(check, character, useLuckAttribute), [check, character, useLuckAttribute]);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [selectedDice, setSelectedDice] = useState(() => getRollContext(check, character, false)?.diceCount || 2);
  const [resources, setResources] = useState(() => getInitialResources(character));
  const [spentAp, setSpentAp] = useState(0);
  const [givenGmAp, setGivenGmAp] = useState(0);
  const [spentLuck, setSpentLuck] = useState(0);
  const [generatedAp, setGeneratedAp] = useState(0);
  const [rerolledIndices, setRerolledIndices] = useState([]);

  if (!check || !context) return null;

  const baseDice = context.diceCount;
  const apCost = getExtraDiceCost(baseDice, selectedDice);
  const nextExtraCost = Math.max(1, selectedDice - baseDice + 1);
  const canSpendPlayerAp = apCost + nextExtraCost <= resources.ap;
  const canGiveGmAp = resources.ap === 0;
  const canBuyDie = !lastResult && selectedDice < MAX_D20 && (canSpendPlayerAp || canGiveGmAp);

  function updateResources(next) {
    setResources(next);
    saveResources(next);
  }

  function toggleStackedDeck() {
    if (disabled || isRolling || lastResult || useLuckAttribute || resources.luck <= 0) return;
    setUseLuckAttribute(true);
    setSpentLuck((value) => value + 1);
    updateResources({ ...resources, luck: Math.max(0, resources.luck - 1) });
  }

  function buyExtraDie() {
    if (disabled || isRolling || !canBuyDie) return;
    setSelectedDice((value) => clamp(value + 1, baseDice, MAX_D20));
  }

  function rollCheck() {
    if (disabled || isRolling || lastResult) return;

    const paidWithPlayerAp = apCost <= resources.ap;
    const paidByGivingGmAp = !paidWithPlayerAp && resources.ap === 0;
    if (!paidWithPlayerAp && !paidByGivingGmAp) return;

    setIsRolling(true);

    window.setTimeout(() => {
      const result = rollFalloutD20({
        diceCount: selectedDice,
        targetNumber: context.targetNumber,
        criticalRange: context.criticalRange,
        label: `${context.attribute} + ${context.skillName}`,
      });

      const playerSpend = paidWithPlayerAp ? apCost : 0;
      const gmGain = paidByGivingGmAp ? apCost : 0;
      const gained = Math.max(0, result.totalSuccesses - context.difficulty);
      const remainingAfterSpend = clamp(resources.ap - playerSpend, 0, MAX_AP);
      const actualGain = Math.min(gained, MAX_AP - remainingAfterSpend);
      const nextResources = {
        ...resources,
        ap: clamp(remainingAfterSpend + actualGain, 0, MAX_AP),
        gmAp: Math.max(0, resources.gmAp + gmGain),
      };

      setSpentAp(playerSpend);
      setGivenGmAp(gmGain);
      setGeneratedAp(actualGain);
      updateResources(nextResources);
      setLastResult(result);
      setIsRolling(false);
    }, 450);
  }

  function rerollDie(index) {
    if (disabled || isRolling || !lastResult || resources.luck <= 0 || rerolledIndices.includes(index)) return;
    const die = lastResult.rolls[index];
    if (!die) return;

    const rerolled = rerollOneFalloutD20(lastResult, index, {
      targetNumber: context.targetNumber,
      criticalRange: context.criticalRange,
      label: `${context.attribute} + ${context.skillName}`,
    });

    const oldExcess = Math.max(0, lastResult.totalSuccesses - context.difficulty);
    const newExcess = Math.max(0, rerolled.totalSuccesses - context.difficulty);
    const deltaExcess = newExcess - oldExcess;
    const nextAp = clamp(resources.ap + deltaExcess, 0, MAX_AP);
    const effectiveGenerated = Math.max(0, generatedAp + deltaExcess);
    const nextResources = {
      ...resources,
      ap: nextAp,
      luck: Math.max(0, resources.luck - 1),
    };

    setGeneratedAp(effectiveGenerated);
    setSpentLuck((value) => value + 1);
    setRerolledIndices((value) => [...value, index]);
    updateResources(nextResources);
    setLastResult(rerolled);
  }

  function finalizeResult() {
    if (!lastResult || disabled || isRolling) return;
    const passed = lastResult.totalSuccesses >= context.difficulty;
    const dice = lastResult.rolls.map((die) => die.value).join(", ");
    const message = `${tx.result}: ${context.attribute} + ${context.skillName}; d20=[${dice}]; ${tx.successes}=${lastResult.totalSuccesses}; ${tx.complications}=${lastResult.complications}; ${tx.difficulty}=${context.difficulty}; ${tx.ap} ${tx.spent}=${spentAp}; ${tx.gmAp} +${givenGmAp}; ${tx.generated}=${generatedAp}; ${tx.ap} ${tx.remaining}=${resources.ap}; ${tx.gmAp}=${resources.gmAp}; ${tx.luck} ${tx.spent}=${spentLuck}; ${tx.luck} ${tx.remaining}=${resources.luck}; ${useLuckAttribute ? `${tx.lckUsed}; ` : ""}${passed ? tx.success : tx.fail}. Resolve this check and continue the scene.`;
    onSubmit?.(message, { ...lastResult, passed, check, context, spentAp, givenGmAp, generatedAp, spentLuck, resources, rerolledIndices, useLuckAttribute });
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
        <span>{tx.gmAp}: {resources.gmAp}</span>
        <span>{tx.luck}: {resources.luck}/{getLuckMaximum(character)}</span>
      </div>

      {!lastResult && !useLuckAttribute && resources.luck > 0 ? (
        <div className="pip-local-check__buy-row">
          <button type="button" className="pip-btn" onClick={toggleStackedDeck} disabled={disabled || isRolling}>
            {tx.stackedDeck} · {tx.useLuckAttribute} · 1 {tx.luck}
          </button>
        </div>
      ) : null}

      {!lastResult && selectedDice < MAX_D20 ? (
        <div className="pip-local-check__buy-row">
          <button type="button" className="pip-btn" onClick={buyExtraDie} disabled={disabled || isRolling || !canBuyDie}>
            {canSpendPlayerAp
              ? `${tx.buyDie} · ${tx.cost} ${nextExtraCost} ${tx.ap}`
              : `${tx.buyDie} · ${tx.giveGmAp} ${nextExtraCost}`}
          </button>
          {apCost > 0 ? <span>{tx.cost}: {apCost} {canSpendPlayerAp ? tx.ap : tx.gmAp}</span> : null}
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
          {lastResult.rolls.map((die, index) => {
            const alreadyRerolled = rerolledIndices.includes(index);
            return (
              <button
                type="button"
                className={`pip-local-check__die${die.successes > 0 ? " is-success" : " is-fail"}`}
                key={`${index}-${die.value}-${spentLuck}`}
                onClick={() => rerollDie(index)}
                disabled={disabled || isRolling || alreadyRerolled || resources.luck <= 0}
                title={alreadyRerolled ? "" : tx.rerollHint}
              >
                <strong>{die.value}</strong>
                <span>{alreadyRerolled ? "✓" : tx.reroll}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {!lastResult ? (
        <button type="button" className="pip-action-button pip-local-check__roll" onClick={rollCheck} disabled={disabled || isRolling || (apCost > resources.ap && resources.ap !== 0)}>
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
