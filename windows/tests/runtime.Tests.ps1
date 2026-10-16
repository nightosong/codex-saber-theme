Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'scripts\saber-theme.ps1'
$tokens = $null
$parseErrors = $null
$null = [Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
. $scriptPath
function Assert-True($Value, [string]$Message) { if (-not $Value) { throw $Message } }
Assert-True ((Get-SaberVersion) -eq (Get-Content -LiteralPath (Join-Path $script:RepoRoot 'macos\VERSION') -Raw).Trim()) 'Windows must read the shared version.'

# Mock only OS discovery; the real endpoint ownership logic is exercised.
$script:Connections = @()
$script:Owners = @{}
function Get-NetTCPConnection { param($State, $LocalPort, $ErrorAction) return $script:Connections }
function Get-CimInstance {
    param($ClassName, $Filter, $ErrorAction)
    $ownerId = [int]($Filter -replace '^ProcessId=', '')
    return $script:Owners[$ownerId]
}
$runtime = @{ Exe = 'C:\Apps\Codex\Codex.exe' }
Assert-True (-not (Test-SaberEndpoint $runtime 9341)) 'An empty port must be rejected.'
$script:Connections = @([pscustomobject]@{ LocalAddress = '0.0.0.0'; OwningProcess = 10 })
Assert-True (-not (Test-SaberEndpoint $runtime 9341)) 'A public bind must be rejected.'
$script:Connections[0].LocalAddress = '127.0.0.1'
$script:Owners[10] = [pscustomobject]@{ ExecutablePath = 'C:\Other\server.exe'; ParentProcessId = 0 }
Assert-True (-not (Test-SaberEndpoint $runtime 9341)) 'An unrelated listener must be rejected.'
$script:Owners[10] = [pscustomobject]@{ ExecutablePath = $runtime.Exe; ParentProcessId = 0 }
Assert-True (Test-SaberEndpoint $runtime 9341) 'An official app listener must be accepted.'
$script:Owners[10] = [pscustomobject]@{ ExecutablePath = 'C:\Apps\Codex\helper.exe'; ParentProcessId = 20 }
$script:Owners[20] = [pscustomobject]@{ ExecutablePath = $runtime.Exe; ParentProcessId = 0 }
Assert-True (Test-SaberEndpoint $runtime 9341) 'An app child listener must be accepted.'
$script:Owners[20].ParentProcessId = 10
$script:Owners[20].ExecutablePath = 'C:\Other\cycle.exe'
Assert-True (-not (Test-SaberEndpoint $runtime 9341)) 'Parent cycles must be bounded.'

$temporary = Join-Path ([IO.Path]::GetTempPath()) ('saber-windows-tests-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
try {
    $paths = @{ State = (Join-Path $temporary 'state.json') }
    Assert-True ((Read-SaberPort $paths) -eq 9341) 'The default port should be deterministic.'
    '{"port":19341}' | Set-Content -LiteralPath $paths.State -Encoding UTF8
    Assert-True ((Read-SaberPort $paths) -eq 19341) 'The saved port must be used.'
    '{"port":1}' | Set-Content -LiteralPath $paths.State -Encoding UTF8
    $rejected = $false
    try { $null = Read-SaberPort $paths } catch { $rejected = $true }
    Assert-True $rejected 'Invalid saved state must fail closed.'
    Assert-True (Test-Path -LiteralPath $paths.State) 'Invalid state must be preserved.'
} finally { Remove-Item -LiteralPath $temporary -Recurse -Force }
Write-Host 'PASS: PowerShell parser, loopback ownership, child processes, bounded parent cycles, and saved state.'
