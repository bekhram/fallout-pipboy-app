import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MapScreenCore from './MapScreenCore.jsx';
import CampaignPanel from '../campaign/CampaignPanel.jsx';
import SettlementScreen from '../settlement/SettlementScreen.jsx';
import { createSettlement } from '../../utils/settlementState.js';
import { readLegacySettlementArchive } from '../../utils/legacySettlementArchive.js';
import './mapSettlement.css';

const COPY = {
  en: { menu: 'SETTLEMENTS', open: 'OPEN SHARED SETTLEMENTS', demo: 'RTS DEMO', back: 'BACK TO PERSONAL MAP', info: 'Settlements belong to saved campaigns. Choose the same campaign here and on the GM screen.', archive: 'A retired personal settlement save is still stored on this device. It is not used for gameplay or automatically added to shared resources.', export: 'EXPORT OLD SAVE', failed: 'Could not export the old save. The original data has not been changed.' },
  ru: { menu: 'ПОСЕЛЕНИЯ', open: 'ОТКРЫТЬ ОБЩИЕ ПОСЕЛЕНИЯ', demo: 'RTS ДЕМО', back: 'НАЗАД К ЛИЧНОЙ КАРТЕ', info: 'Поселения принадлежат сохранённым кампаниям. Выберите ту же кампанию, что и на экране ГМ.', archive: 'На этом устройстве осталось сохранение прежнего личного поселения. Оно не участвует в игре и не добавляется автоматически к общим ресурсам.', export: 'ЭКСПОРТ СТАРОГО СОХРАНЕНИЯ', failed: 'Не удалось экспортировать старое сохранение. Исходные данные не изменены.' },
  uk: { menu: 'ПОСЕЛЕННЯ', open: 'ВІДКРИТИ СПІЛЬНІ ПОСЕЛЕННЯ', demo: 'RTS ДЕМО', back: 'НАЗАД ДО ОСОБИСТОЇ МАПИ', info: 'Поселення належать збереженим кампаніям. Оберіть ту саму кампанію, що й на екрані ГМ.', archive: 'На цьому пристрої залишилося збереження колишнього особистого поселення. Воно не бере участі у грі й не додається автоматично до спільних ресурсів.', export: 'ЕКСПОРТ СТАРОГО ЗБЕРЕЖЕННЯ', failed: 'Не вдалося експортувати старе збереження. Початкові дані не змінено.' },
  pl: { menu: 'OSADY', open: 'OTWÓRZ WSPÓLNE OSADY', demo: 'DEMO RTS', back: 'WRÓĆ DO MAPY OSOBISTEJ', info: 'Osady należą do zapisanych kampanii. Wybierz tę samą kampanię co na ekranie MG.', archive: 'Na tym urządzeniu pozostał zapis dawnej osobistej osady. Nie uczestniczy w grze i nie jest automatycznie dodawany do wspólnych zasobów.', export: 'EKSPORTUJ STARY ZAPIS', failed: 'Nie udało się wyeksportować starego zapisu. Oryginalne dane nie zostały zmienione.' },
};

function createRtsDemoSettlement() {
  const base = createSettlement({ name: 'RTS Demo', regionId: 'commonwealth', worldX: 12, worldY: 12 });
  const now = Date.now();
  const active = (id, type, x, y) => ({ id, type, x, y, rotation: 0, state: 'active', condition: 100, startedAt: now, completedAt: now, rooms: [] });
  const buildings = [
    ...(base.buildings || []),
    active('demo_farm', 'crop_field', 3, 3),
    active('demo_water', 'water_pump', 8, 3),
    active('demo_generator', 'generator', 17, 3),
    active('demo_guard', 'guard_post', 3, 17),
    active('demo_workshop', 'workshop', 17, 17),
  ];
  const jobs = [
    { type: 'tend_crops', targetBuildingId: 'demo_farm' },
    { type: 'guard', targetBuildingId: 'demo_guard' },
    { type: 'scavenging' },
    { type: 'hunting_gathering' },
  ];
  const names = ['Mara', 'Boone', 'Ada', 'Cooper'];
  return {
    ...base,
    name: 'RTS Demo',
    buildings,
    stockpile: { ...(base.stockpile || {}), materials: { common: 250, uncommon: 40, rare: 10 }, provisions: { food: 20, water: 20 } },
    resources: { ...(base.resources || {}), caps: 500, materials: 250 },
    settlers: (base.settlers || []).map((settler, index) => ({
      ...settler,
      name: names[index] || settler.name,
      settlementAction: jobs[index] || null,
      assignedBuildingId: jobs[index]?.targetBuildingId || null,
      status: jobs[index] ? 'working' : 'idle',
    })),
  };
}

export default function MapScreen(props) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const text = COPY[language] || COPY.en;
  const [sharedOpen, setSharedOpen] = useState(false);
  const [demo, setDemo] = useState(null);
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
  if (demo) return <SettlementScreen settlement={demo} canEdit onUpdate={update => setDemo(current => typeof update === 'function' ? update(current) : update)} onBack={() => setDemo(null)} />;
  return <div className="pip-map-with-settlement-menu">
    <div className="pip-map-settlement-toolbar">
      <span className="pip-map-settlement-toolbar__title">⌂ {text.menu}</span>
      <div className="pip-map-settlement-toolbar__actions">
        <button type="button" className="pip-action-button pip-map-settlement-toolbar__button pip-map-settlement-toolbar__demo" onClick={() => { setSharedOpen(false); setDemo(createRtsDemoSettlement()); }}>
          {text.demo}
        </button>
        <button type="button" className="pip-action-button pip-map-settlement-toolbar__button" onClick={() => setSharedOpen(value => !value)}>
          {sharedOpen ? `← ${text.back}` : text.open}
        </button>
      </div>
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
