import React, { useState } from 'react';
import CampaignPanelOnline from './CampaignPanelOnline.jsx';
import CampaignOfflineHub from './CampaignOfflineHub.jsx';
import { offlineCopy } from './offlineCopy.js';
import './campaignOffline.css';

// Both entries use the same campaign IDs and CampaignWorldMap. The offline entry
// never mounts the lobby/presence poller and does not create personal settlements.
export default function CampaignPanel({ worldOnly = false, ...props }) {
  const [offline, setOffline] = useState(false);
  const c = offlineCopy(props.language);
  return <div>
    {!worldOnly && <nav className="campaign-offline-actions" aria-label={c.title}>
      <button type="button" className="pip-btn" aria-pressed={!offline} onClick={() => setOffline(false)}>{c.lobby}</button>
      <button type="button" className="pip-btn" aria-pressed={offline} onClick={() => setOffline(true)}>{c.offline}</button>
    </nav>}
    {worldOnly || offline ? <CampaignOfflineHub language={props.language} form={props.form} /> : <CampaignPanelOnline {...props} worldOnly={false} />}
  </div>;
}
