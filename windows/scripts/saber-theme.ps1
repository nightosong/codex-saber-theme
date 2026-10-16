# Windows PowerShell 5.1+, native Windows only. No WSL or app-bundle patches.
[CmdletBinding()]
param(
    [ValidateSet('Install', 'Start', 'Verify', 'Diagnose', 'Pause')]
    [string]$Action = 'Start',
    [string]$CodexPath,
    [string]$NodePath,
    [ValidateRange(1024, 65535)][int]$Port = 9341,
    [switch]$Interactive,
    [switch]$NoLaunch
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$script:PortExplicit = $PSBoundParameters.ContainsKey('Port')

function Get-SaberPaths {
    if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA is missing; use native Windows PowerShell.' }
    $root = Join-Path $env:LOCALAPPDATA 'CodexSaberTheme'
    return @{ Root = $root; Engine = (Join-Path $root 'engine'); Theme = (Join-Path $root 'theme'); State = (Join-Path $root 'state.json') }
}

function Get-SaberVersion {
    $version = (Get-Content -LiteralPath (Join-Path $script:RepoRoot 'macos\VERSION') -Raw).Trim()
    if ($version -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$') { throw 'Invalid Saber Theme VERSION.' }
    return $version
}

function Assert-SignedFile([string]$Path, [string]$Publisher) {
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate -or $signature.SignerCertificate.Subject -notmatch $Publisher) {
        throw "Untrusted executable/signature: $Path"
    }
}

function Get-SaberRuntime {
    $candidates = @()
    if ($CodexPath) { $candidates += @{ Exe = $CodexPath; PackageRoot = $null } }
    # Store packages can use catalog signing instead of embedded Authenticode.
    foreach ($package in @(Get-AppxPackage | Where-Object { $_.Name -match 'Codex|ChatGPT' -and $_.Publisher -match 'OpenAI' -and $_.SignatureKind -eq 'Store' -and $_.Status -eq 'Ok' })) {
        $manifest = Get-AppxPackageManifest -Package $package.PackageFullName
        foreach ($application in $manifest.Package.Applications.Application) {
            if ($application.Executable -match '(?i)(Codex|ChatGPT)\.exe$') {
                $candidates += @{ Exe = (Join-Path $package.InstallLocation $application.Executable); PackageRoot = $package.InstallLocation }
            }
        }
    }
    foreach ($base in @($env:LOCALAPPDATA, $env:ProgramFiles)) {
        if (-not $base) { continue }
        foreach ($relative in @('Programs\Codex\Codex.exe', 'Programs\ChatGPT\ChatGPT.exe', 'Codex\Codex.exe', 'ChatGPT\ChatGPT.exe', 'OpenAI\Codex\Codex.exe')) {
            $candidates += @{ Exe = (Join-Path $base $relative); PackageRoot = $null }
        }
    }
    foreach ($candidate in $candidates) {
        if (-not (Test-Path -LiteralPath $candidate.Exe -PathType Leaf)) { continue }
        $exe = (Resolve-Path -LiteralPath $candidate.Exe).Path
        if (-not $candidate.PackageRoot) { Assert-SignedFile $exe 'OpenAI' }
        $appRoot = Split-Path $exe -Parent
        $nodes = @()
        if ($NodePath) { $nodes += $NodePath }
        foreach ($relative in @('resources\cua_node\bin\node.exe', 'resources\cua_node\node.exe', 'resources\node.exe')) {
            $nodes += Join-Path $appRoot $relative
        }
        $command = Get-Command node.exe -ErrorAction SilentlyContinue
        if ($command) { $nodes += $command.Source }
        foreach ($node in $nodes) {
            if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { continue }
            $resolvedNode = (Resolve-Path -LiteralPath $node).Path
            $inStorePackage = $candidate.PackageRoot -and $resolvedNode.StartsWith($candidate.PackageRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)
            if (-not $inStorePackage) { Assert-SignedFile $resolvedNode 'OpenAI|OpenJS|Node.js' }
            $version = & $resolvedNode --version
            if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 22) { continue }
            return @{ Exe = $exe; Node = $resolvedNode; Version = $version }
        }
        throw 'No trusted Node.js 22+ runtime found. Install official Node.js LTS or pass -NodePath to its signed node.exe.'
    }
    throw 'Official Codex/ChatGPT app not found. Install it, open it once, or supply -CodexPath to its signed executable.'
}

