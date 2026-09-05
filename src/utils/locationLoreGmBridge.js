import { getLocationCoreLore } from "../data/map/locationLore.js";

function endpointUrl(input) {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return input.toString();
  return input?.url || "";
}

export function installLocationLoreGmBridge() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  if (window.__pipLocationLoreGmBridgeInstalled) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    try {
      const url = endpointUrl(input);
      const isAutoGm = /\/api\/(?:auto-gm|combat-gm)(?:\?|$)/.test(url);
      if (!isAutoGm || typeof init?.body !== "string") {
        return originalFetch(input, init);
      }

      const payload = JSON.parse(init.body);
      const currentLocation = payload?.world?.currentLocation;
      const isStatic = payload?.world?.isStaticLocation === true || Boolean(currentLocation?.id);
      const lore = isStatic ? getLocationCoreLore(currentLocation) : null;

      if (lore) {
        payload.world = {
          ...(payload.world && typeof payload.world === "object" ? payload.world : {}),
          locationLore: lore,
          currentLocation: {
            ...(currentLocation && typeof currentLocation === "object" ? currentLocation : {}),
            lore,
          },
        };
      }

      return originalFetch(input, {
        ...init,
        body: JSON.stringify(payload),
      });
    } catch {
      return originalFetch(input, init);
    }
  };

  window.__pipLocationLoreGmBridgeInstalled = true;
}
