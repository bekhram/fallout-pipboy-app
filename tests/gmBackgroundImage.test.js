import test from "node:test";
import assert from "node:assert/strict";
import { compressGmBackground } from "../src/utils/gmBackgroundImage.js";

test("GM background upload rejects non-image files before touching browser APIs", async () => {
  await assert.rejects(() => compressGmBackground({ type: "text/plain", size: 10 }), /image/);
  await assert.rejects(() => compressGmBackground(null), /image/);
});

test("GM background upload rejects images over the existing session payload size limit", async () => {
  await assert.rejects(
    () => compressGmBackground({ type: "image/png", size: 12 * 1024 * 1024 + 1 }),
    /too-large/
  );
});
