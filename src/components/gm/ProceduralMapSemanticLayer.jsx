import React from "react";
import "./proceduralMapSemanticLayer.css";

function pct(value, total) {
  return `${(Number(value || 0) / Math.max(1, Number(total || 1))) * 100}%`;
}

function centerPct(value, total) {
  return `${((Number(value || 0) + 0.5) / Math.max(1, Number(total || 1))) * 100}%`;
}

export default function ProceduralMapSemanticLayer({ scene }) {
  const model = scene?.environment?.proceduralMap;
  if (!model || Number(model.version) < 2) return null;
  const cols = Number(scene?.cols || model?.spec?.cols || 12);
  const rows = Number(scene?.rows || model?.spec?.rows || 12);
  const walls = Array.isArray(model.walls) ? model.walls : [];
  const doors = Array.isArray(model.doors) ? model.doors : [];
  const covers = Array.isArray(model.covers) ? model.covers : [];
  const obstacles = Array.isArray(model.obstacles) ? model.obstacles : [];
  const rooms = Array.isArray(model.rooms) ? model.rooms : [];

  return (
    <div className="proc-semantic-layer" aria-hidden="true">
      {rooms.map((item) => (
        <div
          key={`room:${item.id}`}
          className="proc-semantic-room"
          style={{
            left: pct(item.x, cols),
            top: pct(item.y, rows),
            width: pct(item.w, cols),
            height: pct(item.h, rows),
          }}
        >
          <span>{item.label}</span>
        </div>
      ))}

      {walls.map((item) => {
        const vertical = Number(item.x1) === Number(item.x2);
        return (
          <i
            key={`wall:${item.id}`}
            className={`proc-semantic-wall ${vertical ? "is-vertical" : "is-horizontal"}`}
            style={vertical ? {
              left: pct(item.x1, cols),
              top: pct(Math.min(item.y1, item.y2), rows),
              height: pct(Math.abs(item.y2 - item.y1), rows),
            } : {
              left: pct(Math.min(item.x1, item.x2), cols),
              top: pct(item.y1, rows),
              width: pct(Math.abs(item.x2 - item.x1), cols),
            }}
          />
        );
      })}

      {doors.map((item) => (
        <i
          key={`door:${item.id}`}
          className={`proc-semantic-door is-${item.orientation || "h"}${item.locked ? " is-locked" : ""}`}
          style={{ left: centerPct(item.x, cols), top: centerPct(item.y, rows) }}
        />
      ))}

      {covers.map((item) => (
        <i
          key={`cover:${item.id}`}
          className={`proc-semantic-cover rating-${item.rating || 1}`}
          style={{ left: centerPct(item.x, cols), top: centerPct(item.y, rows) }}
          data-kind={item.type || "cover"}
        />
      ))}

      {obstacles.map((item) => (
        <i
          key={`obstacle:${item.id}`}
          className="proc-semantic-obstacle"
          style={{ left: centerPct(item.x, cols), top: centerPct(item.y, rows) }}
          data-kind={item.type || "obstacle"}
        />
      ))}
    </div>
  );
}
