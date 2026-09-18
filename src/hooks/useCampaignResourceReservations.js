import { useEffect, useState } from 'react';
import { campaignLocalStore, subscribeLocal } from '../cloud/campaignLocalStore.js';
import { getCloudAuthSession } from '../cloud/googleAuth.js';
import { reservationTotals } from '../cloud/settlementOfflineProtocol.js';

const EMPTY = Object.freeze({ caps: 0, common: 0, uncommon: 0, rare: 0, pendingCampaigns: 0 });

export default function useCampaignResourceReservations() {
  const [state, setState] = useState(EMPTY);
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const uid = getCloudAuthSession()?.firebase?.localId || '';
      if (!uid) {
        if (!cancelled) setState(EMPTY);
        return;
      }
      try {
        const worlds = await campaignLocalStore.worlds(uid);
        const next = { caps: 0, common: 0, uncommon: 0, rare: 0, pendingCampaigns: 0 };
        for (const record of worlds) {
          const totals = reservationTotals(record);
          const hasAny = ['caps','common','uncommon','rare'].some(key => totals[key] > 0);
          if (hasAny) next.pendingCampaigns += 1;
          for (const key of ['caps','common','uncommon','rare']) next[key] += totals[key];
        }
        if (!cancelled) setState(next);
      } catch {
        if (!cancelled) setState(EMPTY);
      }
    }
    const unsubscribe = subscribeLocal(() => void refresh());
    const auth = () => void refresh();
    window.addEventListener('pip2d20:cloud-auth-changed', auth);
    void refresh();
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('pip2d20:cloud-auth-changed', auth);
    };
  }, []);
  return state;
}
