import { useEffect } from "react";

export default function GmTokenPointerGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const active = new Map();

    const findToken = (target) => target?.closest?.(
      ".gm-tactical-map-core .gm-session-map__grid .gm-session-token"
    ) || null;

    const onPointerDown = (event) => {
      const token = findToken(event.target);
      if (!token) return;
      active.set(event.pointerId, {
        token,
        startX: event.clientX,
        startY: event.clientY,
      });
    };

    const finish = (event) => {
      const state = active.get(event.pointerId);
      if (!state) return;
      active.delete(event.pointerId);
      const { token } = state;

      window.setTimeout(() => {
        try {
          if (token.hasPointerCapture?.(event.pointerId)) {
            token.releasePointerCapture?.(event.pointerId);
          }
        } catch {
          // Pointer capture may already be released by the map handler.
        }

        // A simple click/tap must never leave the token in drag state.
        // If React did not receive the native pointerup on a mobile browser,
        // send a cancel event so GmSessionMapV2 clears its dragRef/state.
        if (token.isConnected && token.classList.contains("is-dragging")) {
          try {
            token.dispatchEvent(new PointerEvent("pointercancel", {
              bubbles: true,
              cancelable: true,
              pointerId: event.pointerId,
              pointerType: event.pointerType || "touch",
              clientX: event.clientX,
              clientY: event.clientY,
            }));
          } catch {
            token.classList.remove("is-dragging");
          }
        }
      }, 0);
    };

    const onBlur = () => {
      active.forEach(({ token }, pointerId) => {
        try { token.releasePointerCapture?.(pointerId); } catch { /* noop */ }
        try {
          token.dispatchEvent(new PointerEvent("pointercancel", {
            bubbles: true,
            cancelable: true,
            pointerId,
          }));
        } catch { /* noop */ }
      });
      active.clear();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", finish, true);
    window.addEventListener("pointercancel", finish, true);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", finish, true);
      window.removeEventListener("pointercancel", finish, true);
      window.removeEventListener("blur", onBlur);
      active.clear();
    };
  }, []);

  return null;
}
