import { buildOpenWastelandSite } from "./proceduralWastelandOpen.js";

const CELL = 100;
const GRID = 24;

function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}
function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
}
function hashSeed(value) {
  const s = String(value ?? "0");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randint(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

function roadSvg(road, surface) {
  const x = road.x * CELL;
  const y = road.y * CELL;
  const w = road.w * CELL;
  const h = road.h * CELL;
  if (surface === "dirt") {
    return rect(x, y, w, h, "#8a7658", "#5d503e", 4, 0, 'opacity="0.95"');
  }
  if (surface === "cobblestone") {
    let out = rect(x, y, w, h, "#77736b", "#514e48", 4);
    for (let yy = y; yy < y + h; yy += 26) out += line(x, yy, x + w, yy, "#918b80", 1);
    for (let xx = x; xx < x + w; xx += 34) out += line(xx, y, xx, y + h, "#5f5b54", 1);
    return out;
  }
  return `${rect(x, y, w, h, "#555654", "#3e403e", 4)}${w > h
    ? line(x, y + h / 2, x + w, y + h / 2, "#918a70", 3, "28 24")
    : line(x + w / 2, y, x + w / 2, y + h, "#918a70", 3, "28 24")}`;
}

function terrainObstacleSvg(obj) {
  if (obj.type === "cliff" || obj.type === "rocks" || obj.type === "crater") return "";
  const x = obj.x * CELL;
  const y = obj.y * CELL;
  const w = obj.w * CELL;
  const h = obj.h * CELL;
  if (obj.type === "ravine") {
    const pts = [
      `${x + 10},${y + h * 0.2}`,
      `${x + w * 0.25},${y + h * 0.44}`,
      `${x + w * 0.52},${y + h * 0.28}`,
      `${x + w - 10},${y + h * 0.7}`,
      `${x + w * 0.58},${y + h - 10}`,
      `${x + w * 0.2},${y + h * 0.72}`,
    ].join(" ");
    return `<polygon points="${pts}" fill="#3b3731" stroke="#26231f" stroke-width="12"/>`;
  }
  return "";
}

function scatterSvg(rng, blocked) {
  let out = "";
  for (let i = 0; i < 70; i += 1) {
    const gx = randint(rng, 0, GRID - 1);
    const gy = randint(rng, 0, GRID - 1);
    if (blocked.some((o) => gx >= o.x && gx < o.x + o.w && gy >= o.y && gy < o.y + o.h)) continue;
    const cx = (gx + 0.25 + rng() * 0.5) * CELL;
    const cy = (gy + 0.25 + rng() * 0.5) * CELL;
    const r = 3 + rng() * 8;
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rng() > 0.5 ? "#5b5549" : "#817660"}" opacity="0.75"/>`;
  }
  return out;
}

export function generateOpenWastelandBackgroundSvg(input = {}) {
  const site = buildOpenWastelandSite(input);
  const rng = mulberry32(hashSeed(`${input.seed || "1"}:24x24:open-wasteland-background-v2`));
  const width = GRID * CELL;
  const height = GRID * CELL;
  const blocked = [...site.roads, ...site.obstacles, ...site.vehicles, ...site.trees];
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];
  out.push(rect(0, 0, width, height, "#756b58"));
  out.push(scatterSvg(rng, blocked));
  site.roads.forEach((road) => out.push(roadSvg(road, site.profile.surface)));
  site.obstacles.forEach((obj) => out.push(terrainObstacleSvg(obj)));
  out.push(rect(18, 18, 500, 42, "#d2c3a2", "#40372e", 2, 4, 'opacity="0.93"'));
  out.push(`<text x="34" y="40" text-anchor="start" dominant-baseline="middle" fill="#332d27" font-family="monospace" font-size="11" font-weight="900">WASTELAND // 24x24 // ${site.profile.type.toUpperCase()}${site.profile.type !== "none" ? ` // ${site.profile.surface.toUpperCase()}` : ""}</text>`);
  out.push("</svg>");
  return out.join("");
}
