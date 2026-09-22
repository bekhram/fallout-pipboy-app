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
import DiceRollModal from "./components/dice/DiceRollModal";
import MapScreen from "./components/map/MapScreen.jsx";
import GamesScreen from "./components/minigames/GamesScreen.jsx";

import "./styles/pipboy.css";
import "./components/dice/dice.css";
import { parseCSV } from "./utils/csvParser.js"; 

import {
  buildDefaultForm,
  buildDefaultMapState,
  SKILL_LABEL_KEYS,
} from "./constants.js";
import { useCharacterStorage } from "./hooks/useCharacterStorage.js";
import { usePortraitCropper } from "./hooks/usePortraitCropper.js";
import { useInventoryItemController } from "./hooks/useInventoryItemController.js";
import { useCombatController } from "./hooks/useCombatController.js";
import { useCharacterStatusController } from "./hooks/useCharacterStatusController.js";
import { useCharacterCollectionsController } from "./hooks/useCharacterCollectionsController.js";
import { useCharacterRulesController } from "./hooks/useCharacterRulesController.js";
import { useUiNavigationController } from "./hooks/useUiNavigationController.js";
import { getDerivedStats } from "./utils/characterMath.js";
import StatusBadgeList from "./components/status/StatusBadgeList.jsx";
import { useTranslation } from "react-i18next";
import { needsWeaponMetadataHydration, hydrateWeaponMetadata } from "./utils/weaponDatabase.js";

