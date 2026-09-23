import React, { useEffect, useMemo, useRef, useState } from "react";
import PipboyShell from "./components/layout/PipboyShell.jsx";
import AppScreenRouter from "./components/AppScreenRouter.jsx";
import SessionChatDrawer from "./components/session/SessionChatDrawer.jsx";
import useSharedSession from "./hooks/useSharedSession.js";
import SideMenu from "./components/shared/SideMenu.jsx";
import UnsavedChangesModal from "./components/shared/UnsavedChangesModal.jsx";
import PortraitCropModal from "./components/portrait/PortraitCropModal.jsx";
import DiceRollModal from "./components/dice/DiceRollModal";

import "./styles/pipboy.css";
import "./components/dice/dice.css";

import {
  buildDefaultForm,
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
import { useGlobalGameDatabase } from "./hooks/useGlobalGameDatabase.js";
import { useCharacterMapController } from "./hooks/useCharacterMapController.js";
import { useDiceController } from "./hooks/useDiceController.js";
import { getDerivedStats } from "./utils/characterMath.js";
import StatusBadgeList from "./components/status/StatusBadgeList.jsx";
import { useTranslation } from "react-i18next";

export default function App() {
  const { t, i18n } = useTranslation();

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

  const { globalWeapons, globalAmmo } = useGlobalGameDatabase({ setForm });
  const { mapState, updateMapData } = useCharacterMapController({ form, setForm });

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
  const {
    pendingAutoD6,
    setPendingAutoD6,
    isDiceOpen,
    diceRoll,
    openFreeDiceRoll,
    openContextDiceRoll,
    closeDiceRoll,
  } = useDiceController({ spendAmmoForWeaponRoll });

  const combatApMax = Math.max(0, Number(derived.groupApMax || 6));
  const {
    combatState,
    setCombatAp,
    startCombat,
    endCombat,
    nextCombatTurn,
    spendCombatAp,
    spendCombatLuck,
    beginLuckEscape,
    canAttemptLuckEscape,
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

  const content = (
    <AppScreenRouter
      screen={screen}
      activeTab={activeTab}
      menuSection={menuSection}
      setMenuSection={setMenuSection}
      setScreen={setScreen}
      setActiveTab={setActiveTab}
      sessionLobbyOpen={sessionLobbyOpen}
      setSessionLobbyOpen={setSessionLobbyOpen}
      lastRecordMeta={lastRecordMeta}
      handleNewCharacter={handleNewCharacter}
      handleContinue={handleContinue}
      handleImportClick={handleImportClick}
      sharedSession={sharedSession}
      form={form}
      setForm={setForm}
      currentLuckPoints={currentLuckPoints}
      onSpendLuck={onSpendLuck}
      derived={derived}
      portrait={portrait}
      updateTopLevel={updateTopLevel}
      changeOrigin={changeOrigin}
      endStealthBoy={endStealthBoy}
      updateStatus={updateStatus}
      advanceStealthBoyTurn={advanceStealthBoyTurn}
      updateInjury={updateInjury}
      updateArmor={updateArmor}
      cycleBodyArmorState={cycleBodyArmorState}
      baseMaxHp={baseMaxHp}
      currentHpValue={currentHpValue}
      radiationHp={radiationHp}
      handleHpSliderChange={handleHpSliderChange}
      handleRadiationSliderChange={handleRadiationSliderChange}
      handleHpDecrease={handleHpDecrease}
      handleHpIncrease={handleHpIncrease}
      setShowConditions={setShowConditions}
      setShowDerived={setShowDerived}
      availableStimpaks={availableStimpaks}
      treatableInjuries={treatableInjuries}
      useQuickStimpak={useQuickStimpak}
      openContextDiceRoll={openContextDiceRoll}
      updateSpecial={updateSpecial}
      updateSkill={updateSkill}
      updateDerivedOverride={updateDerivedOverride}
      setCurrentLuckPoints={setCurrentLuckPoints}
      setShowSkillsEditor={setShowSkillsEditor}
      editingWeaponIndex={editingWeaponIndex}
      setEditingWeaponIndex={setEditingWeaponIndex}
      weaponDraft={weaponDraft}
      setWeaponDraft={setWeaponDraft}
      addWeapon={addWeapon}
      startEditWeapon={startEditWeapon}
      copyWeapon={copyWeapon}
      removeWeapon={removeWeapon}
      saveEditWeapon={saveEditWeapon}
      globalWeapons={globalWeapons}
      combatState={combatState}
      combatApMax={combatApMax}
      setCombatAp={setCombatAp}
      startCombat={startCombat}
      endCombat={endCombat}
      nextCombatTurn={nextCombatTurn}
      spendCombatAp={spendCombatAp}
      beginLuckEscape={beginLuckEscape}
      canAttemptLuckEscape={canAttemptLuckEscape}
      editingItemIndex={editingItemIndex}
      setEditingItemIndex={setEditingItemIndex}
      itemDraft={itemDraft}
      setItemDraft={setItemDraft}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      addItem={addItem}
      startEditItem={startEditItem}
      copyItem={copyItem}
      removeItem={removeItem}
      saveEditItem={saveEditItem}
      globalAmmo={globalAmmo}
      editingPerkIndex={editingPerkIndex}
      setEditingPerkIndex={setEditingPerkIndex}
      perkDraft={perkDraft}
      setPerkDraft={setPerkDraft}
      addPerk={addPerk}
      startEditPerk={startEditPerk}
      copyPerk={copyPerk}
      removePerk={removePerk}
      saveEditPerk={saveEditPerk}
      mapState={mapState}
      updateMapData={updateMapData}
      saveStatus={saveStatus}
      loadStatus={loadStatus}
      exportJson={exportJson}
      importInputRef={importInputRef}
    />
  );

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
        onSpendCombatAp={spendCombatAp}
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
