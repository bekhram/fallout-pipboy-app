import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MapScreenCore from './MapScreenCore.jsx';
import CampaignPanel from '../campaign/CampaignPanel.jsx';
import { readLegacySettlementArchive } from '../../utils/legacySettlementArchive.js';
import './mapSettlement.css';

const COPY = {
  en: { menu: 'SETTLEMENTS', open: 'OPEN SHARED SETTLEMENTS', back: 'BACK TO PERSONAL MAP', info: 'Settlements belong to saved campaigns. Choose the same campaign here and on the GM screen.', archive: 'A retired personal settlement save is still stored on this device. It is not used for gameplay or automatically added to shared resources.', export: 'EXPORT OLD SAVE', failed: 'Could not export the old save. The original data has not been changed.' },
  ru: { menu: 'ПОСЕЛЕНИЯ', open: 'ОТКРЫТЬ ОБЩИЕ ПОСЕЛЕНИЯ', back: 'НАЗАД К ЛИЧНОЙ КАРТЕ', info: 'Поселения принадлежат сохранённым кампаниям. Выберите ту же кампанию, что и на экране ГМ.', archive: 'На этом устройстве осталось сохранение прежнего личного поселения. Оно не участвует в игре и не добавляется автоматически к общим ресурсам.', export: 'ЭКСПОРТ СТАРОГО СОХРАНЕНИЯ', failed: 'Не удалось экспортировать старое сохранение. Исходные данные не изменены.' },
  uk: { menu: 'ПОСЕЛЕННЯ', open: 'ВІДКРИТИ СПІЛЬНІ ПОСЕЛЕННЯ', back: 'НАЗАД ДО ОСОБИСТОЇ МАПИ', info: 'Поселення належать збереженим кампаніям. Оберіть ту саму кампанію, що й на екрані ГМ.', archive: 'На цьому пристрої залишилося збереження колишнього особистого поселення. Воно не бере участі у грі й не додається автоматично до спільних ресурсів.', export: 'ЕКСПОРТ СТАРОГО ЗБЕРЕЖЕННЯ', failed: 'Не вдалося експортувати старе збереження. Початкові дані не змінено.' },
  pl: { menu: 'OSADY', open: 'OTWÓRZ WSPÓLNE OSADY', back: 'WRÓĆ DO MAPY OSOBISTEJ', info: 'Osady należą do zapisanych kampanii. Wybierz tę samą kampanię co na ekranie MG.', archive: 'Na tym urządzeniu pozostał zapis dawnej osobistej osady. Nie uczestniczy w grze i nie jest automatycznie dodawany do wspólnych zasobów.', export: 'EKSPORTUJ STARY ZAPIS', failed: 'Nie udało się wyeksportować starego zapisu. Oryginalne dane nie zostały zmienione.' },
};

export default function MapScreen(props) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const text = COPY[language] || COPY.en;
  const [sharedOpen, setSharedOpen] = useState(false);
  const [archive] = useState(() => readLegacySettlementArchive());
  const [exportError, setExportError] = useState(false);
  function exportArchive() {
    if (!archive) return;
    let url, link;
    try {
      setExportError(false);
      url = URL.createObjectURL(new Blob([archive.raw], { type: 'application/json' }));
      link = document.createElement('a');
      link.href = url; link.download = 'pip2d20-retired-personal-settlements.json';
      document.body.appendChild(link); link.click();
    } catch { setExportError(true); }
    finally { link?.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  return <div className="pip-map-with-settlement-menu">
    <div className="pip-map-settlement-toolbar">
      <span className="pip-map-settlement-toolbar__title">⌂ {text.menu}</span>
      <button type="button" className="pip-action-button pip-map-settlement-toolbar__button" onClick={() => setSharedOpen(value => !value)}>
        {sharedOpen ? `← ${text.back}` : text.open}
      </button>
    </div>
    {sharedOpen ? <>
      <p>{text.info}</p>
      <CampaignPanel language={language} form={props.character} worldOnly />
      {archive && <details className="pip-panel"><summary>{text.export}</summary><p>{text.archive}</p>
        <button type="button" className="pip-btn" onClick={exportArchive}>{text.export}</button>
        {exportError && <p role="alert">{text.failed}</p>}
      </details>}
    </> : <MapScreenCore {...props} />}
  </div>;
}
