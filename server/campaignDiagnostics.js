import { randomUUID } from 'node:crypto';
const operations = new Set(['create','list','join','tick','worldRead','loadGmSession','saveGmSession','delete','invite','revokeInvite','settlement','found','teamFound','worldMove','worldRegion','sessionPresence','submitCharacter','approveCharacter','revoke','importSettlement']);
export function isCampaignQuotaError(error) {
  return [8, '8', 'RESOURCE_EXHAUSTED', 'resource-exhausted'].includes(error?.code) || /quota|RESOURCE_EXHAUSTED/i.test(String(error?.message || ''));
}
export function campaignDiagnostic(error, operation, stage) {
  const message = String(error?.message || '');
  const code = error?.code;
  const errorCode = Number.isInteger(code) ? code : typeof code === 'string' && /^[a-zA-Z0-9_/-]{1,80}$/.test(code) ? code : null;
  // Classify messages rather than logging them: SDK errors can embed document values.
  const patterns = [
    ['firestore-undefined', /undefined.*Firestore|Firestore.*undefined|Cannot use .undefined./i],
    ['firestore-nested-array', /nested arrays|array.*array.*not supported/i],
    ['transaction-read-after-write', /transactions require all reads.*writes/i],
    ['quota-exceeded', /quota|RESOURCE_EXHAUSTED/i],
    ['permission-denied', /PERMISSION_DENIED|insufficient permissions/i],
    ['database-not-found', /database.*does not exist|NOT_FOUND/i],
    ['credentials', /credential|private key|invalid_grant/i],
    ['service-unavailable', /UNAVAILABLE|DEADLINE_EXCEEDED|ETIMEDOUT/i],
    ['invalid-json', /JSON|Unexpected token/i],
  ];
  return { traceId: randomUUID(), operation: operations.has(operation) ? operation : 'unknown', stage,
    errorCode, category: isCampaignQuotaError(error) ? 'quota-exceeded' : patterns.find(([,pattern]) => pattern.test(message))?.[0] || 'unclassified',
    // Only the source filename and line numbers; no message, document contents or full paths.
    locations: String(error?.stack || '').split('\n').slice(1,5).map(line => line.match(/([a-zA-Z0-9_.-]+\.[cm]?js:\d+:\d+)/)?.[1]).filter(Boolean),
  };
}
