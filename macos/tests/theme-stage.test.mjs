import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const macosRoot = path.resolve(here, "..");
const stageScript = path.join(macosRoot, "scripts", "stage-theme.mjs");
const fixtureAsset = path.join(macosRoot, "assets", "portal-hero.png");
const tempRoot = await fs.mkdtemp(path.join("/tmp", "codex-dream-skin-stage-"));

function runStage(source, stage) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [stageScript, source, stage], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `stage-theme exited with ${code}`));
    });
  });
}

try {
  const source = path.join(tempRoot, "themes", "preset-race");
  const stage = path.join(tempRoot, "stage");
  await fs.mkdir(source, { recursive: true });
  await fs.mkdir(stage);
  await fs.copyFile(fixtureAsset, path.join(source, "background-a.png"));
  await fs.copyFile(fixtureAsset, path.join(source, "home-background.png"));
  await fs.copyFile(fixtureAsset, path.join(source, "class-archer.png"));
  await fs.copyFile(fixtureAsset, path.join(source, "sidebar-emblem.png"));
  await fs.copyFile(fixtureAsset, path.join(source, "environment-card-art.png"));
  await fs.copyFile(fixtureAsset, path.join(source, "file-panel-art.png"));
  await fs.copyFile(fixtureAsset, path.join(source, "review-panel-art.png"));
  await fs.copyFile(fixtureAsset, path.join(source, "animated-overlay.webp"));
  await fs.writeFile(
    path.join(source, "theme.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      id: "preset-race",
      name: "A",
      image: "background-a.png",
      homeImage: "home-background.png",
      cardArt: ["class-archer.png"],
      sidebarEmblem: "sidebar-emblem.png",
      environmentCardArt: "environment-card-art.png",
      filePanelArt: "file-panel-art.png",
      reviewPanelArt: "review-panel-art.png",
      animatedOverlay: "animated-overlay.webp",
    })}\n`,
  );

  const imageName = await runStage(source, stage);
  assert.equal(imageName, "background-a.png");
  const stagedConfig = JSON.parse(await fs.readFile(path.join(stage, "theme.json"), "utf8"));
  assert.equal(stagedConfig.image, "background-a.png");
  assert.equal(stagedConfig.homeImage, "home-background.png");
  assert.deepEqual(stagedConfig.cardArt, ["class-archer.png"]);
  assert.equal(stagedConfig.sidebarEmblem, "sidebar-emblem.png");
  assert.equal(stagedConfig.environmentCardArt, "environment-card-art.png");
  assert.equal(stagedConfig.filePanelArt, "file-panel-art.png");
  assert.equal(stagedConfig.reviewPanelArt, "review-panel-art.png");
  assert.equal(stagedConfig.animatedOverlay, "animated-overlay.webp");
  assert.deepEqual(
    await fs.readFile(path.join(stage, "home-background.png")),
    await fs.readFile(path.join(source, "home-background.png")),
  );
  assert.deepEqual(
    await fs.readFile(path.join(stage, "class-archer.png")),
    await fs.readFile(path.join(source, "class-archer.png")),
  );
  assert.deepEqual(
    await fs.readFile(path.join(stage, "sidebar-emblem.png")),
    await fs.readFile(path.join(source, "sidebar-emblem.png")),
  );
  assert.deepEqual(
    await fs.readFile(path.join(stage, "environment-card-art.png")),
    await fs.readFile(path.join(source, "environment-card-art.png")),
  );
  assert.deepEqual(
    await fs.readFile(path.join(stage, "file-panel-art.png")),
    await fs.readFile(path.join(source, "file-panel-art.png")),
  );
  assert.deepEqual(
    await fs.readFile(path.join(stage, "review-panel-art.png")),
    await fs.readFile(path.join(source, "review-panel-art.png")),
  );
  assert.deepEqual(
    await fs.readFile(path.join(stage, "animated-overlay.webp")),
    await fs.readFile(path.join(source, "animated-overlay.webp")),
  );
  const stagedBeforeMutation = await fs.readFile(path.join(stage, "background-a.png"));

  // A source edit after staging must not change the pair that is about to be
  // published. This is the regression for switch-theme's old copy-after-
  // validation TOCTOU window.
  await fs.copyFile(fixtureAsset, path.join(source, "background-b.png"));
  await fs.writeFile(
    path.join(source, "theme.json"),
    `${JSON.stringify({ schemaVersion: 1, id: "preset-race", name: "B", image: "background-b.png" })}\n`,
  );
  await fs.writeFile(path.join(source, "background-a.png"), Buffer.from("changed-after-stage"));
  assert.deepEqual(await fs.readFile(path.join(stage, "background-a.png")), stagedBeforeMutation);
  assert.equal(JSON.parse(await fs.readFile(path.join(stage, "theme.json"), "utf8")).name, "A");

  const outside = path.join(tempRoot, "outside.png");
  await fs.copyFile(fixtureAsset, outside);
  const traversal = path.join(tempRoot, "traversal");
  await fs.mkdir(traversal);
  await fs.writeFile(
    path.join(traversal, "theme.json"),
    `${JSON.stringify({ schemaVersion: 1, id: "bad", image: "../outside.png" })}\n`,
  );
  const traversalStage = path.join(tempRoot, "traversal-stage");
  await fs.mkdir(traversalStage);
  await assert.rejects(runStage(traversal, traversalStage), /inside its theme directory/);

  const symlink = path.join(tempRoot, "symlink");
  await fs.mkdir(symlink);
  await fs.symlink(outside, path.join(symlink, "background.png"));
  await fs.writeFile(
    path.join(symlink, "theme.json"),
    `${JSON.stringify({ schemaVersion: 1, id: "bad-link", image: "background.png" })}\n`,
  );
  const symlinkStage = path.join(tempRoot, "symlink-stage");
  await fs.mkdir(symlinkStage);
  await assert.rejects(runStage(symlink, symlinkStage), /symbolic link/);

  console.log("PASS: theme staging snapshots a matched, contained config/image pair.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