function Test-SaberEndpoint($Runtime, [int]$DebugPort) {
    $connections = @(Get-NetTCPConnection -State Listen -LocalPort $DebugPort -ErrorAction SilentlyContinue)
    if ($connections.Count -eq 0) { return $false }
    foreach ($connection in $connections) {
        if ($connection.LocalAddress -notin @('127.0.0.1', '::1')) { return $false }
        $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)" -ErrorAction SilentlyContinue
        $owned = $false
        for ($depth = 0; $owner -and $depth -lt 12; $depth++) {
            if ($owner.ExecutablePath -and [string]::Equals($owner.ExecutablePath, $Runtime.Exe, [StringComparison]::OrdinalIgnoreCase)) { $owned = $true; break }
            $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($owner.ParentProcessId)" -ErrorAction SilentlyContinue
        }
        if (-not $owned) { return $false }
    }
    return $true
}

function Invoke-SaberInjector($Runtime, [string[]]$Arguments) {
    $injector = Join-Path $script:RepoRoot 'macos\scripts\injector.mjs'
    & $Runtime.Node $injector @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Theme injector failed (exit $LASTEXITCODE): $($Arguments -join ' ')" }
}

function Read-SaberPort($Paths) {
    if ($script:PortExplicit) { return $Port }
    if (Test-Path -LiteralPath $Paths.State) {
        $state = Get-Content -LiteralPath $Paths.State -Raw | ConvertFrom-Json
        if ($state.port -ge 1024 -and $state.port -le 65535) { return [int]$state.port }
        throw 'Invalid saved debug port; state was preserved.'
    }
    return $Port
}

function Install-Saber($Paths, $Runtime) {
    New-Item -ItemType Directory -Path $Paths.Root -Force | Out-Null
    $stage = Join-Path $Paths.Root ('engine.installing.' + [Guid]::NewGuid().ToString('N'))
    $themeStage = Join-Path $Paths.Root ('theme.installing.' + [Guid]::NewGuid().ToString('N'))
    $backup = Join-Path $Paths.Root ('engine.backup.' + [DateTime]::UtcNow.ToString('yyyyMMddHHmmssfff'))
    try {
        New-Item -ItemType Directory -Path (Join-Path $stage 'macos') -Force | Out-Null
        foreach ($directory in @('scripts', 'assets', 'presets')) {
            Copy-Item -LiteralPath (Join-Path $script:RepoRoot "macos\$directory") -Destination (Join-Path $stage 'macos') -Recurse
        }
        foreach ($file in @('VERSION', 'package.json')) {
            Copy-Item -LiteralPath (Join-Path $script:RepoRoot "macos\$file") -Destination (Join-Path $stage 'macos')
        }
        Copy-Item -LiteralPath (Join-Path $script:RepoRoot 'windows') -Destination $stage -Recurse
        Invoke-SaberInjector $Runtime @('--check-payload', '--theme-dir', (Join-Path $stage 'macos\presets\preset-saber-ice-atelier'))
        if (-not (Test-Path -LiteralPath $Paths.Theme)) {
            New-Item -ItemType Directory -Path $themeStage -Force | Out-Null
            & $Runtime.Node (Join-Path $stage 'macos\scripts\stage-theme.mjs') (Join-Path $stage 'macos\presets\preset-saber-ice-atelier') $themeStage
            if ($LASTEXITCODE -ne 0) { throw 'Could not stage the default theme.' }
            Move-Item -LiteralPath $themeStage -Destination $Paths.Theme
        }
        if (-not (Test-Path -LiteralPath (Join-Path $Paths.Theme 'theme.json'))) { throw 'Existing theme directory has no theme.json; it was preserved.' }
        if (Test-Path -LiteralPath $Paths.Engine) { Move-Item -LiteralPath $Paths.Engine -Destination $backup }
        try { Move-Item -LiteralPath $stage -Destination $Paths.Engine }
        catch {
            if (Test-Path -LiteralPath $backup) { Move-Item -LiteralPath $backup -Destination $Paths.Engine }
            throw
        }
        $script:RepoRoot = $Paths.Engine
        $shell = New-Object -ComObject WScript.Shell
        $startMenu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Saber Theme'
        New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
        foreach ($entry in @(@('Saber Theme', 'Start'), @('Verify Saber Theme', 'Verify'), @('Diagnose Saber Theme', 'Diagnose'), @('Pause Saber Theme', 'Pause'))) {
            $shortcut = $shell.CreateShortcut((Join-Path $startMenu ($entry[0] + '.lnk')))
            $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
            $shortcut.Arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -Action {1} -Interactive' -f (Join-Path $Paths.Engine 'windows\scripts\saber-theme.ps1'), $entry[1]
            $shortcut.IconLocation = $Runtime.Exe + ',0'
            $shortcut.Description = 'Saber Theme ' + (Get-SaberVersion)
            $shortcut.Save()
        }
        Copy-Item -LiteralPath (Join-Path $startMenu 'Saber Theme.lnk') -Destination ([Environment]::GetFolderPath('Desktop')) -Force
        Write-Host "Installed Saber Theme $(Get-SaberVersion). Use the Desktop or Start menu shortcut."
    } finally {
        if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
        if (Test-Path -LiteralPath $themeStage) { Remove-Item -LiteralPath $themeStage -Recurse -Force }
    }
}

