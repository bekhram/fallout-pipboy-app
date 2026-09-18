import React, { useEffect, useRef, useState } from 'react';
import { ConstructionNoticeTracker } from '../../utils/settlementConstructionView.js';
import { SETTLEMENT_BUILDINGS, settlementBuildingName } from '../../data/settlement/buildings.js';
import { constructionCopy } from './constructionCopy.js';
import './settlementConstruction.css';

export default function ConstructionNotices({ settlement, language, onSelect }) {
  const tracker = useRef(new ConstructionNoticeTracker());
  const [state, setState] = useState({ id: settlement.id, events: [] });
  useEffect(() => {
    const fresh = tracker.current.read(settlement);
    setState(previous => {
      if (previous.id !== settlement.id) return { id: settlement.id, events: [] };
      return fresh.length ? { id: settlement.id, events: [...fresh, ...previous.events].slice(0, 3) } : previous;
    });
  }, [settlement]);
  const text = constructionCopy(language);
  const events = state.id === settlement.id ? state.events : [];
  return <div className="settlement-construction-notices" role="status" aria-live="polite" aria-atomic="true">
    {events.map(event => {
      const [kind, buildingId] = String(event.target).split(':');
      const building = (settlement.buildings || []).find(b => b.id === buildingId);
      if (!building) return null;
      const def = SETTLEMENT_BUILDINGS[kind === 'room' ? building.type : event.buildingType];
      const name = def ? settlementBuildingName(def, language) : building.type;
      const key = `${event.target}:${event.createdAt ?? event.id}`;
      return <div className="settlement-construction-notice" key={key}>
        <div><strong>✓ {text[kind === 'room' ? 'roomComplete' : kind === 'upgrade' ? 'upgradeComplete' : 'complete']}</strong><span>{name}</span></div>
        <button type="button" className="pip-action-button" onClick={() => onSelect(buildingId)}>{text.open}</button>
        <button type="button" className="pip-action-button" aria-label={text.dismiss} onClick={() => setState(previous => ({ ...previous, events: previous.events.filter(item => item !== event) }))}>×</button>
      </div>;
    })}
  </div>;
}
