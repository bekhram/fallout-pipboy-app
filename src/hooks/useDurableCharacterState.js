import { useCallback, useEffect, useRef, useState } from 'react';
import { localCharacterStore, subscribeLocal } from '../cloud/campaignLocalStore.js';

/** Every character mutation, including crafting/trading full-form writes, passes
 * through the same IDB record used by construction reservations. No event-based
 * best-effort deduction after the fact. Revision guards reject stale full forms. */
export function useDurableCharacterState(initialize) {
  const [form, render] = useState(() => {
    const value = initialize();
    return { ...value, _localCharacterId: value._localCharacterId || crypto.randomUUID(), _localRevision: 0 };
  });
  const current = useRef(form), active = useRef(false), tail = useRef(Promise.resolve()), generation = useRef(0);
  const [status, setStatus] = useState({ state:'saving', error:'' });
  current.current = form;
  const accept = useCallback(record => {
    if (!active.current || record.id !== current.current._localCharacterId) return;
    if ((record.form._localRevision || 0) < (current.current._localRevision || 0)) return;
    current.current = record.form;
    render(old => old._localRevision === record.form._localRevision ? old : record.form);
  }, []);
  useEffect(() => {
    active.current = true;
    const seed = current.current;
    const ready = localCharacterStore.load(seed).then(record => {
      if (active.current) { accept(record); setStatus({state:'saved',error:''}); }
      return record;
    });
    tail.current = ready.catch(error => { if (active.current) setStatus({state:'error',error:error.message}); });
    const refresh = () => {
      const id = current.current._localCharacterId;
      void localCharacterStore.get(id).then(r => { if(r)accept(r); }).catch(e => { if(active.current)setStatus({state:'error',error:e.message}); });
    };
    const unsubscribe = subscribeLocal(refresh);
    window.addEventListener('focus',refresh);
    return () => { active.current=false;unsubscribe();window.removeEventListener('focus',refresh); };
  }, [accept]);
  const setForm = useCallback(update => {
    const id = current.current._localCharacterId;
    const version = generation.current, expectedRevision = form._localRevision;
    if(active.current)setStatus({state:'saving',error:''});
    const work = tail.current.then(async () => {
      if(version!==generation.current)throw new Error('LOCAL_CHARACTER_CHANGED');
      const record=await localCharacterStore.update(id,update,{expectedRevision});
      if(active.current){accept(record);setStatus({state:'saved',error:''});}
      return record.form;
    });
    tail.current=work.catch(error=>{if(active.current)setStatus({state:'error',error:error.message});});
    // Existing callbacks do not await React setters. Return a handled promise;
    // explicit imports/exports can check a null result before claiming success.
    return work.catch(()=>null);
  },[accept,form._localRevision]);
  const replaceCharacter = useCallback(async value => {
    await tail.current;
    const next={...value,_localCharacterId:crypto.randomUUID()}; delete next._localRevision;
    try {
      const record=await localCharacterStore.load(next);
      generation.current++;
      if(active.current){current.current=record.form;render(record.form);setStatus({state:'saved',error:''});}
      return record.form;
    } catch(error){if(active.current)setStatus({state:'error',error:error.message});return null;}
  },[]);
  return [form,setForm,status,replaceCharacter];
}
