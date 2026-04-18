@echo off
REM ============================================================================
REM TINY-LMS - QUICK DEVELOPMENT TASKS (Batch Helper)
REM Purpose: Shortcuts for common development tasks
REM ============================================================================

setlocal enabledelayedexpansion

if "%1"=="" (
    cls
    echo.
    echo ╔════════════════════════════════════════════════════════════════╗
    echo ║     TINY-LMS - DEVELOPMENT TASKS HELPER (Command Prompt)       ║
    echo ╚════════════════════════════════════════════════════════════════╝
    echo.
    echo Available commands:
    echo.
    echo   BE Tasks:
    echo     dev-tasks.bat be-build          - Build backend solution
    echo     dev-tasks.bat be-run            - Run Auth.Api backend
    echo     dev-tasks.bat be-clean          - Clean backend build files
    echo     dev-tasks.bat be-migrate        - Run database migrations
    echo     dev-tasks.bat be-restore        - Restore NuGet packages
    echo.
    echo   FE Tasks:
    echo     dev-tasks.bat fe-install        - Install npm dependencies
    echo     dev-tasks.bat fe-dev            - Run frontend dev server
    echo     dev-tasks.bat fe-build          - Build frontend for production
    echo     dev-tasks.bat fe-lint           - Run ESLint
    echo     dev-tasks.bat fe-clean          - Clean node_modules
    echo.
    echo   Project Tasks:
    echo     dev-tasks.bat status            - Check if ports are in use
    echo     dev-tasks.bat kill-ports        - Kill processes on dev ports
    echo.
    echo Example: dev-tasks.bat be-build
    echo.
    goto :EOF
)

REM Backend Tasks
if "%1"=="be-build" (
    echo Building backend...
    cd /d BE
    dotnet build
    cd /d ..
    goto :EOF
)

if "%1"=="be-run" (
    echo Running Auth.Api backend on port 7000...
    cd /d BE\Auth.Api
    dotnet run
    cd /d ..\..
    goto :EOF
)

if "%1"=="be-clean" (
    echo Cleaning backend build files...
    cd /d BE
    dotnet clean
    cd /d ..
    goto :EOF
)

if "%1"=="be-migrate" (
    echo Running database migrations...
    cd /d BE\Auth.Api
    dotnet ef database update
    cd /d ..\..
    goto :EOF
)

if "%1"=="be-restore" (
    echo Restoring NuGet packages...
    cd /d BE
    dotnet restore
    cd /d ..
    goto :EOF
)

REM Frontend Tasks
if "%1"=="fe-install" (
    echo Installing npm dependencies...
    cd /d FE
    call npm install
    cd /d ..
    goto :EOF
)

if "%1"=="fe-dev" (
    echo Starting frontend dev server on port 5173...
    cd /d FE
    call npm run dev
    cd /d ..
    goto :EOF
)

if "%1"=="fe-build" (
    echo Building frontend for production...
    cd /d FE
    call npm run build
    cd /d ..
    goto :EOF
)

if "%1"=="fe-lint" (
    echo Running ESLint...
    cd /d FE
    call npm run lint
    cd /d ..
    goto :EOF
)

if "%1"=="fe-clean" (
    echo Cleaning node_modules...
    cd /d FE
    if exist node_modules rmdir /s /q node_modules
    if exist package-lock.json del package-lock.json
    echo Reinstalling dependencies...
    call npm install
    cd /d ..
    goto :EOF
)

REM Project Management Tasks
if "%1"=="status" (
    echo.
    echo Checking development ports...
    echo.
    netstat -ano | findstr "5173" && echo Port 5173: FRONTEND (Vite) || echo Port 5173: FREE
    netstat -ano | findstr "7000" && echo Port 7000: BACKEND (Auth.Api) || echo Port 7000: FREE
    netstat -ano | findstr "7001" && echo Port 7001: GATEWAY (Reverse Proxy) || echo Port 7001: FREE
    netstat -ano | findstr "5432" && echo Port 5432: POSTGRESQL || echo Port 5432: FREE
    echo.
    goto :EOF
)

if "%1"=="kill-ports" (
    echo Killing processes on dev ports (5173, 7000, 7001)...
    echo.
    
    for %%P in (5173 7000 7001) do (
        for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P"') do (
            echo Killing PID %%A on port %%P...
            taskkill /PID %%A /F >nul 2>&1
        )
    )
    
    echo Done!
    echo.
    goto :EOF
)

REM Unknown command
echo Unknown command: %1
echo.
call :EOF
