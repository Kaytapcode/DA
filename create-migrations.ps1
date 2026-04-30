#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Migration management script for multi-API setup
.DESCRIPTION
    Manages Entity Framework Core migrations for the LMS platform
.PARAMETER Action
    Action to perform: create, update, list, rollback
.PARAMETER MigrationName
    Name of migration (for rollback)
.EXAMPLE
    .\create-migrations.ps1 -Action create
    .\create-migrations.ps1 -Action update
    .\create-migrations.ps1 -Action list
    .\create-migrations.ps1 -Action rollback -MigrationName "InitialCreate"
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("create", "update", "list", "rollback", "help")]
    [string]$Action = "help",

    [Parameter(Mandatory=$false)]
    [string]$MigrationName = "InitialCreate"
)

# Configuration
$BE_PATH = "d:\Github\DA-BE\BE"
$IDENTITY_API = "$BE_PATH\Identity.Api"
$DB_HOST = "160.187.247.136"
$DB_NAME = "smart_lms_db"
$DB_USER = "admin101"

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ENTITY FRAMEWORK MIGRATIONS TOOL     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Function to check if database is accessible
function Test-DatabaseConnection {
    Write-Host "🔍 Testing database connection..." -ForegroundColor Yellow
    try {
        $result = Test-NetConnection -ComputerName $DB_HOST -Port 5432 -ErrorAction SilentlyContinue
        if ($result.TcpTestSucceeded) {
            Write-Host "✅ Database is accessible" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Database is not accessible" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Connection test failed: $_" -ForegroundColor Red
        return $false
    }
}

# Function to create migration
function New-Migration {
    param([string]$Name)
    
    Write-Host "📝 Creating migration: $Name" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not (Test-DatabaseConnection)) {
        Write-Host "⚠️  Proceeding anyway..." -ForegroundColor Yellow
    }
    
    Push-Location $IDENTITY_API
    
    try {
        Write-Host "Running: dotnet ef migrations add $Name" -ForegroundColor Gray
        $output = dotnet ef migrations add $Name 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Migration created successfully!" -ForegroundColor Green
            Write-Host ""
            
            # Show migration files
            $migrationFiles = Get-ChildItem "Migrations" -Filter "*_$Name.cs" -ErrorAction SilentlyContinue
            if ($migrationFiles) {
                Write-Host "📂 Migration files:" -ForegroundColor Cyan
                foreach ($file in $migrationFiles) {
                    Write-Host "   • $($file.Name)" -ForegroundColor White
                }
            }
            
            Write-Host ""
            Write-Host "📌 Next steps:" -ForegroundColor Yellow
            Write-Host "   1. Review the migration file"
            Write-Host "   2. Run: .\\create-migrations.ps1 -Action update"
            Write-Host "   3. Verify: .\\create-migrations.ps1 -Action list"
        } else {
            Write-Host ""
            Write-Host "❌ Migration creation failed!" -ForegroundColor Red
            Write-Host "Output:" -ForegroundColor Gray
            Write-Host $output -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

# Function to update database
function Update-Database {
    Write-Host "📤 Applying migrations to database..." -ForegroundColor Yellow
    Write-Host ""
    
    if (-not (Test-DatabaseConnection)) {
        Write-Host "❌ Database is not accessible. Cannot apply migrations." -ForegroundColor Red
        return
    }
    
    Push-Location $IDENTITY_API
    
    try {
        Write-Host "Running: dotnet ef database update" -ForegroundColor Gray
        $output = dotnet ef database update 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Database updated successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Migration applied. Tables are now ready." -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "❌ Database update failed!" -ForegroundColor Red
            Write-Host "Output:" -ForegroundColor Gray
            Write-Host $output -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

# Function to list migrations
function Get-Migrations {
    Write-Host "📋 Listing migrations:" -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location $IDENTITY_API
    
    try {
        Write-Host "Running: dotnet ef migrations list" -ForegroundColor Gray
        dotnet ef migrations list
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

# Function to rollback
function Undo-Migration {
    param([string]$Name)
    
    Write-Host "⏮️  Rolling back to: $Name" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not (Test-DatabaseConnection)) {
        Write-Host "❌ Database is not accessible. Cannot rollback." -ForegroundColor Red
        return
    }
    
    Push-Location $IDENTITY_API
    
    try {
        Write-Host "Running: dotnet ef database update $Name" -ForegroundColor Gray
        $output = dotnet ef database update $Name 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Rollback successful!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Rollback failed!" -ForegroundColor Red
            Write-Host "Output:" -ForegroundColor Gray
            Write-Host $output -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

# Function to show help
function Show-Help {
    Write-Host "Usage: .\create-migrations.ps1 -Action <action> [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Cyan
    Write-Host "  create   - Create a new migration"
    Write-Host "  update   - Apply pending migrations to database"
    Write-Host "  list     - List all migrations"
    Write-Host "  rollback - Rollback to specific migration"
    Write-Host "  help     - Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\create-migrations.ps1 -Action create" -ForegroundColor White
    Write-Host "  .\create-migrations.ps1 -Action create -MigrationName 'AddPhoneToUser'" -ForegroundColor White
    Write-Host "  .\create-migrations.ps1 -Action update" -ForegroundColor White
    Write-Host "  .\create-migrations.ps1 -Action list" -ForegroundColor White
    Write-Host "  .\create-migrations.ps1 -Action rollback -MigrationName 'InitialCreate'" -ForegroundColor White
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  BE Path:     $BE_PATH" -ForegroundColor Gray
    Write-Host "  Identity API: $IDENTITY_API" -ForegroundColor Gray
    Write-Host "  Database:    $DB_HOST`:5432/$DB_NAME" -ForegroundColor Gray
}

# Main logic
switch ($Action) {
    "create" {
        New-Migration -Name $MigrationName
    }
    "update" {
        Update-Database
    }
    "list" {
        Get-Migrations
    }
    "rollback" {
        Undo-Migration -Name $MigrationName
    }
    "help" {
        Show-Help
    }
    default {
        Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
        Show-Help
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          OPERATION COMPLETED           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
