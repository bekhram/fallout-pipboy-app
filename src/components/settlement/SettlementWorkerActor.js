import { createWorkerState, advanceWorkerState } from '../../utils/settlementWorkerRuntime.js';
import { workerIndicator } from './workplaceIndicators.js';
import { workplaceCopy } from './workplaceCopy.js';

const CELL = 40;
const COLORS = { build: 0xe5b563, tend_crops: 0x96bd63, guard: 0x92aaca, business: 0xc79ad1, scavenging: 0xb89b7b, hunting_gathering: 0x71b8a4, trade_caravan: 0xdcb47c };
const COPY = {
  en: { idle: 'Unassigned', waiting: 'Waiting', to_work: 'Going to work', to_depot: 'Returning to depot', working: 'Working', patrolling: 'Patrolling', loading: 'Loading supplies', unloading: 'Unloading', choose_target: 'Choose a construction target', missing_target: 'Target no longer available', completed: 'Construction complete — choose a new task', unavailable: 'Workplace unavailable', blocked: 'No accessible route', no_space: 'No free space', visual: 'Visual cycle · resources are calculated daily' },
  ru: { idle: 'Без назначения', waiting: 'Ожидает', to_work: 'Идёт к месту работы', to_depot: 'Возвращается к складу', working: 'Работает', patrolling: 'Патрулирует', loading: 'Загружает материалы', unloading: 'Разгружает', choose_target: 'Выберите цель строительства', missing_target: 'Цель больше недоступна', completed: 'Стройка завершена — выберите новую задачу', unavailable: 'Место работы недоступно', blocked: 'Нет доступного пути', no_space: 'Нет свободного места', visual: 'Визуальный цикл · ресурсы рассчитываются за сутки' },
  uk: { idle: 'Без призначення', waiting: 'Очікує', to_work: 'Іде до місця роботи', to_depot: 'Повертається до складу', working: 'Працює', patrolling: 'Патрулює', loading: 'Завантажує матеріали', unloading: 'Розвантажує', choose_target: 'Оберіть ціль будівництва', missing_target: 'Ціль більше недоступна', completed: 'Будівництво завершено — оберіть нове завдання', unavailable: 'Місце роботи недоступне', blocked: 'Немає доступного шляху', no_space: 'Немає вільного місця', visual: 'Візуальний цикл · ресурси розраховуються за добу' },
  pl: { idle: 'Bez przydziału', waiting: 'Czeka', to_work: 'Idzie do pracy', to_depot: 'Wraca do magazynu', working: 'Pracuje', patrolling: 'Patroluje', loading: 'Ładuje materiały', unloading: 'Rozładowuje', choose_target: 'Wybierz cel budowy', missing_target: 'Cel jest niedostępny', completed: 'Budowa zakończona — wybierz nowe zadanie', unavailable: 'Miejsce pracy niedostępne', blocked: 'Brak dostępnej drogi', no_space: 'Brak wolnego miejsca', visual: 'Cykl wizualny · zasoby są rozliczane codziennie' },
};

// Owns Phaser display objects, not settlement records. Testable with a scene double.
export class SettlementWorkerActor {
  constructor(scene, index = 0) {
    this.scene = scene; this.index = index;
    this.container = scene.add.container(0, 0).setDepth(20);
    this.shadow = scene.add.ellipse(0, 2, 14, 6, 0x000000, .35);
    this.left = scene.add.rectangle(-3, -3, 3, 9, 0x384438).setOrigin(.5, 0);
    this.right = scene.add.rectangle(3, -3, 3, 9, 0x384438).setOrigin(.5, 0);
    this.body = scene.add.rectangle(0, -10, 11, 13, 0x8db29c);
    this.arm = scene.add.rectangle(7, -13, 3, 10, 0xd4ad88).setOrigin(.5, 0);
    this.head = scene.add.circle(0, -21, 5, 0xd4ad88);
    const hat = scene.add.rectangle(0, -25, 12, 3, 0x5a6748);
    this.tool = scene.add.container(7, -13);
    this.tool.add([scene.add.rectangle(0, 8, 3, 12, 0x946c42), scene.add.rectangle(0, 2, 10, 4, 0xc2c8af)]);
    this.cargo = scene.add.rectangle(0, -7, 15, 12, 0x9c784e).setStrokeStyle(1, 0xe1c394);
    this.badge = scene.add.circle(0, -43, 11, 0x102319, .97).setStrokeStyle(1, 0xb9d89a);
    this.symbol = scene.add.text(0, -43, '', { fontFamily:'Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif', fontSize:'17px', color:'#ffe1a0' }).setOrigin(.5);
    this.activity = scene.add.text(12, -53, '', {fontSize:'11px',color:'#ffd29b',backgroundColor:'#102319',padding:{x:2,y:1}}).setOrigin(.5);
    this.label = scene.add.text(0, 12, '', { fontSize: '10px', color: '#e1edd4', backgroundColor: '#10251aee', padding: { x: 4, y: 3 }, wordWrap: { width: 220 } }).setOrigin(.5, 0).setVisible(false);
    this.container.add([this.shadow, this.left, this.right, this.body, this.arm, this.head, hat, this.tool, this.cargo, this.badge, this.symbol, this.activity, this.label]);
    for (const target of [this.body, this.badge, this.symbol]) {
      target.setInteractive();
      target.on('pointerover', () => this.label.setVisible(true));
      target.on('pointerout', () => { if (!this.pinned) this.label.setVisible(false); });
      target.on('pointerdown', (_pointer, _x, _y, event) => {
        event?.stopPropagation(); this.pinned = !this.pinned; this.label.setVisible(this.pinned);
      });
    }
    this.tool.setVisible(false); this.cargo.setVisible(false);
  }

