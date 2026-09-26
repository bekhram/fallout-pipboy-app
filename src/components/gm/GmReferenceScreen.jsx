import React from "react";
import { useTranslation } from "react-i18next";
import { WINTER_TERRAIN, WINTER_OBSTACLES, WINTER_CONDITIONS } from "../../utils/winterOfAtomRules.js";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import "./gmReferenceScreen.css";

const COPY={
  en:{title:"GM REFERENCE",subtitle:"Quick rules, hazards and procedural room notes",terrain:"TERRAIN / OBSTACLES",conditions:"CONDITIONS",rooms:"ROOM DESCRIPTIONS",economy:"GM AP ENCOUNTER ACTIONS",complications:"ENCOUNTER COMPLICATIONS",cost:"Cost",action:"Action",effect:"Effect",spend:"SPEND",random:"RANDOM COMPLICATION · 2 AP",choose:"CHOOSE · 3 AP",gmAp:"GM AP",notEnough:"Not enough GM AP",recent:"RECENT GM AP EVENTS"},
  ru:{title:"ПОДСКАЗКИ ГМУ",subtitle:"Быстрые правила, опасности и описания процедурных комнат",terrain:"МЕСТНОСТЬ / ПРЕПЯТСТВИЯ",conditions:"УСЛОВИЯ",rooms:"ОПИСАНИЕ КОМНАТ",economy:"ДЕЙСТВИЯ ГМА ЗА AP",complications:"ОСЛОЖНЕНИЯ ЭНКАУНТЕРА",cost:"Цена",action:"Действие",effect:"Эффект",spend:"КУПИТЬ",random:"СЛУЧАЙНОЕ ОСЛОЖНЕНИЕ · 2 AP",choose:"ВЫБРАТЬ · 3 AP",gmAp:"AP ГМа",notEnough:"Недостаточно AP ГМа",recent:"ПОСЛЕДНИЕ СОБЫТИЯ GM AP"},
  uk:{title:"ПІДКАЗКИ ГМУ",subtitle:"Швидкі правила, небезпеки та описи процедурних кімнат",terrain:"МІСЦЕВІСТЬ / ПЕРЕШКОДИ",conditions:"УМОВИ",rooms:"ОПИС КІМНАТ",economy:"ДІЇ ГМА ЗА AP",complications:"УСКЛАДНЕННЯ ЕНКАУНТЕРА",cost:"Ціна",action:"Дія",effect:"Ефект",spend:"КУПИТИ",random:"ВИПАДКОВЕ УСКЛАДНЕННЯ · 2 AP",choose:"ОБРАТИ · 3 AP",gmAp:"AP ГМа",notEnough:"Недостатньо AP ГМа",recent:"ОСТАННІ ПОДІЇ GM AP"},
  pl:{title:"ŚCIĄGA MG",subtitle:"Szybkie zasady, zagrożenia i opisy proceduralnych pomieszczeń",terrain:"TEREN / PRZESZKODY",conditions:"WARUNKI",rooms:"OPISY POMIESZCZEŃ",economy:"AKCJE MG ZA AP",complications:"KOMPLIKACJE SPOTKANIA",cost:"Koszt",action:"Akcja",effect:"Efekt",spend:"WYDAJ",random:"LOSOWA KOMPLIKACJA · 2 AP",choose:"WYBIERZ · 3 AP",gmAp:"AP MG",notEnough:"Za mało AP MG",recent:"OSTATNIE ZDARZENIA GM AP"},
};
function lang(value){const code=String(value||"en").toLowerCase().split("-")[0];return COPY[code]?code:"en";}

