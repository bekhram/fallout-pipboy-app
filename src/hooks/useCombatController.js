import { useEffect, useState } from "react";
import { PIPBOY_CONSUMABLE_COMBAT_AP_EVENT } from "../utils/consumableEffects.js";

export function useCombatController({
  combatApMax,
  currentLuckPoints,
  setCurrentLuckPoints,
}) {
  const safeCombatApMax = Math.max(0, Number(combatApMax || 0));

  const [combatState, setCombatState] = useState({
    active: false,
    turn: 0,
    ap: 0,
    usedThisTurn: {},
    usedThisCombat: {},
  });

  useEffect(() => {
    setCombatState((prev) => ({
      ...prev,
      ap: Math.min(safeCombatApMax, Math.max(0, Number(prev.ap || 0))),
    }));
  }, [safeCombatApMax]);

  useEffect(() => {
    const handleConsumableAp = (event) => {
      const amount = Math.max(0, Number(event?.detail?.amount || 0));
      if (amount <= 0) return;
      setCombatState((prev) => ({
        ...prev,
        ap: Math.min(safeCombatApMax, Math.max(0, Number(prev.ap || 0)) + amount),
      }));
    };
    window.addEventListener(PIPBOY_CONSUMABLE_COMBAT_AP_EVENT, handleConsumableAp);
    return () => window.removeEventListener(PIPBOY_CONSUMABLE_COMBAT_AP_EVENT, handleConsumableAp);
  }, [safeCombatApMax]);

  const setCombatAp = (value) => {
    const next = Math.max(0, Math.min(safeCombatApMax, Number(value || 0)));
    setCombatState((prev) => ({ ...prev, ap: next }));
  };

  const startCombat = () => {
    window.dispatchEvent(new CustomEvent("pipboy:scene-start"));
    setCombatState({
      active: true,
      turn: 1,
      ap: 0,
      usedThisTurn: {},
      usedThisCombat: {},
    });
  };

  const endCombat = () => {
    setCombatState({
      active: false,
      turn: 0,
      ap: 0,
      usedThisTurn: {},
      usedThisCombat: {},
    });
  };

  const nextCombatTurn = () => {
    setCombatState((prev) => ({
      ...prev,
      active: true,
      turn: Math.max(1, Number(prev.turn || 0) + 1),
      usedThisTurn: {},
    }));
  };

  const spendCombatAp = (amount = 1) => {
    const cost = Math.max(0, Number(amount || 0));
    if (!combatState.active || Number(combatState.ap || 0) < cost) return false;

    setCombatState((prev) => ({
      ...prev,
      ap: Math.max(0, Number(prev.ap || 0) - cost),
    }));
    return true;
  };

  const spendCombatLuck = (amount = 1) => {
    const cost = Math.max(1, Number(amount || 1));
    if (Number(currentLuckPoints || 0) < cost) return false;

    setCurrentLuckPoints((prev) => Math.max(0, Number(prev || 0) - cost));
    return true;
  };

  const markCombatUse = (scope, key) => {
    if (!key) return;

    const field = scope === "turn" ? "usedThisTurn" : "usedThisCombat";
    setCombatState((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] || {}),
        [key]: true,
      },
    }));
  };

  return {
    combatState,
    setCombatAp,
    startCombat,
    endCombat,
    nextCombatTurn,
    spendCombatAp,
    spendCombatLuck,
    markCombatUse,
  };
}

export default useCombatController;
