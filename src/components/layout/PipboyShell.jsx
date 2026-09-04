import React, { useEffect, useRef } from "react";
import TopNav, { PIPBOY_TABS } from "./TopNav.jsx";
import CompanionTab from "../companion/CompanionTab.jsx";
import { installCompanionGmBridge } from "../../utils/companionGmBridge.js";

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
].join(",");

export default function PipboyShell({ activeTab, onTabChange, onToggleMenu, children }) {
  const touchStart = useRef(null);
  const previousTab = useRef(activeTab);
  const previousIndex = PIPBOY_TABS.findIndex((tab) => tab.key === previousTab.current);
  const currentIndex = PIPBOY_TABS.findIndex((tab) => tab.key === activeTab);
  const slideDirection = previousTab.current === activeTab
    ? ""
    : currentIndex > previousIndex
      ? " is-from-right"
      : " is-from-left";

  useEffect(() => {
    installCompanionGmBridge();
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
            {activeTab === "companion" ? <CompanionTab /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
