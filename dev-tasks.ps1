# ============================================================================
# TINY-LMS - QUICK DEVELOPMENT TASKS (PowerShell Helper)
# Purpose: Shortcuts for common development tasks
# ============================================================================

# Usage: . .\dev-tasks.ps1    (dot source to load functions)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     TINY-LMS - DEVELOPMENT TASKS HELPER (PowerShell)           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Green
Write-Host ""
Write-Host "  BE Tasks:" -ForegroundColor Yellow
Write-Host "    be-build          - Build backend solution" -ForegroundColor Gray
Write-Host "    be-run            - Run Auth.Api backend" -ForegroundColor Gray
Write-Host "    be-clean          - Clean backend build files" -ForegroundColor Gray
Write-Host "    be-migrate        - Run database migrations" -ForegroundColor Gray
Write-Host "    be-restore        - Restore NuGet packages" -ForegroundColor Gray
Write-Host ""
Write-Host "  FE Tasks:" -ForegroundColor Yellow
Write-Host "    fe-install        - Install npm dependencies" -ForegroundColor Gray
Write-Host "    fe-dev            - Run frontend dev server" -ForegroundColor Gray
Write-Host "    fe-build          - Build frontend for production" -ForegroundColor Gray
Write-Host "    fe-lint           - Run ESLint" -ForegroundColor Gray
Write-Host "    fe-clean          - Clean node_modules" -ForegroundColor Gray
Write-Host ""
Write-Host "  Project Tasks:" -ForegroundColor Yellow
Write-Host "    dev-start         - Start ALL services (needs 3 terminals)" -ForegroundColor Gray
Write-Host "    dev-kill-ports    - Kill processes on dev ports" -ForegroundColor Gray
Write-Host "    dev-status        - Check if ports are in use" -ForegroundColor Gray
Write-Host "    dev-docs          - Open documentation" -ForegroundColor Gray
Write-Host ""
Write-Host "Example: Type 'be-build' and press Enter" -ForegroundColor Green
Write-Host ""

# Backend Functions
function be-build {
    Write-Host "Building backend..." -ForegroundColor Cyan
    Push-Location .\BE
    dotnet build
    Pop-Location
}

function be-run {
    Write-Host "Running Auth.Api backend on port 7000..." -ForegroundColor Cyan
    Push-Location .\BE\Auth.Api
    dotnet run
    Pop-Location
}

function be-clean {
    Write-Host "Cleaning backend build files..." -ForegroundColor Yellow
    Push-Location .\BE
    dotnet clean
    Pop-Location
}

function be-migrate {
    Write-Host "Running database migrations..." -ForegroundColor Cyan
    Push-Location .\BE\Auth.Api
    dotnet ef database update
    Pop-Location
}

function be-restore {
    Write-Host "Restoring NuGet packages..." -ForegroundColor Cyan
    Push-Location .\BE
    dotnet restore
    Pop-Location
}

# Frontend Functions
function fe-install {
    Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
    Push-Location .\FE
    npm install
    Pop-Location
}

function fe-dev {
    Write-Host "Starting frontend dev server on port 5173..." -ForegroundColor Cyan
    Push-Location .\FE
    npm run dev
    Pop-Location
}

function fe-build {
    Write-Host "Building frontend for production..." -ForegroundColor Cyan
    Push-Location .\FE
    npm run build
    Pop-Location
}

function fe-lint {
    Write-Host "Running ESLint..." -ForegroundColor Cyan
    Push-Location .\FE
    npm run lint
    Pop-Location
}

function fe-clean {
    Write-Host "Cleaning node_modules..." -ForegroundColor Yellow
    Push-Location .\FE
    Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue
    Write-Host "Reinstalling dependencies..." -ForegroundColor Cyan
    npm install
    Pop-Location
}

# Project Management Functions
function dev-start {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║      TINY-LMS - START ALL SERVICES                             ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "This command requires 3 terminal windows (PowerShell)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Terminal 1 - Backend:" -ForegroundColor Cyan
    Write-Host "  cd BE\Auth.Api" -ForegroundColor Gray
    Write-Host "  dotnet run" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Terminal 2 - Frontend:" -ForegroundColor Cyan
    Write-Host "  cd FE" -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Terminal 3 (current) - Database/Operations:" -ForegroundColor Cyan
    Write-Host "  (You can run database commands, migrations, etc.)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Access the application at: http://localhost:5173" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Would you like to open 2 new terminals? (Y/n): " -ForegroundColor Yellow -NoNewline
    $choice = Read-Host
    
    if ($choice -eq "" -or $choice -eq "y" -or $choice -eq "Y") {
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PWD'; be-run"
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PWD'; fe-dev"
        Write-Host "Opened 2 new terminals. Backend and Frontend are starting..." -ForegroundColor Green
    }
}

function dev-kill-ports {
    Write-Host "Killing processes on dev ports (5173, 7000, 7001)..." -ForegroundColor Yellow
    
    $ports = @(5173, 7000, 7001)
    
    foreach ($port in $ports) {
        $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        
        if ($process) {
            $pid = $process.OwningProcess
            Write-Host "Killing PID $pid on port $port..." -ForegroundColor Cyan
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "Port $port cleared" -ForegroundColor Green
        }
        else {
            Write-Host "Port $port is free" -ForegroundColor Gray
        }
    }
    
    Write-Host "Done!" -ForegroundColor Green
}

function dev-status {
    Write-Host ""
    Write-Host "Checking development ports..." -ForegroundColor Cyan
    Write-Host ""
    
    $ports = @(
        @{Port=5173; Service="Frontend (Vite)"},
        @{Port=7000; Service="Backend (Auth.Api)"},
        @{Port=7001; Service="Gateway (Reverse Proxy)"},
        @{Port=5432; Service="PostgreSQL"}
    )
    
    foreach ($item in $ports) {
        $port = $item.Port
        $service = $item.Service
        
        $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        
        if ($process) {
            $pid = $process.OwningProcess
            $procName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).Name
            Write-Host "✓ $service (Port $port) - RUNNING [PID: $pid, Process: $procName]" -ForegroundColor Green
        }
        else {
            Write-Host "✗ $service (Port $port) - FREE/STOPPED" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
}

function dev-docs {
    Write-Host "Opening documentation files..." -ForegroundColor Cyan
    
    $docs = @(
        ".\SETUP.md",
        ".\QUICK_START_TESTING.md",
        ".\claude.md"
    )
    
    foreach ($doc in $docs) {
        if (Test-Path $doc) {
            Write-Host "Opening $doc..." -ForegroundColor Gray
            Invoke-Item $doc
        }
    }
}

# Export all functions
Export-ModuleMember -Function @(
    'be-build', 'be-run', 'be-clean', 'be-migrate', 'be-restore',
    'fe-install', 'fe-dev', 'fe-build', 'fe-lint', 'fe-clean',
    'dev-start', 'dev-kill-ports', 'dev-status', 'dev-docs'
)

Write-Host "✓ Ready! Type any command above to get started." -ForegroundColor Green
Write-Host ""
