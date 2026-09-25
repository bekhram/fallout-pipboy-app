import React from 'react';
import { getSettlementDailyForecast, getSettlementRulebookSnapshot } from '../../utils/settlementDayEngine.js';
import { provisions } from '../../utils/settlementProvisions.js';
import { SETTLEMENT_BUILDINGS, settlementBuildingName } from '../../data/settlement/buildings.js';

const COPY = {
  en:{title:'DAILY PRODUCTION',needs:'Daily needs',food:'Food',water:'Water',caps:'Caps',materials:'Materials',power:'Power',defense:'Defense',produced:'Produced',consumed:'Consumed',net:'Net',stores:'Stores',caravan:'Caravan',scrap:'Scavenging',commonBonus:'Common bonus',random:'random',idle:'IDLE BUILDINGS',noWorker:'needs worker',noPower:'no power',residents:'Residents needing supplies',reserveFood:'Food reserve',reserveWater:'Water reserve',use:'Reserve 2 → +1 next day',queued:'Prepared for next day',hint:'Each unmet need reduces happiness by 1. Robots do not need food, water or beds.',needsLabels:['Beds','Food','Water','Defense']},
  ru:{title:'ПРОИЗВОДСТВО ЗА ДЕНЬ',needs:'Потребности за день',food:'Еда',water:'Вода',caps:'Крышки',materials:'Материалы',power:'Энергия',defense:'Защита',produced:'Производство',consumed:'Потребление',net:'Итог',stores:'Магазины',caravan:'Караван',scrap:'Сбор хлама',commonBonus:'Бонус Common',random:'случайно',idle:'ПРОСТАИВАЮТ',noWorker:'нужен работник',noPower:'нет энергии',residents:'Жители с потребностями',reserveFood:'Запас еды',reserveWater:'Запас воды',use:'Выделить 2 → +1 на следующий день',queued:'Подготовлено на следующий день',hint:'За каждую нехватку счастье снижается на 1. Роботам не нужны еда, вода и кровати.',needsLabels:['Кровати','Еда','Вода','Защита']},
  uk:{title:'ВИРОБНИЦТВО ЗА ДЕНЬ',needs:'Потреби за день',food:'Їжа',water:'Вода',caps:'Кришки',materials:'Матеріали',power:'Енергія',defense:'Захист',produced:'Виробництво',consumed:'Споживання',net:'Підсумок',stores:'Крамниці',caravan:'Караван',scrap:'Збір брухту',commonBonus:'Бонус Common',random:'випадково',idle:'ПРОСТОЮЮТЬ',noWorker:'потрібен працівник',noPower:'немає енергії',residents:'Мешканці з потребами',reserveFood:'Запас їжі',reserveWater:'Запас води',use:'Виділити 2 → +1 на наступний день',queued:'Підготовлено на наступний день',hint:'Кожна нестача зменшує щастя на 1. Роботам не потрібні їжа, вода та ліжка.',needsLabels:['Ліжка','Їжа','Вода','Захист']},
  pl:{title:'DZIENNA PRODUKCJA',needs:'Dzienne potrzeby',food:'Żywność',water:'Woda',caps:'Kapsle',materials:'Materiały',power:'Energia',defense:'Obrona',produced:'Produkcja',consumed:'Zużycie',net:'Bilans',stores:'Sklepy',caravan:'Karawana',scrap:'Zbieranie złomu',commonBonus:'Bonus Common',random:'losowo',idle:'PRZESTOJE',noWorker:'potrzebny pracownik',noPower:'brak energii',residents:'Mieszkańcy z potrzebami',reserveFood:'Zapas żywności',reserveWater:'Zapas wody',use:'Przeznacz 2 → +1 na kolejny dzień',queued:'Przygotowane na kolejny dzień',hint:'Każdy niedobór zmniejsza szczęście o 1. Roboty nie potrzebują jedzenia, wody ani łóżek.',needsLabels:['Łóżka','Żywność','Woda','Obrona']},
};

function signed(value){const n=Number(value||0);return n>0?`+${n}`:String(n);}
export default function SettlementDailySummary({settlement,language,canEdit,onSupply}){
  const t=COPY[language]||COPY.en;
  const stats=getSettlementRulebookSnapshot(settlement);
  const forecast=getSettlementDailyForecast(settlement);
  const stock=provisions(settlement.stockpile);
  return <div className="settlement-daily-dashboard">
    <section className="settlement-daily-production">
      <h3>{t.title}</h3>
      <div className="settlement-daily-grid">
        <article><span>🌾 {t.food}</span><b>{signed(forecast.food.net)}/day</b><small>{t.produced} {forecast.food.produced} · {t.consumed} {forecast.food.consumed}</small></article>
        <article><span>💧 {t.water}</span><b>{signed(forecast.water.net)}/day</b><small>{t.produced} {forecast.water.produced} · crops −{forecast.water.cropUse} · {t.consumed} {forecast.water.consumed}</small></article>
        <article><span>¤ {t.caps}</span><b>{forecast.caps.totalMin===forecast.caps.totalMax?`+${forecast.caps.totalMin}`:`+${forecast.caps.totalMin}–${forecast.caps.totalMax}`}/day</b><small>{t.stores} +{forecast.caps.stores} · {t.caravan} +{forecast.caps.caravanMin}–{forecast.caps.caravanMax}</small></article>
        <article><span>⚙ {t.materials}</span><b>{forecast.materials.dice?forecast.materials.dice+' CD/day':'0/day'}</b><small>{t.scrap}: damage→Common · Effects→Uncommon{forecast.materials.commonBonus?` · +${forecast.materials.commonBonus} Common`:''}{forecast.materials.caravanRuns?` · ${t.caravan}: ${t.random}`:''}</small></article>
        <article><span>ϟ {t.power}</span><b>{forecast.power.produced}/{forecast.power.consumed}</b><small>{t.net}: {signed(forecast.power.available)}{forecast.power.deficit?` · deficit ${forecast.power.deficit}`:''}</small></article>
        <article><span>⬟ {t.defense}</span><b>{forecast.defense}</b><small>{stats.needsPeople} residents</small></article>
      </div>
      {forecast.idleBuildings.length?<div className="settlement-daily-idle"><strong>{t.idle}</strong>{forecast.idleBuildings.map((item,index)=>{const def=SETTLEMENT_BUILDINGS[item.type];return <span key={item.id+'-'+index}>! {settlementBuildingName(def,language)||item.type} · {item.reason==='no_power'?t.noPower:t.noWorker}</span>})}</div>:null}
    </section>

    <section className="settlement-daily-summary">
      <h3>{t.needs}</h3><small>{t.residents}: {stats.needsPeople}</small>
      {['beds','food','water','defense'].map((key,i)=><div className="settlement-balance" key={key}><span>{t.needsLabels[i]}</span><b>{stats[key]<stats.needsPeople?'⚠ ':'✓ '}{stats[key]} / {stats.needsPeople}</b></div>)}
      <p>{t.hint}</p>
      {[['food',t.reserveFood],['water',t.reserveWater]].map(([key,label])=><div key={key}><div className="settlement-balance"><span>{label}</span><b>{stock[key]}</b></div><button type="button" className="pip-action-button" disabled={!canEdit||stock[key]<2} onClick={()=>onSupply(key)}>{t.use}</button><small>{t.queued}: +{settlement.nextDaySupplies?.[key]||0}</small></div>)}
    </section>
  </div>;
}
