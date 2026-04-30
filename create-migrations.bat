@echo off
REM Migration Setup Script
REM Usage: .\create-migrations.bat [create|update|list]

setlocal enabledelayedexpansion

set BE_PATH=d:\Github\DA-BE\BE
set IDENTITY_API=%BE_PATH%\Identity.Api
set ACTION=%1
if "%ACTION%"=="" set ACTION=create

echo.
echo ========================================
echo MIGRATION MANAGEMENT SCRIPT
echo ========================================
echo.

if /i "%ACTION%"=="create" (
    echo Creating initial migration...
    cd /d %IDENTITY_API%
    dotnet ef migrations add InitialCreate
    if !ERRORLEVEL! EQU 0 (
        echo [SUCCESS] Migration created
        echo Location: %IDENTITY_API%\Migrations\
        dir /B Migrations\ | findstr /R "InitialCreate"
    ) else (
        echo [ERROR] Migration creation failed
        exit /b 1
    )
)

if /i "%ACTION%"=="update" (
    echo Applying migrations to database...
    cd /d %IDENTITY_API%
    dotnet ef database update
    if !ERRORLEVEL! EQU 0 (
        echo [SUCCESS] Database updated
    ) else (
        echo [ERROR] Database update failed
        exit /b 1
    )
)

if /i "%ACTION%"=="list" (
    echo Listing migrations...
    cd /d %IDENTITY_API%
    dotnet ef migrations list
)

if /i "%ACTION%"=="rollback" (
    echo Rolling back migrations...
    cd /d %IDENTITY_API%
    dotnet ef database update %2
    if !ERRORLEVEL! EQU 0 (
        echo [SUCCESS] Rollback completed
    ) else (
        echo [ERROR] Rollback failed
        exit /b 1
    )
)

echo.
echo ========================================
echo Done!
echo ========================================
echo.
