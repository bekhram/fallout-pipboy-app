import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CELL, anchoredZoom, clampScroll } from "./mapCamera.js";
import "./phaserMaps.css";

const COPY = {
  en: { pan: "Pan", select: "Select", fit: "Fit map", focus: "My position", full: "Expand map", close: "Close", loading: "Loading map…", error: "Map could not load", retry: "Retry", zoomIn: "Zoom in", zoomOut: "Zoom out" },
  ru: { pan: "Двигать", select: "Выбрать", fit: "Вписать", focus: "Моя позиция", full: "Развернуть карту", close: "Закрыть", loading: "Загрузка карты…", error: "Карта не загрузилась", retry: "Повторить", zoomIn: "Приблизить", zoomOut: "Отдалить" },
  uk: { pan: "Рухати", select: "Вибрати", fit: "Вмістити", focus: "Моя позиція", full: "Розгорнути мапу", close: "Закрити", loading: "Завантаження мапи…", error: "Мапа не завантажилася", retry: "Повторити", zoomIn: "Наблизити", zoomOut: "Віддалити" },
  pl: { pan: "Przesuń", select: "Wybierz", fit: "Dopasuj", focus: "Moja pozycja", full: "Rozwiń mapę", close: "Zamknij", loading: "Ładowanie mapy…", error: "Nie udało się wczytać mapy", retry: "Ponów", zoomIn: "Przybliż", zoomOut: "Oddal" },
};

