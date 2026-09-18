import { refreshFirebaseSession, getCloudAuthSession } from './googleAuth.js';
import { createCampaignTransport } from './campaignTransport.js';
import { campaignLocalStore } from './campaignLocalStore.js';
const transport = createCampaignTransport(refreshFirebaseSession);
export async function campaignRequest(command, options = {}) {
  const uid = options.expectedUid || getCloudAuthSession()?.firebase?.localId;
  const result = await transport(command, { ...options, expectedUid: uid });
  if (uid && getCloudAuthSession()?.firebase?.localId !== uid) throw Object.assign(new Error('AUTH_CHANGED'), { status: 401 });
  if (uid) {
    try {
      if (result.campaign) await campaignLocalStore.remember(uid, result.campaign);
      if (result.campaigns) await campaignLocalStore.rememberList(uid, result.campaigns);
      if (result.deleted) await campaignLocalStore.block(uid, result.campaignId);
    } catch {
      // The server may already have committed. Do NOT convert a cache failure into
      // a failed financial request. The local-first controller separately requires
      // a successful durable ACK before it removes its outbox entry.
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pip2d20:campaign-cache-failed', { detail: { uid } }));
    }
  }
  return result;
}
