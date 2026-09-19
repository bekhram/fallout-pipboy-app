import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RtsDemoPhaserMap from './RtsDemoPhaserMap.jsx';
import './rtsDemo.css';

const BUILDINGS = [
  { id:'demo_hq', type:'settlement_hq', x:10, y:10 },
  { id:'demo_farm', type:'crop_field', x:3, y:3 },
  { id:'demo_water', type:'water_pump', x:8, y:3 },
  { id:'demo_generator', type:'generator', x:17, y:3 },
  { id:'demo_guard', type:'guard_post', x:3, y:18 },
  { id:'demo_workshop', type:'workshop', x:17, y:18 },
  { id:'demo_turret_a', type:'turret', x:8, y:16 },
  { id:'demo_turret_b', type:'turret', x:15, y:8 },
];
const WORKERS = [
  { id:'mara', name:'Mara', archetype:'rifleman', position:{x:8,y:12} },
  { id:'boone', name:'Boone', archetype:'bruiser', position:{x:15,y:12} },
  { id:'ada', name:'Ada', archetype:'heavy', position:{x:11,y:15} },
  { id:'cooper', name:'Cooper', archetype:'medic', position:{x:12,y:8} },
];

const COPY = {
  en:{title:'RTS COMBAT DEMO',back:'BACK',selectAll:'SELECT ALL',clear:'CLEAR',move:'MOVE',hold:'HOLD',patrol:'PATROL',attack:'ATTACK',wave:'START WAVE',next:'NEXT WAVE',pause:'PAUSE',resume:'RESUME',reset:'RESET',selected:'Selected',defenders:'Defenders',enemies:'Enemies',hq:'HQ',ready:'Select defenders, place them, then start the wave.',active:'Raiders are attacking the settlement.',victory:'Wave repelled. Reposition your squad or start the next wave.',defeat:'HQ lost. Reset the demo and try another defense.',defenders_down:'No active defenders. Raiders are pushing toward HQ.',moveHint:'Tap a free cell to move the selected squad.',patrolHint:'Tap a cell to create a patrol route.',attackHint:'Tap an enemy to focus the selected squad on that target.',auto:'Defenders engage automatically; ATTACK forces focus fire.',retreated:'retreated',down:'down',target:'TARGET',focus:'Focus',damage:'DMG',range:'RNG'},
  ru:{title:'RTS БОЕВОЕ ДЕМО',back:'НАЗАД',selectAll:'ВЫБРАТЬ ВСЕХ',clear:'СНЯТЬ',move:'ИДТИ',hold:'ДЕРЖАТЬ',patrol:'ПАТРУЛЬ',attack:'АТАКА',wave:'НАЧАТЬ ВОЛНУ',next:'СЛЕД. ВОЛНА',pause:'ПАУЗА',resume:'ПРОДОЛЖИТЬ',reset:'СБРОС',selected:'Выбрано',defenders:'Защитники',enemies:'Враги',hq:'Штаб',ready:'Выбери защитников, расставь их и запусти волну.',active:'Рейдеры атакуют поселение.',victory:'Волна отбита. Перегруппируй отряд или запускай следующую.',defeat:'Штаб потерян. Сбрось демо и попробуй другую оборону.',defenders_down:'Активных защитников нет. Враги двигаются к штабу.',moveHint:'Тапни по свободной клетке, чтобы переместить выбранный отряд.',patrolHint:'Тапни по клетке, чтобы задать маршрут патруля.',attackHint:'Тапни по врагу, чтобы выбранный отряд сосредоточил огонь на нём.',auto:'Защитники атакуют автоматически; АТАКА задаёт приоритетную цель.',retreated:'отступил',down:'выведен из боя',target:'ЦЕЛЬ',focus:'Фокус',damage:'УРОН',range:'ДАЛЬН.'},
  uk:{title:'RTS БОЙОВЕ ДЕМО',back:'НАЗАД',selectAll:'ОБРАТИ ВСІХ',clear:'СКИНУТИ',move:'РУХ',hold:'ТРИМАТИ',patrol:'ПАТРУЛЬ',attack:'АТАКА',wave:'ПОЧАТИ ХВИЛЮ',next:'НАСТ. ХВИЛЯ',pause:'ПАУЗА',resume:'ПРОДОВЖИТИ',reset:'СКИНУТИ',selected:'Обрано',defenders:'Захисники',enemies:'Вороги',hq:'Штаб',ready:'Оберіть захисників, розставте їх і запустіть хвилю.',active:'Рейдери атакують поселення.',victory:'Хвилю відбито. Перегрупуйте загін або запускайте наступну.',defeat:'Штаб втрачено. Скиньте демо та спробуйте іншу оборону.',defenders_down:'Активних захисників немає. Вороги рухаються до штабу.',moveHint:'Торкніться вільної клітинки, щоб перемістити обраний загін.',patrolHint:'Торкніться клітинки, щоб задати маршрут патруля.',attackHint:'Торкніться ворога, щоб обраний загін зосередив вогонь на цілі.',auto:'Захисники атакують автоматично; АТАКА задає пріоритетну ціль.',retreated:'відступив',down:'поза боєм',target:'ЦІЛЬ',focus:'Фокус',damage:'ШКОДА',range:'ДАЛЬН.'},
  pl:{title:'DEMO WALKI RTS',back:'WRÓĆ',selectAll:'ZAZNACZ WSZYSTKICH',clear:'WYCZYŚĆ',move:'RUCH',hold:'TRZYMAJ',patrol:'PATROL',attack:'ATAK',wave:'URUCHOM FALĘ',next:'NASTĘPNA FALA',pause:'PAUZA',resume:'WZNÓW',reset:'RESET',selected:'Wybrano',defenders:'Obrońcy',enemies:'Wrogowie',hq:'HQ',ready:'Wybierz obrońców, ustaw ich i uruchom falę.',active:'Najeźdźcy atakują osadę.',victory:'Fala odparta. Przegrupuj oddział lub uruchom następną.',defeat:'HQ utracone. Zresetuj demo i spróbuj innej obrony.',defenders_down:'Brak aktywnych obrońców. Wrogowie idą na HQ.',moveHint:'Dotknij wolnego pola, aby przesunąć zaznaczony oddział.',patrolHint:'Dotknij pola, aby ustawić trasę patrolu.',attackHint:'Dotknij wroga, aby zaznaczony oddział skupił na nim ogień.',auto:'Obrońcy atakują automatycznie; ATAK ustawia priorytetowy cel.',retreated:'wycofany',down:'poza walką',target:'CEL',focus:'Skupienie',damage:'OBR.',range:'ZASIĘG'},
};

