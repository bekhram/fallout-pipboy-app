import React, { useEffect, useMemo, useRef, useState } from "react";
import PipboyShell from "./components/layout/PipboyShell.jsx";
import StatusScreen from "./components/status/StatusScreen.jsx";
import SpecialScreen from "./components/special/SpecialScreen.jsx";
import WeaponsScreen from "./components/weapons/WeaponsScreen.jsx";
import InventoryScreen from "./components/inventory/InventoryScreen.jsx";
import ArmorScreen from "./components/armor/ArmorScreen.jsx";
import PerksScreen from "./components/perks/PerksScreen.jsx";
import NotesScreen from "./components/notes/NotesScreen.jsx";
import DataScreen from "./components/data/DataScreen.jsx";
import MenuScreen from "./components/menu/MenuScreen.jsx";
import SessionScreen from "./components/session/SessionScreen.jsx";
import SessionChatDrawer from "./components/session/SessionChatDrawer.jsx";
import useSharedSession from "./hooks/useSharedSession.js";
import SideMenu from "./components/shared/SideMenu.jsx";
import UnsavedChangesModal from "./components/shared/UnsavedChangesModal.jsx";
import PortraitCropModal from "./components/portrait/PortraitCropModal.jsx";
import FloatingDiceButton from "./components/dice/FloatingDiceButton";
import DiceRollModal from "./components/dice/DiceRollModal";
import MapScreen from "./components/map/MapScreen.jsx";
import GamesScreen from "./components/minigames/GamesScreen.jsx";
import PwaInstallButton from "./components/shared/PwaInstallButton.jsx";
import "./styles/pipboy.css";
import "./components/dice/dice.css";
import { parseCSV } from "./utils/csvParser.js"; 
import { calculatePowerArmorLocations } from "./data/powerArmor.js";
import { readCompanionState, writeCompanionState } from "./utils/companionStorage.js";
import { getConsumableUsePlan, PIPBOY_USE_ITEM_EVENT } from "./utils/consumableEffects.js";

import {
  ARMOR_PARTS,
  buildDefaultForm,
  buildDefaultMapState,
  createEmptyItem,
  createEmptyPerk,
  createEmptyWeapon,
  SKILL_LABEL_KEYS,
  STATUS_LIST,
} from "./constants.js";
import { useCharacterStorage } from "./hooks/useCharacterStorage.js";
import { usePortraitCropper } from "./hooks/usePortraitCropper.js";
import {
  getDerivedStats,
  normalizeNonNegative,
  normalizeWeightValue,
} from "./utils/characterMath.js";
import StatusBadgeList from "./components/status/StatusBadgeList.jsx";
import { useTranslation } from "react-i18next";
import { ORIGINS } from "./components/data/origins.js";
import {
  hydrateWeaponMetadata,
  needsWeaponMetadataHydration,
} from "./utils/weaponDatabase.js";

const ITEM_USE_COPY = {
  en: { noRepairTarget: "No damaged robot or power armor part found.", chooseRepairTarget: "Choose a repair target", invalid: "Invalid selection.", robot: "ROBOT", powerArmor: "POWER ARMOR" },
  ru: { noRepairTarget: "Нет поврежденного робота или части силовой брони.", chooseRepairTarget: "Выберите цель ремонта", invalid: "Неверный выбор.", robot: "РОБОТ", powerArmor: "СИЛОВАЯ БРОНЯ" },
  uk: { noRepairTarget: "Немає пошкодженого робота або частини силової броні.", chooseRepairTarget: "Оберіть ціль ремонту", invalid: "Невірний вибір.", robot: "РОБОТ", powerArmor: "СИЛОВА БРОНЯ" },
  pl: { noRepairTarget: "Brak uszkodzonego robota lub części pancerza wspomaganego.", chooseRepairTarget: "Wybierz cel naprawy", invalid: "Nieprawidłowy wybór.", robot: "ROBOT", powerArmor: "PANCERZ WSPOMAGANY" },
};

function normalizeUtilityName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function consumeInventoryItemAt(inventory = [], index) {
  return inventory
    .map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const quantity = Math.max(0, Number(item?.quantity ?? item?.qty ?? 0));
      return { ...item, quantity: String(Math.max(0, quantity - 1)) };
    })
    .filter((item) => Number(item?.quantity ?? item?.qty ?? 0) > 0);
}

function stripPowerArmorCurrentOverrides(loadout) {
  return {
    ...(loadout || {}),
    slots: Object.fromEntries(
      Object.entries(loadout?.slots || {}).map(([part, slot]) => {
        const clean = { ...(slot || {}) };
        delete clean.currentHp;
        delete clean.currentPhysical;
        delete clean.currentEnergy;
        delete clean.currentRadiation;
        delete clean.currentPoison;
        return [part, clean];
      })
    ),
  };
}

