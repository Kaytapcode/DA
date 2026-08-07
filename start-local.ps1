# ============================================================================
# LUMINA - ONE-SHOT SETUP + START SCRIPT

# Stop fail process if you have a hung dotnet process from a previous run, 
# it will block ports and cause confusion. This line kills all dotnet processes, 
# so use with caution if you have other important dotnet work running.

# Stop fail process:
#   Get-Process dotnet -ErrorAction SilentlyContinue | Stop-Process -Force

# Usage:
#   .\start-local.ps1                     # Smart setup + start all services
#   .\start-local.ps1 -SkipSetup          # Skip restore/build/npm install
#   .\start-local.ps1 -NoConfirm          # Auto-kill busy ports without prompt
# ============================================================================

[CmdletBinding()]
param(
    [switch]$SkipSetup,
    [switch]$NoConfirm
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$bePath = Join-Path $root "BE"
$fePath = Join-Path $root "FE"

function Write-Header($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}
function Write-Ok($msg)    { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Write-Skip($msg)  { Write-Host "  [SKIP] $msg" -ForegroundColor DarkGray }
function Write-Warn($msg)  { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "  [ERR]  $msg" -ForegroundColor Red }

# ----------------------------------------------------------------------------
# Service definitions
# ----------------------------------------------------------------------------
$services = @(
    @{ Name = "Identity";     Port = 5001; Type = "be"; Path = "BE\Identity.Api\Identity.Api.csproj" }
    @{ Name = "Organization"; Port = 5002; Type = "be"; Path = "BE\Organization.Api\Organization.Api.csproj" }
    @{ Name = "Content";      Port = 5003; Type = "be"; Path = "BE\Content.Api\Content.Api.csproj" }
    @{ Name = "AI";           Port = 5004; Type = "be"; Path = "BE\AI.Api\AI.Api.csproj" }
    @{ Name = "SysAdmin";     Port = 5005; Type = "be"; Path = "BE\SysAdmin.Api\SysAdmin.Api.csproj" }
    @{ Name = "Gateway";      Port = 5000; Type = "be"; Path = "BE\Gateway.Api\Gateway.Api.csproj" }
    @{ Name = "Frontend";     Port = 5173; Type = "fe"; Path = "FE" }
)

# ----------------------------------------------------------------------------
# Step 1: Prerequisites
# ----------------------------------------------------------------------------
Write-Header "Step 1/4  Checking prerequisites"
$missing = @()
foreach ($cmd in @("dotnet", "node", "npm")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $ver = & $cmd --version 2>&1 | Select-Object -First 1
        Write-Ok "$cmd $ver"
    } else {
        Write-Err "$cmd not found"
        $missing += $cmd
    }
}
if ($missing.Count -gt 0) {
    Write-Err "Missing: $($missing -join ', '). Install and retry."
    Write-Host "  .NET 9 SDK: https://dotnet.microsoft.com/download" -ForegroundColor Gray
    Write-Host "  Node.js 18+: https://nodejs.org" -ForegroundColor Gray
    exit 1
}

# ----------------------------------------------------------------------------
# Step 2: Smart setup
# ----------------------------------------------------------------------------
Write-Header "Step 2/4  Setup (smart)"
if ($SkipSetup) {
    Write-Skip "-SkipSetup flag set, skipping restore/build/install"
} else {
    # BE: restore only if any project lacks artifacts; ALWAYS build once before
    # spawning to avoid race on Shared.Contracts.dll when 6 services start in parallel.
    $beProjects = @("Gateway.Api", "Identity.Api", "Organization.Api", "Content.Api", "AI.Api", "SysAdmin.Api")
    $needRestore = $false
    foreach ($p in $beProjects) {
        $dll = Join-Path $bePath "$p\bin\Debug\net9.0\$p.dll"
        if (-not (Test-Path $dll)) { $needRestore = $true }
    }
    Push-Location $bePath
    try {
        if ($needRestore) {
            Write-Host "  Running dotnet restore..." -ForegroundColor Gray
            & dotnet restore
            if ($LASTEXITCODE -ne 0) { throw "dotnet restore failed" }
        } else {
            Write-Skip "Restore (artifacts present)"
        }
        Write-Host "  Running dotnet build (incremental)..." -ForegroundColor Gray
        & dotnet build BEDoAn.sln --nologo
        if ($LASTEXITCODE -ne 0) { throw "dotnet build failed" }
        Write-Ok "Backend built"
    } finally { Pop-Location }

    # FE: check node_modules
    $nm = Join-Path $fePath "node_modules"
    if ((Test-Path $nm) -and (Get-ChildItem $nm -ErrorAction SilentlyContinue | Select-Object -First 1)) {
        Write-Skip "node_modules present"
    } else {
        Write-Host "  Running npm install (this may take 2-3 minutes)..." -ForegroundColor Gray
        Push-Location $fePath
        try {
            & npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
            Write-Ok "Frontend deps installed"
        } finally { Pop-Location }
    }
}

# ----------------------------------------------------------------------------
# Step 3: Port pre-clean
# ----------------------------------------------------------------------------
Write-Header "Step 3/4  Checking ports"
foreach ($svc in $services) {
    $port = $svc.Port
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $procId = $conn.OwningProcess
        $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).Name
        Write-Warn "Port $port ($($svc.Name)) busy: PID $procId ($procName)"
        $kill = $NoConfirm
        if (-not $NoConfirm) {
            $ans = Read-Host "    Kill PID $procId to free port $port? [Y/n]"
            $kill = ($ans -eq "" -or $ans -match '^[Yy]')
        }
        if ($kill) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction Stop
                Write-Ok "Killed PID $procId, port $port freed"
            } catch {
                Write-Err "Could not kill PID ${procId}: $_"
                exit 1
            }
        } else {
            Write-Err "Port $port still busy, aborting"
            exit 1
        }
    } else {
        Write-Ok "Port $port free ($($svc.Name))"
    }
}

