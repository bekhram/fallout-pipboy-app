import { createWorkerState, advanceWorkerState } from '../../utils/settlementWorkerRuntime.js';
import { workerIndicator } from './workplaceIndicators.js';
import { workplaceCopy } from './workplaceCopy.js';
import { WORKER_TEXTURE, workerSpritePose, workerFacesLeft } from './workerSpriteFrames.js';

const CELL = 40;
const COPY = {
  en: { idle: 'Unassigned', waiting: 'Waiting', to_work: 'Going to work', to_depot: 'Returning to depot', working: 'Working', patrolling: 'Patrolling', loading: 'Loading supplies', unloading: 'Unloading', repair: 'Repairing', choose_target: 'Choose a construction target', missing_target: 'Target no longer available', completed: 'Construction complete — choose a new task', unavailable: 'Workplace unavailable', blocked: 'No accessible route', no_space: 'No free space', visual: 'Visual cycle · resources are calculated daily' },
  ru: { idle: 'Без назначения', waiting: 'Ожидает', to_work: 'Идёт к месту работы', to_depot: 'Возвращается к складу', working: 'Работает', patrolling: 'Патрулирует', loading: 'Загружает материалы', unloading: 'Разгружает', repair: 'Ремонтирует', choose_target: 'Выберите цель строительства', missing_target: 'Цель больше недоступна', completed: 'Стройка завершена — выберите новую задачу', unavailable: 'Место работы недоступно', blocked: 'Нет доступного пути', no_space: 'Нет свободного места', visual: 'Визуальный цикл · ресурсы рассчитываются за сутки' },
  uk: { idle: 'Без призначення', waiting: 'Очікує', to_work: 'Іде до місця роботи', to_depot: 'Повертається до складу', working: 'Працює', patrolling: 'Патрулює', loading: 'Завантажує матеріали', unloading: 'Розвантажує', repair: 'Ремонтує', choose_target: 'Оберіть ціль будівництва', missing_target: 'Ціль більше недоступна', completed: 'Будівництво завершено — оберіть нове завдання', unavailable: 'Місце роботи недоступне', blocked: 'Немає доступного шляху', no_space: 'Немає вільного місця', visual: 'Візуальний цикл · ресурси розраховуються за добу' },
  pl: { idle: 'Bez przydziału', waiting: 'Czeka', to_work: 'Idzie do pracy', to_depot: 'Wraca do magazynu', working: 'Pracuje', patrolling: 'Patroluje', loading: 'Ładuje materiały', unloading: 'Rozładowuje', repair: 'Naprawia', choose_target: 'Wybierz cel budowy', missing_target: 'Cel jest niedostępny', completed: 'Budowa zakończona — wybierz nowe zadanie', unavailable: 'Miejsce pracy niedostępne', blocked: 'Brak dostępnej drogi', no_space: 'Brak wolnego miejsca', visual: 'Cykl wizualny · zasoby są rozliczane codziennie' },
};

// Owns display objects only. The existing runtime still owns paths and work phases.
export class SettlementWorkerActor {
  constructor(scene, index = 0) {
    this.scene = scene; this.index = index;
    this.container = scene.add.container(0, 0).setDepth(20);
    this.body = scene.add.sprite(0, 0, WORKER_TEXTURE, 0).setOrigin(.5, .70).setScale(.5);
    this.badge = scene.add.circle(0, -43, 11, 0x102319, .97).setStrokeStyle(1, 0xb9d89a);
    this.symbol = scene.add.text(0, -43, '', { fontFamily:'Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif', fontSize:'17px', color:'#ffe1a0' }).setOrigin(.5);
    this.activity = scene.add.text(12, -53, '', {fontSize:'11px',color:'#ffd29b',backgroundColor:'#102319',padding:{x:2,y:1}}).setOrigin(.5);
    this.label = scene.add.text(0, 12, '', {fontSize:'10px',color:'#e1edd4',backgroundColor:'#10251aee',padding:{x:4,y:3},wordWrap:{width:220}}).setOrigin(.5, 0).setVisible(false);
    this.container.add([this.body, this.badge, this.symbol, this.activity, this.label]);
    // The sheet has large transparent margins; they must not intercept map clicks.
    this.body.setInteractive({ hitArea: { x: 62, y: 54, width: 68, height: 86 },
      hitAreaCallback: (area, x, y) => x >= area.x && y >= area.y && x < area.x + area.width && y < area.y + area.height });
    this.badge.setInteractive(); this.symbol.setInteractive();
    for (const target of [this.body, this.badge, this.symbol]) {
      target.on('pointerover', () => this.label.setVisible(true));
      target.on('pointerout', () => { if (!this.pinned) this.label.setVisible(false); });
      target.on('pointerdown', (_pointer, _x, _y, event) => {
        event?.stopPropagation(); this.pinned = !this.pinned; this.label.setVisible(this.pinned);
      });
    }
  }

