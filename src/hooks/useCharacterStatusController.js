import { getPowerArmorPartCondition } from "../data/powerArmor.js";
import { getDerivedStats } from "../utils/characterMath.js";

export function useCharacterStatusController({ form, setForm, derived }) {
  const baseMaxHp = Math.max(1, Number(derived.maxHp || 1));
  const radiationHp = Math.max(
    0,
    Math.min(Number(form.radiationHp || 0), baseMaxHp)
  );
  const effectiveMaxHp = Math.max(0, baseMaxHp - radiationHp);
  const currentHpValue = Math.max(
    0,
    Math.min(Number(form.currentHp || 0), effectiveMaxHp)
  );

  const updateHealthState = (updater) => {
    setForm((prev) => {
      const prevBaseMaxHp = Math.max(1, Number(getDerivedStats(prev).maxHp || 1));
      const prevRadiation = Math.max(
        0,
        Math.min(Number(prev.radiationHp || 0), prevBaseMaxHp)
      );
      const prevEffectiveMax = Math.max(0, prevBaseMaxHp - prevRadiation);
      const prevCurrentHp = Math.max(
        0,
        Math.min(Number(prev.currentHp || 0), prevEffectiveMax)
      );

      const requested = updater({
        currentHp: prevCurrentHp,
        radiationHp: prevRadiation,
        baseMaxHp: prevBaseMaxHp,
        effectiveMaxHp: prevEffectiveMax,
      }) || {};

      const nextRadiation = Math.max(
        0,
        Math.min(
          requested.radiationHp === undefined ? prevRadiation : Number(requested.radiationHp || 0),
          prevBaseMaxHp
        )
      );
      const nextEffectiveMax = Math.max(0, prevBaseMaxHp - nextRadiation);
      const nextCurrentHp = Math.max(
        0,
        Math.min(
          requested.currentHp === undefined ? prevCurrentHp : Number(requested.currentHp || 0),
          nextEffectiveMax
        )
      );

      return {
        ...prev,
        currentHp: String(nextCurrentHp),
        radiationHp: String(nextRadiation),
      };
    });
  };

  const handleHpSliderChange = (nextHp) => {
    updateHealthState(({ radiationHp: prevRadiation, baseMaxHp: maxHp }) => {
      const safeHp = Math.max(0, Math.min(Number(nextHp || 0), maxHp));
      const maxAllowedRadiation = Math.max(0, maxHp - safeHp);
      return {
        currentHp: safeHp,
        radiationHp: Math.min(prevRadiation, maxAllowedRadiation),
      };
    });
  };

  const handleRadiationSliderChange = (nextRadiation) => {
    updateHealthState(({ currentHp, baseMaxHp: maxHp }) => ({
      radiationHp: Math.max(0, Math.min(Number(nextRadiation || 0), maxHp)),
      currentHp,
    }));
  };

  const handleHpDecrease = () => {
    updateHealthState(({ currentHp }) => ({ currentHp: currentHp - 1 }));
  };

  const handleHpIncrease = () => {
    updateHealthState(({ currentHp }) => ({ currentHp: currentHp + 1 }));
  };

  const updateInjury = (partKey, requestedState) =>
    setForm((prev) => {
      const current = prev.injuries?.[partKey] || "normal";
      const cycledState =
        current === "normal"
          ? "crippled"
          : current === "crippled"
            ? "treated"
            : "normal";
      const nextState = ["normal", "crippled", "treated"].includes(requestedState)
        ? requestedState
        : cycledState;

      return {
        ...prev,
        injuries: { ...prev.injuries, [partKey]: nextState },
      };
    });

  const updateArmor = (part, field, value) =>
    setForm((prev) => ({
      ...prev,
      armor: {
        ...prev.armor,
        [part]: { ...prev.armor[part], [field]: value },
      },
    }));

  const cycleBodyArmorState = (partKey, mode) => {
    const slotMap = {
      head: "Head",
      torso: "Torso",
      leftArm: "Left Arm",
      rightArm: "Right Arm",
      leftLeg: "Left Leg",
      rightLeg: "Right Leg",
    };
    const slotId = slotMap[partKey];
    if (!slotId) return;

    setForm((prev) => {
      const armorState = prev.armor || {};

      if (mode === "powerArmor") {
        const loadout = armorState?._power?.loadout;
        const condition = getPowerArmorPartCondition(loadout, slotId);
        if (!loadout || !condition) return prev;

        const currentHp =
          condition.state === "intact"
            ? Math.max(0, condition.maximum - 1)
            : condition.state === "damaged"
              ? 0
              : condition.maximum;
        const existing = loadout.slots?.[slotId] || {};
        const legacySetId =
          loadout.setId && !["none", "frame", "mixed"].includes(loadout.setId)
            ? loadout.setId
            : "";

        return {
          ...prev,
          armor: {
            ...armorState,
            _power: {
              ...(armorState._power || {}),
              loadout: {
                ...loadout,
                setId: "mixed",
                slots: {
                  ...(loadout.slots || {}),
                  [slotId]: {
                    ...existing,
                    setId: existing.setId || legacySetId,
                    currentHp,
                  },
                },
              },
            },
          },
        };
      }

      const parts = armorState?._condition?.parts || {};
      const previous = parts[slotId] || {};
      const currentStatus = ["intact", "damaged", "broken"].includes(previous.status)
        ? previous.status
        : "intact";
      const nextStatus = {
        intact: "damaged",
        damaged: "broken",
        broken: "intact",
      }[currentStatus];

      const current = previous.current && typeof previous.current === "object"
        ? { ...previous.current }
        : {};
      if (nextStatus === "broken") {
        current.physical = 0;
        current.energy = 0;
        current.radiation = 0;
        current.poison = 0;
      }

      return {
        ...prev,
        armor: {
          ...armorState,
          _condition: {
            ...(armorState._condition || {}),
            parts: {
              ...parts,
              [slotId]: {
                ...previous,
                status: nextStatus,
                current,
              },
            },
          },
        },
      };
    });
  };

  return {
    baseMaxHp,
    radiationHp,
    effectiveMaxHp,
    currentHpValue,
    handleHpSliderChange,
    handleRadiationSliderChange,
    handleHpDecrease,
    handleHpIncrease,
    updateInjury,
    updateArmor,
    cycleBodyArmorState,
  };
}

export default useCharacterStatusController;
