import React from "react";
import MenuScreen from "./menu/MenuScreen.jsx";
import SessionScreen from "./session/SessionScreen.jsx";
import StatusScreen from "./status/StatusScreen.jsx";
import SpecialScreen from "./special/SpecialScreen.jsx";
import WeaponsScreen from "./weapons/WeaponsScreen.jsx";
import InventoryScreen from "./inventory/InventoryScreen.jsx";
import ArmorScreen from "./armor/ArmorScreen.jsx";
import PerksScreen from "./perks/PerksScreen.jsx";
import MapScreen from "./map/MapScreen.jsx";
import NotesScreen from "./notes/NotesScreen.jsx";
import GamesScreen from "./minigames/GamesScreen.jsx";
import DataScreen from "./data/DataScreen.jsx";

export default function AppScreenRouter({
  screen,
  activeTab,
  menuSection,
  setMenuSection,
  setScreen,
  setActiveTab,
  sessionLobbyOpen,
  setSessionLobbyOpen,
  lastRecordMeta,
  handleNewCharacter,
  handleContinue,
  handleImportClick,
  sharedSession,
  form,
  currentLuckPoints,
  onSpendLuck,
  derived,
  portrait,
  updateTopLevel,
  changeOrigin,
  endStealthBoy,
  updateStatus,
  advanceStealthBoyTurn,
  updateInjury,
  updateArmor,
  cycleBodyArmorState,
  baseMaxHp,
  currentHpValue,
  radiationHp,
  handleHpSliderChange,
  handleRadiationSliderChange,
  handleHpDecrease,
  handleHpIncrease,
  setShowConditions,
  setShowDerived,
  availableStimpaks,
  treatableInjuries,
  useQuickStimpak,
  openContextDiceRoll,
  updateSpecial,
  updateSkill,
  updateDerivedOverride,
  setCurrentLuckPoints,
  setShowSkillsEditor,
  editingWeaponIndex,
  setEditingWeaponIndex,
  weaponDraft,
  setWeaponDraft,
  addWeapon,
  startEditWeapon,
  copyWeapon,
  removeWeapon,
  saveEditWeapon,
  globalWeapons,
  combatState,
  combatApMax,
  setCombatAp,
  startCombat,
  endCombat,
  nextCombatTurn,
  spendCombatAp,
  editingItemIndex,
  setEditingItemIndex,
  itemDraft,
  setItemDraft,
  activeCategory,
  setActiveCategory,
  addItem,
  startEditItem,
  copyItem,
  removeItem,
  saveEditItem,
  globalAmmo,
  editingPerkIndex,
  setEditingPerkIndex,
  perkDraft,
  setPerkDraft,
  addPerk,
  startEditPerk,
  copyPerk,
  removePerk,
  saveEditPerk,
  mapState,
  updateMapData,
  saveStatus,
  loadStatus,
  exportJson,
  importInputRef,
}) {
  if (screen === "menu") {
    return (
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
            const card = document.querySelector(
              intent === "host"
                ? ".session-role-card--gm"
                : ".session-role-card:not(.session-role-card--gm)"
            );
            card?.scrollIntoView({ block: "center" });
            card?.querySelector("input, button")?.focus({ preventScroll: true });
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
  }

  if (screen === "session") {
    return (
      <SessionScreen
        showLobby={sessionLobbyOpen}
        onShowLobby={() => setSessionLobbyOpen(true)}
        onEnterSession={() => setSessionLobbyOpen(false)}
        form={form}
        session={sharedSession}
        onBack={() => {
          setMenuSection("home");
          setScreen("menu");
        }}
        onNavigateMenu={(section) => {
          setMenuSection(section);
          setScreen("menu");
        }}
        onOpenSheet={() => {
          setScreen("sheet");
          setActiveTab("status");
        }}
      />
    );
  }

  switch (activeTab) {
    case "status":
      return (
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

    case "skills":
    case "special":
      return (
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

    case "weapons":
      return (
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

    case "inventory":
      return (
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

    case "armor":
      return (
        <ArmorScreen
          armor={form.armor}
          inventoryItems={form.inventoryItems}
          onArmorChange={updateArmor}
          derived={derived}
        />
      );

    case "perks":
      return (
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

    case "map":
      return (
        <MapScreen
          mapState={mapState}
          onMapChange={updateMapData}
          character={form}
          weaponDatabase={globalWeapons}
        />
      );

    case "notes":
      return <NotesScreen form={form} onTopLevelChange={updateTopLevel} />;

    case "games":
      return <GamesScreen />;

    default:
      return (
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
