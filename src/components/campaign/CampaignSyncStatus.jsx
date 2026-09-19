import React, { useState } from 'react';
import { signInWithGoogle } from '../../cloud/googleAuth.js';
import { offlineCopy, offlineError } from './offlineCopy.js';
import { worldCopy, worldError } from './worldCopy.js';
import './campaignOffline.css';

export default function CampaignSyncStatus({ world, language, authError = '', compact = false }) {
  const c = offlineCopy(language), [persistence, setPersistence] = useState('');
  const stamp = value => value ? new Date(value).toLocaleString(language === 'uk' ? 'uk-UA' : language) : c.never;
  const error = world.error || authError;
  const rejected = world.history.filter(entry => entry.state === 'rejected');
  const persistAction = navigator.storage?.persist ? <button type="button" className="pip-btn" onClick={async () => {
    try { setPersistence(await navigator.storage.persist() ? c.persisted : c.bestEffort); } catch { setPersistence(c.bestEffort); }
  }}>{c.persist}</button> : null;

  if (compact) return <section className="campaign-offline-status campaign-offline-status--compact" aria-label={c.confirmed}>
    <div className="campaign-offline-status__line" role="status" aria-live="polite">
      <strong>{world.busy ? c.syncing : world.campaign ? c.saved : c.never}</strong>
      <span>{c.pending}: <b>{world.pendingCount}</b></span>
      <button type="button" className="pip-btn campaign-offline-sync-now" disabled={world.busy} onClick={world.syncNow}>{c.sync}</button>
      <details className="campaign-offline-more">
        <summary aria-label={c.snapshot}>⋯</summary>
        <div className="campaign-offline-more__body">
          <div className="campaign-offline-status__dates"><span>{c.confirmed}: {stamp(world.lastSyncAt)}</span>{!!world.nextSyncAt && <span>{c.next}: {stamp(world.nextSyncAt)}</span>}</div>
          <div className="campaign-offline-actions"><button type="button" className="pip-btn" disabled={!world.campaign} onClick={world.exportSave}>{c.export}</button>{persistAction}</div>
          {persistence && <p role="status">{persistence}</p>}
          {error && <p role="alert">{offlineError(error, language, worldError(error, worldCopy(language)))}</p>}
          {['SIGN_IN_REQUIRED', 'AUTH_CHANGED'].includes(error) && <button type="button" className="pip-btn" onClick={() => signInWithGoogle().catch(() => {})}>{c.signIn}</button>}
          {!!world.conflicts.length && <p role="alert">{c.conflict}</p>}
          <p className="campaign-offline-scope">{c.shortScope}</p>
          {!!rejected.length && <details className="campaign-offline-review"><summary>{c.review} · {rejected.length} {c.rejected.toLowerCase()}</summary>{rejected.slice(0, 10).map(entry => <p key={entry.requestId}>{c.rejected} #{entry.sequence || entry.requestId.slice(0, 8)}: {offlineError(entry.error, language, worldError(entry.error, worldCopy(language)))}</p>)}</details>}
        </div>
      </details>
    </div>
  </section>;

  return <section className="campaign-offline-status" aria-label={c.confirmed}>
    <div className="campaign-offline-status__line" role="status" aria-live="polite"><strong>{world.busy ? c.syncing : world.campaign ? c.saved : c.never}</strong><span>{c.pending}: <b>{world.pendingCount}</b></span></div>
    <div className="campaign-offline-status__dates"><span>{c.confirmed}: {stamp(world.lastSyncAt)}</span>{!!world.nextSyncAt && <span>{c.next}: {stamp(world.nextSyncAt)}</span>}</div>
    <div className="campaign-offline-actions"><button type="button" className="pip-btn" disabled={world.busy} onClick={world.syncNow}>{c.sync}</button><button type="button" className="pip-btn" disabled={!world.campaign} onClick={world.exportSave}>{c.export}</button>{persistAction}</div>
    {persistence && <p role="status">{persistence}</p>}
    {error && <p role="alert">{offlineError(error, language, worldError(error, worldCopy(language)))}</p>}
    {['SIGN_IN_REQUIRED', 'AUTH_CHANGED'].includes(error) && <button type="button" className="pip-btn" onClick={() => signInWithGoogle().catch(() => {})}>{c.signIn}</button>}
    {!!world.conflicts.length && <p role="alert">{c.conflict}</p>}
    <p className="campaign-offline-scope">{c.shortScope}</p>
    <details className="campaign-offline-scope"><summary>{c.snapshot}</summary><p>{c.scope}</p></details>
    {!!rejected.length && <details className="campaign-offline-review"><summary>{c.review} · {rejected.length} {c.rejected.toLowerCase()}</summary>{rejected.slice(0, 10).map(entry => <p key={entry.requestId}>{c.rejected} #{entry.sequence || entry.requestId.slice(0, 8)}: {offlineError(entry.error, language, worldError(entry.error, worldCopy(language)))}</p>)}</details>}
  </section>;
}
