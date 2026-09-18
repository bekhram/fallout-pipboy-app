import React, {useState} from 'react';
import CampaignPanel from '../campaign/CampaignPanel.jsx';
import {campaignCopy} from '../campaign/campaignCopy.js';
import SheetIcon from '../layout/SheetIcon.jsx';
import { menuCopy } from '../menu/menuCopy.js';
import '../menu/menuRedesign.css';
import './sessionLobby.css';

const translations = {
  en: ['Game session','Create an adventure or join your friends.','Back to home','Game Master','Create a new session or restore your campaign from the cloud.','Create session','Restore from cloud','Player','Enter the code from your Game Master.','Session code','Player name','Join session','Session link','Share link','Copy link','Link copied'],
  ru: ['Игровая сессия','Создайте приключение или присоединитесь к друзьям.','На главную','Мастер игры','Создайте новую сессию или восстановите кампанию из облака.','Создать сессию','Восстановить из облака','Игрок','Введите код, который вам дал мастер.','Код сессии','Имя игрока','Присоединиться','Ссылка на сессию','Поделиться','Копировать ссылку','Ссылка скопирована'],
  uk: ['Ігрова сесія','Створіть пригоду або приєднайтеся до друзів.','На головну','Майстер гри','Створіть нову сесію або відновіть кампанію з хмари.','Створити сесію','Відновити з хмари','Гравець','Введіть код, який вам дав майстер.','Код сесії',"Ім’я гравця",'Приєднатися','Посилання на сесію','Поділитися','Копіювати посилання','Посилання скопійовано'],
  pl: ['Sesja gry','Stwórz przygodę lub dołącz do znajomych.','Strona główna','Mistrz gry','Utwórz nową sesję lub przywróć kampanię z chmury.','Utwórz sesję','Przywróć z chmury','Gracz','Wpisz kod otrzymany od mistrza gry.','Kod sesji','Nazwa gracza','Dołącz','Link do sesji','Udostępnij','Kopiuj link','Link skopiowany'],
};
export default function SessionLobby({ session, form, onEnterSession, language, copy, onNavigate, onBack, onHost, onRestore, onJoin, joinCode, onCode, playerName, onName, busy, error, errorTarget, shareCode, onShare, onCopy, linkCopied }) {
  const c = translations[String(language).slice(0,2)] || translations.en;
  const m = menuCopy(language);
  const cc = campaignCopy(language);
  const [mode,setMode]=useState('campaigns');
  const nav = (key, icon, label) => <button type="button" className={key === 'sessions' ? 'is-active' : ''} aria-current={key === 'sessions' ? 'page' : undefined} onClick={()=>key === 'sessions' ? window.scrollTo({top:0,behavior:'smooth'}) : onNavigate(key)}><SheetIcon name={icon}/><span>{label}</span></button>;
  return <div className="home-terminal session-lobby">
    <header className="home-topbar"><strong>PIP 2D20 <span>MK IV</span></strong><small>ROBCO INDUSTRIES (TM)<br/>TERMINAL LINK</small><button type="button" className="home-icon session-account" aria-label={m.account} onClick={()=>onNavigate('settings')}><SheetIcon name="person"/></button></header>
    <aside className="home-sidebar"><nav>{nav('home','home',m.home)}{nav('characters','person',m.characters)}{nav('sessions','people',m.sessions)}{nav('settings','settings',m.settings)}</nav><div className="home-install">PIP 2D20 NETWORK</div></aside>
    <div className="home-content">
      <div className="session-lobby-heading"><button type="button" className="session-back" onClick={onBack}>← {c[2]}</button><h1>{c[0]}</h1><p>{c[1]}</p></div>
      <div className="session-mode-tabs" aria-label={cc.title}><button type="button" className="pip-btn" aria-pressed={mode==='campaigns'} onClick={()=>setMode('campaigns')}>{cc.campaigns}</button><button type="button" className="pip-btn" aria-pressed={mode==='live'} onClick={()=>setMode('live')}>{cc.live}</button></div>
      {mode==='campaigns' ? <CampaignPanel language={language} session={session} form={form} onEnterSession={onEnterSession}/> : <div className="session-role-grid">
        <section className="pip-panel session-role-card session-role-card--gm" aria-labelledby="session-host-title">
          <span className="session-role-badge" aria-hidden="true">GM</span><div className="session-art session-art--gm" aria-hidden="true"/>
          <h2 id="session-host-title">{c[3]}</h2><p>{c[4]}</p>
          <div className="session-host-actions"><button type="button" className="pip-btn is-primary" onClick={onHost} disabled={busy}>{c[5]}</button><button type="button" className="pip-btn" onClick={onRestore} disabled={busy}><SheetIcon name="save"/>{busy ? copy.restoringCloud : c[6]}</button></div>
          {shareCode && <div className="session-lobby-share"><strong>{c[12]} · {shareCode}</strong><div><button type="button" className="pip-btn" onClick={onShare}>{c[13]}</button><button type="button" className="pip-btn" onClick={onCopy}>{linkCopied ? c[15] : c[14]}</button></div></div>}
          {error && errorTarget === 'host' && <div className="session-error" role="alert">{error}</div>}
        </section>
        <form className="pip-panel session-role-card session-role-card--player" onSubmit={event=>{event.preventDefault();onJoin();}} aria-labelledby="session-player-title">
          <span className="session-role-badge" aria-hidden="true">P</span><div className="session-art session-art--player" aria-hidden="true"/>
          <h2 id="session-player-title">{c[7]}</h2><p>{c[8]}</p>
          <label className="session-field"><span>{c[9]}</span><input className="pip-input session-code-input" value={joinCode} maxLength={6} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="ABC234" onChange={event=>onCode(event.target.value)}/></label>
          <label className="session-field"><span>{c[10]}</span><input className="pip-input" value={playerName} maxLength={40} autoComplete="nickname" onChange={event=>onName(event.target.value)}/></label>
          <button type="submit" className="pip-btn is-primary">{c[11]} <span aria-hidden="true">→</span></button>
          {error && errorTarget !== 'host' && <div className="session-error" role="alert">{error}</div>}
        </form>
      </div>}
      <footer className="session-network" aria-hidden="true"><svg viewBox="0 0 600 90" fill="none" stroke="currentColor"><path d="M0 78h180l30-8 24 8h132l25-10 24 10h185M283 77l17-58 17 58m-30-13 25-18m-20 0 22 18m-24-27h20m-24 29h29M300 20V9"/><circle cx="300" cy="9" r="4"/><path d="M280 27a26 26 0 1 1 40 0m-51 9a40 40 0 1 1 62 0"/></svg><span>PIP 2D20 NETWORK</span></footer>
    </div>
    <nav className="home-bottom">{nav('home','home',m.home)}{nav('characters','person',m.characters)}{nav('sessions','people',m.sessions)}{nav('settings','more',m.more)}</nav>
  </div>;
}