export default function App() {
  const [pendingAutoD6, setPendingAutoD6] = useState(null);
  const { t, i18n } = useTranslation();
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

    spendAmmoForWeaponRoll(rollConfig);
  };

  const closeDiceRoll = () => {
    setIsDiceOpen(false);
    setDiceRoll(null);
  };

  const [activeCategory, setActiveCategory] = useState("all");
  const importInputRef = useRef(null);
  const [showConditions, setShowConditions] = useState(false);
  const [showDerived, setShowDerived] = useState(false);
  const [showSkillsEditor, setShowSkillsEditor] = useState(false);

  const {
    form,
    setForm,
    saveStatus,
    localSaveState,
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

  const {
    screen,
    setScreen,
    activeTab,
    setActiveTab,
    sessionLobbyOpen,
    setSessionLobbyOpen,
    menuSection,
    setMenuSection,
    sideMenuOpen,
    setSideMenuOpen,
    showUnsavedPrompt,
    setShowUnsavedPrompt,
  } = useUiNavigationController({ sharedSession });


  const {
    updateTopLevel,
    updateDerivedOverride,
    updateSpecial,
    updateSkill,
  } = useCharacterRulesController({ setForm });


  const {
    editingWeaponIndex,
    setEditingWeaponIndex,
    weaponDraft,
    setWeaponDraft,
    addWeapon,
    startEditWeapon,
    saveEditWeapon,
    copyWeapon,
    removeWeapon,
    editingItemIndex,
    setEditingItemIndex,
    itemDraft,
    setItemDraft,
    addItem,
    startEditItem,
    saveEditItem,
    copyItem,
    removeItem,
    editingPerkIndex,
    setEditingPerkIndex,
    perkDraft,
    setPerkDraft,
    addPerk,
    startEditPerk,
    saveEditPerk,
    copyPerk,
    removePerk,
  } = useCharacterCollectionsController({
    form,
    setForm,
    globalWeapons,
  });


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

  // Luck SPECIAL and spendable Luck Points are intentionally separate.
  // Spending a Luck Point never changes form.special.L.
  const luckPointsMax = Math.max(0, Number(derived.luckPoints || 0));
  const storedLuckPoints = form.currentLuckPoints;
  const currentLuckPoints =
    storedLuckPoints === "" || storedLuckPoints === undefined || storedLuckPoints === null
      ? luckPointsMax
      : Math.max(0, Math.min(luckPointsMax, Number(storedLuckPoints) || 0));

  const setCurrentLuckPoints = (valueOrUpdater) => {
    setForm((prev) => {
      const prevMax = Math.max(0, Number(getDerivedStats(prev).luckPoints || 0));
      const prevStored = prev.currentLuckPoints;
      const prevCurrent =
        prevStored === "" || prevStored === undefined || prevStored === null
          ? prevMax
          : Math.max(0, Math.min(prevMax, Number(prevStored) || 0));
      const requested =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(prevCurrent)
          : valueOrUpdater;
      const next = Math.max(0, Math.min(prevMax, Number(requested) || 0));
      return { ...prev, currentLuckPoints: String(next) };
    });
  };

  const onSpendLuck = () => {
    setCurrentLuckPoints((prev) => Math.max(0, prev - 1));
  };

  const {
    availableStimpaks,
    treatableInjuries,
    useQuickStimpak,
    endStealthBoy,
    advanceStealthBoyTurn,
    spendAmmoForWeaponRoll,
  } = useInventoryItemController({
    form,
    setForm,
    i18n,
    t,
  });
  const combatApMax = Math.max(0, Number(derived.groupApMax || 6));
  const {
    combatState,
    setCombatAp,
    startCombat,
    endCombat,
    nextCombatTurn,
    spendCombatAp,
    spendCombatLuck,
    markCombatUse,
  } = useCombatController({
    combatApMax,
    currentLuckPoints,
    setCurrentLuckPoints,
  });

  const {
    baseMaxHp,
    radiationHp,
    currentHpValue,
    handleHpSliderChange,
    handleRadiationSliderChange,
    handleHpDecrease,
    handleHpIncrease,
    updateInjury,
    updateArmor,
    cycleBodyArmorState,
  } = useCharacterStatusController({
    form,
    setForm,
    derived,
  });

  const lastRecordMeta = useMemo(
    () => loadLastCharacterMeta(),
    [loadStatus, saveStatus, screen]
  );

  const updateStatus = (status, checked) =>
    setForm((prev) => ({
      ...prev,
      statuses: { ...prev.statuses, [status]: checked },
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
        initialSection={menuSection}
        hasCharacter={!!lastRecordMeta}
        saveMeta={lastRecordMeta}
        onNewCharacter={handleNewCharacter}
        onContinue={handleContinue}
        onImportClick={handleImportClick}
        onOpenSession={(intent) => {
          setSessionLobbyOpen(true);
          setScreen("session");
          if (typeof intent === "string") requestAnimationFrame(() => {
            const card = document.querySelector(intent === "host" ? ".session-role-card--gm" : ".session-role-card:not(.session-role-card--gm)");
            card?.scrollIntoView({block:"center"});
            card?.querySelector("input, button")?.focus({preventScroll:true});
          });
        }}
        lastSession={sharedSession.lastSession}
        session={sharedSession}
        onResumeSession={() => {
          setSessionLobbyOpen(false);
          setScreen("session");
          if (sharedSession.isActive) {
            if (sharedSession.status !== "online") void sharedSession.reconnectNow?.();
            return;
          }
          void sharedSession.resumeLastSession?.();
        }}
      />
    );
  } else if (screen === "session") {
    content = (
      <SessionScreen
        showLobby={sessionLobbyOpen}
        onShowLobby={() => setSessionLobbyOpen(true)}
        onEnterSession={() => setSessionLobbyOpen(false)}
        form={form}
        session={sharedSession}
        onBack={() => {setMenuSection("home");setScreen("menu");}}
        onNavigateMenu={section => {setMenuSection(section);setScreen("menu");}}
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
            onArmorStatusCycle={cycleBodyArmorState}
            hpMax={baseMaxHp}
            hpCurrent={currentHpValue}
            radiationHp={radiationHp}
            onHpSliderChange={handleHpSliderChange}
            onRadiationSliderChange={handleRadiationSliderChange}
            onHpDecrease={handleHpDecrease}
            onHpIncrease={handleHpIncrease}
            onOpenConditions={() => setShowConditions(true)}
            onOpenDerived={() => setShowDerived(true)}
            stimpaks={availableStimpaks}
            treatableInjuries={treatableInjuries}
            onUseStimpak={useQuickStimpak}
            onRoll={openContextDiceRoll}
          />
        );
        break;

      case "skills":
      case "special":
        content = (
          <SpecialScreen
            section={activeTab}
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
        <div className={`pip-app ${(screen === "menu" || (screen === "session" && (sessionLobbyOpen || !sharedSession.mode || sharedSession.mode === "lobby"))) ? "pip-home-v2" : ""}`}>
          <div className="pip-vignette" />
          <div className="pip-container">
            <main className="pip-main">
              {content}

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
          onOpenDice={openFreeDiceRoll}
          onOpenChat={() => {
            const toggle = document.querySelector(".session-utility-drawer-toggle");
            if (toggle?.getAttribute("aria-expanded") !== "true") toggle?.click();
          }}
          onOpenMap={() => {
            if (sharedSession.isActive && (sharedSession.tacticalScene || sharedSession.liveSceneId)) {
              document.dispatchEvent(new CustomEvent("pip2d20:open-battlemap"));
            } else setActiveTab("map");
          }}
          chatAvailable={sharedSession.isActive && sharedSession.mode === "player"}
          localSaveState={localSaveState}
          profileProps={{ form, portraitPreview: portrait.portraitPreview, onPickPortrait: portrait.openFileDialog, onRemovePortrait: portrait.clearPortrait, onTopLevelChange: updateTopLevel, onChangeOrigin: changeOrigin }}
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
        campaignId={sharedSession.campaignId || sharedSession.roomState?.campaignId || sharedSession.lastSession?.campaignId || ""}
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
