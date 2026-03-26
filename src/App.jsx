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
import SideMenu from "./components/shared/SideMenu.jsx";
import UnsavedChangesModal from "./components/shared/UnsavedChangesModal.jsx";
import PortraitCropModal from "./components/portrait/PortraitCropModal.jsx";
import FloatingDiceButton from "./components/dice/FloatingDiceButton";
import DiceRollModal from "./components/dice/DiceRollModal";
import MapScreen from "./components/map/MapScreen.jsx";
import GamesScreen from "./components/minigames/GamesScreen.jsx";
import "./styles/pipboy.css";
import "./components/dice/dice.css";

import {
  buildDefaultForm,
  buildDefaultMapState,
  createEmptyItem,
  createEmptyPerk,
  createEmptyWeapon,
  SKILL_LABEL_KEYS,
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


export default function App() {
  const [pendingAutoD6, setPendingAutoD6] = useState(null);
  const { t } = useTranslation();
  const [screen, setScreen] = useState("menu");
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [diceRoll, setDiceRoll] = useState(null);
    const openFreeDiceRoll = () => {
    setDiceRoll(null);
    setIsDiceOpen(true);
  };

const openContextDiceRoll = (rollConfig) => {
  setPendingAutoD6(null); // сброс
  setDiceRoll(rollConfig);
  setIsDiceOpen(true);
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
  } = useCharacterStorage(buildDefaultForm());
  
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

  const computedDerived = getDerivedStats(form);

  const derived = {
    ...computedDerived,
    defense:
      form.defenseOverride !== ""
        ? Number(form.defenseOverride)
        : computedDerived.defense,
    initiative:
      form.initiativeOverride !== ""
        ? Number(form.initiativeOverride)
        : computedDerived.initiative,
    md:
      form.mdOverride !== ""
        ? Number(form.mdOverride)
        : computedDerived.md,
    luckPoints:
      form.luckPointsOverride !== ""
        ? Number(form.luckPointsOverride)
        : computedDerived.luckPoints,
    maxHp:
      form.maxHpOverride !== ""
        ? Number(form.maxHpOverride)
        : computedDerived.maxHp,
    carryWeight:
      form.carryWeightOverride !== ""
        ? Number(form.carryWeightOverride)
        : computedDerived.carryWeight,
  };

  const [currentLuckPoints, setCurrentLuckPoints] = useState(
    derived.luckPoints || 0
  );

  useEffect(() => {
    setCurrentLuckPoints(derived.luckPoints || 0);
  }, [derived.luckPoints]);

  const onSpendLuck = () => {
    setCurrentLuckPoints((prev) => Math.max(0, prev - 1));
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

  const updateSpecial = (key, value) =>
    setForm((prev) => ({
      ...prev,
      special: { ...prev.special, [key]: value },
    }));

  const updateSkill = (skillName, field, value) =>
    setForm((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skillName]: {
          ...prev.skills[skillName],
          [field]: value,
        },
      },
    }));

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
    setWeaponDraft({ ...form.weapons[index] });
  };

  const saveEditWeapon = (index) => {
    setForm((prev) => {
      const next = [...prev.weapons];
      next[index] = {
        ...weaponDraft,
        damage: normalizeNonNegative(weaponDraft.damage) || "",
        rate: normalizeNonNegative(weaponDraft.rate) || "",
      };
      return { ...prev, weapons: next };
    });
    setEditingWeaponIndex(null);
    setWeaponDraft(createEmptyWeapon());
  };

  const copyWeapon = (index) =>
    setForm((prev) => {
      const next = [...prev.weapons];
      next.splice(index + 1, 0, {
        ...prev.weapons[index],
        name: `${prev.weapons[index].name || "Weapon"} Copy`,
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
          onStatusToggle={(status) =>
            updateStatus(status, !form.statuses[status])
          }
          onInjuryToggle={updateInjury}
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
        />
      );
      break;

    case "armor":
      content = (
        <ArmorScreen armor={form.armor} onArmorChange={updateArmor} />
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
        />
      );
      break;
      
 case "map":
  content = (
    <MapScreen
      mapState={mapState}
      onMapChange={updateMapData}
    />
  );
  break;

    case "notes":
      content = (
        <NotesScreen form={form} onTopLevelChange={updateTopLevel} />
      );
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
                onChange={(e) => updateDerivedOverride("mdOverride", e.target.value)}
              />
            </div>

            <div className="pip-derived-row">
              <span>{t("derived.luckPoints")}</span>
              <div className="pip-derived-luck-fields">
                <input
                  className="pip-inline-input"
                  value={currentLuckPoints}
                  onChange={(e) =>
                    setCurrentLuckPoints(
                      Math.max(0, Number(e.target.value || 0))
                    )
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
                onChange={(e) => updateDerivedOverride("maxHpOverride", e.target.value)}
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

              return (
                <div key={skillName} className="pip-skill-editor-row">
                  <div className="pip-skill-editor-name">
                    {t(SKILL_LABEL_KEYS?.[skillName] || skillName)}
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

      {screen === "menu" ? (
        <div className="pip-app">
          <div className="pip-vignette" />
          <div className="pip-container">
            <main className="pip-main">{content}</main>
          </div>
        </div>
      ) : (
        <PipboyShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onToggleMenu={() => setSideMenuOpen(true)}
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

{screen !== "menu" && !isDiceOpen && (
  <FloatingDiceButton onOpen={openFreeDiceRoll} />
)}

<DiceRollModal
  isOpen={isDiceOpen}
  onClose={closeDiceRoll}
  rollConfig={diceRoll}
  form={form}
  pendingAutoD6={pendingAutoD6}
  setPendingAutoD6={setPendingAutoD6}
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