export default function RtsDemoGame({ onExit }) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const text = COPY[language] || COPY.en;
  const seq = useRef(0);
  const [action, setAction] = useState(null);
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState(null);
  const [status, setStatus] = useState({ phase:'ready', wave:0, selected:0, defendersAlive:4, defendersRetreated:0, enemiesAlive:0, enemiesTotal:0, hqHp:300, hqMaxHp:300, units:[] });

  const send = type => setAction({ type, seq: ++seq.current });
  const message = mode === 'move' ? text.moveHint : mode === 'patrol' ? text.patrolHint : mode === 'attack' ? text.attackHint :
    status.message === 'defenders_down' ? text.defenders_down : text[status.phase] || text.ready;
  const canCommand = status.selected > 0 && status.phase !== 'defeat';

  return <section className="rts-demo-screen">
    <header className="rts-demo-header">
      <button type="button" className="rts-demo-btn" onClick={onExit}>← {text.back}</button>
      <div><small>PIP 2D20 / PROTOTYPE</small><strong>{text.title}</strong></div>
      <div className="rts-demo-wave">WAVE <b>{status.wave || '—'}</b></div>
    </header>

    <div className="rts-demo-hud">
      <span>{text.selected} <b>{status.selected}</b></span>
      <span>{text.defenders} <b>{status.defendersAlive}/4</b></span>
      <span>{text.enemies} <b>{status.enemiesAlive}/{status.enemiesTotal}</b></span>
      <span>{text.hq} <b>{Math.ceil(status.hqHp)}/{status.hqMaxHp}</b></span>
    </div>

    <main className="rts-demo-stage">
      <RtsDemoPhaserMap
        buildings={BUILDINGS}
        workers={WORKERS}
        paused={paused}
        commandMode={mode}
        action={action}
        onState={setStatus}
        onCommandComplete={() => setMode(null)}
      />
      <div className={`rts-demo-message is-${status.phase}`}>{message}<small>{text.auto}</small></div>
      {status.inspectedEnemy && <div className="rts-demo-target">
        <span><small>{text.target}</small><strong>{status.inspectedEnemy.label}</strong></span>
        <span>{Math.ceil(status.inspectedEnemy.hp)}/{status.inspectedEnemy.maxHp} HP</span>
        <span>{status.inspectedEnemy.threat}</span>
        <span>{text.focus}: <b>{status.inspectedEnemy.focusedBy}</b></span>
      </div>}
      <div className="rts-demo-squad">
        {(status.units || []).map(unit => <div key={unit.id} className={`rts-demo-unit ${unit.selected ? 'is-selected' : ''} ${!unit.alive ? 'is-down' : unit.retreated ? 'is-retreated' : ''}`}>
          <strong>{unit.name}</strong><span>{Math.ceil(unit.hp)}/{unit.maxHp} HP</span>
          <em>{unit.roleLabel}</em><span>{text.damage} {unit.damage} · {text.range} {unit.range}</span>
          <small>{!unit.alive ? text.down : unit.retreated ? text.retreated : unit.command}</small>
        </div>)}
      </div>
    </main>

    <nav className="rts-demo-controls" aria-label={text.title}>
      <button type="button" onClick={() => send('selectAll')}>{text.selectAll}</button>
      <button type="button" onClick={() => { send('clearSelection'); setMode(null); }}>{text.clear}</button>
      <button type="button" className={mode === 'move' ? 'is-active' : ''} disabled={!canCommand} onClick={() => setMode(mode === 'move' ? null : 'move')}>{text.move}</button>
      <button type="button" disabled={!canCommand} onClick={() => { send('hold'); setMode(null); }}>{text.hold}</button>
      <button type="button" className={mode === 'patrol' ? 'is-active' : ''} disabled={!canCommand} onClick={() => setMode(mode === 'patrol' ? null : 'patrol')}>{text.patrol}</button>
      <button type="button" className={mode === 'attack' ? 'is-active' : ''} disabled={!canCommand || status.enemiesAlive===0} onClick={() => setMode(mode === 'attack' ? null : 'attack')}>{text.attack}</button>
      <button type="button" className="is-primary" disabled={status.phase === 'active'} onClick={() => { send('wave'); setMode(null); setPaused(false); }}>{status.phase === 'victory' ? text.next : text.wave}</button>
      <button type="button" onClick={() => setPaused(value => !value)}>{paused ? '▶ '+text.resume : 'Ⅱ '+text.pause}</button>
      <button type="button" onClick={() => { send('reset'); setMode(null); setPaused(false); }}>{text.reset}</button>
    </nav>
  </section>;
}
