import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const COPY = {
  en: {
    title: "DOWNLOAD APP",
    subtitle: "Install PIP 2D20 on your phone",
    android: "Android APK",
    androidDesc: "Download the latest Android build directly.",
    preparing: "Android build is being prepared...",
    download: "DOWNLOAD APK",
    ios: "iPhone / iPad",
    iosDesc: "Open this site in Safari → Share → Add to Home Screen.",
    web: "Web App",
    version: "Version",
  },
  ru: {
    title: "СКАЧАТЬ ПРИЛОЖЕНИЕ",
    subtitle: "Установи PIP 2D20 на телефон",
    android: "Android APK",
    androidDesc: "Скачай последнюю Android-версию напрямую.",
    preparing: "Android-сборка готовится...",
    download: "СКАЧАТЬ APK",
    ios: "iPhone / iPad",
    iosDesc: "Открой сайт в Safari → Поделиться → На экран «Домой».",
    web: "Веб-приложение",
    version: "Версия",
  },
  uk: {
    title: "ЗАВАНТАЖИТИ ЗАСТОСУНОК",
    subtitle: "Встанови PIP 2D20 на телефон",
    android: "Android APK",
    androidDesc: "Завантаж останню Android-версію напряму.",
    preparing: "Android-збірка готується...",
    download: "ЗАВАНТАЖИТИ APK",
    ios: "iPhone / iPad",
    iosDesc: "Відкрий сайт у Safari → Поділитися → На початковий екран.",
    web: "Вебзастосунок",
    version: "Версія",
  },
  pl: {
    title: "POBIERZ APLIKACJĘ",
    subtitle: "Zainstaluj PIP 2D20 na telefonie",
    android: "Android APK",
    androidDesc: "Pobierz najnowszą wersję Android bezpośrednio.",
    preparing: "Trwa przygotowywanie wersji Android...",
    download: "POBIERZ APK",
    ios: "iPhone / iPad",
    iosDesc: "Otwórz stronę w Safari → Udostępnij → Dodaj do ekranu początkowego.",
    web: "Aplikacja webowa",
    version: "Wersja",
  },
};

function getLanguage(value) {
  const language = String(value || "en").split("-")[0];
  return COPY[language] ? language : "en";
}

export default function AppDownloadPanel() {
  const { i18n } = useTranslation();
  const language = getLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const [buildInfo, setBuildInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/downloads/mobile-version.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("No mobile build metadata yet");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setBuildInfo(data);
      })
      .catch(() => {
        if (!cancelled) setBuildInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const apkUrl = useMemo(
    () => buildInfo?.apk || "/downloads/pip2d20-android.apk",
    [buildInfo]
  );

  const trackDownload = () => {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "ui_button_click",
        button_id: "btn_download_android_apk",
        button_text: copy.download,
        app_version: buildInfo?.version || "unknown",
      });
    } catch {
      // Download must still work if analytics is unavailable.
    }
  };

  return (
    <section className="pip-panel pip-block" style={{ gridColumn: "1 / -1" }}>
      <div className="pip-head">
        <h2>[ {copy.title} ]</h2>
        <span>{copy.subtitle}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        <div className="pip-logbox" style={{ display: "grid", gap: "8px" }}>
          <strong>{copy.android}</strong>
          <span style={{ opacity: 0.8 }}>{copy.androidDesc}</span>
          {buildInfo ? (
            <>
              <span style={{ fontSize: "0.85em", opacity: 0.7 }}>
                {copy.version}: {buildInfo.version || "1.1.0"}
              </span>
              <a
                className="pip-btn is-primary"
                href={apkUrl}
                download={`PIP-2D20-Android-${buildInfo.version || "latest"}.apk`}
                onClick={trackDownload}
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                {copy.download}
              </a>
            </>
          ) : (
            <button type="button" className="pip-btn" disabled>
              {copy.preparing}
            </button>
          )}
        </div>

        <div className="pip-logbox" style={{ display: "grid", gap: "8px" }}>
          <strong>{copy.ios}</strong>
          <span style={{ opacity: 0.8 }}>{copy.iosDesc}</span>
          <span style={{ fontSize: "0.85em", opacity: 0.65 }}>
            {copy.web} / PWA
          </span>
        </div>
      </div>
    </section>
  );
}
