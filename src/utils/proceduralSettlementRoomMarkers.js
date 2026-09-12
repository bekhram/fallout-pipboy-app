import {
  generateProceduralRoomData,
  roomPrimaryMarker,
} from "./proceduralRoomContent.js";
import { getProceduralRoomBounds } from "./proceduralRoomLayout.js";

const GRID = 24;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function hasCount(entries = []) {
  return entries.some((entry) => Number(entry?.count || 0) > 0);
}

function markerSymbol(room = {}) {
  if (hasCount(room.enemies)) return "!";
  if (hasCount(room.residents)) return "N";

  const marker = String(roomPrimaryMarker(room) || "").toUpperCase();
  if (marker === "TERMINAL") return "T";
  if (marker === "MEDS" || marker === "MEDKIT") return "+";
  if (marker === "SAFE") return "S";
  if (marker === "VENDING") return "V";
  if (marker === "WORKBENCH") return "W";
  if (marker === "LOOT" || marker === "AMMO_CRATE" || marker === "SUPPLIES") return "L";
  if (marker === "TRAP") return "!";
  return "?";
}

/**
 * One deterministic marker list shared by the Settlement tactical map,
 * room descriptions and token placement. Marker numbers are intentionally
 * based on the generated room order so every consumer talks about the same
 * physical room for a given procedural spec.
 */
export function generateSettlementRoomMarkers(spec = {}) {
  if (String(spec?.type || "") !== "settlement") return [];

  const rooms = generateProceduralRoomData(spec);
  const boundsByRoom = getProceduralRoomBounds(spec);

  return rooms.flatMap((room, index) => {
    const bounds = boundsByRoom[room.id];
    if (!bounds) return [];

    const centerX = clamp(
      Math.floor(Number(bounds.x || 0) + Math.max(1, Number(bounds.w || 1)) / 2),
      0,
      GRID - 1,
    );
    const centerY = clamp(
      Math.floor(Number(bounds.y || 0) + Math.max(1, Number(bounds.h || 1)) / 2),
      0,
      GRID - 1,
    );

    return [{
      id: `settlement-room:${room.id}`,
      roomId: room.id,
      marker: index + 1,
      symbol: markerSymbol(room),
      x: centerX,
      y: centerY,
      bounds: {
        x: Number(bounds.x || 0),
        y: Number(bounds.y || 0),
        w: Math.max(1, Number(bounds.w || 1)),
        h: Math.max(1, Number(bounds.h || 1)),
      },
      houseId: room.houseId || "",
      houseType: room.houseType || "",
      roomInstance: Math.max(1, Number(room.roomInstance || 1)),
      baseRoomId: room.baseRoomId || room.id,
      disposition: room.disposition || "",
    }];
  });
}

export function settlementRoomMarkerById(spec = {}) {
  return Object.fromEntries(
    generateSettlementRoomMarkers(spec).map((marker) => [marker.roomId, marker]),
  );
}
