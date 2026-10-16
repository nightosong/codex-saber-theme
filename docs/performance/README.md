# 性能检查与验证范围

## 2026-10-16 已修复的资源生命周期问题

- 常驻渲染脚本原本包含所有图片的 Base64 字面量。即便把图片转换为 Blob，仍有存活函数引用这个脚本，其源文本也可能持续占用 V8 堆。默认的一次性注入现改为“临时脚本传输压缩二进制资源 → 小型常驻脚本 → 删除临时资源入口”，避免图片字符串随主题逻辑常驻。
- 轮播库保留压缩 Blob，而不是 Base64 字符串；只为当前和过渡中的轮播图创建 URL，离开后撤销。默认主图、首页图和卡片图仍可能由浏览器独立缓存，不能把轮播 URL 数量当作总图片内存。
- 过渡完成后清空隐藏覆盖层的 `background-image` 和侧栏下一张图片变量，避免透明层继续引用图片。
- 窗口隐藏时取消轮播及未完成的过渡；恢复后等待正常间隔，不补播。预加载有超时、取消和失败回退；替换主题和卸载会取消待完成图片请求。
- 重复注入会清理旧的事件监听、观察器、计时器、图片 URL 和压缩轮播资源；History 接口被其他库包装时复用可替换回调的分发器，避免旧实例不断叠加。过期实例不得再执行样式刷新。
- CDP 不再启用不需要的 `Runtime.enable`，避免在开发监听模式中回放／持续接收应用控制台消息；连接失败和多窗口处理失败时也关闭未处理的会话。开发模式的拒绝目标记录有数量边界和重试间隔。

## 测试证据

实际运行平台：macOS；浏览器为隔离的 Headless Chrome 155.0.8059.40，与本机应用使用的 Chromium 主版本一致。夹具加载真实主题 CSS 和全部 4K 壁纸资源，但不包含 Codex 的 React 页面、聊天、插件或工作区。

使用同一份当前渲染逻辑，对照旧的单段图片内联传输与新的分段传输。该对照用于衡量传输方式，**不是整个旧版本与新版本的应用总内存对照**。

| 检查 | 结果 |
| --- | --- |
| 模拟 2,000 次轮播 | 稳态轮播定时器 1 个；当前/过渡 URL 数有界；结束过渡后覆盖层无图片引用 |
| 模拟 200 次重复注入 | 事件监听、观察器、媒体监听与定时器不累积；卸载后释放 |
| 外部库包装 History 后重复注入 50 次 | 不叠加过期刷新回调；卸载后不再安排定时器 |
| 隔离浏览器，真实图片轮播 120 次 | 监听器始终 8 个；轮播定时器 1 个；稳态 DOM 节点保持约 56 个 |
| 隔离浏览器，真实重新注入 30 次 | 未见堆、监听器或 DOM 节点持续增长；卸载后监听器和轮播定时器均为 0 |
| 120 次轮播后的 V8 堆，单段内联 | 约 22.4 MiB |
| 120 次轮播后的 V8 堆，分段传输 | 约 1.05 MiB |

原始证据：[单段传输](2026-10-16-inline.json)、[分段传输](2026-10-16-split.json)。隔离测试在采样前主动 GC（垃圾回收）以比较存活对象，**没有对用户正在运行的 Codex 强制 GC 或刷新**。

V8 堆不包含全部图片 Blob、解码缓存、GPU 纹理、系统图形缓冲或整个进程的常驻内存；不能据此宣称应用总内存减少 95%，也不能据此排除整个 Codex 的长期卡顿问题。测试没有发现这些轮播／重复注入路径的无界增长，但仍需真实应用对照采样。

## 复现

在 macOS 仓库根目录，用项目发现并验证的官方 Node.js 运行：

```bash
macos/tests/run-tests.sh
```

可选真实浏览器压力测试（使用独立临时 profile，不控制用户浏览器或 Codex）：

```bash
/bin/bash -c '
  . macos/scripts/common-macos.sh
  discover_codex_app
  require_macos_runtime
  SABER_SOAK_REPORT=/tmp/saber-split.json "$NODE" macos/tests/browser-soak.test.mjs
  SABER_SOAK_INLINE=1 SABER_SOAK_REPORT=/tmp/saber-inline.json "$NODE" macos/tests/browser-soak.test.mjs
'
```

默认使用 `/Applications/Google Chrome.app`；可通过 `SABER_TEST_BROWSER` 指向独立的 Chromium 可执行文件。测试结束关闭且只关闭它自己启动的进程，并删除临时 profile。

Windows 在 Windows PowerShell 执行 `windows/tests/runtime.Tests.ps1`，再使用可信 Node.js 执行 `image-metadata`、`injector-bootstrap`、`resource-transfer` 和 `renderer-inject` 的 `.test.mjs`。已配置平台 CI，但本次未运行远程 CI，也未完成 Windows Store 真机启动、签名发现和界面验收。

## 真实 Codex 卡顿诊断

需要先通过 Saber Theme 启动，以提供经过归属校验的本机 CDP 端口。macOS：

```bash
macos/scripts/diagnose-dream-skin-macos.sh --samples 120 --interval-ms 5000 > /tmp/saber-diagnostics.ndjson
```

Windows 使用开始菜单的 Diagnose Saber Theme，或运行 `windows/scripts/saber-theme.ps1 -Action Diagnose`。

诊断只读取整个渲染器的堆大小、DOM 和监听器数量、脚本／布局累计耗时，以及主题刷新计数和资源数量；不读取聊天正文、不截图、不刷新、不重注入、不强制 GC。默认 10 次采样、间隔 2 秒；长时间观察可增加采样数。

建议在相同窗口和聊天长度下，分别采集刚启动、出现卡顿、暂停主题后的数据。用户正常浏览和收到流式回复时节点及堆本来会变化，因此短期上涨不能直接判定泄漏。重点比较闲置时是否持续增长、是否与主题 `ensureCalls`/`layoutReads` 增长同步、暂停主题后是否改变趋势。暂停也不能保证浏览器立即释放解码/GPU 缓存。

当前本机记录的 9341 端口未通过官方应用归属校验，且稳定安装入口仍指向旧 checkout。本次未关闭或重启 Codex，未将新代码安装到现有会话，因此没有把旧会话的占用归因于本次仓库实现。

`--foreground-injector` 是开发模式，仍需保留用于刷新后执行的完整早期脚本；上述分段传输的堆结果对应默认的一次性注入，不应直接套用于开发监听模式。
