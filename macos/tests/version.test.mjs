import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKIN_VERSION } from "../scripts/version.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageInfo = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
assert.equal(packageInfo.version, SKIN_VERSION, "package.json must mirror VERSION.");
const changelog = await fs.readFile(path.join(root, "CHANGELOG.md"), "utf8");
assert.equal(changelog.match(/^## (\S+) - /m)?.[1], SKIN_VERSION, "The latest changelog entry must match VERSION.");
for (const file of ["README.md", "README.en.md"]) {
  const content = await fs.readFile(path.join(root, "..", file), "utf8");
  assert.ok(content.includes(`\`${SKIN_VERSION}\``), `${file} must advertise the current version.`);
}
console.log(`PASS: VERSION ${SKIN_VERSION} matches package metadata, changelog, and READMEs.`);
