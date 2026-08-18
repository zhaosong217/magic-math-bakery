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

test("server-renders the P0.4 Magic Math Bakery opening screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Magic Math Bakery<\/title>/i);
  assert.match(html, /BAKE · THINK · PLAY/);
  assert.match(html, /Magic Math/);
  assert.match(html, /Bakery/);
  assert.match(html, /TAP TO START/);
  assert.match(html, /Start Magic Math Bakery/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("P0.4 includes shared Story and Practice interaction, settings, lab play, and safe exits", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Exit to menu/);
  assert.match(source, /first-light-particles\.ogg/);
  assert.match(source, /order\.operators\.length === 1/);
  assert.match(source, /musicVolumeFromPercent/);
  assert.match(source, /magic-math-volume-percent/);
  assert.match(source, /type="range" min="0" max="100"/);
  assert.match(source, /createMediaElementSource/);
  assert.match(source, /musicGainRef/);
  assert.match(source, /syncVolumeAcrossTabs/);
  assert.match(source, /onInput=/);
  assert.doesNotMatch(source, /<i>Go!<\/i>/);
  assert.match(source, /Reset progress/);
  assert.match(source, /resetStoryProgress/);
  assert.match(source, /HOW MANY QUIZ\?/);
  assert.match(source, /createPracticeDeck/);
  assert.match(source, /unlockedPracticeOperators/);
  assert.match(source, /mode !== "lab" && storyExpressionIsLegal/);
  assert.doesNotMatch(source, /dishStage === "ready" && mode === "lab"/);
  assert.match(source, /input-focus/);
  assert.match(source, /OVEN BALANCE LAB/);
  assert.match(source, /Every ● dot and every food icon weighs 1/);
  assert.match(source, /Undo last move/);
  assert.match(source, /Clear all/);
  assert.match(source, /DRAG EACH INGREDIENT ONCE/);
  assert.match(source, /disabled=\{isPlaced \|\| recipeSolved\}/);
  assert.match(source, /!isPlaced \? dragProps/);
  assert.match(source, /Next puzzle/);
  assert.match(source, /advanceLabPuzzle/);
  assert.match(source, /CHOOSE HOW TO PLAY/);
  assert.match(source, /Magic Math Story level path/);
  assert.match(source, /Times Tables/);
  assert.match(source, /Power Divide/);
  assert.match(source, /createStoryDeck/);
  assert.match(source, /story-order-track/);
  assert.match(source, /storyDeck\.slice\(round - 1\)/);
  assert.match(source, /storyCardDeparting/);
  assert.match(source, /departing/);
  assert.match(source, /bakedRecipeCounts/);
  assert.match(source, /bakedRecipes/);
  assert.match(source, /Submit ✓/);
  assert.match(source, /Story Map/);
  assert.match(source, /Play Again/);
  assert.match(source, /startGame\(storyLevel\)/);
  assert.match(source, /Next Level/);
  assert.match(source, /startGame\(storyLevel \+ 1\)/);
  assert.match(source, /Find another way/);
  assert.match(source, /advanceStoryOrder/);
  assert.match(source, /goToNextStoryOrder/);
  assert.match(source, /storyExpressionIsLegal/);
  assert.match(source, /length >= 2/);
  assert.match(source, /foundRecipes\.length > 0 && \(totalOrders === null/);
  assert.match(source, /check-orb/);
  assert.match(source, /story-expression-actions/);
  assert.match(source, /Go to next/);
  assert.match(source, /onClick=\{\(\) => checkRecipe\(\)\}/);
  assert.doesNotMatch(source, /checkRecipe\(nextTokens\)/);
  assert.doesNotMatch(source, /Play the glowing level|Made for beginners|BONUS TIME|OVERTIME/);
  assert.match(source, /data-drop-zone="expression"/);
  assert.match(source, /data-drop-zone="lab-left"/);
  assert.match(source, /tutorialStep/);
  assert.match(source, /dragProps/);
  assert.match(source, /phase === "splash"/);
  assert.match(source, /phase === "modes"/);
  assert.match(source, /phase === "journey"/);
  assert.match(source, /splash-start/);
  assert.match(source, /startGame\(index \+ 1\)/);
  assert.match(source, /while \(values\.length < 5\)/);
  assert.match(source, /maxPieces: 3, maxWeight: 2, maxBase: 5/);
  assert.match(source, /endlessLabDifficulty/);
  assert.match(source, /seenLabPuzzlesRef/);
  assert.match(source, /sessionSeed/);
  assert.doesNotMatch(source, /labBlueprints/);
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
