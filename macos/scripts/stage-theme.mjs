import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

const [sourceDirArg, stageDirArg] = process.argv.slice(2);
if (!sourceDirArg || !stageDirArg) {
  throw new Error("Usage: stage-theme.mjs <source-theme-dir> <stage-dir>");
}

const MAX_CONFIG_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_ANIMATED_OVERLAY_BYTES = 6 * 1024 * 1024;
const MAX_BACKGROUND_VARIANT_COUNT = 8;
const MAX_CARD_ART_COUNT = 4;
const OPEN_FLAGS = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);

function assertContained(rootPath, candidatePath, label) {
  const relative = path.relative(rootPath, candidatePath);
  if (
    relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
  ) return;
  throw new Error(`${label} must stay inside its theme directory`);
}

function sameStat(left, right) {
  return left.isFile() && right.isFile()
    && left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

async function readStableFile(filePath, label, maxBytes) {
  let handle;
  try {
    handle = await fs.open(filePath, OPEN_FLAGS);
  } catch (error) {
    if (error.code === "ELOOP") throw new Error(`${label} must not be a symbolic link`);
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw new Error(`${label} must be a regular file`);
    if (before.size > maxBytes) throw new Error(`${label} is larger than ${maxBytes} bytes`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (!sameStat(before, after)) {
      throw new Error(`${label} changed while it was being staged`);
    }
    if (bytes.length > maxBytes) throw new Error(`${label} is larger than ${maxBytes} bytes`);
    return { bytes, stat: after };
  } finally {
    await handle.close();
  }
}

function decodeJson(bytes, label) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text.includes("\0")) throw new Error(`${label} contains NUL characters`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

async function writeExclusive(filePath, bytes) {
  const temporary = `${filePath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, filePath);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

async function main() {
  const sourceRoot = await fs.realpath(sourceDirArg);
  const sourceStat = await fs.stat(sourceRoot);
  if (!sourceStat.isDirectory()) throw new Error("Theme source must be a directory");

  const configPath = path.join(sourceRoot, "theme.json");
  const config = await readStableFile(configPath, "Theme config", MAX_CONFIG_BYTES);
  const theme = decodeJson(config.bytes, "Theme config");
  if (theme?.schemaVersion !== 1 || typeof theme.image !== "string" || !theme.image) {
    throw new Error("Theme config has an unsupported schema or image field");
  }
  if (path.basename(theme.image) !== theme.image) {
    throw new Error("Theme image must stay inside its theme directory");
  }
  if (theme.image === "theme.json") {
    throw new Error("Theme image must not replace theme.json");
  }
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(theme.image)) {
    throw new Error("Theme image contains control characters");
  }
  const homeImage = theme.homeImage === undefined ? null : theme.homeImage;
  if (homeImage !== null && (typeof homeImage !== "string" || !homeImage)) {
    throw new Error("Theme homeImage must be an image filename");
  }
  const cardArt = theme.cardArt === undefined ? [] : theme.cardArt;
  if (!Array.isArray(cardArt) || cardArt.length > MAX_CARD_ART_COUNT) {
    throw new Error("Theme cardArt must contain at most four image filenames");
  }
  const backgroundVariants = theme.backgroundVariants === undefined ? [] : theme.backgroundVariants;
  if (!Array.isArray(backgroundVariants) || backgroundVariants.length > MAX_BACKGROUND_VARIANT_COUNT) {
    throw new Error("Theme backgroundVariants must contain at most eight image filenames");
  }
  const sidebarEmblem = theme.sidebarEmblem === undefined ? null : theme.sidebarEmblem;
  if (sidebarEmblem !== null && (typeof sidebarEmblem !== "string" || !sidebarEmblem)) {
    throw new Error("Theme sidebarEmblem must be an image filename");
  }
  const environmentCardArt = theme.environmentCardArt === undefined ? null : theme.environmentCardArt;
  if (environmentCardArt !== null && (typeof environmentCardArt !== "string" || !environmentCardArt)) {
    throw new Error("Theme environmentCardArt must be an image filename");
  }
  const filePanelArt = theme.filePanelArt === undefined ? null : theme.filePanelArt;
  if (filePanelArt !== null && (typeof filePanelArt !== "string" || !filePanelArt)) {
    throw new Error("Theme filePanelArt must be an image filename");
  }
  const reviewPanelArt = theme.reviewPanelArt === undefined ? null : theme.reviewPanelArt;
  if (reviewPanelArt !== null && (typeof reviewPanelArt !== "string" || !reviewPanelArt)) {
    throw new Error("Theme reviewPanelArt must be an image filename");
  }
  const animatedOverlay = theme.animatedOverlay === undefined ? null : theme.animatedOverlay;
  if (animatedOverlay !== null && (typeof animatedOverlay !== "string" || !animatedOverlay)) {
    throw new Error("Theme animatedOverlay must be an image filename");
  }
  const assetNames = [
    theme.image,
    ...(homeImage && homeImage !== theme.image ? [homeImage] : []),
    ...backgroundVariants,
    ...cardArt,
    ...(sidebarEmblem ? [sidebarEmblem] : []),
    ...(environmentCardArt ? [environmentCardArt] : []),
    ...(filePanelArt ? [filePanelArt] : []),
    ...(reviewPanelArt ? [reviewPanelArt] : []),
    ...(animatedOverlay ? [animatedOverlay] : []),
  ];
  if (new Set(assetNames).size !== assetNames.length) {
    throw new Error("Theme asset filenames must be unique");
  }
  for (const name of assetNames) {
    if (typeof name !== "string" || path.basename(name) !== name || name === "theme.json") {
      throw new Error("Theme assets must stay inside its theme directory");
    }
    if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(name) || !/\.(?:png|jpe?g|webp)$/i.test(name)) {
      throw new Error("Theme assets must be supported image filenames");
    }
  }
  const assets = await Promise.all(assetNames.map(async (name, index) => {
    const assetPath = path.resolve(sourceRoot, name);
    const label = index === 0 ? "Theme image"
      : name === homeImage ? "Theme home image"
      : backgroundVariants.includes(name) ? "Theme background variant"
      : name === sidebarEmblem ? "Theme sidebar emblem"
        : name === environmentCardArt ? "Theme environment card art" : "Theme card art";
    const resolvedLabel = name === animatedOverlay ? "Theme animated overlay"
      : name === reviewPanelArt ? "Theme review panel art"
      : name === filePanelArt ? "Theme file panel art" : label;
    assertContained(sourceRoot, assetPath, resolvedLabel);
    const maxBytes = name === animatedOverlay ? MAX_ANIMATED_OVERLAY_BYTES : MAX_IMAGE_BYTES;
    const asset = await readStableFile(assetPath, resolvedLabel, maxBytes);
    if (asset.bytes.length < 1) throw new Error(`${resolvedLabel} is empty`);
    return { name, bytes: asset.bytes };
  }));

  const stageRoot = await fs.realpath(stageDirArg);
  const stageStat = await fs.stat(stageRoot);
  if (!stageStat.isDirectory()) throw new Error("Theme stage must be a directory");
  assertContained(stageRoot, path.join(stageRoot, "theme.json"), "Staged theme config");
  for (const { name } of assets) assertContained(stageRoot, path.join(stageRoot, name), "Staged theme asset");

  // Write both files from the already-open, stable descriptors. The caller
  // publishes the image first and theme.json last, so the watcher only ever
  // observes a complete pair; subsequent source edits cannot race the copy.
  await Promise.all(assets.map(({ name, bytes }) => writeExclusive(path.join(stageRoot, name), bytes)));
  await writeExclusive(path.join(stageRoot, "theme.json"), config.bytes);
  process.stdout.write(theme.image);
}

await main();
