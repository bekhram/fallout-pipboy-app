import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MapScreenCore from './MapScreenCore.jsx';
import LocalSettlementPanel from '../settlement/LocalSettlementPanel.jsx';
import './mapSettlement.css';

const COPY = {
  en: { menu: 'SETTLEMENTS', open: 'OPEN LOCAL SETTLEMENTS', back: 'BACK TO PERSONAL MAP', info: 'Settlements are local and offline. They are stored only on this device.' },
  ru: { menu: 'ПОСЕЛЕНИЯ', open: 'ОТКРЫТЬ ЛОКАЛЬНЫЕ ПОСЕЛЕНИЯ', back: 'НАЗАД К ЛИЧНОЙ КАРТЕ', info: 'Поселения работают локально и офлайн. Они хранятся только на этом устройстве.' },
  uk: { menu: 'ПОСЕЛЕННЯ', open: 'ВІДКРИТИ ЛОКАЛЬНІ ПОСЕЛЕННЯ', back: 'НАЗАД ДО ОСОБИСТОЇ МАПИ', info: 'Поселення працюють локально та офлайн. Вони зберігаються лише на цьому пристрої.' },
  pl: { menu: 'OSADY', open: 'OTWÓRZ LOKALNE OSADY', back: 'WRÓĆ DO MAPY OSOBISTEJ', info: 'Osady działają lokalnie i offline. Są zapisywane tylko na tym urządzeniu.' },
};

export default function MapScreen(props) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const text = COPY[language] || COPY.en;
  const [sharedOpen, setSharedOpen] = useState(false);
  return <div className="pip-map-with-settlement-menu">
    <div className="pip-map-settlement-toolbar">
      <span className="pip-map-settlement-toolbar__title">⌂ {text.menu}</span>
      <button type="button" className="pip-action-button pip-map-settlement-toolbar__button" onClick={() => setSharedOpen(value => !value)}>
        {sharedOpen ? `← ${text.back}` : text.open}
      </button>
    </div>
    {sharedOpen ? <>
      <p>{text.info}</p>
      <LocalSettlementPanel language={language} character={props.character}/>
    </> : <MapScreenCore {...props} />}
  </div>;
}
