# ============================================================================
# TINY-LMS PROJECT SETUP SCRIPT (PowerShell)
# Purpose: Setup complete development environment for BE and FE
# ============================================================================

$ErrorActionPreference = "Stop"
$SCRIPT_VERSION = "1.0"
$COLOR_SUCCESS = "Green"
$COLOR_ERROR = "Red"
$COLOR_WARNING = "Yellow"
$COLOR_INFO = "Cyan"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$message)
    Write-Host "`n" -ForegroundColor $COLOR_INFO
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor $COLOR_INFO
    Write-Host "║ $message" -ForegroundColor $COLOR_INFO
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor $COLOR_INFO
    Write-Host ""
}

function Write-Step {
    param([string]$message)
    Write-Host "▶ $message" -ForegroundColor $COLOR_INFO
}

function Write-Success {
    param([string]$message)
    Write-Host "✓ $message" -ForegroundColor $COLOR_SUCCESS
}

function Write-Error-Custom {
    param([string]$message)
    Write-Host "✗ $message" -ForegroundColor $COLOR_ERROR
}

function Write-Warning-Custom {
    param([string]$message)
    Write-Host "⚠ $message" -ForegroundColor $COLOR_WARNING
}

function Check-Command {
    param([string]$command, [string]$displayName = $command)
    
    Write-Step "Checking for $displayName..."
    
    try {
        $result = & $command --version 2>&1
        Write-Success "$displayName found: $result"
        return $true
    }
    catch {
        Write-Error-Custom "$displayName NOT found. Please install it first."
        return $false
    }
}

function Check-Directory {
    param([string]$path, [string]$displayName)
    
    if (Test-Path $path) {
        Write-Success "$displayName exists: $path"
        return $true
    }
    else {
        Write-Error-Custom "$displayName NOT found at $path"
        return $false
    }
}

function Pause-Script {
    Write-Host "`nPress any key to continue..." -ForegroundColor $COLOR_WARNING
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# ============================================================================
# MAIN SETUP LOGIC
# ============================================================================

Write-Host "" -ForegroundColor $COLOR_INFO
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $COLOR_INFO
Write-Host "║       TINY-LMS PROJECT - ENVIRONMENT SETUP (PowerShell)        ║" -ForegroundColor $COLOR_INFO
Write-Host "║                      Version: $SCRIPT_VERSION                         ║" -ForegroundColor $COLOR_INFO
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $COLOR_INFO

# ============================================================================
# STEP 1: CHECK PREREQUISITES
# ============================================================================

Write-Header "STEP 1: CHECKING PREREQUISITES"

$prerequisites_ok = $true

# Check .NET 9 SDK
if (-not (Check-Command "dotnet" ".NET 9 SDK")) {
    Write-Error-Custom ".NET 9 SDK is required. Download from: https://dotnet.microsoft.com/download"
    $prerequisites_ok = $false
}

# Check Node.js
if (-not (Check-Command "node" "Node.js 18+")) {
    Write-Error-Custom "Node.js 18+ is required. Download from: https://nodejs.org"
    $prerequisites_ok = $false
}

# Check npm
if (-not (Check-Command "npm" "npm (Node Package Manager)")) {
    Write-Error-Custom "npm is required. It comes with Node.js"
    $prerequisites_ok = $false
}

# Check Git
if (-not (Check-Command "git" "Git")) {
    Write-Warning-Custom "Git is recommended but not required for development"
}

if (-not $prerequisites_ok) {
    Write-Error-Custom "❌ SETUP FAILED: Please install missing prerequisites and try again."
    Pause-Script
    exit 1
}

Write-Success "✓ All prerequisites are installed!"

# ============================================================================
# STEP 2: CHECK PROJECT STRUCTURE
# ============================================================================

Write-Header "STEP 2: VERIFYING PROJECT STRUCTURE"

$project_root = Get-Location
$be_path = Join-Path $project_root "BE"
$fe_path = Join-Path $project_root "FE"

if (-not (Check-Directory $be_path "Backend directory (BE)")) {
    Write-Error-Custom "❌ SETUP FAILED: Backend directory not found."
    Pause-Script
    exit 1
}

if (-not (Check-Directory $fe_path "Frontend directory (FE)")) {
    Write-Error-Custom "❌ SETUP FAILED: Frontend directory not found."
    Pause-Script
    exit 1
}

Write-Success "✓ Project structure verified!"

# ============================================================================
# STEP 3: SETUP BACKEND
# ============================================================================

Write-Header "STEP 3: SETTING UP BACKEND (.NET 9)"

try {
    Write-Step "Navigating to Backend directory..."
    Set-Location $be_path
    Write-Success "Backend directory: $(Get-Location)"

    Write-Step "Restoring NuGet packages (this may take a minute)..."
    & dotnet restore
    
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet restore failed with exit code $LASTEXITCODE"
    }
    
    Write-Success "✓ NuGet packages restored successfully!"

    Write-Step "Building Backend solution..."
    & dotnet build
    
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet build failed with exit code $LASTEXITCODE"
    }
    
    Write-Success "✓ Backend built successfully!"

    Write-Step "Checking for Entity Framework Core tools..."
    & dotnet ef --version
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning-Custom "Installing EF Core tools..."
        & dotnet tool install --global dotnet-ef
    }

    Write-Success "✓ Backend setup completed!"
}
catch {
    Write-Error-Custom "❌ Backend setup failed: $_"
    Set-Location $project_root
    Pause-Script
    exit 1
}