// React owns game state and accessible controls. Phaser owns world coordinates,
// rendering and the camera. Existing tactical portals share the camera transform.
export default function PhaserMapViewport({ cols, rows, sceneKey, background = "", cells = [], markers = [], route = [], player, selected, onCell, onMarker, children, gridRef, label = "Map" }) {
  const { i18n } = useTranslation();
  const tx = COPY[String(i18n.resolvedLanguage || i18n.language).split("-")[0]] || COPY.en;
  const host = useRef(null), canvasHost = useRef(null), plane = useRef(null), api = useRef(null);
  const latest = useRef(null);
  latest.current = { cols, rows, background, cells, markers, route, player, selected, onCell, onMarker };
  const [ready, setReady] = useState(false), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [pan, setPan] = useState(false), [expanded, setExpanded] = useState(false), [zoom, setZoom] = useState(100);
  const panRef = useRef(pan); panRef.current = pan;

  useEffect(() => {
    let cancelled = false, game, observer, disposeInput, scene;
    setReady(false); setError(false);
    import("phaser").then(({ default: Phaser }) => {
      if (cancelled) return;
      class MapScene extends Phaser.Scene {
        create() {
          scene = this;
          this.cameras.main.setOrigin(0, 0);
          this.ink = this.add.graphics().setDepth(50);
          this.labels = [];
          this.textureUrls = new Map();
          this.failedUrls = new Set();
          this.refresh();
          this.fit();
          api.current = this;
          setReady(true);
          const root = host.current;
          const pointers = new Map();
          let drag = null, pinch = null, suppress = false, cancellingToken = false;
          const point = (e) => { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
          const pair = () => { const [a, b] = [...pointers.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) }; };
          const down = (e) => {
            if (e.target.closest('.phaser-map__controls, .phaser-map__message')) return;
            if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
            if (!pointers.size) suppress = false;
            pointers.set(e.pointerId, point(e));
            if (pointers.size === 2) {
              // Cancel an in-progress token drag before entering a camera gesture.
              if (drag?.target) {
                cancellingToken = true;
                drag.target.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: drag.id }));
                cancellingToken = false;
              }
              pinch = pair(); suppress = true;
              e.stopPropagation(); e.preventDefault();
              for (const id of pointers.keys()) { try { root.setPointerCapture(id); } catch { /* pointer ended */ } }
            } else {
              drag = { ...point(e), id: e.pointerId, target: e.target, moved: false, pan: panRef.current || e.button === 1 || !children };
              if (drag.pan && children) { e.stopPropagation(); e.preventDefault(); root.setPointerCapture(e.pointerId); }
            }
          };
          const move = (e) => {
            if (!pointers.has(e.pointerId)) return;
            const p = point(e); pointers.set(e.pointerId, p);
            if (pointers.size > 1 && pinch) {
              const next = pair();
              this.zoomAt(this.cameras.main.zoom * next.distance / Math.max(1, pinch.distance), pinch.x, pinch.y);
              this.cameras.main.scrollX -= (next.x - pinch.x) / this.cameras.main.zoom;
              this.cameras.main.scrollY -= (next.y - pinch.y) / this.cameras.main.zoom;
              pinch = next; this.sync(); e.stopPropagation(); e.preventDefault();
            } else if (drag?.pan && !pinch) {
              if (!drag.moved && Math.hypot(p.x - drag.x, p.y - drag.y) < 6) return;
              drag.moved = true; suppress = true;
              const cam = this.cameras.main;
              cam.scrollX -= (p.x - drag.x) / cam.zoom; cam.scrollY -= (p.y - drag.y) / cam.zoom;
              drag.x = p.x; drag.y = p.y; this.sync(); e.preventDefault(); e.stopPropagation();
            }
          };
          const up = (e) => {
            if (cancellingToken) return;
            if (!pointers.has(e.pointerId)) return;
            const wasCamera = pinch || (drag?.pan && children) || drag?.moved;
            pointers.delete(e.pointerId);
            if (wasCamera) { e.stopPropagation(); e.preventDefault(); }
            if (e.type === 'pointercancel') suppress = true;
            if (!pointers.size) { pinch = null; drag = null; }
            try { if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId); } catch { /* capture already released */ }
          };
          const click = (e) => {
            if (e.target.closest('.phaser-map__controls, .phaser-map__message')) return;
            if (suppress) { suppress = false; e.stopPropagation(); e.preventDefault(); return; }
            if (children) return;
            const p = point(e), cam = this.cameras.main, d = latest.current;
            const x = (cam.scrollX + p.x / cam.zoom) / CELL, y = (cam.scrollY + p.y / cam.zoom) / CELL;
            const marker = [...d.markers].reverse().find(m => Math.hypot(m.x + .5 - x, m.y + .5 - y) * CELL * cam.zoom < 22);
            if (marker) d.onMarker?.(marker);
            else if (x >= 0 && x < d.cols && y >= 0 && y < d.rows) d.onCell?.(Math.floor(x), Math.floor(y));
          };
          const wheel = (e) => { if (e.target.closest('.phaser-map__controls')) return; e.preventDefault(); e.stopPropagation(); const p = point(e); this.zoomAt(this.cameras.main.zoom * Math.exp(-e.deltaY * .0015), p.x, p.y); };
          const key = (e) => {
            if (e.key === 'Escape') { setExpanded(false); return; }
            if (e.target !== root) return;
            const cam = this.cameras.main, step = 80 / cam.zoom;
            if (e.key === 'ArrowLeft') cam.scrollX -= step;
            else if (e.key === 'ArrowRight') cam.scrollX += step;
            else if (e.key === 'ArrowUp') cam.scrollY -= step;
            else if (e.key === 'ArrowDown') cam.scrollY += step;
            else return;
            this.sync(); e.preventDefault();
          };
          const blur = () => {
            for (const id of pointers.keys()) { try { if (root.hasPointerCapture(id)) root.releasePointerCapture(id); } catch { /* already released */ } }
            pointers.clear(); drag = null; pinch = null; suppress = false;
          };
          const events = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up], ['click', click], ['wheel', wheel], ['keydown', key]];
          events.forEach(([name, fn]) => root.addEventListener(name, fn, { capture: true, passive: false }));
          window.addEventListener('blur', blur);
          disposeInput = () => { events.forEach(([name, fn]) => root.removeEventListener(name, fn, true)); window.removeEventListener('blur', blur); };
          observer = new ResizeObserver(() => {
            if (!root.clientWidth || !root.clientHeight || cancelled) return;
            game.scale.resize(root.clientWidth, root.clientHeight); this.sync();
          });
          observer.observe(root);
        }
        fit() {
          const d = latest.current, cam = this.cameras.main;
          cam.setZoom(Math.min(cam.width / (d.cols * CELL), cam.height / (d.rows * CELL)) * .96);
          cam.setScroll((d.cols * CELL - cam.width / cam.zoom) / 2, (d.rows * CELL - cam.height / cam.zoom) / 2);
          this.sync();
        }
        focus(x, y) {
          const cam = this.cameras.main;
          cam.setScroll((x + .5) * CELL - cam.width / cam.zoom / 2, (y + .5) * CELL - cam.height / cam.zoom / 2); this.sync();
        }
        zoomAt(value, x, y) {
          const cam = this.cameras.main, d = latest.current;
          const minimum = Math.min(cam.width / (d.cols * CELL), cam.height / (d.rows * CELL)) * .7;
          const next = anchoredZoom(cam, Phaser.Math.Clamp(value, minimum, 4), x ?? cam.width / 2, y ?? cam.height / 2);
          cam.setZoom(next.zoom).setScroll(next.scrollX, next.scrollY); this.sync();
        }
        sync() {
          const cam = this.cameras.main, d = latest.current;
          cam.scrollX = clampScroll(cam.scrollX, d.cols * CELL, cam.width, cam.zoom);
          cam.scrollY = clampScroll(cam.scrollY, d.rows * CELL, cam.height, cam.zoom);
          if (plane.current) plane.current.style.transform = `translate(${-cam.scrollX * cam.zoom}px, ${-cam.scrollY * cam.zoom}px) scale(${cam.zoom})`;
          setZoom(Math.round(cam.zoom * 100));
          if (!children && this.lastMarkerZoom !== cam.zoom) { this.lastMarkerZoom = cam.zoom; this.refresh(); }
        }
        texture(url, apply) {
          let disposed = false;
          const key = this.textureUrls.get(url);
          if (key && this.textures.exists(key)) apply(key);
          else if (url && !this.failedUrls.has(url)) {
            const nextKey = key || `map-bg-${this.textureUrls.size}`;
            const complete = () => { if (!disposed && !cancelled) apply(nextKey); };
            this.load.once(`filecomplete-image-${nextKey}`, complete);
            if (!key) { this.textureUrls.set(url, nextKey); this.load.image(nextKey, url); this.load.start(); }
            return () => { disposed = true; this.load.off(`filecomplete-image-${nextKey}`, complete); };
          }
          return () => { disposed = true; };
        }
        asset(props, onReady) {
          let sprite;
          const { style = {}, src } = props, d = latest.current;
          const W = d.cols * CELL, H = d.rows * CELL;
          const number = (value, total) => String(value || '').endsWith('%') ? parseFloat(value) / 100 * total : parseFloat(value) || 0;
          const width = number(style.width, W), height = number(style.height, H);
          let left = number(style.left, W), top = number(style.top, H);
          const transform = style.transform || '';
          if (transform.includes('translate(-50%, -50%)')) { left -= width / 2; top -= height / 2; }
          const angle = Number(transform.match(/rotate\(([-.\d]+)deg\)/)?.[1] || 0);
          const scale = transform.match(/scale\(([-.\d]+),\s*([-.\d]+)\)/);
          const origin = String(style.transformOrigin || '50% 50%').split(' ');
          const ox = number(origin[0], width) / Math.max(1, width), oy = number(origin[1] || origin[0], height) / Math.max(1, height);
          const depth = props['data-wasteland-background'] ? 2 : props['data-wasteland-road'] ? 5 : props['data-wasteland-rail'] ? 6 : props['data-wasteland-asset'] ? 10 : 20;
          const stop = this.texture(src, key => {
            sprite = this.add.image(left + width * ox, top + height * oy, key).setOrigin(ox, oy).setDepth(depth);
            if (style.objectFit === 'contain') {
              const ratio = Math.min(width / sprite.width, height / sprite.height);
              sprite.setScale(ratio * Number(scale?.[1] || 1), ratio * Number(scale?.[2] || 1));
            } else sprite.setDisplaySize(width * Number(scale?.[1] || 1), height * Number(scale?.[2] || 1));
            sprite.setAngle(angle); onReady();
          });
          return () => { stop(); sprite?.destroy(); };
        }
        token(token, selected) {
          const size = Math.max(1, Math.min(3, Number(token.stats?.footprint || token.size || 1)));
          const x = (Number(token.x) + size / 2) * CELL, y = (Number(token.y) + size / 2) * CELL, radius = size * CELL / 2 - 5;
          const palette = [0x78ff98, 0xffd166, 0x62d9ff, 0xff7ad9, 0xff9b54, 0x8da2ff, 0xd6ff63, 0xc58cff];
          let hash = 0; for (const ch of String(token.stats?.hordeGroupId || token.id || token.name)) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
          const color = token.kind === 'player' ? 0x62d9ff : palette[Math.abs(Number.isFinite(Number(token.stats?.tokenColorIndex)) ? Math.floor(Number(token.stats.tokenColorIndex)) : hash) % palette.length];
          const shape = this.add.graphics().setDepth(100);
          shape.fillStyle(0x06120d).fillCircle(x, y, radius).lineStyle(selected ? 4 : 2, selected ? 0xffd166 : color).strokeCircle(x, y, radius);
          const letter = this.add.text(x, y, String(token.name || 'T').slice(0, 1).toUpperCase(), { fontFamily: 'monospace', fontSize: `${Math.round(radius)}px`, color: '#c5eebe' }).setOrigin(.5).setDepth(102);
          let portrait, mask, geometry;
          const stop = this.texture(token.avatar, key => {
            portrait = this.add.image(x, y, key).setDepth(101);
            portrait.setScale(Math.max(radius * 2 / portrait.width, radius * 2 / portrait.height));
            geometry = this.make.graphics({ x: 0, y: 0 }, false).fillStyle(0xffffff).fillCircle(x, y, radius - 3);
            mask = geometry.createGeometryMask(); portrait.setMask(mask); letter.setVisible(false);
          });
          return () => { stop(); portrait?.destroy(); mask?.destroy(); geometry?.destroy(); letter.destroy(); shape.destroy(); };
        }
        refresh() {
          const d = latest.current, w = d.cols * CELL, h = d.rows * CELL;
          const g = this.ink; g.clear(); this.labels.forEach(o => o.destroy()); this.labels = [];
          g.fillStyle(0x09170f).fillRect(0, 0, w, h);
          if (this.bg) { this.bg.destroy(); this.bg = null; }
          if (d.background) {
            const key = this.textureUrls.get(d.background);
            if (key && this.textures.exists(key)) { this.bg = this.add.image(0, 0, key).setOrigin(0).setDisplaySize(w, h).setDepth(0); g.clear(); }
            else if (!key && !this.failedUrls.has(d.background)) {
              const url = d.background, nextKey = `map-bg-${this.textureUrls.size}`;
              this.textureUrls.set(url, nextKey);
              this.load.image(nextKey, url);
              this.load.once(`filecomplete-image-${nextKey}`, () => { if (!cancelled && latest.current.background === url) this.refresh(); });
              this.load.once('loaderror', file => { if (file.key === nextKey) this.failedUrls.add(url); });
              this.load.start();
            }
          }
          for (const c of d.cells) {
            if (!c.discovered) g.fillStyle(0x020905, .97).fillRect(c.x * CELL, c.y * CELL, CELL, CELL);
            else if (c.danger) g.fillStyle(0xdb9556, .16).fillRect(c.x * CELL, c.y * CELL, CELL, CELL);
          }
          g.lineStyle(1, 0x91cf9b, .2);
          for (let x = 0; x <= d.cols; x++) g.lineBetween(x * CELL, 0, x * CELL, h);
          for (let y = 0; y <= d.rows; y++) g.lineBetween(0, y * CELL, w, y * CELL);
          if (d.route.length) {
            g.lineStyle(3, 0xe8be6a, .95).beginPath();
            d.route.forEach((p, i) => i ? g.lineTo((p.x + .5) * CELL, (p.y + .5) * CELL) : g.moveTo((p.x + .5) * CELL, (p.y + .5) * CELL)); g.strokePath();
          }
          if (d.selected) g.lineStyle(2, 0xe8be6a).strokeRect(d.selected.x * CELL + 2, d.selected.y * CELL + 2, CELL - 4, CELL - 4);
          for (const m of d.markers) {
            const x = (m.x + .5) * CELL, y = (m.y + .5) * CELL;
            const radius = Math.max(17, 12 / this.cameras.main.zoom);
            g.fillStyle(0x08180d, .95).fillCircle(x, y, radius).lineStyle(2 / this.cameras.main.zoom, 0xa9e5a6).strokeCircle(x, y, radius);
            this.labels.push(this.add.text(x, y, m.icon || '◆', { fontFamily: 'monospace', fontSize: `${Math.max(22, 17 / this.cameras.main.zoom)}px`, color: '#c5eebe' }).setOrigin(.5).setDepth(51));
          }
          if (d.player) { const x = (d.player.x + .5) * CELL, y = (d.player.y + .5) * CELL; g.lineStyle(2, 0x91f3aa).strokeCircle(x, y, 14).fillStyle(0x91f3aa).fillCircle(x, y, 6); }
        }
      }
      game = new Phaser.Game({ type: Phaser.AUTO, parent: canvasHost.current, width: host.current.clientWidth || 400, height: host.current.clientHeight || 400, backgroundColor: '#07120c', scene: MapScene, audio: { noAudio: true }, input: { mouse: false, touch: false, keyboard: false }, render: { antialias: true }, fps: { target: 30 } });
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; api.current = null; observer?.disconnect(); disposeInput?.(); game?.destroy(true); scene = null; };
  }, [sceneKey, cols, rows, retry]);

  useEffect(() => { api.current?.refresh(); }, [background, cells, markers, route, player, selected]);
  useEffect(() => {
    const grid = gridRef?.current;
    if (!grid || !ready) return;
    grid.phaserMap = { focus: (x, y) => api.current?.focus(x, y), asset: (props, ready) => api.current?.asset(props, ready), token: (token, selected) => api.current?.token(token, selected) };
    grid.dispatchEvent(new Event('phaser-ready'));
    return () => { delete grid.phaserMap; };
  }, [ready, gridRef]);

  return <section ref={host} className={`phaser-map${children ? ' phaser-map--tactical' : ''}${pan ? ' is-panning' : ''}${expanded ? ' is-expanded' : ''}`} aria-label={label} tabIndex={0}>
    <div ref={canvasHost} className="phaser-map__canvas" aria-hidden="true" />
    {children && <div ref={plane} className="phaser-map__plane" style={{ width: cols * CELL, height: rows * CELL }}>{children}</div>}
    {!ready && <div className="phaser-map__message" role="status">{error ? <>{tx.error} <button onClick={() => setRetry(v => v + 1)}>{tx.retry}</button></> : tx.loading}</div>}
    <div className="phaser-map__controls" role="toolbar" aria-label={label}>
      {children && <button type="button" aria-pressed={pan} onClick={() => setPan(v => !v)}>{pan ? '✋' : '↖'} <span>{pan ? tx.pan : tx.select}</span></button>}
      <button type="button" disabled={!ready} onClick={() => api.current.zoomAt(api.current.cameras.main.zoom / 1.25)} aria-label={tx.zoomOut}>−</button>
      <button type="button" disabled={!ready} onClick={() => api.current?.fit()} title={tx.fit}>{zoom}%</button>
      <button type="button" disabled={!ready} onClick={() => api.current.zoomAt(api.current.cameras.main.zoom * 1.25)} aria-label={tx.zoomIn}>+</button>
      <button type="button" disabled={!ready} onClick={() => api.current?.fit()}>{tx.fit}</button>
      {player && <button type="button" disabled={!ready} aria-label={tx.focus} onClick={() => api.current?.focus(player.x, player.y)}>◎</button>}
      <button type="button" aria-label={expanded ? tx.close : tx.full} aria-pressed={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? '×' : '⛶'}</button>
    </div>
  </section>;
}