# ----------------------------------------------------------------------------
# Step 4: Spawn services
# ----------------------------------------------------------------------------
Write-Header "Step 4/4  Starting services"

# Prefer pwsh (PS7), fall back to powershell.exe (PS5.1)
$shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }

function Start-ServiceWindow($svc) {
    $title = "Lumina - $($svc.Name) :$($svc.Port)"
    if ($svc.Type -eq "be") {
        $proj = Join-Path $root $svc.Path
        # --no-build / --no-restore: solution is already built; prevents 6 parallel
        # spawns from racing on shared project DLLs.
        $runArgs = if ($SkipSetup) { "" } else { " --no-build --no-restore" }
        $inner = "`$Host.UI.RawUI.WindowTitle='$title'; Set-Location '$root'; Write-Host '>> $($svc.Name) (port $($svc.Port))' -ForegroundColor Cyan; dotnet run --project '$proj'$runArgs"
    } else {
        $dir = Join-Path $root $svc.Path
        $inner = "`$Host.UI.RawUI.WindowTitle='$title'; Set-Location '$dir'; Write-Host '>> Frontend (port $($svc.Port))' -ForegroundColor Cyan; npm run dev"
    }
    Start-Process $shell -ArgumentList "-NoExit", "-Command", $inner | Out-Null
    Write-Ok "Spawned: $($svc.Name) (port $($svc.Port))"
}

# BE services first (Gateway last so YARP targets are up), then FE
$beOrdered = $services | Where-Object { $_.Type -eq "be" -and $_.Name -ne "Gateway" }
$gateway   = $services | Where-Object { $_.Name -eq "Gateway" }
$fe        = $services | Where-Object { $_.Type -eq "fe" }

foreach ($svc in $beOrdered) {
    Start-ServiceWindow $svc
    Start-Sleep -Seconds 2
}
Start-Sleep -Seconds 3
foreach ($svc in $gateway) { Start-ServiceWindow $svc; Start-Sleep -Seconds 2 }
foreach ($svc in $fe)      { Start-ServiceWindow $svc }

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " All services launched in separate windows" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Frontend     " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host " Gateway      " -NoNewline; Write-Host "http://localhost:5000" -ForegroundColor Cyan
Write-Host " Identity     " -NoNewline; Write-Host "http://localhost:5001" -ForegroundColor Cyan
Write-Host " Organization " -NoNewline; Write-Host "http://localhost:5002" -ForegroundColor Cyan
Write-Host " Content      " -NoNewline; Write-Host "http://localhost:5003" -ForegroundColor Cyan
Write-Host " AI           " -NoNewline; Write-Host "http://localhost:5004" -ForegroundColor Cyan
Write-Host " SysAdmin     " -NoNewline; Write-Host "http://localhost:5005" -ForegroundColor Cyan
Write-Host ""
Write-Host " Services take ~10-30s to fully start. Watch each window for readiness logs." -ForegroundColor Gray
Write-Host " To stop: close each spawned window, or re-run this script (it will free busy ports)." -ForegroundColor Gray
Write-Host ""