  configure(world, job, { resident, actionName = '', targetName = '', language = 'en', reduced = false, reset = false }) {
    this.world = world; this.job = job; this.residentName = resident.name || resident.id || '—';
    this.actionName = actionName; this.targetName = targetName;
    this.copy = { ...workplaceCopy(language), ...(COPY[String(language).split('-')[0]] || COPY.en) };
    const changedMotion = this.reduced !== reduced;
    this.reduced = reduced;
    const signature = JSON.stringify(job);
    if (!this.state || reset || signature !== this.signature || changedMotion) {
      const position = this.state || job.home;
      this.state = createWorkerState(world, job, position, this.index);
      this.signature = signature;
      // Reduced motion keeps a truthful, static assignment indicator at the site.
      if (reduced && job.kind !== 'waiting' && job.goal) {
        this.state.x = job.goal.x; this.state.y = job.goal.y; this.state.path = [];
        this.state.phase = job.kind === 'work' ? 'working' : job.kind === 'patrol' ? 'patrolling' : 'idle';
      }
    }
    this.body.setFillStyle(job.kind === 'waiting' || job.kind === 'idle' ? 0x8db29c : COLORS[job.action] || 0x8db29c);
    this.container.setVisible(Boolean(world.cells.length));
    this.caption = null;
    this.render(0);
  }

  update(time, delta) {
    if (!this.state || !this.container.visible) return;
    if (!this.reduced) advanceWorkerState(this.state, this.world, delta);
    this.render(this.reduced ? 0 : time);
  }

  render(time) {
    const state = this.state, action = this.job.action;
    const moving = !this.reduced && state.path.length > 0;
    const working = state.phase === 'working';
    const swing = this.reduced ? 0 : Math.sin(time / 110 + this.index);
    this.container.setPosition((state.x + .5) * CELL, (state.y + .5) * CELL);
    this.container.setDepth(this.pinned ? 200 : 20 + this.container.y / 10000);
    const zoom = Math.max(.05, this.scene.cameras?.main?.zoom || 1);
    // Optional scaling also permits non-rendering scene doubles in unit tests.
    for (const item of [this.badge, this.symbol, this.activity, this.label]) item.setScale?.(1 / zoom);
    this.activity.setPosition(12 / zoom, -43 - 10 / zoom);
    this.left.rotation = moving ? swing * .4 : 0;
    this.right.rotation = moving ? -swing * .4 : 0;
    this.arm.rotation = moving ? -swing * .5 : working && action === 'build' ? -1 + swing * .9 :
      working && ['tend_crops', 'scavenging', 'hunting_gathering'].includes(action) ? .6 + swing * .4 : 0;
    this.tool.rotation = this.arm.rotation;
    this.tool.setVisible(working && ['build', 'tend_crops', 'scavenging', 'hunting_gathering'].includes(action));
    this.cargo.setVisible(state.cargo);
    const caption = `${state.phase}:${state.reason}:${state.cargo}`;
    if (caption !== this.caption) {
      this.caption = caption;
      const indicator = workerIndicator(action, state.phase, state.cargo);
      this.symbol.setText(indicator.symbol); this.activity.setText(indicator.status);
      this.label.setText([this.residentName, this.actionName, this.targetName,
        this.copy[state.reason || state.phase] || this.copy.waiting, this.copy.visual].filter(Boolean).join('\n'));
    }
  }

  destroy() { this.container.destroy(); }
}
