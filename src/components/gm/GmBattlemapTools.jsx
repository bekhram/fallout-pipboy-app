import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./gmBattlemapTools.css";

const STORAGE_KEY = "pip2d20_gm_tools_open_v1";
const ZONE_CELLS = 6;

function readOpen() {
  try { return localStorage.getItem(STORAGE_KEY) !== "0"; } catch { return true; }
}

function pointFor(grid, event) {
  if (!grid) return null;
  const rect = grid.getBoundingClientRect();
  const cell = Number.parseFloat(grid.style.getPropertyValue("--battlemap-cell")) || grid.querySelector(".gm-session-map__cell")?.offsetWidth || 1;
  return {
    x: (event.clientX - rect.left + grid.scrollLeft) / Math.max(1, cell),
    y: (event.clientY - rect.top + grid.scrollTop) / Math.max(1, cell),
  };
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (!dx && !dy) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function nearStroke(point, stroke) {
  const pts = Array.isArray(stroke?.points) ? stroke.points : [];
  for (let i = 1; i < pts.length; i += 1) if (distanceToSegment(point, pts[i - 1], pts[i]) <= 0.55) return true;
  return false;
}

function labels() {
  const lang = String(document?.documentElement?.lang || "en").toLowerCase().split("-")[0];
  if (lang === "ru") return { tools:"ИНСТРУМЕНТЫ", draw:"КАРАНДАШ", erase:"ЛАСТИК", ruler:"ЛИНЕЙКА", clear:"ОЧИСТИТЬ", zones:"ЗОН" };
  if (lang === "uk") return { tools:"ІНСТРУМЕНТИ", draw:"ОЛІВЕЦЬ", erase:"ГУМКА", ruler:"ЛІНІЙКА", clear:"ОЧИСТИТИ", zones:"ЗОН" };
  if (lang === "pl") return { tools:"NARZĘDZIA", draw:"OŁÓWEK", erase:"GUMKA", ruler:"LINIJKA", clear:"WYCZYŚĆ", zones:"STREF" };
  return { tools:"TOOLS", draw:"PENCIL", erase:"ERASER", ruler:"RULER", clear:"CLEAR", zones:"ZONES" };
}

export default function GmBattlemapTools({ session }) {
  const scene = session?.tacticalScene || null;
  const [container, setContainer] = useState(null);
  const [grid, setGrid] = useState(null);
  const [open, setOpen] = useState(readOpen);
  const [mode, setMode] = useState("");
  const [draft, setDraft] = useState(null);
  const [ruler, setRuler] = useState(null);
  const gestureRef = useRef(null);
  const pingTimerRef = useRef(null);
  const text = labels();

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sync = () => {
      const nextContainer = document.querySelector(".gm-tactical-map-core .gm-session-map.tactical-map");
      const nextGrid = document.querySelector(".gm-tactical-map-core .gm-session-map__grid.tactical-grid");
      setContainer((v) => v === nextContainer ? v : nextContainer);
      setGrid((v) => v === nextGrid ? v : nextGrid);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList:true, subtree:true });
    return () => observer.disconnect();
  }, [scene?.sceneId]);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, open ? "1" : "0"); } catch {} }, [open]);

  useEffect(() => {
    if (!grid) return undefined;
    grid.classList.toggle("is-map-tool-active", Boolean(mode));
    return () => grid.classList.remove("is-map-tool-active");
  }, [grid, mode]);

  const markup = scene?.mapMarkup && typeof scene.mapMarkup === "object" ? scene.mapMarkup : {};
  const strokes = Array.isArray(markup.strokes) ? markup.strokes : [];
  const saveMarkup = (patch) => session?.updateTacticalScene?.({ mapMarkup: { ...markup, ...patch } });

  useEffect(() => {
    if (!grid) return undefined;

    const stopPingTimer = () => {
      if (pingTimerRef.current) window.clearTimeout(pingTimerRef.current);
      pingTimerRef.current = null;
    };

    const down = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target?.closest?.(".gm-session-token")) return;
      const point = pointFor(grid, event);
      if (!point) return;

      if (mode === "draw") {
        event.preventDefault(); event.stopPropagation();
        gestureRef.current = { type:"draw", pointerId:event.pointerId, points:[point] };
        setDraft({ points:[point] });
        grid.setPointerCapture?.(event.pointerId);
        return;
      }
      if (mode === "erase") {
        event.preventDefault(); event.stopPropagation();
        gestureRef.current = { type:"erase", pointerId:event.pointerId };
        const next = strokes.filter((stroke) => !nearStroke(point, stroke));
        if (next.length !== strokes.length) void saveMarkup({ strokes:next });
        grid.setPointerCapture?.(event.pointerId);
        return;
      }
      if (mode === "ruler") {
        event.preventDefault(); event.stopPropagation();
        gestureRef.current = { type:"ruler", pointerId:event.pointerId, start:point };
        setRuler({ start:point, end:point });
        grid.setPointerCapture?.(event.pointerId);
        return;
      }

      gestureRef.current = { type:"ping", pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, point, fired:false };
      stopPingTimer();
      pingTimerRef.current = window.setTimeout(() => {
        const g = gestureRef.current;
        if (!g || g.type !== "ping") return;
        g.fired = true;
        void saveMarkup({ ping:{ id:`ping-${Date.now()}`, x:g.point.x, y:g.point.y, at:Date.now() } });
      }, 550);
    };

    const move = (event) => {
      const g = gestureRef.current;
      if (!g || g.pointerId !== event.pointerId) return;
      const point = pointFor(grid, event);
      if (!point) return;
      if (g.type === "ping") {
        if (Math.hypot(event.clientX - g.startX, event.clientY - g.startY) > 6) stopPingTimer();
        return;
      }
      event.preventDefault(); event.stopPropagation();
      if (g.type === "draw") {
        const prev = g.points[g.points.length - 1];
        if (Math.hypot(point.x - prev.x, point.y - prev.y) > 0.08) g.points.push(point);
        setDraft({ points:[...g.points] });
      } else if (g.type === "erase") {
        const current = Array.isArray(scene?.mapMarkup?.strokes) ? scene.mapMarkup.strokes : strokes;
        const next = current.filter((stroke) => !nearStroke(point, stroke));
        if (next.length !== current.length) void session?.updateTacticalScene?.({ mapMarkup:{ ...(scene?.mapMarkup || {}), strokes:next } });
      } else if (g.type === "ruler") setRuler({ start:g.start, end:point });
    };

    const up = (event) => {
      const g = gestureRef.current;
      if (!g || g.pointerId !== event.pointerId) return;
      stopPingTimer();
      gestureRef.current = null;
      try { grid.releasePointerCapture?.(event.pointerId); } catch {}
      if (g.type === "draw") {
        event.preventDefault(); event.stopPropagation();
        if (g.points.length > 1) void saveMarkup({ strokes:[...strokes, { id:`stroke-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, points:g.points }].slice(-120) });
        setDraft(null);
      } else if (g.type === "ruler") {
        event.preventDefault(); event.stopPropagation();
        window.setTimeout(() => setRuler(null), 900);
      } else if (g.type === "erase") {
        event.preventDefault(); event.stopPropagation();
      } else if (g.type === "ping" && g.fired) {
        event.preventDefault(); event.stopPropagation();
      }
    };

    const click = (event) => {
      const g = gestureRef.current;
      if (g?.type === "ping" && g.fired) { event.preventDefault(); event.stopPropagation(); }
    };

    grid.addEventListener("pointerdown", down, true);
    grid.addEventListener("pointermove", move, true);
    grid.addEventListener("pointerup", up, true);
    grid.addEventListener("pointercancel", up, true);
    grid.addEventListener("click", click, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    return () => {
      stopPingTimer();
      grid.removeEventListener("pointerdown", down, true);
      grid.removeEventListener("pointermove", move, true);
      grid.removeEventListener("pointerup", up, true);
      grid.removeEventListener("pointercancel", up, true);
      grid.removeEventListener("click", click, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
    };
  }, [grid, mode, scene?.mapMarkup, scene?.sceneId]);

  if (!container || !grid || !scene) return null;

  const cols = Math.max(1, Number(scene?.environment?.proceduralMapSpec?.cols || scene?.cols || 12));
  const rows = Math.max(1, Number(scene?.environment?.proceduralMapSpec?.rows || scene?.rows || 12));
  const dx = ruler ? Math.abs(ruler.end.x - ruler.start.x) : 0;
  const dy = ruler ? Math.abs(ruler.end.y - ruler.start.y) : 0;
  const zones = ruler ? Math.ceil(Math.max(dx, dy) / ZONE_CELLS) : 0;

  const panel = createPortal(
    <div className={`battlemap-tools-drawer${open ? " is-open" : ""}`}>
      <button type="button" className="battlemap-tools-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}><span>{open ? "▴" : "▾"}</span><b>{text.tools}</b></button>
      <div className="battlemap-tools-panel">
        <button type="button" className={mode === "draw" ? "is-active" : ""} onClick={() => setMode((v) => v === "draw" ? "" : "draw")} title={text.draw}>✎</button>
        <button type="button" className={mode === "erase" ? "is-active" : ""} onClick={() => setMode((v) => v === "erase" ? "" : "erase")} title={text.erase}>⌫</button>
        <button type="button" className={mode === "ruler" ? "is-active" : ""} onClick={() => setMode((v) => v === "ruler" ? "" : "ruler")} title={text.ruler}>↔</button>
        <button type="button" onClick={() => void saveMarkup({ strokes:[] })} title={text.clear}>×</button>
      </div>
    </div>,
    container
  );

  const overlay = createPortal(
    <div className="battlemap-local-tools-layer" aria-hidden="true">
      {draft?.points?.length > 1 ? <svg viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none"><polyline points={draft.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="0.12" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
      {ruler ? <svg viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none"><line x1={ruler.start.x} y1={ruler.start.y} x2={ruler.end.x} y2={ruler.end.y} stroke="currentColor" strokeWidth="0.09" strokeDasharray="0.24 0.16" /><circle cx={ruler.start.x} cy={ruler.start.y} r="0.16" fill="currentColor" /><circle cx={ruler.end.x} cy={ruler.end.y} r="0.16" fill="currentColor" /></svg> : null}
      {ruler ? <span className="battlemap-ruler-label" style={{ left:`${(ruler.end.x / cols) * 100}%`, top:`${(ruler.end.y / rows) * 100}%` }}>{zones} {text.zones}</span> : null}
    </div>,
    grid
  );

  return <>{panel}{overlay}</>;
}