  configure(world, job, { resident, actionName = '', targetName = '', language = 'en', reduced = false, reset = false }) {
    if (this.destroyed) return;
    this.world = world; this.job = job; this.residentName = resident.name || resident.id || '—'; this.healthStatus = resident.status || 'idle'; this.health = Math.max(0,Math.min(100,Number(resident.health ?? 100)));
    this.actionName = actionName; this.targetName = targetName;
    this.copy = { ...workplaceCopy(language), ...(COPY[String(language).split('-')[0]] || COPY.en) };
    const changedMotion = this.reduced !== reduced;
    this.reduced = reduced;
    const signature = JSON.stringify(job);
    if (!this.state || reset || signature !== this.signature || changedMotion) {
      const position = this.state || job.home;
      this.state = createWorkerState(world, job, position, this.index);
      this.signature = signature;
      if (reduced && job.kind !== 'waiting' && job.goal) {
        this.state.x = job.goal.x; this.state.y = job.goal.y; this.state.path = [];
        this.state.phase = job.kind === 'work' ? 'working' : job.kind === 'patrol' ? 'patrolling' : 'idle';
      }
    }
    this.container.setVisible(Boolean(world.cells.length));
    this.caption = null;
    this.render(this.lastTime || 0);
  }

  update(time, delta) {
    if (this.destroyed || !this.state || !this.container.visible) return;
    if (!this.reduced) advanceWorkerState(this.state, this.world, delta);
    this.render(this.reduced ? 0 : time);
  }

  render(time) {
    if (this.destroyed || !this.state) return;
    this.lastTime = time;
    const state = this.state, action = this.job.action;
    this.container.setPosition((state.x + .5) * CELL, (state.y + .5) * CELL);
    this.container.setDepth(this.pinned ? 200 : 20 + this.container.y / 10000);
    const zoom = Math.max(.05, this.scene.cameras?.main?.zoom || 1);
    for (const item of [this.badge, this.symbol, this.activity, this.label]) item.setScale(1 / zoom);
    this.activity.setPosition(12 / zoom, -43 - 10 / zoom);
    const pose = workerSpritePose(state, action, { time, index: this.index, reduced: this.reduced });
    this.animationMode = pose.mode;
    if (pose.frame !== this.frame) { this.frame = pose.frame; this.body.setFrame(pose.frame); }
    this.facingLeft = workerFacesLeft(state, this.job, this.world.buildings, this.facingLeft);
    this.body.setFlipX(this.facingLeft);
    const caption = `${state.phase}:${state.reason}:${state.cargo}`;
    if (caption !== this.caption) {
      this.caption = caption;
      const indicator = workerIndicator(action, state.phase, state.cargo);
      const unavailable = ['sick','injured','recovering'].includes(this.healthStatus);
      this.symbol.setText(unavailable ? (this.healthStatus === 'injured' ? '!' : '✚') : indicator.symbol);
      this.activity.setText(unavailable ? `${this.health}%` : indicator.status);
      this.label.setText([this.residentName, unavailable ? `${this.healthStatus} · ${this.health}%` : '', this.actionName, this.targetName,
        this.copy[state.reason || state.phase] || this.copy.waiting, this.copy.visual].filter(Boolean).join('\n'));
    }
  }

  destroy() { if (this.destroyed) return; this.destroyed = true; this.container.destroy(); }
}
