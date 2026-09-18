import React from 'react';
import { getSettlementRulebookSnapshot } from '../../utils/settlementDayEngine.js';
import { provisions } from '../../utils/settlementProvisions.js';

const COPY = {
  en: { title:'Daily needs', residents:'Residents needing supplies', food:'Food reserve', water:'Water reserve', use:'Reserve 2 → +1 next day', queued:'Prepared for next day', hint:'Each unmet need reduces happiness by 1. Robots do not need food, water or beds.', needs:['Beds','Food','Water','Defense'] },
  ru: { title:'Потребности на день', residents:'Жители с потребностями', food:'Запас еды', water:'Запас воды', use:'Выделить 2 → +1 на следующий день', queued:'Подготовлено на следующий день', hint:'За каждую нехватку счастье снижается на 1. Роботам не нужны еда, вода и кровати.', needs:['Кровати','Еда','Вода','Защита'] },
  uk: { title:'Потреби на день', residents:'Мешканці з потребами', food:'Запас їжі', water:'Запас води', use:'Виділити 2 → +1 на наступний день', queued:'Підготовлено на наступний день', hint:'Кожна нестача зменшує щастя на 1. Роботам не потрібні їжа, вода та ліжка.', needs:['Ліжка','Їжа','Вода','Захист'] },
  pl: { title:'Dzienne potrzeby', residents:'Mieszkańcy z potrzebami', food:'Zapas żywności', water:'Zapas wody', use:'Przeznacz 2 → +1 na kolejny dzień', queued:'Przygotowane na kolejny dzień', hint:'Każdy niedobór zmniejsza szczęście o 1. Roboty nie potrzebują jedzenia, wody ani łóżek.', needs:['Łóżka','Żywność','Woda','Obrona'] },
};
export default function SettlementDailySummary({settlement,language,canEdit,onSupply}) {
  const t=COPY[language] || COPY.en, stats=getSettlementRulebookSnapshot(settlement), stock=provisions(settlement.stockpile);
  return <section className="settlement-daily-summary"><h3>{t.title}</h3><small>{t.residents}: {stats.needsPeople}</small>
    {['beds','food','water','defense'].map((key,i)=><div className="settlement-balance" key={key}><span>{t.needs[i]}</span><b>{stats[key]<stats.needsPeople?'⚠ ':'✓ '}{stats[key]} / {stats.needsPeople}</b></div>)}
    <p>{t.hint}</p>
    {['food','water'].map(key=><div key={key}><div className="settlement-balance"><span>{t[key]}</span><b>{stock[key]}</b></div><button type="button" className="pip-action-button" disabled={!canEdit || stock[key]<2} onClick={()=>onSupply(key)}>{t.use}</button><small>{t.queued}: +{settlement.nextDaySupplies?.[key] || 0}</small></div>)}
  </section>;
}