function getDamagedPowerArmorParts(character) {
  const loadout = character?.armor?._power?.loadout;
  if (!loadout) return [];
  const current = calculatePowerArmorLocations(loadout);
  const maximum = calculatePowerArmorLocations(stripPowerArmorCurrentOverrides(loadout));
  if (!current || !maximum) return [];
  return ARMOR_PARTS.filter((part) => {
    const now = current?.[part];
    const max = maximum?.[part];
    if (!now || !max || Number(max.hp || 0) <= 0) return false;
    return Number(now.hp || 0) < Number(max.hp || 0);
  }).map((part) => ({ part, current: current[part], maximum: maximum[part] }));
}

function isRobotCompanion(item) {
  const text = [item?.creatureType, item?.name, item?.specialAbilities]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(robot|robotic|machine|automatron|mister handy|mr\.? handy|protectron|assaultron|eyebot|sentry bot|robobrain)/i.test(text);
}

function chooseNumberedTarget(title, targets, lineForTarget) {
  const promptText = [title, ...targets.map((target, index) => `${index + 1}. ${lineForTarget(target)}`)].join("\n");
  const raw = window.prompt(promptText, "1");
  if (raw === null) return null;
  const index = Number.parseInt(raw, 10) - 1;
  return Number.isInteger(index) && targets[index] ? targets[index] : undefined;
}

