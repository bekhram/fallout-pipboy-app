import { useEffect, useRef, useState } from "react";
import { readLastUiState, writeLastUiState } from "../utils/uiViewState.js";

export function useUiNavigationController({ sharedSession }) {
  const startupUiStateRef = useRef(null);
  if (startupUiStateRef.current === null) {
    startupUiStateRef.current = readLastUiState();
  }
  const startupUiState = startupUiStateRef.current;

  const [screen, setScreen] = useState(() => (
    startupUiState.view === "battlemap" ? "sheet" : startupUiState.screen
  ));
  const [activeTab, setActiveTab] = useState(() => startupUiState.activeTab);
  const [sessionLobbyOpen, setSessionLobbyOpen] = useState(false);
  const [menuSection, setMenuSection] = useState("home");
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  useEffect(() => {
    const current = readLastUiState();
    const preserveBattlemap = screen === "sheet" && current.view === "battlemap";
    writeLastUiState({
      screen,
      activeTab,
      view: preserveBattlemap ? "battlemap" : screen,
    });
  }, [screen, activeTab]);

  useEffect(() => {
    const shouldResume =
      startupUiState.view === "battlemap" ||
      startupUiState.screen === "session";
    const lastCode = sharedSession.lastSession?.code;

    if (
      !shouldResume ||
      sharedSession.isActive ||
      sharedSession.lastSession?.autoResume === false ||
      !lastCode
    ) {
      return undefined;
    }

    let cancelled = false;
    let inFlight = false;

    const resume = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        await sharedSession.resumeLastSession?.({ automatic: true });
      } catch (error) {
        console.warn("Could not restore the last Pip-2D20 session:", error);
      } finally {
        inFlight = false;
      }
    };

    void resume();
    const interval = window.setInterval(() => void resume(), 5000);
    window.addEventListener("online", resume);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("online", resume);
    };
  }, [
    sharedSession.isActive,
    sharedSession.lastSession?.code,
    sharedSession.lastSession?.autoResume,
    startupUiState,
  ]);

  return {
    startupUiState,
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
  };
}

export default useUiNavigationController;
