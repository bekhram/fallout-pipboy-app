import { refreshFirebaseSession, getCloudAuthSession } from './googleAuth.js';
import { createCampaignTransport } from './campaignTransport.js';

const transport = createCampaignTransport(refreshFirebaseSession);

export async function campaignRequest(command, options = {}) {
  const uid = options.expectedUid || getCloudAuthSession()?.firebase?.localId;
  const result = await transport(command, { ...options, expectedUid: uid });
  if (uid && getCloudAuthSession()?.firebase?.localId !== uid) {
    throw Object.assign(new Error('AUTH_CHANGED'), { status: 401 });
  }
  return result;
}
