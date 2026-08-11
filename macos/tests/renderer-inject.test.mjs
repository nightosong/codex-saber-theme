import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const macosRoot = path.resolve(here, "..");
const template = await fs.readFile(path.join(macosRoot, "assets", "renderer-inject.js"), "utf8");
const css = await fs.readFile(path.join(macosRoot, "assets", "dream-skin.css"), "utf8");
const saberPreset = JSON.parse(await fs.readFile(path.join(macosRoot, "presets", "preset-saber-ice-atelier", "theme.json"), "utf8"));

assert.doesNotMatch(
  css,
  /background-image:\s*var\(--dream-skin-art\),\s*var\(--dream-skin-art\)/,
  "The home hero must not stack duplicate copies of the selected image.",
);
assert.match(
  css,
  /data-dream-art-safe="left"[\s\S]{0,140}--ds-art-position:\s*100% var\(--ds-focus-y\);/,
  "A left text-safe image must preserve its right-side subject on narrower windows.",
);
assert.doesNotMatch(
  css,
  /background-size:\s*auto 100% !important;/,
  "Wide home artwork must not leave an unpainted half-card by fitting only to height.",
);
assert.doesNotMatch(
  css,
  /background-size:\s*100% 100%,\s*100% 100%,\s*100% auto;/,
  "Wide task artwork must cover the full route instead of ending above the composer.",
);
assert.match(
  css,
  /data-dream-art-task-mode="ambient"[\s\S]{0,500}body\s*\{[\s\S]{0,500}background-image:\s*var\(--dream-skin-art\) !important;[\s\S]{0,200}background-size:\s*cover !important;/,
  "Wide ambient task artwork should cover the full application window.",
);
assert.match(
  css,
  /data-dream-task-mode="banner"[\s\S]{0,900}body\s*\{[\s\S]{0,500}background-image:\s*var\(--dream-skin-art\) !important;[\s\S]{0,200}background-size:\s*cover !important;/,
  "Wide banner task artwork should use the same full-window wallpaper contract as ambient routes.",
);
assert.match(
  css,
  /data-dream-art-wide="true"\]:has\(main\.main-surface\.dream-skin-home-shell\)[\s\S]{0,100}body\s*\{[\s\S]{0,300}background-image:\s*var\(--dream-skin-home-art,\s*var\(--dream-skin-art\)\) !important;/,
  "Wide home artwork should use a home-specific image when the theme provides one.",
);
assert.match(
  css,
  /data-dream-art-wide="true"\]:has\(main\.main-surface\.dream-skin-home-shell\)[\s\S]{0,120}body\s*\{[\s\S]{0,260}background-position:\s*var\(--dream-skin-home-art-position,\s*var\(--ds-art-position\)\) !important;/,
  "Wide home artwork must honor the configured home focal point instead of forcing a centered crop.",
);
assert.match(
  css,
  /data-dream-art-task-mode="ambient"[\s\S]{0,260}data-dream-art-wide="true"\]:has\(main\.main-surface:not\(\.dream-skin-home-shell\)\)[\s\S]{0,120}body\s*\{[\s\S]{0,260}background-position:\s*var\(--ds-art-position\) !important;/,
  "Wide task artwork must retain the same focal point as the home route.",
);
assert.match(
  css,
  /#codex-dream-skin-background-crossfade\s*\{[\s\S]{0,360}opacity:\s*0;[\s\S]{0,260}transition:\s*opacity var\(--dream-skin-background-crossfade-ms,\s*1200ms\)/,
  "Background rotation should fade through a dedicated wallpaper layer instead of relying on background-image transitions.",
);
assert.match(
  css,
  /data-dream-art-wide="true"\]\s+\.composer-surface-chrome\s*\{[\s\S]{0,500}backdrop-filter:\s*none !important;/,
  "Wide artwork should use one uniform composer surface without a split blur layer.",
);
assert.match(
  css,
  /--ds-immersive-composer-solid:\s*rgb\(var\(--ds-panel-rgb\) \/ \.74\);/,
  "The light composer should retain enough transparency to reveal the selected artwork.",
);
assert.match(
  css,
  /data-dream-shell="light"\]\[data-dream-art-wide="true"\][\s\S]{0,100}\.composer-surface-chrome\s*\{[\s\S]{0,400}backdrop-filter:\s*blur\(8px\) saturate\(102%\) !important;/,
  "The translucent light composer should softly separate text from detailed artwork.",
);
assert.match(
  template,
  /\[class\*="_homeUtilityBar_"\][\s\S]{0,500}dream-skin-home-utility/,
  "The renderer should give the current native home utility bar a stable theme class.",
);
assert.doesNotMatch(
  template,
  /observer\.observe\(document\.documentElement,\s*\{\s*childList:\s*true,\s*subtree:\s*true/s,
  "Route synchronization must not observe the entire renderer DOM subtree.",
);
assert.doesNotMatch(
  template,
  /setInterval\(\(\) => ensure\(\{ root: false, route: true, layout: false \}\)/,
  "Route synchronization must not rescan the full page on an interval.",
);
assert.match(
  template,
  /for \(const name of \["pushState", "replaceState"\]\)/,
  "Route synchronization should be driven by explicit History navigation events.",
);
assert.match(
  css,
  /\.dream-skin-home:has\(\.dream-skin-home-utility\)[\s\S]{0,120}\.composer-surface-chrome\s*\{[\s\S]{0,180}border-radius:\s*0 0 22px 22px !important;/,
  "The home utility bar and composer should render as one continuous control.",
);
assert.match(
  css,
  /\.composer-surface-chrome button:not\(\[class~="bg-token-foreground"\]\)[\s\S]{0,100}color:\s*var\(--ds-muted\) !important;/,
  "Composer controls must remain readable when Codex native tokens lag behind a forced dark appearance.",
);
assert.match(
  css,
  /\.composer-surface-chrome button:not\(\[class~="bg-token-foreground"\]\) \*\s*\{[\s\S]{0,80}color:\s*currentColor !important;/,
  "Nested labels inside composer controls must inherit the corrected theme color.",
);
assert.match(
  css,
  /\.composer-surface-chrome p\.placeholder::after\s*\{[\s\S]{0,120}color:\s*rgb\(var\(--ds-muted-rgb\) \/ \.82\) !important;[\s\S]{0,80}opacity:\s*1 !important;/,
  "Composer placeholder text must not inherit a stale native color with double opacity.",
);
assert.match(
  css,
  /header\.app-header-tint\s*\{[\s\S]{0,180}background:\s*transparent !important;/,
  "Wide artwork should not paint a separate opaque header band.",
);
assert.match(
  css,
  /\.thread-scroll-container \.bg-gradient-to-t\.from-token-main-surface-primary\s*\{[\s\S]{0,100}background:\s*transparent !important;/,
  "Wide artwork should remove the native opaque fade behind the sticky composer.",
);
assert.match(
  css,
  /div\.sticky:has\(input\[type="text"\]\)[\s\S]{0,100}background:\s*transparent !important;/,
  "Search routes should not retain the native opaque sticky band.",
);
assert.match(
  css,
  /\[class~="bg-token-main-surface-primary"\]\[class~="h-full"\]\[class~="w-full"\][\s\S]{0,100}background:\s*transparent !important;/,
  "Full-size utility route wrappers should not hide the selected artwork.",
);
assert.match(
  css,
  /data-dream-theme-id="saber-blue-atelier"\][\s\S]{0,180}\[class~="bg-token-dropdown-background"\]\[class~="rounded-3xl"\][\s\S]{0,360}background:\s*rgb\(7 24 53 \/ \.92\) !important;/,
  "Saber Blue Atelier should theme native floating information cards.",
);
assert.match(
  css,
  /\[class~="bg-token-dropdown-background"\]\[class~="rounded-3xl"\][\s\S]{0,220}\[class~="bg-token-dropdown-background"\][\s\S]{0,180}background:\s*rgb\(7 24 53 \/ \.96\) !important;/,
  "Saber Blue Atelier should theme floating-card section headers as well as their shell.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,500}--ds-panel:\s*#ffffff;/,
  "Saber Ice Atelier should establish a white editing surface.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\] body\s*\{[\s\S]{0,180}background-attachment:\s*scroll !important;/,
  "Saber Ice Atelier should avoid fixed-wallpaper recomposition during window resizing.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,140}\[class~="bg-token-dropdown-background"\]\[class~="rounded-3xl"\][\s\S]{0,520}background:\s*rgb\(255 255 255 \/ \.98\) !important;/,
  "Saber Ice Atelier floating cards must remain readable on a near-opaque white surface.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\]\[data-dream-art-wide="true"\]:has\(main\.main-surface\) body\s*\{[\s\S]{0,180}background-size:\s*auto 90% !important;/,
  "Saber Ice Atelier should keep chat artwork clearer while preserving a lower-right accent scale.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,2200}--ds-task-immersive-far:\s*rgb\(255 255 255 \/ \.08\);/,
  "Saber Ice Atelier task surfaces should keep the right side nearly clear over the artwork.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,120}main\.main-surface\s*\{[\s\S]{0,300}rgb\(255 255 255 \/ \.04\)[\s\S]{0,80}transparent 94%/,
  "Saber Ice Atelier chat surface should leave the right-edge character area clear instead of washing it out.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,320}main\.main-surface:not\(\.dream-skin-home-shell\) article,[\s\S]{0,360}backdrop-filter:\s*none !important;/,
  "Saber Ice Atelier message cards should reduce background blur over the character art.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\]\[data-dream-art-wide="true"\]:has\(main\.main-surface\.dream-skin-home-shell\) body\s*\{[\s\S]{0,220}background-position:\s*var\(--dream-skin-home-art-position,\s*right center\) !important;[\s\S]{0,120}background-size:\s*cover !important;/,
  "Saber Ice Atelier home screen should fit the wide poster with a right-centered cover crop.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,120}main\.main-surface\.dream-skin-home-shell\s*\{[\s\S]{0,260}radial-gradient\(ellipse at 58% 8%, rgb\(145 205 239 \/ \.055\), transparent 34%\)/,
  "Saber Ice Atelier home screen should add a subtle ice glow to avoid a blank-looking hero field.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,120}main\.main-surface\.dream-skin-home-shell\s*\{[\s\S]{0,420}rgb\(255 255 255 \/ \.006\)/,
  "Saber Ice Atelier home screen should keep the artwork clearer through a reduced shell veil.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home > div:first-child > div:first-child\s*\{[\s\S]{0,240}flex:\s*0 0 auto !important;[\s\S]{0,120}min-height:\s*0 !important;/,
  "Saber Ice Atelier should not reserve a tall empty slot above the home greeting.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home > div:first-child:has\(> \.home-banners:empty\)\s*\{[\s\S]{0,180}height:\s*0 !important;[\s\S]{0,160}overflow:\s*hidden !important;/,
  "Saber Ice Atelier should collapse Codex's empty home banner wrapper.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home > div:has\(\[data-feature="game-source"\]\)\s*\{[\s\S]{0,180}padding-top:\s*clamp\(38px, 5\.9cqh, 68px\) !important;[\s\S]{0,120}transform:\s*translateY\(-64px\) !important;/,
  "Saber Ice Atelier should lift the home title and suggestion cards by roughly one card height.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home > div:has\(\[data-feature="game-source"\]\) > div:first-child\s*\{[\s\S]{0,240}align-items:\s*flex-start !important;[\s\S]{0,160}padding-bottom:\s*0 !important;/,
  "Saber Ice Atelier should stop the native home title cluster from bottom-centering.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home div:has\(> \.group\\\/home-suggestions\)\s*\{[\s\S]{0,260}width:\s*min\(720px, 62cqw\) !important;[\s\S]{0,180}margin-top:\s*clamp\(26px, 3\.2cqh, 40px\) !important;/,
  "Saber Ice Atelier should keep the home suggestions container wide enough that Codex does not hide later cards.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home:has\(\.dream-skin-home-utility\) \.composer-surface-chrome,[\s\S]{0,260}\.dream-skin-home \.dream-skin-home-utility\s*\{[\s\S]{0,120}transform:\s*translateY\(48px\) !important;/,
  "Saber Ice Atelier should lower the joined home composer near the bottom edge.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home \[class~="z-0"\]:has\(\.dream-skin-home-utility\)\s*\{[\s\S]{0,120}position:\s*relative !important;[\s\S]{0,120}z-index:\s*40 !important;[\s\S]{0,120}overflow:\s*visible !important;/,
  "Saber Ice Atelier should keep the home local/worktree picker above the shifted composer hit area.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home \.group\\\/home-suggestions \[class\*="grid-cols-"\]\s*\{[\s\S]{0,220}flex-direction:\s*column !important;[\s\S]{0,160}width:\s*720px !important;/,
  "Saber Ice Atelier should keep Codex's inner suggestion grid wide enough for four cards while stacking its children vertically.",
);
assert.doesNotMatch(
  css,
  /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\) !important;/,
  "Saber Ice Atelier must not force the home suggestion container into a two-column grid.",
);
assert.match(
  css,
  /data-dream-card-art-count="4"\][\s\S]{0,260}button\[data-dream-card-index\]\s*\{[\s\S]{0,260}max-width:\s*300px !important;[\s\S]{0,160}min-height:\s*58px !important;/,
  "Saber Ice Atelier home action cards should be narrow enough to form a compact vertical list.",
);
assert.match(
  css,
  /data-dream-card-art-count="4"\][\s\S]{0,260}button\[data-dream-card-index\]\s*\{[\s\S]{0,300}background:\s*rgb\(255 255 255 \/ \.86\) !important;/,
  "Saber Ice Atelier home action cards should stay bright over the home poster.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,260}\.dream-skin-home > div:first-child > div:first-child > div:first-child\s*\{[\s\S]{0,240}height:\s*auto !important;[\s\S]{0,120}min-height:\s*0 !important;/,
  "Saber Ice Atelier home greeting panel should use natural content height.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,180}\.group\\\/home-suggestions button\s*\{[\s\S]{0,260}border-top:\s*3px solid #a9d8f3 !important;/,
  "Saber Ice Atelier home actions should read as themed action cards.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,220}\[data-feature="game-source"\]::before\s*\{[\s\S]{0,260}content:\s*"とおう、\\Aあなたがわたしのマスターか" !important;/,
  "Saber Ice Atelier should replace the native home greeting with its two-line display title.",
);
assert.match(
  css,
  /\[data-feature="game-source"\]::before\s*\{[\s\S]{0,520}white-space:\s*pre !important;/,
  "Each line of the Saber Ice Atelier display title should remain unwrapped.",
);
assert.match(
  css,
  /\[data-feature="game-source"\]\s*\{[\s\S]{0,260}text-align:\s*left !important;/,
  "Saber Ice Atelier should left-align the home title.",
);
assert.match(
  css,
  /\[data-feature="game-source"\]::before\s*\{[\s\S]{0,520}text-align:\s*left !important;/,
  "Saber Ice Atelier display title lines should stay left-aligned.",
);
assert.match(
  css,
  /data-dream-theme-id="preset-saber-ice-atelier"\][\s\S]{0,280}\[data-feature="game-source"\] button\s*\{[\s\S]{0,100}display:\s*none !important;/,
  "Saber Ice Atelier should hide the redundant project badge in the home heading.",
);
assert.match(
  css,
  /data-dream-card-art-count="4"\][\s\S]{0,220}background-image:\s*var\(--dream-skin-card-art-1\) !important;/,
  "Saber Ice Atelier should map generated Archer artwork onto its first native action.",
);
assert.match(
  css,
  /button\[data-dream-card-index="4"\][\s\S]{0,120}content:\s*"Rider" !important;/,
  "Injected card indices should keep Rider attached to the fourth native action after a home-route redraw.",
);
assert.match(
  css,
  /data-dream-card-art-count="4"\][\s\S]{0,360}span:last-child:not\(\.dream-skin-card-label\)::after\s*\{[\s\S]{0,80}content:\s*none !important;/,
  "Generated class labels must not replace the native suggestion wording.",
);
assert.match(
  css,
  /\.dream-skin-card-art\s*\{[\s\S]{0,220}opacity:\s*\.26 !important;[\s\S]{0,80}mix-blend-mode:\s*normal !important;/,
  "Generated card art should stay light behind the native text.",
);
assert.match(
  css,
  /\.dream-skin-card-label\s*\{[\s\S]{0,140}right:\s*12px !important;[\s\S]{0,80}top:\s*9px !important;[\s\S]{0,80}bottom:\s*auto !important;/,
  "Generated class labels should be restored to the top-right corner of each compact action card.",
);
assert.match(
  css,
  /button\[data-dream-card-index\] > span:first-child\s*\{[\s\S]{0,80}display:\s*none !important;/,
  "Illustrated cards should hide the redundant native icon.",
);
assert.match(
  css,
  /button\[data-dream-card-index\] > span:not\(:first-child\):not\(\.dream-skin-card-label\)\s*\{[\s\S]{0,520}color:\s*#2b82bd !important;/,
  "Native suggestion wording should use an ice-blue primary card color.",
);
assert.match(
  css,
  /button\[data-dream-card-index\] > span:not\(:first-child\):not\(\.dream-skin-card-label\)\s*\{[\s\S]{0,560}font-size:\s*16px !important;/,
  "Native suggestion wording should be promoted as ice-blue primary card content.",
);
assert.match(
  css,
  /data-dream-card-art-count="4"\][\s\S]{0,240}button > span:first-child > span:first-child::after\s*\{[\s\S]{0,80}content:\s*none !important;/,
  "Generated card art should replace the former CSS crest symbols.",
);

assert.equal(
  saberPreset.sidebarEmblem,
  undefined,
  "Saber Ice Atelier should use its chat background artwork instead of a separate FSN sidebar emblem.",
);
assert.equal(
  saberPreset.backgroundVariants?.length,
  29,
  "Saber Ice Atelier should retain the full daily-life background carousel.",
);
assert.deepEqual(
  saberPreset.backgroundRotation,
  { enabled: true, intervalMinutes: 5, transitionMs: 600, mode: "random", includeDefault: true },
  "Saber Ice Atelier should keep the carousel with a lower-frequency, shorter transition.",
);
assert.match(
  css,
  /#codex-dream-skin-background-crossfade\s*\{[\s\S]{0,180}background-position:\s*var\(--ds-saber-task-art-position,\s*right center\) !important;[\s\S]{0,120}background-size:\s*max\(100vw,\s*177\.778vh\) auto !important;/,
  "Saber Ice Atelier should crossfade the same fixed full-window wallpaper crop used by the chat route.",
);
assert.match(
  css,
  /aside\.app-shell-left-panel\s*\{[\s\S]{0,360}background-image:[\s\S]{0,220}linear-gradient\(90deg[\s\S]{0,180}var\(--dream-skin-art\)[\s\S]{0,200}background-position:\s*center, left center !important;/,
  "Saber Ice Atelier sidebar should render the left crop of the selected chat background beneath its readable veil.",
);
assert.match(
  css,
  /aside\.app-shell-left-panel::after\s*\{[\s\S]{0,360}var\(--dream-skin-sidebar-next-art, none\)[\s\S]{0,320}transition:\s*opacity var\(--dream-skin-background-crossfade-ms, 1200ms\)/,
  "Saber Ice Atelier sidebar should crossfade its own left-cropped wallpaper layer during background rotation.",
);
assert.match(
  css,
  /main\.main-surface:not\(\.dream-skin-home-shell\)\s*\{[\s\S]{0,360}background-image:[\s\S]{0,260}linear-gradient\(90deg[\s\S]{0,220}background-position:\s*center !important;/,
  "Saber Ice Atelier task surface should keep only the white veil while the fixed wallpaper fades behind it.",
);
assert.match(
  css,
  /main\.main-surface:not\(\.dream-skin-home-shell\)\s*\{[\s\S]{0,360}rgb\(255 255 255 \/ \.68\) 38%[\s\S]{0,120}rgb\(255 255 255 \/ \.18\) 56%[\s\S]{0,120}transparent 88%/,
  "Saber Ice Atelier task surface veil should fade leftward so left-leaning character heads stay visible.",
);
assert.match(
  css,
  /main\.main-surface:not\(\.dream-skin-home-shell\)::before\s*\{[\s\S]{0,760}backdrop-filter:\s*blur\(4px\) saturate\(103%\);[\s\S]{0,320}mask-image:\s*linear-gradient\(90deg,\s*#000 0%,\s*#000 42%,\s*rgb\(0 0 0 \/ \.35\) 58%,\s*transparent 76%\)/,
  "Saber Ice Atelier should fade the central chat reading area into a softly blurred white veil.",
);
assert.match(
  template,
  /findFileExplorerPanel[\s\S]{0,520}筛选\|过滤\|filter/,
  "The file-panel illustration must anchor to the native file explorer instead of a transient chat attachment disclosure.",
);
assert.match(
  template,
  /rinLeft - 135/,
  "The Archer illustration must float to the left of the lower-right Rin illustration without changing native panel layout.",
);
assert.match(
  css,
  /#codex-dream-skin-rin-occlusion\s*\{[\s\S]{0,320}-webkit-mask:\s*var\(--dream-skin-review-panel-art\)/,
  "Rin must use its alpha silhouette as an occlusion layer over Archer where their figures overlap.",
);
assert.match(
  css,
  /\.dream-skin-environment-card::after\s*\{[\s\S]{0,520}opacity:\s*\.26;[\s\S]{0,160}pointer-events:\s*none;/,
  "The environment-card canopy should remain visible but non-interactive.",
);
assert.match(
  css,
  /\.dream-skin-environment-card\s*\{[\s\S]{0,180}overflow:\s*visible !important;/,
  "The environment-card canopy should not be clipped to the native card bounds.",
);
assert.match(
  css,
  /\.dream-skin-environment-card[\s\S]{0,160}header\[class~="bg-token-dropdown-background"\]\s*\{[\s\S]{0,160}background:\s*rgb\(255 255 255 \/ \.36\) !important;/,
  "Environment-card section headers should remain translucent over the canopy.",
);
assert.match(
  css,
  /#codex-dream-skin-animated-overlay\s*\{[\s\S]{0,260}right:\s*0;[\s\S]{0,100}bottom:\s*0;[\s\S]{0,180}height:\s*50\.2667vh;/,
  "The Saber skirt patch must stay aligned with the lower-right 78%-height wallpaper crop.",
);
assert.match(
  css,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,160}#codex-dream-skin-animated-overlay[\s\S]{0,100}display:\s*none !important;/,
  "The animated skirt patch must respect the system reduced-motion preference.",
);

function createStyleDeclaration() {
  const values = new Map();
  return {
    values,
    getPropertyValue(name) { return values.get(name) ?? ""; },
    setProperty(name, value) { values.set(name, value); },
    removeProperty(name) { values.delete(name); },
  };
}

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    values,
    add(...names) { for (const name of names) values.add(name); },
    remove(...names) { for (const name of names) values.delete(name); },
    contains(name) { return values.has(name); },
    toggle(name, enabled) {
      if (enabled) values.add(name);
      else values.delete(name);
    },
  };
}

function createFixture(theme, {
  nativeShell = "light",
  analysisFixture = null,
  analysisCache = null,
  homeMounted = false,
} = {}) {
  let fixtureShell = nativeShell;
  const nodes = new Map();
  const attributes = new Map();
  const bodyAttributes = new Map();
  const observers = [];
  const resizeObservers = [];
  const documentListeners = new Map();
  const windowListeners = new Map();
  const timers = new Map();
  let nextTimer = 1;
  let nextBlob = 1;
  const rootStyle = createStyleDeclaration();
  const root = {
    className: nativeShell === "dark" ? "electron-dark" : "electron-light",
    classList: createClassList(),
    style: rootStyle,
    appendChild(node) {
      node.parentElement = root;
      if (node.id) nodes.set(node.id, node);
    },
    getAttribute(name) { return attributes.get(name) ?? null; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
  };
  const body = {
    className: "",
    appendChild(node) {
      node.parentElement = body;
      if (node.id) nodes.set(node.id, node);
    },
    getAttribute(name) { return bodyAttributes.get(name) ?? null; },
    setAttribute(name, value) { bodyAttributes.set(name, String(value)); },
  };
  const shellBox = { left: 280, top: 36, width: 1000, height: 764 };
  const shellMain = {
    classList: createClassList(),
    getBoundingClientRect() {
      return { ...shellBox };
    },
  };
  const homeMain = {
    classList: createClassList(),
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const homeIndicator = {
    closest(selector) { return selector === '[role="main"]' ? homeMain : null; },
  };

  const createElement = (tagName) => {
    if (tagName === "canvas" && analysisFixture) {
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            drawImage() {},
            getImageData() { return { data: analysisFixture.pixels }; },
          };
        },
      };
    }
    const childNodes = new Map();
    const elementAttributes = new Map();
    let source = "";
    const element = {
      id: "",
      dataset: {},
      style: createStyleDeclaration(),
      classList: createClassList(),
      parentElement: null,
      textContent: "",
      innerHTML: "",
      get src() { return source; },
      set src(value) { source = String(value); },
      setAttribute(name, value) {
        elementAttributes.set(name, String(value));
        if (name === "src") source = String(value);
      },
      hasAttribute(name) { return name === "src" ? Boolean(source) : elementAttributes.has(name); },
      removeAttribute(name) {
        elementAttributes.delete(name);
        if (name === "src") source = "";
      },
      querySelector(selector) {
        if (!childNodes.has(selector)) childNodes.set(selector, { textContent: "" });
        return childNodes.get(selector);
      },
      remove() { if (element.id) nodes.delete(element.id); },
    };
    return element;
  };

  const document = {
    documentElement: root,
    head: root,
    body,
    hidden: false,
    addEventListener(name, handler) { documentListeners.set(name, handler); },
    removeEventListener(name, handler) {
      if (documentListeners.get(name) === handler) documentListeners.delete(name);
    },
    createElement,
    getElementById(id) { return nodes.get(id) ?? null; },
    querySelector(selector) {
      if (selector === "main.main-surface" || selector === "main") return shellMain;
      if (selector === '[data-testid="home-icon"]') return homeMounted ? homeIndicator : null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[role="main"]') return homeMounted ? [homeMain] : [];
      if (selector === '[role="main"].dream-skin-home') {
        return homeMain.classList.contains("dream-skin-home") ? [homeMain] : [];
      }
      return [];
    },
  };
  const mediaQuery = {
    matches: false,
    listeners: new Set(),
    addEventListener(_name, handler) { this.listeners.add(handler); },
    removeEventListener(_name, handler) { this.listeners.delete(handler); },
  };
  const motionQuery = {
    matches: false,
    listeners: new Set(),
    addEventListener(_name, handler) { this.listeners.add(handler); },
    removeEventListener(_name, handler) { this.listeners.delete(handler); },
  };
  const revokedUrls = [];
  const history = {
    pushState() {},
    replaceState() {},
  };
  const window = {
    history,
    addEventListener(name, handler) { windowListeners.set(name, handler); },
    removeEventListener(name, handler) {
      if (windowListeners.get(name) === handler) windowListeners.delete(name);
    },
    matchMedia(query) {
      if (query.includes("prefers-reduced-motion")) return motionQuery;
      mediaQuery.matches = fixtureShell === "dark";
      return mediaQuery;
    },
  };
  if (analysisCache) window.__CODEX_DREAM_SKIN_ANALYSIS_CACHE__ = analysisCache;
  if (analysisFixture) {
    window.Image = class {
      naturalWidth = analysisFixture.naturalWidth;
      naturalHeight = analysisFixture.naturalHeight;
      set src(_) { this.onload(); }
    };
  }
  const context = {
    window,
    document,
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe() {}
      disconnect() {}
    },
    ResizeObserver: class {
      constructor(callback) {
        this.callback = callback;
        this.target = null;
        resizeObservers.push(this);
      }
      observe(target) { this.target = target; }
      disconnect() { this.target = null; }
    },
    URL: {
      createObjectURL() { return `blob:fixture-${nextBlob++}`; },
      revokeObjectURL(value) { revokedUrls.push(value); },
    },
    Blob,
    Uint8Array,
    atob,
    getComputedStyle() {
      const skinShell = root.classList.contains("codex-dream-skin")
        ? (attributes.get("data-dream-shell") || "dark") : fixtureShell;
      return {
        colorScheme: skinShell,
        backgroundColor: fixtureShell === "dark" ? "rgb(24, 24, 27)" : "rgb(250, 250, 250)",
      };
    },
    setInterval: () => 1,
    clearInterval() {},
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    cancelAnimationFrame() {},
  };
  const payloadFor = (
    nextTheme,
    cssText = ".fixture { color: blue; }",
    homeArt = null,
    cardArt = [],
    sidebarEmblem = null,
    environmentCardArt = null,
    filePanelArt = null,
    reviewPanelArt = null,
    animatedOverlay = null,
    backgroundVariants = [],
  ) => template
    .replace("__DREAM_SKIN_CSS_JSON__", JSON.stringify(cssText))
    .replace("__DREAM_SKIN_ART_JSON__", JSON.stringify("data:image/png;base64,AA=="))
    .replace("__DREAM_SKIN_BACKGROUND_VARIANT_JSON__", JSON.stringify(backgroundVariants))
    .replace("__DREAM_SKIN_HOME_ART_JSON__", JSON.stringify(homeArt))
    .replace("__DREAM_SKIN_CARD_ART_JSON__", JSON.stringify(cardArt))
    .replace("__DREAM_SKIN_SIDEBAR_EMBLEM_JSON__", JSON.stringify(sidebarEmblem))
    .replace("__DREAM_SKIN_ENVIRONMENT_CARD_ART_JSON__", JSON.stringify(environmentCardArt))
    .replace("__DREAM_SKIN_FILE_PANEL_ART_JSON__", JSON.stringify(filePanelArt))
    .replace("__DREAM_SKIN_REVIEW_PANEL_ART_JSON__", JSON.stringify(reviewPanelArt))
    .replace("__DREAM_SKIN_ANIMATED_OVERLAY_JSON__", JSON.stringify(animatedOverlay))
    .replace("__DREAM_SKIN_THEME_JSON__", JSON.stringify(nextTheme))
    .replace("__DREAM_SKIN_VERSION_JSON__", JSON.stringify("test"))
    .replace("__DREAM_SKIN_STYLE_REVISION_JSON__", JSON.stringify(cssText));
  const flushTimers = (maximumDelay = Infinity) => {
    const pending = [...timers.entries()].filter(([, timer]) => timer.delay <= maximumDelay);
    for (const [id, timer] of pending) {
      timers.delete(id);
      timer.callback();
    }
  };

  return {
    attributes,
    body,
    bodyAttributes,
    context,
    document,
    documentListeners,
    flushTimers,
    nodes,
    observers,
    payload: payloadFor(theme),
    payloadFor,
    revokedUrls,
    resizeObservers,
    root,
    rootStyle,
    shellBox,
    timers,
    window,
    windowListeners,
    mediaQuery,
    motionQuery,
    setNativeShell(value) { fixtureShell = value; },
    setHomeMounted(value) { homeMounted = value; },
  };
}

const defaults = createFixture({
  id: "default-contract",
  appearance: "auto",
  art: { safeArea: "auto", taskMode: "auto" },
});
const defaultResult = vm.runInNewContext(defaults.payload, defaults.context);
assert.equal(defaultResult.installed, true);
assert.equal(defaults.attributes.get("data-dream-shell"), "light");
assert.equal(defaults.attributes.get("data-dream-theme-id"), "default-contract");
assert.equal(defaults.attributes.get("data-dream-art-safe-area"), "center");
assert.equal(defaults.attributes.get("data-dream-art-task-mode"), "ambient");
assert.equal(defaults.attributes.get("data-dream-art-ready"), "false");
assert.equal(defaults.rootStyle.values.get("--dream-art-position"), "50.00% 50.00%");
const homeArtTheme = {
  id: "home-art-contract",
  appearance: "light",
  art: { safeArea: "left", taskMode: "ambient", focusX: 0.82, focusY: 0.74 },
  homeArt: { focusX: 1, focusY: 0.5 },
};
const homeArt = createFixture(homeArtTheme);
vm.runInNewContext(homeArt.payloadFor(homeArtTheme, ".fixture { color: blue; }", "data:image/png;base64,AA=="), homeArt.context);
assert.equal(homeArt.rootStyle.values.get("--dream-skin-art"), 'url("blob:fixture-1")');
assert.equal(homeArt.rootStyle.values.get("--dream-skin-home-art"), 'url("blob:fixture-2")');
assert.equal(homeArt.rootStyle.values.get("--dream-skin-art-position"), "82.00% 74.00%");
assert.equal(homeArt.rootStyle.values.get("--dream-skin-home-art-position"), "100.00% 50.00%");
assert.equal(homeArt.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);
assert.deepEqual(homeArt.revokedUrls, ["blob:fixture-1", "blob:fixture-2"]);
const backgroundRotationTheme = {
  id: "background-rotation-contract",
  appearance: "light",
  art: { safeArea: "left", taskMode: "ambient" },
  backgroundRotation: { enabled: true, intervalMinutes: 1, mode: "sequence", includeDefault: true },
};
const backgroundRotation = createFixture(backgroundRotationTheme);
vm.runInNewContext(backgroundRotation.payloadFor(
  backgroundRotationTheme,
  ".fixture { color: blue; }",
  null,
  [],
  null,
  null,
  null,
  null,
  null,
  ["data:image/png;base64,AA==", "data:image/png;base64,AA=="],
), backgroundRotation.context);
assert.equal(backgroundRotation.rootStyle.values.get("--dream-skin-art"), 'url("blob:fixture-1")',
  "Background rotation should start from the primary standing artwork.");
assert.equal(backgroundRotation.attributes.get("data-dream-background-rotation"), "sequence");
assert.equal(backgroundRotation.window.__CODEX_DREAM_SKIN_STATE__.activeBackgroundArtIndex, 0);
assert.deepEqual(Array.from(backgroundRotation.window.__CODEX_DREAM_SKIN_STATE__.backgroundVariantUrls),
  [], "Rotation variants should remain undecoded until one is selected.");
backgroundRotation.flushTimers(60 * 1000);
const backgroundCrossfadeNode = backgroundRotation.nodes.get("codex-dream-skin-background-crossfade");
assert.ok(backgroundCrossfadeNode, "Background rotation should create a crossfade wallpaper layer.");
assert.equal(backgroundCrossfadeNode.style.values.get("background-image"), 'url("blob:fixture-2")');
assert.equal(backgroundCrossfadeNode.style.values.get("--dream-skin-background-crossfade-ms"), "1200ms");
assert.equal(backgroundCrossfadeNode.classList.contains("dream-skin-background-crossfade-visible"), true);
assert.equal(backgroundRotation.rootStyle.values.get("--dream-skin-art"), 'url("blob:fixture-1")',
  "The committed wallpaper should remain stable while the next image fades in.");
assert.equal(backgroundRotation.rootStyle.values.get("--dream-skin-sidebar-next-art"), 'url("blob:fixture-2")',
  "The sidebar should prepare the same next wallpaper while its left crop fades in.");
assert.equal(backgroundRotation.attributes.get("data-dream-sidebar-art-crossfade"), "true",
  "The sidebar wallpaper layer should become visible during the shared crossfade.");
backgroundRotation.flushTimers(1280);
assert.equal(backgroundRotation.rootStyle.values.get("--dream-skin-art"), 'url("blob:fixture-2")',
  "The background timer should commit the next full-body variant after the fade finishes.");
assert.equal(backgroundCrossfadeNode.classList.contains("dream-skin-background-crossfade-visible"), false);
assert.equal(backgroundRotation.attributes.get("data-dream-sidebar-art-crossfade"), "false",
  "The sidebar overlay should settle back after its image becomes the committed wallpaper.");
assert.equal(backgroundRotation.window.__CODEX_DREAM_SKIN_STATE__.activeBackgroundArtIndex, 1);
assert.deepEqual(Array.from(backgroundRotation.window.__CODEX_DREAM_SKIN_STATE__.backgroundVariantUrls),
  ["blob:fixture-2"], "Only the active rotation variant should retain a Blob URL.");
assert.equal(backgroundRotation.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);
assert.equal(backgroundRotation.nodes.has("codex-dream-skin-background-crossfade"), false);
assert.deepEqual(backgroundRotation.revokedUrls, ["blob:fixture-1", "blob:fixture-2"]);
const cardArtTheme = {
  id: "card-art-contract",
  appearance: "light",
  art: { safeArea: "left", taskMode: "ambient" },
};
const cardArt = createFixture(cardArtTheme);
vm.runInNewContext(cardArt.payloadFor(cardArtTheme, ".fixture { color: blue; }", null, [
  "data:image/png;base64,AA==",
  "data:image/png;base64,AA==",
  "data:image/png;base64,AA==",
  "data:image/png;base64,AA==",
]), cardArt.context);
assert.equal(cardArt.attributes.get("data-dream-card-art-count"), "4");
assert.equal(cardArt.rootStyle.values.get("--dream-skin-card-art-1"), 'url("blob:fixture-2")');
assert.equal(cardArt.rootStyle.values.get("--dream-skin-card-art-4"), 'url("blob:fixture-5")');
const sidebarEmblem = createFixture(cardArtTheme);
vm.runInNewContext(sidebarEmblem.payloadFor(cardArtTheme, ".fixture { color: blue; }", null, [], "data:image/png;base64,AA=="), sidebarEmblem.context);
assert.equal(sidebarEmblem.rootStyle.values.get("--dream-skin-sidebar-emblem"), 'url("blob:fixture-2")');
assert.ok(sidebarEmblem.nodes.has("codex-dream-skin-sidebar-emblem"));
const environmentCardArt = createFixture(cardArtTheme);
vm.runInNewContext(environmentCardArt.payloadFor(cardArtTheme, ".fixture { color: blue; }", null, [], null, "data:image/png;base64,AA=="), environmentCardArt.context);
assert.equal(environmentCardArt.rootStyle.values.get("--dream-skin-environment-card-art"), 'url("blob:fixture-2")');
const filePanelArt = createFixture(cardArtTheme);
vm.runInNewContext(filePanelArt.payloadFor(cardArtTheme, ".fixture { color: blue; }", null, [], null, null, "data:image/png;base64,AA=="), filePanelArt.context);
assert.equal(filePanelArt.rootStyle.values.get("--dream-skin-file-panel-art"), 'url("blob:fixture-2")');
const reviewPanelArt = createFixture(cardArtTheme);
vm.runInNewContext(reviewPanelArt.payloadFor(cardArtTheme, ".fixture { color: blue; }", null, [], null, null, null, "data:image/png;base64,AA=="), reviewPanelArt.context);
assert.equal(reviewPanelArt.rootStyle.values.get("--dream-skin-review-panel-art"), 'url("blob:fixture-2")');
const sidebarRouteExit = createFixture(cardArtTheme);
vm.runInNewContext(sidebarRouteExit.payload, sidebarRouteExit.context);
for (const id of [
  "codex-dream-skin-file-panel-art",
  "codex-dream-skin-review-panel-art",
  "codex-dream-skin-rin-occlusion",
]) {
  const node = sidebarRouteExit.document.createElement("div");
  node.id = id;
  sidebarRouteExit.document.body.appendChild(node);
}
const sidebarNavigationTarget = {
  closest(selector) {
    return selector.includes("data-app-shell-sidebar-trigger") ? {} : null;
  },
};
sidebarRouteExit.documentListeners.get("pointerdown")({ target: sidebarNavigationTarget });
assert.equal(sidebarRouteExit.nodes.has("codex-dream-skin-review-panel-art"), false,
  "Rin must be removed in the sidebar-toggle pointer event before route mutation scheduling.");
assert.equal(sidebarRouteExit.nodes.has("codex-dream-skin-file-panel-art"), false,
  "The companion panel artwork must leave with Rin.");
assert.equal(sidebarRouteExit.nodes.has("codex-dream-skin-rin-occlusion"), false,
  "Rin's occlusion mask must not outlive the artwork.");
assert.equal(sidebarRouteExit.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);
assert.equal(sidebarRouteExit.documentListeners.has("pointerdown"), false);
assert.equal(sidebarRouteExit.documentListeners.has("click"), false);
const newChatNavigation = createFixture(cardArtTheme);
vm.runInNewContext(newChatNavigation.payload, newChatNavigation.context);
const newChatControl = {
  textContent: "新对话",
  getAttribute() { return null; },
  matches() { return false; },
};
const newChatTarget = {
  closest(selector) {
    if (selector.includes("data-app-shell-sidebar-trigger")) return null;
    return selector.includes("aside.app-shell-left-panel") ? newChatControl : null;
  },
};
newChatNavigation.documentListeners.get("click")({ target: newChatTarget });
assert.equal(newChatNavigation.timers.size, 2,
  "The current New chat sidebar button must schedule fast and settled route syncs.");
assert.equal(newChatNavigation.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);
const animatedOverlay = createFixture(cardArtTheme);
vm.runInNewContext(animatedOverlay.payloadFor(
  cardArtTheme,
  ".fixture { color: blue; }",
  null,
  [],
  null,
  null,
  null,
  null,
  "data:image/webp;base64,AA==",
), animatedOverlay.context);
const animatedOverlayNode = animatedOverlay.nodes.get("codex-dream-skin-animated-overlay");
assert.ok(animatedOverlayNode, "The animated overlay asset should create a decorative image node.");
assert.equal(animatedOverlayNode.src, "blob:fixture-2");
assert.equal(animatedOverlay.window.__CODEX_DREAM_SKIN_STATE__.animatedOverlayUrl, "blob:fixture-2");
animatedOverlay.resizeObservers[0].callback([]);
assert.equal(animatedOverlayNode.src, "", "A live resize should unload animated frames immediately.");
assert.equal(animatedOverlay.window.__CODEX_DREAM_SKIN_STATE__.resizing, true);
animatedOverlay.flushTimers(180);
animatedOverlay.flushTimers(64);
assert.equal(animatedOverlayNode.src, "blob:fixture-2", "The animation should resume after layout settles.");
animatedOverlay.motionQuery.matches = true;
animatedOverlay.window.__CODEX_DREAM_SKIN_STATE__.motionHandler();
animatedOverlay.flushTimers(64);
assert.equal(animatedOverlayNode.src, "", "Reduced motion should unload the animation.");
animatedOverlay.motionQuery.matches = false;
animatedOverlay.document.hidden = true;
animatedOverlay.window.__CODEX_DREAM_SKIN_STATE__.visibilityHandler();
animatedOverlay.flushTimers(64);
assert.equal(animatedOverlayNode.src, "", "A hidden application should keep the animation unloaded.");
animatedOverlay.document.hidden = false;
animatedOverlay.window.__CODEX_DREAM_SKIN_STATE__.visibilityHandler();
animatedOverlay.flushTimers(64);
assert.equal(animatedOverlayNode.src, "blob:fixture-2", "The animation should resume when the application becomes visible.");
assert.equal(animatedOverlay.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);
assert.equal(animatedOverlay.nodes.has("codex-dream-skin-animated-overlay"), false);
assert.deepEqual(animatedOverlay.revokedUrls, ["blob:fixture-1", "blob:fixture-2"]);
const defaultMetrics = defaults.window.__CODEX_DREAM_SKIN_STATE__.metrics;
assert.equal(defaultMetrics.rootPasses, 1);
assert.equal(defaultMetrics.routePasses, 1);
assert.equal(defaultMetrics.layoutReads, 1);
assert.equal(defaults.observers.length, 1, "Only the bounded appearance observer should remain installed.");
for (let index = 0; index < 50; index += 1) defaults.window.history.pushState({}, "", `/task/${index}`);
assert.equal(defaults.timers.size, 2, "Navigation bursts should coalesce into a fast and a settled route sync.");
defaults.flushTimers(180);
defaults.flushTimers(64);
assert.equal(defaultMetrics.rootPasses, 1, "Route changes must not recompute root theme tokens.");
assert.equal(defaultMetrics.routePasses, 2);
assert.equal(defaultMetrics.layoutReads, 1, "Route changes must not force shell layout reads.");
defaults.flushTimers(720);
defaults.flushTimers(64);
assert.equal(defaultMetrics.rootPasses, 1, "The settled route sync must remain route-only.");
assert.equal(defaultMetrics.routePasses, 3, "The settled route sync should compensate for async Codex route mounting.");

const delayedHomeRoute = createFixture({
  id: "delayed-home-route",
  appearance: "light",
  art: { safeArea: "left", taskMode: "ambient" },
});
vm.runInNewContext(delayedHomeRoute.payload, delayedHomeRoute.context);
delayedHomeRoute.window.history.pushState({}, "", "/");
delayedHomeRoute.flushTimers(180);
delayedHomeRoute.flushTimers(64);
assert.equal(delayedHomeRoute.nodes.get("codex-dream-skin-chrome").classList.contains("dream-skin-home-shell"), false,
  "The fast sync must not assume that the home route has mounted already.");
delayedHomeRoute.setHomeMounted(true);
delayedHomeRoute.flushTimers(720);
delayedHomeRoute.flushTimers(64);
assert.equal(delayedHomeRoute.nodes.get("codex-dream-skin-chrome").classList.contains("dream-skin-home-shell"), true,
  "The settled sync must apply home styling after Codex mounts the home route asynchronously.");
assert.equal(delayedHomeRoute.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);

const chatRouteExit = createFixture({
  id: "chat-route-exit",
  appearance: "light",
  art: { safeArea: "left", taskMode: "ambient" },
}, { homeMounted: true });
vm.runInNewContext(chatRouteExit.payload, chatRouteExit.context);
assert.equal(chatRouteExit.nodes.get("codex-dream-skin-chrome").classList.contains("dream-skin-home-shell"), true);
chatRouteExit.setHomeMounted(false);
chatRouteExit.window.history.pushState({}, "", "/task/example");
chatRouteExit.flushTimers(180);
chatRouteExit.flushTimers(64);
assert.equal(chatRouteExit.nodes.get("codex-dream-skin-chrome").classList.contains("dream-skin-home-shell"), false,
  "Leaving home must clear the home shell so the chat wallpaper carousel remains visible.");
assert.equal(chatRouteExit.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);
assert.equal(defaults.resizeObservers.length, 1);
assert.ok(defaults.resizeObservers[0].target);
defaults.shellBox.left = 196;
defaults.shellBox.width = 1084;
defaults.resizeObservers[0].callback([]);
defaults.resizeObservers[0].callback([]);
defaults.flushTimers(64);
assert.equal(defaultMetrics.layoutReads, 1, "Resize updates should wait until resizing settles.");
defaults.flushTimers(180);
defaults.flushTimers(64);
assert.equal(defaultMetrics.layoutReads, 2, "Shell ResizeObserver changes must refresh chrome geometry.");
const defaultChrome = defaults.nodes.get("codex-dream-skin-chrome");
assert.equal(defaultChrome.style.values.get("left"), "196px");
assert.equal(defaultChrome.style.values.get("width"), "1084px");

// Auto appearance must continue following the native shell after the skin is
// already installed. The fixture makes the injected root color-scheme win
// whenever our class remains on <html>, so a temporary native probe is needed
// for each light → dark → light transition.
const shellFollow = createFixture({
  id: "shell-follow",
  appearance: "auto",
  art: { safeArea: "auto", taskMode: "auto" },
});
shellFollow.root.className = "";
vm.runInNewContext(shellFollow.payload, shellFollow.context);
assert.equal(shellFollow.attributes.get("data-dream-shell"), "light");
shellFollow.setNativeShell("dark");
shellFollow.window.__CODEX_DREAM_SKIN_STATE__.ensure();
assert.equal(shellFollow.attributes.get("data-dream-shell"), "dark");
shellFollow.setNativeShell("light");
shellFollow.window.__CODEX_DREAM_SKIN_STATE__.ensure();
assert.equal(shellFollow.attributes.get("data-dream-shell"), "light");

defaults.root.className = "";
defaults.body.setAttribute("data-theme", "dark");
defaults.observers[0].callback([{ type: "attributes", target: defaults.body }]);
defaults.flushTimers(64);
assert.equal(defaults.attributes.get("data-dream-shell"), "dark", "Body theme changes must apply without the fallback interval.");
const rootPassesAfterThemeChange = defaultMetrics.rootPasses;
defaults.observers[0].callback([{ type: "attributes", target: defaults.root }]);
defaults.flushTimers(64);
assert.equal(defaultMetrics.rootPasses, rootPassesAfterThemeChange, "Repeated native class writes without an appearance change must be ignored.");

const synchronousWide = createFixture({
  id: "synchronous-wide",
  appearance: "auto",
  art: { safeArea: "auto", taskMode: "auto" },
  artKey: "wide-art",
  artMetadata: {
    width: 2400,
    height: 1350,
    ratio: 2400 / 1350,
    wide: true,
    aspect: "wide",
    taskMode: "ambient",
  },
});
vm.runInNewContext(synchronousWide.payload, synchronousWide.context);
assert.equal(synchronousWide.attributes.get("data-dream-art-wide"), "true");
assert.equal(synchronousWide.attributes.get("data-dream-art-aspect"), "wide");
assert.equal(synchronousWide.attributes.get("data-dream-art-task-mode"), "ambient");
assert.equal(synchronousWide.attributes.get("data-dream-art-ready"), "false");

const cachedAnalysis = {
  width: 2400,
  height: 1350,
  ratio: 2400 / 1350,
  wide: true,
  aspect: "wide",
  taskMode: "ambient",
  safeArea: "left",
  focusX: 0.72,
  focusY: 0.48,
  accentRgb: { r: 180, g: 90, b: 110 },
};
const cached = createFixture({
  id: "cached-wide",
  appearance: "auto",
  art: { safeArea: "auto", taskMode: "auto" },
  artKey: "cached-art",
  artMetadata: synchronousWide.window.__CODEX_DREAM_SKIN_STATE__.artMetadata,
}, { analysisCache: new Map([["cached-art", cachedAnalysis]]) });
vm.runInNewContext(cached.payload, cached.context);
assert.equal(cached.attributes.get("data-dream-art-ready"), "true");
assert.equal(cached.attributes.get("data-dream-art-safe-area"), "left");
assert.equal(cached.window.__CODEX_DREAM_SKIN_STATE__.metrics.analysisCacheHits, 1);
assert.equal(cached.window.__CODEX_DREAM_SKIN_STATE__.metrics.analysisRuns, 0);

const previousWideState = synchronousWide.window.__CODEX_DREAM_SKIN_STATE__;
const stableStyle = synchronousWide.nodes.get("codex-dream-skin-style");
vm.runInNewContext(synchronousWide.payloadFor({
  id: "switched-wide",
  appearance: "dark",
  art: { safeArea: "right", taskMode: "ambient" },
  artKey: "switched-art",
  artMetadata: {
    width: 2400,
    height: 1350,
    ratio: 2400 / 1350,
    wide: true,
    aspect: "wide",
    taskMode: "ambient",
  },
}, ".fixture { color: red; }"), synchronousWide.context);
assert.equal(synchronousWide.nodes.get("codex-dream-skin-style"), stableStyle);
assert.equal(stableStyle.textContent, ".fixture { color: red; }");
assert.equal(stableStyle.dataset.dreamSkinVersion, "test");
assert.equal(synchronousWide.rootStyle.values.get("--dream-skin-art"), 'url("blob:fixture-2")');
assert.deepEqual(synchronousWide.revokedUrls, ["blob:fixture-1"]);
assert.equal(previousWideState.cleanup(), false, "An old async cleanup must not remove the new theme.");

const brightPixels = new Uint8ClampedArray(96 * 32 * 4);
for (let offset = 0; offset < brightPixels.length; offset += 4) {
  brightPixels[offset] = 245;
  brightPixels[offset + 1] = 224;
  brightPixels[offset + 2] = 224;
  brightPixels[offset + 3] = 255;
}
const nativeDark = createFixture({
  id: "native-dark-contract",
  appearance: "auto",
  art: { safeArea: "auto", taskMode: "auto" },
}, {
  nativeShell: "dark",
  analysisFixture: { naturalWidth: 2400, naturalHeight: 800, pixels: brightPixels },
});
vm.runInNewContext(nativeDark.payload, nativeDark.context);
await Promise.resolve();
await Promise.resolve();
nativeDark.window.__CODEX_DREAM_SKIN_STATE__.ensure();
assert.equal(nativeDark.window.__CODEX_DREAM_SKIN_STATE__.analysis.shell, "light");
assert.equal(nativeDark.attributes.get("data-dream-shell"), "dark");
assert.match(nativeDark.rootStyle.values.get("--ds-bg"), /^#[0-9a-f]{6}$/);
assert.ok(Number.parseInt(nativeDark.rootStyle.values.get("--ds-bg").slice(1), 16) < 0x303030);

const explicit = createFixture({
  id: "explicit-contract",
  appearance: "dark",
  art: { focusX: 0.15, focusY: 0.8, safeArea: "none", taskMode: "off" },
});
const explicitResult = vm.runInNewContext(explicit.payload, explicit.context);
assert.equal(explicitResult.shell, "dark");
assert.equal(explicit.attributes.get("data-dream-shell"), "dark");
assert.equal(explicit.attributes.get("data-dream-art-safe-area"), "none");
assert.equal(explicit.attributes.get("data-dream-art-safe"), "none");
assert.equal(explicit.attributes.get("data-dream-art-task-mode"), "off");
assert.equal(explicit.rootStyle.values.get("--dream-art-position"), "15.00% 80.00%");
assert.equal(explicit.window.__CODEX_DREAM_SKIN_STATE__.analysis, null);

const banner = createFixture({
  id: "banner-contract",
  appearance: "auto",
  art: { safeArea: "left", taskMode: "banner" },
  artMetadata: {
    width: 2560,
    height: 1440,
    ratio: 2560 / 1440,
    wide: true,
    aspect: "ultrawide",
    taskMode: "banner",
    safeArea: "left",
    focusX: 0.72,
    focusY: 0.44,
  },
});
vm.runInNewContext(banner.payload, banner.context);
assert.equal(banner.attributes.get("data-dream-art-wide"), "true");
assert.equal(banner.attributes.get("data-dream-art-task-mode"), "banner");
assert.equal(banner.attributes.get("data-dream-task-mode"), "banner");

assert.equal(explicit.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);
assert.equal(explicit.root.classList.contains("codex-dream-skin"), false);
assert.equal(explicit.attributes.has("data-dream-shell"), false);
assert.equal(explicit.attributes.has("data-dream-theme-id"), false);
assert.equal(explicit.attributes.has("data-dream-art-safe-area"), false);
assert.equal(explicit.attributes.has("data-dream-art-task-mode"), false);
assert.equal(explicit.rootStyle.values.has("--dream-art-position"), false);
assert.equal(explicit.nodes.has("codex-dream-skin-style"), false);
assert.equal(explicit.nodes.has("codex-dream-skin-chrome"), false);
assert.deepEqual(explicit.revokedUrls, ["blob:fixture-1"]);
await Promise.resolve();
await Promise.resolve();
assert.equal(explicit.root.classList.contains("codex-dream-skin"), false);
assert.equal(explicit.nodes.has("codex-dream-skin-style"), false);
assert.equal(explicit.window.__CODEX_DREAM_SKIN_STATE__, undefined);

console.log("PASS: renderer honors adaptive art metadata, fallback, and cleanup behavior.");
