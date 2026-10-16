# Saber Theme for Windows

原生 Windows 启动入口；共享 macOS 目录下的 CSS、图片和 CDP 引擎，不需要 WSL。

## 使用

1. 安装官方 Codex／ChatGPT 桌面应用并至少打开一次。
2. 下载并解压完整的 Windows 发布包，或克隆整个仓库。
3. 双击 `windows/Install Saber Theme.cmd`。
4. 以后使用桌面或开始菜单里的 **Saber Theme** 启动，可以固定到任务栏。

安装目录为 `%LOCALAPPDATA%\CodexSaberTheme`，保留旧引擎备份。安装器不修改官方应用、账户、API 配置或系统执行策略；启动器在需要关闭 Codex 时先显示确认，使用正常关闭请求，不强制结束进程。

优先使用官方应用附带的 Node.js。缺少时，请先安装官方签名的 Node.js 22+ LTS；启动器会验证签名。需要自定义路径时：

```powershell
& .\windows\scripts\saber-theme.ps1 -Action Install -CodexPath 'C:\path\Codex.exe' -NodePath 'C:\Program Files\nodejs\node.exe' -Interactive
```

运行完成后启动器和注入进程均退出，不额外常驻 Node。直接使用原版应用图标启动时不保证主题生效；完整页面刷新或新窗口需要再次点击 Saber Theme。

## 验证、诊断和暂停

开始菜单的 Saber Theme 文件夹包含 Verify、Diagnose、Pause。Diagnose 保存只含性能计数的 NDJSON 文件并打开记事本；不采集聊天内容，不刷新页面、不强制 GC（垃圾回收）。Pause 仅移除当前窗口中的注入主题。此时调试端口仍属于当前应用进程；下次使用原版图标正常启动可恢复普通启动方式。

```powershell
& "$env:LOCALAPPDATA\CodexSaberTheme\engine\windows\scripts\saber-theme.ps1" -Action Verify
& "$env:LOCALAPPDATA\CodexSaberTheme\engine\windows\scripts\saber-theme.ps1" -Action Diagnose
& "$env:LOCALAPPDATA\CodexSaberTheme\engine\windows\scripts\saber-theme.ps1" -Action Pause
```

本机只有 macOS，已执行 PowerShell 解析及模拟的端口归属/状态测试，并配置 Windows CI（持续集成）检查。**Microsoft Store 实际启动、运行时发现、快捷方式和主题画面仍待 Windows 真机验收**；这些检查不能用 macOS 上的模拟测试代替。如果某版本不提供 CDP 或不接受启动参数，启动器会报错，不修改受保护的安装包。
