// Isolated Chromium profile only: never attaches to or reloads the user's app.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { CdpSession, loadPayload, applyToSession } from "../scripts/injector.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browserPath = process.env.SABER_TEST_BROWSER || (process.platform === "darwin"
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  : process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "/usr/bin/google-chrome");
await fs.access(browserPath);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "saber-browser-soak-"));
const server = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(`<!doctype html><html><head><title>Saber isolated performance fixture</title></head><body>
    <aside class="app-shell-left-panel" style="width:280px;height:800px"><nav></nav></aside>
    <main class="main-surface" style="position:absolute;left:280px;top:0;width:1000px;height:800px">
    <div role="main"><article>Performance fixture</article></div><div class="composer-surface-chrome"></div></main>
    </body></html>`);
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = spawn(browserPath, ["--headless=new", "--no-first-run", "--no-default-browser-check",
  "--disable-background-networking", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${path.join(temporary, "profile")}`, "about:blank"], { stdio: "ignore" });
let browserError = null;
browser.on("error", (error) => { browserError = error; });
let session;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const snapshot = async () => {
  await sleep(100); // Let image load/error tasks release their transient DOM nodes.
  await session.send("HeapProfiler.collectGarbage");
  const heap = await session.send("Runtime.getHeapUsage");
  const dom = await session.send("Memory.getDOMCounters");
  const theme = await session.evaluate(`(() => {
    const s = window.__CODEX_DREAM_SKIN_STATE__;
    return { resources: s?.resources?.() ?? null, metrics: s?.metrics ?? null,
      timers: window.__rotationTimers.size };
  })()`);
  return { heapUsedBytes: heap.usedSize, backingStorageBytes: heap.backingStorageSize ?? null, dom, theme };
};
try {
  let port;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (browserError) throw browserError;
    try { port = Number((await fs.readFile(path.join(temporary, "profile", "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
    catch { await sleep(100); }
  }
  assert.ok(port, "Isolated browser did not expose its test port.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  session = await new CdpSession(targets.find((target) => target.type === "page"), port).open();
  await session.send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await session.evaluate("Boolean(document.querySelector('main'))")) break;
    await sleep(50);
  }
  await session.evaluate(`(() => {
    window.__rotationTimers = new Map();
    window.__nativeSetTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);
    let id = -1;
    window.setTimeout = (callback, delay, ...args) => {
      if (delay >= 60000) { const next = id--; window.__rotationTimers.set(next, () => callback(...args)); return next; }
      return window.__nativeSetTimeout(callback, delay, ...args);
    };
    window.clearTimeout = (timer) => { window.__rotationTimers.delete(timer); nativeClearTimeout(timer); };
  })()`);
  const themeRoot = path.join(temporary, "theme");
  await fs.cp(path.join(root, "presets", "preset-saber-ice-atelier"), themeRoot, { recursive: true });
  const config = JSON.parse(await fs.readFile(path.join(themeRoot, "theme.json"), "utf8"));
  config.backgroundRotation = { ...config.backgroundRotation, mode: "sequence", transitionMs: 20 };
  await fs.writeFile(path.join(themeRoot, "theme.json"), JSON.stringify(config));
  const loaded = await loadPayload(themeRoot);
  const install = () => process.env.SABER_SOAK_INLINE === "1"
    ? session.evaluate(loaded.payload) : applyToSession(session, loaded);
  await install();
  await sleep(300);
  const samples = [{ phase: "warm", ...(await snapshot()) }];
  for (let cycle = 1; cycle <= 120; cycle += 1) {
    await session.evaluate(`new Promise((resolve, reject) => {
      const state = window.__CODEX_DREAM_SKIN_STATE__;
      const rotations = state.metrics.rotations;
      const [id, callback] = [...window.__rotationTimers.entries()][0] || [];
      if (!callback) { reject(new Error("Missing rotation timer")); return; }
      window.__rotationTimers.delete(id); callback();
      let attempts = 0;
      const check = () => {
        if (state.metrics.rotations > rotations) { resolve(); return; }
        if (++attempts > 500) { reject(new Error("Rotation never settled")); return; }
        window.__nativeSetTimeout(check, 20);
      }; check();
    })`);
    if (cycle % 30 === 0) {
      const sample = { phase: `rotation-${cycle}`, ...(await snapshot()) };
      assert.ok(sample.theme.resources.activeVariantUrls <= 1);
      assert.equal(sample.theme.resources.pendingImages, 0);
      assert.equal(sample.theme.timers, 1);
      samples.push(sample);
      console.log(`PASS: ${cycle} real-image rotations; heap=${sample.heapUsedBytes}, listeners=${sample.dom.jsEventListeners}`);
    }
  }
  const rotationBaseline = samples[1];
  const rotationEnd = samples.at(-1);
  assert.ok(rotationEnd.heapUsedBytes - rotationBaseline.heapUsedBytes < 8 * 1024 * 1024, "Post-GC V8 heap grew across rotation batches.");
  assert.equal(rotationEnd.dom.jsEventListeners, rotationBaseline.dom.jsEventListeners);
  assert.ok(rotationEnd.dom.nodes - rotationBaseline.dom.nodes <= 2, "DOM nodes must plateau after warmup (allow pending browser image tasks).");
  for (let cycle = 0; cycle < 30; cycle += 1) await install();
  await sleep(300);
  const reinjected = { phase: "reinjected-30", ...(await snapshot()) };
  samples.push(reinjected);
  assert.equal(reinjected.dom.jsEventListeners, rotationBaseline.dom.jsEventListeners);
  assert.ok(reinjected.heapUsedBytes - samples[0].heapUsedBytes < 8 * 1024 * 1024, "Reinjection retained old V8 contexts or payloads.");
  assert.equal(reinjected.theme.resources.pendingImages, 0);
  assert.equal(reinjected.theme.timers, 1);
  await session.evaluate("window.__CODEX_DREAM_SKIN_STATE__.cleanup()");
  await sleep(100);
  const cleaned = { phase: "cleaned", ...(await snapshot()) };
  samples.push(cleaned);
  assert.equal(cleaned.theme.resources, null);
  assert.equal(cleaned.theme.timers, 0);
  assert.equal(cleaned.dom.jsEventListeners, 0);
  const report = { injection: process.env.SABER_SOAK_INLINE === "1" ? "inline" : "split",
    browser: await session.send("Browser.getVersion"), rotations: 120, reinjections: 30, samples,
    scope: "Isolated HTML fixture with actual theme CSS and 4K image assets. Post-GC V8/DOM bounds; not full Codex or GPU/RSS leak proof." };
  if (process.env.SABER_SOAK_REPORT) await fs.writeFile(process.env.SABER_SOAK_REPORT, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ injection: report.injection, samples: samples.map((sample) => ({ phase: sample.phase,
    heapUsedBytes: sample.heapUsedBytes, nodes: sample.dom.nodes, listeners: sample.dom.jsEventListeners,
    timers: sample.theme.timers })) }, null, 2));
} finally {
  session?.close();
  server.close();
  if (browser.pid && browser.exitCode === null) {
    const exited = once(browser, "exit");
    browser.kill("SIGTERM");
    await Promise.race([exited, sleep(5000)]);
    if (browser.exitCode === null) { browser.kill("SIGKILL"); await exited; }
  }
  await fs.rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
