import React, { useEffect, useState } from "react";
import FalloutD20Roller from "./FalloutD20Roller";
import FalloutD6Roller from "./FalloutD6Roller";

export default function DiceRollModal({
  isOpen,
  onClose,
  rollConfig = null,
  form = null,
  pendingAutoD6,
  setPendingAutoD6,
}) {
  const [activeTab, setActiveTab] = useState("d20");

  const [d20History, setD20History] = useState([]);
  const [d6History, setD6History] = useState([]);

  const [d20LastRoll, setD20LastRoll] = useState(null);
  const [d6LastRoll, setD6LastRoll] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (rollConfig?.diceType === "d6") {
      setActiveTab("d6");
      return;
    }

    setActiveTab("d20");
  }, [isOpen, rollConfig]);

  useEffect(() => {
    if (!pendingAutoD6) return;
    if (!isOpen) return;

    setActiveTab("d6");
  }, [pendingAutoD6, isOpen]);

  if (!isOpen) return null;

  const modalTitle =
    rollConfig?.title || (activeTab === "d20" ? "D20 Roller" : "D6 Roller");

  return (
    <div className="dice-modal-overlay">
      <div className="dice-modal-screen">
        <div className="dice-modal-frame">
          <div className="dice-modal-topbar">
            <button
              type="button"
              className="dice-modal-nav-button"
              onClick={onClose}
            >
              ← Back
            </button>

            <div className="dice-modal-title">{modalTitle}</div>

            <div className="dice-modal-topbar-spacer" />
          </div>

          <div className="dice-modal-content">
            <div className="dice-switcher">
              <button
                type="button"
                className={`dice-switcher-tab ${activeTab === "d20" ? "is-active" : ""}`}
                onClick={() => setActiveTab("d20")}
              >
                D20
              </button>

              <button
                type="button"
                className={`dice-switcher-tab ${activeTab === "d6" ? "is-active" : ""}`}
                onClick={() => setActiveTab("d6")}
              >
                D6
              </button>
            </div>

            {activeTab === "d20" ? (
              <FalloutD20Roller
                history={d20History}
                setHistory={setD20History}
                lastRoll={d20LastRoll}
                setLastRoll={setD20LastRoll}
                rollConfig={rollConfig}
                form={form}
                onAutoRollDamage={(diceCount) => {
                  setPendingAutoD6({
                    diceCount,
                    id: Date.now(),
                  });
                }}
              />
            ) : (
              <FalloutD6Roller
                history={d6History}
                setHistory={setD6History}
                lastRoll={d6LastRoll}
                setLastRoll={setD6LastRoll}
                autoRollRequest={pendingAutoD6}
                onAutoRollHandled={() => setPendingAutoD6(null)}
                weaponEffects={[
                  ...(Array.isArray(rollConfig?.weapon?.effects)
                    ? rollConfig.weapon.effects
                    : []),
                  ...(rollConfig?.weapon?.customEffect
                    ? rollConfig.weapon.customEffect
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : []),
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}