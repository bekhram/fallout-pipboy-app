import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import GmUnifiedTokenManagerV8 from "./GmUnifiedTokenManagerV8.jsx";
import "./gmUnifiedTokenManagerV9.css";

const COPY = {
  en: { size: "TOKEN SIZE" },
  ru: { size: "РАЗМЕР ТОКЕНА" },
  uk: { size: "РОЗМІР ТОКЕНА" },
  pl: { size: "ROZMIAR TOKENU" },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function normalizeSize(value) {
  return Number(value) === 2 ? 2 : 1;
}

export default function GmUnifiedTokenManagerV9({ session }) {
  const { i18n } = useTranslation();
  const text = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const rootRef = useRef(null);
  const [sizeHost, setSizeHost] = useState(null);
  const [tokenSize, setTokenSize] = useState(1);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const sync = () => {
      const host = root.querySelector(".gm-token-v5-preview-head");
      setSizeHost((current) => current === host ? current : host);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const tokenSession = useMemo(() => {
    if (!session) return session;
    return {
      ...session,
      createNpcToken: (payload = {}) => {
        const size = normalizeSize(tokenSize);
        const stats = {
          ...(payload?.stats && typeof payload.stats === "object" ? payload.stats : {}),
          footprint: size,
          size,
          baseSize: size,
        };
        return session.createNpcToken?.({ ...payload, size, stats });
      },
    };
  }, [session, tokenSize]);

  return (
    <div className="gm-unified-token-manager-v9" ref={rootRef}>
      <GmUnifiedTokenManagerV8 session={tokenSession} />

      {sizeHost ? createPortal(
        <div className="gm-token-v9-size-picker" aria-label={text.size}>
          <span>{text.size}</span>
          <div>
            {[1, 2].map((size) => (
              <button
                type="button"
                key={size}
                className={`pip-btn${tokenSize === size ? " is-primary" : ""}`}
                aria-pressed={tokenSize === size}
                onClick={() => setTokenSize(size)}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </div>,
        sizeHost
      ) : null}
    </div>
  );
}
