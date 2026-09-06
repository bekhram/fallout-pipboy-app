import React, { useEffect, useRef } from "react";
import TopNav, { PIPBOY_TABS } from "./TopNav.jsx";
import CompanionPresetHub from "../companion/CompanionPresetHub.jsx";
import BestiaryScreen from "../bestiary/BestiaryScreen.jsx";
import CraftingHub from "../crafting/CraftingHub.jsx";
import CombatTurnSequence from "../combat/CombatTurnSequence.jsx";
import GmWorkspace from "../gm/GmWorkspace.jsx";
import { installCompanionGmBridge } from "../../utils/companionGmBridge.js";
import { installLocationLoreGmBridge } from "../../utils/locationLoreGmBridge.js";
import { installBestiaryCombatGmBridge } from "../../utils/bestiaryCombatGmBridge.js";

const SWIPE_THRESHOLD = 60;
const INTERACTIVE_SELECTOR = [
  "button",
  "input",
  "select",
  "textarea",
  "a",
  "[contenteditable='true']",
  ".pip-modal-overlay",
  ".dice-modal-overlay",
  ".pip-map-screen",
  ".games-screen",
  ".bestiary-screen",
  ".crafting-screen",
  ".gm-panel",
  ".gm-toolkit",
  ".armor-repair-panel",
  ".pip-active-combat",
  ".combat-turn-sequence",
].join(",");

export default function PipboyShell({
  activeTab,
  onTabChange,
  onToggleMenu,
  character = null,
  setCharacter = null,
  onRoll = null,
  children,
}) {
  const touchStart = useRef(null);
  const previousTab = useRef(activeTab);
  const previousIndex = PIPBOY_TABS.findIndex((tab) => tab.key === previousTab.current);
  const currentIndex = PIPBOY_TABS.findIndex((tab) => tab.key === activeTab);
  const slideDirection = previousTab.current === activeTab
    ? ""
    : currentIndex > previousIndex
      ? " is-from-right"
      : " is-from-left";

  const childArray = React.Children.toArray(children);
  const characterChild = childArray.find(
    (child) => React.isValidElement(child) && child.props?.character
  );
  const resolvedCharacter = character || characterChild?.props?.character || null;
  const mapChange = characterChild?.props?.onMapChange;
  const resolvedSetCharacter = setCharacter || (
    resolvedCharacter && typeof mapChange === "function"
      ? (updater) => {
          const next = typeof updater === "function" ? updater(resolvedCharacter) : updater;
          if (!next || typeof next !== "object") return;
          Object.assign(resolvedCharacter, next);
          mapChange((prevMap) => prevMap);
        }
      : null
  );

  useEffect(() => {
    installCompanionGmBridge();
    installLocationLoreGmBridge();
    installBestiaryCombatGmBridge();
  }, []);

  useEffect(() => {
    previousTab.current = activeTab;
  }, [activeTab]);

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1 || event.target.closest?.(INTERACTIVE_SELECTOR)) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart.current || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;
    const currentIndex = PIPBOY_TABS.findIndex((tab) => tab.key === activeTab);
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextTab = PIPBOY_TABS[nextIndex];
    if (nextTab) onTabChange(nextTab.key);
  };

  let screenContent = children;
  if (activeTab === "companion") screenContent = <CompanionPresetHub onRoll={onRoll} />;
  if (activeTab === "bestiary") screenContent = <BestiaryScreen />;
  if (activeTab === "crafting") {
    screenContent = (
      <CraftingHub
        character={resolvedCharacter}
        setCharacter={resolvedSetCharacter}
      />
    );
  }
  if (activeTab === "gm") {
    screenContent = (
      <GmWorkspace
        character={resolvedCharacter}
        setCharacter={resolvedSetCharacter}
        onOpenMap={() => onTabChange("map")}
      />
    );
  }

  return (
    <div className="pip-app">
      <div className="pip-vignette" />
      <div className="pip-container">
        <TopNav activeTab={activeTab} onTabChange={onTabChange} onToggleMenu={onToggleMenu} />
        <main
          className="pip-main"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div key={activeTab} className={`pip-screen-slide${slideDirection}`}>
            {screenContent}
          </div>
          {activeTab === "map" ? (
            <CombatTurnSequence
              character={resolvedCharacter}
              setCharacter={resolvedSetCharacter}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
