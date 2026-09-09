import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { getDoorRuntimeState } from "../../utils/proceduralMapCollision.js";
import "./proceduralMapSemanticLayer.css";

const COPY = {
  en: { door: "DOOR", open: "OPEN", close: "CLOSE", lock: "LOCK", unlock: "UNLOCK", locked: "LOCKED", closed: "CLOSED", opened: "OPEN", difficulty: "DIFFICULTY" },
  ru: { door: "ДВЕРЬ", open: "ОТКРЫТЬ", close: "ЗАКРЫТЬ", lock: "ЗАПЕРЕТЬ", unlock: "ОТПЕРЕТЬ", locked: "ЗАПЕРТА", closed: "ЗАКРЫТА", opened: "ОТКРЫТА", difficulty: "СЛОЖНОСТЬ" },
  uk: { door: "ДВЕРІ", open: "ВІДКРИТИ", close: "ЗАКРИТИ", lock: "ЗАМКНУТИ", unlock: "ВІДІМКНУТИ", locked: "ЗАМКНЕНО", closed: "ЗАКРИТО", opened: "ВІДКРИТО", difficulty: "СКЛАДНІСТЬ" },
  pl: { door: "DRZWI", open: "OTWÓRZ", close: "ZAMKNIJ", lock: "ZABLOKUJ", unlock: "ODBLOKUJ", locked: "ZABLOKOWANE", closed: "ZAMKNIĘTE", opened: "OTWARTE", difficulty: "TRUDNOŚĆ" },
};

function languageCode(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function pct(value, total) {
  return `${(Number(value || 0) / Math.max(1, Number(total || 1))) * 100}%`;
}

function centerPct(value, total) {
  return `${((Number(value || 0) + 0.5) / Math.max(1, Number(total || 1))) * 100}%`;
}

function doorStyle(item, cols, rows) {
  const vertical = item.orientation === "v";
  return {
    left: vertical ? pct(item.x, cols) : centerPct(item.x, cols),
    top: vertical ? centerPct(item.y, rows) : pct(item.y, rows),
  };
}

export default function ProceduralMapSemanticLayer({ scene, session }) {
  const { i18n } = useTranslation();
  const text = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const [selectedDoorId, setSelectedDoorId] = useState("");
  const model = scene?.environment?.proceduralMap;
  if (!model || Number(model.version) < 2) return null;
  const cols = Number(scene?.cols || model?.spec?.cols || 12);
  const rows = Number(scene?.rows || model?.spec?.rows || 12);
  const walls = Array.isArray(model.walls) ? model.walls : [];
  const doors = Array.isArray(model.doors) ? model.doors : [];
  const covers = Array.isArray(model.covers) ? model.covers : [];
  const obstacles = Array.isArray(model.obstacles) ? model.obstacles : [];
  const rooms = Array.isArray(model.rooms) ? model.rooms : [];
  const selectedDoor = doors.find((item) => item.id === selectedDoorId) || null;
  const selectedState = selectedDoor ? getDoorRuntimeState(scene, selectedDoor) : null;

  const setDoor = async (patch) => {
    if (!selectedDoor || !session?.setProceduralDoorState) return;
    await session.setProceduralDoorState(selectedDoor.id, patch);
  };

  return (
    <div className="proc-semantic-layer">
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

      {doors.map((item) => {
        const state = getDoorRuntimeState(scene, item);
        return (
          <button
            type="button"
            key={`door:${item.id}`}
            className={`proc-semantic-door is-${item.orientation || "h"}${state.locked ? " is-locked" : ""}${state.open ? " is-open" : ""}${selectedDoorId === item.id ? " is-selected" : ""}`}
            style={doorStyle(item, cols, rows)}
            title={`${text.door}: ${state.locked ? text.locked : state.open ? text.opened : text.closed}`}
            aria-label={`${text.door} ${item.id}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelectedDoorId((current) => current === item.id ? "" : item.id);
            }}
          />
        );
      })}

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

      {selectedDoor && selectedState ? (
        <div className="proc-door-panel" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
          <strong>[ {text.door} ]</strong>
          <span>{selectedDoor.id}</span>
          <small>{selectedState.locked ? text.locked : selectedState.open ? text.opened : text.closed}{selectedDoor.difficulty ? ` · ${text.difficulty} ${selectedDoor.difficulty}` : ""}</small>
          <div>
            <button type="button" className="pip-btn is-primary" disabled={selectedState.locked} onClick={() => setDoor({ open: !selectedState.open })}>
              {selectedState.open ? text.close : text.open}
            </button>
            <button type="button" className="pip-btn" onClick={() => setDoor({ locked: !selectedState.locked, open: false })}>
              {selectedState.locked ? text.unlock : text.lock}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
