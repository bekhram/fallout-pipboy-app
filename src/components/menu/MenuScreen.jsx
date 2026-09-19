import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import TrackedButton from "../shared/TrackedButton.jsx";
import QuickCharacterWizard, {
  getCreationCopy,
} from "../characterCreation/QuickCharacterWizard.jsx";
import AppDownloadPanel from "./AppDownloadPanel.jsx";
import CharacterProfilesPanel from "./CharacterProfilesPanel.jsx";
import CloudAccountPanel from "./CloudAccountPanel.jsx";
import TelegramCampaignPanel from "../session/TelegramCampaignPanel.jsx";
import HelpBugReportPanel from "./HelpBugReportPanel.jsx";
import SheetIcon from "../layout/SheetIcon.jsx";
import PwaInstallButton from "../shared/PwaInstallButton.jsx";
import { menuCopy } from "./menuCopy.js";
import "./menuRedesign.css";
import { getActiveCharacterRecord, createCharacterProfile } from "../../utils/characterProfiles.js";
import { getSessionCodeFromUrl } from "../../utils/sessionShare.js";

export default function MenuScreen({
  initialSection = "home",
  hasCharacter,
  onNewCharacter,
  onContinue,
  onImportClick,
  onOpenSession,
  onResumeSession,
  lastSession,
  saveMeta,
  session = null,
}) {
  const { t, i18n } = useTranslation();
  const c = menuCopy(i18n.resolvedLanguage || i18n.language);
  const [section, setSection] = useState(initialSection);
  const [activeRecord, setActiveRecord] = useState(()=>getActiveCharacterRecord());
  useEffect(()=>{const refresh=()=>setActiveRecord(getActiveCharacterRecord());window.addEventListener("pipboy:character-profiles-changed",refresh);return()=>window.removeEventListener("pipboy:character-profiles-changed",refresh);},[]);
  const record = activeRecord?.data || saveMeta;
  const canContinue = Boolean(activeRecord || hasCharacter);
  const go = (key) => {setSection(key); requestAnimationFrame(()=>document.getElementById(`home-${key}`)?.scrollIntoView({block:"start",behavior:"smooth"}));};
  const nav = (key, icon, text) => <button type="button" className={section===key?'is-active':''} onClick={()=>key === "sessions" ? onOpenSession() : go(key)} aria-current={section===key?'page':undefined}><SheetIcon name={icon}/><span>{text}</span></button>;
  useEffect(() => { if (initialSection !== "home") requestAnimationFrame(()=>document.getElementById(`home-${initialSection}`)?.scrollIntoView({block:"start"})); }, [initialSection]);
  const copy = getCreationCopy(i18n.resolvedLanguage || i18n.language);
  const [showCreationMode, setShowCreationMode] = useState(false);
  const [showQuickCreation, setShowQuickCreation] = useState(false);

  useEffect(() => {
    if (!getSessionCodeFromUrl()) return;
    onOpenSession?.();
  }, [onOpenSession]);

  const handleNewCharacterClick = () => {
    setShowCreationMode(true);
  };

  const handleBlankCharacter = () => {
    createCharacterProfile({}, { activate: true });
    setShowCreationMode(false);
    onNewCharacter?.();
  };

  const handleQuickCharacter = () => {
    setShowCreationMode(false);
    setShowQuickCreation(true);
  };

  const handleQuickCancel = () => {
    setShowQuickCreation(false);
    setShowCreationMode(true);
  };

  const handleQuickComplete = (character) => {
    try {
      createCharacterProfile(character, { activate: true });
      setShowQuickCreation(false);
      setShowCreationMode(false);
      onContinue?.();
    } catch (error) {
      console.error("Could not create quick character:", error);
    }
  };

  return (
    <>
      <div className="home-terminal">
        <header className="home-topbar"><strong>PIP 2D20 <span>MK IV</span></strong><small>ROBCO INDUSTRIES (TM) TERMINAL LINK<br/>{t("menuScreen.subtitle")}</small><span className="home-local"><SheetIcon name="save"/>{c.local}</span><button type="button" className="home-icon" aria-label={c.account} onClick={()=>go('settings')}><SheetIcon name="person"/></button></header>
        <aside className="home-sidebar"><nav>{nav('home','home',c.home)}{nav('characters','person',c.characters)}{nav('sessions','calendar',c.sessions)}{nav('settings','settings',c.settings)}</nav><div className="home-install">{nav('install','download',c.install)}</div></aside>
        <div className="home-content">
          <div id="home-home" className="home-welcome"><h1>{c.welcome}</h1><p>{c.intro}</p></div>
          <section className="home-continue">
            <div className="home-continue-content"><h2>{c.continue}</h2><strong>{record?.characterName || t('menuScreen.unnamed')}</strong>
              {canContinue ? <p>{t('menuScreen.level')} {record?.level || 1}{(activeRecord?.updatedAt || saveMeta?.updatedAt) && <> · {c.saved} {new Date(activeRecord?.updatedAt || saveMeta.updatedAt).toLocaleDateString(i18n.resolvedLanguage)}</>}</p> : <p>{t('menuScreen.noSavedCharacter')}</p>}
              <TrackedButton type="button" className="pip-btn is-primary" id={canContinue?'btn_continue_game':'btn_new_character'} onClick={canContinue?onContinue:handleNewCharacterClick}>{canContinue?t('menuScreen.continue'):t('menuScreen.newCharacter')} <span aria-hidden="true">›</span></TrackedButton>
            </div>
          </section>
          <div className="home-cards">
            <div id="home-characters"><CharacterProfilesPanel onCreateCharacter={handleNewCharacterClick} onOpenCharacter={onContinue} onImportClick={onImportClick}/></div>
            <section id="home-sessions" className="home-session pip-panel"><h2><SheetIcon name="people"/>{c.session}</h2><p>{c.sessionIntro}</p>
              {lastSession?.code && <TrackedButton id="btn_resume_last_gm_session" className="pip-btn home-resume" onClick={onResumeSession}>{c.resume} <span aria-hidden="true">›</span></TrackedButton>}
              <div className="home-session-actions"><TrackedButton className="pip-btn" id="btn_gm_session" onClick={()=>onOpenSession('host')}><SheetIcon name="person"/>{c.host}</TrackedButton><button type="button" className="pip-btn" onClick={()=>onOpenSession('join')}><SheetIcon name="plus"/>{c.join}</button></div>
            </section>
          </div>
          {section==='settings' && <section id="home-settings" className="home-settings pip-panel"><h2>{c.settings}</h2><div className="home-languages">{['en','ru','uk','pl'].map(language=><button type="button" className="pip-btn" aria-pressed={i18n.resolvedLanguage?.startsWith(language)} key={language} onClick={()=>i18n.changeLanguage(language)}>{language.toUpperCase()}</button>)}</div><CloudAccountPanel language={i18n.resolvedLanguage || i18n.language}/><TelegramCampaignPanel session={session}/><HelpBugReportPanel/></section>}
          {section==='install' && <section id="home-install"><AppDownloadPanel/><PwaInstallButton/></section>}
          <footer className="home-footer">ROBCO INDUSTRIES (TM) · PIP 2D20</footer>
        </div>
        <nav className="home-bottom">{nav('home','home',c.home)}{nav('characters','person',c.characters)}{nav('sessions','calendar',c.sessions)}{nav('settings','more',c.more)}</nav>
        {section==='settings' && <button className="home-mobile-install pip-btn" type="button" onClick={()=>go('install')}>{c.install}</button>}
      </div>

      {showCreationMode && (
        <div className="pip-modal-backdrop quick-create-backdrop">
          <div className="pip-modal pip-panel" style={{ width: "min(680px, 100%)" }}>
            <div className="pip-head">
              <div>
                <h2>[ {copy.chooseMode} ]</h2>
                <span>{copy.chooseModeDesc}</span>
              </div>
              <button
                type="button"
                className="pip-btn"
                onClick={() => setShowCreationMode(false)}
              >
                ✕
              </button>
            </div>

            <div className="quick-create-mode-grid">
              <button
                type="button"
                className="pip-btn quick-create-mode-card"
                onClick={handleBlankCharacter}
              >
                <strong>{copy.blank}</strong>
                <span>{copy.blankDesc}</span>
              </button>

              <button
                type="button"
                className="pip-btn is-primary quick-create-mode-card"
                onClick={handleQuickCharacter}
              >
                <strong>{copy.quick}</strong>
                <span>{copy.quickDesc}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <QuickCharacterWizard
        open={showQuickCreation}
        onCancel={handleQuickCancel}
        onComplete={handleQuickComplete}
      />
    </>
  );
}
