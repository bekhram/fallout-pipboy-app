// Retired personal settlements are never simulated, overwritten or auto-imported.
export const LEGACY_SETTLEMENT_KEY = 'pip2d20:settlements:v1';
export function readLegacySettlementArchive(storage) {
  try {
    const source = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const raw = source?.getItem(LEGACY_SETTLEMENT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 0) return null;
      return { raw, count: Array.isArray(parsed) ? parsed.length : null };
    } catch {
      // A damaged record can still be exported byte-for-byte for recovery.
      return { raw, count: null };
    }
  } catch {
    return null; // Storage may be unavailable in private/restricted browsers.
  }
}
