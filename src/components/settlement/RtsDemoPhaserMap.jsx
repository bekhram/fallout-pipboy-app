import React, { useEffect, useRef, useState } from 'react';
import { SETTLEMENT_ASSETS } from './settlementAssets.js';
import { SETTLEMENT_BUILDINGS } from '../../data/settlement/buildings.js';
import background from '../../assets/wasteland/backgrounds/settlement-bg-1.png';
import pawnBlue from '../../assets/settlement/workers/pawn-blue.png';
import { WORKER_TEXTURE, WORKER_FRAME_SIZE } from './workerSpriteFrames.js';
import {
  createRtsCombatState, toggleRtsSelection, selectAllRtsUnits, clearRtsSelection,
  issueRtsCommand, spawnRtsWave, stepRtsCombat, rtsCombatSummary,
} from '../../utils/settlementRtsCombat.js';

const CELL = 40;
const SIZE = 24;
const WORLD = SIZE * CELL;

export default function RtsDemoPhaserMap({ buildings, workers, paused, commandMode, action, onState, onCommandComplete }) {
  const container = useRef(null);
  const sceneRef = useRef(null);
  const latest = useRef({ paused, commandMode, onState, onCommandComplete });
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  latest.current = { paused, commandMode, onState, onCommandComplete };

  useEffect(() => {
    if (action?.seq) sceneRef.current?.applyAction(action);
  }, [action?.seq]);

  useEffect(() => {
    let cancelled = false, game, observer;
    import('phaser').then(({ default: Phaser }) => {
      if (cancelled) return;

      class RtsScene extends Phaser.Scene {
        preload() {
          this.load.image('rts-terrain', background);
          const assets = new Set(buildings.map(building => SETTLEMENT_BUILDINGS[building.type]?.asset).filter(Boolean));
          for (const asset of assets) if (SETTLEMENT_ASSETS[asset]) this.load.image(`rts-building-${asset}`, SETTLEMENT_ASSETS[asset]);
          this.load.spritesheet(WORKER_TEXTURE, pawnBlue, { frameWidth: WORKER_FRAME_SIZE, frameHeight: WORKER_FRAME_SIZE, endFrame: 35 });
        }

        create() {
          if (cancelled) return;
          if (!this.textures.exists(WORKER_TEXTURE)) { setFailed(true); return; }
          this.textures.get(WORKER_TEXTURE).setFilter(Phaser.Textures.FilterMode.NEAREST);
          this.add.image(0, 0, 'rts-terrain').setOrigin(0).setDisplaySize(WORLD, WORLD).setDepth(0);
          const shade = this.add.rectangle(WORLD / 2, WORLD / 2, WORLD, WORLD, 0x07140c, .18).setDepth(1);
          shade.setBlendMode?.(Phaser.BlendModes.MULTIPLY);
          this.grid = this.add.graphics().setDepth(2);
          this.grid.lineStyle(1, 0xd2efb8, .09);
          for (let i = 0; i <= SIZE; i++) {
            this.grid.lineBetween(i * CELL, 0, i * CELL, WORLD);
            this.grid.lineBetween(0, i * CELL, WORLD, i * CELL);
          }

          this.enrichedBuildings = buildings.map(building => ({
            ...building, footprint: SETTLEMENT_BUILDINGS[building.type]?.footprint || { width: 1, height: 1 },
          }));
          for (const building of this.enrichedBuildings) {
            const def = SETTLEMENT_BUILDINGS[building.type], footprint = building.footprint;
            const key = def?.asset && `rts-building-${def.asset}`;
            if (!key || !this.textures.exists(key)) continue;
            this.add.image((building.x + footprint.width / 2) * CELL, (building.y + footprint.height / 2) * CELL, key)
              .setDisplaySize(footprint.width * CELL, footprint.height * CELL).setDepth(5);
          }

          this.combat = createRtsCombatState({ buildings: this.enrichedBuildings, workers, size: SIZE });
          this.unitViews = new Map();
          this.enemyViews = new Map();
          this.createUnitViews();
          this.hqMarker = this.add.text(this.combat.hq.position.x * CELL, this.combat.hq.position.y * CELL - 22, 'HQ', {
            fontFamily: 'monospace', fontSize: '13px', color: '#d9ffbd', backgroundColor: '#07140ddd', padding: { x: 5, y: 3 },
          }).setOrigin(.5).setDepth(30);

          this.input.on('pointerdown', pointer => {
            this.down = { x: pointer.x, y: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY };
            this.dragged = false;
          });
          this.input.on('pointermove', pointer => {
            if (!pointer.isDown || !this.down) return;
            const dx = pointer.x - this.down.x, dy = pointer.y - this.down.y;
            if (Math.hypot(dx, dy) > 9) this.dragged = true;
            if (this.dragged) this.cameras.main.setScroll(this.down.scrollX - dx / this.cameras.main.zoom, this.down.scrollY - dy / this.cameras.main.zoom);
          });
          this.input.on('pointerup', pointer => {
            if (!this.down || this.dragged) { this.down = null; return; }
            this.down = null;
            const mode = latest.current.commandMode;
            if (!mode || !['move', 'patrol'].includes(mode)) return;
            const cell = this.cellAt(pointer);
            if (!cell) return;
            if (issueRtsCommand(this.combat, mode, cell)) {
              latest.current.onCommandComplete?.(mode);
              this.emitState(true);
            }
          });

          sceneRef.current = this;
          this.resize();
          this.renderCombat(0);
          this.emitState(true);
          this.scale.on('resize', this.resize, this);
          setReady(true);
        }

        createUnitViews() {
          this.combat.units.forEach((unit, index) => {
            const container = this.add.container(0, 0).setDepth(20);
            const selection = this.add.circle(0, 10, 22, 0x9fffaa, .08).setStrokeStyle(2, 0xbaff9d, .95).setScale(1, .42);
            const sprite = this.add.sprite(0, 0, WORKER_TEXTURE, 0).setOrigin(.5, .7).setScale(.48).setInteractive({ useHandCursor: true });
            const bar = this.add.graphics();
            const name = this.add.text(0, 17, unit.name, { fontFamily:'monospace', fontSize:'10px', color:'#e7ffd4', backgroundColor:'#07140dcc', padding:{x:3,y:2} }).setOrigin(.5, 0);
            const status = this.add.text(0, -51, '', { fontFamily:'monospace', fontSize:'9px', color:'#ffe1a0', backgroundColor:'#07140dcc', padding:{x:3,y:2} }).setOrigin(.5);
            container.add([selection, sprite, bar, name, status]);
            sprite.on('pointerdown', (_pointer, _x, _y, event) => {
              event?.stopPropagation();
              toggleRtsSelection(this.combat, unit.id, true);
              this.renderCombat(this.time.now);
              this.emitState(true);
            });
            this.unitViews.set(unit.id, { container, selection, sprite, bar, name, status, index });
          });
        }

        enemyView(enemy) {
          let view = this.enemyViews.get(enemy.id);
          if (view) return view;
          const container = this.add.container(0, 0).setDepth(21);
          const sprite = this.add.sprite(0, 0, WORKER_TEXTURE, 0).setOrigin(.5, .7).setScale(.44).setTint(0xff745c);
          const bar = this.add.graphics();
          const tag = this.add.text(0, 15, 'RAIDER', { fontFamily:'monospace', fontSize:'9px', color:'#ffb5a5', backgroundColor:'#190b08dd', padding:{x:3,y:2} }).setOrigin(.5,0);
          container.add([sprite, bar, tag]);
          view = { container, sprite, bar, tag, index: this.enemyViews.size };
          this.enemyViews.set(enemy.id, view);
          return view;
        }

        hpBar(graphics, hp, maxHp, enemy = false) {
          const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
          graphics.clear();
          graphics.fillStyle(0x07140d, .9).fillRect(-20, -43, 40, 5);
          graphics.fillStyle(enemy ? 0xff745c : ratio <= .3 ? 0xffb35c : 0x9fff80, 1).fillRect(-19, -42, 38 * ratio, 3);
        }

        renderCombat(time) {
          if (!this.combat) return;
          const frame = Math.floor(time / 110) % 6;
          for (const unit of this.combat.units) {
            const view = this.unitViews.get(unit.id); if (!view) continue;
            view.container.setPosition((unit.x + .5) * CELL, (unit.y + .5) * CELL);
            view.selection.setVisible(Boolean(unit.selected && unit.alive && !unit.retreated));
            const moving = Boolean(unit.path?.length);
            view.sprite.setFrame((moving ? 6 : 0) + frame);
            view.sprite.setFlipX(moving && unit.path[0]?.x < unit.x);
            view.sprite.setAlpha(unit.alive ? unit.retreated ? .45 : 1 : .2);
            this.hpBar(view.bar, unit.hp, unit.maxHp, false);
            view.status.setText(!unit.alive ? 'DOWN' : unit.retreated ? 'RETREATED' : unit.command === 'retreat' ? 'RETREAT' : unit.command.toUpperCase());
          }
          for (const enemy of this.combat.enemies) {
            const view = this.enemyView(enemy);
            view.container.setVisible(enemy.alive).setPosition((enemy.x + .5) * CELL, (enemy.y + .5) * CELL);
            if (!enemy.alive) continue;
            const moving = Boolean(enemy.path?.length);
            view.sprite.setFrame((moving ? 6 : 0) + frame);
            view.sprite.setFlipX(moving && enemy.path[0]?.x < enemy.x);
            this.hpBar(view.bar, enemy.hp, enemy.maxHp, true);
          }
          this.hqMarker?.setText(`HQ ${Math.ceil(this.combat.hq.hp)}/${this.combat.hq.maxHp}`);
        }

        flashEvents(events) {
          for (const event of events) {
            if (event.type !== 'shot') continue;
            const from = this.unitViews.get(event.from)?.container, to = this.enemyViews.get(event.to)?.container;
            if (!from || !to) continue;
            const tracer = this.add.graphics().setDepth(40);
            tracer.lineStyle(2, 0xffe69b, .95).lineBetween(from.x, from.y - 15, to.x, to.y - 15);
            this.time.delayedCall(90, () => tracer.destroy());
          }
        }

        update(time, delta) {
          if (!this.combat) return;
          if (!latest.current.paused) {
            const before = this.combat.phase;
            const events = stepRtsCombat(this.combat, delta);
            if (events.length) this.flashEvents(events);
            if (before !== this.combat.phase) this.emitState(true);
          }
          this.renderCombat(time);
          this.emitState(false, time);
        }

        applyAction(action) {
          if (!this.combat || !action) return;
          if (action.type === 'selectAll') selectAllRtsUnits(this.combat);
          else if (action.type === 'clearSelection') clearRtsSelection(this.combat);
          else if (action.type === 'hold') issueRtsCommand(this.combat, 'hold');
          else if (action.type === 'wave') spawnRtsWave(this.combat);
          else if (action.type === 'reset') {
            for (const view of this.enemyViews.values()) view.container.destroy();
            this.enemyViews.clear();
            this.combat = createRtsCombatState({ buildings: this.enrichedBuildings, workers, size: SIZE });
          }
          this.renderCombat(this.time.now);
          this.emitState(true);
        }

        emitState(force = false, time = 0) {
          if (!force && time < (this.nextEmit || 0)) return;
          this.nextEmit = time + 180;
          latest.current.onState?.(rtsCombatSummary(this.combat));
        }

        cellAt(pointer) {
          const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          const x = Math.floor(point.x / CELL), y = Math.floor(point.y / CELL);
          return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? { x, y } : null;
        }

        resize() {
          const camera = this.cameras.main;
          const fit = Math.min(this.scale.width / WORLD, this.scale.height / WORLD);
          camera.setZoom(Math.max(.25, fit));
          const viewW = this.scale.width / camera.zoom, viewH = this.scale.height / camera.zoom;
          camera.setBounds(-(Math.max(0, viewW - WORLD) / 2), -(Math.max(0, viewH - WORLD) / 2), Math.max(WORLD, viewW), Math.max(WORLD, viewH));
          camera.centerOn(WORLD / 2, WORLD / 2);
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO, parent: container.current,
        width: Math.max(1, container.current.clientWidth), height: Math.max(1, container.current.clientHeight),
        backgroundColor:'#07140d', scene:RtsScene, audio:{noAudio:true}, input:{activePointers:2},
        fps:{target:30}, render:{antialias:true}, scale:{mode:Phaser.Scale.NONE},
      });
      observer = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) game.scale.resize(Math.floor(width), Math.floor(height));
      });
      observer.observe(container.current);
    }).catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true; observer?.disconnect(); sceneRef.current = null; game?.destroy(true);
    };
  }, []);

  return <div className="rts-demo-phaser" ref={container} role="application" aria-label="RTS combat demo">
    {(!ready || failed) && <div className="rts-demo-loading">{failed ? '⚠ RTS' : '… RTS'}</div>}
  </div>;
}
