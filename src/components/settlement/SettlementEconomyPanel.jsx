import React, { useMemo } from "react";
import { getSettlementDailyForecast, normalizeStockpile } from "../../utils/settlementDayEngine.js";
import { buildingUpgradeInfo, cost } from "../../utils/settlementDevelopment.js";
import { getRulebookBuilding } from "../../data/settlement/rulebookCatalog.js";
import { SETTLEMENT_BUILDINGS, settlementBuildingName } from "../../data/settlement/buildings.js";
import { getSettlementOperatingCosts } from "../../utils/settlementOperatingCosts.js";

const VALUE={common:5,uncommon:12,rare:30};
const COPY={
  en:{title:"ECONOMY",treasury:"Treasury",daily:"Net / day",gross:"Gross income",costs:"Operating costs",debt:"Maintenance debt",wages:"Worker wages",turnover:"Today's trade turnover",net:"Trade net",stock:"Estimated stock value",upgrades:"UPGRADE ECONOMICS",payback:"Payback",days:"days",resource:"resource upgrade",noTrades:"No trades today"},
  ru:{title:"ЭКОНОМИКА",treasury:"Казна",daily:"Чистыми / день",gross:"Валовый доход",costs:"Содержание",debt:"Долг по содержанию",wages:"Зарплата работников",turnover:"Торговый оборот сегодня",net:"Чистый итог торговли",stock:"Оценка запасов",upgrades:"ЭКОНОМИКА УЛУЧШЕНИЙ",payback:"Окупаемость",days:"дней",resource:"ресурсное улучшение",noTrades:"Сегодня сделок нет"},
  uk:{title:"ЕКОНОМІКА",treasury:"Казна",daily:"Чистими / день",gross:"Валовий дохід",costs:"Утримання",debt:"Борг за утримання",wages:"Зарплата працівників",turnover:"Торговий оборот сьогодні",net:"Чистий підсумок торгівлі",stock:"Оцінка запасів",upgrades:"ЕКОНОМІКА ПОКРАЩЕНЬ",payback:"Окупність",days:"днів",resource:"ресурсне покращення",noTrades:"Сьогодні угод немає"},
  pl:{title:"EKONOMIA",treasury:"Skarbiec",daily:"Netto / dzień",gross:"Przychód brutto",costs:"Koszty utrzymania",debt:"Dług utrzymania",wages:"Płace pracowników",turnover:"Dzisiejszy obrót",net:"Bilans handlu",stock:"Szacowana wartość zapasów",upgrades:"EKONOMIA ULEPSZEŃ",payback:"Zwrot",days:"dni",resource:"ulepszenie zasobów",noTrades:"Brak transakcji dzisiaj"},
};
function upgradeCapGain(settlement,building,info){
  if(!info)return 0;
  const current=getRulebookBuilding(building.type)||{},target=getRulebookBuilding(info.targetType)||current;
  if(building.type==="caravan_post"&&info.rule?.levelOnly)return 10;
  const people=(settlement.settlers||[]).length,mult=Math.floor(people/5);
  const from=Number(current.effects?.income||0)*mult,to=Number(target.effects?.income||0)*mult;
  return Math.max(0,(to-from)*10);
}
export default function SettlementEconomyPanel({settlement,language="en",market}){
  const t=COPY[language]||COPY.en;
  const forecast=useMemo(()=>getSettlementDailyForecast(settlement),[settlement]);
  const stock=useMemo(()=>normalizeStockpile(settlement.stockpile,settlement.resources?.materials),[settlement.stockpile,settlement.resources?.materials]);
  const operating=useMemo(()=>getSettlementOperatingCosts(settlement),[settlement]);
  const day=Number(settlement.settlementDay||1);
  const ledger=(settlement.marketLedger||[]).filter(row=>Number(row.day||0)===day);
  const turnover=ledger.reduce((sum,row)=>sum+Math.abs(Number(row.caps||0)),0);
  const net=ledger.reduce((sum,row)=>sum+Number(row.settlementCapsDelta||0),0);
  const stockValue=Math.floor(Number(stock.materials.common||0)*VALUE.common+Number(stock.materials.uncommon||0)*VALUE.uncommon+Number(stock.materials.rare||0)*VALUE.rare);
  const upgrades=(settlement.buildings||[]).map(building=>({building,info:buildingUpgradeInfo(building)})).filter(row=>row.info);
  const dailyCaps=forecast.caps.totalMin===forecast.caps.totalMax?("+"+forecast.caps.totalMin):("+"+forecast.caps.totalMin+"–"+forecast.caps.totalMax);
  return <div className="settlement-economy-panel">
    <div className="pip-panel-title">{t.title}</div>
    <div className="settlement-economy-grid">
      <article><span>{t.treasury}</span><b>{Math.floor(Number(settlement.resources?.caps||0))}</b></article>
      <article><span>{t.daily}</span><b>{dailyCaps}</b></article>
      <article><span>{t.gross}</span><b>+{forecast.caps.grossMin===forecast.caps.grossMax?forecast.caps.grossMin:(forecast.caps.grossMin+"–"+forecast.caps.grossMax)}</b></article>
      <article><span>{t.costs}</span><b>−{operating.daily}</b><small>{t.wages}: {operating.wages}</small></article>
      <article><span>{t.debt}</span><b>{operating.debtBefore}</b></article>
      <article><span>{t.turnover}</span><b>{turnover}</b></article>
      <article><span>{t.net}</span><b>{net>0?("+"+net):net}</b></article>
      <article><span>{t.stock}</span><b>≈ {stockValue}</b></article>
      <article><span>Market Tier</span><b>{market?.tier||0}</b></article>
    </div>
    <section className="settlement-economy-ledger">
      <strong>{t.turnover}</strong>
      {ledger.length?ledger.slice(0,8).map(row=><span key={row.id}>{row.label||row.type} · {row.settlementCapsDelta>0?"+":""}{row.settlementCapsDelta} caps</span>):<small>{t.noTrades}</small>}
    </section>
    <section className="settlement-economy-upgrades">
      <strong>{t.upgrades}</strong>
      {upgrades.map(({building,info})=>{
        const c=cost(info.rule),equivalent=Math.ceil(Number(c.caps||0)+Number(c.common||0)*VALUE.common+Number(c.uncommon||0)*VALUE.uncommon+Number(c.rare||0)*VALUE.rare);
        const gain=upgradeCapGain(settlement,building,info),payback=gain>0?Math.ceil(equivalent/gain):null;
        return <div className="settlement-economy-upgrade" key={building.id}>
          <div><b>{settlementBuildingName(SETTLEMENT_BUILDINGS[building.type],language)}</b><small>Lv {info.level} → {info.nextLevel}</small></div>
          <span>≈ {equivalent} caps</span>
          <small>{payback?(t.payback+": "+payback+" "+t.days):t.resource}</small>
        </div>;
      })}
    </section>
  </div>;
}
