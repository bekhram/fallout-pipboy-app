import React from "react";
import diceIcon from "../../assets/dice/d20.png";

export default function FloatingDiceButton({ onOpen }) {
  return (
    <button
      type="button"
      className="floating-dice-button"
      onClick={onOpen}
      aria-label="Open dice roller"
    >
      <img
        src={diceIcon}
        alt="Dice roller"
        className="floating-dice-button-icon"
      />
    </button>
  );
}