export default function App() {
  const [pendingAutoD6, setPendingAutoD6] = useState(null);
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState("menu");
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [diceRoll, setDiceRoll] = useState(null);

  // === ГЛОБАЛЬНАЯ БАЗА ДАННЫХ ===
  const [globalWeapons, setGlobalWeapons] = useState([]);
  const [globalAmmo, setGlobalAmmo] = useState([]);

  useEffect(() => {
    // Завантаження зброї
    fetch('/weapons.csv')
      .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.text();
      })
      .then(csvText => {
        const parsed = parseCSV(csvText);
        setGlobalWeapons(parsed);
        console.log(`Loaded ${parsed.length} weapons from global database.`);
      })
      .catch(err => console.error("Error loading weapons.csv:", err));

    // Завантаження бази набоїв
    fetch('/Ammo.csv')
      .then(res => res.text())
      .then(csv => {
        const parsed = parseCSV(csv);
        setGlobalAmmo(parsed);
        console.log(`Loaded ${parsed.length} ammo types from global database.`);
      })
      .catch(err => console.error("Error loading ammo db:", err));
  }, []);
  // =============================

  const openFreeDiceRoll = () => {
    setDiceRoll(null);
    setIsDiceOpen(true);
  };

  const openContextDiceRoll = (rollConfig) => {
    setPendingAutoD6(null);
    setDiceRoll(rollConfig);
    setIsDiceOpen(true);

    console.log("Rolling:", rollConfig.type, "Weapon ammo:", rollConfig.weapon?.ammo);

    // === АВТОМАТИЧНА ВИТРАТА НАБОЇВ (Виправлено type === "weapon") ===
    if (rollConfig.type === "weapon" && rollConfig.weapon && rollConfig.weapon.ammo) {
      const ammoType = rollConfig.weapon.ammo;
      
      setForm((prev) => {
        const nextItems = [...prev.inventoryItems];
        const ammoIndex = nextItems.findIndex(item => item.name === ammoType);
        
        if (ammoIndex !== -1) {
          let currentQty = parseInt(nextItems[ammoIndex].quantity, 10) || 0;
          if (currentQty > 0) {
            nextItems[ammoIndex] = {
              ...nextItems[ammoIndex],
              quantity: String(currentQty - 1)
            };
            console.log(`Fired! -1 ${ammoType}. Remaining: ${currentQty - 1}`);
          } else {
            console.warn(`Click! Out of ${ammoType} ammo!`);
          }
        }
        return { ...prev, inventoryItems: nextItems };
      });
    }
    // ===================================
  };

  const closeDiceRoll = () => {
    setIsDiceOpen(false);
    setDiceRoll(null);
  };

  const [activeTab, setActiveTab] = useState("status");
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [editingWeaponIndex, setEditingWeaponIndex] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editingPerkIndex, setEditingPerkIndex] = useState(null);
  const [weaponDraft, setWeaponDraft] = useState(createEmptyWeapon());
  const [itemDraft, setItemDraft] = useState(createEmptyItem());
  const [perkDraft, setPerkDraft] = useState(createEmptyPerk());
  const importInputRef = useRef(null);
  const [showConditions, setShowConditions] = useState(false);
  const [showDerived, setShowDerived] = useState(false);
  const [showSkillsEditor, setShowSkillsEditor] = useState(false);

  const {
    form,
    setForm,
    saveStatus,
    loadStatus,
    exportJson,
    importJson,
    hasUnsavedChanges,
    loadLastCharacterMeta,
    resetToNewCharacter,
    continueLastCharacter,
    changeOrigin,
  } = useCharacterStorage(buildDefaultForm());

  const sharedSession = useSharedSession(form);

  useEffect(() => {
    if (
      screen === "session"
      && sharedSession.mode === "player"
      && sharedSession.status === "online"
    ) {
      setScreen("sheet");
      setActiveTab("status");
    }
  }, [screen, sharedSession.mode, sharedSession.status]);

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
        const targets = [...robotTargets, ...powerArmorTargets];

        if (!targets.length) {
          window.alert(copy.noRepairTarget);
          return;
        }

        const selected = chooseNumberedTarget(
          copy.chooseRepairTarget,
          targets,
          (target) => target.kind === "robot"
            ? `[${copy.robot}] ${target.companion.name || target.companion.creatureType || "Robot"}: ${target.companion.currentHp}/${target.companion.maxHp} HP`
            : `[${copy.powerArmor}] ${target.part}: ${target.current.hp}/${target.maximum.hp} HP`
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

  useEffect(() => {
    if (globalWeapons.length === 0) return;

    setForm((prev) => {
      let didChange = false;
      const weapons = (prev.weapons || []).map((weapon) => {
        if (!needsWeaponMetadataHydration(weapon, globalWeapons)) {
          return weapon;
        }

        didChange = true;
        return hydrateWeaponMetadata(weapon, globalWeapons);
      });

      return didChange ? { ...prev, weapons } : prev;
    });
  }, [globalWeapons, setForm]);

  const mapState = useMemo(
    () => ({
      ...buildDefaultMapState(),
      ...(form.mapData || {}),
    }),
    [form.mapData]
  );

  const updateMapData = (patchOrUpdater) => {
    setForm((prev) => {
      const prevMap = {
        ...buildDefaultMapState(),
        ...(prev.mapData || {}),
      };

      const nextMap =
        typeof patchOrUpdater === "function"
          ? patchOrUpdater(prevMap)
          : { ...prevMap, ...patchOrUpdater };

      return {
        ...prev,
        mapData: nextMap,
      };
    });
  };

  const portrait = usePortraitCropper((meta) => {
    setForm((prev) => ({ ...prev, ...meta }));
  });

  const derived = getDerivedStats(form);

  const [currentLuckPoints, setCurrentLuckPoints] = useState(
    derived.luckPoints || 0
  );

  useEffect(() => {
    setCurrentLuckPoints(derived.luckPoints || 0);
  }, [derived.luckPoints]);

  const onSpendLuck = () => {
    setCurrentLuckPoints((prev) => Math.max(0, prev - 1));
  };

  const combatApMax = Math.max(0, Number(derived.groupApMax || 6));
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
      ap: Math.min(combatApMax, Math.max(0, Number(prev.ap || 0))),
    }));
  }, [combatApMax]);

  const setCombatAp = (value) => {
    const next = Math.max(0, Math.min(combatApMax, Number(value || 0)));
    setCombatState((prev) => ({ ...prev, ap: next }));
  };

  const startCombat = () => {
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
    setCombatState((prev) => ({ ...prev, ap: Math.max(0, Number(prev.ap || 0) - cost) }));
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
      [field]: { ...(prev[field] || {}), [key]: true },
    }));
  };

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

  const setHpValues = (nextCurrent, nextRadiation = radiationHp) => {
    const safeRadiation = Math.max(
      0,
      Math.min(Number(nextRadiation || 0), baseMaxHp)
    );
    const safeEffective = Math.max(0, baseMaxHp - safeRadiation);
    const safeCurrent = Math.max(
      0,
      Math.min(Number(nextCurrent || 0), safeEffective)
    );

    setForm((prev) => ({
      ...prev,
      currentHp: String(safeCurrent),
      radiationHp: String(safeRadiation),
    }));
  };

  const handleHpSliderChange = (nextHp) => {
    const safeHp = Math.max(0, Math.min(Number(nextHp || 0), baseMaxHp));
    const maxAllowedRadiation = Math.max(0, baseMaxHp - safeHp);
    const nextRadiation = Math.min(radiationHp, maxAllowedRadiation);
    setHpValues(safeHp, nextRadiation);
  };

  const handleRadiationSliderChange = (nextRadiation) => {
    const safeRadiation = Math.max(
      0,
      Math.min(Number(nextRadiation || 0), baseMaxHp)
    );
    const nextEffective = Math.max(0, baseMaxHp - safeRadiation);
    const nextCurrent = Math.min(currentHpValue, nextEffective);
    setHpValues(nextCurrent, safeRadiation);
  };

  const handleHpDecrease = () => {
    handleHpSliderChange(currentHpValue - 1);
  };

  const handleHpIncrease = () => {
    handleHpSliderChange(currentHpValue + 1);
  };

  const lastRecordMeta = useMemo(
    () => loadLastCharacterMeta(),
    [loadStatus, saveStatus, screen]
  );

  const updateTopLevel = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateDerivedOverride = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clampNumberString = (value, min, max, fallback = "0") => {
    const raw = String(value ?? "").trim();
    if (raw === "") return fallback;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return fallback;
    return String(Math.max(min, Math.min(max, parsed)));
  };

 const updateSpecial = (key, value) =>
    setForm((prev) => {
      const currentOrigin = prev.origin && ORIGINS[prev.origin] ? ORIGINS[prev.origin] : null;
      const limits = currentOrigin?.specialLimits || { min: 1, max: 10 };
      const minAllowed = limits.min !== undefined ? limits.min : 1;
      const maxAllowed = limits[key] !== undefined ? limits[key] : (limits.max !== undefined ? limits.max : 10);

      return {
        ...prev,
        special: {
          ...prev.special,
          [key]: clampNumberString(value, minAllowed, maxAllowed),
        },
      };
    });

