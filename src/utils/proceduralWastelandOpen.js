const CELL = 100;
const GRID = 24;

function clamp(v, min, max) { return Math.max(min, Math.min(max, Number(v) || 0)); }
function hashSeed(value) { const s = String(value ?? "0"); let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randint(rng, min, max) { return Math.floor(min + rng() * (max - min + 1)); }
function pick(rng, list) { return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]; }
function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }
function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`; }

function roadProfile(rng) {
  const roll = rng();
  const type = roll < 0.36 ? "none" : roll < 0.61 ? "single" : roll < 0.86 ? "cross" : "fragments";
  return { type, surface: pick(rng, ["asphalt", "dirt", "cobblestone"]) };
}

function roadRects(profile, rng) {
  const roads = [];
  const cx = clamp(12 + randint(rng, -3, 3), 4, 19);
  const cy = clamp(12 + randint(rng, -3, 3), 4, 19);
  const width = 2;

  if (profile.type === "single") {
    if (rng() < 0.5) roads.push({ x: cx, y: 0, w: width, h: GRID });
    else roads.push({ x: 0, y: cy, w: GRID, h: width });
  } else if (profile.type === "cross") {
    roads.push({ x: cx, y: 0, w: width, h: GRID });
    roads.push({ x: 0, y: cy, w: GRID, h: width });
  } else if (profile.type === "fragments") {
    const vertical = rng() < 0.5;
    if (vertical) {
      roads.push({ x: cx, y: 0, w: width, h: randint(rng, 5, 9) });
      roads.push({ x: cx, y: randint(rng, 13, 17), w: width, h: randint(rng, 5, 8) });
    } else {
      roads.push({ x: 0, y: cy, w: randint(rng, 5, 9), h: width });
      roads.push({ x: randint(rng, 13, 17), y: cy, w: randint(rng, 5, 8), h: width });
    }
  }

  return roads;
}

function roadSvg(road, surface) {
  const x = road.x * CELL, y = road.y * CELL, w = road.w * CELL, h = road.h * CELL;
  if (surface === "dirt") return rect(x, y, w, h, "#765b3a", "#493420", 4, 0, 'opacity="0.92"');
  if (surface === "cobblestone") {
    let out = rect(x, y, w, h, "#59564f", "#34312d", 4, 0, 'opacity="0.94"');
    for (let yy = y; yy < y + h; yy += 26) out += line(x, yy, x + w, yy, "#767167", 1);
    for (let xx = x; xx < x + w; xx += 34) out += line(xx, y, xx, y + h, "#3d3a35", 1);
    return out;
  }
  return `${rect(x, y, w, h, "#3e3f3c", "#232422", 4, 0, 'opacity="0.94"')}${w > h ? line(x, y + h / 2, x + w, y + h / 2, "#aea06f", 3, "28 24") : line(x + w / 2, y, x + w / 2, y + h, "#aea06f", 3, "28 24")}`;
}

export function buildOpenWastelandSite(spec = {}) {
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:24x24:open-wasteland-roads-v7`));
  const profile = roadProfile(rng);
  const roads = roadRects(profile, rng);

  return {
    cols: GRID,
    rows: GRID,
    profile,
    roads,
    terrain: [],
    obstacles: [],
    ruins: [],
    vehicles: [],
    trees: [],
    buildings: buildOpenWastelandRoomLayout(spec),
  };
}

export function buildOpenWastelandRoomLayout() { return []; }
export function buildOpenWastelandRoomBlueprints() { return []; }

export function generateOpenWastelandSvg(input = {}) {
  const site = buildOpenWastelandSite(input);
  const width = GRID * CELL, height = GRID * CELL;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];
  site.roads.forEach((road) => out.push(roadSvg(road, site.profile.surface)));
  out.push("</svg>");
  return out.join("");
}