export const GM_AP_ACTIONS=[
  {id:"position",cost:1,name:{en:"Tactical position",ru:"Выгодная позиция",uk:"Вигідна позиція",pl:"Pozycja taktyczna"},effect:{en:"One NPC takes a better position or cover. No free attack.",ru:"Один NPC занимает более выгодную позицию или укрытие. Без бесплатной атаки.",uk:"Один NPC займає кращу позицію або укриття. Без безкоштовної атаки.",pl:"Jeden NPC zajmuje lepszą pozycję lub osłonę. Bez darmowego ataku."}},
  {id:"hazard",cost:1,name:{en:"Minor hazard",ru:"Опасная местность",uk:"Небезпечна місцевість",pl:"Małe zagrożenie"},effect:{en:"Add a small logical hazard to one zone.",ru:"Добавить небольшой логичный hazard в одну зону.",uk:"Додати невелику логічну небезпеку в одну зону.",pl:"Dodaj małe logiczne zagrożenie w jednej strefie."}},
  {id:"pressure",cost:1,name:{en:"Pressure",ru:"Давление",uk:"Тиск",pl:"Presja"},effect:{en:"Next specific test gets +1 Difficulty, up to D5.",ru:"Следующая конкретная проверка получает +1 сложности, максимум D5.",uk:"Наступна конкретна перевірка отримує +1 складності, максимум D5.",pl:"Następny konkretny test otrzymuje +1 trudności, maks. D5."}},
  {id:"reinforcement_timer",cost:1,name:{en:"Accelerate reinforcement",ru:"Ускорить подкрепление",uk:"Прискорити підкріплення",pl:"Przyspiesz posiłki"},effect:{en:"Reduce an already planned reinforcement timer by 1 round.",ru:"Снизить таймер уже запланированного подкрепления на 1 раунд.",uk:"Зменшити таймер уже запланованого підкріплення на 1 раунд.",pl:"Skróć licznik zaplanowanych posiłków o 1 rundę."}},
  {id:"minions",cost:2,name:{en:"Minor reinforcement",ru:"Малое подкрепление",uk:"Мале підкріплення",pl:"Małe posiłki"},effect:{en:"Add 1–2 Minions where fiction supports it.",ru:"Добавить 1–2 миньона, если это логично для сцены.",uk:"Додати 1–2 міньйони, якщо це логічно для сцени.",pl:"Dodaj 1–2 Minionów, jeśli pasuje to do sceny."}},
  {id:"trap",cost:2,name:{en:"Trigger trap",ru:"Активировать ловушку",uk:"Активувати пастку",pl:"Uruchom pułapkę"},effect:{en:"A prepared trap or scene object activates.",ru:"Срабатывает подготовленная ловушка или объект сцены.",uk:"Спрацьовує підготовлена пастка або об'єкт сцени.",pl:"Aktywuje się przygotowana pułapka lub obiekt sceny."}},
  {id:"reroll",cost:2,name:{en:"NPC reroll",ru:"Переброс NPC",uk:"Перекид NPC",pl:"Przerzut NPC"},effect:{en:"Reroll one NPC d20; the new result stands.",ru:"Перебросить один d20 NPC; новый результат обязателен.",uk:"Перекинути один d20 NPC; новий результат обов'язковий.",pl:"Przerzuć jeden d20 NPC; nowy wynik obowiązuje."}},
  {id:"damage",cost:2,name:{en:"+2 Combat Dice",ru:"+2 Combat Dice",uk:"+2 Combat Dice",pl:"+2 Combat Dice"},effect:{en:"Add +2 CD to one NPC attack before damage is rolled.",ru:"Добавить +2 CD к одной атаке NPC до броска урона.",uk:"Додати +2 CD до однієї атаки NPC до кидка шкоди.",pl:"Dodaj +2 CD do jednego ataku NPC przed rzutem obrażeń."}},
  {id:"standard",cost:3,name:{en:"Standard reinforcement",ru:"Стандартное подкрепление",uk:"Стандартне підкріплення",pl:"Standardowe posiłki"},effect:{en:"Add 1 Standard NPC or about 3 Minions.",ru:"Добавить 1 Standard NPC или примерно 3 миньона.",uk:"Додати 1 Standard NPC або приблизно 3 міньйони.",pl:"Dodaj 1 Standard NPC lub około 3 Minionów."}},
  {id:"major_complication",cost:3,name:{en:"Major complication",ru:"Сильное осложнение",uk:"Сильне ускладнення",pl:"Poważna komplikacja"},effect:{en:"Choose a high-impact complication from the table.",ru:"Выбрать сильное осложнение из таблицы.",uk:"Обрати сильне ускладнення з таблиці.",pl:"Wybierz silną komplikację z tabeli."}},
  {id:"special",cost:4,name:{en:"Special reinforcement",ru:"Special подкрепление",uk:"Special підкріплення",pl:"Posiłki Special"},effect:{en:"Add 1 Special NPC. Usually once per encounter.",ru:"Добавить 1 Special NPC. Обычно один раз за энкаунтер.",uk:"Додати 1 Special NPC. Зазвичай один раз за енкаунтер.",pl:"Dodaj 1 Special NPC. Zwykle raz na spotkanie."}},
  {id:"critical",cost:4,name:{en:"Critical scene change",ru:"Критическое изменение сцены",uk:"Критична зміна сцени",pl:"Krytyczna zmiana sceny"},effect:{en:"Major collapse, fire, radiation burst or system failure; players must have a response.",ru:"Крупный обвал, пожар, радиационный выброс или отказ системы; у игроков должен быть способ реагировать.",uk:"Великий обвал, пожежа, радіаційний викид або відмова системи; гравці мають мати спосіб реагувати.",pl:"Duży zawal, pożar, wyrzut promieniowania lub awaria; gracze muszą mieć możliwość reakcji."}},
  {id:"legendary",cost:5,name:{en:"Legendary escalation",ru:"Легендарная эскалация",uk:"Легендарна ескалація",pl:"Legendarna eskalacja"},effect:{en:"Activate a boss phase or legendary ability.",ru:"Активировать новую фазу босса или легендарную способность.",uk:"Активувати нову фазу боса або легендарну здатність.",pl:"Aktywuj nową fazę bossa lub legendarną zdolność."}},
  {id:"wave",cost:5,name:{en:"Second wave",ru:"Вторая волна",uk:"Друга хвиля",pl:"Druga fala"},effect:{en:"Introduce a prepared full reinforcement wave.",ru:"Ввести подготовленную полноценную волну подкрепления.",uk:"Ввести підготовлену повну хвилю підкріплення.",pl:"Wprowadź przygotowaną pełną falę posiłków."}},
];

