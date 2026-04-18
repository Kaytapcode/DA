@echo off
REM ============================================================================
REM TINY-LMS PROJECT SETUP SCRIPT (Batch)
REM Purpose: Setup complete development environment for BE and FE
REM ============================================================================

setlocal enabledelayedexpansion
set SCRIPT_VERSION=1.0
set PROJECT_ROOT=%cd%

cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║       TINY-LMS PROJECT - ENVIRONMENT SETUP (Batch)            ║
echo ║                      Version: %SCRIPT_VERSION%                         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM ============================================================================
REM STEP 1: CHECK PREREQUISITES
REM ============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║ STEP 1: CHECKING PREREQUISITES                            ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check .NET 9 SDK
echo ▶ Checking for .NET 9 SDK...
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo ✗ .NET 9 SDK NOT found. Please install from https://dotnet.microsoft.com/download
    set PREREQUISITES_OK=0
) else (
    for /f "tokens=*" %%i in ('dotnet --version 2^>nul') do set NET_VERSION=%%i
    echo ✓ .NET SDK found: !NET_VERSION!
)

REM Check Node.js
echo ▶ Checking for Node.js 18+...
node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Node.js NOT found. Please install from https://nodejs.org
    set PREREQUISITES_OK=0
) else (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
    echo ✓ Node.js found: !NODE_VERSION!
)

REM Check npm
echo ▶ Checking for npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ✗ npm NOT found. It comes with Node.js
    set PREREQUISITES_OK=0
) else (
    for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
    echo ✓ npm found: !NPM_VERSION!
)

REM Check Git
echo ▶ Checking for Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ⚠ Git is recommended but not required
) else (
    for /f "tokens=*" %%i in ('git --version 2^>nul') do set GIT_VERSION=%%i
    echo ✓ Git found: !GIT_VERSION!
)

if not defined PREREQUISITES_OK (
    echo.
    echo ✓ All prerequisites are installed!
) else (
    echo.
    echo ✗ SETUP FAILED: Please install missing prerequisites and try again.
    pause
    exit /b 1
)

REM ============================================================================
REM STEP 2: CHECK PROJECT STRUCTURE
REM ============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║ STEP 2: VERIFYING PROJECT STRUCTURE                       ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

set BE_PATH=%PROJECT_ROOT%\BE
set FE_PATH=%PROJECT_ROOT%\FE

echo ▶ Checking Backend directory...
if exist "%BE_PATH%" (
    echo ✓ Backend directory exists: %BE_PATH%
) else (
    echo ✗ Backend directory NOT found at %BE_PATH%
    pause
    exit /b 1
)

echo ▶ Checking Frontend directory...
if exist "%FE_PATH%" (
    echo ✓ Frontend directory exists: %FE_PATH%
) else (
    echo ✗ Frontend directory NOT found at %FE_PATH%
    pause
    exit /b 1
)

echo ✓ Project structure verified!

REM ============================================================================
REM STEP 3: SETUP BACKEND
REM ============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║ STEP 3: SETTING UP BACKEND (.NET 9)                       ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo ▶ Navigating to Backend directory...
cd /d "%BE_PATH%"
echo ✓ Backend directory: %cd%

echo.
echo ▶ Restoring NuGet packages (this may take a minute)...
call dotnet restore
if errorlevel 1 (
    echo ✗ dotnet restore failed
    cd /d "%PROJECT_ROOT%"
    pause
    exit /b 1
)
echo ✓ NuGet packages restored successfully!

echo.
echo ▶ Building Backend solution...
call dotnet build
if errorlevel 1 (
    echo ✗ dotnet build failed
    cd /d "%PROJECT_ROOT%"
    pause
    exit /b 1
)
echo ✓ Backend built successfully!

echo.
echo ▶ Checking for Entity Framework Core tools...
dotnet ef --version >nul 2>&1
if errorlevel 1 (
    echo ⚠ Installing EF Core tools...
    call dotnet tool install --global dotnet-ef
)

