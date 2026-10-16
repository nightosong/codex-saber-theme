import assert from "node:assert/strict";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { applyToSession, loadPayload } from "../scripts/injector.mjs";

const preset = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../presets/preset-saber-ice-atelier");
const loaded = await loadPayload(preset);
assert.ok(Buffer.byteLength(loaded.runtimePayload) < 256 * 1024, "Resident renderer source must not include the image library.");
const context = { window: {}, Blob, Uint8Array, atob };
vm.runInNewContext(loaded.resourcePayload, context);
const assets = context.window[loaded.resourceKey];
assert.equal(assets[1].length, 29);
assert.ok(assets[0] instanceof Blob);
assert.ok(assets[1].every((image) => image instanceof Blob));
assert.equal(assets[1].reduce((bytes, image) => bytes + image.size, 0), loaded.backgroundVariantBytes);
let calls = 0;
const session = {
  async evaluate(source) {
    calls += 1;
    if (source === loaded.runtimePayload) throw new Error("simulated renderer failure");
    return vm.runInNewContext(source, context);
  },
};
await assert.rejects(applyToSession(session, loaded), /simulated renderer failure/);
assert.equal(calls, 3);
assert.equal(Object.keys(context.window).length, 0, "Failure must release temporary binary resources too.");
const again = await loadPayload(preset);
assert.equal(loaded.revision, again.revision, "Random transfer slots must not trigger redundant reloads.");
assert.notEqual(loaded.resourceKey, again.resourceKey, "Concurrent injections need independent resource slots.");
console.log("PASS: compact resident source, binary resources, failure cleanup, stable revisions, and isolated transfer slots.");
