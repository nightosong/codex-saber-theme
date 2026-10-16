import { readFileSync } from "node:fs";

// VERSION is the runtime/release authority. package.json is checked in tests.
export const SKIN_VERSION = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(SKIN_VERSION)) {
  throw new Error("Invalid Saber Theme VERSION");
}
