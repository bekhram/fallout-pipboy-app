import { useCallback, useEffect, useMemo } from "react";
import { STATUS_LIST } from "../constants.js";
import { getDerivedStats } from "../utils/characterMath.js";
import { readCompanionState, writeCompanionState } from "../utils/companionStorage.js";
import { getConsumableUsePlan, PIPBOY_CONSUMABLE_COMBAT_AP_EVENT, PIPBOY_USE_ITEM_EVENT } from "../utils/consumableEffects.js";
import {
  ITEM_USE_COPY,
  consumeInventoryItemAt,
  getDamagedPowerArmorParts,
  getRepairKitTargetKind,
  getStimpakInfo,
  isRobotCompanion,
  normalizeUtilityName,
} from "../utils/appItemUseHelpers.js";

function chooseNumberedTarget(title, targets, lineForTarget) {
  const promptText = [
    title,
    ...targets.map((target, index) => String(index + 1) + ". " + lineForTarget(target)),
  ].join("\n");
  const raw = window.prompt(promptText, "1");
  if (raw === null) return null;
  const index = Number.parseInt(raw, 10) - 1;
  return Number.isInteger(index) && targets[index] ? targets[index] : undefined;
}

export function useInventoryItemController({ form, setForm, i18n, t }) {
  useEffect(() => {
    setForm((prev) => {
      let changed = false;
      const inventoryItems = (prev.inventoryItems || []).map((item) => {
        if (item?.sourceType !== "crafting_material" || item?.category === "junk") return item;
        changed = true;
        return { ...item, category: "junk" };
      });
      return changed ? { ...prev, inventoryItems } : prev;
    });
  }, [setForm]);

  const spendAmmoForWeaponRoll = useCallback((rollConfig) => {
    if (rollConfig?.type !== "weapon" || !rollConfig?.weapon?.ammo) return;

    const ammoType = String(rollConfig.weapon.ammo || "").trim();
    const normalizedAmmo = ammoType
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "")
      .replace(/s$/, "");
    const rateSpent = rollConfig.useRate
      ? Math.max(0, Number(rollConfig.rate ?? rollConfig.weapon.rate ?? 0))
      : 0;
    const ammoSpent = 1 + rateSpent;

    setForm((prev) => {
      const nextItems = [...(prev.inventoryItems || [])];
      const ammoIndex = nextItems.findIndex((item) => {
        if (item?.category !== "ammo") return false;
        const candidate = String(item?.canonicalName || item?.name || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, "")
          .replace(/s$/, "");
        return candidate === normalizedAmmo;
      });

      if (ammoIndex === -1) {
        console.warn(`No matching ammo in inventory: ${ammoType}`);
        return prev;
      }

      const currentQty = Math.max(0, Number.parseInt(nextItems[ammoIndex].quantity, 10) || 0);
      const actuallySpent = Math.min(currentQty, ammoSpent);
      const remaining = Math.max(0, currentQty - actuallySpent);
      nextItems[ammoIndex] = { ...nextItems[ammoIndex], quantity: String(remaining) };
      console.log(`Fired! -${actuallySpent} ${ammoType}. Remaining: ${remaining}`);

      return { ...prev, inventoryItems: nextItems };
    });
  }, [setForm]);
  useEffect(() => {
    const handleInventoryUse = (event) => {
      const index = Number(event?.detail?.index);
      const item = form.inventoryItems?.[index];
      if (!Number.isInteger(index) || !item || Number(item?.quantity ?? item?.qty ?? 0) <= 0) return;

      const name = normalizeUtilityName(item.canonicalName || item.name);
      const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
      const copy = ITEM_USE_COPY[language] || ITEM_USE_COPY.en;

      if (name === "stealth boy") {
        setForm((prev) => {
          const effectId = "consumable:stealth-boy";
          const activeConsumableEffects = (prev.activeConsumableEffects || [])
            .filter((effect) => effect?.id !== effectId)
            .concat({
              id: effectId,
              sourceName: item.name || "Stealth Boy",
              effectText: "Invisibility: +2 Defense; enemies add +2 difficulty to tests to spot you.",
              canonicalSourceName: "Stealth Boy",
              canonicalEffect: "Invisibility",
              duration: "3 turns",
              category: "misc",
              modifiers: {
                derived: { defenseBonus: 2 },
                tests: [],
                combat: {},
                flags: { invisible: true, stealthSpotDifficultyBonus: 2 },
              },
            });

          return {
            ...prev,
            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
            activeConsumableEffects,
            statuses: { ...(prev.statuses || {}), invisible: true },
            stealthBoyState: {
              active: true,
              remainingTurns: 3,
              spotDifficultyBonus: 2,
              defenseBonus: 2,
              activatedAt: new Date().toISOString(),
            },
          };
        });
        return;
      }

      if (name === "robot repair kit" || name === "power armor repair kit") {
        const companionState = readCompanionState();
        const robotTargets = (companionState.items || [])
          .filter((companion) => {
            const currentHp = Math.max(0, Number(companion?.currentHp || 0));
            const maxHp = Math.max(0, Number(companion?.maxHp || 0));
            return isRobotCompanion(companion) && maxHp > 0 && currentHp < maxHp;
          })
          .map((companion) => ({ kind: "robot", companion }));

        const powerArmorTargets = getDamagedPowerArmorParts(form)
          .map((target) => ({ kind: "powerArmor", ...target }));

        const repairTargetKind = getRepairKitTargetKind(name);
        const targets = repairTargetKind === "robot"
          ? robotTargets
          : repairTargetKind === "powerArmor"
            ? powerArmorTargets
            : [];

        if (!targets.length) {
          window.alert(repairTargetKind === "robot" ? copy.noRobotTarget : copy.noPowerArmorTarget);
          return;
        }

        const selected = chooseNumberedTarget(
          copy.chooseRepairTarget,
          targets,
          (target) => target.kind === "robot"
            ? "[" + copy.robot + "] " + (target.companion.name || target.companion.creatureType || "Robot") + ": " + target.companion.currentHp + "/" + target.companion.maxHp + " HP"
            : "[" + copy.powerArmor + "] " + target.part + ": " + target.current.hp + "/" + target.maximum.hp + " HP"
        );

        if (selected === null) return;
        if (!selected) {
          window.alert(copy.invalid);
          return;
        }

        if (selected.kind === "robot") {
          writeCompanionState({
            ...companionState,
            items: companionState.items.map((companion) => {
              if (companion.id !== selected.companion.id) return companion;
              const currentHp = Math.max(0, Number(companion.currentHp || 0));
              const maxHp = Math.max(0, Number(companion.maxHp || 0));
              return { ...companion, currentHp: String(Math.min(maxHp, currentHp + 4)) };
            }),
          });
          setForm((prev) => ({
            ...prev,
            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
          }));
          return;
        }

        setForm((prev) => {
          const loadout = prev?.armor?._power?.loadout || {};
          const slots = { ...(loadout.slots || {}) };
          const currentSlot = { ...(slots[selected.part] || {}) };
          const healedHp = Math.min(
            Number(selected.maximum.hp || 0),
            Number(selected.current.hp || 0) + 4
          );
          slots[selected.part] = { ...currentSlot, currentHp: healedHp };
          return {
            ...prev,
            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
            armor: {
              ...(prev.armor || {}),
              _power: {
                ...(prev.armor?._power || {}),
                loadout: { ...loadout, slots },
              },
            },
          };
        });
        return;
      }

      if (name === "chem suppressant syringe") {
        const addictionKeys = Object.keys(form.statuses || {}).filter((key) =>
          key.toLowerCase().endsWith("addiction") && form.statuses?.[key]
        );
        const selectedAddiction = addictionKeys.length
          ? chooseNumberedTarget(
              "Choose one addiction to remove",
              addictionKeys,
              (key) => key
            )
          : null;

        if (addictionKeys.length && selectedAddiction === null) return;

        setForm((prev) => {
          const statuses = { ...(prev.statuses || {}) };
          if (selectedAddiction) statuses[selectedAddiction] = false;

          const activeConsumableEffects = (prev.activeConsumableEffects || [])
            .filter((effect) => effect?.category !== "chem" && effect?.kind !== "addiction")
            .filter((effect) => effect?.id !== "consumable:chem-suppressant-syringe")
            .concat({
              id: "consumable:chem-suppressant-syringe",
              sourceName: "Chem Suppressant Syringe",
              effectText: "Chems have no effect while the suppressant is active.",
              canonicalSourceName: "Chem Suppressant Syringe",
              canonicalEffect: "Chem suppression",
              duration: "Lasting",
              category: "aid",
              modifiers: { derived: {}, tests: [], combat: {}, flags: { chemsSuppressed: true } },
            });

          return {
            ...prev,
            fatigue: String(Math.max(0, Number(prev.fatigue || 0)) + 2),
            statuses,
            activeConsumableEffects,
            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
          };
        });
        return;
      }

      if (name === "flesh fruit") {
        const infected = Number(form.famishedFeverDuration || 0) > 0;
        const contracted = infected
          ? true
          : !window.confirm("END + Survival D2: did the test succeed?");

        setForm((prev) => {
          const maxHp = Math.max(0, Number(getDerivedStats(prev).effectiveMaxHp || 0));
          const currentDuration = Math.max(0, Number(prev.famishedFeverDuration || 0));
          return {
            ...prev,
            currentHp: String(Math.min(maxHp, Math.max(0, Number(prev.currentHp || 0)) + 10)),
            satiety: String(Math.min(5, Math.max(0, Number(prev.satiety || 0)) + 1)),
            famishedFeverDuration: String(
              contracted ? (currentDuration > 0 ? currentDuration + 1 : 2) : currentDuration
            ),
            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
          };
        });

        window.dispatchEvent(new CustomEvent(PIPBOY_CONSUMABLE_COMBAT_AP_EVENT, {
          detail: { amount: 2, source: "Flesh Fruit" },
        }));
        return;
      }

      const previewPlan = getConsumableUsePlan(item, form);
      const chemsSuppressed = (form.activeConsumableEffects || []).some(
        (effect) => effect?.modifiers?.flags?.chemsSuppressed
      );
      if (chemsSuppressed && (previewPlan.statusKey || previewPlan.addictionRisk)) {
        window.alert("Chem Suppressant is active. This chem has no effect.");
        return;
      }

      const plan = getConsumableUsePlan(item, form, { showResult: true });
      setForm((prev) => {
        const statuses = { ...(prev.statuses || {}) };
        if (plan.statusKey) statuses[plan.statusKey] = true;
        if (plan.cureAddictions) {
          Object.keys(statuses).forEach((key) => {
            if (key.toLowerCase().endsWith("addiction")) statuses[key] = false;
          });
        }
        if (plan.cureDiseases) {
          STATUS_LIST.filter((status) => status.group === "disease").forEach((status) => {
            statuses[status.key] = false;
          });
        }

        let activeConsumableEffects = Array.isArray(prev.activeConsumableEffects)
          ? [...prev.activeConsumableEffects]
          : [];
        if (plan.activeEffect) {
          activeConsumableEffects = activeConsumableEffects
            .filter((effect) => effect?.id !== plan.activeEffect.id)
            .concat(plan.activeEffect);
        }

        const nextRadiation = Math.max(0, Number(prev.radiationHp || 0) - Number(plan.healingRadiation || 0));
        const preview = {
          ...prev,
          statuses,
          activeConsumableEffects,
          radiationHp: String(nextRadiation),
          satiety: String(Math.min(5, Math.max(0, Number(prev.satiety || 0) + Number(plan.hungerRestore || 0)))),
        };
        const maxHp = Math.max(0, Number(getDerivedStats(preview).effectiveMaxHp || 0));
        const nextHp = Math.min(maxHp, Math.max(0, Number(prev.currentHp || 0) + Number(plan.healingHp || 0)));

        return {
          ...preview,
          currentHp: String(nextHp),
          inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
        };
      });
    };

    window.addEventListener(PIPBOY_USE_ITEM_EVENT, handleInventoryUse);
    return () => window.removeEventListener(PIPBOY_USE_ITEM_EVENT, handleInventoryUse);
  }, [form, i18n.language, i18n.resolvedLanguage, setForm]);

  const endStealthBoy = () => {
    setForm((prev) => ({
      ...prev,
      statuses: { ...(prev.statuses || {}), invisible: false },
      stealthBoyState: { ...(prev.stealthBoyState || {}), active: false, remainingTurns: 0 },
      activeConsumableEffects: (prev.activeConsumableEffects || [])
        .filter((effect) => effect?.id !== "consumable:stealth-boy"),
    }));
  };

  const advanceStealthBoyTurn = () => {
    setForm((prev) => {
      const current = Math.max(0, Number(prev.stealthBoyState?.remainingTurns || 0));
      const remainingTurns = Math.max(0, current - 1);
      if (remainingTurns <= 0) {
        return {
          ...prev,
          statuses: { ...(prev.statuses || {}), invisible: false },
          stealthBoyState: { ...(prev.stealthBoyState || {}), active: false, remainingTurns: 0 },
          activeConsumableEffects: (prev.activeConsumableEffects || [])
            .filter((effect) => effect?.id !== "consumable:stealth-boy"),
        };
      }
      return {
        ...prev,
        stealthBoyState: { ...(prev.stealthBoyState || {}), active: true, remainingTurns },
      };
    });
  };

  const availableStimpaks = useMemo(
    () => (form.inventoryItems || [])
      .map((item, index) => getStimpakInfo(item, index))
      .filter(Boolean),
    [form.inventoryItems]
  );

  const treatableInjuries = useMemo(() => {
    const labelKeys = {
      head: "injuries.head",
      leftArm: "injuries.leftArm",
      rightArm: "injuries.rightArm",
      torso: "injuries.torso",
      leftLeg: "injuries.leftLeg",
      rightLeg: "injuries.rightLeg",
    };
    return Object.entries(form.injuries || {})
      .filter(([, state]) => state === "crippled")
      .map(([key]) => ({ key, label: t(labelKeys[key] || key) }));
  }, [form.injuries, t]);

  const useQuickStimpak = ({ index, mode, injuryKey }) => {
    setForm((prev) => {
      const items = Array.isArray(prev.inventoryItems) ? prev.inventoryItems : [];
      const stim = getStimpakInfo(items[index], index);
      if (!stim) return prev;

      if (mode === "injury") {
        if (!injuryKey || prev.injuries?.[injuryKey] !== "crippled") return prev;
        return {
          ...prev,
          inventoryItems: consumeInventoryItemAt(items, index),
          injuries: {
            ...(prev.injuries || {}),
            [injuryKey]: "treated",
          },
        };
      }

      const nextBase = {
        ...prev,
        inventoryItems: consumeInventoryItemAt(items, index),
      };
      const nextDerived = getDerivedStats(nextBase);
      const maxHp = Math.max(0, Number(nextDerived.effectiveMaxHp || nextDerived.maxHp || 0));
      const currentHp = Math.max(0, Number(prev.currentHp || 0));
      return {
        ...nextBase,
        currentHp: String(Math.min(maxHp, currentHp + stim.healingHp)),
      };
    });
  };

  return {
    availableStimpaks,
    treatableInjuries,
    useQuickStimpak,
    endStealthBoy,
    advanceStealthBoyTurn,
    spendAmmoForWeaponRoll,
  };
}

export default useInventoryItemController;