export const GM_COMPLICATIONS=[
  ["Ammo pressure","Боеприпасы на исходе","Боєприпаси закінчуються","Brak amunicji","A character faces an ammo/reload problem.","У персонажа возникает проблема с боезапасом/перезарядкой.","Персонаж має проблему з боєзапасом/перезаряджанням.","Postać ma problem z amunicją/przeładowaniem."],
  ["Weapon jam","Заклинивание оружия","Заклинювання зброї","Zacięcie broni","Weapon needs an action/test to restore.","Оружие требует действия/проверки для восстановления.","Зброя потребує дії/перевірки для відновлення.","Broń wymaga akcji/testu, by ją przywrócić."],
  ["Cover lost","Потеря укрытия","Втрата укриття","Utrata osłony","Current cover is destroyed or negated.","Текущее укрытие разрушается или перестаёт защищать.","Поточне укриття руйнується або перестає захищати.","Obecna osłona zostaje zniszczona lub przestaje działać."],
  ["Collapse","Обвал","Обвал","Zawal","Part of the zone becomes difficult terrain.","Часть зоны становится труднопроходимой.","Частина зони стає важкопрохідною.","Część strefy staje się trudnym terenem."],
  ["Smoke","Дым","Дим","Dym","Visibility drops; ranged attacks become harder.","Видимость ухудшается; дальние атаки сложнее.","Видимість погіршується; дальні атаки складніші.","Widoczność spada; ataki dystansowe są trudniejsze."],
  ["Fire","Пожар","Пожежа","Pożar","A dangerous zone deals periodic damage.","Появляется опасная зона с периодическим уроном.","З'являється небезпечна зона з періодичною шкодою.","Powstaje niebezpieczna strefa z okresowymi obrażeniami."],
  ["Radiation leak","Радиационная утечка","Радіаційний витік","Wyciek radiacji","A radiation hazard appears.","Возникает зона радиационной опасности.","З'являється зона радіаційної небезпеки.","Pojawia się zagrożenie radiacyjne."],
  ["Electrical surge","Электрический разряд","Електричний розряд","Przepięcie","Technology, robots or power armor face extra danger.","Техника, роботы или силовая броня получают дополнительную угрозу.","Техніка, роботи або силова броня отримують додаткову загрозу.","Technologia, roboty lub pancerz wspomagany są bardziej zagrożone."],
  ["Slippery surface","Скользкая поверхность","Слизька поверхня","Śliska powierzchnia","Movement may require a test or cause prone.","Перемещение требует проверки или персонаж падает.","Переміщення потребує перевірки або персонаж падає.","Ruch może wymagać testu lub spowodować upadek."],
  ["Blocked door","Заклинившая дверь","Заклинені двері","Zablokowane drzwi","One passage is temporarily blocked.","Один проход временно блокируется.","Один прохід тимчасово блокується.","Jedno przejście zostaje tymczasowo zablokowane."],
  ["Dropped item","Потерянный предмет","Втрачений предмет","Upuszczony przedmiot","A small item is knocked into a nearby zone.","Небольшой предмет отлетает в соседнюю зону.","Невеликий предмет відлітає в сусідню зону.","Mały przedmiot wypada do sąsiedniej strefy."],
  ["Enemy position","Враг занял позицию","Ворог зайняв позицію","Pozycja wroga","One NPC takes better cover/position.","Один NPC бесплатно занимает более выгодное укрытие/позицию.","Один NPC безкоштовно займає кращу позицію/укриття.","Jeden NPC zajmuje lepszą pozycję/osłonę."],
  ["Flank","Фланг","Фланг","Flanka","A new dangerous attack angle opens.","Появляется новый опасный угол атаки.","З'являється новий небезпечний кут атаки.","Pojawia się nowy niebezpieczny kierunek ataku."],
  ["Minor reinforcement","Малое подкрепление","Мале підкріплення","Małe posiłki","1–2 Minions arrive next round.","Через 1 раунд появляются 1–2 миньона.","Через 1 раунд з'являються 1–2 міньйони.","Za 1 rundę pojawia się 1–2 Minionów."],
  ["Alarm / noise","Сирена / шум","Сирена / шум","Alarm / hałas","Noise raises the chance of another threat.","Шум повышает шанс следующей угрозы/волны.","Шум підвищує шанс наступної загрози/хвилі.","Hałas zwiększa szansę kolejnego zagrożenia/fali."],
  ["Civilian / neutral","Гражданский / нейтрал","Цивільний / нейтрал","Cywil / neutralny","A neutral appears and changes priorities.","Появляется нейтрал, которого нужно учитывать или защищать.","З'являється нейтрал, якого треба враховувати або захищати.","Pojawia się neutralna osoba zmieniająca priorytety."],
  ["Dangerous mechanism","Опасный механизм","Небезпечний механізм","Niebezpieczny mechanizm","A turret, conveyor or machinery alters the battlefield.","Турель, конвейер или механизм меняет поле боя.","Турель, конвеєр або механізм змінює поле бою.","Wieżyczka, taśma lub mechanizm zmienia pole walki."],
  ["Lights out","Потеря света","Втрата світла","Brak światła","Lighting worsens and visibility modifiers change.","Освещение ухудшается, меняются модификаторы видимости.","Освітлення погіршується, змінюються модифікатори видимості.","Oświetlenie pogarsza się, zmieniając modyfikatory widoczności."],
  ["Major escalation","Серьёзная эскалация","Серйозна ескалація","Poważna eskalacja","A Standard NPC or serious hazard appears next round.","Через 1 раунд появляется Standard NPC или серьёзный hazard.","Через 1 раунд з'являється Standard NPC або серйозна небезпека.","Za 1 rundę pojawia się Standard NPC lub poważne zagrożenie."],
  ["Critical complication","Критическое осложнение","Критичне ускладнення","Krytyczna komplikacja","Choose two compatible complications or one major narrative escalation.","Выберите два совместимых осложнения или одну сильную сюжетную эскалацию.","Оберіть два сумісні ускладнення або одну сильну сюжетну ескалацію.","Wybierz dwie zgodne komplikacje lub jedną dużą eskalację fabularną."],
].map((row,index)=>({roll:index+1,name:{en:row[0],ru:row[1],uk:row[2],pl:row[3]},effect:{en:row[4],ru:row[5],uk:row[6],pl:row[7]}}));

