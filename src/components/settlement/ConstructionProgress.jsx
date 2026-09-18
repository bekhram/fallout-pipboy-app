import React, { useEffect, useMemo, useState } from 'react';
import { settlementConstructionView } from '../../utils/settlementConstructionView.js';
import { constructionCopy, constructionDuration } from './constructionCopy.js';
import './settlementConstruction.css';

// This clock only redraws this card. It does not touch the parent save/autosave.
export function useConstructionClock(enabled) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return undefined;
    let timer;
    const refresh = () => { if (!document.hidden) setNow(Date.now()); };
    const visibility = () => {
      clearInterval(timer);
      if (!document.hidden) { refresh(); timer = setInterval(refresh, 1000); }
    };
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [enabled]);
  return now;
}
export default function ConstructionProgress({ settlement, taskKey, language, onAssign, canEdit }) {
  const now = useConstructionClock(Boolean(taskKey));
  const view = useMemo(() => settlementConstructionView(settlement, now).byKey[taskKey], [settlement, now, taskKey]);
  if (!view) return null;
  const text = constructionCopy(language);
  return <section className={`settlement-construction-card is-${view.state}`} aria-label={text.title}>
    <div className="settlement-construction-heading"><strong>⚒ {text.title}</strong><b>{view.percent}%</b></div>
    <progress max="100" value={view.percent} aria-label={text.title} aria-valuetext={`${view.percent}% · ${text[view.state]}`} />
    <div className="settlement-construction-heading"><span>{text.workers}</span><b>{view.workers}</b></div>
    <strong>{text[view.state]}</strong>
    <small>{text[view.stage]}</small>
    {view.state === 'building' && <><div className="settlement-construction-heading"><span>{text.eta}</span><b>{constructionDuration(view.etaMs, language)}</b></div><small>{text.crew}</small></>}
    {view.state === 'waiting' && <button type="button" className="pip-action-button" disabled={!canEdit} onClick={onAssign}>{text.assign}</button>}
    <small>{text.estimate}</small><small>{text.next}</small>
  </section>;
}