function Start-Saber($Paths, $Runtime) {
    if (-not (Test-Path -LiteralPath $Paths.Theme)) { throw 'Install Saber Theme first.' }
    $debugPort = Read-SaberPort $Paths
    if (-not (Test-SaberEndpoint $Runtime $debugPort)) {
        $running = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and [string]::Equals($_.ExecutablePath, $Runtime.Exe, [StringComparison]::OrdinalIgnoreCase) -and $_.CommandLine -notmatch '--type=' })
        if ($running.Count -gt 0) {
            if (-not $Interactive) { throw 'Codex is already running without theme debugging. Close it first, or run with -Interactive to review the restart prompt.' }
            Add-Type -AssemblyName System.Windows.Forms
            $answer = [Windows.Forms.MessageBox]::Show('Codex must close and reopen once to enable Saber Theme. Continue?', 'Saber Theme', 'YesNo', 'Question', 'Button2')
            if ($answer -ne 'Yes') { throw 'Restart cancelled. Codex was left running.' }
            foreach ($process in $running) {
                $target = Get-Process -Id $process.ProcessId -ErrorAction Stop
                if (-not $target.CloseMainWindow()) { throw 'Codex did not accept a normal close request. Close it manually; no process was killed.' }
                if (-not $target.WaitForExit(15000)) { throw 'Codex is still closing. No process was killed.' }
            }
        }
        $available = $false
        for ($offset = 0; $offset -lt 25 -and $debugPort -le 65535; $offset++, $debugPort++) {
            if (@(Get-NetTCPConnection -State Listen -LocalPort $debugPort -ErrorAction SilentlyContinue).Count -eq 0) { $available = $true; break }
        }
        if (-not $available) { throw 'No available loopback debug port.' }
        Start-Process -FilePath $Runtime.Exe -ArgumentList @('--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$debugPort") | Out-Null
        $deadline = [DateTime]::UtcNow.AddSeconds(45)
        while (-not (Test-SaberEndpoint $Runtime $debugPort)) {
            if ([DateTime]::UtcNow -gt $deadline) { throw 'Codex did not expose a verified loopback CDP endpoint within 45 seconds.' }
            Start-Sleep -Milliseconds 300
        }
    }
    Invoke-SaberInjector $Runtime @('--once', '--port', "$debugPort", '--theme-dir', $Paths.Theme, '--timeout-ms', '20000')
    @{ version = (Get-SaberVersion); port = $debugPort; appPath = $Runtime.Exe; injectorPid = 0 } | ConvertTo-Json | Set-Content -LiteralPath $Paths.State -Encoding UTF8
}

function Invoke-SaberMain {
    if ($env:OS -ne 'Windows_NT') { throw 'This launcher requires native Windows.' }
    $paths = Get-SaberPaths
    New-Item -ItemType Directory -Path $paths.Root -Force | Out-Null
    $lock = $null
    try {
        $lock = [IO.File]::Open((Join-Path $paths.Root 'operation.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
        $runtime = Get-SaberRuntime
        switch ($Action) {
            Install { Install-Saber $paths $runtime; if (-not $NoLaunch) { Start-Saber $paths $runtime } }
            Start { Start-Saber $paths $runtime }
            default {
                $debugPort = Read-SaberPort $paths
                if (-not (Test-SaberEndpoint $runtime $debugPort)) { throw "Port $debugPort is not a verified Codex loopback endpoint." }
                $mode = @{ Verify = '--verify'; Diagnose = '--diagnose'; Pause = '--remove' }[$Action]
                if ($Action -eq 'Diagnose') {
                    $report = Join-Path $paths.Root ('diagnostics-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '.ndjson')
                    Invoke-SaberInjector $runtime @($mode, '--port', "$debugPort", '--theme-dir', $paths.Theme) | Set-Content -LiteralPath $report -Encoding UTF8
                    if ($Interactive) { Start-Process notepad.exe -ArgumentList ('"' + $report + '"') }
                    Write-Host "Saved $report"
                } else {
                    Invoke-SaberInjector $runtime @($mode, '--port', "$debugPort", '--theme-dir', $paths.Theme)
                    if ($Interactive) { Add-Type -AssemblyName System.Windows.Forms; [Windows.Forms.MessageBox]::Show("$Action completed.", 'Saber Theme') | Out-Null }
                }
            }
        }
    } finally { if ($lock) { $lock.Dispose() } }
}

if ($MyInvocation.InvocationName -ne '.') {
    try { Invoke-SaberMain }
    catch {
        if ($Interactive) { Add-Type -AssemblyName System.Windows.Forms; [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Saber Theme', 'OK', 'Error') | Out-Null }
        Write-Error $_
        exit 1
    }
}
