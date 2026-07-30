#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const presetDir = path.join(repoRoot, "macos", "presets", "preset-saber-ice-atelier");
const docsImageDir = path.join(repoRoot, "docs", "images");
const workDir = path.join(repoRoot, "output", "readme-previews");

const viewport = { width: 1600, height: 1000 };

const asset = (name) => pathToFileURL(path.join(presetDir, name)).href;

const chromeCandidates = [
  process.env.CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next known runtime path.
    }
  }
  return null;
}

function baseStyles() {
  return `
    :root {
      --text: #1d2b3a;
      --muted: #62778c;
      --accent: #3f85bf;
      --accent-2: #66a8dc;
      --line: rgba(111, 174, 220, .30);
      --panel: rgba(255, 255, 255, .90);
      --panel-soft: rgba(255, 255, 255, .78);
    }

    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", sans-serif;
      color: var(--text);
      background: #eef7ff;
    }

    .window {
      position: relative;
      width: ${viewport.width}px;
      height: ${viewport.height}px;
      overflow: hidden;
      background-color: #f6fbff;
    }

    .window::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(ellipse at 60% 6%, rgba(145, 205, 239, .13), transparent 34%),
        linear-gradient(116deg, transparent 0 49%, rgba(111, 174, 220, .05) 49.4%, transparent 51%);
      z-index: 1;
    }

    .traffic {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 5;
      display: flex;
      gap: 9px;
    }
    .traffic span {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
    }
    .traffic span:nth-child(1) { background: #ff5f57; }
    .traffic span:nth-child(2) { background: #ffbd2e; }
    .traffic span:nth-child(3) { background: #28c840; }

    .topbar {
      position: absolute;
      top: 16px;
      right: 20px;
      z-index: 5;
      display: flex;
      gap: 18px;
      color: #8aa0b4;
      font-size: 16px;
      opacity: .92;
    }

    .sidebar {
      position: absolute;
      inset: 0 auto 0 0;
      z-index: 3;
      width: 352px;
      padding: 54px 16px 18px;
      background: linear-gradient(90deg, rgba(255,255,255,.94), rgba(255,255,255,.74));
      border-right: 1px solid rgba(111,174,220,.20);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 720;
      letter-spacing: -.02em;
      margin-bottom: 22px;
    }
    .brand small { color: var(--accent); font-size: 12px; }

    .sidebar-skeleton {
      display: grid;
      gap: 9px;
      margin: 16px 0 22px;
    }
    .skeleton-row {
      height: 14px;
      border-radius: 7px;
      background: linear-gradient(90deg, rgba(111,174,220,.16), rgba(111,174,220,.06));
    }
    .skeleton-row.short { width: 44%; }
    .skeleton-row.medium { width: 68%; }
    .skeleton-row.long { width: 86%; }
    .skeleton-box {
      height: 170px;
      border-radius: 8px;
      background:
        linear-gradient(90deg, rgba(111,174,220,.08), rgba(255,255,255,.22)),
        rgba(255,255,255,.38);
    }
    .active-frame {
      height: 31px;
      border-radius: 8px;
      background: rgba(199, 230, 250, .46);
      box-shadow: inset 0 0 0 1px rgba(111, 174, 220, .30);
    }

    .nav-row, .thread-row {
      display: flex;
      align-items: center;
      gap: 9px;
      height: 31px;
      border-radius: 8px;
      padding: 0 9px;
      font-size: 14px;
      color: #2d4052;
    }
    .nav-row.active, .thread-row.active {
      background: rgba(199, 230, 250, .56);
      box-shadow: inset 0 0 0 1px rgba(111, 174, 220, .38);
    }
    .section-title {
      margin: 18px 0 8px;
      padding-left: 2px;
      font-size: 12px;
      color: #7e90a1;
    }
    .thread-list { display: grid; gap: 3px; }
    .thread-row { justify-content: space-between; color: #314357; }
    .thread-row span:first-child {
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #3d9bea; }
    .emblem {
      position: absolute;
      left: 38px;
      bottom: 62px;
      width: 210px;
      opacity: .15;
    }
    .sidebar-footer {
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 34px;
      border-top: 1px solid rgba(111,174,220,.18);
      color: #526b82;
      font-size: 14px;
    }

    .main {
      position: absolute;
      inset: 0 0 0 352px;
      z-index: 2;
      overflow: hidden;
    }

    .composer {
      position: absolute;
      left: 48px;
      right: 50px;
      bottom: 37px;
      height: 164px;
      border: 1px solid rgba(111,174,220,.34);
      border-radius: 18px;
      background: rgba(255,255,255,.92);
      box-shadow: 0 12px 28px rgba(68,112,146,.12), inset 0 1px #fff;
      overflow: hidden;
    }
    .composer-top {
      display: flex;
      align-items: center;
      gap: 13px;
      height: 43px;
      padding: 0 16px;
      color: #607991;
      font-size: 13px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 12px;
      border: 1px solid rgba(111,174,220,.32);
      border-radius: 999px;
      background: rgba(238,247,255,.74);
      color: #668198;
    }
    .composer-text {
      height: 66px;
      padding: 10px 16px;
      color: #7a8fa3;
      font-size: 14px;
    }
    .composer-bottom {
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #6f8398;
      font-size: 13px;
    }
    .send {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: linear-gradient(180deg, #a9d8f3, #78b9e7);
      color: #fff;
      font-weight: 800;
      box-shadow: 0 8px 18px rgba(84, 151, 204, .24);
    }
  `;
}

function sidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">Codex <small>⌄</small></div>
      <div class="sidebar-skeleton">
        <div class="skeleton-row short"></div>
        <div class="skeleton-row medium"></div>
        <div class="skeleton-row medium"></div>
      </div>
      <div class="section-title">项目</div>
      <div class="sidebar-skeleton">
        <div class="skeleton-box"></div>
        <div class="active-frame"></div>
        <div class="skeleton-row long"></div>
        <div class="skeleton-row medium"></div>
        <div class="skeleton-row long"></div>
        <div class="skeleton-row medium"></div>
      </div>
      <img class="emblem" src="${asset("sidebar-emblem.png")}" alt="" />
      <div class="sidebar-footer"><span></span><span></span></div>
    </aside>
  `;
}

function homeHtml() {
  const cards = [
    ["探索并理解代码", "Archer", "card-archer.webp"],
    ["构建新功能、应用或工具", "Lancer", "card-lancer.webp"],
    ["审查代码并提出修改建议", "Berserker", "card-berserker.webp"],
    ["修复问题和失败", "Rider", "card-rider.webp"],
  ];
  return `<!doctype html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <style>
      ${baseStyles()}
      .window {
        background-image: url("${asset("home-background.png")}");
        background-repeat: no-repeat;
        background-position: right center;
        background-size: cover;
      }
      .main {
        background:
          linear-gradient(90deg,
            rgba(255,255,255,.92),
            rgba(255,255,255,.72) 44%,
            rgba(255,255,255,.30) 72%,
            rgba(255,255,255,.03));
      }
      .home-stack {
        position: absolute;
        left: 56px;
        top: 106px;
        transform: translateY(-64px);
        width: 720px;
      }
      .greeting {
        width: min(760px, calc(100% - 28px));
        padding: 18px 24px 20px;
        border: 1px solid rgba(111,174,220,.22);
        border-radius: 16px;
        background: rgba(255,255,255,.78);
        box-shadow: 0 12px 30px rgba(68,112,146,.10);
      }
      .greeting h1 {
        margin: 0;
        color: #215f92;
        font-family: "Iowan Old Style", Baskerville, "Songti SC", serif;
        font-size: 42px;
        font-style: italic;
        font-weight: 600;
        line-height: 1.08;
        letter-spacing: -.02em;
        white-space: pre;
      }
      .greeting p {
        margin: 12px 0 0;
        color: #55758f;
        font-size: 13px;
        letter-spacing: .12em;
      }
      .cards {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 720px;
        margin-top: 26px;
      }
      .card {
        position: relative;
        width: 300px;
        height: 58px;
        overflow: hidden;
        border: 1px solid rgba(111,174,220,.36);
        border-top: 3px solid #a9d8f3;
        border-radius: 10px;
        background: rgba(255,255,255,.76);
        box-shadow: 0 6px 16px rgba(68,112,146,.07), inset 0 1px rgba(255,255,255,.72);
      }
      .card::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: var(--art);
        background-size: cover;
        background-position: center;
        opacity: .42;
      }
      .card::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(255,255,255,.84), rgba(255,255,255,.50));
      }
      .card strong, .card small {
        position: absolute;
        z-index: 1;
        left: 14px;
      }
      .card strong {
        top: 13px;
        color: #243d53;
        font-size: 15px;
        font-weight: 680;
      }
      .card small {
        bottom: 8px;
        color: rgba(60,108,141,.55);
        font-family: Georgia, serif;
        font-size: 10px;
        font-weight: 560;
      }
    </style>
  </head>
  <body>
    <div class="window">
      <div class="traffic"><span></span><span></span><span></span></div>
      <div class="topbar"><span>◫</span><span>←</span><span>→</span><span>▢</span></div>
      ${sidebar()}
      <main class="main">
        <section class="home-stack">
          <div class="greeting">
            <h1>とおう、&#10;あなたがわたしのマスターか</h1>
            <p>SABER ICE ATELIER · CODEX THEME</p>
          </div>
          <div class="cards">
            ${cards.map(([title, label, image]) => `
              <div class="card" style="--art:url('${asset(image)}')">
                <strong>${title}</strong>
                <small>${label}</small>
              </div>
            `).join("")}
          </div>
        </section>
        <section class="composer">
          <div class="composer-top"><span>◉ 选择项目</span><span class="pill">▱ Playground</span><span>⌘ 本地</span><span>⌁ main</span></div>
          <div class="composer-text">随心输入</div>
          <div class="composer-bottom"><span>＋ &nbsp; ◎ 完全访问</span><span class="send">↑</span></div>
        </section>
      </main>
    </div>
  </body>
  </html>`;
}

function chatHtml() {
  return `<!doctype html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <style>
      ${baseStyles()}
      .window {
        background-image: url("${asset("background.png")}");
        background-repeat: no-repeat;
        background-position: right bottom;
        background-size: auto 90%;
      }
      .main {
        background: linear-gradient(90deg, rgba(255,255,255,.96), rgba(255,255,255,.82) 60%, rgba(255,255,255,.10));
      }
      .chat-header {
        position: absolute;
        top: 19px;
        left: 280px;
        right: 280px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 13px;
        color: #607991;
        font-size: 13px;
      }
      .chat-title {
        min-width: 250px;
        height: 26px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        background: rgba(88, 108, 151, .14);
        color: #53677c;
      }
      .chat-title.skeleton-title {
        width: 250px;
        min-width: 250px;
        background: linear-gradient(90deg, rgba(88,108,151,.12), rgba(88,108,151,.06));
      }
      .thread {
        position: absolute;
        left: 70px;
        top: 92px;
        width: 760px;
        bottom: 222px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .message {
        border: 1px solid rgba(111,174,220,.20);
        border-radius: 16px;
        background: rgba(255,255,255,.84);
        box-shadow: 0 8px 24px rgba(68,112,146,.10), inset 0 1px rgba(255,255,255,.92);
        padding: 18px 20px;
      }
      .message.user {
        width: 620px;
        align-self: flex-end;
        background: rgba(238,247,255,.88);
      }
      .message.assistant {
        width: 700px;
      }
      .message-skeleton {
        display: grid;
        gap: 10px;
      }
      .message-skeleton::before {
        content: "";
        width: 72px;
        height: 12px;
        border-radius: 999px;
        background: rgba(81, 113, 141, .20);
      }
      .skeleton-line {
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(111,174,220,.18), rgba(111,174,220,.07));
      }
      .skeleton-line.short { width: 38%; }
      .skeleton-line.medium { width: 64%; }
      .skeleton-line.long { width: 88%; }
      .skeleton-block {
        height: 58px;
        margin-top: 4px;
        border: 1px solid rgba(111,174,220,.18);
        border-radius: 12px;
        background:
          linear-gradient(90deg, rgba(111,174,220,.10), rgba(111,174,220,.04)),
          rgba(246,251,255,.74);
      }
      .composer { left: 70px; right: 120px; bottom: 42px; }
    </style>
  </head>
  <body>
    <div class="window">
      <div class="traffic"><span></span><span></span><span></span></div>
      <div class="topbar"><span>◫</span><span>←</span><span>→</span><span>▢</span></div>
      ${sidebar()}
      <main class="main">
        <div class="chat-header"><span>◫</span><span>←</span><span>→</span><span class="chat-title skeleton-title"></span><span>⋯</span></div>
        <section class="thread">
          <article class="message user">
            <div class="message-skeleton">
              <div class="skeleton-line long"></div>
              <div class="skeleton-line medium"></div>
            </div>
          </article>
          <article class="message assistant">
            <div class="message-skeleton">
              <div class="skeleton-line long"></div>
              <div class="skeleton-line long"></div>
              <div class="skeleton-line medium"></div>
              <div class="skeleton-block"></div>
            </div>
          </article>
          <article class="message assistant">
            <div class="message-skeleton">
              <div class="skeleton-line medium"></div>
              <div class="skeleton-line short"></div>
            </div>
          </article>
        </section>
        <section class="composer">
          <div class="composer-top"><span>◉ 选择项目</span><span class="pill">▱ Playground</span><span>⌘ 本地</span><span>⌁ main</span></div>
          <div class="composer-text">随心输入</div>
          <div class="composer-bottom"><span>＋ &nbsp; ◎ 完全访问</span><span class="send">↑</span></div>
        </section>
      </main>
    </div>
  </body>
  </html>`;
}

async function renderPreview(page, html, htmlPath, imagePath) {
  await fs.writeFile(htmlPath, html, "utf8");
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: imagePath,
    type: "jpeg",
    quality: 92,
    fullPage: false,
  });
}

async function main() {
  await fs.mkdir(docsImageDir, { recursive: true });
  await fs.mkdir(workDir, { recursive: true });

  const executablePath = await findChrome();
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
  });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await renderPreview(
    page,
    homeHtml(),
    path.join(workDir, "saber-home-preview.html"),
    path.join(docsImageDir, "saber-home-preview.jpg"),
  );
  await renderPreview(
    page,
    chatHtml(),
    path.join(workDir, "saber-chat-preview.html"),
    path.join(docsImageDir, "saber-chat-preview.jpg"),
  );

  await browser.close();
  console.log("Generated README previews:");
  console.log(path.join(docsImageDir, "saber-home-preview.jpg"));
  console.log(path.join(docsImageDir, "saber-chat-preview.jpg"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
