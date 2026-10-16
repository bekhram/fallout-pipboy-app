import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  gmNarrativeStorageKey,
  readGmNarrative,
  writeGmNarrative,
  gmNarrativeGenerationMessage,
  splitPlayerNarration,
  deliverPlayerNarration,
} from "../src/utils/gmNarrativeNotes.js";

test("GM narrative keys isolate campaigns, scenes, map variants, languages and marker types", () => {
  const base = { campaignId:"c1", sceneId:"scene-A", type:"wasteland", seed:"42", kind:"room", id:"1", language:"ru" };
  const key = gmNarrativeStorageKey(base);
  for (const [field, value] of Object.entries({ campaignId:"c2", sceneId:"scene-B", type:"vault_tunnels", seed:"43", kind:"event", id:"2", language:"uk" })) {
    assert.notEqual(key, gmNarrativeStorageKey({ ...base, [field]: value }), field);
  }
});

test("GM notes are stored locally and are distinct from player narration", () => {
  const localStorage = new Map();
  global.window = { localStorage: {
    getItem: (key) => localStorage.get(key) ?? null,
    setItem: (key, value) => localStorage.set(key, value),
  }};
  const key = gmNarrativeStorageKey({ campaignId:"c", sceneId:"s", kind:"enemy", id:"enemy-22", language:"ru" });
  assert.deepEqual(readGmNarrative(key, "HP: 4"), { playerText:"", gmText:"HP: 4", guidance:"" });
  assert.equal(writeGmNarrative(key, { playerText:"Легкий шум за дверью.", gmText:"Засада супермутантов, 3 врага", guidance:"do not spoil" }), true);
  assert.equal(readGmNarrative(key).gmText, "Засада супермутантов, 3 врага");
  assert.equal(readGmNarrative(key).playerText, "Легкий шум за дверью.");
  delete global.window;
});

test("only player text reaches chat, while the numbered marker is preserved", () => {
  const sent = [];
  const session = { sendChat: (message) => { sent.push(message); return true; } };
  const secret = "GM secret: hidden enemy and legendary reward";
  const player = "You hear heavy footsteps nearby.";
  assert.equal(deliverPlayerNarration(session, 7, player), true);
  assert.deepEqual(sent, ["[#7] " + player]);
  assert.equal(sent.join(" ").includes(secret), false);
  assert.equal(deliverPlayerNarration(session, 8, ""), false);
  assert.equal(sent.length, 1);
});

test("player narration chunks fit the chat limit and short messages never mention GM-only info", () => {
  const text = ("A locked door creaks open.\n").repeat(85);
  const chunks = splitPlayerNarration(12, text, 200);
  assert.ok(chunks.length >= 10);
  assert.ok(chunks.every((chunk) => chunk.length <= 200));
  assert.ok(chunks[0].startsWith("[#12]"));
  assert.ok(chunks.every((chunk) => !chunk.includes("GM-only")));
});

test("chat delivery fails safely if the host is not connected", () => {
  const sent = [];
  const session = { sendChat: (message) => { sent.push(message); return false; } };
  assert.equal(deliverPlayerNarration(session, 3, "Visible clue"), false);
  assert.equal(sent.length, 1);
  assert.equal(deliverPlayerNarration(null, 3, "Visible clue"), false);
});

test("Auto GM brief requests scoped private vs player-facing output", () => {
  const prompt = gmNarrativeGenerationMessage({ kind:"Room", number:3, name:"Ruined checkpoint" });
  assert.match(prompt, /Room #3/);
  assert.match(prompt, /player-facing narration/);
  assert.match(prompt, /GM explanation/);
  assert.match(prompt, /Do NOT disclose/i);
});

test("battlemap exposes lazy Auto GM, numbered NPCs and per-marker editors", () => {
  const source = readFileSync(new URL("../src/components/gm/GmSessionMapV2.jsx", import.meta.url), "utf8");
  const rooms = readFileSync(new URL("../src/components/gm/GmProceduralRoomDescriptionsV4.jsx", import.meta.url), "utf8");
  const extras = readFileSync(new URL("../src/components/gm/GmBattlemapExtrasPanel.jsx", import.meta.url), "utf8");
  assert.match(source, /LazyAutoGmPanel/);
  assert.match(source, /gm-session-token__ordinal/);
  assert.match(source, /kind: "enemy"/);
  assert.match(rooms, /kind: "room"/);
  assert.match(extras, /kind: "event"/);
  assert.ok(source.indexOf('gm-map-rooms pip-panel') < source.indexOf('gm-map-lazy-panel pip-panel'));
});
