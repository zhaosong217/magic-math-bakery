import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the P0.1 Magic Math Bakery menu", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Magic Math Bakery — One Target, Many Recipes<\/title>/i);
  assert.match(html, /Bake the number/);
  assert.match(html, /Bakery Adventure/);
  assert.match(html, /Quick Practice/);
  assert.match(html, /Oven Balance Lab/);
  assert.match(html, /Endless Shift/);
  assert.match(html, /Music on/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("P0.1 includes guided inputs, delivery, lab play, and safe exits", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Exit to menu/);
  assert.match(source, /Finish exploring/);
  assert.match(source, /first-light-particles\.ogg/);
  assert.match(source, /practiceOperators\.length === 1/);
  assert.match(source, /input-focus/);
  assert.match(source, /Deliver order/);
  assert.match(source, /OVEN BALANCE LAB/);
  assert.match(source, /Every ● dot and every food icon weighs 1/);
  assert.match(source, /Undo last move/);
  assert.match(source, /Clear all/);
  assert.match(source, /Next puzzle/);
  assert.match(source, /advanceLabPuzzle/);
  assert.doesNotMatch(source, /playAmbientChord|setInterval\(playNext/);
});

test("First Light Particles web audio asset is bundled", async () => {
  const audio = await stat(new URL("../public/audio/first-light-particles.ogg", import.meta.url));
  assert.ok(audio.size > 1_000_000);
  assert.ok(audio.size < 3_000_000);
});

test("local development does not require a Worker inspector port", async () => {
  const config = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(config, /inspectorPort:\s*false/);
});
