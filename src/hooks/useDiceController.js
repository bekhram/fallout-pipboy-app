import { useState } from "react";

export function useDiceController({ spendAmmoForWeaponRoll }) {
  const [pendingAutoD6, setPendingAutoD6] = useState(null);
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [diceRoll, setDiceRoll] = useState(null);

  const openFreeDiceRoll = () => {
    setDiceRoll(null);
    setIsDiceOpen(true);
  };

  const openContextDiceRoll = (rollConfig) => {
    setPendingAutoD6(null);
    setDiceRoll(rollConfig);
    setIsDiceOpen(true);

    console.log(
      "Rolling:",
      rollConfig.type,
      "Weapon ammo:",
      rollConfig.weapon?.ammo
    );

    spendAmmoForWeaponRoll(rollConfig);
  };

  const closeDiceRoll = () => {
    setIsDiceOpen(false);
    setDiceRoll(null);
  };

  return {
    pendingAutoD6,
    setPendingAutoD6,
    isDiceOpen,
    diceRoll,
    openFreeDiceRoll,
    openContextDiceRoll,
    closeDiceRoll,
  };
}

export default useDiceController;