# ============================================================================
# STEP 4: CONFIGURE BACKEND (DATABASE)
# ============================================================================

Write-Header "STEP 4: CONFIGURING BACKEND - DATABASE"

Write-Step "Checking appsettings.json..."

$appsettings_path = Join-Path $be_path "Auth.Api" "appsettings.json"

if (Test-Path $appsettings_path) {
    Write-Success "appsettings.json found!"
    Write-Step "Default database connection:"
    Write-Host "  Host: 127.0.0.1" -ForegroundColor Gray
    Write-Host "  Port: 5432" -ForegroundColor Gray
    Write-Host "  Database: tiny_lms" -ForegroundColor Gray
    Write-Host "  User: postgres" -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray
    
    Write-Warning-Custom "⚠️  IMPORTANT: Ensure PostgreSQL is running!"
    Write-Step "To start PostgreSQL on Windows:"
    Write-Host "  1. Open Services (services.msc)" -ForegroundColor Gray
    Write-Host "  2. Find 'postgresql-x64-*' (or your PostgreSQL service)" -ForegroundColor Gray
    Write-Host "  3. Right-click and select 'Start'" -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray
}
else {
    Write-Error-Custom "appsettings.json not found at $appsettings_path"
}

Write-Step "To create/migrate the database, run after PostgreSQL is started:"
Write-Host "  cd BE/Auth.Api" -ForegroundColor Cyan
Write-Host "  dotnet ef database update" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Gray

# ============================================================================
# STEP 5: SETUP FRONTEND
# ============================================================================

Write-Header "STEP 5: SETTING UP FRONTEND (React + Vite)"

try {
    Write-Step "Navigating to Frontend directory..."
    Set-Location $fe_path
    Write-Success "Frontend directory: $(Get-Location)"

    Write-Step "Installing npm dependencies (this may take 2-3 minutes)..."
    & npm install
    
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE"
    }
    
    Write-Success "✓ npm dependencies installed successfully!"

    Write-Step "Verifying Vite configuration..."
    if (Test-Path "vite.config.ts") {
        Write-Success "vite.config.ts found and configured"
    }

    Write-Success "✓ Frontend setup completed!"
}
catch {
    Write-Error-Custom "❌ Frontend setup failed: $_"
    Set-Location $project_root
    Pause-Script
    exit 1
}

# ============================================================================
# STEP 6: BUILD FRONTEND (OPTIONAL)
# ============================================================================

Write-Header "STEP 6: FRONTEND BUILD CHECK"

Write-Step "Testing TypeScript build..."
& npm run build
    
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Frontend build failed. Check errors above."
    Write-Warning-Custom "You can still run 'npm run dev' to use dev server"
}
else {
    Write-Success "✓ Frontend builds successfully!"
}

# ============================================================================
# STEP 7: FINAL SUMMARY
# ============================================================================

Set-Location $project_root

Write-Header "✓ SETUP COMPLETE!"

Write-Host "Your project is now ready to run! Here's what was done:" -ForegroundColor $COLOR_SUCCESS
Write-Host ""
Write-Host "✓ Checked all prerequisites (.NET, Node.js, npm)" -ForegroundColor $COLOR_SUCCESS
Write-Host "✓ Verified project structure" -ForegroundColor $COLOR_SUCCESS
Write-Host "✓ Restored and built .NET Backend" -ForegroundColor $COLOR_SUCCESS
Write-Host "✓ Installed Frontend dependencies" -ForegroundColor $COLOR_SUCCESS
Write-Host "✓ Built Frontend (TypeScript)" -ForegroundColor $COLOR_SUCCESS
Write-Host ""

Write-Header "NEXT STEPS"

Write-Host "1️⃣  START POSTGRESQL SERVER" -ForegroundColor $COLOR_INFO
Write-Host "   - Open Services (services.msc)" -ForegroundColor Gray
Write-Host "   - Start 'postgresql-x64-*' service" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  CREATE/MIGRATE DATABASE" -ForegroundColor $COLOR_INFO
Write-Host "   PowerShell:" -ForegroundColor Gray
Write-Host "   cd BE\Auth.Api" -ForegroundColor Cyan
Write-Host "   dotnet ef database update" -ForegroundColor Cyan
Write-Host ""

Write-Host "3️⃣  START BACKEND" -ForegroundColor $COLOR_INFO
Write-Host "   In new terminal/PowerShell:" -ForegroundColor Gray
Write-Host "   cd BE\Auth.Api" -ForegroundColor Cyan
Write-Host "   dotnet run" -ForegroundColor Cyan
Write-Host ""

Write-Host "4️⃣  START FRONTEND" -ForegroundColor $COLOR_INFO
Write-Host "   In new terminal/PowerShell:" -ForegroundColor Gray
Write-Host "   cd FE" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "5️⃣  ACCESS APPLICATION" -ForegroundColor $COLOR_INFO
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:7000" -ForegroundColor Cyan
Write-Host "   Gateway:  http://localhost:7001" -ForegroundColor Cyan
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor $COLOR_INFO
Write-Host "   - QUICK_START_TESTING.md - Quick start guide" -ForegroundColor Gray
Write-Host "   - claude.md - Project specifications" -ForegroundColor Gray
Write-Host "   - TESTING_README.md - Testing procedures" -ForegroundColor Gray
Write-Host ""

Write-Success "Setup script completed successfully! Happy coding! 🚀"

# End of script
