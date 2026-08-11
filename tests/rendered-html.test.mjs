import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("server-renders the P0 Magic Math Bakery menu", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Magic Math Bakery — One Target, Many Recipes<\/title>/i);
  assert.match(html, /Bake the number/);
  assert.match(html, /Bakery Adventure/);
  assert.match(html, /Quick Practice/);
  assert.match(html, /Number Lab/);
  assert.match(html, /Music on/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("P0.1 keeps safe exits available during play", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Exit to menu/);
  assert.match(source, /Finish exploring/);
  assert.match(source, /setInterval\(playNext, 4800\)/);
});