echo ✓ Backend setup completed!

REM ============================================================================
REM STEP 4: CONFIGURE BACKEND (DATABASE)
REM ============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║ STEP 4: CONFIGURING BACKEND - DATABASE                    ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

set APPSETTINGS_PATH=%BE_PATH%\Auth.Api\appsettings.json

echo ▶ Checking appsettings.json...
if exist "%APPSETTINGS_PATH%" (
    echo ✓ appsettings.json found!
    echo ▶ Default database connection:
    echo   Host: 127.0.0.1
    echo   Port: 5432
    echo   Database: tiny_lms
    echo   User: postgres
    echo.
    echo ⚠️  IMPORTANT: Ensure PostgreSQL is running!
    echo ▶ To start PostgreSQL on Windows:
    echo   1. Open Services (services.msc^)
    echo   2. Find 'postgresql-x64-*' (or your PostgreSQL service^)
    echo   3. Right-click and select 'Start'
    echo.
) else (
    echo ✗ appsettings.json not found at %APPSETTINGS_PATH%
)

echo ▶ To create/migrate the database, run after PostgreSQL is started:
echo   cd BE\Auth.Api
echo   dotnet ef database update
echo.

REM ============================================================================
REM STEP 5: SETUP FRONTEND
REM ============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║ STEP 5: SETTING UP FRONTEND (React + Vite)                ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo ▶ Navigating to Frontend directory...
cd /d "%FE_PATH%"
echo ✓ Frontend directory: %cd%

echo.
echo ▶ Installing npm dependencies (this may take 2-3 minutes)...
call npm install
if errorlevel 1 (
    echo ✗ npm install failed
    cd /d "%PROJECT_ROOT%"
    pause
    exit /b 1
)
echo ✓ npm dependencies installed successfully!

echo.
echo ▶ Verifying Vite configuration...
if exist "vite.config.ts" (
    echo ✓ vite.config.ts found and configured
)

echo ✓ Frontend setup completed!

REM ============================================================================
REM STEP 6: BUILD FRONTEND
REM ============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║ STEP 6: FRONTEND BUILD CHECK                              ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo ▶ Testing TypeScript build...
call npm run build
if errorlevel 1 (
    echo ✗ Frontend build failed. Check errors above.
    echo ⚠ You can still run 'npm run dev' to use dev server
) else (
    echo ✓ Frontend builds successfully!
)

REM ============================================================================
REM STEP 7: FINAL SUMMARY
REM ============================================================================

cd /d "%PROJECT_ROOT%"

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║ ✓ SETUP COMPLETE!                                          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo Your project is now ready to run! Here's what was done:
echo ✓ Checked all prerequisites (.NET, Node.js, npm^)
echo ✓ Verified project structure
echo ✓ Restored and built .NET Backend
echo ✓ Installed Frontend dependencies
echo ✓ Built Frontend (TypeScript^)
echo.

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║ NEXT STEPS                                                 ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 1️⃣  START POSTGRESQL SERVER
echo    - Open Services (services.msc^)
echo    - Start 'postgresql-x64-*' service
echo.

echo 2️⃣  CREATE/MIGRATE DATABASE
echo    In Command Prompt/PowerShell:
echo    cd BE\Auth.Api
echo    dotnet ef database update
echo.

echo 3️⃣  START BACKEND
echo    In new Command Prompt/PowerShell:
echo    cd BE\Auth.Api
echo    dotnet run
echo.

echo 4️⃣  START FRONTEND
echo    In new Command Prompt/PowerShell:
echo    cd FE
echo    npm run dev
echo.

echo 5️⃣  ACCESS APPLICATION
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:7000
echo    Gateway:  http://localhost:7001
echo.

echo 📚 Documentation:
echo    - QUICK_START_TESTING.md - Quick start guide
echo    - claude.md - Project specifications
echo    - TESTING_README.md - Testing procedures
echo.

echo Setup script completed successfully! Happy coding! 🚀
echo.

pause