const updateSkill = (skillName, field, value) =>
    setForm((prev) => {
      const currentOrigin = prev.origin && ORIGINS[prev.origin] ? ORIGINS[prev.origin] : null;
      const maxRank = currentOrigin?.skillRankLimit !== undefined ? currentOrigin.skillRankLimit : 6;

      return {
        ...prev,
        skills: {
          ...prev.skills,
          [skillName]: {
            ...prev.skills[skillName],
            [field]: field === "rank" ? clampNumberString(value, 0, maxRank) : value,
          },
        },
      };
    });

  const updateStatus = (status, checked) =>
    setForm((prev) => ({
      ...prev,
      statuses: { ...prev.statuses, [status]: checked },
    }));

  const updateInjury = (partKey) =>
    setForm((prev) => {
      const current = prev.injuries?.[partKey] || "normal";
      const nextState =
        current === "normal"
          ? "crippled"
          : current === "crippled"
          ? "treated"
          : "normal";

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

  const addWeapon = () => {
    setForm((prev) => ({
      ...prev,
      weapons: [...prev.weapons, createEmptyWeapon()],
    }));
    setEditingWeaponIndex(form.weapons.length);
    setWeaponDraft(createEmptyWeapon());
  };

  const startEditWeapon = (index) => {
    setEditingWeaponIndex(index);
    setWeaponDraft(hydrateWeaponMetadata(form.weapons[index], globalWeapons));
  };

  const saveEditWeapon = (index) => {
    setForm((prev) => {
      const next = [...prev.weapons];
      next[index] = {
        ...weaponDraft,
        damage: normalizeNonNegative(weaponDraft.damage) || "",
        rate: normalizeNonNegative(weaponDraft.rate) || "",
        cost: normalizeNonNegative(weaponDraft.cost) || "",
        weight: normalizeWeightValue(weaponDraft.weight) || "",
        rarity: normalizeNonNegative(weaponDraft.rarity) || "",
      };
      return { ...prev, weapons: next };
    });
    setEditingWeaponIndex(null);
    setWeaponDraft(createEmptyWeapon());
  };

  const copyWeapon = (index) =>
    setForm((prev) => {
      const next = [...prev.weapons];
      const sourceWeapon = hydrateWeaponMetadata(prev.weapons[index], globalWeapons);
      next.splice(index + 1, 0, {
        ...sourceWeapon,
        name: `${sourceWeapon.name || "Weapon"} Copy`,
      });
      return { ...prev, weapons: next };
    });

  const removeWeapon = (index) =>
    setForm((prev) => ({
      ...prev,
      weapons: prev.weapons.filter((_, i) => i !== index),
    }));

  const addItem = (category) => {
    setForm((prev) => ({
      ...prev,
      inventoryItems: [...prev.inventoryItems, createEmptyItem(category)],
    }));
    setEditingItemIndex(form.inventoryItems.length);
    setItemDraft(createEmptyItem(category));
  };

  const startEditItem = (index) => {
    setEditingItemIndex(index);
    setItemDraft({ ...form.inventoryItems[index] });
  };

  const saveEditItem = (index) => {
    setForm((prev) => {
      const next = [...prev.inventoryItems];
      next[index] = {
        ...itemDraft,
        quantity: normalizeNonNegative(itemDraft.quantity) || "0",
        cost: normalizeNonNegative(itemDraft.cost) || "",
        weight: normalizeWeightValue(itemDraft.weight) || "",
      };
      return { ...prev, inventoryItems: next };
    });
    setEditingItemIndex(null);
    setItemDraft(createEmptyItem());
  };

  const copyItem = (index) =>
    setForm((prev) => {
      const next = [...prev.inventoryItems];
      next.splice(index + 1, 0, {
        ...prev.inventoryItems[index],
        name: `${prev.inventoryItems[index].name || "Item"} Copy`,
      });
      return { ...prev, inventoryItems: next };
    });

  const removeItem = (index) =>
    setForm((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.filter((_, i) => i !== index),
    }));

  const addPerk = () => {
    setForm((prev) => ({
      ...prev,
      perksAndTraits: [...prev.perksAndTraits, createEmptyPerk()],
    }));
    setEditingPerkIndex(form.perksAndTraits.length);
    setPerkDraft(createEmptyPerk());
  };

  const startEditPerk = (index) => {
    setEditingPerkIndex(index);
    setPerkDraft({ ...form.perksAndTraits[index] });
  };

  const saveEditPerk = (index) => {
    setForm((prev) => {
      const next = [...prev.perksAndTraits];
      next[index] = {
        ...perkDraft,
        rank: normalizeNonNegative(perkDraft.rank) || "1",
      };
      return { ...prev, perksAndTraits: next };
    });
    setEditingPerkIndex(null);
    setPerkDraft(createEmptyPerk());
  };

  const copyPerk = (index) =>
    setForm((prev) => {
      const next = [...prev.perksAndTraits];
      next.splice(index + 1, 0, {
        ...prev.perksAndTraits[index],
        name: `${prev.perksAndTraits[index].name || "Perk"} Copy`,
      });
      return { ...prev, perksAndTraits: next };
    });

  const removePerk = (index) =>
    setForm((prev) => ({
      ...prev,
      perksAndTraits: prev.perksAndTraits.filter((_, i) => i !== index),
    }));

  const handleImport = (event) => {
    importJson(event, buildDefaultForm);
    setScreen("sheet");
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleNewCharacter = () => {
    resetToNewCharacter(buildDefaultForm);
    setScreen("sheet");
    setActiveTab("status");
  };

  const handleContinue = () => {
    continueLastCharacter(buildDefaultForm);
    setScreen("sheet");
    setActiveTab("status");
  };

  const requestReturnToMenu = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedPrompt(true);
      return;
    }
    setSideMenuOpen(false);
    setScreen("menu");
  };

  const saveAndReturnToMenu = () => {
    exportJson();
    setShowUnsavedPrompt(false);
    setSideMenuOpen(false);
    setScreen("menu");
  };

  const confirmReturnWithoutSaving = () => {
    setShowUnsavedPrompt(false);
    setSideMenuOpen(false);
    setScreen("menu");
  };

  let content = null;

  if (screen === "menu") {
    content = (
      <MenuScreen
        hasCharacter={!!lastRecordMeta}
        saveMeta={lastRecordMeta}
        onNewCharacter={handleNewCharacter}
        onContinue={handleContinue}
        onImportClick={handleImportClick}
        onOpenSession={() => setScreen("session")}
      />
    );
  } else if (screen === "session") {
    content = (
      <SessionScreen
        form={form}
        session={sharedSession}
        onBack={() => setScreen("menu")}
        onOpenSheet={() => {
          setScreen("sheet");
          setActiveTab("status");
        }}
      />
    );
  } else {
    switch (activeTab) {
      case "status":
        content = (
          <StatusScreen
            form={form}
            armor={form.armor}
            currentLuckPoints={currentLuckPoints}
            onSpendLuck={onSpendLuck}
            derived={derived}
            portraitPreview={portrait.portraitPreview}
            onPickPortrait={portrait.openFileDialog}
            onRemovePortrait={portrait.clearPortrait}
            onTopLevelChange={updateTopLevel}
            onChangeOrigin={changeOrigin}
            onStatusToggle={(status) => {
              if (status === "invisible" && form.stealthBoyState?.active) {
                endStealthBoy();
                return;
              }
              updateStatus(status, !form.statuses[status]);
            }}
            onStealthBoyAdvance={advanceStealthBoyTurn}
            onStealthBoyEnd={endStealthBoy}
            onInjuryToggle={updateInjury}
            onArmorChange={updateArmor}
            hpMax={baseMaxHp}
            hpCurrent={currentHpValue}
            radiationHp={radiationHp}
            onHpSliderChange={handleHpSliderChange}
            onRadiationSliderChange={handleRadiationSliderChange}
            onHpDecrease={handleHpDecrease}
            onHpIncrease={handleHpIncrease}
            onOpenConditions={() => setShowConditions(true)}
            onOpenDerived={() => setShowDerived(true)}
            onRoll={openContextDiceRoll}
          />
        );
        break;

      case "special":
        content = (
          <SpecialScreen
            form={form}
            derived={derived}
            currentLuckPoints={currentLuckPoints}
            onSpecialChange={updateSpecial}
            onSkillChange={updateSkill}
            onDerivedChange={updateDerivedOverride}
            onCurrentLuckChange={setCurrentLuckPoints}
            onOpenSkillsEditor={() => setShowSkillsEditor(true)}
            onRoll={openContextDiceRoll}
          />
        );
        break;

      case "weapons":
        content = (
          <WeaponsScreen
            weapons={form.weapons}
            editingIndex={editingWeaponIndex}
            weaponDraft={weaponDraft}
            setWeaponDraft={setWeaponDraft}
            onAdd={addWeapon}
            onEdit={startEditWeapon}
            onCopy={copyWeapon}
            onRemove={removeWeapon}
            onSaveEdit={saveEditWeapon}
            onCancelEdit={() => setEditingWeaponIndex(null)}
            onRoll={openContextDiceRoll}
            form={form}
            globalWeapons={globalWeapons}
            combatState={combatState}
            combatApMax={combatApMax}
            currentLuckPoints={currentLuckPoints}
            luckMax={derived.luckPoints || 0}
            onSetCombatAp={setCombatAp}
            onStartCombat={startCombat}
            onEndCombat={endCombat}
            onNextCombatTurn={nextCombatTurn}
            onSpendCombatAp={spendCombatAp}
          />
        );
        break;

      case "inventory":
        content = (
          <InventoryScreen
            items={form.inventoryItems}
            editingIndex={editingItemIndex}
            itemDraft={itemDraft}
            setItemDraft={setItemDraft}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            carryWeight={derived.carryWeight}
            currentCarryWeight={derived.currentCarryWeight}
            caps={form.caps}
            onCapsChange={(value) => updateTopLevel("caps", value)}
            onAdd={addItem}
            onEdit={startEditItem}
            onCopy={copyItem}
            onRemove={removeItem}
            onSaveEdit={saveEditItem}
            onCancelEdit={() => setEditingItemIndex(null)}
            globalAmmo={globalAmmo}
          />
        );
        break;

      case "armor":
        content = (
          <ArmorScreen
            armor={form.armor}
            inventoryItems={form.inventoryItems}
            onArmorChange={updateArmor}
            derived={derived}
          />
        );
        break;

      case "perks":
        content = (
          <PerksScreen
            perks={form.perksAndTraits}
            editingIndex={editingPerkIndex}
            perkDraft={perkDraft}
            setPerkDraft={setPerkDraft}
            onAdd={addPerk}
            onEdit={startEditPerk}
            onCopy={copyPerk}
            onRemove={removePerk}
            onSaveEdit={saveEditPerk}
            onCancelEdit={() => setEditingPerkIndex(null)}
            form={form} 
          />
        );
        break;

      case "map":
        content = (
          <MapScreen
            mapState={mapState}
            onMapChange={updateMapData}
            character={form}
            weaponDatabase={globalWeapons}
          />
        );
        break;

      case "notes":
        content = <NotesScreen form={form} onTopLevelChange={updateTopLevel} />;
        break;

      case "games":
        content = <GamesScreen />;
        break;

      default:
      content = (
          <DataScreen
            saveStatus={saveStatus}
            loadStatus={loadStatus}
            onExport={exportJson}
            onImportClick={handleImportClick}
            importInputRef={importInputRef}
            database={{ weapons: globalWeapons, ammo: globalAmmo }}
          />
        );
    }
  }

  const DerivedModal = () => {
    if (!showDerived) return null;

    return (
      <div className="pip-modal-overlay">
        <div className="pip-modal pip-derived-modal">
          <div className="pip-head">
            <h2>[ {t("derived.title")} ]</h2>
            <button
              type="button"
              className="pip-btn"
              onClick={() => setShowDerived(false)}
            >
              ✕
            </button>
          </div>

          <div className="pip-derived-modal-list">
            <div className="pip-derived-row">
              <span>{t("derived.defense")}</span>
              <input
                className="pip-inline-input"
                value={form.defenseOverride || ""}
                placeholder={String(derived.defense)}
                onChange={(e) =>
                  updateDerivedOverride("defenseOverride", e.target.value)
                }
              />
            </div>

            <div className="pip-derived-row">
              <span>{t("derived.initiative")}</span>
              <input
                className="pip-inline-input"
                value={form.initiativeOverride || ""}
                placeholder={String(derived.initiative)}
                onChange={(e) =>
                  updateDerivedOverride("initiativeOverride", e.target.value)
                }
              />
            </div>

            <div className="pip-derived-row">
              <span>{t("derived.meleeDr")}</span>
              <input
                className="pip-inline-input"
                value={form.mdOverride || ""}
                placeholder={String(derived.md)}
                onChange={(e) =>
                  updateDerivedOverride("mdOverride", e.target.value)
                }
              />
            </div>

            <div className="pip-derived-row">
              <span>{t("derived.luckPoints")}</span>
              <div className="pip-derived-luck-fields">
                <input
                  className="pip-inline-input"
                  value={currentLuckPoints}
                  onChange={(e) =>
                    setCurrentLuckPoints(Math.max(0, Number(e.target.value || 0)))
                  }
                />
                <span>/</span>
                <input
                  className="pip-inline-input"
                  value={form.luckPointsOverride || ""}
                  placeholder={String(derived.luckPoints)}
                  onChange={(e) =>
                    updateDerivedOverride("luckPointsOverride", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="pip-derived-row">
              <span>{t("derived.maxHp")}</span>
              <input
                className="pip-inline-input"
                value={form.maxHpOverride || ""}
                placeholder={String(derived.maxHp)}
                onChange={(e) =>
                  updateDerivedOverride("maxHpOverride", e.target.value)
                }
              />
            </div>

            <div className="pip-derived-row">
              <span>{t("derived.carryWeight")}</span>
              <input
                className="pip-inline-input"
                value={form.carryWeightOverride || ""}
                placeholder={String(derived.carryWeight)}
                onChange={(e) =>
                  updateDerivedOverride("carryWeightOverride", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

const SkillsEditorModal = () => {
    if (!showSkillsEditor) return null;

    const currentOrigin = form.origin && ORIGINS[form.origin] ? ORIGINS[form.origin] : null;
    let totalTagsAllowed = currentOrigin ? (currentOrigin.tagSkillCount || 3) : 3;
    
    if (form.originTraits?.includes("educated")) {
      totalTagsAllowed += 1;
    }

    const requiredRestricted = currentOrigin ? (currentOrigin.restrictedTagCount || 0) : 0;
    const maxFreeTags = Math.max(0, totalTagsAllowed - requiredRestricted);
    const restrictedList = currentOrigin ? (currentOrigin.restrictedTagList || []) : [];

    let taggedFree = 0;
    let totalSelected = 0;

    Object.keys(form.skills || {}).forEach((skillName) => {
      if (form.skills[skillName]?.tagged) {
        totalSelected++;
        if (!restrictedList.includes(skillName)) {
          taggedFree++;
        }
      }
    });

    return (
      <div className="pip-modal-overlay">
        <div className="pip-modal pip-skills-editor-modal">
          <div className="pip-head">
            <h2>[ {t("skillsEditor.title")} ]</h2>
            <button
              type="button"
              className="pip-btn"
              onClick={() => setShowSkillsEditor(false)}
            >
              ✕
            </button>
          </div>

          <div className="pip-logbox" style={{ marginBottom: "10px", fontSize: "0.8em" }}>
             <div>Tag Skills: {totalSelected} / {totalTagsAllowed}</div>
             {requiredRestricted > 0 && (
               <div style={{ color: 'var(--pip-color-alert, #ffcc00)', marginTop: '4px' }}>
                 * At least {requiredRestricted} must be from the marked list
               </div>
             )}
          </div>

          <div className="pip-skills-editor-list">
            {Object.keys(form.skills || {}).map((skillName) => {
              const skill = form.skills?.[skillName] || {
                rank: "0",
                attribute: "A",
                tagged: false,
                bonus: "0",
              };

              const attrValue = Number(form.special?.[skill.attribute || "A"] || 0);
              const testValue =
                Number(skill.rank || 0) +
                attrValue +
                (skill.tagged ? 2 : 0) +
                Number(skill.bonus || 0);

              const isInRestrictedList = restrictedList.includes(skillName);
              
              let isTagDisabled = false;
              let disableReason = "";

              if (!skill.tagged) {
                if (totalSelected >= totalTagsAllowed) {
                  isTagDisabled = true;
                  disableReason = "Max Tag Skills reached";
                } else if (!isInRestrictedList && taggedFree >= maxFreeTags) {
                  isTagDisabled = true;
                  disableReason = requiredRestricted > 0 
                    ? `You must pick at least ${requiredRestricted} from the restricted list (*)` 
                    : "Max skills reached";
                }
              }

              return (
                <div key={skillName} className="pip-skill-editor-row" style={{ opacity: isTagDisabled && !skill.tagged ? 0.4 : 1 }}>
                  <div className="pip-skill-editor-name">
                    {t(SKILL_LABEL_KEYS?.[skillName] || skillName)}
                    {isInRestrictedList && requiredRestricted > 0 && (
                      <span style={{color: 'var(--pip-color-alert, #ffcc00)', marginLeft: '5px'}} title="Restricted List">*</span>
                    )}
                  </div>

                  <div className="pip-skill-editor-fields">
                    <div className="pip-skill-field">
                      <label>{t("skillsEditor.rank")}</label>
                      <input
                        className="pip-inline-input"
                        value={skill.rank || ""}
                        onChange={(e) =>
                          updateSkill(skillName, "rank", e.target.value)
                        }
                      />
                    </div>

                    <div className="pip-skill-field">
                      <label>{t("skills.attr")}</label>
                      <select
                        className="pip-inline-input"
                        value={skill.attribute || "A"}
                        onChange={(e) =>
                          updateSkill(skillName, "attribute", e.target.value)
                        }
                      >
                        {["S", "P", "E", "C", "I", "A", "L"].map((attr) => (
                          <option key={attr} value={attr}>
                            {attr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pip-skill-field">
                      <label>{t("skillsEditor.tag")}</label>
                      <button
                        type="button"
                        className={`pip-skill-tag-btn ${
                          skill.tagged ? "is-on" : ""
                        }`}
                        disabled={isTagDisabled}
                        title={disableReason}
                        onClick={() =>
                          updateSkill(skillName, "tagged", !skill.tagged)
                        }
                      >
                        +2
                      </button>
                    </div>

                    <div className="pip-skill-field">
                      <label>{t("skillsEditor.bonus")}</label>
                      <input
                        className="pip-inline-input"
                        value={skill.bonus || ""}
                        onChange={(e) =>
                          updateSkill(skillName, "bonus", e.target.value)
                        }
                      />
                    </div>

                    <div className="pip-skill-field pip-skill-field-test">
                      <label>{t("skills.test")}</label>
                      <div className="pip-skill-test-value">{testValue}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const ConditionsModal = () => {
    if (!showConditions) return null;

    const immunities = derived?.immunities || [];

    return (
      <div className="pip-modal-overlay">
        <div className="pip-modal">
          <div className="pip-head">
            <h2>[ {t("conditions.title")} ]</h2>
            <button
              type="button"
              className="pip-btn"
              onClick={() => setShowConditions(false)}
            >
              ✕
            </button>
          </div>

          {immunities.length > 0 && (
            <div className="pip-logbox" style={{ marginBottom: "15px" }}>
              <div style={{ opacity: 0.8, marginBottom: "8px", textTransform: "uppercase" }}>
                [ Immunities ]
              </div>
              
              {immunities.includes("radiation") && (
                <div style={{ color: 'var(--pip-color-positive, #14ff00)', marginBottom: '6px' }}>
                  <strong>☢ RADIATION IMMUNE</strong>
                  <div style={{ fontSize: '0.85em', opacity: 0.9, marginTop: '2px' }}>
                    You are completely immune to radiation damage and hazards.
                  </div>
                </div>
              )}
              
              {immunities.includes("poison") && (
                <div style={{ color: 'var(--pip-color-positive, #14ff00)' }}>
                  <strong>☠ POISON IMMUNE</strong>
                  <div style={{ fontSize: '0.85em', opacity: 0.9, marginTop: '2px' }}>
                    You are completely immune to poison damage and toxic effects.
                  </div>
                </div>
              )}
            </div>
          )}

          <StatusBadgeList
            statuses={form.statuses}
            onToggle={(status) => updateStatus(status, !form.statuses[status])}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={handleImport}
      />

      {(screen === "menu" || screen === "session") ? (
        <div className="pip-app">
          <div className="pip-vignette" />
          <div className="pip-container">
            <main className="pip-main">
              {content}
              {screen === "menu" && (
                <div className="pip-actions-inline push-top">
                  <PwaInstallButton />
                </div>
              )}
            </main>
          </div>
        </div>
      ) : (
        <PipboyShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onToggleMenu={() => setSideMenuOpen(true)}
          character={form}
          setCharacter={setForm}
          onRoll={openContextDiceRoll}
        >
          {content}
          <SideMenu
            open={sideMenuOpen}
            onClose={() => setSideMenuOpen(false)}
            onExport={exportJson}
            onImportClick={handleImportClick}
            onReturnToMenu={requestReturnToMenu}
          />
        </PipboyShell>
      )}

      <PortraitCropModal
        open={portrait.cropModalOpen}
        src={portrait.cropSource}
        crop={portrait.crop}
        zoom={portrait.zoom}
        onCropChange={portrait.setCrop}
        onZoomChange={portrait.setZoom}
        onCropComplete={portrait.setCroppedAreaPixels}
        onCancel={() => portrait.setCropModalOpen(false)}
        onApply={portrait.applyCroppedPortrait}
      />

      <UnsavedChangesModal
        open={showUnsavedPrompt}
        onSaveAndLeave={saveAndReturnToMenu}
        onLeaveWithoutSaving={confirmReturnWithoutSaving}
        onCancel={() => setShowUnsavedPrompt(false)}
      />

      <ConditionsModal />
      <DerivedModal />
      <SkillsEditorModal />

      {screen === "sheet" && !isDiceOpen && (
        <FloatingDiceButton onOpen={openFreeDiceRoll} />
      )}

      {screen === "sheet" && sharedSession.isActive && sharedSession.mode === "player" && (
        <SessionChatDrawer session={sharedSession} />
      )}

      <DiceRollModal
        isOpen={isDiceOpen}
        onClose={closeDiceRoll}
        rollConfig={diceRoll}
        form={form}
        pendingAutoD6={pendingAutoD6}
        setPendingAutoD6={setPendingAutoD6}
        combatState={combatState}
        currentLuckPoints={currentLuckPoints}
        onSpendCombatLuck={spendCombatLuck}
        onMarkCombatUse={markCombatUse}
        onDiceResult={sharedSession.sendDiceResult}
      />

      <input
        ref={portrait.inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={portrait.handleInputChange}
      />
    </>
  );
}
