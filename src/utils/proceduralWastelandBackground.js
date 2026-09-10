import { buildOpenWastelandSite } from "./proceduralWastelandOpen.js";

const CELL = 100;
const GRID = 24;

function rect(x, y, w, h, fill, stroke = "none", sw = 0, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
}

function ellipse(cx, cy, rx, ry, fill, stroke = "none", sw = 0) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
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

function roadSvg(road, surface) {
  const x = road.x * CELL;
  const y = road.y * CELL;
  const w = road.w * CELL;
  const h = road.h * CELL;

  if (surface === "dirt") {
    return rect(x, y, w, h, "#8a7658", "#5d503e", 4, 'opacity="0.95"');
  }

  if (surface === "cobblestone") {
    let out = rect(x, y, w, h, "#77736b", "#514e48", 4);
    for (let yy = y; yy < y + h; yy += 26) out += line(x, yy, x + w, yy, "#918b80", 1);
    for (let xx = x; xx < x + w; xx += 34) out += line(xx, y, xx, y + h, "#5f5b54", 1);
    return out;
  }

  return `${rect(x, y, w, h, "#555654", "#3e403e", 4)}${
    w > h
      ? line(x, y + h / 2, x + w, y + h / 2, "#918a70", 3, "28 24")
      : line(x + w / 2, y, x + w / 2, y + h, "#918a70", 3, "28 24")
  }`;
}

function naturalObstacleSvg(obj) {
  if (obj.type !== "crater" && obj.type !== "ravine") return "";
  const x = obj.x * CELL;
  const y = obj.y * CELL;
  const w = obj.w * CELL;
  const h = obj.h * CELL;

  if (obj.type === "crater") {
    return `${ellipse(x + w / 2, y + h / 2, w * 0.45, h * 0.4, "#55483b", "#302820", 10)}${ellipse(
      x + w / 2,
      y + h / 2,
      w * 0.26,
      h * 0.22,
      "#2f2924",
      "#6d5944",
      4
    )}`;
  }

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

function scatterSvg(seed) {
  const rng = mulberry32(hashSeed(`${seed || "1"}:wasteland-background-scatter-v1`));
  let out = "";
  for (let i = 0; i < 80; i += 1) {
    const cx = rng() * GRID * CELL;
    const cy = rng() * GRID * CELL;
    const r = 2 + rng() * 7;
    out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${rng() > 0.5 ? "#5b5549" : "#817660"}" opacity="0.62"/>`;
  }
  return out;
}

export function generateOpenWastelandBackgroundSvg(input = {}) {
  const site = buildOpenWastelandSite({ ...input, cols: GRID, rows: GRID });
  const width = GRID * CELL;
  const height = GRID * CELL;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];

  out.push(rect(0, 0, width, height, "#756b58"));
  out.push(scatterSvg(input.seed));
  site.roads.forEach((road) => out.push(roadSvg(road, site.profile.surface)));
  site.obstacles.forEach((obj) => {
    const svg = naturalObstacleSvg(obj);
    if (svg) out.push(svg);
  });

  out.push("</svg>");
  return out.join("");
}
