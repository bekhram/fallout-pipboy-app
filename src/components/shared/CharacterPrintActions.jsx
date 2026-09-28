import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { getPrintLanguage, PRINT_COPY } from '../../utils/characterPrintDocument.js';

export default function CharacterPrintActions({ form, globalWeapons = [] }) {
  const { i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const lang = getPrintLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = PRINT_COPY[lang];
  const print = async () => {
    if (running.current || !form) return;
    setError('');
    if (Capacitor.isNativePlatform()) { setError(copy.native); return; }
    // Preserve user activation; opening a window after await is commonly blocked.
    const preview = window.open('', '_blank');
    if (!preview) { setError(copy.blocked); return; }
    preview.opener = null;
    preview.document.title = copy.title;
    preview.document.body.textContent = copy.loading;
    running.current = true; setBusy(true);
    try {
      const snapshot = typeof structuredClone === 'function' ? structuredClone(form) : JSON.parse(JSON.stringify(form));
      const { populateCharacterPrintWindow } = await import('../../utils/characterPrint.js');
      await populateCharacterPrintWindow(preview, snapshot, { language:lang, t:i18n.getFixedT(lang), globalWeapons });
    } catch (cause) {
      console.error('Character print failed', cause);
      if (!preview.closed) preview.document.body.textContent = copy.error;
      setError(copy.error);
    } finally {
      running.current = false; setBusy(false);
    }
  };
  return <div className="pip-character-print-actions" style={{ marginBottom:12 }}>
    <button type="button" className="pip-btn" disabled={busy || !form} onClick={print} aria-busy={busy}>
      {busy ? copy.loading : copy.action}
    </button>
    {error ? <p role="alert" style={{ whiteSpace:'normal', overflowWrap:'anywhere' }}>{error}</p> : null}
  </div>;
}
