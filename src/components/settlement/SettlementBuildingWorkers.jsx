import React, { useMemo, useRef, useState } from 'react';
import { resolveSettlementWorkplaces, assignSettlementWorkplace, settlementWorkplaceError } from '../../utils/settlementWorkplaces.js';
import { tasks, assignedKey, assignWorker, advanceConstruction } from '../../utils/settlementDevelopment.js';
import { buildingIndicators, JOB_SYMBOLS } from './workplaceIndicators.js';
import { workplaceCopy } from './workplaceCopy.js';
import './settlementWorkplaces.css';

export default function SettlementBuildingWorkers({ settlement, building, language, canEdit, onCommand, onUpdate, roomLabel }) {
  const text = workplaceCopy(language);
  const [workerId, setWorkerId] = useState('');
  const [taskKey, setTaskKey] = useState('');
  const [mode, setMode] = useState(building.state === 'construction' ? 'build' : 'workplace');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const plan = useMemo(() => resolveSettlementWorkplaces(settlement), [settlement]);
  const site = plan.byBuilding[building.id];
  const queue = tasks(settlement), buildingTasks = queue.filter(t => t.buildingId === building.id);
  const selectedTask = buildingTasks.find(t => t.key === taskKey) || buildingTasks[0];
  const construction = building.state === 'construction' || ((mode === 'build' || !site?.action) && Boolean(selectedTask));
  const action = construction ? 'build' : site?.action;
  const residents = settlement.settlers || [];
  const assigned = residents.filter(w => construction
    ? w.settlementAction?.type === 'build' && (assignedKey(w) || queue[0]?.key) === selectedTask?.key
    : site?.workerIds.includes(w.id) || (w.settlementAction?.type === action && w.settlementAction?.targetBuildingId === building.id));
  const candidates = residents.filter(w => !assigned.some(a => a.id === w.id));
  const selectedWorker = candidates.find(w => w.id === workerId);
  const assignmentError = !construction && selectedWorker ? settlementWorkplaceError(settlement, selectedWorker.id, building.id) : '';
  const canAssign = Boolean(selectedWorker && action && (construction ? selectedTask : site?.state === 'active') && !assignmentError);
  const indicators = buildingIndicators(building, site);

  async function submit(command) {
    if (!canEdit || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      if (onCommand) {
        if (await onCommand(command) === false) throw new Error('SAVE_FAILED');
      } else {
        if (typeof onUpdate !== 'function') throw new Error('SAVE_FAILED');
        if (command.type === 'workplace') {
          const validation = settlementWorkplaceError(settlement, command.workerId, command.buildingId);
          if (validation) throw new Error(validation);
        }
        const now = Date.now();
        onUpdate(current => {
          // Settle elapsed construction using the old assignments before changing jobs.
          const next = advanceConstruction(current, now);
          if (command.type === 'workplace') {
            if (settlementWorkplaceError(next, command.workerId, command.buildingId)) return current;
            return assignSettlementWorkplace(next, command.workerId, command.buildingId);
          }
          if (command.type === 'worker') return assignWorker(next, { id: next.access?.ownerId || next.ownerCharacterId || 'local' }, command.workerId, command.key);
          return { ...next, settlers: (next.settlers || []).map(w => w.id === command.workerId
            ? { ...w, settlementAction: null, assignedBuildingId: null, status: 'idle' } : w) };
        });
      }
      setWorkerId('');
    } catch (err) { setError(text[err?.message] || text.error); }
    finally { busyRef.current = false; setBusy(false); }
  }

  return <section className="settlement-workplace" aria-label={text.workers} aria-busy={busy}>
    <h3>{text.production}</h3>
    <div className="settlement-workplace-output">{indicators.map(i => <div key={i.kind} className="settlement-workplace-output__item">
      <span className="settlement-workplace-icon" aria-hidden="true">{i.symbol}</span>
      <span><strong>{text[i.kind]}{i.amount !== null ? ` · ${i.amount}` : ''}</strong>
        <small>{i.mode === 'daily' ? text.daily : i.mode === 'rating' ? text.rating : i.mode === 'roll' ? text.roll : text.service}</small></span>
    </div>)}</div>
    {site?.state !== 'active' && <p className="settlement-workplace-warning">! {text[site?.state] || text.unavailable}</p>}
    {site?.effects.cropSlots > 0 && <p>{text.crops}: <strong>{site.tendedCrops}/{site.effects.cropSlots}</strong></p>}
    {(site?.action || buildingTasks.length > 0) ? <>
      <h3>{text.workers} · {assigned.length}</h3>
      {site?.action && buildingTasks.length > 0 && <label>{text.task}<select className="pip-input" value={construction ? 'build' : 'workplace'} disabled={busy} onChange={e => { setMode(e.target.value); setWorkerId(''); }}>
        <option value="workplace">{text[site.action]}</option><option value="build">{text.build}</option>
      </select></label>}
      {construction && buildingTasks.length > 1 && <label>{text.task}<select className="pip-input" disabled={busy} value={selectedTask?.key || ''} onChange={e => { setTaskKey(e.target.value); setWorkerId(''); }}>
        {buildingTasks.map(t => <option key={t.key} value={t.key}>{t.kind === 'room' ? (roomLabel?.(t.type) || t.type) : text.construction} · {Math.floor(Number(t.job.constructionProgressDays || 0) * 100) / 100}/{t.job.constructionDaysRequired || '?'} d</option>)}
      </select></label>}
      {!construction && site.capacity !== null && <small>{text.manual}: {site.manualWorkerIds.length}/{site.capacity}</small>}
      <div className="settlement-workplace-people">{assigned.map(w => <div className="settlement-workplace-person" key={w.id}>
        <span><strong>{w.name || w.id}</strong><small>{JOB_SYMBOLS[action]} {text[action]} · {w.settlementAction?.targetBuildingId || assignedKey(w) ? text.manual : text.automatic}</small>
        {!construction && !plan.byWorker[w.id]?.active && <small className="settlement-workplace-warning">! {text[plan.byWorker[w.id]?.reason] || text.unavailable}</small>}</span>
        <button type="button" className="pip-action-button" disabled={!canEdit || busy} aria-label={`${text.remove}: ${w.name || w.id}`} onClick={() => submit({ type:'action', workerId:w.id, action:'' })}>{text.remove}</button>
      </div>)}</div>
      <form className="settlement-workplace-form" onSubmit={e => { e.preventDefault(); if (canAssign) void submit(construction ? { type:'worker', workerId, key:selectedTask.key } : { type:'workplace', workerId, buildingId:building.id }); }}>
        <label>{text.choose}<select className="pip-input" disabled={!canEdit || busy || !candidates.length} value={selectedWorker?.id || ''} onChange={e => setWorkerId(e.target.value)}>
          <option value="">{candidates.length ? text.choose : text.noWorkers}</option>
          {candidates.map(w => <option key={w.id} value={w.id}>{w.name || w.id} · {text[w.settlementAction?.type] || text.free}</option>)}
        </select></label>
        <button type="submit" className="pip-action-button" disabled={!canEdit || busy || !canAssign}>{busy ? '…' : selectedWorker?.settlementAction ? text.reassign : text.assign}</button>
      </form>
      {assignmentError && <p className="settlement-workplace-warning">{text[assignmentError] || text.unavailable}</p>}
      <small>{construction ? text.buildNote : text.autoNote}</small>
    </> : <p>{text.noStaff}</p>}
    {error && <p role="alert" className="settlement-workplace-warning">{error}</p>}
  </section>;
}
