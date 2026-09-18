import { refreshFirebaseSession } from './googleAuth.js';
import { createCampaignTransport } from './campaignTransport.js';
export const campaignRequest = createCampaignTransport(refreshFirebaseSession);
