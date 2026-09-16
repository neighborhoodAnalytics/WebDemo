import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("serves the Neighborhood Analytics application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Neighborhood Analytics/);
  assert.match(html, /Vancouver pilot/i);
  assert.match(html, /Find a neighbourhood that fits your life/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps recommendation data and logic transparent", async () => {
  const source = await readFile(new URL("../lib/recommendations.ts", import.meta.url), "utf8");
  assert.match(source, /Mount Pleasant/);
  assert.match(source, /Commercial Drive/);
  assert.match(source, /Kitsilano/);
  assert.match(source, /selected\.has\(priority\) \? 4 : 0\.65/);
  assert.match(source, /b\.budgetFit - a\.budgetFit/);
  assert.match(source, /localeCompare/);
});