export default function GmReferenceScreen({session}){
  const {i18n}=useTranslation();
  const language=lang(i18n.resolvedLanguage||i18n.language),text=COPY[language];
  const scene=session?.tacticalScene||{};
  const ap=scene.actionPoints||{players:0,gm:0,max:6};
  const gmAp=Math.max(0,Math.floor(Number(ap.gm||0)));

  const spend=async(cost,type,label,effect,extra={})=>{
    if(gmAp<cost)return;
    const event={id:"gm_ap_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),type,label,effect,cost,createdAt:Date.now(),...extra};
    await session?.updateTacticalScene?.({
      actionPoints:{players:Math.max(0,Math.min(6,Math.floor(Number(ap.players||0)))),gm:Math.max(0,gmAp-cost),max:6},
      gmApEvents:[event,...(scene.gmApEvents||[])].slice(0,30),
      ...(type==="complication"?{lastGmComplication:event}:{}),
    });
  };

  const randomComplication=()=>{
    if(gmAp<2)return;
    const item=GM_COMPLICATIONS[Math.floor(Math.random()*GM_COMPLICATIONS.length)];
    void spend(2,"complication",item.name[language],item.effect[language],{roll:item.roll,random:true});
  };

  return <section className="gm-reference-screen">
    <header className="gm-reference-screen__head"><span>PIP / 2D20 // GM</span><h2>[ {text.title} ]</h2><p>{text.subtitle}</p></header>
    <div className="gm-reference-ap-strip"><strong>{text.gmAp}: {gmAp}</strong></div>
    <div className="gm-reference-screen__grid">
      <article className="pip-panel gm-reference-card gm-reference-card--economy">
        <h3>[ {text.economy} ]</h3>
        <div className="gm-reference-table gm-reference-table--actions">
          <div className="gm-reference-table__head"><span>{text.cost}</span><span>{text.action}</span><span>{text.effect}</span><span/></div>
          {GM_AP_ACTIONS.map(item=><div className="gm-reference-table__row" key={item.id}><b>{item.cost} AP</b><strong>{item.name[language]}</strong><span>{item.effect[language]}</span><button type="button" className="pip-btn" disabled={gmAp<item.cost} onClick={()=>spend(item.cost,"action",item.name[language],item.effect[language])}>{text.spend}</button></div>)}
        </div>
      </article>

      <article className="pip-panel gm-reference-card gm-reference-card--complications">
        <div className="gm-reference-card__title-row"><h3>[ {text.complications} ]</h3><button type="button" className="pip-btn" disabled={gmAp<2} onClick={randomComplication}>{text.random}</button></div>
        <div className="gm-reference-table gm-reference-table--complications">
          <div className="gm-reference-table__head"><span>d20</span><span>{text.action}</span><span>{text.effect}</span><span/></div>
          {GM_COMPLICATIONS.map(item=><div className="gm-reference-table__row" key={item.roll}><b>{item.roll}</b><strong>{item.name[language]}</strong><span>{item.effect[language]}</span><button type="button" className="pip-btn" disabled={gmAp<3} onClick={()=>spend(3,"complication",item.name[language],item.effect[language],{roll:item.roll,random:false})}>{text.choose}</button></div>)}
        </div>
      </article>

      <article className="pip-panel gm-reference-card gm-reference-card--events">
        <h3>[ {text.recent} ]</h3>
        {(scene.gmApEvents||[]).length?(scene.gmApEvents||[]).slice(0,8).map(event=><div className="gm-reference-event" key={event.id}><b>−{event.cost} AP · {event.label}</b><span>{event.effect}</span></div>):<small>—</small>}
      </article>

      <article className="pip-panel gm-reference-card gm-reference-card--terrain">
        <h3>[ {text.terrain} ]</h3>
        {[...WINTER_TERRAIN,...WINTER_OBSTACLES].map(item=><div key={item.id} className="gm-reference-row"><span>{item.label}</span><b>{item.ap} AP</b></div>)}
      </article>
      <article className="pip-panel gm-reference-card gm-reference-card--conditions">
        <h3>[ {text.conditions} ]</h3>
        {WINTER_CONDITIONS.map(item=><div key={item.id} className="gm-reference-condition"><strong>{item.label}</strong><span>{item.effect}</span></div>)}
      </article>
      <article className="gm-reference-card gm-reference-card--rooms">
        <GmProceduralRoomDescriptionsV4 session={session}/>
      </article>
    </div>
  </section>;
}
